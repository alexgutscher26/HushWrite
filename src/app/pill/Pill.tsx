/**
 * SOURCE OF TRUTH KEYWORDS: Pill, PillBody, SessionState, sessionStateChanged,
 *   VisibleState, PillTone, pill-width, window-is-the-pill
 * WHAT:  The overlay pill. Renders the 5-bar dynamic white audio visualizer,
 *        "Listening — hold" status or partial transcript, and the active hotkey badge.
 * WHERE: Mounted by src/entries/pill.tsx into the NSPanel window.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { commands, events, type SessionState } from "@/lib/bindings";
import { isTransientFailure } from "@/lib/errors";
import { useTauriEvent } from "@/lib/use-event";
import { unwrapCommand, useCommand } from "@/lib/ipc";
import { glyphsForBinding } from "@/lib/hotkey";
import { readDurationMs } from "@/lib/motion";
import { formatClock } from "@/lib/format";
import { getAccentConfig, type AccentColorId, type OverlayStyleId } from "@/lib/accent";
import { useElapsed } from "./use-elapsed";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { CountdownLine } from "@/components/global";
import { PillWaveform } from "./_components/PillWaveform";
import { PillConfetti } from "./_components/PillConfetti";

/** Every state that puts something on screen. IDLE is the window's business. */
type VisibleState = Exclude<SessionState, { kind: "IDLE" }>;

export function Pill() {
  /** The last state worth drawing. Never cleared — persists until window hides. */
  const [shown, setShown] = useState<VisibleState | null>({ kind: "ARMING" });
  /** Whether a session is actually running. */
  const [live, setLive] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState<string | null>(null);
  const [, setLastTranscript] = useState<string>("");
  const lastTranscriptRef = useRef("");
  const [backtrackNotice, setBacktrackNotice] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const previousKind = useRef<VisibleState["kind"] | null>(null);
  const backtrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (backtrackTimer.current) {
        clearTimeout(backtrackTimer.current);
      }
    };
  }, []);

  // Settings
  const settings = useCommand(commands.getSettings, []);
  useTauriEvent(events.settingsChanged, () => settings.reload());

  const opacitySetting = settings.data?.["ui.pill_opacity"];
  const pillOpacity =
    opacitySetting && opacitySetting.type === "NUMBER" && opacitySetting.value !== null
      ? opacitySetting.value / 100
      : 1.0;

  const isCompact =
    settings.data?.["ui.pill_compact"]?.type === "BOOL" &&
    settings.data["ui.pill_compact"].value === true;

  const overlayStyle = (
    settings.data?.["ui.overlay_style"]?.type === "CHOICE"
      ? settings.data["ui.overlay_style"].value
      : "floating_pill"
  ) as OverlayStyleId;

  const accentColor = (
    settings.data?.["ui.accent_color"]?.type === "CHOICE"
      ? settings.data["ui.accent_color"].value
      : "monochrome"
  ) as AccentColorId;

  const confettiEnabled =
    settings.data?.["ui.confetti_effect"]?.type !== "BOOL" ||
    settings.data["ui.confetti_effect"].value !== false;

  const accent = useMemo(() => getAccentConfig(accentColor), [accentColor]);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || "");

  const hotkeySetting = settings.data?.["dictation.hotkey"];
  const hotkeyLabel = useMemo(() => {
    if (hotkeySetting && hotkeySetting.type === "HOTKEY" && hotkeySetting.value) {
      const glyphs = glyphsForBinding(hotkeySetting.value);
      if (glyphs.length > 0) return glyphs.join("");
    }
    return isMac ? "fn" : "Alt";
  }, [hotkeySetting, isMac]);

  // First paint only. Every subsequent state arrives on the event.
  useEffect(() => {
    void unwrapCommand(commands.getSessionState).then((result) => {
      if (result.status !== "ok") return;
      const state = result.data;
      setLive(state.kind !== "IDLE");
      if (state.kind !== "IDLE") setShown(state);
    });
  }, []);

  useTauriEvent(events.sessionStateChanged, ({ state }) => {
    const wasLive = live;
    const isNowLive = state.kind !== "IDLE";
    setLive(isNowLive);

    if (wasLive && !isNowLive && confettiEnabled && overlayStyle !== "none") {
      setShowConfetti(true);
    }

    if (state.kind === "ARMING" || state.kind === "IDLE") {
      setPartialText(null);
      setLanguageCode(null);
      setBacktrackNotice(null);
    }
    if (state.kind !== "IDLE") setShown(state);
  });

  useTauriEvent(events.languageDetected, ({ code }) => {
    setLanguageCode(code.toLowerCase() === "en" || code.toLowerCase() === "auto" ? null : code);
  });

  useTauriEvent(events.partialTranscript, ({ text }) => {
    if (text.trim().length > 0) {
      setPartialText(text);
      lastTranscriptRef.current = text;
      setLastTranscript(text);
    } else {
      setPartialText(null);
    }
  });

  useTauriEvent(events.transcriptDelivered, ({ text }) => {
    if (text.trim().length > 0) {
      lastTranscriptRef.current = text;
      setLastTranscript(text);
    }
  });

  // The Windows subclass owns the native HMENU. Actions come back here so
  // Copy uses the same guarded clipboard command as the dashboard, while the
  // other entries can deep-link the dashboard without making the native layer
  // know about frontend routes.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void getCurrentWebviewWindow()
      .listen<string>("pill-context-action", (event) => {
        switch (event.payload) {
          case "copy_transcript": {
            const text = lastTranscriptRef.current;
            if (text) void unwrapCommand(() => commands.copyText({ text }));
            break;
          }
          case "open_history":
            void emitTo("dashboard", "nav-selected", { route: "history" });
            void getCurrentWebviewWindow().hide();
            break;
          case "open_settings":
            void emitTo("dashboard", "nav-selected", { route: "settings" });
            void getCurrentWebviewWindow().hide();
            break;
          case "dismiss":
            void getCurrentWebviewWindow().hide();
            break;
        }
      })
      .then((dispose) => {
        unlisten = dispose;
      });
    return () => unlisten?.();
  }, []);

  useTauriEvent(events.backtrackOccurred, ({ message }) => {
    setBacktrackNotice(message);
    if (backtrackTimer.current) {
      clearTimeout(backtrackTimer.current);
    }
    backtrackTimer.current = setTimeout(() => {
      setBacktrackNotice(null);
    }, 2200);
  });

  const kind = shown?.kind ?? null;
  const elapsedState =
    shown?.kind === "RECORDING" || shown?.kind === "CANCEL_PENDING" ? shown : null;
  const elapsedMs = elapsedState?.elapsed_ms ?? null;
  const recordingElapsedMs = useElapsed(elapsedMs);
  const languageBadge = languageCode && languageCode.length > 0
    ? languageCode.slice(0, 2).toUpperCase()
    : null;

  useEffect(() => {
    const previous = previousKind.current;
    previousKind.current = kind;
    if (previous !== "CANCEL_PENDING" || kind !== "RECORDING") return;
    setRefilling(true);
    const handle = window.setTimeout(
      () => setRefilling(false),
      readDurationMs("--motion-duration-medium"),
    );
    return () => window.clearTimeout(handle);
  }, [kind]);

  const handleKeepRecording = useCallback(() => {
    void unwrapCommand(commands.resumeRecording);
  }, []);

  const handlePillKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;

      if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }

      if (event.key === " ") {
        if (live) void unwrapCommand(commands.stopRecording);
        else void unwrapCommand(() => commands.startRecording({ mode: "TOGGLE" }));
      } else if (event.key === "Escape") {
        if (live) void unwrapCommand(commands.cancelRecording);
      } else if (event.key === "Enter" && live) {
        // Enter confirms the current recording and sends it for delivery.
        void unwrapCommand(commands.stopRecording);
      }
    },
    [live],
  );

  if (overlayStyle === "none" || !shown) return null;

  const failed = shown.kind === "FAILED";
  const showLine = shown.kind === "CANCEL_PENDING" || refilling;
  const isCompactActive = isCompact && !failed && !showLine;

  const announcement = (() => {
    if (!live) return "Dictation idle";
    if (shown.kind === "ARMING" || shown.kind === "RECORDING") return "Dictation listening";
    if (shown.kind === "CANCEL_PENDING") return "Cancelling dictation";
    if (shown.kind === "FAILED") return `Dictation error: ${shown.message}`;
    return "";
  })();

  // ── Style 3: Slim Notch Band ──────────────────────────────────────────
  if (overlayStyle === "notch_slim_band") {
    return (
      <div
        role="status"
        aria-live="polite"
        data-tauri-drag-region
        style={{ opacity: pillOpacity }}
        className="relative flex h-full w-full select-none cursor-default items-center justify-center overflow-hidden rounded-b-lg bg-[#18181b]/95 dark:bg-[#161618]/95 border-b border-x shadow-md backdrop-blur-2xl px-2"
      >
        <span className="sr-only">{announcement}</span>
        {languageBadge ? (
          <span
            title={`Detected language: ${languageCode}`}
            className="absolute right-1.5 top-1 rounded bg-white/10 px-1 text-[9px] font-semibold tracking-wide text-white/75"
          >
            {languageBadge}
          </span>
        ) : null}
        <div
          className="h-[3px] w-full rounded-full transition-all duration-150 animate-pulse"
          style={{
            backgroundColor: accent.primary,
            boxShadow: `0 0 10px ${accent.glow}`,
          }}
        />
        <PillConfetti
          active={showConfetti}
          accentId={accentColor}
          onComplete={() => setShowConfetti(false)}
        />
      </div>
    );
  }

  // ── Common Accent Styles ──────────────────────────────────────────────
  const dynamicBorder = accentColor === "monochrome" ? "border-white/15" : "";
  const dynamicGlow =
    accentColor === "monochrome"
      ? "shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_0.5px_0_rgba(255,255,255,0.2)]"
      : `shadow-[0_12px_36px_rgba(0,0,0,0.65),0_0_20px_${accent.bgGlow},inset_0_0.5px_0_rgba(255,255,255,0.2)]`;

  // ── Container Rounding & Border by Style ──────────────────────────────
  const styleClasses = (() => {
    switch (overlayStyle) {
      case "notch":
        return "rounded-b-[20px] border-b border-x border-t-0 pt-1 pb-1.5 px-3.5";
      case "notch_drop_pill":
        return "rounded-full border px-3.5 mt-1";
      case "floating_pill":
      default:
        return "rounded-full border px-3.5";
    }
  })();

  return (
    <div
      role="group"
      aria-label="Dictation pill. Press Space to start or stop, Escape to cancel, or Enter to deliver."
      aria-live="polite"
      tabIndex={0}
      onKeyDown={handlePillKeyDown}
      data-tauri-drag-region
      style={{
        opacity: pillOpacity,
        borderColor: accentColor !== "monochrome" ? accent.border : undefined,
      }}
      className={cn(
        "relative flex h-full w-full select-none cursor-default items-center justify-between",
        "bg-[#18181b]/95 dark:bg-[#161618]/95 text-white",
        dynamicBorder,
        dynamicGlow,
        styleClasses,
        "backdrop-blur-2xl transition-all duration-150 overflow-hidden",
        isCompactActive ? "justify-center px-2" : "gap-2.5",
      )}
    >
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      {languageBadge ? (
        <span
          title={`Detected language: ${languageCode}`}
          className="absolute right-1.5 top-0.5 z-10 rounded bg-white/10 px-1 text-[9px] font-semibold tracking-wide text-white/75"
        >
          {languageBadge}
        </span>
      ) : null}

      {/* Celebratory Confetti Burst */}
      <PillConfetti
        active={showConfetti}
        accentId={accentColor}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Left side: Dynamic audio visualizer with accent color */}
      <PillWaveform accentId={accentColor} />
      {elapsedState ? (
        <span
          aria-label={`Recording time ${formatClock(recordingElapsedMs)}`}
          className="shrink-0 text-[11px] font-mono tabular-nums text-white/65"
        >
          {formatClock(recordingElapsedMs)}
        </span>
      ) : null}

      {/* Center: status, live speech snippet, or countdown */}
      {isCompactActive ? null : (
        <div className="flex-1 min-w-0 flex items-center justify-start pl-1">
          <PillBody
            state={shown}
            showLine={showLine}
            refilling={refilling}
            partialText={partialText}
            backtrackNotice={backtrackNotice}
            onKeepRecording={handleKeepRecording}
            accentPrimary={accentColor !== "monochrome" ? accent.primary : undefined}
          />
        </div>
      )}

      {/* Right side: Keycap badge */}
      {isCompactActive || failed ? null : (
        <div
          style={{
            borderColor: accentColor !== "monochrome" ? accent.border : undefined,
            color: accentColor !== "monochrome" ? accent.secondary : undefined,
          }}
          className="shrink-0 flex items-center justify-center rounded-[6px] bg-white/[0.12] border border-white/20 px-2 py-0.5 text-[11px] font-mono font-medium text-white/95 shadow-xs"
        >
          {hotkeyLabel}
        </div>
      )}
    </div>
  );
}

function TranscriptTicker({
  text,
  accentPrimary,
}: {
  text: string;
  accentPrimary?: string;
}) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (viewport && content) setOverflowing(content.scrollWidth > viewport.clientWidth + 1);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    return () => observer?.disconnect();
  }, [text]);

  return (
    <span
      ref={viewportRef}
      style={{ color: accentPrimary }}
      className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[13px] font-medium text-white/90 select-none animate-in fade-in duration-150 [container-type:inline-size]"
    >
      <span
        ref={contentRef}
        className={cn(
          "inline-block whitespace-nowrap",
          overflowing && "pill-transcript-ticker",
        )}
      >
        {text}
      </span>
    </span>
  );
}

function PillBody({
  state,
  showLine,
  refilling,
  partialText,
  backtrackNotice,
  onKeepRecording,
  accentPrimary,
}: {
  state: VisibleState;
  showLine: boolean;
  refilling: boolean;
  partialText: string | null;
  backtrackNotice: string | null;
  onKeepRecording: () => void;
  accentPrimary?: string;
}) {
  if (showLine) {
    const remainingMs = state.kind === "CANCEL_PENDING" ? state.remaining_ms : 0;
    const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-[11px] text-neutral-300 tabular-nums">
          {refilling ? "Resuming…" : `Cancelling in ${secondsLeft}…`}
        </span>
        <CountdownLine
          className="min-w-0 flex-1"
          remainingMs={remainingMs}
          state={refilling ? "refilling" : "draining"}
          label={`Cancelling in ${secondsLeft} seconds`}
        />
        <button
          type="button"
          data-tauri-drag-region={false}
          onClick={onKeepRecording}
          aria-label="Keep recording"
          className="shrink-0 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white transition-colors"
        >
          Keep
        </button>
      </div>
    );
  }

  switch (state.kind) {
    case "ARMING":
    case "RECORDING": {
      const isNearLimit = state.kind === "RECORDING" && state.elapsed_ms >= 110_000;
      const limitCountdown = isNearLimit ? Math.max(1, Math.ceil((120_000 - state.elapsed_ms) / 1000)) : null;

      if (limitCountdown !== null) {
        return (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 animate-in fade-in duration-150">
            <span className="shrink-0 text-[11px] font-mono font-medium text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded-full tabular-nums animate-pulse">
              {limitCountdown}s
            </span>
            <span
              style={{ color: accentPrimary }}
              className="min-w-0 flex-1 overflow-hidden text-[13px] font-medium text-white/90 select-none"
            >
              {partialText ? (
                <TranscriptTicker text={partialText} />
              ) : (
                "Listening…"
              )}
            </span>
          </div>
        );
      }

      if (backtrackNotice) {
        return (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 animate-in fade-in duration-150">
            <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <RotateCcw className="h-2 w-2" />
            </span>
            <span className="truncate text-[12px] font-medium text-amber-400">
              {backtrackNotice}
            </span>
          </div>
        );
      }
      if (partialText) {
        return <TranscriptTicker text={partialText} accentPrimary={accentPrimary} />;
      }
      return (
        <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-neutral-200 tracking-[-0.01em] whitespace-nowrap">
          Listening — hold
        </span>
      );
    }
    case "CANCEL_PENDING":
      return <span className="flex-1" />;
    case "FAILED":
      return (
        <span
          className={cn(
            "min-w-0 flex-1 text-[12px] truncate",
            isTransientFailure(state.code) ? "text-neutral-400" : "text-red-400 font-medium",
          )}
        >
          {state.message}
        </span>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
