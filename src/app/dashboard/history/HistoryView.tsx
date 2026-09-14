/**
 * SOURCE OF TRUTH KEYWORDS: HistoryView, useHistory, DataList, copySession,
 *   deleteHistoryEntry, deleteHistoryEntries, bulkDelete, copyText, search-debounce, HistoryRow
 * WHAT:  The history view: a virtualized, searchable list of past sessions,
 *        ⏎ to copy, delete per row, and multi-select bulk deletion.
 * WHY:   The list is the global DataList doing the generic half — window,
 *        ⌘F, arrow keys, ⏎ — while this file supplies only the row, the actions
 *        and the empty state. Search is handed to the SERVER (no `matches`
 *        prop): searching the pages that happen to be loaded would report "no
 *        results" for a session that exists, which is worse than no search.
 *        The query is debounced by the token rather than fired per keystroke,
 *        because each keystroke is a SQL LIKE across every row. Copying goes
 *        through the copy_text command rather than navigator.clipboard: the web
 *        API needs transient user activation and a permissive CSP, so a copy
 *        triggered by ⏎ on a keyboard-navigated row is exactly the case it
 *        refuses. Rust owns the guarantee, on the same path the paste pipeline
 *        already uses.
 * WHERE: Rendered by Dashboard.tsx for the registry's "history" route.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Play, Trash2, EyeOff } from "lucide-react";
import { commands, type AppError, type SessionSummary } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";
import { readDurationMs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DataList, EmptyState, ErrorSurface, Skeleton } from "@/components/global";
import type { HotkeyBinding } from "@/lib/bindings";
import type { DictationMode } from "@/lib/dictation-mode";
import { NoTranscriptionsYet } from "../_components/NoTranscriptionsYet";
import { ExportAction } from "./_components/ExportAction";
import { HistoryRow } from "./_components/HistoryRow";
import { SessionFeedback } from "./_components/SessionFeedback";
import { SessionPlaybackModal } from "./_components/SessionPlaybackModal";
import { useHistory } from "./use-history";

export interface HistoryViewProps {
  /** The dictation hotkey, for the empty state. Null while it is unknown. */
  hotkey: HotkeyBinding | null;
  mode: DictationMode;
}

const BUTTON_CLASS =
  "hairline h-8 shrink-0 rounded-input bg-sunken px-3 text-body text-text-primary transition-colors hover:bg-sunken-strong disabled:opacity-50";

function textOf(session: SessionSummary): string {
  return session.final_text ?? session.raw_text ?? "";
}

export function HistoryView({ hotkey, mode }: HistoryViewProps) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playbackSession, setPlaybackSession] = useState<SessionSummary | null>(null);
  const [exportError, setExportError] = useState<AppError | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState<"selected" | "all" | null>(null);
  const [incognito, setIncognito] = useState(() => {
    return localStorage.getItem("HushWrite_incognito") === "true";
  });

  const toggleIncognito = () => {
    setIncognito((prev) => {
      const next = !prev;
      localStorage.setItem("HushWrite_incognito", String(next));
      return next;
    });
  };

  const feed = useHistory(query);
  const copyTimer = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(input), readDurationMs("--search-debounce"));
    return () => window.clearTimeout(handle);
  }, [input]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setConfirmDelete(null);
  }, []);

  const toggleSelectAll = useCallback(() => {
    setConfirmDelete(null);
    if (selectedIds.size >= feed.items.length && feed.items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(feed.items.map((item) => item.id)));
    }
  }, [feed.items, selectedIds.size]);

  const copy = useCallback(
    (session: SessionSummary) => {
      if (selecting) {
        toggleSelect(session.id);
        return;
      }
      const text = textOf(session);
      if (text.length === 0) return;
      void unwrapCommand(() => commands.copyText({ text })).then((result) => {
        if (result.status !== "ok") return;
        setCopiedId(session.id);
        window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(
          () => setCopiedId(null),
          readDurationMs("--feedback-hold"),
        );
      });
    },
    [selecting, toggleSelect],
  );

  const remove = useCallback(
    (session: SessionSummary) => {
      void unwrapCommand(() => commands.deleteHistoryEntry({ id: session.id })).then((result) => {
        if (result.status === "ok") {
          feed.forget(session.id);
          setSelectedIds((prev) => {
            if (!prev.has(session.id)) return prev;
            const next = new Set(prev);
            next.delete(session.id);
            return next;
          });
        }
      });
    },
    [feed],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (confirmDelete !== "selected") {
      setConfirmDelete("selected");
      return;
    }
    const ids = Array.from(selectedIds);
    void unwrapCommand(() => commands.deleteHistoryEntries({ ids })).then((result) => {
      if (result.status === "ok") {
        feed.forgetMany(ids);
        setSelectedIds(new Set());
        setConfirmDelete(null);
      }
    });
  }, [confirmDelete, feed, selectedIds]);

  const deleteAll = useCallback(() => {
    if (confirmDelete !== "all") {
      setConfirmDelete("all");
      return;
    }
    void unwrapCommand(commands.clearHistory).then((result) => {
      if (result.status === "ok") {
        feed.clearAll();
        setSelectedIds(new Set());
        setSelecting(false);
        setConfirmDelete(null);
      }
    });
  }, [confirmDelete, feed]);

  if (feed.error && feed.items.length === 0) {
    return (
      <section className="flex h-full flex-col pt-[var(--page-header-height)]">
        <ErrorSurface error={feed.error} onRetry={feed.refresh} />
      </section>
    );
  }

  const allSelected = feed.items.length > 0 && selectedIds.size >= feed.items.length;

  return (
    /* Padded down past the overlaying page header rather than tucking under
       it: this page leads with DataList's toolbar, and a search field sliding
       beneath the title would be unusable rather than merely faded. The list
       below still fades at its own top edge. */
    <section className="flex h-full min-h-0 flex-col pt-[var(--page-header-height)]">
      {exportError ? <ErrorSurface size="compact" error={exportError} /> : null}
      {incognito && (
        <div className="mx-6 mb-2 flex items-center justify-between rounded-card bg-surface px-4 py-2.5 text-caption hairline">
          <div className="flex items-center gap-2 text-text-primary font-medium">
            <EyeOff className="size-4 text-warning" />
            <span>
              Incognito Mode Active: Dictations are delivered directly and immediately discarded.
              Zero transcripts are saved to disk.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleIncognito}
            className="text-[11px] font-semibold text-text-secondary hover:text-text-primary"
          >
            Turn off
          </button>
        </div>
      )}
      <DataList
        label="Transcription history"
        items={feed.items}
        getKey={(session) => session.id}
        onActivate={copy}
        onReachEnd={feed.loadMore}
        renderRow={({ item }) => (
          <HistoryRow
            session={item}
            selectable={selecting}
            selected={selectedIds.has(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
          />
        )}
        renderRowActions={({ item }) =>
          selecting ? null : (
            <span className="flex items-center gap-1">
              <SessionFeedback session={item} className="mr-0.5" />
              <button
                type="button"
                aria-label="Play session transcript"
                title="Play Recording — Listen to the recorded audio for this transcription"
                onClick={() => setPlaybackSession(item)}
                className="rounded-input p-1 text-text-secondary transition-colors hover:bg-sunken hover:text-text-primary cursor-pointer"
              >
                <Play className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Copy transcript"
                title="Copy Transcript (⏎) — Copy formatted text directly to clipboard"
                onClick={() => copy(item)}
                className="rounded-input p-1 text-text-secondary transition-colors hover:bg-sunken hover:text-text-primary cursor-pointer"
              >
                {copiedId === item.id ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Delete transcript"
                title="Delete Transcript — Permanently remove this entry and audio from local disk"
                onClick={() => remove(item)}
                className="rounded-input p-1 text-text-secondary transition-colors hover:bg-sunken hover:text-danger cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          )
        }
        search={{ query: input, onQueryChange: setInput, placeholder: "Search transcripts" }}
        toolbar={
          selecting ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                title={allSelected ? "Deselect all entries" : "Select all visible entries in history"}
                className={cn(BUTTON_CLASS, "cursor-pointer")}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <span className="text-caption text-text-secondary">{selectedIds.size} selected</span>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={deleteSelected}
                onBlur={() => {
                  if (confirmDelete === "selected") setConfirmDelete(null);
                }}
                title="Delete selected transcripts from local disk"
                className={cn(
                  BUTTON_CLASS,
                  "cursor-pointer",
                  confirmDelete === "selected"
                    ? "bg-danger text-opaque-elevated hover:bg-danger"
                    : "text-text-primary hover:text-danger",
                )}
              >
                {confirmDelete === "selected" ? `Delete ${selectedIds.size}` : "Delete selected"}
              </button>
              <button
                type="button"
                onClick={deleteAll}
                onBlur={() => {
                  if (confirmDelete === "all") setConfirmDelete(null);
                }}
                title="Clear entire transcription database"
                className={cn(
                  BUTTON_CLASS,
                  "cursor-pointer",
                  confirmDelete === "all"
                    ? "bg-danger text-opaque-elevated hover:bg-danger"
                    : "text-text-secondary hover:text-danger",
                )}
              >
                {confirmDelete === "all" ? "Delete all?" : "Delete all"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelecting(false);
                  setSelectedIds(new Set());
                  setConfirmDelete(null);
                }}
                title="Exit bulk selection mode"
                className={cn(BUTTON_CLASS, "text-text-secondary cursor-pointer")}
              >
                Done
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleIncognito}
                title="Zero-History Incognito Mode — Dictations are delivered directly and immediately discarded with zero transcripts or audio saved to disk"
                className={cn(
                  BUTTON_CLASS,
                  "flex items-center gap-1.5 cursor-pointer",
                  incognito
                    ? "bg-text-primary text-opaque-elevated hover:bg-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <EyeOff className="size-3.5" />
                <span>{incognito ? "Incognito On" : "Incognito"}</span>
              </button>
              <ExportAction onError={setExportError} />
              {feed.items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelecting(true)}
                  title="Bulk Selection — Select multiple transcripts for batch deletion or review"
                  className={cn(BUTTON_CLASS, "cursor-pointer")}
                >
                  Select
                </button>
              ) : null}
            </span>
          )
        }
        empty={
          !feed.loaded ? (
            <Skeleton rows={6} className="h-[var(--row-height)] rounded-none" />
          ) : (
            <NoTranscriptionsYet hotkey={hotkey} mode={mode} />
          )
        }
        noResults={
          <EmptyState headline="Nothing matches that" description="Try a shorter search." />
        }
        footer={
          feed.loading && feed.items.length > 0 ? (
            <Skeleton className="h-[var(--row-height)] rounded-none" />
          ) : null
        }
      />
      {playbackSession ? (
        <SessionPlaybackModal session={playbackSession} onClose={() => setPlaybackSession(null)} />
      ) : null}
    </section>
  );
}
