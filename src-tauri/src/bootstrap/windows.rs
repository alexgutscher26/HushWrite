/*!
 * SOURCE OF TRUTH KEYWORDS: bootstrap_windows, window_vibrancy, attach_sidebar,
 *   attach_rail, place_rail, keep_rail_centred, keep_windows_alive, track_pill_drag,
 *   let_the_pill_float_over_everything, show_first_window, show_dashboard_on_launch
 * WHAT:  Window geometry, vibrancy, attachment, and positioning logic.
 * WHERE: Consumed by bootstrap/mod.rs and tray.rs.
 */

use tauri::{AppHandle, Manager};

use crate::db::Database;
use crate::error::AppResult;
use crate::registry::keys;
use crate::services;
use crate::types::SettingValue;

pub const DASHBOARD_WINDOW: &str = "dashboard";
pub const PILL_WINDOW: &str = "pill";
pub const SIDEBAR_WINDOW: &str = "sidebar";
pub const ONBOARDING_WINDOW: &str = "onboarding";

/**
 * SOURCE OF TRUTH KEYWORDS: keep_windows_alive, CloseRequested, prevent_close,
 *   hide_on_close
 * WHAT:  Makes closing a window HIDE it rather than destroy it.
 * WHY:   Tauri destroys a window when it is closed, and a destroyed window
 *        cannot be shown again — `get_webview_window` returns None from then
 *        on. So closing the dashboard did not merely put it away: it removed
 *        the app's ONLY window permanently, and the tray item that exists to
 *        reopen it silently did nothing for the rest of the session. Dictation
 *        kept working, which made it look like the window had broken rather
 *        than gone.
 * WHERE: Installed once during setup, for every window a user can close.
 */
pub fn keep_windows_alive(app: &AppHandle) {
    for label in [DASHBOARD_WINDOW, ONBOARDING_WINDOW] {
        let Some(window) = app.get_webview_window(label) else {
            continue;
        };
        let handle = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Err(err) = handle.hide() {
                    tracing::warn!(error = %err, "could not hide the window on close");
                }
                tracing::debug!(
                    window = handle.label(),
                    "window hidden rather than destroyed"
                );
            }
        });
    }
}

pub fn track_pill_drag(app: &AppHandle) {
    let Some(pill) = app.get_webview_window(PILL_WINDOW) else {
        return;
    };
    let handle = app.clone();
    pill.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            crate::tray::record_pill_drag_position(&handle, position.x, position.y);
        }
    });
}

/**
 * SOURCE OF TRUTH KEYWORDS: apply_window_vibrancy, NSVisualEffectMaterial,
 *   glass, vibrancy, frosted
 * WHAT:  Installs the native NSVisualEffectView behind each window.
 * WHY:   THIS IS WHAT MAKES THE GLASS. Every window is declared
 *        `transparent: true` and the web layer paints a transparent body, on
 *        the understanding that a native vibrancy view sits behind it.
 * WHERE: Called once per window during setup.
 */
pub fn apply_window_vibrancy(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

        let window_radius = crate::tray::design_token("--radius-window");
        for (label, material, radius) in [
            (
                PILL_WINDOW,
                NSVisualEffectMaterial::HudWindow,
                Some(crate::tray::pill_radius()),
            ),
            (
                SIDEBAR_WINDOW,
                NSVisualEffectMaterial::Sidebar,
                Some(window_radius),
            ),
            (
                DASHBOARD_WINDOW,
                NSVisualEffectMaterial::Sidebar,
                Some(window_radius),
            ),
            (
                ONBOARDING_WINDOW,
                NSVisualEffectMaterial::Popover,
                Some(window_radius),
            ),
        ] {
            let Some(window) = app.get_webview_window(label) else {
                continue;
            };
            match apply_vibrancy(&window, material, Some(NSVisualEffectState::Active), radius) {
                Ok(()) => tracing::debug!(window = label, "vibrancy applied"),
                Err(err) => {
                    tracing::warn!(window = label, error = %err, "could not apply vibrancy")
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

/**
 * SOURCE OF TRUTH KEYWORDS: show_first_window
 * WHAT:  Opens onboarding on a fresh install, and nothing at all afterwards.
 * WHY:   HushWrite is invisible until summoned — that is the product.
 * WHERE: The last step of setup.
 */
pub fn show_first_window(app: &AppHandle, db: &Database) -> AppResult<()> {
    let complete = matches!(
        services::settings::get_setting(db, keys::ONBOARDING_COMPLETE)
            .ok()
            .flatten(),
        Some(SettingValue::Bool(true))
    );

    if complete {
        return Ok(());
    }

    if let Some(window) = app.get_webview_window(ONBOARDING_WINDOW) {
        #[cfg(target_os = "macos")]
        let _ = app.show();

        let _ = window.show();
        let _ = window.set_focus();
        tracing::info!("onboarding opened");
    }
    Ok(())
}

/**
 * SOURCE OF TRUTH KEYWORDS: show_dashboard_on_launch, HushWrite_SHOW_DASHBOARD
 * WHAT:  Opens the dashboard at launch when the environment asks for it.
 * WHERE: Read once at the end of setup.
 */
pub fn show_dashboard_on_launch(app: &AppHandle) {
    if std::env::var("HushWrite_SHOW_DASHBOARD").is_err() {
        return;
    }
    tracing::info!("HushWrite_SHOW_DASHBOARD set — opening the dashboard");
    crate::tray::show_dashboard(app);
}

/**
 * SOURCE OF TRUTH KEYWORDS: let_the_pill_float_over_everything, spaces
 * WHAT:  Makes the pill visible over full-screen apps and on every Space.
 * WHERE: Called once by setup, after the windows exist.
 */
pub fn let_the_pill_float_over_everything(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

        let Some(pill) = app.get_webview_window(PILL_WINDOW) else {
            return;
        };
        let Ok(handle) = pill.ns_window() else {
            return;
        };

        // SAFETY: the handle is Tauri's NSWindow for a window that exists, and
        // this runs on the main thread during setup.
        unsafe {
            let Some(window) = Retained::retain(handle as *mut NSWindow) else {
                return;
            };

            window.setCollectionBehavior(
                NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::FullScreenAuxiliary
                    | NSWindowCollectionBehavior::Stationary
                    | NSWindowCollectionBehavior::IgnoresCycle,
            );

            window.setLevel(25);
        }

        tracing::info!("the pill will follow the user into full-screen apps");
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(pill) = app.get_webview_window(PILL_WINDOW) {
            windows_pill::setup_windows_pill(app, &pill);
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = app;
}

#[cfg(target_os = "windows")]
mod windows_pill {
    use std::sync::OnceLock;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        AppendMenuW, CallWindowProcW, CreatePopupMenu, DefWindowProcW, DestroyMenu,
        IsWindowVisible, SetWindowLongPtrW, SetWindowPos, TrackPopupMenuEx, GWLP_WNDPROC,
        HWND_TOPMOST, MF_SEPARATOR, MF_STRING, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        TPM_BOTTOMALIGN, TPM_LEFTALIGN, WM_ACTIVATE, WM_ACTIVATEAPP,
        WM_COMMAND, WM_CONTEXTMENU, WNDPROC,
    };
    use windows::core::w;
    use tauri::{AppHandle, Emitter};

    static PREV_WNDPROC: OnceLock<AppHandle> = OnceLock::new();
    static PREV_WNDPROC_PTR: std::sync::atomic::AtomicIsize = std::sync::atomic::AtomicIsize::new(0);

    const MENU_COPY: usize = 1;
    const MENU_HISTORY: usize = 2;
    const MENU_SETTINGS: usize = 3;
    const MENU_DISMISS: usize = 4;

    fn emit_action(action: &'static str) {
        if let Some(app) = PREV_WNDPROC.get() {
            if let Err(error) = app.emit("pill-context-action", action) {
                tracing::debug!(%error, "could not emit pill context action");
            }
        }
    }

    fn show_context_menu(hwnd: HWND, x: i32, y: i32) {
        unsafe {
            let Ok(menu) = CreatePopupMenu() else { return };
            let _ = AppendMenuW(menu, MF_STRING, MENU_COPY, w!("Copy transcript"));
            let _ = AppendMenuW(menu, MF_STRING, MENU_HISTORY, w!("Open history"));
            let _ = AppendMenuW(menu, MF_STRING, MENU_SETTINGS, w!("Settings"));
            let _ = AppendMenuW(menu, MF_SEPARATOR, 0, None);
            let _ = AppendMenuW(menu, MF_STRING, MENU_DISMISS, w!("Dismiss"));
            let _ = TrackPopupMenuEx(
                menu,
                (TPM_LEFTALIGN | TPM_BOTTOMALIGN).0,
                x,
                y,
                hwnd,
                None,
            );
            let _ = DestroyMenu(menu);
        }
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: pill_subclass_wndproc, HWND_TOPMOST, WM_ACTIVATE
     * WHAT:  Re-asserts HWND_TOPMOST position on WM_ACTIVATE / WM_ACTIVATEAPP.
     * WHY:   DirectX exclusive-fullscreen windows or high-DPI full-screen apps
     *        can steal exclusive display mode and demote standard topmost windows.
     *        Re-asserting SetWindowPos with HWND_TOPMOST on activation ensures the
     *        pill overlay stays floating on top of fullscreen applications.
     */
    pub(crate) unsafe extern "system" fn pill_subclass_wndproc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if msg == WM_CONTEXTMENU {
            let x = (lparam.0 & 0xffff) as i16 as i32;
            let y = ((lparam.0 >> 16) & 0xffff) as i16 as i32;
            show_context_menu(hwnd, x, y);
            return LRESULT(0);
        }

        if msg == WM_COMMAND {
            // The popup uses TPM_RETURNCMD, but swallow command notifications
            // from the WebView so they cannot become browser menu commands.
            let id = (wparam.0 & 0xffff) as usize;
            match id {
                MENU_COPY => emit_action("copy_transcript"),
                MENU_HISTORY => emit_action("open_history"),
                MENU_SETTINGS => emit_action("open_settings"),
                MENU_DISMISS => emit_action("dismiss"),
                _ => return DefWindowProcW(hwnd, msg, wparam, lparam),
            }
            return LRESULT(0);
        }

        if (msg == WM_ACTIVATE || msg == WM_ACTIVATEAPP) && IsWindowVisible(hwnd).as_bool() {
            let _ = SetWindowPos(
                hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            );
        }

        let prev = PREV_WNDPROC_PTR.load(std::sync::atomic::Ordering::SeqCst);
        if prev != 0 {
            let prev_proc: WNDPROC = std::mem::transmute(prev);
            CallWindowProcW(prev_proc, hwnd, msg, wparam, lparam)
        } else {
            DefWindowProcW(hwnd, msg, wparam, lparam)
        }
    }

    pub fn setup_windows_pill(app: &AppHandle, pill: &tauri::WebviewWindow) {
        let _ = PREV_WNDPROC.set(app.clone());
        if let Ok(hwnd) = pill.hwnd() {
            unsafe {
                let raw_hwnd = HWND(hwnd.0 as _);
                let prev = SetWindowLongPtrW(
                    raw_hwnd,
                    GWLP_WNDPROC,
                    pill_subclass_wndproc as *const () as usize as isize,
                );
                PREV_WNDPROC_PTR.store(prev, std::sync::atomic::Ordering::SeqCst);
                let _ = SetWindowPos(
                    raw_hwnd,
                    HWND_TOPMOST,
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                );
                tracing::info!("pill subclassed with WM_ACTIVATE HWND_TOPMOST handler on Windows");
            }
        }
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: attach_sidebar, addChildWindow, detached_rail
 * WHAT:  Sizes the navigation rail, places it to the left of the dashboard.
 * WHERE: Called once by setup, after the windows exist.
 */
pub fn attach_sidebar(app: &AppHandle) {
    let (Some(rail), Some(dashboard)) = (
        app.get_webview_window(SIDEBAR_WINDOW),
        app.get_webview_window(DASHBOARD_WINDOW),
    ) else {
        tracing::warn!("the rail or the dashboard is missing; leaving them unattached");
        return;
    };

    let (width, height) = rail_size_points();
    let nav_items = crate::registry::CAPABILITIES
        .iter()
        .filter(|capability| capability.nav.is_some())
        .count();

    if let Err(err) = rail.set_size(tauri::LogicalSize::new(width, height)) {
        tracing::warn!(error = %err, "could not size the rail");
    }

    let _ = dashboard;
    tracing::info!(
        nav_items,
        width,
        height,
        "rail sized from the design tokens"
    );
}

/**
 * SOURCE OF TRUTH KEYWORDS: attach_rail, addChildWindow_orders_it_in
 * WHAT:  Makes the rail a child of the dashboard, once, the first time the
 *        dashboard is actually on screen.
 * WHERE: Called by tray::show_dashboard, after place_rail.
 */
pub fn attach_rail(app: &AppHandle) {
    use std::sync::atomic::{AtomicBool, Ordering};
    static ATTACHED: AtomicBool = AtomicBool::new(false);
    if ATTACHED.swap(true, Ordering::SeqCst) {
        return;
    }

    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2_app_kit::{NSWindow, NSWindowOrderingMode};

        let (Some(rail), Some(dashboard)) = (
            app.get_webview_window(SIDEBAR_WINDOW),
            app.get_webview_window(DASHBOARD_WINDOW),
        ) else {
            return;
        };

        let (Ok(child), Ok(parent)) = (rail.ns_window(), dashboard.ns_window()) else {
            return;
        };

        // SAFETY: both handles come from Tauri for windows that exist, and this
        // runs on the main thread from a Tauri event.
        unsafe {
            let child = child as *mut NSWindow;
            let parent = parent as *mut NSWindow;
            let (Some(child), Some(parent)) = (Retained::retain(child), Retained::retain(parent))
            else {
                return;
            };
            parent.addChildWindow_ordered(&child, NSWindowOrderingMode::Above);
        }

        tracing::info!("rail attached to the dashboard");
    }

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{SetWindowLongPtrW, GWLP_HWNDPARENT};

        let (Some(rail), Some(dashboard)) = (
            app.get_webview_window(SIDEBAR_WINDOW),
            app.get_webview_window(DASHBOARD_WINDOW),
        ) else {
            return;
        };

        if let (Ok(rail_hwnd), Ok(dash_hwnd)) = (rail.hwnd(), dashboard.hwnd()) {
            unsafe {
                let _ = SetWindowLongPtrW(
                    HWND(rail_hwnd.0 as _),
                    GWLP_HWNDPARENT,
                    dash_hwnd.0 as isize,
                );
            }
            tracing::info!("rail owned by dashboard window on windows");
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let _ = app;
}

/**
 * SOURCE OF TRUTH KEYWORDS: keep_rail_centred, resize
 * WHAT:  Re-centres and re-places the rail when the dashboard moves or changes height.
 * WHERE: Registered once by setup.
 */
pub fn keep_rail_centred(app: &AppHandle) {
    let handle = app.clone();
    if let Some(dashboard) = app.get_webview_window(DASHBOARD_WINDOW) {
        let rail_handle = app.get_webview_window(SIDEBAR_WINDOW);
        dashboard.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                    place_rail(&handle);
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused {
                        if let Some(ref r) = rail_handle {
                            let _ = r.show();
                            place_rail(&handle);
                        }
                    }
                }
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    if let Some(ref r) = rail_handle {
                        let _ = r.hide();
                    }
                }
                _ => {}
            }
        });
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: rail_size_points, never_measure_the_window
 * WHAT:  The rail's size in POINTS, derived from the design tokens and the
 *        number of nav entries.
 * WHERE: attach_sidebar sizes the window with it; place_rail places with it.
 */
pub fn rail_size_points() -> (f64, f64) {
    use crate::tray::design_token;

    let nav_items = 7.0;

    let padding = design_token("--rail-padding");
    let height = 2.0 * padding
        + design_token("--mark-size-md")
        + design_token("--rail-mark-gap")
        + nav_items * design_token("--rail-item-size")
        + (nav_items - 1.0).max(0.0) * design_token("--rail-item-gap");

    (design_token("--rail-width"), height)
}

pub fn place_rail(app: &AppHandle) {
    let (Some(rail), Some(dashboard)) = (
        app.get_webview_window(SIDEBAR_WINDOW),
        app.get_webview_window(DASHBOARD_WINDOW),
    ) else {
        return;
    };

    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2_app_kit::NSWindow;

        let (Ok(child), Ok(parent)) = (rail.ns_window(), dashboard.ns_window()) else {
            return;
        };

        // SAFETY: both handles come from Tauri for live windows, and this runs
        // on the main thread from a Tauri event.
        unsafe {
            let child = child as *mut NSWindow;
            let parent = parent as *mut NSWindow;
            let (Some(child), Some(parent)) = (Retained::retain(child), Retained::retain(parent))
            else {
                return;
            };

            let (rail_w, rail_h) = rail_size_points();
            let gap = crate::tray::design_token("--rail-detach-gap");

            // Size in points too, so the frame we place is the frame we sized.
            let mut frame = child.frame();
            frame.size.width = rail_w;
            frame.size.height = rail_h;

            let host = parent.frame();
            frame.origin.x = host.origin.x - rail_w - gap;
            frame.origin.y = host.origin.y + (host.size.height - rail_h) / 2.0;

            child.setFrame_display(frame, true);

            tracing::info!(
                x = frame.origin.x,
                y = frame.origin.y,
                w = rail_w,
                h = rail_h,
                host_x = host.origin.x,
                host_y = host.origin.y,
                host_h = host.size.height,
                "rail placed beside the dashboard"
            );
        }
    }

    #[cfg(target_os = "windows")]
    {
        let (rail_w, rail_h) = rail_size_points();
        let gap = crate::tray::design_token("--rail-detach-gap");

        if let (Ok(pos), Ok(size)) = (dashboard.outer_position(), dashboard.outer_size()) {
            let scale_factor = dashboard.scale_factor().unwrap_or(1.0);
            let rail_w_px = (rail_w * scale_factor) as i32;
            let rail_h_px = (rail_h * scale_factor) as i32;
            let gap_px = (gap * scale_factor) as i32;

            let rail_x = pos.x - rail_w_px - gap_px;
            let rail_y = pos.y + (size.height as i32 - rail_h_px) / 2;

            let _ = rail.set_size(tauri::Size::Logical(tauri::LogicalSize::new(rail_w, rail_h)));
            let _ = rail.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(rail_x, rail_y)));

            tracing::debug!(rail_x, rail_y, rail_w, rail_h, "rail placed beside dashboard on windows");
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (rail, dashboard);
    }
}
