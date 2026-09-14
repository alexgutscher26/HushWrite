/*!
 * SOURCE OF TRUTH KEYWORDS: history_capability, CapabilityKey::History
 * WHAT:  Declares the History capability, its navigation, and privacy/retention/encryption settings.
 * WHERE: Consumed by registry/capabilities/mod.rs.
 */

use super::helpers::{number, text, toggle};
use crate::registry::capability::{Capability, CapabilityKey, NavDef, SettingSection};
use crate::registry::keys;

pub fn history_capability() -> Capability {
    Capability {
        key: CapabilityKey::History,
        name: text("History"),
        description: text("Everything you have dictated, searchable, on this machine only."),
        requires: vec![],
        engine_needs: vec![],
        nav: Some(NavDef {
            label: text("History"),
            route: text("history"),
            icon: text("Clock"),
            order: 20,
        }),
        hotkey: None,
        metrics: vec![],
        settings: vec![
            number(
                keys::RETENTION_DAYS,
                "Keep history for",
                "Older transcripts are deleted automatically. Set to 0 to keep everything forever.",
                SettingSection::Privacy,
                (0.0, 365.0, 1.0),
                Some("days"),
                0.0,
            ),
            toggle(
                keys::ENCRYPTION_AT_REST,
                "Encrypt transcripts at rest",
                "Encrypt session text in the local database using AES-256 encryption.",
                SettingSection::Privacy,
                true,
            ),
            toggle(
                keys::PURGE_ON_LOCK,
                "Auto-purge on lock screen",
                "Automatically clear in-memory transcript buffers and sanitize clipboard when the screen is locked.",
                SettingSection::Privacy,
                true,
            ),
            toggle(
                keys::INCOGNITO_MODE,
                "Incognito / zero-history mode",
                "Deliver dictations immediately without saving any transcript text to the local history database.",
                SettingSection::Privacy,
                false,
            ),
            toggle(
                keys::AIR_GAP_MODE,
                "Air-Gap / Hardware Isolation Mode",
                "Hard kill-switch that closes sockets, isolates networking to loopback, and disables all outbound checks.",
                SettingSection::Privacy,
                false,
            ),
            toggle(
                keys::SAVE_AUDIO_RECORDINGS,
                "Save audio recordings for quality review",
                "Store 16kHz mono audio recordings locally on device to review dictation audio in History. Deleted automatically when sessions are deleted or purged.",
                SettingSection::Privacy,
                false,
            ),
        ],
    }
}
