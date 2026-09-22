/*!
 * SOURCE OF TRUTH KEYWORDS: setting_keys, DICTATION_HOTKEY, DICTATION_MODE,
 *   CAPTURE_MODE, CANCEL_COUNTDOWN_MS, TRANSCRIPTION_MODEL, LANGUAGE,
 *   AUTO_PASTE, RESTORE_CLIPBOARD, RETENTION_DAYS, LAUNCH_AT_LOGIN
 * WHAT:  Every setting key in the app, as a constant.
 * WHY:   These strings are database keys. A typo in one does not fail — it
 *        reads as an absent setting and silently falls back to the default,
 *        which looks like the setting "not saving" and is miserable to
 *        diagnose. Constants turn that into a build error, and they make every
 *        reader of a setting greppable.
 * WHERE: Used by registry/mod.rs to declare settings and by every consumer that
 *        reads one. Never write one of these strings inline.
 */

// ── Recording ────────────────────────────────────────────────────────────
pub const DICTATION_HOTKEY: &str = "dictation.hotkey";
pub const SECONDARY_HOTKEY: &str = "dictation.secondary_hotkey";
pub const MOUSE_TRIGGER: &str = "dictation.mouse_trigger";
pub const DICTATION_MODE: &str = "dictation.mode";
pub const CAPTURE_MODE: &str = "dictation.capture_mode";
pub const CANCEL_COUNTDOWN_MS: &str = "dictation.cancel_countdown_ms";
pub const DISCARD_ON_ESCAPE: &str = "dictation.discard_on_escape";
pub const INPUT_DEVICE: &str = "dictation.input_device";
pub const AUDIO_FEEDBACK: &str = "dictation.audio_feedback";
pub const MAX_RECORDING_SECONDS: &str = "dictation.max_recording_seconds";
pub const NOISE_GATE_ENABLED: &str = "audio.noise_gate_enabled";
pub const NOISE_GATE_MULTIPLIER: &str = "audio.noise_gate_multiplier";

// ── Transcription ────────────────────────────────────────────────────────
pub const TRANSCRIPTION_ENGINE: &str = "transcription.engine";
pub const TRANSCRIPTION_MODEL: &str = "transcription.model";
pub const LANGUAGE: &str = "transcription.language";
pub const FINALIZE_TIMEOUT_MS: &str = "transcription.finalize_timeout_ms";
pub const TRANSCRIPTION_AUTO_ESCALATE: &str = "transcription.auto_escalate";
pub const TRANSCRIPTION_ESCALATE_MODEL: &str = "transcription.escalate_model";
pub const TRANSCRIPTION_CONFIDENCE_THRESHOLD: &str = "transcription.confidence_threshold";
pub const TRANSCRIPTION_APP_AWARE_ESCALATE: &str = "transcription.app_aware_escalate";

// ── Output ───────────────────────────────────────────────────────────────
pub const AUTO_PASTE: &str = "output.auto_paste";
pub const RESTORE_CLIPBOARD: &str = "output.restore_clipboard";
pub const PASTE_DELAY_MS: &str = "output.paste_delay_ms";
pub const CLIPBOARD_RESTORE_DELAY_MS: &str = "output.clipboard_restore_delay_ms";

// ── Enhancement ──────────────────────────────────────────────────────────
pub const CAPITALISE_SENTENCES: &str = "enhance.capitalise_sentences";
pub const NORMALISE_PUNCTUATION: &str = "enhance.normalise_punctuation";
pub const STRIP_FILLERS: &str = "enhance.strip_fillers";
pub const SPOKEN_COMMANDS: &str = "enhance.spoken_commands";
pub const APPLY_CORRECTIONS: &str = "enhance.apply_corrections";
pub const EXPAND_ABBREVIATIONS: &str = "enhance.expand_abbreviations";
pub const DISABLED_ABBREVIATIONS: &str = "enhance.disabled_abbreviations";
pub const NORMALISE_NUMBERS: &str = "enhance.normalise_numbers";
pub const NORMALISE_URLS_AND_PATHS: &str = "enhance.normalise_urls_and_paths";
pub const CODE_MODE: &str = "enhance.code_mode";
pub const CODE_CASING_STYLE: &str = "enhance.code_casing_style";
pub const PROFANITY_FILTER: &str = "enhance.profanity_filter";
pub const PROFANITY_STYLE: &str = "enhance.profanity_style";
pub const RULE_ORDER: &str = "enhance.rule_order";
pub const LLM_CLEANUP_ENABLED: &str = "enhance.llm_cleanup_enabled";
pub const LLM_MODEL: &str = "enhance.llm_model";
pub const LLM_AUTO_QUANTIZATION: &str = "enhance.llm_auto_quantization";
pub const VOICE_TRANSFORMS_ENABLED: &str = "enhance.voice_transforms_enabled";
pub const CUSTOM_SYSTEM_PROMPT: &str = "enhance.custom_system_prompt";
pub const VOICE_TRANSFORM_TRIGGER: &str = "enhance.voice_transform_trigger";

// ── Privacy ──────────────────────────────────────────────────────────────
pub const RETENTION_DAYS: &str = "privacy.retention_days";
pub const ENCRYPTION_AT_REST: &str = "privacy.encryption_at_rest";
pub const PURGE_ON_LOCK: &str = "privacy.purge_on_lock";
pub const INCOGNITO_MODE: &str = "privacy.incognito_mode";
pub const AIR_GAP_MODE: &str = "privacy.air_gap_mode";
pub const SAVE_AUDIO_RECORDINGS: &str = "privacy.save_audio_recordings";

// ── General & UI ─────────────────────────────────────────────────────────
pub const LAUNCH_AT_LOGIN: &str = "general.launch_at_login";
pub const BASELINE_WPM: &str = "general.baseline_wpm";
pub const PILL_OPACITY: &str = "ui.pill_opacity";
pub const PILL_COMPACT: &str = "ui.pill_compact";
pub const OVERLAY_STYLE: &str = "ui.overlay_style";
pub const ACCENT_COLOR: &str = "ui.accent_color";
pub const PILL_ANCHOR: &str = "ui.pill_anchor";
pub const SHOW_TRAY_ICON: &str = "ui.show_tray_icon";
pub const CONFETTI_EFFECT: &str = "ui.confetti_effect";
pub const CHECK_UPDATES: &str = "general.check_updates";
pub const UPDATE_CHANNEL: &str = "general.update_channel";
pub const ONBOARDING_COMPLETE: &str = "general.onboarding_complete";
pub const ONBOARDING_STEP_INDEX: &str = "general.onboarding_step_index";
pub const TUTORIAL_COMPLETE: &str = "general.tutorial_complete";
pub const REFERRAL_PROMPT_DISMISSED: &str = "virality.referral_prompt_dismissed";
pub const REFERRAL_CODE: &str = "virality.referral_code";
pub const LAST_REENGAGEMENT_PROMPT_MS: &str = "retention.last_reengagement_prompt_ms";
