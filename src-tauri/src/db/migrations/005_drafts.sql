-- SOURCE OF TRUTH KEYWORDS: drafts, schema_v5
-- WHAT:  The drafts table, storing active and saved drafts across app restarts.
-- WHY:   Draft mode accumulates recordings into a buffer instead of pasting
--        immediately. If the app restarts or crashes, in-memory buffers are
--        lost. Persisting to SQLite makes the draft buffer durable.
-- WHERE: Applied by db/migrations.rs when user_version < 5.

CREATE TABLE drafts (
    id         TEXT PRIMARY KEY,
    title      TEXT,
    content    TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_drafts_is_active ON drafts (is_active, updated_at DESC);
CREATE INDEX idx_drafts_updated_at ON drafts (updated_at DESC);
