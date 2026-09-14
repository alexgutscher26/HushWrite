/*!
 * SOURCE OF TRUTH KEYWORDS: list_history, search_history, get_history_entry,
 *   delete_history_entry, delete_history_entries, clear_history, purge_history,
 *   export_history, ListHistoryInput, DeleteHistoryEntriesInput, ExportFormat
 * WHAT:  Reading, searching, exporting, and pruning the local transcript history.
 * WHY:   Search and list are separate commands rather than one with an optional
 *        query, because they hit different indexes and a caller should have to
 *        choose. Retention is applied here rather than in the service, because
 *        "N days ago" is a business rule that needs the user's setting.
 * WHERE: Consumed by the History view.
 */

use tauri::State;

use crate::error::AppError;
use crate::ipc::context::AppState;
use crate::ipc::factory::{execute, CommandSpec, Validate};
use crate::registry::CapabilityKey;
use crate::services::sessions;
use crate::telemetry::now_ms;
use crate::types::numeric::TsNumber;
use crate::types::{SessionId, SessionSummary};

/// Bounded so a caller cannot ask for the whole table and stall the UI.
const MAX_PAGE: i64 = 500;

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct ListHistoryInput {
    #[specta(type = TsNumber)]
    pub limit: i64,
    #[specta(type = TsNumber)]
    pub offset: i64,
}

impl Validate for ListHistoryInput {
    fn validate(&self) -> Result<(), String> {
        if self.limit <= 0 || self.limit > MAX_PAGE {
            return Err(format!("Limit must be between 1 and {MAX_PAGE}."));
        }
        if self.offset < 0 {
            return Err("Offset cannot be negative.".into());
        }
        Ok(())
    }
}

const LIST: CommandSpec = CommandSpec::new("list_history", CapabilityKey::History);

#[tauri::command]
#[specta::specta]
pub async fn list_history(
    state: State<'_, AppState>,
    input: ListHistoryInput,
) -> Result<Vec<SessionSummary>, AppError> {
    execute(&state, LIST, input, |ctx, input| async move {
        sessions::list_sessions(ctx.db(), input.limit, input.offset)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct SearchHistoryInput {
    pub query: String,
    #[specta(type = TsNumber)]
    pub limit: i64,
}

impl Validate for SearchHistoryInput {
    fn validate(&self) -> Result<(), String> {
        if self.query.trim().is_empty() {
            return Err("Enter something to search for.".into());
        }
        if self.limit <= 0 || self.limit > MAX_PAGE {
            return Err(format!("Limit must be between 1 and {MAX_PAGE}."));
        }
        Ok(())
    }
}

const SEARCH: CommandSpec = CommandSpec::new("search_history", CapabilityKey::History);

#[tauri::command]
#[specta::specta]
pub async fn search_history(
    state: State<'_, AppState>,
    input: SearchHistoryInput,
) -> Result<Vec<SessionSummary>, AppError> {
    execute(&state, SEARCH, input, |ctx, input| async move {
        let query = sanitize_fts5_query(&input.query);
        sessions::search_sessions(ctx.db(), &query, input.limit)
    })
    .await
}

fn sanitize_fts5_query(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return "\"\"".to_string();
    }
    // If the user enclosed in quotes, keep as exact phrase query
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        let inside = &trimmed[1..trimmed.len() - 1];
        let escaped = inside.replace('"', "\"\"");
        return format!("\"{escaped}\"");
    }

    // Tokenize words, stripping syntax chars, and attach prefix wildcard `*`
    let tokens: Vec<String> = trimmed
        .split_whitespace()
        .filter_map(|word| {
            let clean: String = word
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '\'')
                .collect();
            if clean.is_empty() {
                None
            } else {
                let escaped = clean.replace('"', "\"\"");
                Some(format!("\"{escaped}\"*"))
            }
        })
        .collect();

    if tokens.is_empty() {
        format!("\"{}\"", trimmed.replace('"', "\"\""))
    } else {
        tokens.join(" ")
    }
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct SessionIdInput {
    pub id: SessionId,
}

impl Validate for SessionIdInput {
    fn validate(&self) -> Result<(), String> {
        if self.id.as_str().trim().is_empty() {
            return Err("A session id is required.".into());
        }
        Ok(())
    }
}

/**
 * WHAT:  One session by id.
 * WHY:   Returns the summary or a NotFound error, rather than an Option.
 *        Two reasons, and the second is the load-bearing one:
 *          - Asking for an id that does not exist is a real error the UI can
 *            already render, because AppError carries its own presentation.
 *          - specta INLINES `Option<SessionSummary>` in return position while
 *            it references `Vec<SessionSummary>`, so an Option here generated a
 *            second anonymous copy of the shape in TypeScript that had to be
 *            kept in step with the real one by hand. Naming the success type
 *            keeps one definition.
 * WHERE: Opening a single transcript from History.
 */
const GET: CommandSpec = CommandSpec::new("get_history_entry", CapabilityKey::History);

#[tauri::command]
#[specta::specta]
pub async fn get_history_entry(
    state: State<'_, AppState>,
    input: SessionIdInput,
) -> Result<SessionSummary, AppError> {
    execute(&state, GET, input, |ctx, input| async move {
        sessions::get_session(ctx.db(), &input.id)?
            .ok_or_else(|| AppError::not_found("That transcript"))
    })
    .await
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct SessionAudioResult {
    pub session_id: SessionId,
    pub has_audio: bool,
    pub audio_bytes: Option<Vec<u8>>,
}

const GET_AUDIO: CommandSpec = CommandSpec::new("get_history_audio", CapabilityKey::History);

#[tauri::command]
#[specta::specta]
pub async fn get_history_audio(
    state: State<'_, AppState>,
    input: SessionIdInput,
) -> Result<SessionAudioResult, AppError> {
    execute(&state, GET_AUDIO, input, |ctx, input| async move {
        let audio_path = ctx.paths().audio_dir.join(format!("{}.wav", input.id.as_str()));
        if audio_path.is_file() {
            match std::fs::read(&audio_path) {
                Ok(bytes) => Ok(SessionAudioResult {
                    session_id: input.id,
                    has_audio: true,
                    audio_bytes: Some(bytes),
                }),
                Err(err) => {
                    tracing::warn!(error = %err, path = %audio_path.display(), "could not read session audio file");
                    Ok(SessionAudioResult {
                        session_id: input.id,
                        has_audio: false,
                        audio_bytes: None,
                    })
                }
            }
        } else {
            Ok(SessionAudioResult {
                session_id: input.id,
                has_audio: false,
                audio_bytes: None,
            })
        }
    })
    .await
}

const DELETE: CommandSpec =
    CommandSpec::new("delete_history_entry", CapabilityKey::History).exclusive();

#[tauri::command]
#[specta::specta]
pub async fn delete_history_entry(
    state: State<'_, AppState>,
    input: SessionIdInput,
) -> Result<(), AppError> {
    execute(&state, DELETE, input, |ctx, input| async move {
        let audio_path = ctx.paths().audio_dir.join(format!("{}.wav", input.id.as_str()));
        if audio_path.exists() {
            let _ = std::fs::remove_file(audio_path);
        }
        sessions::delete_session(ctx.db(), &input.id)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct DeleteHistoryEntriesInput {
    pub ids: Vec<SessionId>,
}

impl Validate for DeleteHistoryEntriesInput {
    fn validate(&self) -> Result<(), String> {
        if self.ids.is_empty() {
            return Err("At least one session id must be provided.".into());
        }
        if self.ids.len() > MAX_PAGE as usize {
            return Err(format!(
                "Cannot delete more than {MAX_PAGE} sessions at once."
            ));
        }
        for id in &self.ids {
            if id.as_str().trim().is_empty() {
                return Err("Session ids cannot be empty.".into());
            }
        }
        Ok(())
    }
}

const DELETE_BATCH: CommandSpec =
    CommandSpec::new("delete_history_entries", CapabilityKey::History).exclusive();

#[tauri::command]
#[specta::specta]
pub async fn delete_history_entries(
    state: State<'_, AppState>,
    input: DeleteHistoryEntriesInput,
) -> Result<u32, AppError> {
    execute(&state, DELETE_BATCH, input, |ctx, input| async move {
        for id in &input.ids {
            let audio_path = ctx.paths().audio_dir.join(format!("{}.wav", id.as_str()));
            if audio_path.exists() {
                let _ = std::fs::remove_file(audio_path);
            }
        }
        Ok(sessions::delete_sessions(ctx.db(), &input.ids)? as u32)
    })
    .await
}

const CLEAR: CommandSpec = CommandSpec::new("clear_history", CapabilityKey::History).exclusive();

/// The privacy escape hatch. Deletes everything, immediately, with no tombstone.
#[tauri::command]
#[specta::specta]
pub async fn clear_history(state: State<'_, AppState>) -> Result<u32, AppError> {
    execute(&state, CLEAR, (), |ctx, ()| async move {
        if let Ok(entries) = std::fs::read_dir(&ctx.paths().audio_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().and_then(|e| e.to_str()) == Some("wav") {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
        let count = sessions::delete_all_sessions(ctx.db())? as u32;
        crate::services::audit::append(
            ctx.db(),
            crate::services::audit::AuditEntry {
                kind: crate::services::audit::AuditKind::HistoryCleared,
                duration_ms: None,
                outcome: Some(format!("deleted_{count}")),
                delivery: None,
            },
        );
        Ok(count)
    })
    .await
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct PurgeHistoryInput {
    /// 0 means keep everything forever.
    #[specta(type = TsNumber)]
    pub retention_days: i64,
}

impl Validate for PurgeHistoryInput {
    fn validate(&self) -> Result<(), String> {
        if self.retention_days < 0 {
            return Err("Retention cannot be negative.".into());
        }
        Ok(())
    }
}

const PURGE: CommandSpec = CommandSpec::new("purge_history", CapabilityKey::History).exclusive();

#[tauri::command]
#[specta::specta]
pub async fn purge_history(
    state: State<'_, AppState>,
    input: PurgeHistoryInput,
) -> Result<u32, AppError> {
    execute(&state, PURGE, input, |ctx, input| async move {
        if input.retention_days == 0 {
            return Ok(0);
        }
        let cutoff = now_ms() - input.retention_days * 24 * 60 * 60 * 1000;
        let old_ids: Vec<SessionId> = ctx.db().with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT id FROM sessions WHERE started_at < ?1")?;
            let rows = stmt.query_map([cutoff], |row| Ok(SessionId(row.get(0)?)))?;
            rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
        })?;
        for id in &old_ids {
            let audio_path = ctx.paths().audio_dir.join(format!("{}.wav", id.as_str()));
            if audio_path.exists() {
                let _ = std::fs::remove_file(audio_path);
            }
        }
        Ok(sessions::purge_older_than(ctx.db(), cutoff)? as u32)
    })
    .await
}

/**
 * SOURCE OF TRUTH KEYWORDS: export_history, ExportHistoryInput, ExportFormat,
 *   to_markdown, to_plaintext, to_csv
 * WHAT:  Serialises history to JSON, Markdown, CSV, or plain text and returns the
 *        content for the caller to save.
 * WHY:   It is the user's data and it stays that way — no lock-in was a stated
 *        non-negotiable, and an app that can only show you your transcripts has
 *        quietly become the only place they exist.
 *
 *        Returns the CONTENT rather than writing a file, so the save dialog
 *        stays where the user is and Rust never picks a path on their behalf.
 * WHERE: The export action in History.
 */
#[derive(Debug, Clone, Copy, serde::Deserialize, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExportFormat {
    Json,
    Markdown,
    PlainText,
    Csv,
}

#[derive(Debug, serde::Deserialize, specta::Type)]
pub struct ExportHistoryInput {
    pub format: ExportFormat,
}

impl Validate for ExportHistoryInput {
    fn validate(&self) -> Result<(), String> {
        Ok(())
    }
}

const EXPORT: CommandSpec = CommandSpec::new("export_history", CapabilityKey::History);

#[tauri::command]
#[specta::specta]
pub async fn export_history(
    state: State<'_, AppState>,
    input: ExportHistoryInput,
) -> Result<String, AppError> {
    execute(&state, EXPORT, input, |ctx, input| async move {
        // Exports everything, not a page. A partial export that looks complete
        // is worse than no export at all.
        let total = sessions::count_sessions(ctx.db())?;
        let all = sessions::list_sessions(ctx.db(), total.max(1), 0)?;

        Ok(match input.format {
            ExportFormat::Json => serde_json::to_string_pretty(&all)?,
            ExportFormat::Markdown => to_markdown(&all),
            ExportFormat::PlainText => to_plaintext(&all),
            ExportFormat::Csv => to_csv(&all),
        })
    })
    .await
}

fn to_markdown(sessions: &[SessionSummary]) -> String {
    let mut out = String::from("# HushWrite history\n\n");
    for session in sessions {
        out.push_str(&format!(
            "## {}\n\n_{} · {} words_\n\n{}\n\n",
            format_timestamp(session.started_at_ms),
            session.language.as_deref().unwrap_or("unknown"),
            session.word_count.unwrap_or(0),
            session.final_text.as_deref().unwrap_or("(no transcript)")
        ));
    }
    out
}

fn to_plaintext(sessions: &[SessionSummary]) -> String {
    sessions
        .iter()
        .filter_map(|session| session.final_text.as_deref())
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn to_csv(sessions: &[SessionSummary]) -> String {
    let mut out = String::from(
        "id,started_at_utc,ended_at_utc,outcome,duration_ms,language,engine_id,model_id,raw_text,final_text,word_count,app_bundle_id,delivery,error_code,error_message\n",
    );
    for s in sessions {
        let fields = [
            csv_escape(&s.id.0),
            csv_escape(&format_timestamp(s.started_at_ms)),
            csv_escape(&s.ended_at_ms.map(format_timestamp).unwrap_or_default()),
            csv_escape(s.outcome.as_str()),
            s.duration_ms.map(|d| d.to_string()).unwrap_or_default(),
            csv_escape(s.language.as_deref().unwrap_or_default()),
            csv_escape(&s.engine_id),
            csv_escape(&s.model_id),
            csv_escape(s.raw_text.as_deref().unwrap_or_default()),
            csv_escape(s.final_text.as_deref().unwrap_or_default()),
            s.word_count.map(|w| w.to_string()).unwrap_or_default(),
            csv_escape(s.app_bundle_id.as_deref().unwrap_or_default()),
            csv_escape(s.delivery.as_str()),
            csv_escape(s.error_code.as_deref().unwrap_or_default()),
            csv_escape(s.error_message.as_deref().unwrap_or_default()),
        ];
        out.push_str(&fields.join(","));
        out.push('\n');
    }
    out
}

fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// ISO-8601 in UTC. Deliberately not localised: an export is a data file, and a
/// locale-dependent timestamp in one is a problem for whoever reads it later.
fn format_timestamp(epoch_ms: i64) -> String {
    let secs = epoch_ms / 1000;
    let days = secs.div_euclid(86_400);
    let time_of_day = secs.rem_euclid(86_400);
    format!(
        "{} {:02}:{:02}:{:02} UTC",
        crate::ipc::commands::stats::civil_from_days_public(days),
        time_of_day / 3600,
        (time_of_day % 3600) / 60,
        time_of_day % 60
    )
}

#[cfg(test)]
mod export_tests {
    use super::*;
    use crate::types::{DeliveryKind, SessionOutcome};

    fn summary(text: &str) -> SessionSummary {
        SessionSummary {
            id: SessionId("s1".into()),
            started_at_ms: 1_700_000_000_000,
            ended_at_ms: Some(1_700_000_005_000),
            outcome: SessionOutcome::Delivered,
            duration_ms: Some(5000),
            language: Some("en".into()),
            engine_id: "whisper".into(),
            model_id: "turbo".into(),
            raw_text: Some(text.into()),
            final_text: Some(text.into()),
            word_count: Some(text.split_whitespace().count() as i64),
            app_bundle_id: None,
            delivery: DeliveryKind::Pasted,
            error_code: None,
            error_message: None,
        }
    }

    #[test]
    fn plaintext_contains_only_the_transcripts() {
        let out = to_plaintext(&[summary("hello there"), summary("second one")]);
        assert_eq!(out, "hello there\n\nsecond one");
    }

    #[test]
    fn markdown_carries_the_metadata_a_transcript_needs_to_be_useful() {
        let out = to_markdown(&[summary("hello there")]);
        assert!(out.contains("hello there"));
        assert!(out.contains("2 words"));
        assert!(out.contains("en"));
        assert!(out.contains("UTC"));
    }

    #[test]
    fn csv_escapes_and_formats_headers_and_rows() {
        let mut s = summary("hello, \"world\"\nnext line");
        s.id = SessionId("sess-1".into());
        let out = to_csv(&[s]);
        assert!(out.starts_with("id,started_at_utc,ended_at_utc,outcome,duration_ms"));
        assert!(out.contains("sess-1"));
        assert!(out.contains("\"hello, \"\"world\"\"\nnext line\""));
    }

    #[test]
    fn a_session_with_no_transcript_does_not_break_an_export() {
        let mut empty = summary("x");
        empty.final_text = None;
        assert!(to_markdown(&[empty.clone()]).contains("(no transcript)"));
        assert_eq!(to_plaintext(&[empty.clone()]), "");
        let csv = to_csv(&[empty]);
        assert!(csv.contains("s1"));
    }

    #[test]
    fn fts5_query_sanitizer_handles_terms_and_phrases() {
        assert_eq!(sanitize_fts5_query("hello world"), "\"hello\"* \"world\"*");
        assert_eq!(sanitize_fts5_query("\"hello world\""), "\"hello world\"");
        assert_eq!(
            sanitize_fts5_query("test's foo:bar"),
            "\"test's\"* \"foobar\"*"
        );
    }
}
