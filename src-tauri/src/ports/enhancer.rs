/*!
 * SOURCE OF TRUTH KEYWORDS: TextEnhancer, EnhanceContext, EnhanceRule,
 *   RuleId, enhance
 * WHAT:  The trait that turns a raw transcript into text that reads like
 *        writing.
 * WHY:   Blocking and expected to be sub-millisecond, because the deterministic
 *        rule pipeline runs inside the finalize budget. The seam exists so a
 *        local-LLM rewrite can be dropped in later as a different implementation
 *        — that one costs 200-500ms, which is exactly why it must be opt-in and
 *        must not be able to sneak onto this path unnoticed.
 * WHERE: Implemented by adapters/rules; called by pipeline/deliver.rs after the
 *        segments are joined.
 */

use crate::error::AppResult;
use crate::types::{DictionaryEntry, LanguageCode};

/**
 * SOURCE OF TRUTH KEYWORDS: EnhanceContext, rule_order, trace_rules
 * WHAT:  Everything the rules need besides the text.
 * WHY:   Passed in rather than read from settings inside the enhancer, so every
 *        rule is a pure function of its inputs and therefore table-testable.
 *        That test suite is the cheapest accuracy guard in the project.
 * WHERE: Built by pipeline/deliver.rs from settings, the active app profile,
 *        and the dictionary service.
 */
#[derive(Debug, Clone, Default)]
pub struct EnhanceContext {
    pub language: Option<LanguageCode>,
    pub dictionary: Vec<DictionaryEntry>,
    pub strip_fillers: bool,
    pub expand_spoken_commands: bool,
    pub normalise_punctuation: bool,
    pub capitalise_sentences: bool,
    /**
     * SOURCE OF TRUTH KEYWORDS: apply_corrections
     * WHAT:  Apply spoken self-corrections — "Tuesday, sorry, I meant
     *        Wednesday" becomes "Wednesday".
     * WHY:   Off by default, on the operator's own condition: he asked for it
     *        only if it does not cost delivery time, and any pass that can
     *        rewrite words is one more thing between speaking and pasting. It
     *        is rule-based and costs microseconds, but the default stays off
     *        because the failure mode — deleting something he meant to keep —
     *        is silent, and a silent failure should be opt-in.
     */
    pub apply_corrections: bool,
    pub expand_abbreviations: bool,
    pub disabled_abbreviations: Vec<String>,
    pub normalise_numbers: bool,
    pub normalise_urls_and_paths: bool,
    pub code_mode: bool,
    pub code_casing_style: String,
    /**
     * SOURCE OF TRUTH KEYWORDS: profanity_filter
     * WHAT:  Mask profane words with asterisks or bleeps. OPT-IN, default off.
     * WHY:   A censoring rule is the only one in this pipeline that can remove
     *        words the user actually said, so it ships dark — exactly like
     *        apply_corrections, for the same reason: a silent rewrite should
     *        never be a default. Being a rule means it inherits the per-app
     *        profile layering for free: enable it in one profile (Slack) and
     *        leave it off everywhere else.
     * WHERE: Loaded from enhance.profanity_filter into SessionSettings by
     *        session/settings_view.rs; threaded through pipeline delivery and
     *        the preview sandbox.
     */
    pub profanity_filter: bool,
    /**
     * SOURCE OF TRUTH KEYWORDS: profanity_style
     * WHAT:  How masked words are written — "f***" (asterisks) or "[bleep]".
     * WHY:   A separate style choice rather than hard-coding one, because the
     *        two read very differently in the places people dictate; parsed by
     *        ProfanityStyle::parse_style with an asterisks fallback, so an
     *        unparsable stored value degrades to the familiar form.
     * WHERE: Loaded from enhance.profanity_style; read only when
     *        profanity_filter is on.
     */
    pub profanity_style: String,
    pub llm_cleanup_enabled: bool,
    pub llm_model: String,
    pub llm_auto_quantization: bool,
    pub voice_transforms_enabled: bool,
    pub custom_system_prompt: String,
    pub voice_transform_trigger: String,
    /**
     * SOURCE OF TRUTH KEYWORDS: rule_order
     * WHAT:  The user's stored enhancement-rule order, as slugs of
     *        adapters::rules::order::RuleId, or None to run the canonical
     *        order.
     * WHY:   An Option, not an empty default: None must mean "canonical", not
     *        "an order that happens to be empty", so a fresh install behaves
     *        exactly like the documented design. The list is a REQUEST —
     *        adapters::rules::order::resolve_rule_order merges it with the
     *        canonical table, so unknown slugs and since-removed rules cannot
     *        break a session.
     * WHERE: Loaded from the enhance.rule_order setting into
     *        SessionSettings.rule_order by session/settings_view.rs and
     *        threaded through pipeline/deliver.rs; the preview command sets it
     *        from the request for what-if previews.
     */
    pub rule_order: Option<Vec<String>>,
    /**
     * SOURCE OF TRUTH KEYWORDS: trace_rules
     * WHAT:  Capture a before/after per rule while enhancing.
     * WHY:   Off on the session path — the trace allocates one preview entry
     *        per rule, which is pointless work inside the finalize budget. On
     *        only for the preview sandbox, which is the one caller that needs
     *        to SEE what each rule did rather than only the end result.
     * WHERE: Set by ipc/commands/models.rs::preview_rule_pipeline; never set
     *        by session/delivery.rs.
     */
    pub trace_rules: bool,
}

pub trait TextEnhancer: Send + Sync {
    fn id(&self) -> &'static str;
    /// Pure and fast. Same input plus same context must give the same output.
    fn enhance(&self, raw: &str, context: &EnhanceContext) -> AppResult<String>;
}
