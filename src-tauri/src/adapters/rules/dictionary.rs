/*!
 * SOURCE OF TRUTH KEYWORDS: apply_dictionary, replace_whole_words, MatchKind
 * WHAT:  User vocabulary replacement table and regex/word boundary replacement.
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

use super::spoken::normalize_named_entities;
use crate::types::{DictionaryEntry, MatchKind};

/**
 * WHAT:  Applies the user's replacement table.
 * WHY:   The single highest-leverage rule in the app — a model that writes
 *        "clod code" instead of "Claude Code" feels broken regardless of its
 *        word error rate. Word matching is the default because substring
 *        matching silently corrupts unrelated words.
 */
pub fn apply_dictionary(text: &str, entries: &[DictionaryEntry]) -> String {
    let mut out = normalize_named_entities(text);
    for entry in entries.iter().filter(|e| e.enabled) {
        out = match entry.match_kind {
            MatchKind::Word => replace_whole_words(&out, &entry.pattern, &entry.replacement, false, false),
            MatchKind::WordCaseSensitive => {
                replace_whole_words(&out, &entry.pattern, &entry.replacement, true, false)
            }
            MatchKind::Substring => out.replace(&entry.pattern, &entry.replacement),
        };
    }
    out
}

/**
 * SOURCE OF TRUTH KEYWORDS: replace_whole_words
 * WHAT:  Replaces `needle` with `replacement` only at word boundaries.
 * WHY:   Written by hand rather than with a regex crate: the patterns come from
 *        user input, and compiling user text as a regex is both a correctness
 *        hazard and a way to make an unbounded-time replacement. Boundaries are
 *        "not alphanumeric on either side", which is what stops a replacement
 *        of "ai" from rewriting "said".
 * WHERE: The matching primitive under the dictionary, filler and spoken-command
 *        rules.
 */
pub fn replace_whole_words(
    haystack: &str,
    needle: &str,
    replacement: &str,
    case_sensitive: bool,
    strip_trailing_punct: bool,
) -> String {
    if needle.is_empty() {
        return haystack.to_string();
    }

    /*
     * SOURCE OF TRUTH KEYWORDS: pipeline caching, early_out
     * WHAT:  The probe below: skip the whole replacement pass when the needle
     *        cannot possibly match.
     * WHY:   The pass allocates a lowercase copy of the haystack AND a full
     *        subject→haystack byte-offset map before searching — work every
     *        one of the ~160 named-entity needles paid for on every chunk,
     *        even when the chunk mentioned none of them. A needle longer than
     *        the haystack can never match; a case-sensitive needle absent as a
     *        plain substring can never match; an ASCII case-insensitive needle
     *        absent from the lowercased haystack can never match (full-string
     *        and per-char lowercasing agree on every ASCII region, and differ
     *        only on non-ASCII context folds like final sigma, which an ASCII
     *        needle cannot overlap). Non-ASCII needles keep the old path.
     * WHERE: The head of replace_whole_words, ahead of any allocation.
     */
    if needle.len() > haystack.len() {
        return haystack.to_string();
    }
    if case_sensitive {
        if !haystack.contains(needle) {
            return haystack.to_string();
        }
    } else if needle.is_ascii()
        && !haystack.to_lowercase().contains(&needle.to_lowercase())
    {
        return haystack.to_string();
    }

    let subject = if case_sensitive {
        haystack.to_string()
    } else {
        haystack.to_lowercase()
    };
    let pattern = if case_sensitive {
        needle.to_string()
    } else {
        needle.to_lowercase()
    };

    let mut out = String::with_capacity(haystack.len());
    let mut cursor = 0usize;
    let mut search_idx = 0usize;

    // Fast path for case_sensitive where byte offsets match 1:1
    if case_sensitive {
        while let Some(found) = subject[search_idx..].find(&pattern) {
            let start = search_idx + found;
            let end = start + pattern.len();

            let before_ok = start == 0
                || !subject[..start]
                    .chars()
                    .next_back()
                    .map(|c| c.is_alphanumeric())
                    .unwrap_or(false);
            let after_ok = end >= subject.len()
                || !subject[end..]
                    .chars()
                    .next()
                    .map(|c| c.is_alphanumeric())
                    .unwrap_or(false);

            if before_ok && after_ok {
                let mut adj_end = end;
                if strip_trailing_punct {
                    while adj_end < haystack.len() {
                        let next_char = haystack[adj_end..].chars().next().unwrap();
                        if next_char.is_ascii_punctuation() && next_char != '\'' && next_char != '-' {
                            adj_end += next_char.len_utf8();
                        } else {
                            break;
                        }
                    }
                }

                out.push_str(&haystack[cursor..start]);
                out.push_str(replacement);
                cursor = adj_end;
            } else {
                out.push_str(&haystack[cursor..end]);
                cursor = end;
            }
            search_idx = end;
        }
        out.push_str(&haystack[cursor..]);
        return out;
    }

    // Mapping from subject byte offset to haystack byte offset for case-insensitive
    let mut s_to_h = Vec::with_capacity(subject.len() + 1);
    let mut h_idx = 0;
    for c in haystack.chars() {
        let c_len = c.len_utf8();
        let s_len = c.to_lowercase().map(|c| c.len_utf8()).sum();
        for _ in 0..s_len {
            s_to_h.push(h_idx);
        }
        h_idx += c_len;
    }
    s_to_h.push(haystack.len());

    while let Some(found) = subject[search_idx..].find(&pattern) {
        let s_start = search_idx + found;
        let s_end = s_start + pattern.len();

        let h_start = s_to_h[s_start];
        let h_end = s_to_h[s_end];

        let before_ok = h_start == 0
            || !haystack[..h_start]
                .chars()
                .next_back()
                .map(|c| c.is_alphanumeric())
                .unwrap_or(false);
        let after_ok = h_end >= haystack.len()
            || !haystack[h_end..]
                .chars()
                .next()
                .map(|c| c.is_alphanumeric())
                .unwrap_or(false);

        if before_ok && after_ok {
            let adj_h_start = h_start;
            let mut adj_h_end = h_end;

            if strip_trailing_punct {
                while adj_h_end < haystack.len() {
                    let next_char = haystack[adj_h_end..].chars().next().unwrap();
                    if next_char.is_ascii_punctuation() && next_char != '\'' && next_char != '-' {
                        adj_h_end += next_char.len_utf8();
                    } else {
                        break;
                    }
                }
            }

            out.push_str(&haystack[cursor..adj_h_start]);
            out.push_str(replacement);
            cursor = adj_h_end;
        } else {
            out.push_str(&haystack[cursor..h_end]);
            cursor = h_end;
        }
        search_idx = s_end;
    }

    out.push_str(&haystack[cursor..]);
    out
}
