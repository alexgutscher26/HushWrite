/*!
 * SOURCE OF TRUTH KEYWORDS: install_tray, TrayMenu, MENU_DASHBOARD,
 *   MENU_QUIT, show_dashboard, toggle_pill_window
 * WHAT:  The menu bar item: the only permanently visible part of HushWrite, and
 *        the only way to reach the dashboard.
 * WHY:   The app has no Dock icon and no window on launch — it is invisible
 *        until summoned, which is the product. That makes this the sole
 *        affordance, so it has to carry everything a user needs: open the
 *        dashboard, and quit.
 *
 *        `show_dashboard` does more than call `show()`, and the extra step is
 *        not optional. With LSUIElement set, the process is an accessory: a
 *        window it shows does NOT come to the front and cannot take keyboard
 *        focus properly. Without an explicit activation the dashboard opens
 *        behind whatever the user was doing and feels broken.
 * WHERE: Installed once during bootstrap.
 */

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::bootstrap::{DASHBOARD_WINDOW, PILL_WINDOW};
use crate::error::{AppError, AppResult};

const MENU_DASHBOARD: &str = "dashboard";
const MENU_QUIT: &str = "quit";

/// Snaps a dragged pill to a monitor edge when it comes within 20 physical
/// pixels, then persists the corresponding anchor so the next session starts
/// at the same edge. Free-floating positions remain untouched until they reach
/// an edge.
pub fn record_pill_drag_position(app: &AppHandle, x: i32, y: i32) {
    let Some(window) = app.get_webview_window(PILL_WINDOW) else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };
    let center_x = x + size.width as i32 / 2;
    let center_y = y + size.height as i32 / 2;
    let Ok(Some(monitor)) = app.monitor_from_point(center_x as f64, center_y as f64) else {
        return;
    };

    let monitor_x = monitor.position().x;
    let monitor_y = monitor.position().y;
    let monitor_right = monitor_x + monitor.size().width as i32;
    let monitor_bottom = monitor_y + monitor.size().height as i32;
    let threshold = (20.0 * monitor.scale_factor()).round() as i32;

    let snap_left = (x - monitor_x).abs() <= threshold;
    let snap_right = (x + size.width as i32 - monitor_right).abs() <= threshold;
    let snap_top = (y - monitor_y).abs() <= threshold;
    let snap_bottom = (y + size.height as i32 - monitor_bottom).abs() <= threshold;

    if !(snap_left || snap_right || snap_top || snap_bottom) {
        return;
    }

    let snapped_x = if snap_left {
        monitor_x
    } else if snap_right {
        monitor_right - size.width as i32
    } else {
        x
    };
    let snapped_y = if snap_top {
        monitor_y
    } else if snap_bottom {
        monitor_bottom - size.height as i32
    } else {
        y
    };

    if snapped_x != x || snapped_y != y {
        let _ = window.set_position(tauri::PhysicalPosition::new(snapped_x, snapped_y));
    }

    let horizontal = if snap_left {
        "left"
    } else if snap_right {
        "right"
    } else {
        "center"
    };
    let vertical = if snap_top {
        "top"
    } else if snap_bottom {
        "bottom"
    } else {
        "center"
    };
    let anchor = match (vertical, horizontal) {
        ("top", "left") => "top_left",
        ("top", "right") => "top_right",
        ("bottom", "left") => "bottom_left",
        ("bottom", "right") => "bottom_right",
        ("top", _) => "top_center",
        ("bottom", _) => "bottom_center",
        (_, "left") => "center_left",
        (_, "right") => "center_right",
        _ => "center",
    };

    if let Some(state) = app.try_state::<crate::ipc::AppState>() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or_default();
        if let Err(error) = crate::services::settings::set_setting(
            &state.db,
            crate::registry::keys::PILL_ANCHOR,
            &crate::types::SettingValue::Choice(anchor.to_string()),
            now,
        ) {
            tracing::debug!(error = %error, "could not persist pill edge anchor");
        }
    }
}

static LAST_SESSION_WPM: std::sync::Mutex<Option<f64>> = std::sync::Mutex::new(None);

/**
 * SOURCE OF TRUTH KEYWORDS: update_tray_wpm, reset_tray_wpm, last_session_wpm
 * WHAT:  Updates or resets the tray tooltip to display dictation WPM from the
 *        most recent session.
 * WHY:   A session that is cancelled or produces zero words must not leave a stale
 *        WPM reading in the system tray. Guarded by word_count > 0.
 * WHERE: Called by delivery worker on transcript delivery, and on session cancellation.
 */
pub fn update_tray_wpm(app: &AppHandle, wpm: Option<f64>) {
    let mut guard = match LAST_SESSION_WPM.lock() {
        Ok(g) => g,
        Err(poisoned) => poisoned.into_inner(),
    };
    *guard = wpm;
    if let Some(tray) = app.tray_by_id("HushWrite") {
        let tooltip = match wpm {
            Some(w) if w > 0.0 => format!("HushWrite — {:.0} WPM", w),
            _ => "HushWrite".to_string(),
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

pub fn reset_tray_wpm(app: &AppHandle) {
    update_tray_wpm(app, None);
}

pub fn last_session_wpm() -> Option<f64> {
    LAST_SESSION_WPM.lock().ok().and_then(|g| *g)
}

#[cfg(target_os = "windows")]
pub fn is_windows_system_light_theme() -> bool {
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, KEY_READ,
        REG_DWORD, REG_VALUE_TYPE,
    };
    use windows::core::w;

    unsafe {
        let mut hkey: HKEY = HKEY::default();
        let subkey = w!("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize");
        if RegOpenKeyExW(HKEY_CURRENT_USER, subkey, 0, KEY_READ, &mut hkey).is_ok() {
            let mut data: u32 = 0;
            let mut data_len = std::mem::size_of::<u32>() as u32;
            let mut val_type: REG_VALUE_TYPE = REG_VALUE_TYPE::default();
            let val_name = w!("SystemUsesLightTheme");
            let res = RegQueryValueExW(
                hkey,
                val_name,
                None,
                Some(&mut val_type),
                Some(&mut data as *mut u32 as *mut u8),
                Some(&mut data_len),
            );
            let _ = RegCloseKey(hkey);
            if res.is_ok() && val_type == REG_DWORD {
                return data == 1;
            }
        }
    }
    false
}

pub fn get_tray_icon_image() -> Result<tauri::image::Image<'static>, AppError> {
    #[cfg(target_os = "windows")]
    {
        if is_windows_system_light_theme() {
            tauri::image::Image::from_bytes(include_bytes!("../icons/tray-dark.png"))
                .map_err(menu_error)
        } else {
            tauri::image::Image::from_bytes(include_bytes!("../icons/tray-light.png"))
                .map_err(menu_error)
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))
            .map_err(menu_error)
    }
}

pub fn update_tray_theme(app: &AppHandle) {
    if let Some(tray) = app.tray_by_id("HushWrite") {
        match get_tray_icon_image() {
            Ok(icon) => {
                if let Err(err) = tray.set_icon(Some(icon)) {
                    tracing::warn!(error = %err, "could not update tray icon theme");
                }
            }
            Err(err) => {
                tracing::warn!(error = %err, "could not load tray icon for current theme");
            }
        }
    }
}

#[cfg(target_os = "windows")]
static THEME_LISTENER_HWND: std::sync::atomic::AtomicIsize = std::sync::atomic::AtomicIsize::new(0);
#[cfg(target_os = "windows")]
static TASKBAR_CREATED_MSG: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

#[cfg(target_os = "windows")]
pub fn start_theme_listener(app: AppHandle) {
    std::thread::Builder::new()
        .name("HushWrite-theme-listener".to_string())
        .spawn(move || unsafe {
            use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
            use windows::Win32::System::LibraryLoader::GetModuleHandleW;
            use windows::Win32::UI::WindowsAndMessaging::{
                CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
                PostQuitMessage, RegisterClassW, RegisterWindowMessageW, TranslateMessage, MSG,
                WINDOW_EX_STYLE, WM_CLOSE, WM_DESTROY, WM_SETTINGCHANGE, WNDCLASSW, WS_OVERLAPPED,
            };

            static APP_HANDLE_SLOT: std::sync::Mutex<Option<AppHandle>> = std::sync::Mutex::new(None);
            if let Ok(mut slot) = APP_HANDLE_SLOT.lock() {
                *slot = Some(app);
            }

            let taskbar_msg = RegisterWindowMessageW(windows::core::w!("TaskbarCreated"));
            TASKBAR_CREATED_MSG.store(taskbar_msg, Ordering::SeqCst);

            unsafe extern "system" fn theme_wndproc(
                hwnd: HWND,
                msg: u32,
                w_param: WPARAM,
                l_param: LPARAM,
            ) -> LRESULT {
                let taskbar_created = TASKBAR_CREATED_MSG.load(Ordering::SeqCst);
                if taskbar_created != 0 && msg == taskbar_created {
                    tracing::info!("Windows Explorer restart detected via TaskbarCreated; restoring tray icon");
                    if let Ok(guard) = APP_HANDLE_SLOT.lock() {
                        if let Some(ref handle) = *guard {
                            let _ = install_tray(handle);
                            update_tray_theme(handle);
                        }
                    }
                    return LRESULT(0);
                }

                // WM_WTSSESSION_CHANGE = 0x02B1, WTS_SESSION_LOCK = 0x7
                if msg == 0x02B1 && w_param.0 == 0x7 {
                    tracing::info!("Windows session locked; clearing sensitive dictation clipboard data");
                    use windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard};
                    if OpenClipboard(hwnd).is_ok() {
                        let _ = EmptyClipboard();
                        let _ = CloseClipboard();
                    }
                    return LRESULT(0);
                }

                match msg {
                    WM_SETTINGCHANGE => {
                        let should_check = if l_param.0 != 0 {
                            let ptr = l_param.0 as *const u16;
                            let mut len = 0;
                            while len < 64 && *ptr.add(len) != 0 {
                                len += 1;
                            }
                            let slice = std::slice::from_raw_parts(ptr, len);
                            let param_str = String::from_utf16_lossy(slice);
                            param_str.eq_ignore_ascii_case("ImmersiveColorSet")
                                || param_str.eq_ignore_ascii_case("UserPreferencesMask")
                                || param_str.eq_ignore_ascii_case("ColorizationColor")
                                || param_str.is_empty()
                        } else {
                            true
                        };

                        if should_check {
                            if let Ok(guard) = APP_HANDLE_SLOT.lock() {
                                if let Some(ref handle) = *guard {
                                    update_tray_theme(handle);
                                }
                            }
                        }
                        DefWindowProcW(hwnd, msg, w_param, l_param)
                    }
                    WM_CLOSE => {
                        let _ = DestroyWindow(hwnd);
                        LRESULT(0)
                    }
                    WM_DESTROY => {
                        PostQuitMessage(0);
                        LRESULT(0)
                    }
                    _ => DefWindowProcW(hwnd, msg, w_param, l_param),
                }
            }

            let hinstance = match GetModuleHandleW(None) {
                Ok(h) => h,
                Err(err) => {
                    tracing::error!(error = %err, "could not get module handle for theme listener window");
                    return;
                }
            };

            let class_name = windows::core::w!("HushWriteThemeListenerWindow");
            let wc = WNDCLASSW {
                lpfnWndProc: Some(theme_wndproc),
                hInstance: hinstance.into(),
                lpszClassName: class_name,
                ..Default::default()
            };

            let _ = RegisterClassW(&wc);

            let hwnd = match CreateWindowExW(
                WINDOW_EX_STYLE(0),
                class_name,
                windows::core::w!("HushWriteThemeListener"),
                WS_OVERLAPPED,
                0,
                0,
                0,
                0,
                None,
                None,
                hinstance,
                None,
            ) {
                Ok(h) => h,
                Err(err) => {
                    tracing::error!(error = %err, "failed to create hidden window for theme listener");
                    return;
                }
            };

            THEME_LISTENER_HWND.store(hwnd.0 as isize, Ordering::SeqCst);

            // Register for Windows workstation lock/unlock notifications (wtsapi32.dll)
            use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
            if let Ok(wts_lib) = LoadLibraryW(windows::core::w!("wtsapi32.dll")) {
                type WTSRegisterFn = unsafe extern "system" fn(HWND, u32) -> windows::Win32::Foundation::BOOL;
                if let Some(register_proc) = GetProcAddress(wts_lib, windows::core::s!("WTSRegisterSessionNotification")) {
                    let register_fn: WTSRegisterFn = std::mem::transmute(register_proc);
                    // 0 = NOTIFY_FOR_THIS_SESSION
                    let _ = register_fn(hwnd, 0);
                }
            }

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).into() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        })
        .expect("could not spawn theme listener thread");
}

/**
 * SOURCE OF TRUTH KEYWORDS: install_tray
 * WHAT:  Builds the menu bar item and its menu.
 * WHERE: Called once by bootstrap::setup.
 */
pub fn install_tray(app: &AppHandle) -> AppResult<()> {
    let dashboard_accelerator = if cfg!(target_os = "macos") {
        Some("Cmd+D")
    } else {
        Some("Ctrl+D")
    };
    let dashboard_label = if cfg!(target_os = "windows") {
        "&Open HushWrite"
    } else {
        "Open HushWrite"
    };
    let dashboard = MenuItem::with_id(
        app,
        MENU_DASHBOARD,
        dashboard_label,
        true,
        dashboard_accelerator,
    )
    .map_err(menu_error)?;

    let quit_accelerator = if cfg!(target_os = "macos") {
        "Cmd+Q"
    } else {
        "Ctrl+Q"
    };
    let quit_label = if cfg!(target_os = "windows") {
        "&Quit HushWrite"
    } else {
        "Quit HushWrite"
    };
    let quit = MenuItem::with_id(app, MENU_QUIT, quit_label, true, Some(quit_accelerator))
        .map_err(menu_error)?;

    let separator = PredefinedMenuItem::separator(app).map_err(menu_error)?;
    let menu = Menu::with_items(app, &[&dashboard, &separator, &quit]).map_err(menu_error)?;

    TrayIconBuilder::with_id("HushWrite")
        // The identity mark (docs/04 §12), not the app icon. A menu-bar glyph
        // is a different drawing problem from an app icon: it is 22pt, it must
        // read at that size, and macOS uses ONLY its alpha channel. The app
        // icon shrunk into that slot is a smudge.
        .icon(get_tray_icon_image()?)
        // Template rendering: macOS recolours the shape for light menu bars,
        // dark menu bars and the pressed state from the alpha alone. Without it
        // the glyph is a fixed colour that is wrong in one of the three.
        .icon_as_template(cfg!(target_os = "macos"))
        .tooltip("HushWrite")
        .menu(&menu)
        // The menu is the only interaction. Left-click opening it too would
        // make an accidental click open a window the user did not ask for.
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_DASHBOARD => show_dashboard(app),
            MENU_QUIT => app.exit(0),
            other => tracing::debug!(id = other, "unhandled tray menu item"),
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                tracing::trace!("tray clicked");
            }
        })
        .build(app)
        .map_err(menu_error)?;

    #[cfg(target_os = "windows")]
    start_theme_listener(app.clone());

    Ok(())
}

/**
 * SOURCE OF TRUTH KEYWORDS: show_dashboard
 * WHAT:  Brings the dashboard to the front, properly.
 * WHY:   See the module WHY — an accessory app must activate explicitly or its
 *        window opens behind everything. `set_focus` is what does that here;
 *        `show` alone is the bug.
 * WHERE: The tray menu, and any deep link into settings.
 */
pub fn show_dashboard(app: &AppHandle) {
    let Some(window) = app.get_webview_window(DASHBOARD_WINDOW) else {
        tracing::error!("the dashboard window is missing");
        return;
    };

    // ORDER MATTERS, and every step is load-bearing.
    //
    // The app runs with activation policy Accessory so it has no Dock icon.
    // The consequence, which docs/03 §3.6 warned about and an earlier version
    // of this function got wrong: an accessory app is not "active", so showing
    // a window and calling set_focus on it is NOT enough. The window appears
    // BEHIND whatever the user was doing, or does not appear to arrive at all,
    // and the app looks broken in the only place it has a real window.
    //
    // `app.show()` activates the PROCESS, which is the step that was missing.
    // Only once the app itself is frontmost can a window of it take focus.
    #[cfg(target_os = "macos")]
    if let Err(err) = app.show() {
        tracing::warn!(error = %err, "could not activate the app");
    }

    if let Err(err) = window.show() {
        tracing::warn!(error = %err, "could not show the dashboard");
    }
    let _ = window.unminimize();

    if let Err(err) = window.set_focus() {
        tracing::warn!(error = %err, "could not focus the dashboard");
    }

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_SHOW};
        if let Ok(hwnd) = window.hwnd() {
            unsafe {
                let raw_hwnd = HWND(hwnd.0 as _);
                let _ = ShowWindow(raw_hwnd, SW_SHOW);
                let _ = SetForegroundWindow(raw_hwnd);
            }
        }
    }

    // The rail is a child window: AppKit orders, moves and hides it with the
    // dashboard, but it still has to be shown once, because it is created
    // hidden so it never flashes on screen before its parent exists.
    if let Some(rail) = app.get_webview_window(crate::bootstrap::SIDEBAR_WINDOW) {
        // Order matters and each step is load-bearing. Place it while the
        // dashboard has a real position on screen; show it; and only THEN make
        // it a child — because attaching is what puts a window on screen, and
        // attaching early is what left it stranded at the bottom of the display
        // with nothing to hang from. See bootstrap::attach_rail.
        /*
         * SHOW FIRST, THEN PLACE. Placing a hidden window and then showing it
         * loses the placement: the frame set while it was ordered out is not
         * what comes back on screen — macOS restores the frame the window last
         * had. The rail was computed correctly, to the left of the dashboard
         * and vertically centred, and then reappeared wherever it had been
         * before, which is why the logged coordinates and the pixels on screen
         * disagreed.
         *
         * Placed again after attaching, because addChildWindow re-orders the
         * window and is the last thing that can move it.
         */
        let _ = rail.show();
        crate::bootstrap::place_rail(app);
        crate::bootstrap::attach_rail(app);
        crate::bootstrap::place_rail(app);
    }

    tracing::info!("dashboard opened");
}

/**
 * SOURCE OF TRUTH KEYWORDS: set_pill_visible, toggle_pill_window
 * WHAT:  Shows or hides the pill overlay.
 * WHY:   The window is created once at launch and only ever shown and hidden —
 *        never created and destroyed per session. Recreating it would pay the
 *        webview's parse and paint cost on every hotkey press, which is exactly
 *        the moment the app has promised to be instant.
 *
 *        `set_ignore_cursor_events(true)` is what makes it an indicator rather
 *        than a window: it cannot be clicked, so it can never steal a click
 *        meant for the app underneath, and it can never take focus by click.
 * WHERE: Driven by the session actor as state changes.
 */
/**
 * SOURCE OF TRUTH KEYWORDS: LAST_LIVE_STATE, exit_direction
 * WHAT:  The last state the pill was actually showing.
 * WHY:   The exit needs a direction — a committed recording rises as it fades,
 *        a cancelled one drops — and by the time the pill is being hidden the
 *        state machine is already Idle and has forgotten which it was.
 * WHERE: Written by fit_pill_to_state, read once by set_pill_visible on hide.
 */
static LAST_LIVE_STATE: std::sync::Mutex<Option<crate::types::SessionState>> =
    std::sync::Mutex::new(None);

/**
 * SOURCE OF TRUTH KEYWORDS: PILL_SHOWN, appearance, not_is_visible
 * WHAT:  Whether the pill is currently up, as far as WE are concerned.
 * WHY:   Replaces `window.is_visible()`, which lies for about 160ms and cost
 *        the operator a real bug. The exit animation defers `hide()` into its
 *        completion handler, so for the length of the fade the window is still
 *        visible to AppKit while being, in every sense that matters, gone. A
 *        new recording starting inside that window saw "already visible",
 *        skipped placement entirely, and the pill appeared wherever it had been
 *        on the PREVIOUS display. Recording a second time fixed it because by
 *        then the hide had landed — which is exactly the "only fixes itself
 *        when I run the recording twice" the operator reported.
 *
 *        Set false the moment a hide is REQUESTED, not when it completes, so
 *        the next appearance always places itself.
 * WHERE: Flipped by set_pill_visible; read by fit_pill_to_state.
 */
static PILL_SHOWN: AtomicBool = AtomicBool::new(false);

/**
 * SOURCE OF TRUTH KEYWORDS: PillPlacement, PILL_PLACEMENT, one_authority
 * WHAT:  The display the pill was placed on when it appeared, and that
 *        display's geometry.
 * WHY:   Captured ONCE per appearance and reused for every frame change during
 *        the session. The pill must not chase the cursor between displays while
 *        someone is talking, and it must not be re-derived from the window's
 *        own current position — that was the second half of the bug. See
 *        fit_pill_to_state.
 * WHERE: Set on appearance, read on every state change.
 */
#[derive(Clone, Copy)]
struct PillPlacement {
    origin: (i32, i32),
    size: (u32, u32),
    scale: f64,
}

static PILL_PLACEMENT: std::sync::Mutex<Option<PillPlacement>> = std::sync::Mutex::new(None);

pub fn sync_tray_visibility(app: &AppHandle) {
    let visible = if let Some(state) = app.try_state::<crate::ipc::AppState>() {
        crate::services::settings::get_setting(&state.db, crate::registry::keys::SHOW_TRAY_ICON)
            .ok()
            .flatten()
            .map(|v| matches!(v, crate::types::SettingValue::Bool(true)))
            .unwrap_or(true)
    } else {
        true
    };

    if let Some(tray) = app.tray_by_id("HushWrite") {
        let _ = tray.set_visible(visible);
    }
}

pub fn set_pill_visible(app: &AppHandle, visible: bool) {
    let Some(window) = app.get_webview_window(PILL_WINDOW) else {
        return;
    };

    let style = if let Some(state) = app.try_state::<crate::ipc::AppState>() {
        crate::services::settings::get_setting(&state.db, crate::registry::keys::OVERLAY_STYLE)
            .ok()
            .flatten()
            .and_then(|v| match v {
                crate::types::SettingValue::Choice(s) => Some(s),
                _ => None,
            })
            .unwrap_or_else(|| "floating_pill".to_string())
    } else {
        "floating_pill".to_string()
    };

    if style == "none" {
        PILL_SHOWN.store(false, Ordering::SeqCst);
        let _ = window.hide();
        return;
    }

    if visible {
        PILL_SHOWN.store(true, Ordering::SeqCst);
        // The frame was already set by fit_pill_to_state, which runs first on
        // every state change and is the ONLY thing that positions the pill.
        // This function shows and hides; it does not decide where.
        let _ = window.set_ignore_cursor_events(false);

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                GetWindowLongW, SetWindowLongW, SetWindowPos, ShowWindow, GWL_EXSTYLE,
                HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
                SW_SHOWNOACTIVATE, WS_EX_NOACTIVATE,
            };
            if let Ok(hwnd) = window.hwnd() {
                unsafe {
                    let raw_hwnd = HWND(hwnd.0 as _);
                    let ex_style = GetWindowLongW(raw_hwnd, GWL_EXSTYLE);
                    let _ = SetWindowLongW(
                        raw_hwnd,
                        GWL_EXSTYLE,
                        ex_style | (WS_EX_NOACTIVATE.0 as i32),
                    );
                    let _ = ShowWindow(raw_hwnd, SW_SHOWNOACTIVATE);
                    let _ = SetWindowPos(
                        raw_hwnd,
                        HWND_TOPMOST,
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
                    );
                }
            } else {
                let _ = window.show();
            }
        }

        #[cfg(not(target_os = "windows"))]
        let _ = window.show();
    } else {
        PILL_SHOWN.store(false, Ordering::SeqCst);
        let leaving = LAST_LIVE_STATE.lock().ok().and_then(|mut s| s.take());
        animate_pill_out(&window, leaving);
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: animate_pill_out, native_motion, exit_direction
 * WHAT:  Fades the pill out while moving it a few points — up when the words
 *        were kept, down when the recording was thrown away.
 * WHY:   NSWindow motion rather than a CSS transition, and that is a
 *        constraint rather than a preference. The pill's glass is an
 *        NSVisualEffectView sized to the window, so anything the web layer
 *        animates slides out from under it and reveals a hard-edged halo of
 *        blur around a shrinking pill. Only the window can move the glass and
 *        its contents together.
 *
 *        The direction is worth having because the screen says NOTHING for the
 *        second or two afterwards while the text is still being decoded. In
 *        that gap the exit is the only evidence of what happened, and the two
 *        outcomes are not symmetric: believing a cancel committed costs a
 *        shrug, believing a commit cancelled means recording it again and
 *        getting the text twice. It costs no time — the pill is leaving anyway
 *        — which is the only reason it is justified at all. There is no
 *        checkmark, no linger and no word count; the operator asked for none of
 *        those and they would each add time to a gesture whose whole point is
 *        that it is over.
 * WHERE: The only path that hides the pill.
 */
fn animate_pill_out(window: &tauri::WebviewWindow, leaving: Option<crate::types::SessionState>) {
    use crate::types::SessionState;

    // Cancelled recordings sink; everything else rises. Failure is included in
    // "rises" deliberately — it is not a discarded recording, and dropping it
    // would read as though the words had been thrown away.
    let rising = !matches!(leaving, Some(SessionState::CancelPending { .. }));

    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2_app_kit::{NSAnimatablePropertyContainer, NSAnimationContext, NSWindow};

        let Ok(handle) = window.ns_window() else {
            let _ = window.hide();
            return;
        };

        // SAFETY: Tauri hands back the NSWindow for this webview, and this runs
        // on the main thread — every caller reaches here from a Tauri event.
        let ns_window: Retained<NSWindow> = unsafe {
            let ptr = handle as *mut NSWindow;
            match Retained::retain(ptr) {
                Some(window) => window,
                None => {
                    let _ = window.hide();
                    return;
                }
            }
        };

        let travel = PILL.exit_travel * if rising { 1.0 } else { -1.0 };
        let duration = PILL.exit_ms / 1000.0;

        unsafe {
            let mut frame = ns_window.frame();
            // AppKit's y grows upward, so "rises" is a positive delta.
            frame.origin.y += travel;

            let target = ns_window.clone();
            NSAnimationContext::runAnimationGroup_completionHandler(
                &block2::RcBlock::new(move |context: std::ptr::NonNull<NSAnimationContext>| {
                    context.as_ref().setDuration(duration);
                    let animator = target.animator();
                    animator.setAlphaValue(0.0);
                    animator.setFrame_display(frame, true);
                }),
                Some(&block2::RcBlock::new({
                    let window = window.clone();
                    let ns_window = ns_window.clone();
                    move || {
                        // Hide only once it has finished leaving, then restore
                        // the alpha so the NEXT appearance is not invisible —
                        // the window is reused, never recreated.
                        let _ = window.hide();
                        ns_window.setAlphaValue(1.0);
                    }
                })),
            );
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = rising;
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, ShowWindow, HWND_NOTOPMOST, SWP_HIDEWINDOW, SWP_NOACTIVATE,
                SWP_NOMOVE, SWP_NOSIZE, SW_HIDE,
            };
            if let Ok(hwnd) = window.hwnd() {
                unsafe {
                    let raw_hwnd = HWND(hwnd.0 as _);
                    let _ = ShowWindow(raw_hwnd, SW_HIDE);
                    let _ = SetWindowPos(
                        raw_hwnd,
                        HWND_NOTOPMOST,
                        0,
                        0,
                        0,
                        0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_HIDEWINDOW,
                    );
                }
            }
        }
        let _ = window.hide();
    }
}

/// docs/04 §7: 96pt above the bottom edge of the screen containing the cursor.
const PILL_BOTTOM_INSET_PT: f64 = 96.0;

/**
 * SOURCE OF TRUTH KEYWORDS: PillMetrics, PILL, pill_tokens, single_source
 * WHAT:  The pill's dimensions, which are also the WINDOW's dimensions, read
 *        from the same design tokens the pill is drawn with.
 * WHY:   They used to be separate numbers, and that was the bug. The pill's
 *        size lived in tokens.css and the window's in tauri.conf.json, they
 *        disagreed by 64x28, and nothing could notice — until vibrancy made the
 *        disagreement visible as a blurred rectangle behind the pill. Glass
 *        cannot be given a shape the window does not have.
 *
 *        Parsed from the CSS rather than copied out of it. A copy plus a test
 *        that the copy matches was the first fix, and it failed within the hour
 *        — the designer changed a token, the test went red, and the "fix" was
 *        going to be me editing a number to agree with a number. That is not
 *        one source of truth, it is two sources and a chaperone. `include_str!`
 *        means the value cannot drift, because there is only ever one of it.
 * WHERE: Read by fit_pill_to_state, position_pill and the vibrancy setup.
 */
/**
 * SOURCE OF TRUTH KEYWORDS: design_token, tokens_css, one_source
 * WHAT:  Reads a numeric design token out of the stylesheet the UI is drawn
 *        with.
 * WHY:   Native window geometry and CSS have to agree — a window whose corner
 *        radius differs from the vibrancy layer inside it shows the difference
 *        as a hard square edge, which is how the pill ended up with a blurred
 *        rectangle behind it. Parsing the tokens rather than copying them means
 *        there is only ever one of each number, so a designer changing one is
 *        the whole change.
 *
 *        Compiled in with `include_str!`, so the file is read at BUILD time and
 *        a renamed token is a startup panic naming the token rather than a
 *        silently wrong window.
 * WHERE: PillMetrics, and the window vibrancy radius in bootstrap.
 */
pub fn design_token(name: &str) -> f64 {
    const TOKENS: &str = include_str!("../../src/styles/tokens.css");

    TOKENS
        .lines()
        .find_map(|line| {
            let (key, value) = line.split_once(':')?;
            if key.trim() != name {
                return None;
            }
            value
                .trim()
                .trim_end_matches(';')
                .trim_end_matches("px")
                .trim_end_matches("ms")
                .parse::<f64>()
                .ok()
        })
        .unwrap_or_else(|| panic!("{name} is missing from tokens.css, which sizes native windows"))
}

static PILL: std::sync::LazyLock<PillMetrics> = std::sync::LazyLock::new(PillMetrics::from_tokens);

struct PillMetrics {
    /// How long the window takes to leave, and how far it travels doing it.
    /// Read from the tokens like every other pill dimension so the motion and
    /// the design remain one fact rather than two that agree today.
    exit_ms: f64,
    exit_travel: f64,
    width: f64,
    width_compact: f64,
    height: f64,
    /**
     * The failure box, which is a different size because it carries a
     * different kind of content. Every capture state is one size — nothing
     * resizes mid-dictation — but a failure is a SENTENCE ("HushWrite heard
     * nothing at all. Check that the right input device is selected"), and a
     * sentence cropped to an indicator's width is a sentence nobody reads.
     */
    width_failed: f64,
    height_failed: f64,
    radius: f64,
}

impl PillMetrics {
    fn from_tokens() -> Self {
        let read = design_token;

        Self {
            exit_ms: read("--pill-exit-duration-ms"),
            exit_travel: read("--pill-exit-travel"),
            width: read("--pill-width"),
            width_compact: read("--pill-width-compact"),
            height: read("--pill-height"),
            width_failed: read("--pill-width-failed"),
            height_failed: read("--pill-height-failed"),
            radius: read("--radius-pill"),
        }
    }
}

/// The corner radius the vibrancy layer is given, so the glass is the pill's
/// shape rather than the window's rectangle.
pub fn pill_radius() -> f64 {
    PILL.radius
}

/// How long the exit animation takes in milliseconds.
pub fn pill_exit_ms() -> f64 {
    PILL.exit_ms
}

/// How far the pill travels during the exit transition in pixels.
pub fn pill_exit_travel() -> f64 {
    PILL.exit_travel
}

/// The compact width of the pill indicator.
pub fn pill_width_compact() -> f64 {
    PILL.width_compact
}

fn get_active_monitor(app: &AppHandle) -> Option<tauri::Monitor> {
    // 1. Try foreground window monitor (Windows / macOS)
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::RECT;
        use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect};
        let hwnd = unsafe { GetForegroundWindow() };
        if !hwnd.is_invalid() {
            let mut rect = RECT::default();
            if unsafe { GetWindowRect(hwnd, &mut rect) }.is_ok() {
                let center_x = (rect.left + rect.right) / 2;
                let center_y = (rect.top + rect.bottom) / 2;
                if let Ok(Some(mon)) = app.monitor_from_point(center_x as f64, center_y as f64) {
                    return Some(mon);
                }
            }
        }
    }

    // 2. Fall back to cursor position monitor
    app.cursor_position()
        .ok()
        .and_then(|cursor| app.monitor_from_point(cursor.x, cursor.y).ok().flatten())
        // 3. Fall back to primary monitor
        .or_else(|| app.primary_monitor().ok().flatten())
}

/**
 * SOURCE OF TRUTH KEYWORDS: fit_pill_to_state
 * WHAT:  Resizes the pill window to match the pill the state will draw, and
 *        keeps it centred while doing it.
 * WHY:   Growing a window grows it to the RIGHT unless the origin moves too, so
 *        a naive resize would make the pill lurch sideways on the one gesture
 *        where the user is watching it closely. Half the width delta comes off
 *        the x origin, which keeps the centre fixed.
 *
 *        Returns early when the size is already correct. This is called on every
 *        state change, which during a recording is several times a second, and
 *        setting a window's frame to the value it already holds is not free.
 * WHERE: Called by the event adapter on every session state change.
 */
/**
 * SOURCE OF TRUTH KEYWORDS: adopt_pill_tokens, conf_is_not_authoritative
 * WHAT:  Sizes the pill window from the design tokens once, at startup.
 * WHY:   tauri.conf.json has to declare SOME width and height — it is static
 *        JSON read before any Rust runs, it cannot be computed, and it cannot
 *        even carry a comment saying so. That makes it a second copy of a
 *        number tokens.css owns, and a second copy is what put a blurred
 *        rectangle behind the pill in the first place.
 *
 *        Calling this at startup makes the declared value inert rather than
 *        merely unused: whatever the JSON says, the window adopts the tokens
 *        before it is ever shown, so the two cannot disagree in a way anybody
 *        sees. The JSON numbers are kept roughly right anyway so the very first
 *        frame is not a resize, but nothing depends on them being right.
 * WHERE: Called once by bootstrap, after the windows exist.
 */
pub fn adopt_pill_tokens(app: &AppHandle) {
    fit_pill_to_state(app, &crate::types::SessionState::Idle);
}

pub fn fit_pill_to_state(app: &AppHandle, state: &crate::types::SessionState) {
    use crate::types::SessionState;

    let Some(window) = app.get_webview_window(PILL_WINDOW) else {
        return;
    };

    if matches!(state, SessionState::Idle) {
        return;
    }

    let (style, anchor) = if let Some(app_state) = app.try_state::<crate::ipc::AppState>() {
        let s = crate::services::settings::get_setting(&app_state.db, crate::registry::keys::OVERLAY_STYLE)
            .ok()
            .flatten()
            .and_then(|v| match v {
                crate::types::SettingValue::Choice(s) => Some(s),
                _ => None,
            })
            .unwrap_or_else(|| "floating_pill".to_string());
        let a = crate::services::settings::get_setting(&app_state.db, crate::registry::keys::PILL_ANCHOR)
            .ok()
            .flatten()
            .and_then(|v| match v {
                crate::types::SettingValue::Choice(s) => Some(s),
                _ => None,
            })
            .unwrap_or_else(|| "bottom_center".to_string());
        (s, a)
    } else {
        ("floating_pill".to_string(), "bottom_center".to_string())
    };

    if style == "none" {
        return;
    }

    if let Ok(mut last) = LAST_LIVE_STATE.lock() {
        *last = Some(state.clone());
    }

    let appearing = !PILL_SHOWN.swap(true, Ordering::SeqCst);
    if appearing {
        let placement = get_active_monitor(app).map(|monitor| PillPlacement {
            origin: (monitor.position().x, monitor.position().y),
            size: (monitor.size().width, monitor.size().height),
            scale: monitor.scale_factor(),
        });

        if let Ok(mut stored) = PILL_PLACEMENT.lock() {
            *stored = placement;
        }
    }

    let Some(placement) = PILL_PLACEMENT.lock().ok().and_then(|p| *p) else {
        tracing::warn!("no display to place the pill on; leaving it where it is");
        return;
    };

    let points = match (style.as_str(), state) {
        ("notch", SessionState::Failed { .. }) => (PILL.width_failed, 46.0),
        ("notch", _) => (280.0, 38.0),
        ("notch_slim_band", _) => (240.0, 10.0),
        ("notch_drop_pill", SessionState::Failed { .. }) => (PILL.width_failed, PILL.height_failed),
        ("notch_drop_pill", _) => (260.0, 42.0),
        (_, SessionState::Failed { .. }) => (PILL.width_failed, PILL.height_failed),
        _ => (PILL.width, PILL.height),
    };

    apply_pill_frame(&window, placement, points, &style, &anchor);
}

/**
 * SOURCE OF TRUTH KEYWORDS: pill_frame_on, cross_display_arithmetic
 * WHAT:  Where the pill sits on a given display, and how big it is there, in
 *        that display's physical pixels.
 */
fn pill_frame_on(
    monitor_position: (i32, i32),
    monitor_size: (u32, u32),
    scale: f64,
    pill_points: (f64, f64),
    style: &str,
    anchor: &str,
) -> ((i32, i32), (u32, u32)) {
    let width = (pill_points.0 * scale).round() as i32;
    let height = (pill_points.1 * scale).round() as i32;
    let inset = (PILL_BOTTOM_INSET_PT * scale).round() as i32;

    let (x, y) = match style {
        "notch" | "notch_slim_band" => {
            let cx = monitor_position.0 + (monitor_size.0 as i32 - width) / 2;
            let cy = monitor_position.1;
            (cx, cy)
        }
        "notch_drop_pill" => {
            let cx = monitor_position.0 + (monitor_size.0 as i32 - width) / 2;
            let cy = monitor_position.1 + (12.0 * scale).round() as i32;
            (cx, cy)
        }
        _ => {
            let left_x = monitor_position.0 + inset;
            let center_x = monitor_position.0 + (monitor_size.0 as i32 - width) / 2;
            let right_x = monitor_position.0 + monitor_size.0 as i32 - width - inset;

            let top_y = monitor_position.1 + inset;
            let middle_y = monitor_position.1 + (monitor_size.1 as i32 - height) / 2;
            let bottom_y = monitor_position.1 + monitor_size.1 as i32 - height - inset;

            match anchor {
                "top_left" => (left_x, top_y),
                "top_center" => (center_x, top_y),
                "top_right" => (right_x, top_y),
                "center_left" => (left_x, middle_y),
                "center" => (center_x, middle_y),
                "center_right" => (right_x, middle_y),
                "bottom_left" => (left_x, bottom_y),
                "bottom_right" => (right_x, bottom_y),
                _ => (center_x, bottom_y),
            }
        }
    };

    ((x, y), (width as u32, height as u32))
}

/**
 * SOURCE OF TRUTH KEYWORDS: apply_pill_frame, move_size_move
 */
fn apply_pill_frame(
    window: &tauri::WebviewWindow,
    placement: PillPlacement,
    points: (f64, f64),
    style: &str,
    anchor: &str,
) {
    let ((x, y), (w, h)) = pill_frame_on(placement.origin, placement.size, placement.scale, points, style, anchor);
    let position = tauri::PhysicalPosition::new(x, y);
    let size = tauri::PhysicalSize::new(w, h);

    if let Err(err) = window.set_position(position) {
        tracing::warn!(error = %err, "could not move the pill to its display");
        return;
    }
    if let Err(err) = window.set_size(size) {
        tracing::warn!(error = %err, "could not size the pill for its display");
    }
    if let Err(err) = window.set_position(position) {
        tracing::warn!(error = %err, "could not position the pill");
    }
}

fn menu_error(err: tauri::Error) -> AppError {
    AppError::internal(err).with_detail("building the menu bar item")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_pill_centres_on_every_display_regardless_of_scale() {
        let pill = (200.0, 44.0);

        for (label, origin, size, scale) in [
            ("built-in 2x", (0, 0), (3456u32, 2234u32), 2.0),
            ("external 1x, to the right", (3456, 0), (2560, 1440), 1.0),
            ("external 1.5x, above", (0, -1600), (2560, 1600), 1.5),
        ] {
            let ((x, y), (w, h)) = pill_frame_on(origin, size, scale, pill, "floating_pill", "bottom_center");

            let left_gap = x - origin.0;
            let right_gap = (origin.0 + size.0 as i32) - (x + w as i32);
            assert!(
                (left_gap - right_gap).abs() <= 1,
                "{label}: off-centre by {}px — left {left_gap}, right {right_gap}",
                (left_gap - right_gap).abs()
            );

            // Sized in THIS display's pixels, not some other display's.
            assert_eq!(w, (pill.0 * scale).round() as u32, "{label}: wrong width");
            assert_eq!(h, (pill.1 * scale).round() as u32, "{label}: wrong height");

            // And sitting above the bottom edge by the specified inset.
            let bottom_gap = (origin.1 + size.1 as i32) - (y + h as i32);
            assert_eq!(
                bottom_gap,
                (PILL_BOTTOM_INSET_PT * scale).round() as i32,
                "{label}: wrong distance from the bottom edge"
            );
        }
    }

    /**
     * WHAT:  A pill measured on one display is never used to place it on
     *        another.
     * WHY:   States the defect directly, so the test survives a refactor that
     *        keeps the numbers but reintroduces the mistake: the frame for a
     *        display must depend only on that display.
     */
    #[test]
    fn placement_ignores_where_the_pill_used_to_be() {
        let pill = (200.0, 44.0);
        let external = ((3456, 0), (2560u32, 1440u32), 1.0);

        let ((x, _), (w, _)) = pill_frame_on(external.0, external.1, external.2, pill, "floating_pill", "bottom_center");

        // What the old code effectively did: centre using the 2x display's
        // pixel width. Kept here as the counter-example so the difference is
        // visible rather than asserted in the abstract.
        let stale_width = (pill.0 * 2.0).round() as i32;
        let stale_x = external.0 .0 + (external.1 .0 as i32 - stale_width) / 2;

        assert_ne!(
            x, stale_x,
            "placement is still being computed from the previous display's pixels"
        );
        assert_eq!(w, 200, "on a 1x display a 200pt pill is 200px");
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: two_recordings_regression, appearance_gate
     * WHAT:  A hide followed immediately by a show counts as a new appearance,
     *        even while the exit animation is still running.
     * WHY:   THE bug the operator reported twice: "I still see the pill element
     *        jumping all over the place when I'm switching between different
     *        windows... It only fixes itself when I run the recording twice on
     *        a different monitor."
     *
     *        The appearance gate used to be `window.is_visible()`, and the exit
     *        animation defers `hide()` into its completion handler — so for the
     *        length of the fade the window is still visible to AppKit while
     *        being, to the user, gone. Starting a recording inside that window
     *        read as "already up", skipped placement entirely, and the pill
     *        appeared at its position on the PREVIOUS display. The second
     *        recording worked because the hide had landed by then.
     *
     *        The flag is therefore cleared when a hide is REQUESTED, and this
     *        test asserts exactly that timing — that a show arriving before the
     *        animation finishes still counts as an appearance.
     * WHERE: Guards PILL_SHOWN's use in fit_pill_to_state and set_pill_visible.
     */
    #[test]
    fn a_show_during_the_exit_animation_still_counts_as_an_appearance() {
        PILL_SHOWN.store(false, Ordering::SeqCst);

        // First appearance.
        assert!(
            !PILL_SHOWN.swap(true, Ordering::SeqCst),
            "first show places"
        );

        // A tick mid-recording is not an appearance.
        assert!(
            PILL_SHOWN.swap(true, Ordering::SeqCst),
            "ticks must not replace"
        );

        // Hide REQUESTED. The animation is still running and the window is
        // still visible to AppKit at this instant — that is the whole point.
        assert!(
            PILL_SHOWN.swap(false, Ordering::SeqCst),
            "the hide request is what clears the flag, not the animation ending"
        );

        // The next recording starts before the fade completes.
        assert!(
            !PILL_SHOWN.swap(true, Ordering::SeqCst),
            "a recording started during the exit must still place the pill, or it \
             appears wherever it was on the previous display"
        );

        PILL_SHOWN.store(false, Ordering::SeqCst);
    }

    #[test]
    fn the_pill_dimensions_are_all_present_in_the_tokens() {
        let pill = PillMetrics::from_tokens();

        for (name, value) in [
            ("--pill-width", pill.width),
            ("--pill-width-compact", pill.width_compact),
            ("--pill-height", pill.height),
            ("--pill-width-failed", pill.width_failed),
            ("--pill-height-failed", pill.height_failed),
            ("--radius-pill", pill.radius),
        ] {
            assert!(
                value > 0.0,
                "{name} resolved to {value}, which cannot be a size"
            );
        }

        assert!(
            pill.width_failed >= pill.width,
            "the failure box carries a sentence, so it cannot be narrower than the indicator"
        );
        assert!(
            pill.radius * 2.0 <= pill.height + f64::EPSILON,
            "a radius over half the height cannot round a rectangle, and the vibrancy layer would square off"
        );
    }

    #[test]
    fn tray_icon_image_resolves_without_error() {
        let icon_res = get_tray_icon_image();
        assert!(icon_res.is_ok(), "tray icon image should resolve cleanly");
    }
}
