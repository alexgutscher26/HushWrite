/*!
 * SOURCE OF TRUTH KEYWORDS: CAPABILITIES, capabilities, capability,
 *   setting_def, default_settings, nav_items, hotkey_defs, all_settings,
 *   validate_registry, RegistrySnapshot
 * WHAT:  The single source of truth for what this app has. One table of
 *        capabilities, plus the lookups every other layer uses to read it.
 * WHY:   A feature is an entry here, never a new pattern. Adding one wires up
 *        its settings UI, its permission preflight, its nav placement, its
 *        hotkey and its metrics at once, because all five read this table
 *        instead of keeping their own copies. The rule that follows from it:
 *        if you are writing a `match` on a feature name anywhere outside this
 *        module, the branch belongs in the table instead.
 *
 *        Built through LazyLock rather than as a `const`, because the entries
 *        hold owned Strings and Vecs. That is deliberate — the same structs
 *        cross to TypeScript through specta unchanged, so the frontend reads
 *        the identical table rather than a hand-maintained mirror of it.
 * WHERE: Read by ipc/factory.rs (preflight), services/settings.rs (defaults and
 *        validation), the Settings view (control generation), the dashboard
 *        shell (nav) and the hotkey adapter (bindings).
 */

pub mod capabilities;
pub mod capability;
pub mod keys;

#[cfg(test)]
mod icons;

/// Asserts that every entry in this table is actually READ by something. Our
/// other guardrails check structure; this one checks reachability, which is the
/// gap every High finding in two independent audits fell through.
#[cfg(test)]
mod reachability;

use std::collections::HashMap;
use std::sync::LazyLock;

use serde::{Deserialize, Serialize};
use specta::Type;

pub use capability::{
    Capability, CapabilityKey, HotkeyDef, MetricDef, NavDef, SettingDef, SettingSection,
};

use crate::types::SettingValue;

/// The table. Everything else in this module is a view onto it.
pub static CAPABILITIES: LazyLock<Vec<Capability>> =
    LazyLock::new(capabilities::build_capabilities);

// ── Views onto the table ─────────────────────────────────────────────────

pub fn capabilities() -> &'static [Capability] {
    &CAPABILITIES
}

pub fn capability(key: CapabilityKey) -> Option<&'static Capability> {
    CAPABILITIES.iter().find(|c| c.key == key)
}

/// Every setting in the app, flattened across capabilities.
pub fn all_settings() -> impl Iterator<Item = &'static SettingDef> {
    CAPABILITIES.iter().flat_map(|c| c.settings.iter())
}

pub fn setting_def(key: &str) -> Option<&'static SettingDef> {
    all_settings().find(|s| s.key == key)
}

/// The defaults every fresh install starts from, and the fallback for any
/// setting that has never been written.
pub fn default_settings() -> HashMap<String, SettingValue> {
    all_settings()
        .map(|def| (def.key.clone(), def.default.clone()))
        .collect()
}

/// Sidebar entries, in declared order.
pub fn nav_items() -> Vec<&'static NavDef> {
    let mut items: Vec<&NavDef> = CAPABILITIES.iter().filter_map(|c| c.nav.as_ref()).collect();
    items.sort_by_key(|n| n.order);
    items
}

pub fn hotkey_defs() -> Vec<&'static HotkeyDef> {
    CAPABILITIES
        .iter()
        .filter_map(|c| c.hotkey.as_ref())
        .collect()
}

/**
 * SOURCE OF TRUTH KEYWORDS: RegistrySnapshot
 * WHAT:  The whole table as one serialisable value for the frontend.
 * WHY:   The frontend reads the SAME declarations the backend enforces, rather
 *        than a mirror someone has to remember to update. That is what makes a
 *        generated settings page trustworthy.
 * WHERE: Returned by the registry IPC command; consumed by the Settings view
 *        and the dashboard shell.
 */
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RegistrySnapshot {
    pub capabilities: Vec<Capability>,
}

pub fn snapshot() -> RegistrySnapshot {
    RegistrySnapshot {
        capabilities: CAPABILITIES.clone(),
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: validate_registry
 * WHAT:  Self-check over the table: unique setting keys, unique capability
 *        keys, and every default matching its declared control kind.
 * WHY:   These are the mistakes that are invisible at compile time and silent
 *        at runtime — a duplicated key means one setting quietly shadows
 *        another, and a default of the wrong type means a control renders
 *        empty. Running this at startup turns both into a loud failure during
 *        development instead of a support ticket.
 * WHERE: Called once from lib.rs during setup, and asserted in tests.
 */
pub fn validate_registry() -> Result<(), Vec<String>> {
    let mut problems = Vec::new();
    let mut seen_settings: HashMap<&str, usize> = HashMap::new();
    let mut seen_capabilities: HashMap<CapabilityKey, usize> = HashMap::new();

    for capability in CAPABILITIES.iter() {
        *seen_capabilities.entry(capability.key).or_insert(0) += 1;

        for setting in &capability.settings {
            *seen_settings.entry(setting.key.as_str()).or_insert(0) += 1;

            if !setting.default.matches_kind(&setting.kind) {
                problems.push(format!(
                    "setting `{}` has a default that does not match its control kind",
                    setting.key
                ));
            }
        }
    }

    for (key, count) in seen_settings {
        if count > 1 {
            problems.push(format!("setting key `{key}` is declared {count} times"));
        }
    }
    for (key, count) in seen_capabilities {
        if count > 1 {
            problems.push(format!(
                "capability `{}` is declared {count} times",
                key.as_str()
            ));
        }
    }

    if problems.is_empty() {
        Ok(())
    } else {
        Err(problems)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_is_internally_consistent() {
        if let Err(problems) = validate_registry() {
            panic!("registry is invalid:\n  {}", problems.join("\n  "));
        }
    }

    #[test]
    fn every_declared_key_constant_resolves_to_a_setting() {
        // Guards against a constant being renamed without its declaration.
        for key in [
            keys::DICTATION_HOTKEY,
            keys::DICTATION_MODE,
            keys::CAPTURE_MODE,
            keys::CANCEL_COUNTDOWN_MS,
            keys::DISCARD_ON_ESCAPE,
            keys::INPUT_DEVICE,
            keys::AUDIO_FEEDBACK,
            keys::TRANSCRIPTION_MODEL,
            keys::LANGUAGE,
            keys::FINALIZE_TIMEOUT_MS,
            keys::AUTO_PASTE,
            keys::RESTORE_CLIPBOARD,
            keys::PASTE_DELAY_MS,
            keys::CLIPBOARD_RESTORE_DELAY_MS,
            keys::CAPITALISE_SENTENCES,
            keys::NORMALISE_PUNCTUATION,
            keys::STRIP_FILLERS,
            keys::SPOKEN_COMMANDS,
            keys::APPLY_CORRECTIONS,
            keys::EXPAND_ABBREVIATIONS,
            keys::DISABLED_ABBREVIATIONS,
            keys::NORMALISE_NUMBERS,
            keys::NORMALISE_URLS_AND_PATHS,
            keys::CODE_MODE,
            keys::CODE_CASING_STYLE,
            keys::RETENTION_DAYS,
            keys::SAVE_AUDIO_RECORDINGS,
            keys::LAUNCH_AT_LOGIN,
            keys::BASELINE_WPM,
            keys::PILL_OPACITY,
            keys::PILL_COMPACT,
            keys::CHECK_UPDATES,
            keys::ONBOARDING_COMPLETE,
        ] {
            assert!(
                setting_def(key).is_some(),
                "setting constant `{key}` has no declaration in the registry"
            );
        }
    }

    #[test]
    fn nav_items_are_ordered() {
        let orders: Vec<u32> = nav_items().iter().map(|n| n.order).collect();
        let mut sorted = orders.clone();
        sorted.sort_unstable();
        assert_eq!(orders, sorted);
    }
}
