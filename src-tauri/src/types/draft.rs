/*!
 * SOURCE OF TRUTH KEYWORDS: Draft, drafts, is_active
 * WHAT:  The domain type representing an accumulated or saved draft.
 * WHY:   Draft mode accumulates multiple recording sessions into a persistent
 *        buffer instead of pasting immediately. This type represents that
 *        buffer both in the database and across the IPC bridge to the frontend.
 * WHERE: Stored by services/drafts.rs; consumed by ipc/commands/drafts.rs.
 */

use serde::{Deserialize, Serialize};
use specta::Type;

use super::numeric::TsNumber;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Draft {
    pub id: String,
    pub title: Option<String>,
    pub content: String,
    #[specta(type = TsNumber)]
    pub created_at_ms: i64,
    #[specta(type = TsNumber)]
    pub updated_at_ms: i64,
    pub is_active: bool,
}
