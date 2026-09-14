/**
 * SOURCE OF TRUTH KEYWORDS: QuickCorrectToast, InlineEditLearning, AlwaysCorrect
 * WHAT:  Floating prompt displayed when a user edits or corrects a recent transcription.
 * WHY:   Captures word corrections at the exact moment of frustration without requiring
 *        users to navigate deep into settings.
 * WHERE: Mounted globally or in floating overlay windows.
 */

import { useState, useCallback, useEffect } from "react";
import { Sparkles, Check, X, BookPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { commands } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";

export interface QuickCorrectToastProps {
  pattern: string;
  replacement: string;
  onDismiss: () => void;
  onAdded?: (pattern: string, replacement: string) => void;
  autoDismissMs?: number;
}

export function QuickCorrectToast({
  pattern,
  replacement,
  onDismiss,
  onAdded,
  autoDismissMs = 9000,
}: QuickCorrectToastProps) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (autoDismissMs > 0 && !added) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss, added]);

  const handleAlwaysCorrect = useCallback(async () => {
    try {
      await unwrapCommand(() =>
        commands.createDictionaryEntry({
          pattern: pattern.trim(),
          replacement: replacement.trim(),
          match_kind: "WORD",
        }),
      );
      setAdded(true);
      onAdded?.(pattern, replacement);
      setTimeout(onDismiss, 1400);
    } catch (e) {
      console.error("Failed to add dictionary entry", e);
      onDismiss();
    }
  }, [pattern, replacement, onDismiss, onAdded]);

  return (
    <div
      role="alert"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-card",
        "border border-hairline bg-surface/95 p-3.5 shadow-popover backdrop-blur-xl",
        "animate-in fade-in slide-in-from-bottom-3 duration-200 text-text-primary",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="size-4" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Murmur Learned a Correction
        </div>
        <div className="text-xs text-text-primary mt-0.5 truncate">
          <span className="line-through text-text-tertiary">{pattern}</span> ➔{" "}
          <strong className="text-accent">{replacement}</strong>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleAlwaysCorrect}
          disabled={added}
          className="flex h-7 items-center gap-1 rounded bg-accent px-2.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {added ? (
            <>
              <Check className="size-3.5" /> Saved
            </>
          ) : (
            <>
              <BookPlus className="size-3.5" /> Always Correct
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="Ignore"
          className="flex size-7 items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-sunken transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
