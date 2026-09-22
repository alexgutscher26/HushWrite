/*!
 * SOURCE OF TRUTH KEYWORDS: RuleEnhancer, enhance, enhance_with_trace, RULE_ORDER,
 *   rule_order, rule_enabled, text
 * WHAT:  The deterministic TextEnhancer: applies the rules in
 *        `resolve_rule_order`'s order — the canonical pipeline, or the user's
 *        stored reorder of it.
 * WHY:   The CANONICAL order is the design, and it is not arbitrary:
 *          1. whitespace first, so every later rule can assume single spaces
 *             (it is pinned — see order.rs);
 *          2. spoken commands next, because they INSERT punctuation that later
 *             rules then need to tidy and capitalise after;
 *          3. fillers before the dictionary, so a filler cannot sit inside a
 *             phrase the dictionary is trying to match, and spoken corrections
 *             straight after them so a stray "um" cannot separate a slip from
 *             the correction that replaces it;
 *          4. the dictionary before stutter removal, so a corrected term is
 *             what gets compared for repetition;
 *          5. punctuation, then casing, then the terminal stop — casing depends
 *             on sentence boundaries existing, and the terminal stop must come
 *             last or it would be capitalised as a new sentence.
 *        The user may reorder the middle of that design (enhance.rule_order);
 *        the endpoints stay where they are so no drag can produce a pipeline
 *        that violates 1 or 5. Every rule is individually toggleable through
 *        EnhanceContext, and the whole pass is measured in microseconds — it
 *        runs inside the finalize budget, so anything expensive here is
 *        spending the product's headline promise.
 *
 *        `enhance_with_trace` is the same pass with each step's before/after
 *        captured: the preview sandbox is only honest if it runs the EXACT
 *        production code, so it calls this rather than a re-implementation.
 * WHERE: Implements the TextEnhancer port; called by pipeline/deliver.rs.
 */

pub mod abbreviations;
pub mod corrections;
pub mod dictionary;
pub mod fillers;
pub mod numbers;
pub mod order;
pub mod profanity;
pub mod punctuation;
pub mod spoken;
pub mod text;
pub mod urls_and_paths;
pub mod whitespace;

use crate::error::AppResult;
use crate::ports::enhancer::{EnhanceContext, TextEnhancer};
use order::{resolve_rule_order, RuleId, RulePreview};

pub struct RuleEnhancer;

impl RuleEnhancer {
    pub fn new() -> Self {
        Self
    }
}

impl Default for RuleEnhancer {
    fn default() -> Self {
        Self::new()
    }
}

impl TextEnhancer for RuleEnhancer {
    fn id(&self) -> &'static str {
        "rules"
    }

    fn enhance(&self, raw: &str, context: &EnhanceContext) -> AppResult<String> {
        let language = context.language.as_ref();
        let ordered = resolve_rule_order(context.rule_order.as_deref(), &|id| {
            rule_applies(context, id)
        });

        let mut out = raw.to_string();
        for rule in ordered {
            Self::apply(rule, &mut out, language, context);
        }

        Ok(out)
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: rule_enabled
 * WHAT:  Whether one rule runs at all, from the context's own toggles.
 * WHY:   The single source of enablement for both the production pass and the
 *        preview, so the sandbox can never show a step a session would skip or
 *        hide one it would run. The dictionary counts as enabled even with an
 *        empty list — a saved order must keep the user's chosen slot for it,
 *        and applying an empty dictionary is a harmless no-op. Whitespace and
 *        the stutter pass are unconditionally on: they repair our own chunking
 *        artefacts, which no toggle should be able to re-enable.
 * WHERE: Passed into resolve_rule_order by both enhance paths, and used by the
 *        trace to mark a step skipped rather than absent.
 */
fn rule_enabled(context: &EnhanceContext, rule: RuleId) -> bool {
    match rule {
        RuleId::Whitespace | RuleId::Stutters => true,
        RuleId::UrlsAndPaths => context.normalise_urls_and_paths,
        RuleId::SpokenCommands => context.expand_spoken_commands,
        RuleId::CodeCasing => context.code_mode,
        RuleId::Fillers => context.strip_fillers,
        RuleId::Corrections => context.apply_corrections,
        RuleId::Dictionary => true,
        RuleId::Punctuation | RuleId::TerminalStop => context.normalise_punctuation,
        RuleId::Numbers => context.normalise_numbers,
        RuleId::Casing => context.capitalise_sentences,
        RuleId::Abbreviations => context.expand_abbreviations,
        RuleId::Profanity => context.profanity_filter,
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: rule_applies
 * WHAT:  Whether a rule both runs at all AND has something to do.
 * WHY:   The dictionary rule carries named-entity normalisation ("github" →
 *        "GitHub"), which only makes sense with entries to normalise against —
 *        with none it must no-op, exactly as this pipeline behaved before
 *        ordering became configurable. Folding that into one predicate keeps
 *        the production pass and the trace in lockstep: a rule excluded here
 *        is excluded from the resolved order AND marked skipped in the preview,
 *        so the two can never disagree about what ran.
 * WHERE: Wraps rule_enabled for both enhance paths.
 */
fn rule_applies(context: &EnhanceContext, rule: RuleId) -> bool {
    rule_enabled(context, rule)
        && (rule != RuleId::Dictionary || !context.dictionary.is_empty())
}

impl RuleEnhancer {
    /**
     * SOURCE OF TRUTH KEYWORDS: enhance_with_trace, RulePreview
     * WHAT:  Runs the ordered pipeline, optionally capturing each rule's
     *        before/after.
     * WHY:   The trace costs nothing when nobody reads it — the production
     *        path allocates no step per rule. When tracing, every rule in the
     *        stored (or canonical) order is listed and disabled ones are marked
     *        skipped, so the sandbox can say "this rule is off" instead of
     *        pretending the step is absent from the design. Applying only the
     *        enabled rules in the same merged order makes the traced final text
     *        identical to the untraced pass — asserted by test.
     * WHERE: The preview_rule_pipeline command calls this directly for the
     *        sandbox's rule-by-rule diff; `enhance` stays trace-free.
     */
    pub fn enhance_with_trace(
        &self,
        raw: &str,
        context: &EnhanceContext,
    ) -> AppResult<TracedEnhancement> {
        let language = context.language.as_ref();
        let applies = |id| rule_applies(context, id);
        let stored = context.rule_order.as_deref();

        let mut current = raw.to_string();
        let mut steps: Vec<RulePreview> = Vec::new();

        // When tracing, every rule in the resolved sequence gets a step — even
        // the disabled ones — so the sandbox can say "off" instead of hiding
        // the step. Execution is guarded by `applies`, which is the exact
        // predicate the production pass resolves with, so the traced final
        // text is bit-for-bit the untraced one.
        for rule in resolve_rule_order(stored, &|id| context.trace_rules || applies(id)) {
            let runs = applies(rule);
            let before = current.clone();
            if runs {
                Self::apply(rule, &mut current, language, context);
            }

            if context.trace_rules {
                let info = rule.info();
                steps.push(RulePreview {
                    rule,
                    label: info.label.to_string(),
                    description: info.description.to_string(),
                    skipped: !runs,
                    before: if runs { before } else { String::new() },
                    after: if runs { current.clone() } else { String::new() },
                });
            }
        }

        Ok(TracedEnhancement {
            final_text: current,
            steps,
        })
    }

    /**
     * WHAT:  Applies one rule in place.
     * WHY:   The rule bodies are the unchanged, table-tested pure functions.
     *        Grouping the four spoken-formatting passes under one rule keeps
     *        them one drag unit in the UI, exactly as they are one design unit
     *        in the canonical order. Reachability of each arm is decided by
     *        `rule_enabled`, not re-checked here.
     * WHERE: The switch the ordered pipeline walks.
     */
    fn apply(
        rule: RuleId,
        out: &mut String,
        language: Option<&crate::types::LanguageCode>,
        context: &EnhanceContext,
    ) {
        match rule {
            RuleId::Whitespace => {
                *out = whitespace::normalise_whitespace(out);
            }
            RuleId::UrlsAndPaths => {
                *out = urls_and_paths::normalize_urls_and_paths(out);
            }
            RuleId::SpokenCommands => {
                *out = spoken::expand_spoken_commands(out, language);
                *out = spoken::format_code_casing(out);
                *out = spoken::format_file_tagging(out);
                *out = spoken::format_markdown_mode(out);
            }
            RuleId::CodeCasing => {
                let style = spoken::CaseStyle::parse_style(&context.code_casing_style);
                *out = spoken::apply_code_mode_casing(out, style);
            }
            RuleId::Fillers => {
                *out = fillers::strip_fillers(out, language);
            }
            RuleId::Corrections => {
                *out = corrections::apply_spoken_corrections(out, language);
            }
            RuleId::Dictionary => {
                // Guarded here as well as by rule_applies so this arm cannot
                // run against an empty table — apply_dictionary's named-entity
                // pass must not fire without vocabulary to normalise against.
                if !context.dictionary.is_empty() {
                    *out = dictionary::apply_dictionary(out, &context.dictionary);
                }
            }
            RuleId::Stutters => {
                *out = whitespace::dedupe_stutters(out);
            }
            RuleId::Punctuation => {
                *out = punctuation::normalise_punctuation(out);
            }
            RuleId::Numbers => {
                *out = numbers::normalize_numbers(out, language);
            }
            RuleId::Casing => {
                *out = punctuation::capitalise_sentences(out);
            }
            RuleId::Abbreviations => {
                *out = abbreviations::expand_abbreviations(
                    out,
                    language,
                    &context.disabled_abbreviations,
                );
            }
            RuleId::Profanity => {
                *out = profanity::mask_profanity(
                    out,
                    language,
                    profanity::ProfanityStyle::parse_style(&context.profanity_style),
                );
            }
            RuleId::TerminalStop => {
                *out = punctuation::ensure_terminal_punctuation(out);
            }
        }
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: TracedEnhancement
 * WHAT:  The final text plus the per-rule steps that produced it.
 * WHY:   One return value so the trace and the text can never disagree about
 *        what ran — the final text IS the last enabled step's output.
 * WHERE: Returned by enhance_with_trace; consumed by the preview command.
 */
#[derive(Debug, Clone)]
pub struct TracedEnhancement {
    pub final_text: String,
    pub steps: Vec<RulePreview>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DictionaryEntry, DictionaryId, LanguageCode, MatchKind};

    fn context() -> EnhanceContext {
        EnhanceContext {
            language: Some(LanguageCode("en".into())),
            dictionary: vec![],
            strip_fillers: true,
            expand_spoken_commands: true,
            normalise_punctuation: true,
            capitalise_sentences: true,
            apply_corrections: true,
            expand_abbreviations: true,
            disabled_abbreviations: vec![],
            normalise_numbers: true,
            normalise_urls_and_paths: true,
            code_mode: false,
            code_casing_style: "camel".into(),
            ..Default::default()
        }
    }

    #[test]
    fn the_full_pass_turns_speech_into_writing() {
        let enhancer = RuleEnhancer::new();
        let raw = "um  so i was thinking we should ship it comma today";

        let out = enhancer.enhance(raw, &context()).expect("enhance");

        assert_eq!(out, "So i was thinking we should ship it, today.");
    }

    #[test]
    fn the_full_pass_expands_abbreviations() {
        let enhancer = RuleEnhancer::new();
        let raw = "we should buy fruits comma eg apples and oranges etc";

        let out = enhancer.enhance(raw, &context()).expect("enhance");

        assert_eq!(out, "We should buy fruits, e.g. apples and oranges etc.");
    }

    #[test]
    fn the_dictionary_runs_before_stutter_removal() {
        // Ordering guard: if these swapped, the corrected term would not be
        // what gets compared for repetition.
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.dictionary = vec![DictionaryEntry {
            id: DictionaryId(1),
            pattern: "clod".into(),
            replacement: "Claude".into(),
            match_kind: MatchKind::Word,
            enabled: true,
            used_at: None,
        }];

        let out = enhancer
            .enhance("clod clod is great", &ctx)
            .expect("enhance");
        assert_eq!(out, "Claude is great.");
    }

    #[test]
    fn every_rule_can_be_turned_off_independently() {
        let enhancer = RuleEnhancer::new();
        let ctx = EnhanceContext {
            language: Some(LanguageCode("en".into())),
            dictionary: vec![],
            strip_fillers: false,
            expand_spoken_commands: false,
            normalise_punctuation: false,
            capitalise_sentences: false,
            apply_corrections: false,
            expand_abbreviations: false,
            disabled_abbreviations: vec![],
            normalise_numbers: false,
            normalise_urls_and_paths: false,
            code_mode: false,
            code_casing_style: "camel".into(),
            ..Default::default()
        };

        let raw = "um hello comma world";
        let out = enhancer.enhance(raw, &ctx).expect("enhance");

        // Only whitespace normalisation and seam de-duplication remain, and
        // neither should have changed anything here.
        assert_eq!(out, raw);
    }

    #[test]
    fn the_full_pass_normalizes_numbers_and_urls() {
        let enhancer = RuleEnhancer::new();
        let raw = "that costs twenty dollars on the third floor comma visit https colon slash slash github dot com";

        let out = enhancer.enhance(raw, &context()).expect("enhance");
        assert_eq!(
            out,
            "That costs $20 on the 3rd floor, visit https://github.com."
        );
    }

    #[test]
    fn the_full_pass_applies_code_mode_casing() {
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.code_mode = true;
        ctx.code_casing_style = "pascal".into();
        let raw = "define user profile component in react";

        let out = enhancer.enhance(raw, &ctx).expect("enhance");
        assert_eq!(out, "Define UserProfileComponent in react.");
    }

    #[test]
    fn a_non_english_transcript_passes_through_the_language_rules_untouched() {
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.language = Some(LanguageCode("hi".into()));

        // English filler and command words must not be treated as such here.
        let out = enhancer.enhance("um like comma", &ctx).expect("enhance");
        assert!(
            out.to_lowercase().contains("um") && out.to_lowercase().contains("comma"),
            "language-specific rules must not fire on another language: got {out:?}"
        );
    }

    #[test]
    fn empty_and_whitespace_only_input_produce_nothing_rather_than_a_lone_full_stop() {
        let enhancer = RuleEnhancer::new();
        assert_eq!(enhancer.enhance("", &context()).expect("enhance"), "");
        assert_eq!(enhancer.enhance("   ", &context()).expect("enhance"), "");
    }

    #[test]
    fn enhancement_is_deterministic() {
        // The property the table tests depend on.
        let enhancer = RuleEnhancer::new();
        let raw = "um so like we should probably ship this comma today";
        let first = enhancer.enhance(raw, &context()).expect("enhance");
        let second = enhancer.enhance(raw, &context()).expect("enhance");
        assert_eq!(first, second);
    }

    #[test]
    fn the_pass_stays_well_inside_its_millisecond_budget() {
        // It runs inside the finalize budget; a slow rule here spends the
        // product's headline promise.
        let enhancer = RuleEnhancer::new();
        let raw = "um so like ".repeat(400);

        let started = std::time::Instant::now();
        let _ = enhancer.enhance(&raw, &context()).expect("enhance");
        let elapsed = started.elapsed();
        let budget = if cfg!(debug_assertions) {
            std::time::Duration::from_millis(250)
        } else {
            std::time::Duration::from_millis(20)
        };

        assert!(
            elapsed < budget,
            "enhancement took {elapsed:?} on a long transcript (budget: {budget:?})"
        );
    }

    #[test]
    fn a_stored_order_changes_execution_order_without_changing_the_contract() {
        // Dictionary ahead of fillers: the user's reorder must be what runs.
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.trace_rules = true;
        ctx.rule_order = Some(vec![
            "whitespace".into(),
            "dictionary".into(),
            "fillers".into(),
            "punctuation".into(),
            "casing".into(),
            "terminal_stop".into(),
        ]);

        let traced = enhancer
            .enhance_with_trace("um so like , he said", &ctx)
            .expect("enhance");

        assert_eq!(
            traced.steps.first().map(|s| s.rule),
            Some(RuleId::Whitespace),
            "whitespace stays pinned first"
        );
        let position = |rule: RuleId| {
            traced
                .steps
                .iter()
                .position(|s| s.rule == rule)
                .unwrap_or_else(|| panic!("{rule:?} did not run"))
        };
        assert!(position(RuleId::Dictionary) < position(RuleId::Fillers));
    }

    #[test]
    fn the_traced_pass_equals_the_untraced_one() {
        // The sandbox is only honest if it computes the same text a session
        // would deliver.
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.trace_rules = true;
        ctx.strip_fillers = false;

        let raw = "um  so i was thinking we should ship it comma today";
        let traced = enhancer.enhance_with_trace(raw, &ctx).expect("enhance");
        let plain = enhancer.enhance(raw, &ctx).expect("enhance");

        assert_eq!(traced.final_text, plain);
        assert_eq!(
            traced.steps.last().map(|s| s.after.as_str()),
            Some(plain.as_str()),
            "the final text is the last step's output"
        );
    }

    #[test]
    fn the_trace_lists_every_rule_and_marks_the_disabled_ones() {
        let enhancer = RuleEnhancer::new();
        let mut ctx = context();
        ctx.trace_rules = true;

        let traced = enhancer
            .enhance_with_trace("um so hi team", &ctx)
            .expect("enhance");

        assert_eq!(
            traced.steps.len(),
            order::RULES.len(),
            "every rule is listed"
        );
        assert!(traced
            .steps
            .iter()
            .any(|s| s.rule == RuleId::CodeCasing && s.skipped));
        assert!(traced
            .steps
            .iter()
            .any(|s| s.rule == RuleId::Whitespace && !s.skipped));
        for step in &traced.steps {
            if step.skipped {
                assert!(
                    step.before.is_empty() && step.after.is_empty(),
                    "a skipped step carries no text"
                );
            }
        }
    }

    #[test]
    fn the_untraced_pass_allocates_no_steps() {
        let enhancer = RuleEnhancer::new();
        let traced = enhancer
            .enhance_with_trace("hello world", &context())
            .expect("enhance");
        assert!(traced.steps.is_empty(), "trace_rules off means no steps");
    }
}
