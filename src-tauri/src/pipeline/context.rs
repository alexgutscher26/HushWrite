/*!
 * SOURCE OF TRUTH KEYWORDS: extract_window_tokens, build_context_prompt
 * WHAT:  Extracts high-signal domain tokens and code identifiers from active
 *        window titles to dynamically bias Whisper's initial_prompt.
 * WHY:   Curated static vocabulary packs cannot know the user's active file name,
 *        branch, project, or ticket ID. Extracting these tokens at session start
 *        provides immediate, zero-effort accuracy biasing for the exact code
 *        identifiers the user is looking at.
 * WHERE: Consumed by session/actor.rs when assembling TranscribeRequest::prompt.
 */

use std::collections::HashSet;

/// Well-known application suffixes appended to window titles across desktop platforms.
const NOISY_APP_SUFFIXES: &[&str] = &[
    "Visual Studio Code",
    "Visual Studio",
    "Cursor",
    "Windsurf",
    "Zed",
    "Sublime Text",
    "IntelliJ IDEA",
    "WebStorm",
    "PyCharm",
    "CLion",
    "Android Studio",
    "Google Chrome",
    "Microsoft Edge",
    "Mozilla Firefox",
    "Brave",
    "Arc",
    "Opera",
    "Vivaldi",
    "Safari",
    "Slack",
    "Discord",
    "Notion",
    "Obsidian",
    "Microsoft Teams",
    "Zoom",
    "Command Prompt",
    "Windows PowerShell",
    "PowerShell",
    "Terminal",
];

/// Common English stop words that carry no domain signal in window titles.
const STOP_WORDS: &[&str] = &[
    "the", "and", "with", "for", "from", "that", "this", "file", "edit", "view",
    "search", "google", "pull", "request", "issue", "branch", "window", "tab",
    "workspace", "document", "untitled", "home",
];

/**
 * SOURCE OF TRUTH KEYWORDS: extract_window_tokens
 * WHAT:  Extracts clean, high-value domain tokens from an active window title.
 * WHY:   Window titles contain rich identifiers like file names (`UserAuthService.tsx`),
 *        project names (`murmur-main`), and ticket IDs (`ENG-1420`). Stripping
 *        app chrome and punctuation isolates these terms so Whisper can transcribe
 *        them accurately without requiring manual vocabulary configuration.
 */
pub fn extract_window_tokens(title: &str) -> Vec<String> {
    let mut cleaned = title.trim();
    if cleaned.is_empty() || cleaned == "Unknown" {
        return Vec::new();
    }

    // 1. Strip dirty/editing status indicators at the start (e.g. "● ", "* ")
    cleaned = cleaned.trim_start_matches(['●', '*', ' ']);

    // 2. Strip administrative prefixes (e.g. "Administrator: ")
    if let Some(stripped) = cleaned.strip_prefix("Administrator: ") {
        cleaned = stripped;
    }

    // 3. Strip known application suffixes
    for suffix in NOISY_APP_SUFFIXES {
        for sep in &[" - ", " — ", " – ", " · ", " | "] {
            let pattern = format!("{sep}{suffix}");
            if let Some(idx) = cleaned.rfind(&pattern) {
                cleaned = &cleaned[..idx];
                break;
            }
        }
    }

    // 4. Split title into segments by spaced breadcrumb/separator sequences
    let mut raw_segments = vec![cleaned];
    for sep in &[" - ", " — ", " – ", " · ", " | ", " :: "] {
        let mut next = Vec::new();
        for seg in raw_segments {
            next.extend(seg.split(sep).map(str::trim).filter(|s| !s.is_empty()));
        }
        raw_segments = next;
    }

    let mut tokens: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    let mut add_token = |token: &str| {
        let trimmed = token.trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '-');
        if trimmed.len() < 2 {
            return;
        }

        let lower = trimmed.to_lowercase();
        if STOP_WORDS.contains(&lower.as_str()) {
            return;
        }

        if seen.insert(lower) {
            tokens.push(trimmed.to_string());
        }
    };

    for segment in raw_segments {
        // A. If segment is a file name like "UserPermissionsService.tsx", extract base name
        if let Some((base, ext)) = segment.rsplit_once('.') {
            if !ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_alphabetic()) {
                add_token(base);
            }
        }

        // B. Extract words, tickets (e.g. "ENG-1420", "PROJ_42"), and identifiers from the segment
        for word in segment.split_whitespace() {
            let cleaned_word = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '-');

            // Ticket ID pattern: uppercase letters followed by dash/underscore and numbers
            if is_ticket_id(cleaned_word) {
                add_token(cleaned_word);
                continue;
            }

            // Code identifier (CamelCase, PascalCase, snake_case, or kebab-case)
            if is_code_identifier(cleaned_word) {
                add_token(cleaned_word);
                continue;
            }

            // General domain word (length >= 3)
            if cleaned_word.len() >= 3 {
                add_token(cleaned_word);
            }
        }
    }

    tokens
}

fn is_ticket_id(s: &str) -> bool {
    let parts: Vec<&str> = s.split(['-', '_']).collect();
    if parts.len() == 2 {
        let (prefix, suffix) = (parts[0], parts[1]);
        prefix.len() >= 2
            && prefix.chars().all(|c| c.is_ascii_uppercase())
            && suffix.chars().all(|c| c.is_ascii_digit())
    } else {
        false
    }
}

fn is_code_identifier(s: &str) -> bool {
    if (s.contains('_') || s.contains('-'))
        && s.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-')
    {
        return true;
    }
    // PascalCase or camelCase (contains both upper and lowercase letters)
    let has_upper = s.chars().any(|c| c.is_uppercase());
    let has_lower = s.chars().any(|c| c.is_lowercase());
    has_upper && has_lower && s.chars().all(|c| c.is_alphanumeric())
}

const SENSITIVE_APP_PATTERNS: &[&str] = &[
    "1password",
    "bitwarden",
    "keepass",
    "keepassxc",
    "enpass",
    "dashlane",
    "lastpass",
    "nordpass",
    "proton pass",
    "vault",
    "authenticator",
];

const SENSITIVE_TITLE_PATTERNS: &[&str] = &[
    "(inprivate)",
    "- incognito",
    "[incognito]",
    "[inprivate]",
    "private browsing",
];

/**
 * SOURCE OF TRUTH KEYWORDS: is_blocklisted_app
 * WHAT:  Checks whether the active application or window is sensitive (e.g. password managers,
 *        incognito windows, or user-configured blocklisted applications).
 * WHY:   Context harvesting must never extract identifiers or text from credential vaults
 *        or private sessions.
 */
pub fn is_blocklisted_app(
    app_bundle: Option<&str>,
    window_title: Option<&str>,
    custom_blocklist: &[String],
) -> bool {
    if let Some(bundle) = app_bundle {
        let bundle_lower = bundle.to_lowercase();
        if SENSITIVE_APP_PATTERNS.iter().any(|&pat| bundle_lower.contains(pat)) {
            return true;
        }
        if custom_blocklist.iter().any(|b| bundle_lower.contains(&b.to_lowercase())) {
            return true;
        }
    }

    if let Some(title) = window_title {
        let title_lower = title.to_lowercase();
        if SENSITIVE_APP_PATTERNS.iter().any(|&pat| title_lower.contains(pat)) {
            return true;
        }
        if SENSITIVE_TITLE_PATTERNS.iter().any(|&pat| title_lower.contains(pat)) {
            return true;
        }
        if custom_blocklist.iter().any(|b| title_lower.contains(&b.to_lowercase())) {
            return true;
        }
    }

    false
}

/**
 * SOURCE OF TRUTH KEYWORDS: extract_selected_tokens
 * WHAT:  Extracts high-signal domain terms, code identifiers, and acronyms from active selected text.
 * WHY:   When a user highlights a function name, URL, or technical term before dictating,
 *        extracting those tokens gives immediate zero-latency bias for the exact active topic.
 */
pub fn extract_selected_tokens(selected_text: &str) -> Vec<String> {
    let trimmed = selected_text.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }

    // Limit scanned text to 256 chars to keep processing sub-millisecond and prevent prompt pollution
    let bounded = if trimmed.len() > 256 {
        &trimmed[..256]
    } else {
        trimmed
    };

    let mut tokens: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    for word in bounded.split_whitespace() {
        let cleaned = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '-');
        if cleaned.len() < 2 {
            continue;
        }

        let lower = cleaned.to_lowercase();
        if STOP_WORDS.contains(&lower.as_str()) {
            continue;
        }

        if (is_code_identifier(cleaned) || is_ticket_id(cleaned) || cleaned.chars().any(|c| c.is_uppercase()))
            && seen.insert(lower)
        {
            tokens.push(cleaned.to_string());
        }
    }

    tokens
}

/**
 * SOURCE OF TRUTH KEYWORDS: build_context_prompt_with_privacy
 * WHAT:  Combines dynamic selected text, window context tokens, and stored user dictionary terms
 *        while enforcing sensitive app blocklists.
 */
pub fn build_context_prompt_with_privacy(
    window_title: Option<&str>,
    app_bundle: Option<&str>,
    selected_text: Option<&str>,
    dictionary_terms: &[String],
    custom_blocklist: &[String],
    max_terms: usize,
) -> Option<String> {
    // 1. If active app is blocklisted, suppress all dynamic window/selected context
    if is_blocklisted_app(app_bundle, window_title, custom_blocklist) {
        let mut combined: Vec<String> = Vec::new();
        let mut seen: HashSet<String> = HashSet::new();
        for term in dictionary_terms {
            let trimmed = term.trim();
            if !trimmed.is_empty() && seen.insert(trimmed.to_lowercase()) {
                combined.push(trimmed.to_string());
                if combined.len() >= max_terms {
                    break;
                }
            }
        }
        return if combined.is_empty() { None } else { Some(combined.join(", ")) };
    }

    let mut combined: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    // 2. Selected text tokens take highest priority
    if let Some(sel) = selected_text {
        for token in extract_selected_tokens(sel) {
            let lower = token.to_lowercase();
            if seen.insert(lower) {
                combined.push(token);
            }
            if combined.len() >= max_terms {
                break;
            }
        }
    }

    // 3. Dynamic window tokens second
    if combined.len() < max_terms {
        if let Some(title) = window_title {
            for token in extract_window_tokens(title) {
                let lower = token.to_lowercase();
                if seen.insert(lower) {
                    combined.push(token);
                }
                if combined.len() >= max_terms {
                    break;
                }
            }
        }
    }

    // 4. User dictionary terms
    if combined.len() < max_terms {
        for term in dictionary_terms {
            let trimmed = term.trim();
            if trimmed.is_empty() {
                continue;
            }
            let lower = trimmed.to_lowercase();
            if seen.insert(lower) {
                combined.push(trimmed.to_string());
            }
            if combined.len() >= max_terms {
                break;
            }
        }
    }

    if combined.is_empty() {
        None
    } else {
        Some(combined.join(", "))
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: build_context_prompt
 * WHAT:  Combines dynamic window context tokens with stored user dictionary terms.
 * WHY:   Contextual window tokens take highest priority at the front of Whisper's
 *        prompt budget, followed by the user's recent custom vocabulary.
 */
pub fn build_context_prompt(
    window_title: Option<&str>,
    app_bundle: Option<&str>,
    dictionary_terms: &[String],
    max_terms: usize,
) -> Option<String> {
    build_context_prompt_with_privacy(
        window_title,
        app_bundle,
        None,
        dictionary_terms,
        &[],
        max_terms,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_vscode_file_and_project_tokens() {
        let title = "UserPermissionsService.tsx - murmur-main - Visual Studio Code";
        let tokens = extract_window_tokens(title);
        assert!(tokens.contains(&"UserPermissionsService".to_string()));
        assert!(tokens.contains(&"murmur-main".to_string()));
        assert!(!tokens.iter().any(|t| t == "Visual Studio Code"));
    }

    #[test]
    fn extracts_cursor_dirty_file_and_workspace() {
        let title = "● actor.rs — src-tauri — Cursor";
        let tokens = extract_window_tokens(title);
        assert!(tokens.contains(&"actor".to_string()));
        assert!(tokens.contains(&"src-tauri".to_string()));
        assert!(!tokens.iter().any(|t| t == "Cursor"));
    }

    #[test]
    fn extracts_browser_issue_and_pr_tokens() {
        let title = "ENG-1420: Fix OAuth PKCE flow - Linear - Brave";
        let tokens = extract_window_tokens(title);
        assert!(tokens.contains(&"ENG-1420".to_string()));
        assert!(tokens.contains(&"OAuth".to_string()));
        assert!(tokens.contains(&"PKCE".to_string()));
        assert!(tokens.contains(&"flow".to_string()));
        assert!(!tokens.iter().any(|t| t == "Brave"));
    }

    #[test]
    fn blocks_sensitive_apps_and_incognito() {
        assert!(is_blocklisted_app(Some("1password.exe"), None, &[]));
        assert!(is_blocklisted_app(Some("Bitwarden"), None, &[]));
        assert!(is_blocklisted_app(None, Some("KeePassXC - Passwords"), &[]));
        assert!(is_blocklisted_app(None, Some("New Tab - Google Chrome (InPrivate)"), &[]));
        assert!(is_blocklisted_app(None, Some("Secret Project - CustomApp"), &["CustomApp".to_string()]));
        assert!(!is_blocklisted_app(Some("Code.exe"), Some("main.rs - Visual Studio Code"), &[]));

        let dict = vec!["SafeTerm".to_string()];
        let prompt = build_context_prompt_with_privacy(
            Some("1Password - Master Vault"),
            Some("1password.exe"),
            Some("SecretPassword123"),
            &dict,
            &[],
            10,
        );
        // Sensitive context must NOT be extracted, only safe dictionary terms
        assert_eq!(prompt, Some("SafeTerm".to_string()));
    }

    #[test]
    fn extracts_selected_text_tokens_with_high_priority() {
        let selected = "handleOAuthCallback and UserService";
        let dict = vec!["FallbackTerm".to_string()];
        let prompt = build_context_prompt_with_privacy(
            Some("index.ts - project - VS Code"),
            Some("Code.exe"),
            Some(selected),
            &dict,
            &[],
            10,
        ).unwrap();

        let tokens: Vec<&str> = prompt.split(", ").collect();
        assert_eq!(tokens[0], "handleOAuthCallback");
        assert!(prompt.contains("UserService"));
        assert!(prompt.contains("index"));
        assert!(prompt.contains("FallbackTerm"));
    }

    #[test]
    fn combines_dynamic_context_ahead_of_dictionary_terms() {
        let title = "PaymentGateway.ts - billing-service - Visual Studio Code";
        let dict = vec!["Stripe".to_string(), "Kubernetes".to_string()];
        let prompt = build_context_prompt(Some(title), Some("code.exe"), &dict, 10).unwrap();

        let tokens: Vec<&str> = prompt.split(", ").collect();
        assert_eq!(tokens[0], "PaymentGateway");
        assert!(prompt.contains("billing-service"));
        assert!(prompt.contains("Stripe"));
        assert!(prompt.contains("Kubernetes"));
    }

    #[test]
    fn empty_or_unknown_title_falls_back_cleanly() {
        assert!(extract_window_tokens("").is_empty());
        assert!(extract_window_tokens("Unknown").is_empty());

        let dict = vec!["Rust".to_string()];
        let prompt = build_context_prompt(Some("Unknown"), None, &dict, 10);
        assert_eq!(prompt, Some("Rust".to_string()));
    }
}
