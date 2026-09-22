/**
 * SOURCE OF TRUTH KEYWORDS: RulePreviewSandbox, previewRulePipeline, rule_order,
 *   Reorder, drag-and-drop, rule priority, RuleSandboxReport, resolved_order
 * WHAT:  The rule preview sandbox: paste raw transcript text, see the
 *        deterministic rules transform it one by one with a word-level diff,
 *        and drag to reorder the pipeline. The order persists to the
 *        enhance.rule_order setting.
 * WHY:   Ordering is the design — whitespace before casing, dictionary before
 *        stutter removal — and the only way to build an intuition for why is to
 *        SEE each rule act on your own text. The sandbox runs the production
 *        backend pass (preview_rule_pipeline) rather than a re-implementation,
 *        so the preview can never drift from what a recording actually does.
 *        Previewing a drag before saving means a bad order is a what-if until
 *        the user says otherwise, and "Reset to default order" restores the
 *        canonical pipeline in one click. The list itself reads the RESOLVED
 *        order the backend returns — every rule, in execution sequence,
 *        including ones currently toggled off — so the drag list, the steps and
 *        the persisted slugs are all the same sequence.
 * WHERE: Mounted on Settings > Output & Typing; consumes bindings.ts types
 *        (RuleId, RulePreview, RuleSandboxReport) and the Reorder primitive
 *        from the app's existing framer-motion dependency.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FlaskConical,
  GripVertical,
  Lock,
  RotateCcw,
} from "lucide-react";
import { commands, type RuleId, type RulePreview, type RuleSandboxReport } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";
import { wordDiff, type DiffToken } from "@/lib/word-diff";
import { readDurationMs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** The rule that repairs our own chunking artefacts. Not draggable — see
 *  adapters/rules/order.rs, which pins it the same way. */
const PINNED_RULE: RuleId = "whitespace";

interface SampleText {
  label: string;
  text: string;
}

const SAMPLES: readonly SampleText[] = [
  {
    label: "Messy speech",
    text: "um so i was thinking we should ship it comma today",
  },
  {
    label: "URLs & numbers",
    text: "that costs twenty dollars on the third floor comma visit https colon slash slash github dot com",
  },
  {
    label: "Self-correction",
    text: "schedule the review for tuesday sorry i meant wednesday comma thanks",
  },
  {
    label: "Profanity",
    text: "that fucking deploy broke shit again comma damn it",
  },
];

const DEFAULT_ORDER: readonly RuleId[] = [
  "whitespace",
  "urls_and_paths",
  "spoken_commands",
  "code_casing",
  "fillers",
  "corrections",
  "dictionary",
  "stutters",
  "punctuation",
  "numbers",
  "casing",
  "abbreviations",
  "profanity",
  "terminal_stop",
];

const SAVE_DEBOUNCE_MS = 600;

interface DiffLineProps {
  tokens: readonly DiffToken[];
}

/** One rule's diff: the AFTER text with changes marked in place. */
function DiffLine({ tokens }: DiffLineProps) {
  return (
    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-stone-800 dark:text-stone-200">
      {tokens.map((token, index) =>
        token.kind === "same" ? (
          <span key={index}>{token.text}</span>
        ) : token.kind === "added" ? (
          <span
            key={index}
            className="rounded bg-emerald-500/15 px-0.5 font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {token.text}
          </span>
        ) : (
          <span
            key={index}
            className="rounded bg-red-500/10 px-0.5 text-red-600 line-through decoration-red-400/70 dark:text-red-400"
          >
            {token.text}
          </span>
        ),
      )}
    </p>
  );
}

interface StepRowProps {
  step: RulePreview;
  index: number;
}

/** One step of the rule-by-rule trace, with its diff. */
function StepRow({ step, index }: StepRowProps) {
  const tokens = useMemo(() => (step.skipped ? [] : wordDiff(step.before, step.after)), [step]);

  const changed = !step.skipped && tokens.some((token) => token.kind !== "same");

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        step.skipped
          ? "border-stone-200/60 bg-stone-50/50 dark:border-stone-800/60 dark:bg-stone-900/30"
          : "border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-stone-100 text-[10px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {index + 1}
          </span>
          <span
            className={cn(
              "truncate text-xs font-semibold",
              step.skipped
                ? "text-stone-400 dark:text-stone-500"
                : "text-stone-900 dark:text-stone-100",
            )}
          >
            {step.label}
          </span>
          {step.skipped && (
            <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:bg-stone-800/60 dark:text-stone-500">
              off
            </span>
          )}
          {!step.skipped && changed && (
            <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              changed
            </span>
          )}
        </div>
      </div>
      {!step.skipped && (
        <div className="mt-1.5">
          <DiffLine tokens={tokens} />
        </div>
      )}
    </div>
  );
}

interface RuleRowProps {
  rule: RuleId;
  label: string;
  description: string;
  skipped: boolean;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}

/**
 * One row of the drag list. Reorder handles the pointer work; the arrow
 * buttons are the keyboard and a11y path — a drag-only reorder excludes
 * anyone driving this UI without a mouse.
 */
function RuleRow({ rule, label, description, skipped, index, total, onMove }: RuleRowProps) {
  const controls = useDragControls();
  const pinned = rule === PINNED_RULE;

  return (
    <Reorder.Item
      value={rule}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-2.5 select-none",
        pinned
          ? "border-stone-200/60 bg-stone-50/60 dark:border-stone-800/60 dark:bg-stone-900/30"
          : "border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40",
      )}
    >
      {pinned ? (
        <span
          title="Whitespace always runs first — every later rule assumes single spaces."
          className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
        >
          <Lock className="size-3" />
        </span>
      ) : (
        <button
          type="button"
          onPointerDown={(event) => controls.start(event)}
          aria-label={`Drag to reorder ${label}`}
          className="mt-0.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-stone-300 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">{label}</span>
          {skipped && (
            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:bg-stone-800/60 dark:text-stone-500">
              off
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={pinned || index <= 1}
          aria-label={`Move ${label} up`}
          className="flex size-5 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={pinned || index >= total - 1}
          aria-label={`Move ${label} down`}
          className="flex size-5 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <ArrowDown className="size-3" />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function RulePreviewSandbox() {
  const [order, setOrder] = useState<RuleId[]>(() => [...DEFAULT_ORDER]);
  const [text, setText] = useState(SAMPLES[0].text);
  const [report, setReport] = useState<RuleSandboxReport | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [codeModePreview, setCodeModePreview] = useState(false);
  const [profanityPreview, setProfanityPreview] = useState(false);
  const previewSequence = useRef(0);

  /** The backend's view of the current order — rule metadata follows it. */
  const metadata = useMemo(() => {
    const byId = new Map<RuleId, RulePreview>();
    for (const step of report?.steps ?? []) {
      byId.set(step.rule, step);
    }
    // Before the first preview arrives, fall back to whatever the last report
    // said, then to nothing: the list still renders from `order` alone.
    return byId;
  }, [report]);

  const preview = useCallback(
    async (nextOrder: RuleId[], nextText: string) => {
      const sequence = previewSequence.current + 1;
      previewSequence.current = sequence;

      setPreviewing(true);
      setPreviewError(null);

      // The backend resolves (stored + canonical) into the full sequence; the
      // preview sends the current drag state as a what-if without saving it.
      const result = await unwrapCommand(() =>
        commands.previewRulePipeline({
          text: nextText,
          order: [...nextOrder],
          code_mode_override: codeModePreview ? true : null,
          profanity_filter_override: profanityPreview ? true : null,
        }),
      );

      // A stale answer — an older keystroke landing after a newer one — is
      // dropped, which is what useCommand does for one-shot commands.
      if (previewSequence.current !== sequence) return;
      setPreviewing(false);

      if (result.status === "error") {
        setPreviewError(result.error.message);
        return;
      }

      setReport(result.data);
    },
    [codeModePreview, profanityPreview],
  );

  // Debounced live preview: every keystroke and drag re-runs the pipeline
  // after the input settles, so the sandbox feels live without one IPC command
  // per keystroke or per drag frame. The stale-answer guard inside `preview`
  // drops anything an older run left in flight.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void preview(order, text);
    }, readDurationMs("--search-debounce"));
    return () => window.clearTimeout(handle);
  }, [order, text, preview]);

  /**
   * WHAT:  Persists the drag list to enhance.rule_order.
   * WHY:   Debounced rather than saved per drag: a drag is a gesture, and
   *        writing SQLite (plus a SettingsChanged fan-out) per frame of it
   *        turns reorder into a background hum. Skipped on mount — opening
   *        Settings must not write a default order over a stored one. The
   *        flash confirms the write landed; a failed write surfaces as an
   *        error line rather than as a silent save that never fires.
   */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        const result = await unwrapCommand(() =>
          commands.setSetting({
            key: "enhance.rule_order",
            value: { type: "TEXT", value: JSON.stringify(order) },
          }),
        );
        if (result.status === "ok") {
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 1600);
        } else {
          setPreviewError(result.error.message);
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [order]);

  /**
   * WHAT:  Applies a drag to the order state.
   * WHY:   A pure state update: preview and persistence are the debounced
   *        effects' business, so a drag frame can never fire an IPC command.
   *        The pinned rule is forced back to the top — the row has no drag
   *        handle, but other rows dragged past it would otherwise shift it.
   */
  const handleReorder = useCallback((next: RuleId[]) => {
    const withoutPinned = next.filter((rule) => rule !== PINNED_RULE);
    setOrder([PINNED_RULE, ...withoutPinned]);
  }, []);

  /** The keyboard/a11y path for a single move; same guarantees as a drag. */
  const handleMove = useCallback((from: number, to: number) => {
    setOrder((current) => {
      if (to < 1 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => {
    const canonical = [...DEFAULT_ORDER];
    setOrder(canonical);
    void preview(canonical, text);
    void unwrapCommand(() => commands.resetSetting({ key: "enhance.rule_order" }));
  }, [text, preview]);

  const totalChanged = useMemo(
    () =>
      (report?.steps ?? []).filter(
        (step) => !step.skipped && wordDiff(step.before, step.after).some((t) => t.kind !== "same"),
      ).length,
    [report],
  );

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800/80 dark:bg-stone-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <FlaskConical className="size-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
              Rule preview sandbox
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Paste raw transcript text and watch each enhancement rule act on it. Drag to reorder
              the pipeline — the order is saved as you arrange it.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetOrder}
          title="Restore the canonical pipeline order"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <RotateCcw className="size-3" />
          Reset to default order
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Input + drag list ─────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mr-1">
              Try:
            </span>
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setText(sample.text)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all cursor-pointer",
                  text === sample.text
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                    : "border-stone-200/70 bg-white/70 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400",
                )}
              >
                {sample.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCodeModePreview((on) => !on)}
              aria-pressed={codeModePreview}
              title="Preview with code-mode identifier casing on, without changing the real setting"
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all cursor-pointer",
                codeModePreview
                  ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                  : "border-stone-200/70 bg-white/70 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400",
              )}
            >
              code mode
            </button>
            <button
              type="button"
              onClick={() => setProfanityPreview((on) => !on)}
              aria-pressed={profanityPreview}
              title="Preview with the profanity filter on, without changing the real setting"
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all cursor-pointer",
                profanityPreview
                  ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                  : "border-stone-200/70 bg-white/70 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400",
              )}
            >
              profanity filter
            </button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="Paste raw transcript text, e.g. um so i was thinking we should ship it comma today"
            className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50/60 p-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-100"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Execution order
            </span>
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-300">
                <Check className="size-3" />
                Order saved
              </span>
            )}
          </div>

          <Reorder.Group
            axis="y"
            values={order}
            onReorder={handleReorder}
            className="space-y-1.5"
            as="ol"
          >
            {order.map((rule, index) => {
              const info = metadata.get(rule);
              return (
                <RuleRow
                  key={rule}
                  rule={rule}
                  label={info?.label ?? rule}
                  description={info?.description ?? ""}
                  skipped={info?.skipped ?? false}
                  index={index}
                  total={order.length}
                  onMove={handleMove}
                />
              );
            })}
          </Reorder.Group>
        </div>

        {/* ── Rule-by-rule trace ────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Rule by rule
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">
              {previewing
                ? "Running pipeline…"
                : `${totalChanged} rule${totalChanged === 1 ? "" : "s"} changed this text`}
            </span>
          </div>

          {previewError ? (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              {previewError}
            </div>
          ) : null}

          {report?.steps.map((step, index) => (
            <StepRow key={`${step.rule}-${index}`} step={step} index={index} />
          ))}

          {!report && !previewing && (
            <p className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400 dark:border-stone-700 dark:text-stone-500">
              Type or paste text to see the pipeline run.
            </p>
          )}

          {report && (
            <div className="mt-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Final output
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs font-medium text-stone-900 dark:text-stone-100">
                {report.final_text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
