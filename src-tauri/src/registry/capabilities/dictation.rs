/*!
 * SOURCE OF TRUTH KEYWORDS: dictation_capability, CapabilityKey::Dictation
 * WHAT:  Declares the core Dictation capability, its hotkeys, latency metrics, and settings.
 * WHERE: Consumed by registry/capabilities/mod.rs.
 */

use super::helpers::{
    advanced, choice, default_hotkey, dynamic_choice, metric, number, text, toggle,
};
use crate::ports::permissions::OsPermission;
use crate::registry::capability::{
    Capability, CapabilityKey, HotkeyDef, NavDef, SettingDef, SettingSection,
};
use crate::registry::keys;
use crate::types::settings::ChoiceSource;
use crate::types::{
    EngineFeature, HotkeyBinding, KeyModifier, LatencyStage, SettingKind, SettingValue,
};

pub fn dictation_capability() -> Capability {
    Capability {
        key: CapabilityKey::Dictation,
        name: text("Dictation"),
        description: text("Press a hotkey, talk, press it again — your words are pasted where you were typing."),
        requires: vec![OsPermission::Microphone],
        engine_needs: vec![EngineFeature::Streaming],
        nav: Some(NavDef {
            label: text("Dictation"),
            route: text("dictation"),
            icon: text("Mic"),
            order: 5,
        }),
        hotkey: Some(HotkeyDef {
            id: text("dictation.toggle"),
            label: text("Start / stop dictation"),
            default: default_hotkey(),
            setting_key: Some(text(keys::DICTATION_HOTKEY)),
        }),
        metrics: vec![
            metric(LatencyStage::HotkeyDispatch, "Hotkey", false),
            metric(LatencyStage::CaptureStart, "Hotkey to audio", false),
            metric(LatencyStage::DeviceOpen, "Microphone open", false),
            metric(LatencyStage::ChunkDecode, "Background decode", false),
            metric(LatencyStage::TailDecode, "Final decode", true),
            metric(LatencyStage::Assemble, "Assemble", false),
            metric(LatencyStage::Enhance, "Enhance", false),
            metric(LatencyStage::TotalFinalize, "Stop to pasted", true),
        ],
        settings: vec![
            SettingDef {
                key: text(keys::DICTATION_HOTKEY),
                label: text("Dictation hotkey"),
                description: text("The key you press anywhere to start and stop."),
                section: SettingSection::Recording,
                kind: SettingKind::Hotkey,
                default: SettingValue::Hotkey(default_hotkey()),
                requires_engine: vec![],
                requires_permission: vec![],
                advanced: false,
            },
            SettingDef {
                key: text(keys::SECONDARY_HOTKEY),
                label: text("Secondary hotkey"),
                description: text("Optional second shortcut for alternative keyboard or desktop workflows."),
                section: SettingSection::Recording,
                kind: SettingKind::Hotkey,
                default: SettingValue::Hotkey(HotkeyBinding {
                    modifiers: vec![KeyModifier::Option],
                    key: "Backquote".to_string(),
                }),
                requires_engine: vec![],
                requires_permission: vec![],
                advanced: false,
            },
            choice(
                keys::MOUSE_TRIGGER,
                "Mouse push-to-talk button",
                "Hold a mouse button to dictate directly without touching the keyboard.",
                SettingSection::Recording,
                &[
                    ("none", "None", "Keyboard shortcuts only"),
                    ("mouse_middle", "Middle click (Scroll wheel)", "Hold middle mouse button to talk"),
                    ("mouse_back", "Mouse button 4 (Back)", "Hold side thumb back button to talk"),
                    ("mouse_forward", "Mouse button 5 (Forward)", "Hold side thumb forward button to talk"),
                ],
                "none",
            ),
            choice(
                keys::DICTATION_MODE,
                "Hotkey behaviour",
                "Toggle presses once to start and once to stop. Push-to-talk records only while held.",
                SettingSection::Recording,
                &[
                    ("toggle", "Toggle", "Press to start, press again to stop"),
                    ("push_to_talk", "Push to talk", "Hold to record, release to send"),
                ],
                "toggle",
            ),
            choice(
                keys::CAPTURE_MODE,
                "Microphone",
                "Instant keeps the microphone open so the first syllable is never clipped — macOS will show the orange microphone indicator at all times.",
                SettingSection::Recording,
                &[
                    ("on_demand", "Open when I press the key", "Indicator only shows while recording"),
                    ("instant", "Keep it warm (instant)", "Never clips the first word; indicator always lit"),
                ],
                "on_demand",
            ),
            toggle(
                keys::DISCARD_ON_ESCAPE,
                "Escape discards immediately",
                "Press Escape and the recording is gone at once, with no countdown to change your mind.",
                SettingSection::Recording,
                false,
            ),
            number(
                keys::CANCEL_COUNTDOWN_MS,
                "Cancel countdown",
                "How long Escape waits before discarding a recording. Press Escape again during the countdown to keep it.",
                SettingSection::Recording,
                (1000.0, 10_000.0, 500.0),
                Some("ms"),
                3000.0,
            ),
            dynamic_choice(
                keys::INPUT_DEVICE,
                "Input device",
                "Which microphone to record from.",
                SettingSection::Recording,
                ChoiceSource::InputDevices,
                "default",
            ),
            toggle(
                keys::AUDIO_FEEDBACK,
                "Sounds",
                "A short sound when recording starts and when text is delivered.",
                SettingSection::Recording,
                true,
            ),
            advanced(toggle(
                keys::PASTE_CONFIRMATION_SOUND,
                "Paste confirmation sound",
                "Play a short, distinct chime after text is successfully pasted.",
                SettingSection::Recording,
                true,
            )),
            advanced(number(
                keys::PASTE_CONFIRMATION_VOLUME,
                "Paste confirmation volume",
                "Volume of the paste confirmation chime.",
                SettingSection::Recording,
                (0.0, 100.0, 5.0),
                Some("%"),
                35.0,
            )),
            advanced(number(
                keys::FINALIZE_TIMEOUT_MS,
                "Finalize timeout",
                "If the last fragment has not decoded by this point, deliver what is ready rather than waiting.",
                SettingSection::Recording,
                (5000.0, 60_000.0, 500.0),
                Some("ms"),
                45_000.0,
            )),
        ],
    }
}
