/*!
 * SOURCE OF TRUTH KEYWORDS: WindowsInjector, deliver, can_inject, frontmost_app,
 *   post_paste, SendInput, VK_CONTROL, PasteTiming, is_process_elevated,
 *   UIPI_BLOCKED_REASON, clipboard_seq, GetClipboardSequenceNumber
 * WHAT:  Puts finished text on the clipboard and simulates Ctrl+V on Windows.
 * WHY:   Implements TextInjector for Windows using SendInput and arboard,
 *        respecting per-request delays and clipboard restoration.
 *        Also detects whether the frontmost process is running at a higher
 *        integrity level (elevated / administrator) than HushWrite itself.
 *        When it is, User Interface Privilege Isolation (UIPI) will silently
 *        swallow every SendInput call — the clipboard write still succeeds and
 *        the text is there to paste manually, but the automatic Ctrl+V will
 *        never reach the target window. Detecting this up-front lets us skip
 *        the dead keystroke injection and tell the user exactly what happened
 *        instead of leaving them confused about missing text.
 * WHERE: Implements ports/injector.rs; called by session actor and deliver.
 */

use std::time::{Duration, Instant};

use arboard::Clipboard;
use windows::core::{w, Interface, BSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE, HWND};
use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
};
use windows::Win32::System::DataExchange::{
    CloseClipboard, GetClipboardSequenceNumber, OpenClipboard, RegisterClipboardFormatW,
    SetClipboardData,
};
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
use windows::Win32::System::Threading::{
    OpenProcess, OpenProcessToken, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Accessibility::{
    CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationValuePattern,
    UIA_ValuePatternId,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VK_CONTROL, VK_V,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};

use crate::error::{AppError, AppResult, ErrorCode};
use crate::ports::injector::{FrontmostApp, InjectionOutcome, InjectionRequest, TextInjector};
use crate::ports::permissions::PermissionProvider;
use crate::types::DeliveryKind;

pub struct WindowsInjector<P: PermissionProvider> {
    _permissions: P,
}

impl<P: PermissionProvider> WindowsInjector<P> {
    pub fn new(permissions: P) -> Self {
        Self {
            _permissions: permissions,
        }
    }

    fn post_paste() -> AppResult<()> {
        use windows::Win32::UI::Input::KeyboardAndMouse::{
            GetKeyState, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
        };

        // 1. Release any held modifier keys (Alt, Shift, Windows, Ctrl) from hotkey combos
        let mut release_inputs = Vec::new();
        for &vk in &[VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN, VK_CONTROL] {
            let state = unsafe { GetKeyState(vk.0 as i32) };
            if (state & (0x8000u16 as i16)) != 0 {
                release_inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
        }
        if !release_inputs.is_empty() {
            unsafe {
                SendInput(&release_inputs, std::mem::size_of::<INPUT>() as i32);
            }
            std::thread::sleep(Duration::from_millis(5));
        }

        // 2. Press Ctrl+V with explicit key-state propagation
        let paste_down = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: KEYBD_EVENT_FLAGS(0),
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];

        let paste_up = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];

        let sent1 = unsafe { SendInput(&paste_down, std::mem::size_of::<INPUT>() as i32) };
        std::thread::sleep(Duration::from_millis(5));
        let sent2 = unsafe { SendInput(&paste_up, std::mem::size_of::<INPUT>() as i32) };

        if sent1 != paste_down.len() as u32 || sent2 != paste_up.len() as u32 {
            return Err(AppError::new(
                ErrorCode::InjectionFailed,
                "HushWrite could not send the paste keystroke. Text is copied to clipboard.",
            ));
        }

        Ok(())
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: type_text_unicode, UNICODE_INPUT_BATCH_SIZE
     * WHAT:  Direct Unicode keyboard simulation, submitted in batches of at most
     *        32 user-visible characters.
     * WHY:   One large SendInput call makes long transcripts expensive to copy
     *        into the kernel and can be rejected by protected targets. Batching
     *        bounds each syscall while preserving the exact character order;
     *        UTF-16 surrogate pairs stay together because batching is by Rust
     *        `char`, not by encoded code unit.
     */
    pub fn type_text_unicode(text: &str) -> AppResult<()> {
        const UNICODE_INPUT_BATCH_SIZE: usize = 32;
        let characters: Vec<char> = text.chars().collect();

        for batch in characters.chunks(UNICODE_INPUT_BATCH_SIZE) {
            let mut inputs = Vec::with_capacity(batch.len() * 2);
            for &character in batch {
                let mut code_units = [0u16; 2];
                for &code_unit in character.encode_utf16(&mut code_units).iter() {
                    inputs.push(INPUT {
                        r#type: INPUT_KEYBOARD,
                        Anonymous: INPUT_0 {
                            ki: KEYBDINPUT {
                                wVk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY(0),
                                wScan: code_unit,
                                dwFlags: windows::Win32::UI::Input::KeyboardAndMouse::KEYEVENTF_UNICODE,
                                time: 0,
                                dwExtraInfo: 0,
                            },
                        },
                    });
                    inputs.push(INPUT {
                        r#type: INPUT_KEYBOARD,
                        Anonymous: INPUT_0 {
                            ki: KEYBDINPUT {
                                wVk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY(0),
                                wScan: code_unit,
                                dwFlags: windows::Win32::UI::Input::KeyboardAndMouse::KEYEVENTF_UNICODE
                                    | KEYEVENTF_KEYUP,
                                time: 0,
                                dwExtraInfo: 0,
                            },
                        },
                    });
                }
            }

            let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
            if sent != inputs.len() as u32 {
                return Err(AppError::new(
                    ErrorCode::InjectionFailed,
                    "HushWrite could not simulate direct unicode keyboard input.",
                ));
            }
        }

        Ok(())
    }

    /// Marks the current clipboard payload as ineligible for Windows clipboard
    /// history and cloud sync. This is a cooperative Windows convention; third-
    /// party clipboard managers are outside the OS contract and may still copy it.
    fn suppress_clipboard_history() {
        unsafe {
            let format = RegisterClipboardFormatW(w!("CanIncludeInClipboardHistory"));
            if format == 0 || OpenClipboard(None).is_err() {
                return;
            }

            let memory = match GlobalAlloc(GMEM_MOVEABLE, std::mem::size_of::<u32>()) {
                Ok(memory) => memory,
                Err(_) => {
                    let _ = CloseClipboard();
                    return;
                }
            };
            let pointer = GlobalLock(memory);
            if pointer.is_null() {
                let _ = CloseClipboard();
                return;
            }
            *(pointer as *mut u32) = 0;
            let _ = GlobalUnlock(memory);

            // Ownership transfers to the clipboard on success. Do not free it.
            let clipboard_memory = HANDLE(memory.0);
            if SetClipboardData(format, clipboard_memory).is_err() {
                // The clipboard did not take ownership, so the allocation is
                // intentionally leaked rather than risking a use-after-free in
                // the OS. This path is rare and bounded to one DWORD per paste.
                tracing::debug!("Windows rejected the clipboard-history suppression marker");
            }
            let _ = CloseClipboard();
        }
    }

    fn clipboard() -> AppResult<Clipboard> {
        Clipboard::new().map_err(|err| {
            AppError::new(
                ErrorCode::ClipboardUnavailable,
                "HushWrite could not reach the clipboard.",
            )
            .with_detail(err)
        })
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: is_process_elevated, UIPI_BLOCKED_REASON
     * WHAT:  Returns true when the process owning `process_id` holds a high or
     *        system integrity token — i.e. it is running as Administrator.
     * WHY:   Windows User Interface Privilege Isolation (UIPI) silently blocks
     *        cross-integrity SendInput. When HushWrite (medium integrity) calls
     *        SendInput targeting an elevated window (high integrity), the OS
     *        accepts the call (returns success) but never delivers the keystrokes
     *        to the target. There is no error code; the text is on the clipboard
     *        but Ctrl+V never fires. Detecting elevation lets the caller skip
     *        the dead keystroke and surface a clear "paste manually" message
     *        rather than leaving the user confused.
     *
     *        Implementation: open the process token with TOKEN_QUERY and call
     *        GetTokenInformation(TokenElevation). This works even when HushWrite
     *        only has PROCESS_QUERY_LIMITED_INFORMATION on the target, because
     *        OpenProcessToken requires PROCESS_QUERY_INFORMATION but we reuse
     *        the same limited handle — it is enough on Windows 10+.
     *        Returns false on any API failure (safer than refusing to paste on
     *        a query error).
     * WHERE: Called by deliver() before attempting post_paste().
     */
    fn is_process_elevated(process_id: u32) -> bool {
        unsafe {
            let process_handle =
                match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) {
                    Ok(h) => h,
                    Err(_) => return false,
                };

            let mut token: HANDLE = HANDLE::default();
            if OpenProcessToken(process_handle, TOKEN_QUERY, &mut token).is_err() {
                let _ = CloseHandle(process_handle);
                return false;
            }

            let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
            let mut return_length: u32 = 0;
            let info_size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;

            let elevated = GetTokenInformation(
                token,
                TokenElevation,
                Some(&mut elevation as *mut _ as *mut _),
                info_size,
                &mut return_length,
            )
            .is_ok()
                && elevation.TokenIsElevated != 0;

            let _ = CloseHandle(token);
            let _ = CloseHandle(process_handle);

            elevated
        }
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: try_uia_inject, IUIAutomation, SetValue
     * WHAT:  Inserts text directly into the focused UI element via Windows UI Automation.
     * WHY:   Provides an alternative/secondary injection pathway for applications where
     *        SendInput (Ctrl+V) or clipboard paste is blocked or slow. Direct SetValue via
     *        IUIAutomationValuePattern works cleanly across WinUI, WPF, UWP, and standard
     *        accessible text controls.
     * WHERE: WindowsInjector::deliver.
     */
    fn try_uia_inject(text: &str) -> bool {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

            let automation: IUIAutomation =
                match CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
                    Ok(auto) => auto,
                    Err(_) => return false,
                };

            let focused_element: IUIAutomationElement = match automation.GetFocusedElement() {
                Ok(elem) => elem,
                Err(_) => return false,
            };

            let pattern_unknown = match focused_element.GetCurrentPattern(UIA_ValuePatternId) {
                Ok(unk) => unk,
                Err(_) => return false,
            };

            let value_pattern: IUIAutomationValuePattern = match pattern_unknown.cast() {
                Ok(pat) => pat,
                Err(_) => return false,
            };

            let bstr_text = BSTR::from(text);
            value_pattern.SetValue(&bstr_text).is_ok()
        }
    }
    /// Injects through UI Automation and confirms that the focused value now
    /// contains the transcript. A single delayed retry covers controls that
    /// accept SetValue asynchronously.
    fn try_uia_inject_confirmed(text: &str) -> bool {
        for attempt in 0..2 {
            if attempt == 1 {
                std::thread::sleep(Duration::from_millis(200));
            }
            if !Self::try_uia_inject(text) {
                continue;
            }

            let deadline = Instant::now() + Duration::from_millis(200);
            while Instant::now() < deadline {
                if Self::focused_value()
                    .map(|value| value.contains(text))
                    .unwrap_or(false)
                {
                    return true;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
        }
        false
    }

    fn focused_value() -> Option<String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let automation: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;
            let element = automation.GetFocusedElement().ok()?;
            let unknown = element.GetCurrentPattern(UIA_ValuePatternId).ok()?;
            let pattern: IUIAutomationValuePattern = unknown.cast().ok()?;
            pattern.CurrentValue().ok().map(|value| value.to_string())
        }
    }
}

impl<P: PermissionProvider> TextInjector for WindowsInjector<P> {
    fn can_inject(&self) -> bool {
        true
    }

    fn frontmost_app(&self) -> Option<FrontmostApp> {
        // Alt+Tab stabilization delay: in rapid window switching scenarios,
        // the active window (HWND) may still point to the previous window for ~50ms.
        // Waiting 30ms lets the OS finish the active window transition before reading
        // the active window process name.
        std::thread::sleep(Duration::from_millis(30));

        unsafe {
            let hwnd: HWND = GetForegroundWindow();
            if hwnd.0.is_null() {
                return None;
            }

            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            let title = if len > 0 {
                String::from_utf16_lossy(&title_buf[..len as usize])
            } else {
                "Unknown".to_string()
            };

            let mut process_id = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));
            if process_id == 0 {
                return Some(FrontmostApp {
                    bundle_id: "unknown".to_string(),
                    name: title,
                    selected_text: None,
                });
            }

            let process_handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id);
            if let Ok(handle) = process_handle {
                let mut path_buf = [0u16; 1024];
                let mut path_len = path_buf.len() as u32;
                let full_path = if QueryFullProcessImageNameW(
                    handle,
                    PROCESS_NAME_FORMAT(0),
                    windows::core::PWSTR(path_buf.as_mut_ptr()),
                    &mut path_len,
                )
                .is_ok()
                {
                    String::from_utf16_lossy(&path_buf[..path_len as usize])
                } else {
                    "unknown.exe".to_string()
                };

                let _ = CloseHandle(handle);

                let exe_name = std::path::Path::new(&full_path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                Some(FrontmostApp {
                    bundle_id: exe_name,
                    name: if title.is_empty() { full_path } else { title },
                    selected_text: None,
                })
            } else {
                Some(FrontmostApp {
                    bundle_id: "unknown".to_string(),
                    name: title,
                    selected_text: None,
                })
            }
        }
    }

    fn calibrate_paste_delay(&self) -> AppResult<Option<u64>> {
        // Let the operator switch from onboarding to the real target field.
        std::thread::sleep(Duration::from_millis(900));
        let mut cb = Self::clipboard()?;
        let sentinel = format!("HushWrite calibration {}", uuid::Uuid::new_v4());
        cb.set_text(&sentinel).map_err(|err| {
            AppError::new(ErrorCode::ClipboardUnavailable, "Could not write the calibration text to the clipboard.")
                .with_detail(err)
        })?;

        let started = Instant::now();
        Self::post_paste()?;
        // UI Automation exposes the value after the target application's paste
        // handler has accepted it. Polling this acknowledgement measures the
        // app's response, rather than merely measuring SendInput's return time.
        let deadline = started + Duration::from_secs(2);
        loop {
            if let Some(value) = Self::focused_value() {
                if value.contains(&sentinel) {
                    return Ok(Some(started.elapsed().as_millis().min(u64::MAX as u128) as u64));
                }
            }
            if Instant::now() >= deadline {
                return Ok(None);
            }
            std::thread::sleep(Duration::from_millis(2));
        }
    }

    fn deliver(&self, request: &InjectionRequest) -> AppResult<InjectionOutcome> {
        let mut cb = Self::clipboard()?;
        let previous_text = if request.restore_clipboard {
            cb.get_text().ok()
        } else {
            None
        };

        let start_write = Instant::now();
        cb.set_text(&request.text).map_err(|err| {
            AppError::new(
                ErrorCode::ClipboardUnavailable,
                "Could not write to the clipboard.",
            )
            .with_detail(err)
        })?;
        if request.suppress_clipboard_history {
            Self::suppress_clipboard_history();
        }
        let clipboard_write_ms = start_write.elapsed().as_secs_f64() * 1000.0;

        // Snapshot the clipboard sequence number immediately after our write.
        // Windows atomically increments this counter every time clipboard
        // ownership changes — any other process (clipboard manager, password
        // manager, the target app's own listener) that touches the clipboard
        // between now and when our Ctrl+V arrives will leave a different number.
        let seq_after_write = unsafe { GetClipboardSequenceNumber() };

        if !request.auto_paste {
            return Ok(InjectionOutcome {
                delivery: DeliveryKind::ClipboardOnly,
                reason: Some("Auto-paste is disabled in settings".to_string()),
                clipboard_write_ms,
            });
        }

        // Detect whether the foreground window belongs to an elevated process.
        // UIPI silently drops SendInput calls directed at higher-integrity
        // windows, so we check before attempting — an accepted-but-ignored
        // keystroke is indistinguishable from a delivered one by return value
        // alone, and the user would simply see no text appear.
        let foreground_pid = unsafe {
            let hwnd = GetForegroundWindow();
            let mut pid = 0u32;
            if !hwnd.0.is_null() {
                GetWindowThreadProcessId(hwnd, Some(&mut pid));
            }
            pid
        };

        if foreground_pid != 0 && Self::is_process_elevated(foreground_pid) {
            tracing::warn!(
                pid = foreground_pid,
                "foreground process is elevated; UIPI will block SendInput — \
                 attempting UIA fallback or advising user to paste manually"
            );

            if Self::try_uia_inject_confirmed(&request.text) {
                tracing::info!("text successfully delivered to elevated window via UI Automation");
                return Ok(InjectionOutcome {
                    delivery: DeliveryKind::Pasted,
                    reason: None,
                    clipboard_write_ms,
                });
            }

            return Ok(InjectionOutcome {
                delivery: DeliveryKind::ClipboardOnly,
                reason: Some(
                    "The active window is running as Administrator. \
                     HushWrite has copied your text to the clipboard — press Ctrl+V to paste."
                        .to_string(),
                ),
                clipboard_write_ms,
            });
        }

        // Enforce a minimum gap between clipboard write and Ctrl+V.
        // Clipboard managers (Windows Clipboard History, 1Password, etc.) run on
        // the WM_CLIPBOARDUPDATE notification, which arrives at their message-pump
        // priority — typically within one scheduler quantum (≈1-4ms). If we fire
        // Ctrl+V at 0ms their listener can still hold clipboard ownership and the
        // paste lands the wrong text. 15ms is below the perceptual threshold for
        // injection latency but above the worst-case notification-to-re-write
        // round-trip observed in practice. The user's setting can be higher (for
        // slow apps or clipboard replacement tools) but never lower than this floor.
        const MIN_PASTE_DELAY_MS: u64 = 15;
        let effective_delay = request.paste_delay_ms.max(MIN_PASTE_DELAY_MS);
        std::thread::sleep(Duration::from_millis(effective_delay));

        // Pre-paste race check: if the sequence number changed during the sleep,
        // another process replaced our text before Ctrl+V could fire. Re-write
        // the clipboard once and continue — this covers the common case where a
        // clipboard history tool (e.g. Windows Clipboard History, 1Password)
        // processes our original write and resets ownership back to itself.
        let seq_before_paste = unsafe { GetClipboardSequenceNumber() };
        if seq_before_paste != seq_after_write {
            tracing::warn!(
                seq_after_write,
                seq_before_paste,
                "clipboard was modified by another process before paste; re-writing"
            );
            // Re-write. If this also fails, fall through to paste anyway — at
            // worst the wrong text lands (or nothing), which is better than
            // silently dropping the entire delivery.
            let _ = cb.set_text(&request.text);
            if request.suppress_clipboard_history {
                Self::suppress_clipboard_history();
            }
        }

        if let Err(err) = Self::post_paste() {
            // Secondary delivery pathway via Windows UI Automation (Accessibility API)
            if Self::try_uia_inject_confirmed(&request.text) {
                tracing::info!("SendInput paste failed, but text was successfully injected via Windows UI Automation");
                return Ok(InjectionOutcome {
                    delivery: DeliveryKind::Pasted,
                    reason: None,
                    clipboard_write_ms,
                });
            }

            // Tertiary delivery pathway via direct Unicode character simulation
            if Self::type_text_unicode(&request.text).is_ok() {
                tracing::info!("SendInput paste failed, but text was successfully typed via direct Unicode input");
                return Ok(InjectionOutcome {
                    delivery: DeliveryKind::Pasted,
                    reason: None,
                    clipboard_write_ms,
                });
            }

            // Fourth and final fallback: some sandboxed controls accept an OLE
            // drop while rejecting clipboard reads and synthetic keystrokes.
            if super::ole_drag::try_ole_drag(&request.text) {
                tracing::info!("text delivered via OLE drag-and-drop fallback");
                return Ok(InjectionOutcome {
                    delivery: DeliveryKind::Pasted,
                    reason: None,
                    clipboard_write_ms,
                });
            }

            return Ok(InjectionOutcome {
                delivery: DeliveryKind::ClipboardOnly,
                reason: Some(format!("Paste keystroke injection failed: {err}")),
                clipboard_write_ms,
            });
        }

        if request.restore_clipboard {
            if let Some(prev) = previous_text {
                std::thread::sleep(Duration::from_millis(request.clipboard_restore_delay_ms));

                // Post-paste race check: after the sleep, verify the clipboard
                // still holds our transcript text (sequence number has only
                // advanced by the single paste event, i.e. at most 1 step from
                // the pre-paste snapshot). If another process wrote to the
                // clipboard since we pasted — e.g. the target app's own paste
                // handler stored something, or a clipboard manager captured and
                // re-wrote — skip the restore to avoid clobbering their content.
                let seq_after_paste = unsafe { GetClipboardSequenceNumber() };
                // A single Ctrl+V that the OS processes does not change the
                // clipboard sequence number (only clipboard *writes* do).
                // So if seq has advanced beyond seq_before_paste, another
                // process touched the clipboard after we pasted.
                if seq_after_paste != seq_before_paste {
                    tracing::debug!(
                        seq_before_paste,
                        seq_after_paste,
                        "clipboard was modified after paste; skipping restore to avoid clobbering"
                    );
                } else {
                    let _ = cb.set_text(prev);
                }
            }
        }

        Ok(InjectionOutcome {
            delivery: DeliveryKind::Pasted,
            reason: None,
            clipboard_write_ms,
        })
    }
}
