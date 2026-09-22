/*!
 * SOURCE OF TRUTH KEYWORDS: mask_profanity, ENGLISH_PROFANITY, ProfanityStyle,
 *   mask_with_asterisks, mask_with_bleeps
 * WHAT:  Opt-in profanity masking — replaces whole profane words with asterisks
 *        ("f***") or a fixed bleep marker ("[bleep]") at word boundaries.
 * WHERE: Consumed by adapters/rules/mod.rs as the Profanity rule.
 */

use crate::types::LanguageCode;

/// The default word list. Deliberately SHORT — this is a "keep Slack
/// family-friendly" helper, not a content moderator. If a mild term slips
/// through, that is the safer failure: the filter is opt-in, so a false
/// negative costs nothing and a false positive censors real speech.
pub const ENGLISH_PROFANITY: &[&str] = &[
    "fuck",
    "fucking",
    "fucker",
    "fucked",
    "shit",
    "shitty",
    "bullshit",
    "bitch",
    "bitches",
    "asshole",
    "bastard",
    "dick",
    "dickhead",
    "crap",
    "damn",
    "goddamn",
    "cunt",
];

/// "fuck" → "f***". The core letters are shared by the inflected forms
/// ("fucking" → "f******"), so one function covers every list entry.
pub fn mask_with_asterisks(word: &str) -> String {
    let mut chars = word.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    first.to_string() + &"*".repeat(chars.count())
}

/// The fixed marker the Bleeps style writes for any masked word.
pub fn mask_with_bleeps(_word: &str) -> String {
    "[bleep]".to_string()
}

/**
 * SOURCE OF TRUTH KEYWORDS: ProfanityStyle
 * WHAT:  How a masked word is written: initials-plus-asterisks, or a fixed
 *        bleep marker.
 * WHY:   Slack culture reads "f***" fine; formal minutes read "[bleep]". Two
 *        styles cover both without a settings page of their own — parsed with
 *        the same trim/lowercase contract as CaseStyle::parse_style, so the
 *        behaviour matches the one other setting style this app has.
 * WHERE: Parsed from the enhance.profanity_style choice setting by
 *        adapters/rules/mod.rs and the preview command.
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProfanityStyle {
    Asterisks,
    Bleeps,
}

impl ProfanityStyle {
    pub fn parse_style(s: &str) -> Self {
        match s.to_lowercase().trim() {
            "bleeps" | "bleep" | "censor" => ProfanityStyle::Bleeps,
            _ => ProfanityStyle::Asterisks,
        }
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: mask_profanity
 * WHAT:  Masks whole profane words, case-insensitively, preserving the
 *        matched word's own first letter ("FUCK" → "F***").
 * WHY:   Whole-word boundaries keep "class" safe from "ass" and "shitake"
 *        safe from "shit". Each masked word becomes one token, so the rules
 *        that run after this one (stutter cleanup, the diff view) still see
 *        words. English-only: every other language-gated rule in this
 *        pipeline gates the same way, and masking words we have no list for
 *        would mean censoring real speech on a guess.
 * WHERE: Called by adapters/rules/mod.rs and text.rs tests.
 */
pub fn mask_profanity(text: &str, language: Option<&LanguageCode>, style: ProfanityStyle) -> String {
    let is_en = language
        .map(|l| l.as_str().starts_with("en"))
        .unwrap_or(false);
    if !is_en {
        return text.to_string();
    }

    let mask = |word: &str| match style {
        ProfanityStyle::Asterisks => mask_with_asterisks(word),
        ProfanityStyle::Bleeps => mask_with_bleeps(word),
    };

    let mut out = text.to_string();
    for word in ENGLISH_PROFANITY {
        out = mask_word(&out, word, &mask);
    }
    out
}

/**
 * WHAT:  Case-insensitive whole-word masking of one needle, preserving the
 *        match's own casing through `mask`.
 * WHY:   `replace_whole_words` cannot do this — its replacement is fixed, and
 *        a fixed "f***" would flatten "FUCK" and "Fuck" into lowercase. This
 *        mirrors that function's boundary logic and subject→haystack offset
 *        map (which keeps byte offsets honest when case folding changes
 *        lengths), then substitutes the ORIGINAL matched slice so the mask
 *        inherits its letters. The early-out — a plain substring probe before
 *        building the offset map — is the same per-needle win
 *        replace_whole_words gained, and matters here because this runs for
 *        every list entry on every chunk.
 * WHERE: mask_profanity's inner loop.
 */
fn mask_word(haystack: &str, needle: &str, mask: &dyn Fn(&str) -> String) -> String {
    if needle.is_empty() {
        return haystack.to_string();
    }
    let subject = haystack.to_lowercase();
    if !subject.contains(needle) {
        return haystack.to_string();
    }

    // Mapping from subject byte offset to haystack byte offset.
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

    let mut out = String::with_capacity(haystack.len());
    let mut cursor = 0usize;
    let mut search_idx = 0usize;

    while let Some(found) = subject[search_idx..].find(needle) {
        let s_start = search_idx + found;
        let s_end = s_start + needle.len();
        let h_start = s_to_h[s_start];
        let h_end = s_to_h[s_end];

        let before_ok = h_start == 0
            || !haystack[..h_start]
                .chars()
                .next_back()
                .is_some_and(|c| c.is_alphanumeric());
        let after_ok = h_end >= haystack.len()
            || !haystack[h_end..]
                .chars()
                .next()
                .is_some_and(|c| c.is_alphanumeric());

        if before_ok && after_ok {
            out.push_str(&haystack[cursor..h_start]);
            out.push_str(&mask(&haystack[h_start..h_end]));
        } else {
            out.push_str(&haystack[cursor..h_end]);
        }
        cursor = h_end;
        search_idx = s_end;
    }

    out.push_str(&haystack[cursor..]);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn en() -> LanguageCode {
        LanguageCode("en".into())
    }

    #[test]
    fn masks_whole_words_but_not_words_that_merely_contain_them() {
        assert_eq!(
            mask_profanity("that was bullshit", Some(&en()), ProfanityStyle::Asterisks),
            "that was b*******"
        );
        assert_eq!(
            mask_profanity("i sit in class", Some(&en()), ProfanityStyle::Asterisks),
            "i sit in class",
            "a word containing 'ass' must survive"
        );
        assert_eq!(
            mask_profanity("pass the salt", Some(&en()), ProfanityStyle::Asterisks),
            "pass the salt",
            "'pass' merely contains 'ass' — a whole-word boundary check must not fire"
        );
    }

    #[test]
    fn casing_is_preserved() {
        assert_eq!(
            mask_profanity("FUCK off", Some(&en()), ProfanityStyle::Asterisks),
            "F*** off"
        );
        assert_eq!(
            mask_profanity("Damn it", Some(&en()), ProfanityStyle::Asterisks),
            "D*** it"
        );
    }

    #[test]
    fn bleeps_replace_the_whole_word() {
        assert_eq!(
            mask_profanity("what the fuck", Some(&en()), ProfanityStyle::Bleeps),
            "what the [bleep]"
        );
        assert_eq!(
            mask_profanity("What the FUCK.", Some(&en()), ProfanityStyle::Bleeps),
            "What the [bleep]."
        );
    }

    #[test]
    fn does_not_touch_other_languages() {
        let fr = Some(LanguageCode("fr".into()));
        let text = "merde putain";
        assert_eq!(mask_profanity(text, fr.as_ref(), ProfanityStyle::Asterisks), text);
    }

    #[test]
    fn masked_words_survive_as_single_tokens() {
        let out = mask_profanity("no shit", Some(&en()), ProfanityStyle::Asterisks);
        assert_eq!(out, "no s***");
        assert!(!out.contains("shit"));
    }

    #[test]
    fn punctuation_around_a_masked_word_survives() {
        assert_eq!(
            mask_profanity("\"damn,\" he said", Some(&en()), ProfanityStyle::Asterisks),
            "\"d***,\" he said"
        );
    }
}
