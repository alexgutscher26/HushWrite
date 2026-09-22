/*!
 * SOURCE OF TRUTH KEYWORDS: expand_spoken_commands, format_code_casing,
 *   format_file_tagging, format_markdown_mode, normalize_named_entities,
 *   ENGLISH_SPOKEN_COMMANDS, COMMON_NAMED_ENTITIES
 * WHAT:  Spoken commands, developer casing, AI IDE @file tagging, Markdown macros,
 *        and named entity normalization.
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

use std::sync::LazyLock;

use super::dictionary::replace_whole_words;
use crate::types::LanguageCode;

pub const ENGLISH_SPOKEN_COMMANDS: &[(&str, &str)] = &[
    ("new paragraph", "\n\n"),
    ("new line", "\n"),
    ("next line", "\n"),
    ("bullet point", "\n• "),
    ("next bullet", "\n• "),
    ("full stop", "."),
    ("question mark", "?"),
    ("exclamation mark", "!"),
    ("open quote", "\""),
    ("close quote", "\""),
    ("open bracket", "["),
    ("close bracket", "]"),
    ("open brace", "{"),
    ("close brace", "}"),
    ("open paren", "("),
    ("close paren", ")"),
    ("open parenthesis", "("),
    ("close parenthesis", ")"),
    ("semicolon", ";"),
    ("colon", ":"),
    ("comma", ","),
    ("dash", " — "),
    ("hyphen", "-"),
    ("mention user", "@"),
    ("tag user", "@"),
    ("at user", "@"),
    ("hashtag", "#"),
    ("hash tag", "#"),
    ("tweet break", "\n\n🧵 "),
    ("thread break", "\n\n🧵 "),
    ("next tweet", "\n\n🧵 "),
];

fn is_english(language: Option<&LanguageCode>) -> bool {
    language
        .map(|l| l.as_str().starts_with("en"))
        .unwrap_or(false)
}

pub fn expand_spoken_commands(text: &str, language: Option<&LanguageCode>) -> String {
    if !is_english(language) {
        return text.to_string();
    }

    // Longest first so "open parenthesis" wins over "paren". Sorted once per
    // process — see fillers_sorted_for_language for the same trick.
    static SORTED: LazyLock<&'static [(&'static str, &'static str)]> = LazyLock::new(|| {
        let mut sorted: Vec<(&str, &str)> = ENGLISH_SPOKEN_COMMANDS.to_vec();
        sorted.sort_by_key(|(phrase, _)| std::cmp::Reverse(phrase.len()));
        Box::leak(sorted.into())
    });

    let mut out = text.to_string();
    for (phrase, replacement) in SORTED.iter() {
        out = replace_whole_words(&out, phrase, replacement, false, false);
    }
    out
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CaseStyle {
    Camel,
    Pascal,
    Snake,
    ScreamingSnake,
    Kebab,
    Backticks,
}

impl CaseStyle {
    pub fn parse_style(s: &str) -> Self {
        match s.to_lowercase().trim() {
            "pascal" | "pascalcase" | "pascal_case" => CaseStyle::Pascal,
            "snake" | "snakecase" | "snake_case" => CaseStyle::Snake,
            "screaming_snake" | "screamingsnake" | "constant" => CaseStyle::ScreamingSnake,
            "kebab" | "kebabcase" | "kebab_case" => CaseStyle::Kebab,
            "backticks" | "code" => CaseStyle::Backticks,
            _ => CaseStyle::Camel,
        }
    }
}

pub const CASE_DIRECTIVES: &[(&str, CaseStyle)] = &[
    ("screaming snake case", CaseStyle::ScreamingSnake),
    ("constant case", CaseStyle::ScreamingSnake),
    ("camel case", CaseStyle::Camel),
    ("pascal case", CaseStyle::Pascal),
    ("snake case", CaseStyle::Snake),
    ("kebab case", CaseStyle::Kebab),
    ("dash case", CaseStyle::Kebab),
    ("in backticks", CaseStyle::Backticks),
    ("inline code", CaseStyle::Backticks),
    ("backticks", CaseStyle::Backticks),
];

pub const CODE_CASE_DELIMITERS: &[&str] = &[
    "for", "in", "here", "class", "with", "at", "to", "from", "then", "into", "on", "as",
];

pub fn format_code_casing(text: &str) -> String {
    let mut out = text.to_string();
    for (directive, style) in CASE_DIRECTIVES {
        out = apply_case_style(&out, directive, *style);
    }
    out
}

fn apply_case_style(text: &str, directive: &str, style: CaseStyle) -> String {
    let lower = text.to_lowercase();
    let mut result = String::with_capacity(text.len());
    let mut cursor = 0usize;

    while let Some(pos) = lower[cursor..].find(directive) {
        let match_start = cursor + pos;
        let match_end = match_start + directive.len();

        let before_ok = match_start == 0
            || !text[..match_start]
                .chars()
                .last()
                .map(|c| c.is_alphanumeric())
                .unwrap_or(false);
        if !before_ok {
            result.push_str(&text[cursor..match_end]);
            cursor = match_end;
            continue;
        }

        let after_chars = text[match_end..].chars();
        let after_whitespace = match_end == text.len()
            || after_chars
                .clone()
                .next()
                .map(|c| c.is_whitespace())
                .unwrap_or(false);
        if !after_whitespace {
            result.push_str(&text[cursor..match_end]);
            cursor = match_end;
            continue;
        }

        result.push_str(&text[cursor..match_start]);

        let remainder = &text[match_end..];
        let mut words = Vec::new();
        let mut consumed_bytes = 0usize;
        let mut trailing_punct = String::new();

        for (word_idx, word) in remainder.split_whitespace().enumerate() {
            if word_idx >= 6 {
                break;
            }
            let has_punct = word.ends_with(|c: char| {
                matches!(
                    c,
                    ',' | '.' | '!' | '?' | ';' | ':' | '\n' | '\r' | '\u{2014}'
                )
            });
            let clean_word = word.trim_end_matches(|c: char| {
                matches!(
                    c,
                    ',' | '.' | '!' | '?' | ';' | ':' | '\n' | '\r' | '\u{2014}'
                )
            });

            let clean_lower = clean_word.to_lowercase();
            if word_idx > 0 && CODE_CASE_DELIMITERS.contains(&clean_lower.as_str()) {
                break;
            }

            if !clean_word.is_empty() {
                words.push(clean_word);
            }

            if has_punct {
                trailing_punct = word
                    .chars()
                    .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':' | '\u{2014}'))
                    .collect();
            }

            let word_pos = remainder[consumed_bytes..].find(word).unwrap_or(0);
            consumed_bytes += word_pos + word.len();

            if has_punct {
                break;
            }
        }

        if words.is_empty() {
            result.push_str(&text[match_start..match_end]);
            cursor = match_end;
        } else {
            let transformed = transform_words(&words, style);
            result.push_str(&transformed);
            result.push_str(&trailing_punct);
            cursor = match_end + consumed_bytes;
        }
    }

    result.push_str(&text[cursor..]);
    result
}

fn transform_words(words: &[&str], style: CaseStyle) -> String {
    match style {
        CaseStyle::Camel => {
            let mut res = String::new();
            for (i, w) in words.iter().enumerate() {
                let clean: String = w
                    .chars()
                    .filter(|c| c.is_alphanumeric() || *c == '_')
                    .collect();
                if clean.is_empty() {
                    continue;
                }
                if i == 0 {
                    res.push_str(&clean.to_lowercase());
                } else {
                    let mut chars = clean.chars();
                    if let Some(first) = chars.next() {
                        res.extend(first.to_uppercase());
                        res.push_str(&chars.as_str().to_lowercase());
                    }
                }
            }
            res
        }
        CaseStyle::Pascal => {
            let mut res = String::new();
            for w in words {
                let clean: String = w
                    .chars()
                    .filter(|c| c.is_alphanumeric() || *c == '_')
                    .collect();
                if clean.is_empty() {
                    continue;
                }
                let mut chars = clean.chars();
                if let Some(first) = chars.next() {
                    res.extend(first.to_uppercase());
                    res.push_str(&chars.as_str().to_lowercase());
                }
            }
            res
        }
        CaseStyle::Snake => {
            let parts: Vec<String> = words
                .iter()
                .map(|w| {
                    w.chars()
                        .filter(|c| c.is_alphanumeric() || *c == '_')
                        .collect::<String>()
                        .to_lowercase()
                })
                .filter(|s| !s.is_empty())
                .collect();
            parts.join("_")
        }
        CaseStyle::ScreamingSnake => {
            let parts: Vec<String> = words
                .iter()
                .map(|w| {
                    w.chars()
                        .filter(|c| c.is_alphanumeric() || *c == '_')
                        .collect::<String>()
                        .to_uppercase()
                })
                .filter(|s| !s.is_empty())
                .collect();
            parts.join("_")
        }
        CaseStyle::Kebab => {
            let parts: Vec<String> = words
                .iter()
                .map(|w| {
                    w.chars()
                        .filter(|c| c.is_alphanumeric() || *c == '-')
                        .collect::<String>()
                        .to_lowercase()
                })
                .filter(|s| !s.is_empty())
                .collect();
            parts.join("-")
        }
        CaseStyle::Backticks => {
            let inner = words.join(" ");
            format!("`{inner}`")
        }
    }
}

pub const CODE_BOUNDARY_WORDS: &[&str] = &[
    "a",
    "an",
    "the",
    "in",
    "on",
    "at",
    "for",
    "to",
    "from",
    "with",
    "into",
    "as",
    "is",
    "of",
    "and",
    "or",
    "then",
    "let",
    "const",
    "var",
    "fn",
    "def",
    "function",
    "class",
    "interface",
    "type",
    "import",
    "export",
    "return",
    "if",
    "else",
    "while",
    "be",
    "define",
    "declare",
    "create",
    "make",
    "set",
    "use",
    "add",
    "get",
    "call",
    "run",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "their",
    "our",
    "its",
    "this",
    "that",
    "these",
    "those",
    "want",
    "wanted",
    "wants",
    "fix",
    "fixed",
    "fixes",
    "exist",
    "exists",
    "existed",
    "does",
    "doesnt",
    "doesn't",
    "did",
    "didnt",
    "didn't",
    "do",
    "dont",
    "don't",
    "have",
    "has",
    "had",
    "can",
    "cant",
    "can't",
    "could",
    "would",
    "should",
    "will",
    "wont",
    "won't",
    "shall",
    "may",
    "might",
    "must",
    "am",
    "are",
    "was",
    "were",
    "been",
    "being",
    "not",
    "no",
    "yes",
    "but",
    "so",
    "because",
    "since",
    "just",
    "very",
    "too",
    "also",
    "what",
    "which",
    "who",
    "whom",
    "whose",
    "why",
    "how",
    "when",
    "where",
    "like",
    "know",
    "think",
    "see",
    "look",
    "come",
    "go",
    "take",
    "give",
    "find",
    "tell",
    "ask",
    "seem",
    "feel",
    "try",
    "leave",
    "good",
    "new",
    "first",
    "last",
];

pub fn apply_code_mode_casing(text: &str, style: CaseStyle) -> String {
    let lines: Vec<&str> = text.split('\n').collect();
    let mut processed_lines = Vec::with_capacity(lines.len());

    for line in lines {
        if line.starts_with('#') || line.starts_with("```") || line.starts_with("- [") {
            processed_lines.push(line.to_string());
            continue;
        }

        let words: Vec<&str> = line.split_whitespace().collect();
        if words.is_empty() {
            processed_lines.push(line.to_string());
            continue;
        }

        let mut out_tokens: Vec<String> = Vec::new();
        let mut cluster: Vec<&str> = Vec::new();
        let mut trailing_punct = String::new();

        let flush_cluster =
            |tokens: &mut Vec<String>, cluster: &mut Vec<&str>, punct: &mut String| {
                if cluster.is_empty() {
                    return;
                }
                if cluster.len() >= 2 {
                    let transformed = transform_words(cluster, style);
                    tokens.push(format!("{transformed}{punct}"));
                } else {
                    tokens.push(format!("{}{punct}", cluster[0]));
                }
                cluster.clear();
                punct.clear();
            };

        for w in words {
            let punct: String = w
                .chars()
                .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':'))
                .collect();
            let clean = w.trim_end_matches([',', '.', '!', '?', ';', ':']);
            let lower = clean.to_lowercase();

            let is_boundary = CODE_BOUNDARY_WORDS.contains(&lower.as_str())
                || clean.starts_with('`')
                || clean.starts_with('@')
                || clean.starts_with("http://")
                || clean.starts_with("https://")
                || clean.contains('/')
                || clean.contains('\\');

            if is_boundary {
                flush_cluster(&mut out_tokens, &mut cluster, &mut trailing_punct);
                out_tokens.push(w.to_string());
            } else {
                cluster.push(clean);
                if !punct.is_empty() {
                    trailing_punct = punct;
                    flush_cluster(&mut out_tokens, &mut cluster, &mut trailing_punct);
                }
            }
        }

        flush_cluster(&mut out_tokens, &mut cluster, &mut trailing_punct);
        processed_lines.push(out_tokens.join(" "));
    }

    processed_lines.join("\n")
}

pub fn format_file_tagging(text: &str) -> String {
    let mut out = text.to_string();
    let directives = &[
        "tag file",
        "tag folder",
        "tag directory",
        "at file",
        "at folder",
        "at directory",
        "context file",
        "mention file",
    ];

    for directive in directives {
        out = apply_file_tag_directive(&out, directive);
    }
    out
}

pub const KNOWN_FILE_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "json", "md", "toml", "yaml", "yml", "css", "scss",
    "html", "sql", "env", "c", "cpp", "h", "hpp", "swift", "kt", "dart", "sh", "lock", "prisma",
];

fn apply_file_tag_directive(text: &str, directive: &str) -> String {
    let lower = text.to_lowercase();
    let mut result = String::with_capacity(text.len());
    let mut cursor = 0usize;

    while let Some(pos) = lower[cursor..].find(directive) {
        let match_start = cursor + pos;
        let match_end = match_start + directive.len();

        let before_ok = match_start == 0
            || !text[..match_start]
                .chars()
                .last()
                .map(|c| c.is_alphanumeric())
                .unwrap_or(false);
        if !before_ok {
            result.push_str(&text[cursor..match_end]);
            cursor = match_end;
            continue;
        }

        let after_chars = text[match_end..].chars();
        let after_whitespace = match_end == text.len()
            || after_chars
                .clone()
                .next()
                .map(|c| c.is_whitespace())
                .unwrap_or(false);
        if !after_whitespace {
            result.push_str(&text[cursor..match_end]);
            cursor = match_end;
            continue;
        }

        result.push_str(&text[cursor..match_start]);

        let remainder = &text[match_end..];
        let mut raw_words = Vec::new();
        let mut consumed_bytes = 0usize;
        let mut trailing_punct = String::new();
        let mut prev_was_dot = false;

        for (word_idx, word) in remainder.split_whitespace().enumerate() {
            if word_idx >= 12 {
                break;
            }
            let has_punct = word.ends_with(|c: char| {
                matches!(
                    c,
                    ',' | '.' | '!' | '?' | ';' | ':' | '\n' | '\r' | '\u{2014}'
                )
            });
            let clean_word = word.trim_end_matches(|c: char| {
                matches!(
                    c,
                    ',' | '.' | '!' | '?' | ';' | ':' | '\n' | '\r' | '\u{2014}'
                )
            });

            let is_ext =
                prev_was_dot && KNOWN_FILE_EXTENSIONS.contains(&clean_word.to_lowercase().as_str());

            if !clean_word.is_empty() {
                raw_words.push(clean_word);
            }

            if has_punct {
                trailing_punct = word
                    .chars()
                    .filter(|c| matches!(*c, ',' | '.' | '!' | '?' | ';' | ':' | '\u{2014}'))
                    .collect();
            }

            let word_pos = remainder[consumed_bytes..].find(word).unwrap_or(0);
            consumed_bytes += word_pos + word.len();

            if is_ext || has_punct {
                break;
            }

            prev_was_dot = clean_word.eq_ignore_ascii_case("dot");
        }

        if raw_words.is_empty() {
            result.push_str(&text[match_start..match_end]);
            cursor = match_end;
        } else {
            let tagged_path = build_tagged_path(&raw_words);
            result.push_str(&tagged_path);
            result.push_str(&trailing_punct);
            cursor = match_end + consumed_bytes;
        }
    }

    result.push_str(&text[cursor..]);
    result
}

fn build_tagged_path(words: &[&str]) -> String {
    let mut normalized_tokens: Vec<String> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let current_lower = words[i].to_lowercase();
        if (current_lower == "slash" || current_lower == "forward" || current_lower == "backslash")
            && i + 1 < words.len()
            && words[i + 1].to_lowercase() == "slash"
        {
            normalized_tokens.push("/".into());
            i += 2;
            continue;
        }

        if current_lower == "slash" || current_lower == "/" || current_lower == "\\" {
            normalized_tokens.push("/".into());
            i += 1;
            continue;
        }

        if current_lower == "dot" && i + 1 < words.len() {
            let next_ext = words[i + 1].to_lowercase();
            let ext = match next_ext.as_str() {
                "ts" | "tsx" | "js" | "jsx" | "py" | "rs" | "go" | "json" | "md" | "toml"
                | "yaml" | "yml" | "css" | "scss" | "html" | "sql" | "env" | "c" | "cpp" | "h"
                | "hpp" | "swift" | "kt" | "dart" | "sh" | "lock" | "prisma" => {
                    format!(".{next_ext}")
                }
                _ => format!(".{}", words[i + 1]),
            };
            normalized_tokens.push(ext);
            i += 2;
            continue;
        }

        normalized_tokens.push(words[i].to_string());
        i += 1;
    }

    let mut path = String::new();
    for token in normalized_tokens {
        if token == "/" {
            if !path.ends_with('/') && !path.is_empty() {
                path.push('/');
            }
        } else if token.starts_with('.') {
            path.push_str(&token);
        } else {
            if !path.is_empty() && !path.ends_with('/') {
                path.push('/');
            }
            path.push_str(&token);
        }
    }

    format!("@{path}")
}

pub fn format_markdown_mode(text: &str) -> String {
    let mut out = text.to_string();
    out = replace_whole_words(&out, "heading level 1", "\n# ", false, false);
    out = replace_whole_words(&out, "heading level 2", "\n## ", false, false);
    out = replace_whole_words(&out, "heading level 3", "\n### ", false, false);
    out = replace_whole_words(&out, "header 1", "\n# ", false, false);
    out = replace_whole_words(&out, "header 2", "\n## ", false, false);
    out = replace_whole_words(&out, "header 3", "\n### ", false, false);
    out = replace_whole_words(&out, "bullet point", "\n- ", false, false);
    out = replace_whole_words(&out, "dash point", "\n- ", false, false);
    out = replace_whole_words(&out, "todo item", "\n- [ ] ", false, false);
    out = replace_whole_words(&out, "checklist item", "\n- [ ] ", false, false);
    out = replace_whole_words(&out, "insert bug template", "\n### 🐛 Bug Report\n**Description:**\n\n**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n- OS:\n- Version:\n", false, false);
    out = replace_whole_words(&out, "bug report template", "\n### 🐛 Bug Report\n**Description:**\n\n**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n- OS:\n- Version:\n", false, false);
    out = replace_whole_words(&out, "bug template", "\n### 🐛 Bug Report\n**Description:**\n\n**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n- OS:\n- Version:\n", false, false);

    out = replace_whole_words(
        &out,
        "insert status update",
        "\n### 📋 Status Update\n**Yesterday:**\n- \n\n**Today:**\n- \n\n**Blockers:**\n- None\n",
        false, false);
    out = replace_whole_words(
        &out,
        "standup update",
        "\n### 📋 Status Update\n**Yesterday:**\n- \n\n**Today:**\n- \n\n**Blockers:**\n- None\n",
        false, false);
    out = replace_whole_words(
        &out,
        "daily standup",
        "\n### 📋 Status Update\n**Yesterday:**\n- \n\n**Today:**\n- \n\n**Blockers:**\n- None\n",
        false, false);
    out = replace_whole_words(
        &out,
        "status update",
        "\n### 📋 Status Update\n**Yesterday:**\n- \n\n**Today:**\n- \n\n**Blockers:**\n- None\n",
        false, false);

    out = replace_whole_words(&out, "insert pull request template", "\n### 🚀 Pull Request\n**Summary:**\n\n**Key Changes:**\n- \n\n**Testing Checklist:**\n- [ ] Automated tests pass\n- [ ] Manual verification completed\n", false, false);
    out = replace_whole_words(&out, "pull request template", "\n### 🚀 Pull Request\n**Summary:**\n\n**Key Changes:**\n- \n\n**Testing Checklist:**\n- [ ] Automated tests pass\n- [ ] Manual verification completed\n", false, false);
    out = replace_whole_words(&out, "insert pr template", "\n### 🚀 Pull Request\n**Summary:**\n\n**Key Changes:**\n- \n\n**Testing Checklist:**\n- [ ] Automated tests pass\n- [ ] Manual verification completed\n", false, false);
    out = replace_whole_words(&out, "pr template", "\n### 🚀 Pull Request\n**Summary:**\n\n**Key Changes:**\n- \n\n**Testing Checklist:**\n- [ ] Automated tests pass\n- [ ] Manual verification completed\n", false, false);

    out = replace_whole_words(&out, "pr checklists", "\n### ✅ PR Checklist\n- [ ] Code follows style conventions\n- [ ] Unit & integration tests pass\n- [ ] Documentation updated\n- [ ] No sensitive credentials or debug logs\n", false, false);
    out = replace_whole_words(&out, "pr checklist", "\n### ✅ PR Checklist\n- [ ] Code follows style conventions\n- [ ] Unit & integration tests pass\n- [ ] Documentation updated\n- [ ] No sensitive credentials or debug logs\n", false, false);
    out = replace_whole_words(&out, "pull request checklists", "\n### ✅ PR Checklist\n- [ ] Code follows style conventions\n- [ ] Unit & integration tests pass\n- [ ] Documentation updated\n- [ ] No sensitive credentials or debug logs\n", false, false);
    out = replace_whole_words(&out, "pull request checklist", "\n### ✅ PR Checklist\n- [ ] Code follows style conventions\n- [ ] Unit & integration tests pass\n- [ ] Documentation updated\n- [ ] No sensitive credentials or debug logs\n", false, false);

    out = replace_whole_words(&out, "environment setup", "\n### 🛠️ Environment Setup\n1. Clone repository\n2. Copy `.env.example` to `.env`\n3. Run `bun install` / `pnpm install`\n4. Start dev server: `bun run dev`\n", false, false);
    out = replace_whole_words(&out, "env setup", "\n### 🛠️ Environment Setup\n1. Clone repository\n2. Copy `.env.example` to `.env`\n3. Run `bun install` / `pnpm install`\n4. Start dev server: `bun run dev`\n", false, false);

    out = replace_whole_words(&out, "internal api docs", "\n### 🔌 API Specification\n**Endpoint:** `METHOD /api/v1/resource`\n**Headers:** `Authorization: Bearer <token>`\n**Request Body:**\n```json\n{\n  \n}\n```\n**Response (200 OK):**\n```json\n{\n  \n}\n```\n", false, false);
    out = replace_whole_words(&out, "api documentation template", "\n### 🔌 API Specification\n**Endpoint:** `METHOD /api/v1/resource`\n**Headers:** `Authorization: Bearer <token>`\n**Request Body:**\n```json\n{\n  \n}\n```\n**Response (200 OK):**\n```json\n{\n  \n}\n```\n", false, false);

    out = replace_whole_words(&out, "naming conventions", "\n### 🏷️ Codebase Naming Conventions\n- **Variables & Functions:** `camelCase`\n- **Classes, Types & Interfaces:** `PascalCase`\n- **Constants & Enums:** `SCREAMING_SNAKE_CASE`\n- **Files & Components:** `kebab-case` or `PascalCase.tsx`\n- **Database Columns:** `snake_case`\n", false, false);
    out = replace_whole_words(&out, "naming convention", "\n### 🏷️ Codebase Naming Conventions\n- **Variables & Functions:** `camelCase`\n- **Classes, Types & Interfaces:** `PascalCase`\n- **Constants & Enums:** `SCREAMING_SNAKE_CASE`\n- **Files & Components:** `kebab-case` or `PascalCase.tsx`\n- **Database Columns:** `snake_case`\n", false, false);

    out = replace_whole_words(&out, "onboarding instructions", "\n### 🚀 Developer Onboarding Checklist\n- [ ] Request repository access & permissions\n- [ ] Configure local dev environment & secrets\n- [ ] Review architecture guidelines & standards\n- [ ] Submit first starter PR\n", false, false);
    out = replace_whole_words(&out, "developer onboarding", "\n### 🚀 Developer Onboarding Checklist\n- [ ] Request repository access & permissions\n- [ ] Configure local dev environment & secrets\n- [ ] Review architecture guidelines & standards\n- [ ] Submit first starter PR\n", false, false);

    out = replace_whole_words(
        &out,
        "calendar link",
        "\nYou can book a quick technical discussion with me here: calendly.com\n",
        false, false);
    out = replace_whole_words(
        &out,
        "book a call",
        "\nYou can book a quick technical discussion with me here: calendly.com\n",
        false, false);

    out = replace_whole_words(&out, "youtube script template", "\n### 🎬 YouTube Video Script\n**Title Idea:** \n**Hook (0:00 - 0:30):**\n\n**Intro & Value Proposition:**\n\n**Main Points:**\n1. \n2. \n3. \n\n**Sponsor / Mid-roll CTA:**\n\n**Conclusion & Next Video CTA:**\n", false, false);
    out = replace_whole_words(&out, "video script template", "\n### 🎬 YouTube Video Script\n**Title Idea:** \n**Hook (0:00 - 0:30):**\n\n**Intro & Value Proposition:**\n\n**Main Points:**\n1. \n2. \n3. \n\n**Sponsor / Mid-roll CTA:**\n\n**Conclusion & Next Video CTA:**\n", false, false);
    out = replace_whole_words(&out, "youtube script", "\n### 🎬 YouTube Video Script\n**Title Idea:** \n**Hook (0:00 - 0:30):**\n\n**Intro & Value Proposition:**\n\n**Main Points:**\n1. \n2. \n3. \n\n**Sponsor / Mid-roll CTA:**\n\n**Conclusion & Next Video CTA:**\n", false, false);

    out = replace_whole_words(&out, "content hook template", "\n### 🪝 Content Hook Framework\n**1. Curiosity Gap / Pattern Interrupt:**\n\n**2. Stakes & Problem Statement:**\n\n**3. Promise & Payoff:**\n", false, false);
    out = replace_whole_words(&out, "video hook template", "\n### 🪝 Content Hook Framework\n**1. Curiosity Gap / Pattern Interrupt:**\n\n**2. Stakes & Problem Statement:**\n\n**3. Promise & Payoff:**\n", false, false);
    out = replace_whole_words(&out, "viral hook template", "\n### 🪝 Content Hook Framework\n**1. Curiosity Gap / Pattern Interrupt:**\n\n**2. Stakes & Problem Statement:**\n\n**3. Promise & Payoff:**\n", false, false);

    out = replace_whole_words(&out, "newsletter template", "\n### 💌 Newsletter Draft\n**Subject Line Options:**\n1. \n2. \n\n**Preview Text:**\n\n**Core Essay:**\n\n**Key Takeaways:**\n- \n\n**Recommended Links:**\n- \n", false, false);
    out = replace_whole_words(&out, "substack template", "\n### 💌 Newsletter Draft\n**Subject Line Options:**\n1. \n2. \n\n**Preview Text:**\n\n**Core Essay:**\n\n**Key Takeaways:**\n- \n\n**Recommended Links:**\n- \n", false, false);
    out = replace_whole_words(&out, "substack draft", "\n### 💌 Newsletter Draft\n**Subject Line Options:**\n1. \n2. \n\n**Preview Text:**\n\n**Core Essay:**\n\n**Key Takeaways:**\n- \n\n**Recommended Links:**\n- \n", false, false);

    out = replace_whole_words(&out, "social caption template", "\n### 📱 Social Caption\n**Hook Line:**\n\n**Body / Story:**\n\n**Call to Action:**\n👉 \n\n**Hashtags:**\n# \n", false, false);
    out = replace_whole_words(&out, "instagram caption template", "\n### 📱 Social Caption\n**Hook Line:**\n\n**Body / Story:**\n\n**Call to Action:**\n👉 \n\n**Hashtags:**\n# \n", false, false);
    out = replace_whole_words(&out, "tiktok caption template", "\n### 📱 Social Caption\n**Hook Line:**\n\n**Body / Story:**\n\n**Call to Action:**\n👉 \n\n**Hashtags:**\n# \n", false, false);

    out = replace_whole_words(&out, "linkedin post template", "\n### 💼 LinkedIn Post\n**Hook:**\n\n**The Problem / Insight:**\n\n**Key Lessons / Framework:**\n• \n• \n• \n\n**Takeaway & Question:**\n👉 \n\n**Hashtags:**\n#Tech #Productivity #Engineering\n", false, false);
    out = replace_whole_words(&out, "linkedin post", "\n### 💼 LinkedIn Post\n**Hook:**\n\n**The Problem / Insight:**\n\n**Key Lessons / Framework:**\n• \n• \n• \n\n**Takeaway & Question:**\n👉 \n\n**Hashtags:**\n#Tech #Productivity #Engineering\n", false, false);
    out = replace_whole_words(&out, "linkedin update", "\n### 💼 LinkedIn Post\n**Hook:**\n\n**The Problem / Insight:**\n\n**Key Lessons / Framework:**\n• \n• \n• \n\n**Takeaway & Question:**\n👉 \n\n**Hashtags:**\n#Tech #Productivity #Engineering\n", false, false);
    out = replace_whole_words(&out, "linkedin thought leadership", "\n### 💼 LinkedIn Post\n**Hook:**\n\n**The Problem / Insight:**\n\n**Key Lessons / Framework:**\n• \n• \n• \n\n**Takeaway & Question:**\n👉 \n\n**Hashtags:**\n#Tech #Productivity #Engineering\n", false, false);

    out = replace_whole_words(&out, "linkedin carousel template", "\n### 📑 LinkedIn Carousel Outline\n**Slide 1 (Cover Hook):**\n\n**Slide 2 (The Hidden Mistake):**\n\n**Slide 3 (The Shift):**\n\n**Slide 4 (Step-by-Step System):**\n• Step 1:\n• Step 2:\n• Step 3:\n\n**Slide 5 (Summary & Repost CTA):**\n", false, false);
    out = replace_whole_words(&out, "linkedin carousel", "\n### 📑 LinkedIn Carousel Outline\n**Slide 1 (Cover Hook):**\n\n**Slide 2 (The Hidden Mistake):**\n\n**Slide 3 (The Shift):**\n\n**Slide 4 (Step-by-Step System):**\n• Step 1:\n• Step 2:\n• Step 3:\n\n**Slide 5 (Summary & Repost CTA):**\n", false, false);
    out = replace_whole_words(&out, "carousel outline template", "\n### 📑 LinkedIn Carousel Outline\n**Slide 1 (Cover Hook):**\n\n**Slide 2 (The Hidden Mistake):**\n\n**Slide 3 (The Shift):**\n\n**Slide 4 (Step-by-Step System):**\n• Step 1:\n• Step 2:\n• Step 3:\n\n**Slide 5 (Summary & Repost CTA):**\n", false, false);

    out = replace_whole_words(&out, "linkedin hook template", "\n### 🪝 LinkedIn Hook\n**Contrarian Opening:**\n\n**Data / Real-World Proof:**\n\n**Core Thesis:**\n", false, false);
    out = replace_whole_words(&out, "thought leadership hook", "\n### 🪝 LinkedIn Hook\n**Contrarian Opening:**\n\n**Data / Real-World Proof:**\n\n**Core Thesis:**\n", false, false);

    out = replace_whole_words(&out, "x thread template", "\n### 🧵 X (Twitter) Thread\n**1/ 🧵 [Hook & Big Promise]:**\n\n**2/ [The Context & Pain]:**\n\n**3/ [The Solution / Core Breakthrough]:**\n\n**4/ [Detailed Breakdown]:**\n• \n• \n• \n\n**5/ [Conclusion & Bookmark CTA]:**\nIf you found this valuable:\n1. Follow for more insights\n2. Repost the first post to share with others\n", false, false);
    out = replace_whole_words(&out, "twitter thread template", "\n### 🧵 X (Twitter) Thread\n**1/ 🧵 [Hook & Big Promise]:**\n\n**2/ [The Context & Pain]:**\n\n**3/ [The Solution / Core Breakthrough]:**\n\n**4/ [Detailed Breakdown]:**\n• \n• \n• \n\n**5/ [Conclusion & Bookmark CTA]:**\nIf you found this valuable:\n1. Follow for more insights\n2. Repost the first post to share with others\n", false, false);
    out = replace_whole_words(&out, "x thread", "\n### 🧵 X (Twitter) Thread\n**1/ 🧵 [Hook & Big Promise]:**\n\n**2/ [The Context & Pain]:**\n\n**3/ [The Solution / Core Breakthrough]:**\n\n**4/ [Detailed Breakdown]:**\n• \n• \n• \n\n**5/ [Conclusion & Bookmark CTA]:**\nIf you found this valuable:\n1. Follow for more insights\n2. Repost the first post to share with others\n", false, false);
    out = replace_whole_words(&out, "twitter thread", "\n### 🧵 X (Twitter) Thread\n**1/ 🧵 [Hook & Big Promise]:**\n\n**2/ [The Context & Pain]:**\n\n**3/ [The Solution / Core Breakthrough]:**\n\n**4/ [Detailed Breakdown]:**\n• \n• \n• \n\n**5/ [Conclusion & Bookmark CTA]:**\nIf you found this valuable:\n1. Follow for more insights\n2. Repost the first post to share with others\n", false, false);

    out = replace_whole_words(
        &out,
        "x post template",
        "\n### 🐦 X (Twitter) Post\n**Hook:**\n\n**Insight:**\n\n**CTA / Question:**\n",
        false, false);
    out = replace_whole_words(
        &out,
        "twitter post template",
        "\n### 🐦 X (Twitter) Post\n**Hook:**\n\n**Insight:**\n\n**CTA / Question:**\n",
        false, false);
    out = replace_whole_words(
        &out,
        "tweet template",
        "\n### 🐦 X (Twitter) Post\n**Hook:**\n\n**Insight:**\n\n**CTA / Question:**\n",
        false, false);
    out = replace_whole_words(
        &out,
        "x post",
        "\n### 🐦 X (Twitter) Post\n**Hook:**\n\n**Insight:**\n\n**CTA / Question:**\n",
        false, false);
    out = replace_whole_words(
        &out,
        "single tweet",
        "\n### 🐦 X (Twitter) Post\n**Hook:**\n\n**Insight:**\n\n**CTA / Question:**\n",
        false, false);

    out = replace_whole_words(&out, "podcast outline template", "\n### 🎙️ Podcast Episode Outline\n**Episode Title:** \n**Guest:** \n**Core Theme:** \n\n**Discussion Questions:**\n- \n- \n- \n\n**Key Timestamps:**\n- 00:00 Intro\n- \n\n**Links Mentioned:**\n- \n", false, false);
    out = replace_whole_words(&out, "podcast show notes", "\n### 🎙️ Podcast Episode Outline\n**Episode Title:** \n**Guest:** \n**Core Theme:** \n\n**Discussion Questions:**\n- \n- \n- \n\n**Key Timestamps:**\n- 00:00 Intro\n- \n\n**Links Mentioned:**\n- \n", false, false);

    out = replace_whole_words(&out, "sponsor read template", "\n### 📢 Sponsor Read (60s)\n**Organic Transition:**\n\n**Product Problem & Solution:**\n\n**Personal Experience:**\n\n**Offer & Discount Code:**\n\n**Call to Action URL:**\n", false, false);
    out = replace_whole_words(&out, "ad read template", "\n### 📢 Sponsor Read (60s)\n**Organic Transition:**\n\n**Product Problem & Solution:**\n\n**Personal Experience:**\n\n**Offer & Discount Code:**\n\n**Call to Action URL:**\n", false, false);

    out = replace_whole_words(&out, "insert meeting notes", "\n### 📝 Meeting Notes\n**Date:** \n**Attendees:** \n**Objective:** \n\n**Key Discussion Points:**\n- \n\n**Action Items:**\n- [ ] \n", false, false);
    out = replace_whole_words(&out, "meeting notes template", "\n### 📝 Meeting Notes\n**Date:** \n**Attendees:** \n**Objective:** \n\n**Key Discussion Points:**\n- \n\n**Action Items:**\n- [ ] \n", false, false);
    out = replace_whole_words(&out, "meeting notes", "\n### 📝 Meeting Notes\n**Date:** \n**Attendees:** \n**Objective:** \n\n**Key Discussion Points:**\n- \n\n**Action Items:**\n- [ ] \n", false, false);

    out = replace_whole_words(&out, "feature spec template", "\n### 💡 Feature Specification\n**Overview:** \n\n**Problem Statement:** \n\n**Proposed Solution:** \n\n**Acceptance Criteria:**\n- [ ] \n", false, false);
    out = replace_whole_words(&out, "rfc template", "\n### 💡 Feature Specification\n**Overview:** \n\n**Problem Statement:** \n\n**Proposed Solution:** \n\n**Acceptance Criteria:**\n- [ ] \n", false, false);
    out = replace_whole_words(&out, "feature spec", "\n### 💡 Feature Specification\n**Overview:** \n\n**Problem Statement:** \n\n**Proposed Solution:** \n\n**Acceptance Criteria:**\n- [ ] \n", false, false);

    out = replace_whole_words(
        &out,
        "release notes template",
        "\n### 📦 Release Notes\n**Added:**\n- \n\n**Fixed:**\n- \n\n**Changed:**\n- \n",
        false, false);
    out = replace_whole_words(
        &out,
        "changelog template",
        "\n### 📦 Release Notes\n**Added:**\n- \n\n**Fixed:**\n- \n\n**Changed:**\n- \n",
        false, false);

    out = replace_whole_words(
        &out,
        "todo list template",
        "\n### 🎯 Action Items\n- [ ] \n- [ ] \n- [ ] \n",
        false, false);
    out = replace_whole_words(
        &out,
        "task checklist",
        "\n### 🎯 Action Items\n- [ ] \n- [ ] \n- [ ] \n",
        false, false);

    out = replace_whole_words(&out, "insert badge template", "\n[![Made with HushWrite](https://img.shields.io/badge/dictated%20with-HushWrite-5865F2?style=flat-square&logo=soundcharts&logoColor=white)](https://HushWrite.app)\n", false, false);
    out = replace_whole_words(&out, "made with HushWrite badge", "\n[![Made with HushWrite](https://img.shields.io/badge/dictated%20with-HushWrite-5865F2?style=flat-square&logo=soundcharts&logoColor=white)](https://HushWrite.app)\n", false, false);
    out = replace_whole_words(&out, "badge template", "\n[![Made with HushWrite](https://img.shields.io/badge/dictated%20with-HushWrite-5865F2?style=flat-square&logo=soundcharts&logoColor=white)](https://HushWrite.app)\n", false, false);
    out = replace_whole_words(
        &out,
        "dictated with HushWrite",
        "\n_Dictated privately on-device with [HushWrite](https://HushWrite.app)_\n",
        false, false);
    out = replace_whole_words(
        &out,
        "made with local dictation",
        "\n_Dictated privately on-device with [HushWrite](https://HushWrite.app)_\n",
        false, false);

    out = replace_whole_words(&out, "issue title", "\n# Issue:", false, false);
    out = replace_whole_words(
        &out,
        "steps to reproduce",
        "\n### Steps to Reproduce:\n1. ",
        false, false);
    out = replace_whole_words(
        &out,
        "reproduction steps",
        "\n### Steps to Reproduce:\n1. ",
        false, false);
    out = replace_whole_words(
        &out,
        "expected behavior",
        "\n### Expected Behavior\n",
        false, false);
    out = replace_whole_words(&out, "actual behavior", "\n### Actual Behavior\n", false, false);
    out = replace_whole_words(
        &out,
        "acceptance criteria",
        "\n### Acceptance Criteria:\n- [ ] ",
        false, false);
    out = replace_whole_words(
        &out,
        "pull request description",
        "\n## Description\n\n## Changes\n- ",
        false, false);
    out = replace_whole_words(
        &out,
        "pr description",
        "\n## Description\n\n## Changes\n- ",
        false, false);
    out = replace_whole_words(&out, "pr summary", "\n## Summary\n\n", false, false);

    out = replace_whole_words(&out, "code block python", "\n```python\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block rust", "\n```rust\n\n```\n", false, false);
    out = replace_whole_words(
        &out,
        "code block typescript",
        "\n```typescript\n\n```\n",
        false, false);
    out = replace_whole_words(
        &out,
        "code block javascript",
        "\n```javascript\n\n```\n",
        false, false);
    out = replace_whole_words(&out, "code block json", "\n```json\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block sql", "\n```sql\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block bash", "\n```bash\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block shell", "\n```bash\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block html", "\n```html\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block css", "\n```css\n\n```\n", false, false);
    out = replace_whole_words(&out, "code block", "\n```\n\n```\n", false, false);
    out
}

pub const COMMON_NAMED_ENTITIES: &[(&str, &str)] = &[
    ("iphone", "iPhone"),
    ("ipad", "iPad"),
    ("macos", "macOS"),
    ("ios", "iOS"),
    ("openai", "OpenAI"),
    ("chatgpt", "ChatGPT"),
    ("anthropic", "Anthropic"),
    ("claude code", "Claude Code"),
    ("claude", "Claude"),
    ("perplexity", "Perplexity"),
    ("midjourney", "Midjourney"),
    ("elevenlabs", "ElevenLabs"),
    ("cursor", "Cursor"),
    ("windsurf", "Windsurf"),
    ("copilot", "Copilot"),
    ("github copilot", "GitHub Copilot"),
    ("ollama", "Ollama"),
    ("langchain", "LangChain"),
    ("llamaindex", "LlamaIndex"),
    ("vllm", "vLLM"),
    ("whisper cpp", "whisper.cpp"),
    ("whisper.cpp", "whisper.cpp"),
    ("youtube", "YouTube"),
    ("instagram", "Instagram"),
    ("tiktok", "TikTok"),
    ("linkedin", "LinkedIn"),
    ("twitter", "Twitter"),
    ("tweetdeck", "TweetDeck"),
    ("typefully", "Typefully"),
    ("taplio", "Taplio"),
    ("hypefury", "Hypefury"),
    ("bluesky", "Bluesky"),
    ("threads", "Threads"),
    ("mastodon", "Mastodon"),
    ("x post", "X post"),
    ("x thread", "X thread"),
    ("x com", "X.com"),
    ("substack", "Substack"),
    ("medium", "Medium"),
    ("patreon", "Patreon"),
    ("discord", "Discord"),
    ("twitch", "Twitch"),
    ("spotify", "Spotify"),
    ("davinci resolve", "DaVinci Resolve"),
    ("final cut pro", "Final Cut Pro"),
    ("premiere pro", "Premiere Pro"),
    ("capcut", "CapCut"),
    ("descript", "Descript"),
    ("notion", "Notion"),
    ("obsidian", "Obsidian"),
    ("canva", "Canva"),
    ("github", "GitHub"),
    ("gitlab", "GitLab"),
    ("bitbucket", "Bitbucket"),
    ("vscode", "VS Code"),
    ("vs code", "VS Code"),
    ("neovim", "Neovim"),
    ("homebrew", "Homebrew"),
    ("directml", "DirectML"),
    ("directx", "DirectX"),
    ("zed editor", "Zed"),
    ("zed", "Zed"),
    ("linear", "Linear"),
    ("raycast", "Raycast"),
    ("typescript", "TypeScript"),
    ("javascript", "JavaScript"),
    ("rust", "Rust"),
    ("golang", "Go"),
    ("python", "Python"),
    ("webassembly", "WebAssembly"),
    ("wasm", "Wasm"),
    ("html", "HTML"),
    ("html5", "HTML5"),
    ("css", "CSS"),
    ("css3", "CSS3"),
    ("sql", "SQL"),
    ("react", "React"),
    ("next js", "Next.js"),
    ("nextjs", "Next.js"),
    ("vue js", "Vue.js"),
    ("vuejs", "Vue.js"),
    ("sveltekit", "SvelteKit"),
    ("svelte kit", "SvelteKit"),
    ("tailwind css", "Tailwind CSS"),
    ("tailwindcss", "Tailwind CSS"),
    ("node js", "Node.js"),
    ("nodejs", "Node.js"),
    ("bun", "Bun"),
    ("deno", "Deno"),
    ("vite", "Vite"),
    ("webpack", "Webpack"),
    ("turborepo", "Turborepo"),
    ("fastapi", "FastAPI"),
    ("fast api", "FastAPI"),
    ("pytorch", "PyTorch"),
    ("tensorflow", "TensorFlow"),
    ("django", "Django"),
    ("flask", "Flask"),
    ("express js", "Express.js"),
    ("expressjs", "Express.js"),
    ("hono", "Hono"),
    ("prisma", "Prisma"),
    ("drizzle orm", "Drizzle ORM"),
    ("drizzle", "Drizzle"),
    ("zod", "Zod"),
    ("zustand", "Zustand"),
    ("redux", "Redux"),
    ("tanstack", "TanStack"),
    ("trpc", "tRPC"),
    ("graphql", "GraphQL"),
    ("tauri", "Tauri"),
    ("postgresql", "PostgreSQL"),
    ("postgres", "PostgreSQL"),
    ("sqlite", "SQLite"),
    ("redis", "Redis"),
    ("mongodb", "MongoDB"),
    ("mongo db", "MongoDB"),
    ("supabase", "Supabase"),
    ("neon db", "Neon DB"),
    ("chromadb", "ChromaDB"),
    ("qdrant", "Qdrant"),
    ("pinecone", "Pinecone"),
    ("weaviate", "Weaviate"),
    ("docker", "Docker"),
    ("kubernetes", "Kubernetes"),
    ("k8s", "Kubernetes"),
    ("terraform", "Terraform"),
    ("github actions", "GitHub Actions"),
    ("ci cd", "CI/CD"),
    ("aws", "AWS"),
    ("gcp", "GCP"),
    ("azure", "Azure"),
    ("vercel", "Vercel"),
    ("cloudflare", "Cloudflare"),
    ("json", "JSON"),
    ("yaml", "YAML"),
    ("toml", "TOML"),
    ("uuid", "UUID"),
    ("oauth", "OAuth"),
    ("jwt", "JWT"),
    ("https", "HTTPS"),
    ("http", "HTTP"),
    ("dns", "DNS"),
    ("ssh", "SSH"),
    ("websocket", "WebSocket"),
    ("websockets", "WebSockets"),
    ("grpc", "gRPC"),
    ("rest api", "REST API"),
    ("sdk", "SDK"),
    ("cli", "CLI"),
    ("api", "API"),
    ("url", "URL"),
    ("uri", "URI"),
    ("pr", "PR"),
    ("ui", "UI"),
    ("ux", "UX"),
    ("ram", "RAM"),
    ("cpu", "CPU"),
    ("gpu", "GPU"),
];

pub fn normalize_named_entities(text: &str) -> String {
    let mut out = text.to_string();
    for (lower, canonical) in SORTED_NAMED_ENTITIES.iter() {
        out = replace_whole_words(&out, lower, canonical, false, false);
    }
    out
}

/// COMMON_NAMED_ENTITIES sorted longest-needle-first, built once — the table
/// is static, so the order it wants never changes.
static SORTED_NAMED_ENTITIES: LazyLock<&'static [(&'static str, &'static str)]> =
    LazyLock::new(|| {
        let mut sorted: Vec<(&str, &str)> = COMMON_NAMED_ENTITIES.to_vec();
        sorted.sort_by_key(|(needle, _)| std::cmp::Reverse(needle.len()));
        Box::leak(sorted.into())
    });
