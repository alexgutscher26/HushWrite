/*!
 * SOURCE OF TRUTH KEYWORDS: normalize_urls_and_paths, format_spoken_urls,
 *   format_spoken_paths, format_spoken_emails
 * WHAT:  Spoken URL, file path, and email normalization.
 * WHY:   Whisper often transcribes spoken web links, filesystem paths, and
 *        email addresses as separate words ("https colon slash slash github dot com",
 *        "slash usr slash local slash bin", "alice at example dot com").
 *        Normalizing them produces clean, clickable, typed identifiers.
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

use std::sync::LazyLock;

const COMMON_TLDS: &[&str] = &[
    "com", "org", "net", "io", "dev", "ai", "app", "co", "edu", "gov", "xyz", "info", "me", "tech",
    "site", "online", "cloud", "agency", "uk", "de", "ca", "fr", "jp", "au", "eu", "ch", "nl",
    "se", "es",
];

/// Normalizes spoken URLs, email addresses, and filesystem paths.
pub fn normalize_urls_and_paths(text: &str) -> String {
    if text.is_empty() {
        return text.to_string();
    }

    let with_emails = format_spoken_emails(text);
    let with_urls = format_spoken_urls(&with_emails);
    format_spoken_paths(&with_urls)
}

/// Normalizes email addresses: "alice at example dot com" -> "alice@example.com"
fn format_spoken_emails(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.len() < 4 {
        return text.to_string();
    }

    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        // Look for "... at <domain> dot <tld>"
        if words[i].eq_ignore_ascii_case("at") && i > 0 && i + 2 < words.len() {
            let prev_word = words[i - 1].trim_end_matches([',', '.', '!', '?', ';', ':']);
            let domain_part = words[i + 1].trim_end_matches([',', '.', '!', '?', ';', ':']);
            let dot_word = words[i + 2].trim_end_matches([',', '.', '!', '?', ';', ':']);

            if dot_word.eq_ignore_ascii_case("dot") && i + 3 < words.len() {
                let tld_word = words[i + 3];
                let punct = tld_word
                    .chars()
                    .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                    .collect::<String>();
                let clean_tld = tld_word
                    .trim_end_matches([',', '.', '!', '?', ';', ':'])
                    .to_lowercase();

                if COMMON_TLDS.contains(&clean_tld.as_str())
                    && is_valid_ident(prev_word)
                    && is_valid_ident(domain_part)
                {
                    // Pop previous word from result
                    result.pop();
                    result.push(format!("{prev_word}@{domain_part}.{clean_tld}{punct}"));
                    i += 4;
                    continue;
                }
            }
        }

        result.push(words[i].to_string());
        i += 1;
    }

    result.join(" ")
}

fn is_valid_ident(word: &str) -> bool {
    !word.is_empty()
        && word
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.')
}

/// Normalizes spoken URLs like "https colon slash slash github dot com slash rust"
fn format_spoken_urls(text: &str) -> String {
    let mut out = text.to_string();

    // Protocols
    // Protocols
    out =
        super::dictionary::replace_whole_words(&out, "https colon slash slash", "https://", false, false);
    out = super::dictionary::replace_whole_words(&out, "http colon slash slash", "http://", false, false);
    out = super::dictionary::replace_whole_words(&out, "colon slash slash", "://", false, false);
    out = super::dictionary::replace_whole_words(&out, "https : / /", "https://", false, false);
    out = super::dictionary::replace_whole_words(&out, "http : / /", "http://", false, false);

    // "www dot"
    out = super::dictionary::replace_whole_words(&out, "www dot", "www.", false, false);
    out = super::dictionary::replace_whole_words(&out, "www . ", "www.", false, false);

    // Collapse trailing space after protocols and www.
    out = out.replace("https:// ", "https://");
    out = out.replace("http:// ", "http://");
    out = out.replace(":// ", "://");
    out = out.replace("www. ", "www.");

    // TLDs: collapse preceding space for "dot com" and ".com". The needle /
    // replacement pairs are precomputed once — building two Strings per TLD
    // per call (56 allocations) bought nothing on a static table.
    static TLD_REPLACEMENTS: LazyLock<&'static [(String, String)]> = LazyLock::new(|| {
        let pairs: Vec<(String, String)> = COMMON_TLDS
            .iter()
            .map(|tld| (format!(" dot {tld}"), format!(".{tld}")))
            .collect();
        Box::leak(pairs.into())
    });
    for (spaced, replaced) in TLD_REPLACEMENTS.iter() {
        out = out.replace(spaced, replaced);
        let spaced_dot = format!(" {replaced}");
        out = out.replace(&spaced_dot, replaced);
    }

    // Connect slashes following URL protocols or domains: "https://github.com slash HushWrite" -> "https://github.com/HushWrite"
    let mut words: Vec<String> = out.split_whitespace().map(|s| s.to_string()).collect();
    let mut i = 0;
    while i < words.len() {
        let is_url_token = words[i].starts_with("http://")
            || words[i].starts_with("https://")
            || words[i].starts_with("www.")
            || COMMON_TLDS
                .iter()
                .any(|&tld| words[i].contains(&format!(".{tld}")));

        if is_url_token && i + 1 < words.len() {
            let j = i + 1;
            while j < words.len() {
                if words[j].eq_ignore_ascii_case("slash") || words[j] == "/" {
                    if j + 1 < words.len() {
                        let next_segment =
                            words[j + 1].trim_end_matches([',', '.', '!', '?', ';', ':']);
                        let punct = words[j + 1]
                            .chars()
                            .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                            .collect::<String>();
                        words[i] =
                            format!("{}/{next_segment}{punct}", words[i].trim_end_matches('/'));
                        words.remove(j);
                        words.remove(j);
                        if !punct.is_empty() {
                            break;
                        }
                    } else {
                        words[i] = format!("{}/", words[i].trim_end_matches('/'));
                        words.remove(j);
                        break;
                    }
                } else if words[j].eq_ignore_ascii_case("question mark") || words[j] == "?" {
                    words[i].push('?');
                    words.remove(j);
                } else if words[j].eq_ignore_ascii_case("ampersand") || words[j] == "&" {
                    words[i].push('&');
                    words.remove(j);
                } else if words[j].eq_ignore_ascii_case("equals") || words[j] == "=" {
                    words[i].push('=');
                    words.remove(j);
                } else {
                    break;
                }
            }
        }
        i += 1;
    }

    words.join(" ")
}

/// Normalizes spoken file paths like "slash usr slash local slash bin" or "tilde slash projects"
fn format_spoken_paths(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let w_lower = words[i].to_lowercase();
        let clean = w_lower.trim_end_matches([',', '.', '!', '?', ';', ':']);

        let starts_path = clean == "slash"
            || clean == "tilde"
            || clean == "dot"
            || (clean.len() == 1
                && (clean == "c" || clean == "d")
                && i + 2 < words.len()
                && words[i + 1].eq_ignore_ascii_case("colon")
                && words[i + 2].eq_ignore_ascii_case("backslash"));

        if starts_path && i + 1 < words.len() {
            let mut path_tokens = Vec::new();
            let mut j = i;
            let mut trailing_punct = String::new();

            while j < words.len() {
                let token = words[j];
                let token_clean = token.trim_end_matches([',', '.', '!', '?', ';', ':']);
                let token_punct = token
                    .chars()
                    .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                    .collect::<String>();

                if token_clean.eq_ignore_ascii_case("slash") || token_clean == "/" {
                    path_tokens.push("/".to_string());
                } else if token_clean.eq_ignore_ascii_case("backslash") || token_clean == "\\" {
                    path_tokens.push("\\".to_string());
                } else if token_clean.eq_ignore_ascii_case("colon") || token_clean == ":" {
                    path_tokens.push(":".to_string());
                } else if token_clean.eq_ignore_ascii_case("tilde") || token_clean == "~" {
                    path_tokens.push("~".to_string());
                } else if token_clean.eq_ignore_ascii_case("dot") {
                    path_tokens.push(".".to_string());
                } else if is_valid_ident(token_clean) {
                    path_tokens.push(token_clean.to_string());
                } else {
                    break;
                }

                if !token_punct.is_empty() {
                    trailing_punct = token_punct;
                    j += 1;
                    break;
                }

                j += 1;
            }

            // A valid path has at least one separator ("/" or "\" or "~") and segments
            let has_separator = path_tokens
                .iter()
                .any(|t| t == "/" || t == "\\" || t == "~");
            let has_ident = path_tokens
                .iter()
                .any(|t| is_valid_ident(t) && t != "/" && t != "\\" && t != "~" && t != ".");

            if has_separator && has_ident && path_tokens.len() >= 3 {
                let mut assembled = String::new();
                for (idx, tok) in path_tokens.iter().enumerate() {
                    if tok == "/" || tok == "\\" || tok == ":" {
                        assembled.push_str(tok);
                    } else if tok == "." {
                        if idx > 0
                            && !assembled.ends_with('/')
                            && !assembled.ends_with('\\')
                            && !assembled.ends_with('.')
                        {
                            assembled.push('.');
                        } else {
                            assembled.push_str(tok);
                        }
                    } else {
                        assembled.push_str(tok);
                    }
                }
                result.push(format!("{assembled}{trailing_punct}"));
                i = j;
                continue;
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
    fn normalizes_spoken_urls() {
        assert_eq!(
            normalize_urls_and_paths("visit https colon slash slash github dot com today"),
            "visit https://github.com today"
        );
        assert_eq!(
            normalize_urls_and_paths("check www dot google dot com"),
            "check www.google.com"
        );
        assert_eq!(
            normalize_urls_and_paths("open https colon slash slash github dot com slash HushWrite"),
            "open https://github.com/HushWrite"
        );
    }

    #[test]
    fn normalizes_spoken_emails() {
        assert_eq!(
            normalize_urls_and_paths("email me at alice at example dot com"),
            "email me at alice@example.com"
        );
        assert_eq!(
            normalize_urls_and_paths("contact support at github dot com."),
            "contact support@github.com."
        );
    }

    #[test]
    fn normalizes_spoken_filesystem_paths() {
        assert_eq!(
            normalize_urls_and_paths("binary lives in slash usr slash local slash bin"),
            "binary lives in /usr/local/bin"
        );
        assert_eq!(
            normalize_urls_and_paths("config is in tilde slash projects slash app"),
            "config is in ~/projects/app"
        );
    }
}
