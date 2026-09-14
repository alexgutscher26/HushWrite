/*!
 * SOURCE OF TRUTH KEYWORDS: llm_adapter, LlmTextEnhancer, HardwareDetector,
 *   HardwareProfile, VoiceTransformIntent, VoiceTransformParser
 * WHAT:  On-device LLM module for Smart Cleanup and Voice Transformations via GGUF models.
 * WHY:   Encapsulates model selection, hardware-aware quantization tiering (Q4_K_M vs Q5_K_M/Q6_K),
 *        prompt construction, and voice transform intent parsing.
 * WHERE: adapters/llm; exported to adapters::mod and consumed by pipeline and bootstrap.
 */

pub mod enhancer;
pub mod glossary;
pub mod hardware;
pub mod transforms;

pub use enhancer::LlmTextEnhancer;
pub use glossary::GlossaryProtector;
pub use hardware::{HardwareDetector, HardwareProfile, LlmTaskKind, QuantizationTier};
pub use transforms::{ModelPromptFormat, ParsedVoiceTransform, VoiceTransformIntent, VoiceTransformParser};
