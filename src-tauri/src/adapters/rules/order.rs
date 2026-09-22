/*!
 * SOURCE OF TRUTH KEYWORDS: RuleId, RULES, CANONICAL_ORDER, canonical_order,
 *   resolve_rule_order, RulePreview, preview_rule_pipeline, rule priority
 * WHAT:  The registry of enhancement rules — their stable IDs, user-facing
 *        labels, canonical execution order, and the merge that turns a stored
 *        user order plus a set of toggles into the order the pipeline runs.
 * WHY:   Users can reorder the pipeline (enhance.rule_order), so rule identity
 *        has to outlive the position it currently runs at: a stored order names
 *        RULES, not slots. Keeping IDs, labels and the canonical order in ONE
 *        table (RULES, in canonical sequence) means the pipeline, the
 *        drag-and-drop UI and the preview sandbox all read the same list rather
 *        than three copies that drift — and an ID can never lack its metadata,
 *        so no lookup path needs an unreachable branch. The merge is tolerant
 *        on purpose: a rule added after the user saved their order must slot
 *        into its canonical position rather than vanish, and a slug a stored
 *        order names that no longer exists must be dropped rather than wedged
 *        into the head of the pipeline forever.
 * WHERE: Read by adapters/rules/mod.rs (execution), ipc/commands/models.rs
 *        (preview_rule_pipeline) and the Settings drag-and-drop list.
 */

use serde::{Deserialize, Serialize};
use specta::Type;

/// SOURCE OF TRUTH KEYWORDS: RuleId
/// A stable identifier for one enhancement rule. Serialized as its snake_case
/// slug so the stored order reads as data, never as a Rust spelling.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum RuleId {
    Whitespace,
    UrlsAndPaths,
    SpokenCommands,
    CodeCasing,
    Fillers,
    Corrections,
    Dictionary,
    Stutters,
    Punctuation,
    Numbers,
    Casing,
    Abbreviations,
    Profanity,
    TerminalStop,
}

/**
 * SOURCE OF TRUTH KEYWORDS: RuleInfo, RULES
 * WHAT:  One entry of the rule registry: identity, presentation, and one line
 *        on what the rule does.
 * WHY:   The table IS the canonical order — a rule's position in this slice is
 *        its default execution position. Declaring identity and metadata
 *        together is what makes `info` total: every RuleId in the pipeline was
 *        constructed from this table, so it always has an entry here.
 * WHERE: Walked by canonical_order, resolve_rule_order, and both IPC
 *        entry points that describe the pipeline to the frontend.
 */
pub struct RuleInfo {
    pub id: RuleId,
    pub label: &'static str,
    pub description: &'static str,
}

/// The whole rule set, in CANONICAL order. This is the design documented at the
/// top of adapters/rules/mod.rs: whitespace first so every later rule can assume
/// single spaces, spoken commands before the tidying rules that follow up after
/// them, the dictionary before stutter removal, and the terminal stop last so
/// nothing capitalises after it. Reordering is a user's override of this
/// sequence, never a replacement for it — a fresh install runs exactly this.
pub const RULES: &[RuleInfo] = &[
    RuleInfo {
        id: RuleId::Whitespace,
        label: "Whitespace",
        description: "Collapse runs of spaces and trim the ends. Runs first so every later rule can assume single spaces.",
    },
    RuleInfo {
        id: RuleId::UrlsAndPaths,
        label: "URLs, emails & paths",
        description: "Turn spoken links, addresses and paths into their written form (\"https colon slash slash github dot com\" → https://github.com).",
    },
    RuleInfo {
        id: RuleId::SpokenCommands,
        label: "Spoken formatting",
        description: "Expand spoken commands: \"new line\", \"new paragraph\", \"comma\", \"period\", file tagging and markdown blocks.",
    },
    RuleInfo {
        id: RuleId::CodeCasing,
        label: "Code identifier casing",
        description: "In code mode, format detected compound words into the active casing style (camelCase, snake_case, …).",
    },
    RuleInfo {
        id: RuleId::Fillers,
        label: "Filler removal",
        description: "Drop \"um\", \"uh\", \"you know\" and similar so speech reads like writing.",
    },
    RuleInfo {
        id: RuleId::Corrections,
        label: "Spoken corrections",
        description: "When you correct yourself out loud — \"Tuesday, sorry, I meant Wednesday\" — keep only the correction.",
    },
    RuleInfo {
        id: RuleId::Dictionary,
        label: "Vocabulary dictionary",
        description: "Apply your custom dictionary entries, so names and jargon land exactly as you spell them.",
    },
    RuleInfo {
        id: RuleId::Stutters,
        label: "Stutter & seam cleanup",
        description: "Collapse repeated words left by chunk boundaries or genuine stutters. Always on.",
    },
    RuleInfo {
        id: RuleId::Punctuation,
        label: "Punctuation tidy",
        description: "Normalise spacing around punctuation, quotes and doubled marks.",
    },
    RuleInfo {
        id: RuleId::Numbers,
        label: "Number normalization",
        description: "Convert spoken numbers and currency into digits and symbols (\"forty two\" → 42, \"twenty dollars\" → $20).",
    },
    RuleInfo {
        id: RuleId::Casing,
        label: "Sentence capitalisation",
        description: "Start each sentence with a capital letter. Needs sentence boundaries to exist first.",
    },
    RuleInfo {
        id: RuleId::Abbreviations,
        label: "Abbreviation expansion",
        description: "Expand spoken Latin and common abbreviations (\"eg\" → \"e.g.\", \"ie\" → \"i.e.\").",
    },
    RuleInfo {
        id: RuleId::Profanity,
        label: "Profanity filter",
        description: "Mask profane words with asterisks or [bleep]. Opt-in, and off in every app profile unless that profile turns it on.",
    },
    RuleInfo {
        id: RuleId::TerminalStop,
        label: "Terminal punctuation",
        description: "Add the full stop. Runs last so nothing capitalises after it.",
    },
];

impl RuleId {
    /// The rule's metadata. Total by construction: every RuleId the pipeline
    /// names came from RULES, and the guard test keeps it that way.
    pub fn info(self) -> &'static RuleInfo {
        RULES
            .iter()
            .find(|info| info.id == self)
            .unwrap_or(&RULES[0])
    }

    /// The exact slug serde writes for this rule, kept beside
    /// `rule_id_from_slug` so the two cannot drift — serde's rename_all is not
    /// queryable at runtime.
    pub fn slug(self) -> String {
        serde_plain_slug(self)
    }

    /// The rule a stored slug names, if any. The parse side of `slug`.
    pub fn from_slug(slug: &str) -> Option<Self> {
        rule_id_from_slug(slug)
    }
}

/// The canonical order as IDs. A fresh install runs exactly this; a stored
/// order is a reorder of it, never a replacement.
pub fn canonical_order() -> Vec<RuleId> {
    RULES.iter().map(|info| info.id).collect()
}

/// Look up a rule by its stored slug — the reverse of RuleId's serialization.
/// A stored order parsed by serde can only contain real variants, but this also
/// lets hand-edited settings or older rows round-trip safely.
pub fn rule_id_from_slug(slug: &str) -> Option<RuleId> {
    RULES
        .iter()
        .find(|info| serde_plain_slug(info.id) == slug)
        .map(|info| info.id)
}

/// The exact string serde writes for a RuleId.
fn serde_plain_slug(id: RuleId) -> String {
    let debug = format!("{id:?}");
    let mut slug = String::with_capacity(debug.len());
    for ch in debug.chars() {
        if ch.is_uppercase() {
            if !slug.is_empty() {
                slug.push('_');
            }
            slug.extend(ch.to_lowercase());
        } else {
            slug.push(ch);
        }
    }
    slug
}

/**
 * SOURCE OF TRUTH KEYWORDS: resolve_rule_order
 * WHAT:  Merges a stored user order with the canonical one and the enabled
 *        flags, returning the rules that will run, in order.
 * WHY:   Three guarantees, each earned by a filter rather than by trust:
 *          1. Every rule the stored order names runs at most once, in the
 *             position the user chose — duplicates in a hand-edited row
 *             collapse to their first occurrence.
 *          2. Rules added since the order was saved join at their canonical
 *             position (first-fit), so new behaviour is never silently off
 *             just because a stored order predates it. The UI writes the FULL
 *             order every time, so this path exists for migrations, not for
 *             partial saves.
 *          3. Slugs a stored order names that no longer exist are dropped —
 *             a renamed or removed rule cannot wedge the pipeline or shadow
 *             the head of it forever.
 *        Whitespace is PINNED, not merely defaulted: every later rule assumes
 *        single spaces, so the UI pins it at the top of the drag list and this
 *        function enforces the same invariant whatever a stored order said.
 * WHERE: Called once per enhance pass by adapters/rules/mod.rs, and by the
 *        preview command so the sandbox shows exactly what a session would do.
 */
pub fn resolve_rule_order(stored: Option<&[String]>, enabled: &dyn Fn(RuleId) -> bool) -> Vec<RuleId> {
    let mut ordered: Vec<RuleId> = Vec::with_capacity(RULES.len());
    let mut seen = std::collections::HashSet::new();

    if let Some(saved) = stored {
        for slug in saved {
            if let Some(id) = rule_id_from_slug(slug) {
                if seen.insert(id) && enabled(id) {
                    ordered.push(id);
                }
            }
        }
    }

    // First-fit fill: every enabled rule the stored order does not mention
    // takes its canonical position among the rules already placed.
    for candidate in RULES {
        let id = candidate.id;
        if seen.contains(&id) || !enabled(id) {
            continue;
        }
        let position = ordered
            .iter()
            .position(|placed| canonical_position(*placed) > canonical_position(id))
            .unwrap_or(ordered.len());
        ordered.insert(position, id);
        seen.insert(id);
    }

    // Whitespace is the pipeline's invariant: whatever a stored order said, it
    // runs first, and exactly once.
    ordered.retain(|id| *id != RuleId::Whitespace);
    ordered.insert(0, RuleId::Whitespace);

    ordered
}

/// Position in the canonical table — the sort key for first-fit fills.
fn canonical_position(id: RuleId) -> usize {
    RULES
        .iter()
        .position(|candidate| candidate.id == id)
        .unwrap_or(usize::MAX)
}

/**
 * SOURCE OF TRUTH KEYWORDS: RulePreview
 * WHAT:  One rule's effect on the preview text: what it received, what it
 *        produced, and whether it ran at all.
 * WHERE: Returned by the preview_rule_pipeline command; rendered as the
 *        rule-by-rule diff view in Settings.
 */
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
pub struct RulePreview {
    pub rule: RuleId,
    pub label: String,
    pub description: String,
    /// Whether the rule ran at all. A disabled rule shows as skipped rather
    /// than as an unchanged step, which would read as "this rule did nothing"
    /// when the honest answer is "this rule was not asked to run".
    pub skipped: bool,
    /// The text entering the rule. Empty when skipped.
    pub before: String,
    /// The text leaving the rule. Empty when skipped.
    pub after: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn all_enabled(id: RuleId) -> bool {
        id != RuleId::CodeCasing // code mode defaults off
    }

    #[test]
    fn every_rule_id_has_metadata_and_the_table_has_no_duplicates() {
        let mut ids: Vec<RuleId> = RULES.iter().map(|info| info.id).collect();
        let sorted = ids.clone();
        ids.sort_by_key(|id| id.slug());
        ids.dedup();
        assert_eq!(ids.len(), sorted.len(), "a rule is declared twice");
        for id in sorted {
            let info = id.info();
            assert_eq!(info.id, id);
            assert!(!info.label.trim().is_empty());
            assert!(!info.description.trim().is_empty());
        }
        assert_eq!(RULES.first().map(|i| i.id), Some(RuleId::Whitespace));
        assert_eq!(RULES.last().map(|i| i.id), Some(RuleId::TerminalStop));
    }

    #[test]
    fn a_stored_order_beats_the_canonical_one() {
        // Dictionary moved ahead of fillers: the user's choice must hold even
        // though it inverts the canonical design.
        let stored = vec![
            "whitespace".into(),
            "dictionary".into(),
            "fillers".into(),
            "punctuation".into(),
            "casing".into(),
            "terminal_stop".into(),
        ];

        let resolved = resolve_rule_order(Some(&stored), &all_enabled);

        let position = |id: RuleId| resolved.iter().position(|r| *r == id).unwrap();
        assert!(position(RuleId::Dictionary) < position(RuleId::Fillers));
        // The rules the saved order predates still run — at canonical positions.
        assert!(resolved.contains(&RuleId::Corrections));
        assert!(resolved.contains(&RuleId::Stutters));
        assert_eq!(resolved.len(), RULES.len() - 1, "only code casing is off");
    }

    #[test]
    fn rules_added_after_the_order_was_saved_join_at_their_canonical_position() {
        // A saved order from a build that had no number rule: it must appear
        // between punctuation and casing — its canonical spot — not appended
        // at the end where the terminal stop would no longer be last.
        let stored = vec![
            "whitespace".into(),
            "spoken_commands".into(),
            "punctuation".into(),
            "casing".into(),
            "terminal_stop".into(),
        ];

        let resolved = resolve_rule_order(Some(&stored), &all_enabled);

        let position = |id: RuleId| resolved.iter().position(|r| *r == id).unwrap();
        assert!(position(RuleId::Punctuation) < position(RuleId::Numbers));
        assert!(position(RuleId::Numbers) < position(RuleId::Casing));
        assert_eq!(resolved.last(), Some(&RuleId::TerminalStop));
    }

    #[test]
    fn an_unknown_or_duplicated_slug_is_dropped_rather_than_wedging_the_pipeline() {
        let stored = vec![
            "whitespace".into(),
            "not_a_rule".into(),
            "whitespace".into(),
            "punctuation".into(),
        ];

        let resolved = resolve_rule_order(Some(&stored), &all_enabled);

        assert_eq!(
            resolved.iter().filter(|id| **id == RuleId::Whitespace).count(),
            1,
            "duplicates collapse"
        );
        assert!(resolved.contains(&RuleId::Punctuation));
        assert_eq!(resolved.len(), RULES.len() - 1);
    }

    #[test]
    fn disabled_rules_do_not_run_but_their_positions_are_kept() {
        let stored = vec![
            "whitespace".into(),
            "fillers".into(),
            "dictionary".into(),
            "casing".into(),
            "terminal_stop".into(),
        ];
        let resolved = resolve_rule_order(Some(&stored), &|id| id != RuleId::Fillers);

        assert!(!resolved.contains(&RuleId::Fillers));
        assert!(resolved.contains(&RuleId::Dictionary));
        let position = |id: RuleId| resolved.iter().position(|r| *r == id).unwrap();
        assert!(position(RuleId::Dictionary) < position(RuleId::Casing));
    }

    #[test]
    fn whitespace_is_pinned_first_whatever_the_order_said() {
        let stored = vec!["punctuation".into(), "casing".into()];
        let resolved = resolve_rule_order(Some(&stored), &all_enabled);
        assert_eq!(resolved.first(), Some(&RuleId::Whitespace));

        // Even a hand-edited order that tries to demote it.
        let demoted = vec!["punctuation".into(), "whitespace".into()];
        let resolved = resolve_rule_order(Some(&demoted), &all_enabled);
        assert_eq!(resolved.first(), Some(&RuleId::Whitespace));
    }

    #[test]
    fn a_missing_order_is_exactly_the_canonical_one() {
        assert_eq!(
            resolve_rule_order(None, &all_enabled),
            canonical_order()
                .into_iter()
                .filter(|id| all_enabled(*id))
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn the_slug_round_trips_through_serde() {
        for id in canonical_order() {
            let slug = id.slug();
            assert_eq!(rule_id_from_slug(&slug).is_some(), true, "`{slug}`");
            assert_eq!(rule_id_from_slug(&slug).map(|r| r.slug()), Some(slug.clone()));
        }
        assert_eq!(rule_id_from_slug("not_a_rule"), None);
    }
}
