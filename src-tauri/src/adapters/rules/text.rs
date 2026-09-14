/*!
 * SOURCE OF TRUTH KEYWORDS: normalise_whitespace, expand_spoken_commands,
 *   strip_fillers, apply_dictionary, dedupe_stutters, normalise_punctuation,
 *   capitalise_sentences, ensure_terminal_punctuation, FILLERS, SPOKEN_COMMANDS
 * WHAT:  Re-exports individual enhancement rules from their focused submodules.
 * WHY:   Split into modular files (`whitespace`, `fillers`, `corrections`,
 *        `dictionary`, `punctuation`, `spoken`) to keep the codebase maintainable
 *        while preserving a single re-export surface and comprehensive regression tests.
 * WHERE: Composed in order by adapters/rules/mod.rs.
 */

#[cfg(test)]
use crate::types::LanguageCode;

pub use super::abbreviations::{abbreviations_for_language, expand_abbreviations, Abbreviation};
pub use super::corrections::apply_spoken_corrections;
pub use super::dictionary::{apply_dictionary, replace_whole_words};
pub use super::fillers::{fillers_for_language, is_cjk, strip_fillers};
pub use super::numbers::normalize_numbers;
pub use super::punctuation::{
    capitalise_sentences, ensure_terminal_punctuation, normalise_punctuation,
    strip_trailing_punctuation,
};
pub use super::spoken::{
    apply_code_mode_casing, expand_spoken_commands, format_code_casing, format_file_tagging,
    format_markdown_mode, normalize_named_entities, CaseStyle,
};
pub use super::urls_and_paths::normalize_urls_and_paths;
pub use super::whitespace::{dedupe_stutters, normalise_whitespace};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{DictionaryEntry, DictionaryId, LanguageCode, MatchKind};

    fn english() -> LanguageCode {
        LanguageCode("en".into())
    }

    fn entry(pattern: &str, replacement: &str, kind: MatchKind) -> DictionaryEntry {
        DictionaryEntry {
            id: DictionaryId(1),
            pattern: pattern.into(),
            replacement: replacement.into(),
            match_kind: kind,
            enabled: true,
            used_at: None,
        }
    }

    // ── whitespace ───────────────────────────────────────────────────────

    #[test]
    fn whitespace_collapses_but_paragraphs_survive() {
        assert_eq!(normalise_whitespace("  a   b  "), "a b");
        assert_eq!(normalise_whitespace("a\n\n\n\nb"), "a\n\nb");
        assert_eq!(normalise_whitespace("a\nb"), "a\nb");
    }

    // ── spoken commands ──────────────────────────────────────────────────

    #[test]
    fn spoken_commands_expand_longest_first() {
        let out = expand_spoken_commands("hello new paragraph world", Some(&english()));
        assert_eq!(out.trim(), "hello \n\n world".trim());
    }

    #[test]
    fn spoken_commands_do_not_fire_inside_a_longer_word() {
        // "commander" must survive a rule that replaces "comma".
        let out = expand_spoken_commands("the commander said", Some(&english()));
        assert_eq!(out, "the commander said");
    }

    #[test]
    fn spoken_commands_are_skipped_for_other_languages() {
        let hindi = LanguageCode("hi".into());
        let text = "comma new line";
        assert_eq!(expand_spoken_commands(text, Some(&hindi)), text);
    }

    // ── fillers ──────────────────────────────────────────────────────────

    #[test]
    fn fillers_are_removed_whole_word_only() {
        let out = strip_fillers("um so I was like thinking", Some(&english()));
        assert_eq!(out, "so I was thinking");
    }

    #[test]
    fn fillers_remove_trailing_punctuation() {
        let out = strip_fillers("um, so I was like, thinking.", Some(&english()));
        assert_eq!(out, "so I was thinking.");

        let out2 = strip_fillers("You know, I was actually... going there.", Some(&english()));
        assert_eq!(out2, "I was going there.");
    }

    #[test]
    fn filler_removal_does_not_touch_words_that_contain_a_filler() {
        // "like" is a filler; "likely" is not.
        let out = strip_fillers("that is likely umbrella weather", Some(&english()));
        assert_eq!(out, "that is likely umbrella weather");
    }

    #[test]
    fn multilingual_fillers_are_removed_for_supported_languages() {
        let spanish = LanguageCode("es".into());
        assert_eq!(
            strip_fillers("este hola bueno estamos listos", Some(&spanish)),
            "hola estamos listos"
        );

        let french = LanguageCode("fr".into());
        assert_eq!(
            strip_fillers("euh bonjour en fait ça va", Some(&french)),
            "bonjour ça va"
        );

        let german = LanguageCode("de".into());
        assert_eq!(
            strip_fillers("äh hallo eigentlich alles gut", Some(&german)),
            "hallo alles gut"
        );

        let japanese = LanguageCode("ja".into());
        assert_eq!(
            strip_fillers("えーとこんにちはあの元気です", Some(&japanese)),
            "こんにちは元気です"
        );
    }

    #[test]
    fn filler_removal_never_runs_on_an_unknown_language() {
        // Unknown language gets no filler stripping
        let esperanto = LanguageCode("eo".into());
        let text = "um like actually este euh";
        assert_eq!(strip_fillers(text, Some(&esperanto)), text);
        assert_eq!(strip_fillers(text, None), text);
    }

    // ── code casing & developer formatting ───────────────────────────────

    #[test]
    fn code_casing_directives_format_identifiers_accurately() {
        assert_eq!(
            format_code_casing("create a camel case user profile controller for auth"),
            "create a userProfileController for auth"
        );
        assert_eq!(
            format_code_casing("define pascal case app state context in state"),
            "define AppStateContext in state"
        );
        assert_eq!(
            format_code_casing("use snake case session token id here"),
            "use session_token_id here"
        );
        assert_eq!(
            format_code_casing("set constant case max retry attempts in config"),
            "set MAX_RETRY_ATTEMPTS in config"
        );
        assert_eq!(
            format_code_casing("add kebab case btn primary outline class"),
            "add btn-primary-outline class"
        );
        assert_eq!(
            format_code_casing("run backticks bun run tauri dev in terminal"),
            "run `bun run tauri dev` in terminal"
        );
    }

    #[test]
    fn code_identifier_casing_pipeline_converts_compound_words() {
        assert_eq!(
            apply_code_mode_casing("user profile component", CaseStyle::Pascal),
            "UserProfileComponent"
        );
        assert_eq!(
            apply_code_mode_casing("user profile component", CaseStyle::Snake),
            "user_profile_component"
        );
        assert_eq!(
            apply_code_mode_casing("user profile component", CaseStyle::Camel),
            "userProfileComponent"
        );
        assert_eq!(
            apply_code_mode_casing(
                "create a user profile component in react",
                CaseStyle::Pascal
            ),
            "create a UserProfileComponent in react"
        );
    }

    #[test]
    fn file_tagging_formats_ai_ide_references() {
        assert_eq!(
            format_file_tagging("look at tag file src slash components slash Button dot tsx"),
            "look at @src/components/Button.tsx"
        );
        assert_eq!(
            format_file_tagging("check at file package dot json in root"),
            "check @package.json in root"
        );
        assert_eq!(
            format_file_tagging("refer to tag folder src slash utils"),
            "refer to @src/utils"
        );
        assert_eq!(
            format_file_tagging("inspect context file src slash auth dot rs, then continue"),
            "inspect @src/auth.rs, then continue"
        );
    }

    #[test]
    fn developer_snippets_expand_cleanly() {
        let pr_checklist = format_markdown_mode("please review pr checklist before merge");
        assert!(pr_checklist.contains("### ✅ PR Checklist"));
        assert!(pr_checklist.contains("- [ ] Unit & integration tests pass"));

        let env_setup = format_markdown_mode("here is the environment setup for new joiners");
        assert!(env_setup.contains("### 🛠️ Environment Setup"));

        let api_docs = format_markdown_mode("generate internal api docs for auth service");
        assert!(api_docs.contains("### 🔌 API Specification"));

        let naming = format_markdown_mode("follow our naming conventions in this repo");
        assert!(naming.contains("### 🏷️ Codebase Naming Conventions"));

        let onboarding = format_markdown_mode("send onboarding instructions to alice");
        assert!(onboarding.contains("### 🚀 Developer Onboarding Checklist"));
    }

    #[test]
    fn creator_macros_and_templates_expand_cleanly() {
        let script =
            format_markdown_mode("here is the youtube script template for the new episode");
        assert!(script.contains("### 🎬 YouTube Video Script"));
        assert!(script.contains("Hook (0:00 - 0:30):"));

        let hook = format_markdown_mode("use this content hook template for the reel");
        assert!(hook.contains("### 🪝 Content Hook Framework"));

        let newsletter = format_markdown_mode("drafting a substack draft for sunday");
        assert!(newsletter.contains("### 💌 Newsletter Draft"));
        assert!(newsletter.contains("Subject Line Options:"));

        let caption = format_markdown_mode("generate instagram caption template for the post");
        assert!(caption.contains("### 📱 Social Caption"));

        let podcast = format_markdown_mode("podcast show notes for episode 42");
        assert!(podcast.contains("### 🎙️ Podcast Episode Outline"));

        let sponsor = format_markdown_mode("record sponsor read template for brand");
        assert!(sponsor.contains("### 📢 Sponsor Read (60s)"));

        let linkedin_post = format_markdown_mode("here is the linkedin post template for today");
        assert!(linkedin_post.contains("### 💼 LinkedIn Post"));
        assert!(linkedin_post.contains("Key Lessons / Framework:"));

        let linkedin_carousel =
            format_markdown_mode("drafting a linkedin carousel template about ai");
        assert!(linkedin_carousel.contains("### 📑 LinkedIn Carousel Outline"));
        assert!(linkedin_carousel.contains("Slide 1 (Cover Hook):"));

        let x_thread = format_markdown_mode("here is the x thread template for the launch");
        assert!(x_thread.contains("### 🧵 X (Twitter) Thread"));
        assert!(x_thread.contains("1/ 🧵 [Hook & Big Promise]:"));

        let x_post = format_markdown_mode("share this x post template with the team");
        assert!(x_post.contains("### 🐦 X (Twitter) Post"));
        assert!(x_post.contains("CTA / Question:"));
    }

    #[test]
    fn creator_named_entities_are_normalized() {
        let raw = "publishing to youtube, instagram, tiktok, substack, and spotify with davinci resolve and descript";
        let out = normalize_named_entities(raw);
        assert_eq!(out, "publishing to YouTube, Instagram, TikTok, Substack, and Spotify with DaVinci Resolve and Descript");

        let social_raw =
            "scheduling posts across linkedin, twitter, typefully, taplio, tweetdeck, and bluesky";
        let social_out = normalize_named_entities(social_raw);
        assert_eq!(
            social_out,
            "scheduling posts across LinkedIn, Twitter, Typefully, Taplio, TweetDeck, and Bluesky"
        );
    }

    #[test]
    fn social_spoken_commands_expand_properly() {
        use super::super::spoken::expand_spoken_commands;

        let lang = english();
        let raw = "first thought tweet break second thought tag user alex hashtag buildinpublic";
        let out = expand_spoken_commands(raw, Some(&lang));
        assert!(out.contains("🧵"));
        assert!(out.contains("@ alex"));
        assert!(out.contains("# buildinpublic"));
    }

    #[test]
    fn markdown_and_github_macros_expand() {
        let text = "issue title login failure steps to reproduce 1. open app expected behavior should work";
        let out = format_markdown_mode(text);
        assert!(out.contains("# Issue: login failure"));
        assert!(out.contains("### Steps to Reproduce:\n1. "));
        assert!(out.contains("### Expected Behavior"));
    }

    // ── dictionary ───────────────────────────────────────────────────────

    #[test]
    fn dictionary_fixes_the_canonical_case() {
        let entries = [entry("clod code", "Claude Code", MatchKind::Word)];
        assert_eq!(
            apply_dictionary("i opened clod code today", &entries),
            "i opened Claude Code today"
        );
    }

    #[test]
    fn a_word_replacement_cannot_corrupt_a_longer_word() {
        // The reason Word is the default and Substring is opt-in.
        let entries = [entry("ai", "AI", MatchKind::Word)];
        assert_eq!(
            apply_dictionary("he said ai is said", &entries),
            "he said AI is said"
        );
    }

    #[test]
    fn substring_matching_is_available_when_explicitly_chosen() {
        let entries = [entry("ai", "AI", MatchKind::Substring)];
        assert_eq!(apply_dictionary("said", &entries), "sAId");
    }

    #[test]
    fn disabled_entries_are_ignored() {
        let mut e = entry("clod", "Claude", MatchKind::Word);
        e.enabled = false;
        assert_eq!(apply_dictionary("clod code", &[e]), "clod code");
    }

    // ── stutters and seams ───────────────────────────────────────────────

    #[test]
    fn an_immediately_repeated_word_is_collapsed() {
        assert_eq!(dedupe_stutters("the the cat sat"), "the cat sat");
        assert_eq!(dedupe_stutters("the the the cat sat"), "the cat sat");
    }

    #[test]
    fn severe_repetition_loops_are_collapsed_to_single_instance() {
        let repeated_introducing = vec!["Introducing,"; 37].join(" ");
        assert_eq!(
            dedupe_stutters(&repeated_introducing),
            "Introducing,"
        );

        let repeated_words = vec!["word"; 15].join(" ");
        assert_eq!(dedupe_stutters(&repeated_words), "word");
    }

    #[test]
    fn a_repeated_phrase_across_a_seam_is_collapsed_as_a_phrase() {
        // Exactly the chunk-overlap case: the last words of one chunk repeated
        // as the first words of the next.
        assert_eq!(
            dedupe_stutters("i want to i want to go home"),
            "i want to go home"
        );
        assert_eq!(
            dedupe_stutters("i want to i want to i want to go home"),
            "i want to go home"
        );
    }

    #[test]
    fn longer_repeated_phrases_are_collapsed() {
        assert_eq!(
            dedupe_stutters(
                "thank you very much for watching this video thank you very much for watching this video"
            ),
            "thank you very much for watching this video"
        );
    }

    #[test]
    fn repetition_that_is_real_speech_is_preserved() {
        // Not adjacent duplicates of the same span — this is how people talk.
        assert_eq!(
            dedupe_stutters("very good and very bad"),
            "very good and very bad"
        );
    }

    #[test]
    fn punctuation_does_not_hide_a_duplicate() {
        assert_eq!(dedupe_stutters("hello, hello there"), "hello, there");
    }

    // ── punctuation and casing ───────────────────────────────────────────

    #[test]
    fn punctuation_spacing_is_tidied() {
        assert_eq!(normalise_punctuation("hello , world ."), "hello, world.");
    }

    #[test]
    fn curly_quotes_become_straight_ones() {
        assert_eq!(
            normalise_punctuation("\u{201C}hello\u{201D} it\u{2019}s"),
            "\"hello\" it's"
        );
    }

    #[test]
    fn an_ellipsis_survives_but_a_doubled_bang_does_not() {
        assert_eq!(normalise_punctuation("wait..."), "wait...");
        assert_eq!(normalise_punctuation("stop!!"), "stop!");
    }

    #[test]
    fn double_period_is_collapsed_to_single_period() {
        assert_eq!(normalise_punctuation("word.."), "word.");
        assert_eq!(normalise_punctuation("hello.. world"), "hello. world");
    }

    #[test]
    fn trailing_punctuation_is_stripped_cleanly() {
        assert_eq!(strip_trailing_punctuation("word."), "word");
        assert_eq!(strip_trailing_punctuation("word.."), "word");
        assert_eq!(strip_trailing_punctuation("wait..."), "wait");
        assert_eq!(strip_trailing_punctuation("done!   "), "done");
        assert_eq!(strip_trailing_punctuation("hello, world?"), "hello, world");
    }

    #[test]
    fn sentences_are_capitalised_without_lowercasing_anything() {
        assert_eq!(
            capitalise_sentences("hello there. how are you?"),
            "Hello there. How are you?"
        );
        // Acronyms and proper nouns the model got right must survive.
        assert_eq!(capitalise_sentences("the API is fine"), "The API is fine");
    }

    #[test]
    fn terminal_punctuation_is_added_only_when_missing() {
        assert_eq!(ensure_terminal_punctuation("hello"), "hello.");
        assert_eq!(ensure_terminal_punctuation("hello."), "hello.");
        assert_eq!(ensure_terminal_punctuation("really?"), "really?");
    }

    #[test]
    fn a_deliberate_trailing_newline_does_not_get_a_full_stop() {
        assert_eq!(ensure_terminal_punctuation("a list\n\n"), "a list\n\n");
    }

    #[test]
    fn empty_input_stays_empty_through_every_rule() {
        assert_eq!(normalise_whitespace(""), "");
        assert_eq!(strip_fillers("", Some(&english())), "");
        assert_eq!(dedupe_stutters(""), "");
        assert_eq!(capitalise_sentences(""), "");
        assert_eq!(ensure_terminal_punctuation(""), "");
    }

    #[test]
    fn spoken_snippets_and_templates_expand_properly() {
        let bug = format_markdown_mode("insert bug template");
        assert!(bug.contains("### 🐛 Bug Report"));
        assert!(bug.contains("Steps to Reproduce:"));

        let standup = format_markdown_mode("status update");
        assert!(standup.contains("### 📋 Status Update"));
        assert!(standup.contains("**Yesterday:**"));
        assert!(standup.contains("**Blockers:**"));

        let pr = format_markdown_mode("pr template");
        assert!(pr.contains("### 🚀 Pull Request"));
        assert!(pr.contains("Testing Checklist:"));

        let badge = format_markdown_mode("badge template");
        assert!(badge.contains("https://img.shields.io/badge/dictated%20with-HushWrite-5865F2"));

        let footer = format_markdown_mode("dictated with HushWrite");
        assert!(footer
            .contains("_Dictated privately on-device with [HushWrite](https://HushWrite.app)_"));
    }
}

#[cfg(test)]
mod correction_tests {
    use super::*;

    fn en() -> LanguageCode {
        LanguageCode("en".into())
    }

    fn correct(text: &str) -> String {
        apply_spoken_corrections(text, Some(&en()))
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: real_corrections_from_the_corpus
     * WHAT:  Every genuine self-correction found in 132 of the operator's own
     *        transcripts.
     * WHY:   These are not invented examples. They are the complete set of real
     *        corrections in the corpus, and they are the reason the rule looks
     *        the way it does: not one of them contains a correction verb like
     *        "I meant". Every one is a bare interjection with structurally
     *        parallel phrases either side.
     *
     *        If a change to CORRECTION_CUES or the alignment breaks one of
     *        these, it has broken the feature on the only data we have.
     */
    #[test]
    fn the_real_corrections_from_the_corpus_all_work() {
        // A replacement: the phrases share their leading "on".
        assert_eq!(
            correct("I have a meeting on Tuesday, sorry, on Wednesday at 3 p.m."),
            "I have a meeting on Wednesday at 3 p.m."
        );

        // A replacement across a sentence boundary, sharing "no".
        assert_eq!(
            correct("This is focused on minimalism and no focus. Sorry, no distraction."),
            "This is focused on minimalism and no distraction."
        );

        // A restart: the repeated "can you" is the signal, so the first attempt
        // goes and the second stands.
        assert_eq!(
            correct("Hey, can you, oh wait, can you hear me?"),
            "Hey, can you hear me?"
        );

        // An explicit restart discards everything before it.
        assert_eq!(
            correct("So this is a... Actually, sorry, let's start again. Basically, welcome to my new YouTube video."),
            "Basically, welcome to my new YouTube video."
        );
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: the_rule_never_damages_text_it_does_not_correct
     * WHAT:  Text with no correction in it comes back byte-identical.
     * WHY:   The failure this replaced. The old rule split sentences and
     *        rejoined them, so every transcript it touched came back with "..."
     *        turned into ". . ." and "3 p.m." into "3 p. m." — on 11 of the
     *        operator's sessions, NONE of which contained a correction. Damage
     *        with no benefit is strictly worse than doing nothing, so
     *        "unchanged" is asserted byte-for-byte rather than approximately.
     */
    #[test]
    fn the_rule_never_damages_text_it_does_not_correct() {
        for text in [
            "It looks like those buttons are... trying to fit inside the sidebar.",
            "I have a meeting at 3 p.m. on Wednesday.",
            "The circle... Progress bar doesn't actually progress.",
            "Say lol This is absolutely free. Enjoy and put a heart icon.",
        ] {
            assert_eq!(correct(text), text, "text with no correction was rewritten");
        }
    }

    /**
     * SOURCE OF TRUTH KEYWORDS: innocent_cue_words_are_left_alone
     * WHAT:  Ordinary sentences containing the cue words are untouched.
     * WHY:   Still the test that matters most, and now drawn from real usage:
     *        "actually" appears 20 times in the corpus and is an adverb in 18 of
     *        them, "instead" appears 8 times and is never a correction, and
     *        "correction" appears 4 times as a noun about this very feature.
     *        The cue set is permissive on purpose — the parallel ALIGNMENT is
     *        what gates — so this is the proof that a cue alone fires nothing.
     */
    #[test]
    fn ordinary_sentences_containing_the_cue_words_are_untouched() {
        for sentence in [
            "This is me testing out to see if the app actually works.",
            "I actually don't like the orange color theme.",
            "Instead of showing a timer, just delete it.",
            "The other feature I want built into this app is auto correction.",
            "Wait, let me think about that.",
            "I'm sorry about the delay.",
            "What I mean by this is they can get the updated version.",
            "We can start over the weekend if that suits you.",
            "No, that's not what the graph shows.",
            "What I meant was clear enough.",
        ] {
            assert_eq!(
                correct(sentence),
                sentence,
                "an ordinary sentence was rewritten"
            );
        }
    }

    /**
     * WHAT:  A cue with no parallel phrase before it does nothing.
     * WHY:   This is the whole precision argument stated as a test. The cue set
     *        is deliberately loose, so if alignment ever stopped being required
     *        the rule would start eating the front of sentences that merely
     *        begin with "Sorry," or "No,".
     */
    #[test]
    fn a_cue_without_an_alignment_never_fires() {
        for sentence in [
            "Sorry, I will send it over tonight.",
            "No, the meeting is still going ahead.",
            "Oh, that reminds me of something else.",
        ] {
            assert_eq!(correct(sentence), sentence);
        }
    }

    #[test]
    fn a_replacement_never_reaches_further_than_the_cap() {
        // The parallel span is capped, so an alignment can never swallow the
        // start of a long sentence.
        let input = "The file lives in the old project folder somewhere, sorry, in the new shared documents folder.";
        let out = correct(input);
        assert!(
            out.starts_with("The file lives"),
            "the cap did not protect the start of the sentence: {out}"
        );
    }

    #[test]
    fn corrections_are_english_only() {
        let fr = LanguageCode("fr".into());
        let input = "on mardi, sorry, on mercredi.";
        assert_eq!(apply_spoken_corrections(input, Some(&fr)), input);
    }
}

#[cfg(test)]
mod corpus_measurement {
    use super::*;

    /**
     * SOURCE OF TRUTH KEYWORDS: measure_against_real_transcripts
     * WHAT:  Runs the correction rule over every transcript in the local
     *        history and prints what it changed. Ignored by default; run with
     *        `cargo test measure_against_real -- --ignored --nocapture`.
     * WHY:   This is how the rule was rebuilt, and it is the only honest way to
     *        change it again. The previous marker set — "I meant", "make that",
     *        "scratch that" — was invented from what a correction sounds like in
     *        the abstract, and appears ZERO times in 132 real sessions. The
     *        rule fired on 11 transcripts, corrected none of them, and quietly
     *        rewrote "..." into ". . ." on all 11.
     *
     *        Not a gate: it needs a populated database, which CI does not have,
     *        and its output is read by a person rather than asserted. The
     *        assertions that came OUT of it live in `correction_tests`.
     * WHERE: Run by hand before changing CORRECTION_CUES or the alignment rule.
     */
    #[test]
    #[ignore]
    fn measure_against_real_transcripts() {
        let Ok(paths) = crate::config::AppPaths::resolve() else {
            eprintln!("skipped: no application support directory");
            return;
        };
        let Ok(db) = crate::db::Database::open(&paths.db_path) else {
            eprintln!("skipped: no local history database");
            return;
        };

        let sessions = crate::services::sessions::list_sessions(&db, 10_000, 0).unwrap_or_default();
        let en = LanguageCode("en".into());
        let (mut changed, mut total) = (0, 0);

        for session in &sessions {
            let Some(raw) = session.raw_text.as_deref() else {
                continue;
            };
            if raw.trim().is_empty() {
                continue;
            }
            total += 1;
            let out = apply_spoken_corrections(raw, Some(&en));
            if out != raw {
                changed += 1;
                println!("\n--- BEFORE: {}", raw.trim());
                println!("--- AFTER : {}", out.trim());
            }
        }
        println!("\n=== fired on {changed} of {total} transcripts ===");
    }
}
