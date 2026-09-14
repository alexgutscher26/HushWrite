/*!
 * SOURCE OF TRUTH KEYWORDS: GlossaryProtector, mask, unmask, protect_glossary
 * WHAT:  Masks domain terms, code identifiers, and custom vocabulary with unique
 *        placeholder tokens before local LLM transforms/cleanup, and restores
 *        the canonical casing and spelling afterwards.
 * WHY:   Local LLM rewrites (e.g. tone adjustments, voice transforms, grammar cleanup)
 *        can inadvertently paraphrase or "correct" domain-specific jargon, variable names,
 *        ticket IDs (ENG-1420), or company names into common English words. Masking
 *        guarantees 100% term fidelity through any non-deterministic LLM pipeline.
 * WHERE: Used by adapters/llm/enhancer.rs around LLM transformations.
 */

pub struct GlossaryProtector;

impl GlossaryProtector {
    /**
     * Replaces occurrences of `terms` in `text` with unique placeholder tokens.
     * Returns the masked text and a list of `(placeholder, canonical_term)` mappings.
     * Longer terms are processed first to avoid partial substring collisions.
     */
    pub fn mask(text: &str, terms: &[String]) -> (String, Vec<(String, String)>) {
        if text.is_empty() || terms.is_empty() {
            return (text.to_string(), Vec::new());
        }

        // Deduplicate and filter terms, sorting by length descending
        let mut sorted_terms: Vec<&str> = terms
            .iter()
            .map(|s| s.trim())
            .filter(|s| s.len() >= 2)
            .collect();
        sorted_terms.sort_by(|a, b| b.len().cmp(&a.len()));
        sorted_terms.dedup();

        let mut masked = text.to_string();
        let mut replacements = Vec::new();
        let mut index = 0;

        for term in sorted_terms {
            if term.is_empty() {
                continue;
            }

            // Look for case-insensitive matches with word-boundary awareness
            let term_lower = term.to_lowercase();
            let mut start_pos = 0;

            while let Some(match_idx) = masked[start_pos..].to_lowercase().find(&term_lower) {
                let abs_idx = start_pos + match_idx;
                let end_idx = abs_idx + term.len();

                // Check word boundaries: preceded and followed by non-alphanumeric (or start/end of string)
                let preceded_by_word = abs_idx > 0 && masked[..abs_idx].chars().next_back().map_or(false, |c| c.is_alphanumeric());
                let followed_by_word = end_idx < masked.len() && masked[end_idx..].chars().next().map_or(false, |c| c.is_alphanumeric());

                if !preceded_by_word && !followed_by_word {
                    let placeholder = format!("__MURMUR_GLOSSARY_{index}__");
                    masked.replace_range(abs_idx..end_idx, &placeholder);
                    replacements.push((placeholder.clone(), term.to_string()));
                    index += 1;
                    start_pos = abs_idx + placeholder.len();
                } else {
                    start_pos = abs_idx + term.len();
                }

                if start_pos >= masked.len() {
                    break;
                }
            }
        }

        (masked, replacements)
    }

    /**
     * Restores all placeholders in `text` to their canonical `canonical_term`.
     * Performs case-insensitive matching so that placeholders lowercase/capitalized
     * by LLM models are accurately restored.
     */
    pub fn unmask(mut text: String, replacements: &[(String, String)]) -> String {
        for (placeholder, canonical) in replacements {
            let ph_lower = placeholder.to_lowercase();
            while let Some(idx) = text.to_lowercase().find(&ph_lower) {
                let end = idx + placeholder.len();
                text.replace_range(idx..end, canonical);
            }
        }
        text
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_and_unmasks_exact_canonical_casing() {
        let input = "Please push the hushwrite build and check WhisperX cuda issue.";
        let terms = vec![
            "HushWrite".to_string(),
            "WhisperX".to_string(),
            "CUDA".to_string(),
        ];

        let (masked, replacements) = GlossaryProtector::mask(input, &terms);
        assert!(!masked.contains("hushwrite"));
        assert!(!masked.contains("cuda"));
        assert!(masked.contains("__MURMUR_GLOSSARY_"));

        // Simulate LLM grammar / casing changes to surrounding text
        let simulated_llm_output = format!("Kindly {}", masked.to_lowercase());
        let restored = GlossaryProtector::unmask(simulated_llm_output, &replacements);

        assert!(restored.contains("HushWrite"));
        assert!(restored.contains("WhisperX"));
        assert!(restored.contains("CUDA"));
    }

    #[test]
    fn prioritizes_longer_terms_first() {
        let input = "Deploy UserPermissionsService and User model.";
        let terms = vec!["User".to_string(), "UserPermissionsService".to_string()];

        let (masked, replacements) = GlossaryProtector::mask(input, &terms);
        let restored = GlossaryProtector::unmask(masked, &replacements);

        assert_eq!(restored, "Deploy UserPermissionsService and User model.");
    }

    #[test]
    fn respects_word_boundaries() {
        let input = "We have rust and crusty bread.";
        let terms = vec!["Rust".to_string()];

        let (masked, replacements) = GlossaryProtector::mask(input, &terms);
        assert!(masked.contains("crusty"));
        let restored = GlossaryProtector::unmask(masked, &replacements);

        assert_eq!(restored, "We have Rust and crusty bread.");
    }
}
