/*!
 * SOURCE OF TRUTH KEYWORDS: normalize_numbers, parse_cardinal_phrase,
 *   format_ordinal, normalize_currency
 * WHAT:  Spoken number normalization converting words into digits, ordinals,
 *        and currency.
 * WHY:   Whisper and spoken dictation often emit spelled-out numbers like
 *        "forty two", "third", "one thousand", or "twenty dollars". Readers
 *        expect "42", "3rd", "1,000", and "$20".
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

use std::sync::LazyLock;

use crate::types::LanguageCode;

fn is_english(language: Option<&LanguageCode>) -> bool {
    language
        .map(|l| l.as_str().starts_with("en"))
        .unwrap_or(true)
}

/// Normalizes spoken numbers, ordinals, and currencies in `text`.
pub fn normalize_numbers(text: &str, language: Option<&LanguageCode>) -> String {
    if !is_english(language) || text.is_empty() {
        return text.to_string();
    }

    let with_currency = normalize_currency(text);
    let with_ordinals = normalize_ordinals(&with_currency);
    normalize_cardinals(&with_ordinals)
}

fn format_number_with_commas(n: u64) -> String {
    let s = n.to_string();
    let bytes = s.as_bytes();
    let len = bytes.len();
    let mut out = String::with_capacity(len + (len / 3));

    for (i, &b) in bytes.iter().enumerate() {
        if i > 0 && (len - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(b as char);
    }
    out
}

const UNITS: &[(&str, u64)] = &[
    ("zero", 0),
    ("one", 1),
    ("two", 2),
    ("three", 3),
    ("four", 4),
    ("five", 5),
    ("six", 6),
    ("seven", 7),
    ("eight", 8),
    ("nine", 9),
    ("ten", 10),
    ("eleven", 11),
    ("twelve", 12),
    ("thirteen", 13),
    ("fourteen", 14),
    ("fifteen", 15),
    ("sixteen", 16),
    ("seventeen", 17),
    ("eighteen", 18),
    ("nineteen", 19),
];

const TENS: &[(&str, u64)] = &[
    ("twenty", 20),
    ("thirty", 30),
    ("forty", 40),
    ("fifty", 50),
    ("sixty", 60),
    ("seventy", 70),
    ("eighty", 80),
    ("ninety", 90),
];

const SCALES: &[(&str, u64)] = &[
    ("hundred", 100),
    ("thousand", 1_000),
    ("million", 1_000_000),
    ("billion", 1_000_000_000),
];

fn unit_val(word: &str) -> Option<u64> {
    UNITS.iter().find(|(w, _)| *w == word).map(|(_, v)| *v)
}

fn tens_val(word: &str) -> Option<u64> {
    TENS.iter().find(|(w, _)| *w == word).map(|(_, v)| *v)
}

fn scale_val(word: &str) -> Option<u64> {
    SCALES.iter().find(|(w, _)| *w == word).map(|(_, v)| *v)
}

fn is_number_word(word: &str) -> bool {
    let lower = word.to_lowercase();
    let clean = lower.trim_end_matches([',', '.', '!', '?', ';', ':']);
    unit_val(clean).is_some()
        || tens_val(clean).is_some()
        || scale_val(clean).is_some()
        || clean == "and"
        || clean.contains('-')
}

fn parse_hyphenated_number(word: &str) -> Option<u64> {
    let parts: Vec<&str> = word.split('-').collect();
    if parts.len() == 2 {
        let t = tens_val(parts[0])?;
        let u = unit_val(parts[1])?;
        return Some(t + u);
    }
    None
}

/// Parses a slice of consecutive number tokens into a single numeric value.
fn parse_number_tokens(tokens: &[&str]) -> Option<u64> {
    if tokens.is_empty() {
        return None;
    }

    let mut total: u64 = 0;
    let mut current: u64 = 0;
    let mut has_any = false;

    for &tok in tokens {
        let clean = tok.to_lowercase();
        if clean == "and" {
            continue;
        }

        if let Some(val) = parse_hyphenated_number(&clean) {
            current += val;
            has_any = true;
            continue;
        }

        if let Some(val) = unit_val(&clean) {
            current += val;
            has_any = true;
        } else if let Some(val) = tens_val(&clean) {
            current += val;
            has_any = true;
        } else {
            let scale = scale_val(&clean)?;
            if scale == 100 {
                current = if current == 0 { 100 } else { current * 100 };
            } else {
                current = if current == 0 { 1 } else { current };
                total += current * scale;
                current = 0;
            }
            has_any = true;
        }
    }

    if !has_any {
        return None;
    }

    Some(total + current)
}

fn normalize_cardinals(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let raw_word = words[i];
        let clean = raw_word
            .trim_end_matches([',', '.', '!', '?', ';', ':'])
            .to_lowercase();

        // Check if this token starts a number sequence
        if (unit_val(&clean).is_some() && clean != "zero")
            || tens_val(&clean).is_some()
            || scale_val(&clean).is_some()
            || parse_hyphenated_number(&clean).is_some()
        {
            // Collect consecutive number words
            let mut num_tokens = Vec::new();
            let mut j = i;
            let mut trailing_punct = String::new();

            while j < words.len() {
                let w = words[j];
                let w_punct = w
                    .chars()
                    .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                    .collect::<String>();
                let w_clean = w
                    .trim_end_matches([',', '.', '!', '?', ';', ':'])
                    .to_lowercase();

                if w_clean == "and" {
                    // "and" is only allowed if preceded by a number word and followed by a number word
                    if num_tokens.is_empty()
                        || j + 1 >= words.len()
                        || !is_number_word(words[j + 1])
                    {
                        break;
                    }
                    num_tokens.push("and");
                    j += 1;
                    continue;
                }

                if unit_val(&w_clean).is_some()
                    || tens_val(&w_clean).is_some()
                    || scale_val(&w_clean).is_some()
                    || parse_hyphenated_number(&w_clean).is_some()
                {
                    num_tokens.push(words[j].trim_end_matches([',', '.', '!', '?', ';', ':']));
                    if !w_punct.is_empty() {
                        trailing_punct = w_punct;
                        j += 1;
                        break;
                    }
                    j += 1;
                } else {
                    break;
                }
            }

            if let Some(parsed) = parse_number_tokens(&num_tokens) {
                let is_compound = num_tokens.len() > 1 || parsed >= 10 || raw_word.contains('-');

                if is_compound {
                    let formatted = format_number_with_commas(parsed);
                    result.push(format!("{formatted}{trailing_punct}"));
                    i = j;
                    continue;
                }
            }
        }

        result.push(raw_word.to_string());
        i += 1;
    }

    result.join(" ")
}

const ORDINALS: &[(&str, &str)] = &[
    ("first", "1st"),
    ("second", "2nd"),
    ("third", "3rd"),
    ("fourth", "4th"),
    ("fifth", "5th"),
    ("sixth", "6th"),
    ("seventh", "7th"),
    ("eighth", "8th"),
    ("ninth", "9th"),
    ("tenth", "10th"),
    ("eleventh", "11th"),
    ("twelfth", "12th"),
    ("thirteenth", "13th"),
    ("fourteenth", "14th"),
    ("fifteenth", "15th"),
    ("sixteenth", "16th"),
    ("seventeenth", "17th"),
    ("eighteenth", "18th"),
    ("nineteenth", "19th"),
    ("twentieth", "20th"),
    ("twenty first", "21st"),
    ("twenty-first", "21st"),
    ("twenty second", "22nd"),
    ("twenty-second", "22nd"),
    ("twenty third", "23rd"),
    ("twenty-third", "23rd"),
    ("thirtieth", "30th"),
    ("thirty first", "31st"),
    ("thirty-first", "31st"),
    ("thirty second", "32nd"),
    ("thirty-second", "32nd"),
    ("fortieth", "40th"),
    ("fiftieth", "50th"),
    ("sixtieth", "60th"),
    ("seventieth", "70th"),
    ("eightieth", "80th"),
    ("ninetieth", "90th"),
    ("hundredth", "100th"),
    ("thousandth", "1,000th"),
];

fn normalize_ordinals(text: &str) -> String {
    let mut out = text.to_string();

    // Longest first so "twenty-first" is matched before "first" could claim
    // its tail. Built once — the table is static, so its sorted order never
    // changes (same per-process cache as the filler and spoken-command
    // tables).
    static SORTED_ORDINALS: LazyLock<&'static [(&'static str, &'static str)]> =
        LazyLock::new(|| {
            let mut sorted: Vec<(&str, &str)> = ORDINALS.to_vec();
            sorted.sort_by_key(|(spoken, _)| std::cmp::Reverse(spoken.len()));
            Box::leak(sorted.into())
        });

    for (spoken, replacement) in SORTED_ORDINALS.iter() {
        out = super::dictionary::replace_whole_words(&out, spoken, replacement, false, false);
    }
    out
}

const CURRENCIES: &[(&str, &str)] = &[
    ("dollars", "$"),
    ("dollar", "$"),
    ("bucks", "$"),
    ("buck", "$"),
    ("euros", "€"),
    ("euro", "€"),
    ("pounds", "£"),
    ("pound", "£"),
];

fn normalize_currency(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.len() < 2 {
        return text.to_string();
    }

    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let mut number_words = Vec::new();
        let mut j = i;

        while j < words.len() {
            let clean = words[j]
                .trim_end_matches([',', '.', '!', '?', ';', ':'])
                .to_lowercase();
            if is_number_word(&clean) {
                number_words.push(clean);
                j += 1;
            } else {
                break;
            }
        }

        if !number_words.is_empty() && j < words.len() {
            let punct = words[j]
                .chars()
                .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                .collect::<String>();
            let next_clean = words[j]
                .trim_end_matches([',', '.', '!', '?', ';', ':'])
                .to_lowercase();

            if let Some((_, symbol)) = CURRENCIES.iter().find(|(name, _)| *name == next_clean) {
                let num_tokens: Vec<&str> = number_words.iter().map(|s| s.as_str()).collect();
                if let Some(parsed_amount) = parse_number_tokens(&num_tokens) {
                    let next_idx = j + 1;

                    if punct.is_empty()
                        && next_idx + 2 < words.len()
                        && words[next_idx].to_lowercase() == "and"
                    {
                        let cents_word = words[next_idx + 1].to_lowercase();
                        let cents_unit = words[next_idx + 2].to_lowercase();
                        let cents_punct = words[next_idx + 2]
                            .chars()
                            .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                            .collect::<String>();
                        let clean_cents_unit =
                            cents_unit.trim_end_matches([',', '.', '!', '?', ';', ':']);

                        if clean_cents_unit == "cents" || clean_cents_unit == "cent" {
                            if let Some(c_val) = parse_number_tokens(&[&cents_word]) {
                                let formatted_main = format_number_with_commas(parsed_amount);
                                result.push(format!(
                                    "{symbol}{formatted_main}.{c_val:02}{cents_punct}"
                                ));
                                i = next_idx + 3;
                                continue;
                            }
                        }
                    }

                    let formatted = format_number_with_commas(parsed_amount);
                    result.push(format!("{symbol}{formatted}{punct}"));
                    i = j + 1;
                    continue;
                }
            } else if next_clean == "cents" || next_clean == "cent" {
                let num_tokens: Vec<&str> = number_words.iter().map(|s| s.as_str()).collect();
                if let Some(parsed_cents) = parse_number_tokens(&num_tokens) {
                    result.push(format!("{parsed_cents}¢{punct}"));
                    i = j + 1;
                    continue;
                }
            }
        }

        result.push(words[i].to_string());
        i += 1;
    }

    result.join(" ")
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn normalizes_cardinal_compounds_and_large_numbers() {
        let lang = LanguageCode("en".into());
        assert_eq!(
            normalize_numbers("we need forty two items", Some(&lang)),
            "we need 42 items"
        );
        assert_eq!(
            normalize_numbers("cost is one thousand units", Some(&lang)),
            "cost is 1,000 units"
        );
        assert_eq!(
            normalize_numbers("about twenty five thousand people", Some(&lang)),
            "about 25,000 people"
        );
        assert_eq!(
            normalize_numbers(
                "we made two million five hundred thousand calls",
                Some(&lang)
            ),
            "we made 2,500,000 calls"
        );
    }

    #[test]
    fn normalizes_ordinals() {
        let lang = LanguageCode("en".into());
        assert_eq!(
            normalize_numbers("this is the third time", Some(&lang)),
            "this is the 3rd time"
        );
        assert_eq!(
            normalize_numbers("he finished twenty first in line", Some(&lang)),
            "he finished 21st in line"
        );
        assert_eq!(
            normalize_numbers("on the thirty second floor", Some(&lang)),
            "on the 32nd floor"
        );
    }

    #[test]
    fn normalizes_currency_expressions() {
        let lang = LanguageCode("en".into());
        assert_eq!(
            normalize_numbers("that costs twenty dollars", Some(&lang)),
            "that costs $20"
        );
        assert_eq!(
            normalize_numbers("paid five hundred dollars for it", Some(&lang)),
            "paid $500 for it"
        );
        assert_eq!(
            normalize_numbers("it was fifty euros", Some(&lang)),
            "it was €50"
        );
        assert_eq!(
            normalize_numbers("costs ten pounds", Some(&lang)),
            "costs £10"
        );
        assert_eq!(normalize_numbers("only five bucks", Some(&lang)), "only $5");
        assert_eq!(
            normalize_numbers("keep fifty cents", Some(&lang)),
            "keep 50¢"
        );
        assert_eq!(
            normalize_numbers("total was twenty dollars and fifty cents.", Some(&lang)),
            "total was $20.50."
        );
    }
}
