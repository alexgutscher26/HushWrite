/**
 * SOURCE OF TRUTH KEYWORDS: SessionFeedback, ThumbsUp, ThumbsDown,
 *   LocalQualityFeedback, ZeroTelemetryFeedback
 * WHAT:  In-app thumbs-up / thumbs-down user feedback widget for transcription sessions.
 * WHY:   Empowers users to score transcription fidelity on-device, annotate errors
 *        (misheard terms, formatting slips, noise artifacts), and feed corrections
 *        into their local custom vocabulary without any telemetry or cloud leaks.
 * WHERE: Rendered in HistoryView row actions and SessionPlaybackModal footer.
 */

import { useState, useCallback, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Check, BookPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/lib/bindings";

export type FeedbackRating = "positive" | "negative" | null;
export type FeedbackReason = "misheard_words" | "missing_punctuation" | "noise_artifact" | "formatting";

export interface SessionFeedbackData {
  rating: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;
  timestamp: number;
}

const FEEDBACK_STORAGE_KEY = "HushWrite_session_feedback";

export function getStoredFeedback(sessionId: string): SessionFeedbackData | null {
  try {
    const raw = localStorage.getItem(`${FEEDBACK_STORAGE_KEY}_${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredFeedback(sessionId: string, data: SessionFeedbackData): void {
  try {
    localStorage.setItem(`${FEEDBACK_STORAGE_KEY}_${sessionId}`, JSON.stringify(data));
  } catch {
    // Local storage quota or security error fallback
  }
}

export interface SessionFeedbackProps {
  session: SessionSummary;
  className?: string;
  onFeedbackChange?: (rating: FeedbackRating) => void;
}

export function SessionFeedback({ session, className, onFeedbackChange }: SessionFeedbackProps) {
  const [feedback, setFeedback] = useState<SessionFeedbackData | null>(() => getStoredFeedback(session.id));
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [wordAdded, setWordAdded] = useState(false);

  useEffect(() => {
    setFeedback(getStoredFeedback(session.id));
  }, [session.id]);

  const handleRate = useCallback(
    (rating: "positive" | "negative") => {
      const isToggleOff = feedback?.rating === rating;
      const nextData: SessionFeedbackData = {
        rating: isToggleOff ? null : rating,
        timestamp: Date.now(),
      };

      if (isToggleOff) {
        setFeedback(null);
        localStorage.removeItem(`${FEEDBACK_STORAGE_KEY}_${session.id}`);
        setShowReasonPicker(false);
        onFeedbackChange?.(null);
      } else {
        setFeedback(nextData);
        saveStoredFeedback(session.id, nextData);
        onFeedbackChange?.(rating);
        if (rating === "negative") {
          setShowReasonPicker(true);
        } else {
          setShowReasonPicker(false);
        }
      }
    },
    [feedback, session.id, onFeedbackChange]
  );

  const handleSelectReason = useCallback(
    (reason: FeedbackReason) => {
      const updated: SessionFeedbackData = {
        rating: "negative",
        reason,
        timestamp: Date.now(),
      };
      setFeedback(updated);
      saveStoredFeedback(session.id, updated);
      setShowReasonPicker(false);
    },
    [session.id]
  );

  const handleAddCustomWord = useCallback(() => {
    if (!customWord.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem("HushWrite_custom_vocabulary") || "[]");
      if (!existing.includes(customWord.trim())) {
        existing.push(customWord.trim());
        localStorage.setItem("HushWrite_custom_vocabulary", JSON.stringify(existing));
      }
      setWordAdded(true);
      setTimeout(() => {
        setWordAdded(false);
        setCustomWord("");
        setShowReasonPicker(false);
      }, 1200);
    } catch {
      // ignore
    }
  }, [customWord]);

  return (
    <div className={cn("relative inline-flex items-center gap-0.5", className)}>
      <button
        type="button"
        title="Accurate Transcription — Rate this local transcription as high fidelity"
        aria-label="Good transcription"
        onClick={(e) => {
          e.stopPropagation();
          handleRate("positive");
        }}
        className={cn(
          "rounded p-1 transition-colors cursor-pointer",
          feedback?.rating === "positive"
            ? "text-success bg-success/15"
            : "text-text-tertiary hover:text-text-secondary hover:bg-sunken"
        )}
      >
        <ThumbsUp className="size-3.5" />
      </button>

      <button
        type="button"
        title="Transcription Issues — Flag misheard terms, punctuation, or add custom words to your dictionary"
        aria-label="Poor transcription"
        onClick={(e) => {
          e.stopPropagation();
          handleRate("negative");
        }}
        className={cn(
          "rounded p-1 transition-colors cursor-pointer",
          feedback?.rating === "negative"
            ? "text-warning bg-warning/15"
            : "text-text-tertiary hover:text-text-secondary hover:bg-sunken"
        )}
      >
        <ThumbsDown className="size-3.5" />
      </button>

      {/* Popover feedback reason picker */}
      {showReasonPicker && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-card border border-hairline bg-surface p-2.5 shadow-popover backdrop-blur-md"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-hairline">
            <span className="text-[11px] font-semibold text-text-primary">What could be better?</span>
            <button
              type="button"
              onClick={() => setShowReasonPicker(false)}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleSelectReason("misheard_words")}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sunken",
                feedback?.reason === "misheard_words" ? "font-semibold text-accent" : "text-text-secondary"
              )}
            >
              Misheard domain / technical words
            </button>
            <button
              type="button"
              onClick={() => handleSelectReason("missing_punctuation")}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sunken",
                feedback?.reason === "missing_punctuation" ? "font-semibold text-accent" : "text-text-secondary"
              )}
            >
              Missing or unnatural punctuation
            </button>
            <button
              type="button"
              onClick={() => handleSelectReason("noise_artifact")}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sunken",
                feedback?.reason === "noise_artifact" ? "font-semibold text-accent" : "text-text-secondary"
              )}
            >
              Hallucinated noise / echo
            </button>
            <button
              type="button"
              onClick={() => handleSelectReason("formatting")}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors hover:bg-sunken",
                feedback?.reason === "formatting" ? "font-semibold text-accent" : "text-text-secondary"
              )}
            >
              Paragraphing / capitalization issue
            </button>
          </div>

          {/* Quick Add Word to Local Vocabulary */}
          <div className="mt-2.5 pt-2 border-t border-hairline">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
              Add word to local dictionary
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customWord}
                placeholder="e.g. PyTorch, CRISPR"
                onChange={(e) => setCustomWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomWord();
                }}
                className="h-7 w-full rounded border border-hairline bg-sunken px-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomWord}
                disabled={!customWord.trim()}
                className="flex h-7 shrink-0 items-center justify-center rounded bg-accent px-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {wordAdded ? <Check className="size-3.5" /> : <BookPlus className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
