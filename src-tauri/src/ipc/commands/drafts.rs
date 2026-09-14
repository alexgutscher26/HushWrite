/*!
 * SOURCE OF TRUTH KEYWORDS: get_active_draft, save_draft,
 *   append_to_active_draft, set_active_draft_content, clear_active_draft,
 *   list_drafts, delete_draft
 * WHAT:  IPC commands for managing persistent dictation drafts across app restarts.
 * WHY:   Ensures drafts are retained in SQLite across crashes, restarts, and UI re-mounts.
 * WHERE: Consumed by the frontend draft panel / floating window and registered in ipc/bindings.rs.
 */

use tauri::State;

use crate::error::AppError;
use crate::ipc::context::AppState;
use crate::ipc::factory::{execute, CommandSpec, Validate};
use crate::registry::CapabilityKey;
use crate::services::drafts;
use crate::telemetry::now_ms;
use crate::types::numeric::TsNumber;
use crate::types::Draft;

const GET_ACTIVE: CommandSpec = CommandSpec::new("get_active_draft", CapabilityKey::Dictation);
const SAVE: CommandSpec = CommandSpec::new("save_draft", CapabilityKey::Dictation);
const APPEND: CommandSpec = CommandSpec::new("append_to_active_draft", CapabilityKey::Dictation);
const SET_CONTENT: CommandSpec =
    CommandSpec::new("set_active_draft_content", CapabilityKey::Dictation);
const CLEAR_ACTIVE: CommandSpec = CommandSpec::new("clear_active_draft", CapabilityKey::Dictation);
const LIST: CommandSpec = CommandSpec::new("list_drafts", CapabilityKey::Dictation);
const DELETE: CommandSpec = CommandSpec::new("delete_draft", CapabilityKey::Dictation);

#[tauri::command]
#[specta::specta]
pub async fn get_active_draft(state: State<'_, AppState>) -> Result<Option<Draft>, AppError> {
    execute(&state, GET_ACTIVE, (), |ctx, ()| async move {
        drafts::get_active_draft(ctx.db())
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct SaveDraftInput {
    pub draft: Draft,
}

impl Validate for SaveDraftInput {
    fn validate(&self) -> Result<(), String> {
        if self.draft.id.trim().is_empty() {
            return Err("Draft ID cannot be empty.".into());
        }
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn save_draft(
    input: SaveDraftInput,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    execute(&state, SAVE, input, |ctx, input| async move {
        drafts::save_draft(ctx.db(), &input.draft)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct AppendDraftInput {
    pub text: String,
    pub title: Option<String>,
}

impl Validate for AppendDraftInput {
    fn validate(&self) -> Result<(), String> {
        if self.text.is_empty() {
            return Err("Cannot append empty text to draft.".into());
        }
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn append_to_active_draft(
    input: AppendDraftInput,
    state: State<'_, AppState>,
) -> Result<Draft, AppError> {
    execute(&state, APPEND, input, |ctx, input| async move {
        drafts::append_to_active_draft(
            ctx.db(),
            &input.text,
            input.title.as_deref(),
            now_ms() as i64,
        )
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct SetDraftContentInput {
    pub content: String,
}

impl Validate for SetDraftContentInput {
    fn validate(&self) -> Result<(), String> {
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn set_active_draft_content(
    input: SetDraftContentInput,
    state: State<'_, AppState>,
) -> Result<Option<Draft>, AppError> {
    execute(&state, SET_CONTENT, input, |ctx, input| async move {
        drafts::set_active_draft_content(ctx.db(), &input.content, now_ms() as i64)
    })
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn clear_active_draft(state: State<'_, AppState>) -> Result<(), AppError> {
    execute(&state, CLEAR_ACTIVE, (), |ctx, ()| async move {
        drafts::clear_active_draft(ctx.db(), now_ms() as i64)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct ListDraftsInput {
    #[specta(type = TsNumber)]
    pub limit: i64,
}

impl Validate for ListDraftsInput {
    fn validate(&self) -> Result<(), String> {
        if self.limit <= 0 || self.limit > 500 {
            return Err("Limit must be between 1 and 500.".into());
        }
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn list_drafts(
    input: ListDraftsInput,
    state: State<'_, AppState>,
) -> Result<Vec<Draft>, AppError> {
    execute(&state, LIST, input, |ctx, input| async move {
        drafts::list_drafts(ctx.db(), input.limit as usize)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct DeleteDraftInput {
    pub id: String,
}

impl Validate for DeleteDraftInput {
    fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("Draft ID cannot be empty.".into());
        }
        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn delete_draft(
    input: DeleteDraftInput,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    execute(&state, DELETE, input, |ctx, input| async move {
        drafts::delete_draft(ctx.db(), &input.id)
    })
    .await
}
