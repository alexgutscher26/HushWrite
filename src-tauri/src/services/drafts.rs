/*!
 * SOURCE OF TRUTH KEYWORDS: drafts, get_active_draft, save_draft,
 *   append_to_active_draft, clear_active_draft, list_drafts, delete_draft
 * WHAT:  Pure SQLite access to the drafts table.
 * WHY:   Draft mode accumulates text across dictation sessions rather than
 *        pasting immediately. Storing the active draft in SQLite ensures that
 *        app restarts, crashes, or reboots do not lose in-flight user drafts.
 * WHERE: Called by ipc/commands/drafts.rs and delivery worker if draft mode is active.
 */

use rusqlite::{params, Row};

use crate::db::Database;
use crate::error::AppResult;
use crate::types::Draft;

fn row_to_draft(row: &Row<'_>) -> rusqlite::Result<Draft> {
    Ok(Draft {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        created_at_ms: row.get(3)?,
        updated_at_ms: row.get(4)?,
        is_active: row.get::<_, i64>(5)? != 0,
    })
}

/// Retrieves the current active draft (most recently updated with is_active = 1).
pub fn get_active_draft(db: &Database) -> AppResult<Option<Draft>> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_active
             FROM drafts
             WHERE is_active = 1
             ORDER BY updated_at DESC
             LIMIT 1",
        )?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            Ok(Some(row_to_draft(row)?))
        } else {
            Ok(None)
        }
    })
}

/// Retrieves a specific draft by its ID.
pub fn get_draft(db: &Database, id: &str) -> AppResult<Option<Draft>> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_active
             FROM drafts
             WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(row_to_draft(row)?))
        } else {
            Ok(None)
        }
    })
}

/// Upserts a draft record into the database.
pub fn save_draft(db: &Database, draft: &Draft) -> AppResult<()> {
    db.with_connection(|conn| {
        conn.execute(
            "INSERT INTO drafts (id, title, content, created_at, updated_at, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT (id) DO UPDATE SET
                 title = excluded.title,
                 content = excluded.content,
                 updated_at = excluded.updated_at,
                 is_active = excluded.is_active",
            params![
                &draft.id,
                &draft.title,
                &draft.content,
                draft.created_at_ms,
                draft.updated_at_ms,
                if draft.is_active { 1 } else { 0 }
            ],
        )?;
        Ok(())
    })
}

/// Appends text to the current active draft or creates a new active draft if none exists.
pub fn append_to_active_draft(
    db: &Database,
    text: &str,
    title: Option<&str>,
    now_ms: i64,
) -> AppResult<Draft> {
    let existing = get_active_draft(db)?;
    let draft = match existing {
        Some(mut d) => {
            if !d.content.trim().is_empty() && !text.trim().is_empty() {
                // If appending a new paragraph or sentence, join cleanly with a space or newline
                if d.content.ends_with('\n') || text.starts_with('\n') {
                    d.content.push_str(text);
                } else if d.content.ends_with(' ') || text.starts_with(' ') {
                    d.content.push_str(text);
                } else {
                    d.content.push(' ');
                    d.content.push_str(text);
                }
            } else if d.content.trim().is_empty() {
                d.content = text.to_string();
            }
            if title.is_some() {
                d.title = title.map(|t| t.to_string());
            }
            d.updated_at_ms = now_ms;
            d
        }
        None => Draft {
            id: uuid::Uuid::new_v4().to_string(),
            title: title.map(|t| t.to_string()),
            content: text.to_string(),
            created_at_ms: now_ms,
            updated_at_ms: now_ms,
            is_active: true,
        },
    };

    save_draft(db, &draft)?;
    Ok(draft)
}

/// Overwrites the content of the active draft, or creates a new active draft if none exists.
pub fn set_active_draft_content(
    db: &Database,
    content: &str,
    now_ms: i64,
) -> AppResult<Option<Draft>> {
    let existing = get_active_draft(db)?;
    match existing {
        Some(mut d) => {
            d.content = content.to_string();
            d.updated_at_ms = now_ms;
            save_draft(db, &d)?;
            Ok(Some(d))
        }
        None => {
            if content.trim().is_empty() {
                Ok(None)
            } else {
                let d = Draft {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: None,
                    content: content.to_string(),
                    created_at_ms: now_ms,
                    updated_at_ms: now_ms,
                    is_active: true,
                };
                save_draft(db, &d)?;
                Ok(Some(d))
            }
        }
    }
}

/// Deactivates all currently active drafts (e.g. when a draft is sent or discarded).
pub fn clear_active_draft(db: &Database, now_ms: i64) -> AppResult<()> {
    db.with_connection(|conn| {
        conn.execute(
            "UPDATE drafts SET is_active = 0, updated_at = ?1 WHERE is_active = 1",
            params![now_ms],
        )?;
        Ok(())
    })
}

/// Lists recent drafts, ordered by most recently updated.
pub fn list_drafts(db: &Database, limit: usize) -> AppResult<Vec<Draft>> {
    db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, created_at, updated_at, is_active
             FROM drafts
             ORDER BY updated_at DESC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| row_to_draft(row))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    })
}

/// Deletes a draft by ID.
pub fn delete_draft(db: &Database, id: &str) -> AppResult<()> {
    db.with_connection(|conn| {
        conn.execute("DELETE FROM drafts WHERE id = ?1", params![id])?;
        Ok(())
    })
}

/// Deletes all drafts from SQLite (e.g. during a full user data wipe).
pub fn delete_all_drafts(db: &Database) -> AppResult<usize> {
    db.with_connection(|conn| {
        let count = conn.execute("DELETE FROM drafts", [])?;
        Ok(count)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Database {
        Database::open_in_memory().expect("open memory db")
    }

    #[test]
    fn draft_lifecycle_persists_and_restores() {
        let db = test_db();

        // 1. Initial state has no active draft
        assert_eq!(get_active_draft(&db).unwrap(), None);

        // 2. Append first sentence
        let d1 = append_to_active_draft(&db, "First thought dictated.", None, 1000).unwrap();
        assert_eq!(d1.content, "First thought dictated.");
        assert!(d1.is_active);

        // 3. Retrieve active draft
        let loaded = get_active_draft(&db).unwrap().expect("must exist");
        assert_eq!(loaded.id, d1.id);
        assert_eq!(loaded.content, "First thought dictated.");

        // 4. Append second sentence
        let d2 = append_to_active_draft(&db, "Second thought added.", None, 2000).unwrap();
        assert_eq!(d2.id, d1.id);
        assert_eq!(d2.content, "First thought dictated. Second thought added.");
        assert_eq!(d2.updated_at_ms, 2000);

        // 5. Clear active draft
        clear_active_draft(&db, 3000).unwrap();
        assert_eq!(get_active_draft(&db).unwrap(), None);

        // 6. The previous draft still exists in the history list
        let drafts = list_drafts(&db, 10).unwrap();
        assert_eq!(drafts.len(), 1);
        assert_eq!(drafts[0].id, d1.id);
        assert!(!drafts[0].is_active);

        // 7. Delete draft
        delete_draft(&db, &d1.id).unwrap();
        assert_eq!(list_drafts(&db, 10).unwrap().len(), 0);
    }
}
