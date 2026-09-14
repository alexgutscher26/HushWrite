/*!
 * SOURCE OF TRUTH KEYWORDS: normalise_whitespace, dedupe_stutters
 * WHAT:  Whitespace collapsing and repetition / stutter deduplication.
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

/**
 * WHAT:  Collapses runs of whitespace and trims the ends, preserving newlines.
 * WHY:   Runs first so every later rule can assume single spaces. Newlines
 *        survive because spoken-command expansion produces them deliberately.
 */
pub fn normalise_whitespace(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut last_was_space = false;
    let mut newline_run = 0usize;

    for ch in text.chars() {
        match ch {
            '\n' => {
                // Two newlines is a paragraph; more than that is noise.
                if newline_run < 2 {
                    out.push('\n');
                    newline_run += 1;
                }
                last_was_space = true;
            }
            c if c.is_whitespace() => {
                if !last_was_space {
                    out.push(' ');
                    last_was_space = true;
                }
            }
            c => {
                out.push(c);
                last_was_space = false;
                newline_run = 0;
            }
        }
    }

    out.trim().to_string()
}

/**
 * SOURCE OF TRUTH KEYWORDS: dedupe_stutters
 * WHAT:  Collapses an immediately repeated word or short phrase.
 * WHY:   Chunk boundaries overlap by design, so a word spoken across a seam can
 *        be decoded twice. This catches that, and genuine spoken stutters with
 *        it. Limited to repeats of at most three words and only when they are
 *        ADJACENT.
 */
pub fn dedupe_stutters(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.len() < 2 {
        return text.to_string();
    }

    let mut out: Vec<&str> = Vec::with_capacity(words.len());
    let mut index = 0usize;

    while index < words.len() {
        let mut matched = false;

        // Check spans starting from 1 up to 8 words so that single repeated words
        // (the most common stutter/loop) collapse immediately without being chunked
        // into artificial larger sub-phrases.
        for span in 1..=8 {
            if index + span * 2 > words.len() {
                continue;
            }
            let first = &words[index..index + span];
            let second = &words[index + span..index + span * 2];

            if phrases_match(first, second) {
                out.extend_from_slice(first);
                index += span * 2;
                // Collapse ALL subsequent consecutive identical phrases
                while index + span <= words.len() && phrases_match(first, &words[index..index + span])
                {
                    index += span;
                }
                matched = true;
                break;
            }
        }

        if !matched {
            out.push(words[index]);
            index += 1;
        }
    }

    out.join(" ")
}

fn phrases_match(a: &[&str], b: &[&str]) -> bool {
    a.len() == b.len()
        && a.iter().zip(b).all(|(x, y)| {
            let strip = |s: &str| {
                s.chars()
                    .filter(|c| c.is_alphanumeric())
                    .flat_map(|c| c.to_lowercase())
                    .collect::<String>()
            };
            let (x, y) = (strip(x), strip(y));
            !x.is_empty() && x == y
        })
}
