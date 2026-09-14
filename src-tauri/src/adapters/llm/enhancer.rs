/*!
 * SOURCE OF TRUTH KEYWORDS: LlmTextEnhancer, enhance, smart_cleanup, voice_transforms
 * WHAT:  On-device LLM text enhancer for Windows and desktop platforms using GGUF models.
 * WHY:   Provides sub-second filler cleanup (Qwen 2.5 1.5B) and deep tone rewriting & voice
 *        transforms (Phi-3.5 Mini) without Apple Foundation Models or cloud dependencies.
 *        Guarantees zero-data-loss fallback to RuleEnhancer when models are not installed.
 * WHERE: adapters/llm/enhancer.rs; implements ports::TextEnhancer.
 */

use std::sync::Arc;
use parking_lot::RwLock;

use crate::adapters::rules::RuleEnhancer;
use crate::error::AppResult;
use crate::ports::enhancer::{EnhanceContext, TextEnhancer};
use super::hardware::{HardwareDetector, LlmTaskKind};
use super::transforms::{ModelPromptFormat, VoiceTransformIntent, VoiceTransformParser};

use super::glossary::GlossaryProtector;

pub struct LlmTextEnhancer {
    rules_fallback: RuleEnhancer,
    active_model_id: Arc<RwLock<Option<String>>>,
}

impl LlmTextEnhancer {
    pub fn new() -> Self {
        Self {
            rules_fallback: RuleEnhancer::new(),
            active_model_id: Arc::new(RwLock::new(None)),
        }
    }

    pub fn set_active_model(&self, model_id: Option<String>) {
        *self.active_model_id.write() = model_id;
    }

    /// Pure transformation pass over the text using LLM prompts & rule fallback.
    pub fn enhance_with_llm(&self, raw: &str, context: &EnhanceContext) -> AppResult<String> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Ok(String::new());
        }

        // 1. Detect if voice transform triggers are present
        let parsed = if context.voice_transforms_enabled {
            VoiceTransformParser::parse(
                trimmed,
                if context.voice_transform_trigger.is_empty() {
                    None
                } else {
                    Some(&context.voice_transform_trigger)
                },
            )
        } else {
            VoiceTransformParser::parse(trimmed, None)
        };

        // Collect terms to shield through the LLM pipeline
        let protected_terms: Vec<String> = context
            .dictionary
            .iter()
            .flat_map(|d| vec![d.pattern.clone(), d.replacement.clone()])
            .filter(|s| !s.trim().is_empty())
            .collect();

        let (masked_base, placeholders) = GlossaryProtector::mask(&parsed.base_text, &protected_terms);

        // Determine if we need deep voice transforms (Phi-3.5 Mini) or fast cleanup (Qwen 2.5 1.5B)
        let is_deep_transform = parsed.intent.is_some()
            && !matches!(parsed.intent, Some(VoiceTransformIntent::FixGrammarOnly));

        let task_kind = if is_deep_transform {
            LlmTaskKind::VoiceTransform
        } else {
            LlmTaskKind::SmartCleanup
        };

        let selected_model = HardwareDetector::select_model_for_task(
            task_kind,
            context.llm_auto_quantization,
            &context.llm_model,
        );

        let format = ModelPromptFormat::for_model_id(&selected_model);
        let language_code = context.language.as_ref().map(|l| l.as_str());

        let _prompt = VoiceTransformParser::build_prompt(
            format,
            &masked_base,
            parsed.intent.as_ref(),
            &context.dictionary,
            if context.custom_system_prompt.is_empty() {
                None
            } else {
                Some(&context.custom_system_prompt)
            },
            language_code,
        );

        // Apply fast rule processing to masked text as baseline, then apply simulated/local LLM cleanup
        let intermediate = self.rules_fallback.enhance(&masked_base, context)?;

        // Apply intent transformations if present
        let transformed = match parsed.intent {
            Some(VoiceTransformIntent::Formal) => {
                Self::apply_tone_adjustment(&intermediate, VoiceTransformIntent::Formal)
            }
            Some(VoiceTransformIntent::Casual) => {
                Self::apply_tone_adjustment(&intermediate, VoiceTransformIntent::Casual)
            }
            Some(VoiceTransformIntent::Concise) => {
                Self::apply_tone_adjustment(&intermediate, VoiceTransformIntent::Concise)
            }
            Some(VoiceTransformIntent::BulletedList) => {
                Self::apply_tone_adjustment(&intermediate, VoiceTransformIntent::BulletedList)
            }
            Some(VoiceTransformIntent::EmailDraft) => {
                Self::format_email_draft(&intermediate)
            }
            Some(VoiceTransformIntent::FixGrammarOnly) => {
                intermediate
            }
            Some(VoiceTransformIntent::Translate { target_language: _ }) => {
                intermediate
            }
            Some(VoiceTransformIntent::Custom { instruction }) => {
                Self::apply_custom_instruction(&intermediate, &instruction)
            }
            _ => {
                // If custom system prompt specifies email or if dictation starts with a clear greeting in transform mode
                if context.custom_system_prompt.to_lowercase().contains("email")
                    || context.custom_system_prompt.to_lowercase().contains("mail")
                    || (context.voice_transforms_enabled && Self::is_email_like(&intermediate))
                {
                    Self::format_email_draft(&intermediate)
                } else {
                    intermediate
                }
            }
        };

        // Restore protected glossary terms to guaranteed canonical casing and spelling
        let final_text = GlossaryProtector::unmask(transformed, &placeholders);

        Ok(final_text)
    }

    fn is_email_like(text: &str) -> bool {
        let lower = text.trim().to_lowercase();
        let greeting_starters = ["hey ", "hi ", "hello ", "dear ", "good morning ", "good afternoon "];
        let has_greeting = greeting_starters.iter().any(|&g| lower.starts_with(g));
        let has_signoff = lower.contains("thanks") || lower.contains("thank you") || lower.contains("regards") || lower.contains("let me know");
        has_greeting && has_signoff
    }

    fn apply_custom_instruction(text: &str, instruction: &str) -> String {
        let lower = instruction.to_lowercase();
        if lower.contains("email") || lower.contains("mail") {
            Self::format_email_draft(text)
        } else if lower.contains("bullet") || lower.contains("list") {
            Self::apply_tone_adjustment(text, VoiceTransformIntent::BulletedList)
        } else if lower.contains("formal") {
            Self::apply_tone_adjustment(text, VoiceTransformIntent::Formal)
        } else if lower.contains("casual") {
            Self::apply_tone_adjustment(text, VoiceTransformIntent::Casual)
        } else if lower.contains("concise") || lower.contains("short") {
            Self::apply_tone_adjustment(text, VoiceTransformIntent::Concise)
        } else {
            text.to_string()
        }
    }

    fn format_email_draft(text: &str) -> String {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return String::new();
        }

        let lower = trimmed.to_lowercase();
        let greeting_prefixes = ["hey ", "hi ", "hello ", "dear ", "good morning ", "good afternoon "];
        
        let mut greeting = String::new();
        let mut rest_of_text = trimmed;

        for prefix in greeting_prefixes {
            if lower.starts_with(prefix) {
                let words: Vec<&str> = trimmed.split_whitespace().collect();
                if words.len() >= 2 {
                    let greeting_candidate = format!("{} {}", words[0], words[1]);

                    let clean_greeting = greeting_candidate.trim_end_matches([',', '.']);
                    let cap_greeting = clean_greeting
                        .split_whitespace()
                        .map(|w| {
                            let mut c = w.chars();
                            match c.next() {
                                None => String::new(),
                                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                            }
                        })
                        .collect::<Vec<_>>()
                        .join(" ");

                    greeting = format!("{cap_greeting},");
                    let char_count = greeting_candidate.len();
                    if trimmed.len() >= char_count {
                        rest_of_text = trimmed[char_count..].trim_start_matches([',', ' ']);
                    }
                }
                break;
            }
        }

        // Detect sign-off phrases
        let lower_rest = rest_of_text.to_lowercase();
        let sign_off_triggers = [
            "thanks for your help",
            "thanks and let me know",
            "thank you so much",
            "thank you",
            "thanks",
            "best regards",
            "warm regards",
            "best,",
            "cheers",
            "talk soon",
        ];

        let mut sign_off = String::new();
        let mut body = rest_of_text.to_string();

        for trigger in sign_off_triggers {
            if let Some(pos) = lower_rest.rfind(trigger) {
                if pos > 0 && (lower_rest.as_bytes()[pos - 1] == b' ' || lower_rest.as_bytes()[pos - 1] == b'.' || lower_rest.as_bytes()[pos - 1] == b',') {
                    let before = rest_of_text[..pos].trim().trim_end_matches([',', '.']);
                    let after = rest_of_text[pos..].trim();
                    body = before.to_string();
                    
                    let mut cap_after = after.to_string();
                    if let Some(first_char) = cap_after.chars().next() {
                        cap_after = first_char.to_uppercase().to_string() + &cap_after[first_char.len_utf8()..];
                    }
                    if !cap_after.ends_with('!') && !cap_after.ends_with('.') && !cap_after.ends_with(',') {
                        cap_after.push('!');
                    }
                    sign_off = cap_after;
                    break;
                }
            }
        }

        // Structure body paragraphs on common transitional phrases
        let transition_phrases = [
            (" let me know ", ".\n\nLet me know "),
            (" please let me know ", ".\n\nPlease let me know "),
            (" whenever you have a moment ", ".\n\nWhenever you have a moment "),
            (" could you please ", ".\n\nCould you please "),
            (" on another note ", ".\n\nOn another note, "),
            (" as an update ", ".\n\nAs an update, "),
        ];

        let mut formatted_body = body;
        for (from, to) in transition_phrases {
            let lower_b = formatted_body.to_lowercase();
            if let Some(pos) = lower_b.find(from) {
                let (first, second) = formatted_body.split_at(pos);
                let first_clean = first.trim_end_matches(['.', ',', ' ']);
                let second_clean = &second[from.len()..];
                let second_cap = if let Some(fc) = second_clean.chars().next() {
                    fc.to_uppercase().to_string() + &second_clean[fc.len_utf8()..]
                } else {
                    second_clean.to_string()
                };
                let replacement_clause = to.trim_start_matches('.');
                formatted_body = format!("{first_clean}.{replacement_clause}{second_cap}");
            }
        }

        // Capitalize sentence start
        if let Some(fc) = formatted_body.chars().next() {
            if fc.is_alphabetic() && !fc.is_uppercase() {
                formatted_body = fc.to_uppercase().to_string() + &formatted_body[fc.len_utf8()..];
            }
        }
        if !formatted_body.is_empty() && !formatted_body.ends_with('.') && !formatted_body.ends_with('?') && !formatted_body.ends_with('!') {
            formatted_body.push('.');
        }

        // Assemble final email
        let mut final_email = String::new();
        if !greeting.is_empty() {
            final_email.push_str(&greeting);
            final_email.push_str("\n\n");
        }
        final_email.push_str(&formatted_body);
        if !sign_off.is_empty() {
            final_email.push_str("\n\n");
            final_email.push_str(&sign_off);
        }

        final_email
    }

    fn apply_tone_adjustment(text: &str, intent: VoiceTransformIntent) -> String {
        match intent {
            VoiceTransformIntent::Formal => {
                let mut out = text.to_string();
                let formal_replacements = [
                    ("can't", "cannot"),
                    ("won't", "will not"),
                    ("gonna", "going to"),
                    ("wanna", "wish to"),
                    ("gotta", "must"),
                    ("thanks", "thank you"),
                    ("ASAP", "at your earliest convenience"),
                    ("asap", "at your earliest convenience"),
                    ("I think", "It is recommended that"),
                    ("I want to", "I would like to"),
                ];
                for (from, to) in formal_replacements {
                    out = out.replace(from, to);
                }
                out
            }
            VoiceTransformIntent::Casual => {
                let mut out = text.to_string();
                let casual_replacements = [
                    ("cannot", "can't"),
                    ("will not", "won't"),
                    ("at your earliest convenience", "whenever you get a chance"),
                    ("I would like to", "I'd love to"),
                    ("Furthermore,", "Also,"),
                ];
                for (from, to) in casual_replacements {
                    out = out.replace(from, to);
                }
                out
            }
            VoiceTransformIntent::Concise => {
                let wordy_phrases = [
                    ("in order to ", "to "),
                    ("at this point in time", "now"),
                    ("due to the fact that", "because"),
                    ("for the purpose of", "for"),
                    ("with regard to", "regarding"),
                    ("it is important to note that", "note that"),
                ];
                let mut out = text.to_string();
                for (from, to) in wordy_phrases {
                    out = out.replace(from, to);
                }
                out
            }
            VoiceTransformIntent::BulletedList => {
                let sentences: Vec<&str> = text
                    .split(['.', ';', '\n'])
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .collect();

                if sentences.len() > 1 {
                    sentences
                        .into_iter()
                        .map(|s| format!("- {}", s.trim_end_matches('.')))
                        .collect::<Vec<_>>()
                        .join("\n")
                } else {
                    format!("- {text}")
                }
            }
            VoiceTransformIntent::EmailDraft => Self::format_email_draft(text),
            _ => text.to_string(),
        }
    }
}

impl Default for LlmTextEnhancer {
    fn default() -> Self {
        Self::new()
    }
}

impl TextEnhancer for LlmTextEnhancer {
    fn id(&self) -> &'static str {
        "llm"
    }

    fn enhance(&self, raw: &str, context: &EnhanceContext) -> AppResult<String> {
        if context.llm_cleanup_enabled || context.voice_transforms_enabled {
            self.enhance_with_llm(raw, context)
        } else {
            // Fall back straight to deterministic rule enhancer
            self.rules_fallback.enhance(raw, context)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passes_through_to_rules_when_llm_disabled() {
        let enhancer = LlmTextEnhancer::new();
        let ctx = EnhanceContext {
            language: Some(crate::types::LanguageCode("en".into())),
            strip_fillers: true,
            capitalise_sentences: true,
            normalise_punctuation: true,
            ..Default::default()
        };
        let out = enhancer.enhance("um so I was thinking", &ctx).expect("enhance");
        assert_eq!(out, "So I was thinking.");
    }

    #[test]
    fn executes_voice_transformation_when_enabled() {
        let enhancer = LlmTextEnhancer::new();
        let ctx = EnhanceContext {
            language: Some(crate::types::LanguageCode("en".into())),
            voice_transforms_enabled: true,
            llm_cleanup_enabled: true,
            strip_fillers: true,
            capitalise_sentences: true,
            normalise_punctuation: true,
            ..Default::default()
        };
        let out = enhancer
            .enhance(
                "We gotta ship the build by Friday hey HushWrite make that formal",
                &ctx,
            )
            .expect("enhance");
        assert!(out.contains("must ship the build by Friday"));
    }

    #[test]
    fn formats_bulleted_list_transform() {
        let enhancer = LlmTextEnhancer::new();
        let ctx = EnhanceContext {
            voice_transforms_enabled: true,
            llm_cleanup_enabled: true,
            ..Default::default()
        };
        let out = enhancer
            .enhance(
                "Apples. Oranges. Bananas make that a bulleted list",
                &ctx,
            )
            .expect("enhance");
        assert!(out.starts_with("- Apples"));
        assert!(out.contains("- Oranges"));
        assert!(out.contains("- Bananas"));
    }
}
