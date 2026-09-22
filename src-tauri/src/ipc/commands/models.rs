/*!
 * SOURCE OF TRUTH KEYWORDS: list_models, download_model, delete_model,
 *   get_model_status, ModelIdInput
 * WHAT:  The model manager: what is available, what is on disk, and downloading
 *        or removing it.
 * WHY:   Download is Exclusive so two concurrent calls cannot write the same
 *        partial file — resumable downloads share a `.part` path, and two
 *        writers to it would produce a file that hashes to nothing and looks
 *        like a corrupt server.
 * WHERE: Consumed by onboarding and the model manager in Settings.
 */

use tauri::State;

use crate::adapters::rules::order::{RulePreview as RuleStep, RuleId};
use crate::adapters::rules::RuleEnhancer;
use crate::error::AppError;
use crate::ipc::context::AppState;
use crate::ipc::factory::{execute, CommandSpec, Validate};
use crate::ports::models::ModelStatus;
use crate::registry::CapabilityKey;
use crate::services;
use crate::types::{ModelId, ModelState};

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct ModelReport {
    pub descriptor: crate::types::ModelDescriptor,
    pub state: ModelState,
    /// Absolute path, present only once the file is hash-verified.
    pub path: Option<String>,
}

impl From<ModelStatus> for ModelReport {
    fn from(status: ModelStatus) -> Self {
        Self {
            descriptor: status.descriptor,
            state: status.state,
            path: status.path.map(|p| p.to_string_lossy().into_owned()),
        }
    }
}

const LIST: CommandSpec = CommandSpec::new("list_models", CapabilityKey::Models);

#[tauri::command]
#[specta::specta]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<ModelReport>, AppError> {
    execute(&state, LIST, (), |ctx, ()| async move {
        Ok(ctx
            .ports()
            .models
            .list()
            .await?
            .into_iter()
            .map(ModelReport::from)
            .collect())
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct ModelIdInput {
    pub model_id: ModelId,
}

impl Validate for ModelIdInput {
    fn validate(&self) -> Result<(), String> {
        if self.model_id.as_str().trim().is_empty() {
            return Err("A model is required.".into());
        }
        Ok(())
    }
}

const STATUS: CommandSpec = CommandSpec::new("get_model_status", CapabilityKey::Models);

#[tauri::command]
#[specta::specta]
pub async fn get_model_status(
    state: State<'_, AppState>,
    input: ModelIdInput,
) -> Result<ModelReport, AppError> {
    execute(&state, STATUS, input, |ctx, input| async move {
        Ok(ctx.ports().models.status(&input.model_id).await?.into())
    })
    .await
}

/// Downloads if absent, verifies by hash, and returns the verified path.
/// Progress arrives on the ModelDownloadProgress event, not from this call.
const DOWNLOAD: CommandSpec = CommandSpec::new("download_model", CapabilityKey::Models).exclusive();

#[tauri::command]
#[specta::specta]
pub async fn download_model(
    state: State<'_, AppState>,
    input: ModelIdInput,
) -> Result<String, AppError> {
    execute(&state, DOWNLOAD, input, |ctx, input| async move {
        if crate::services::settings::is_air_gap_active(ctx.db()) {
            return Err(AppError::new(
                crate::error::ErrorCode::ModelDownloadFailed,
                "Outbound networking is blocked because Air-Gap Mode is active.",
            ));
        }
        let path = ctx.ports().models.ensure(&input.model_id).await?;
        let is_llm = input.model_id.as_str().contains("qwen") || input.model_id.as_str().contains("phi");
        if !is_llm {
            let engine = ctx.ports().engine.clone();
            tokio::task::spawn_blocking(move || engine.prepare())
                .await
                .map_err(|e| AppError::internal(e.to_string()))??;
        }
        Ok(path.to_string_lossy().into_owned())
    })
    .await
}

const DELETE: CommandSpec = CommandSpec::new("delete_model", CapabilityKey::Models).exclusive();

#[tauri::command]
#[specta::specta]
pub async fn delete_model(state: State<'_, AppState>, input: ModelIdInput) -> Result<(), AppError> {
    execute(&state, DELETE, input, |ctx, input| async move {
        ctx.ports().models.delete(&input.model_id).await
    })
    .await
}

const HARDWARE: CommandSpec = CommandSpec::new("get_hardware_profile", CapabilityKey::Models);

#[tauri::command]
#[specta::specta]
pub async fn get_hardware_profile(
    state: State<'_, AppState>,
) -> Result<crate::adapters::llm::HardwareProfile, AppError> {
    execute(&state, HARDWARE, (), |_ctx, ()| async move {
        Ok(crate::adapters::llm::HardwareDetector::detect())
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct TestVoiceTransformInput {
    pub text: String,
    pub instruction: Option<String>,
}

impl Validate for TestVoiceTransformInput {
    fn validate(&self) -> Result<(), String> {
        if self.text.trim().is_empty() {
            return Err("Text is required for transformation preview.".into());
        }
        Ok(())
    }
}

const TRANSFORM_TEST: CommandSpec = CommandSpec::new("test_voice_transform", CapabilityKey::Settings);

#[tauri::command]
#[specta::specta]
pub async fn test_voice_transform(
    state: State<'_, AppState>,
    input: TestVoiceTransformInput,
) -> Result<String, AppError> {
    execute(&state, TRANSFORM_TEST, input, |ctx, input| async move {
        let enhance_ctx = crate::ports::enhancer::EnhanceContext {
            llm_cleanup_enabled: true,
            voice_transforms_enabled: true,
            strip_fillers: true,
            custom_system_prompt: input.instruction.unwrap_or_default(),
            ..Default::default()
        };
        ctx.ports().enhancer.enhance(&input.text, &enhance_ctx)
    })
    .await
}

/**
 * SOURCE OF TRUTH KEYWORDS: RuleSandboxInput, RuleSandboxReport,
 *   preview_rule_pipeline, rule_order_request
 * WHAT:  Runs the DETERMINISTIC rule pipeline over pasted text and returns a
 *        before/after pair per rule, in the order that would execute.
 * WHY:   The preview sandbox is only useful if it runs the exact production
 *        code under the user's exact stored toggles — a re-implemented preview
 *        would drift the first time a rule changed. So this builds an
 *        EnhanceContext from the live settings (honouring any app-profile
 *        overrides, exactly as a session would), swaps in the REQUESTED order
 *        and code-mode flag for what-if previews, and calls the traced pass
 *        on the same port object delivery uses. The LLM enhancer is a
 *        different port implementation that delegates to these rules when LLM
 *        cleanup is off, but the sandbox is deliberately scoped to the
 *        deterministic rules: an LLM pass is neither free nor deterministic,
 *        and previewing it would make the diff a guess rather than a truth.
 *        Skipped (disabled) rules are reported with their metadata so the UI
 *        can say "off" instead of hiding the step.
 * WHERE: Called by the rule preview sandbox in Settings > Output & Typing.
 */
#[derive(Debug, Clone, serde::Deserialize, specta::Type)]
pub struct RuleSandboxInput {
    /// The raw transcript text to run through the pipeline.
    pub text: String,
    /**
     * The order to preview as snake_case RuleId slugs. None previews the
     * STORED order; an explicit list previews a what-if without saving it.
     */
    pub order: Option<Vec<String>>,
    /// Overrides the code-mode toggle so the casing rule can be previewed
    /// without flipping the real setting on.
    pub code_mode_override: Option<bool>,
    /// Same what-if for the opt-in profanity filter — off by default, so
    /// without an override the sandbox would never show it acting.
    pub profanity_filter_override: Option<bool>,
}

impl Validate for RuleSandboxInput {
    fn validate(&self) -> Result<(), String> {
        if self.text.trim().is_empty() {
            return Err("Paste some raw transcript text to preview.".into());
        }
        // Unknown slugs are tolerated by the pipeline itself; an OVERSIZED
        // order is not — bound the list so a pathological request cannot make
        // the pass quadratic in review.
        if let Some(order) = &self.order {
            if order.len() > 64 {
                return Err("That rule order is too long.".into());
            }
            for slug in order {
                if RuleId::from_slug(slug).is_none() {
                    return Err(format!("`{slug}` is not a rule."));
                }
            }
        }
        Ok(())
    }
}

/// The whole preview: the resolved order, every step, and the final text.
#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct RuleSandboxReport {
    /**
     * The full rule sequence the pass resolved to, in execution order —
     * the stored order merged with the canonical one, including rules that
     * are currently toggled off. This is the list the drag list displays and
     * persists; `steps` carries the skipped flags.
     */
    pub resolved_order: Vec<String>,
    pub steps: Vec<RuleStep>,
    pub final_text: String,
}

const SANDBOX: CommandSpec = CommandSpec::new("preview_rule_pipeline", CapabilityKey::Settings);

#[tauri::command]
#[specta::specta]
pub async fn preview_rule_pipeline(
    state: State<'_, AppState>,
    input: RuleSandboxInput,
) -> Result<RuleSandboxReport, AppError> {
    execute(&state, SANDBOX, input, |ctx, input| async move {
        // The same view a recording session would load, app profile included.
        let settings = crate::session::settings_view::SessionSettings::load(ctx.db());

        let language = Some(crate::types::LanguageCode("en".into()));
        let context = crate::ports::enhancer::EnhanceContext {
            language,
            dictionary: services::dictionary::enabled_entries(ctx.db()).unwrap_or_default(),
            strip_fillers: settings.strip_fillers,
            expand_spoken_commands: settings.spoken_commands,
            normalise_punctuation: settings.normalise_punctuation,
            capitalise_sentences: settings.capitalise_sentences,
            apply_corrections: settings.apply_corrections,
            expand_abbreviations: settings.expand_abbreviations,
            disabled_abbreviations: settings.disabled_abbreviations.clone(),
            normalise_numbers: settings.normalise_numbers,
            normalise_urls_and_paths: settings.normalise_urls_and_paths,
            code_mode: input.code_mode_override.unwrap_or(settings.code_mode),
            code_casing_style: settings.code_casing_style.clone(),
            profanity_filter: input
                .profanity_filter_override
                .unwrap_or(settings.profanity_filter),
            profanity_style: settings.profanity_style.clone(),
            rule_order: Some(input.order.unwrap_or_else(|| {
                settings.rule_order.clone().unwrap_or_default()
            })),
            trace_rules: true,
            ..Default::default()
        };

        let enhancer = RuleEnhancer::new();
        let traced = enhancer
            .enhance_with_trace(&input.text, &context)
            .map_err(|err| AppError::internal(err.to_string()))?;

        Ok(RuleSandboxReport {
            resolved_order: traced
                .steps
                .iter()
                .map(|step| step.rule.slug())
                .collect(),
            steps: traced.steps,
            final_text: traced.final_text,
        })
    })
    .await
}

