/*!
 * SOURCE OF TRUTH KEYWORDS: adapters_windows, WindowsInjector, WindowsPermissions,
 *   ModifierTap, watch_modifier_tap, play_feedback, FeedbackSound
 * WHAT:  Windows-specific platform implementations of the ports and system integrations.
 * WHY:   Encapsulates Win32 APIs (SendInput, GetForegroundWindow, MessageBeep,
 *        SetWindowsHookExW) cleanly under the adapters layer.
 * WHERE: Consumed by adapters/mod.rs, bootstrap.rs, and session actor.
 */

pub mod credentials;
pub mod injector;
pub mod modifier_tap;
mod ole_drag;
pub mod permissions;
pub mod raw_input;
pub mod sound;
pub mod toast;

pub use credentials::WindowsCredentialStore;
pub use injector::WindowsInjector;
pub use modifier_tap::{watch_modifier_tap, ModifierTap, TAPS_REQUIRED};
pub use permissions::WindowsPermissions;
pub use raw_input::{start_mouse_raw_input, MouseRawInputHandle, MouseTriggerButton};
pub use sound::{play_feedback, play_haptic_tap, play_paste_confirmation, FeedbackSound};
pub use toast::WindowsToast;

pub type OsInjector = WindowsInjector<WindowsPermissions>;
pub type OsPermissions = WindowsPermissions;
