/**
 * SOURCE OF TRUTH KEYWORDS: TutorialStep, InteractiveTutorial, DictationPractice,
 *   filler-stripping, auto-paste-demo, wpm-summary
 * WHAT:  Interactive dictation tutorial for first-run onboarding:
 *        - Step 1: Speak a short messy thought (real hotkey or simulated voice)
 *        - Step 2: Show before/after post-processing diff (fillers stripped, sentences capitalized)
 *        - Step 3: Demonstrate paste into a dummy text field inside the onboarding window
 *        - Step 4: Show history entry preview with WPM summary and time saved
 *        - Always-accessible Skip button that persists completion and advances
 * WHERE: Mounted in Onboarding.tsx.
 */

import { useState } from "react";
import {
  Check,
  ChevronRight,
  Clipboard,
  FastForward,
  Flame,
  Mail,
  Mic,
  Sparkles,
  Terminal,
  Volume2,
  Wand2,
} from "lucide-react";
import { events, type HotkeyBinding } from "@/lib/bindings";
import { useTauriEvent } from "@/lib/use-event";
import { glyphsForBinding } from "@/lib/hotkey";
import type { DictationMode } from "@/lib/dictation-mode";
import { Keycap } from "@/components/global";
import { cn } from "@/lib/utils";

export interface TutorialStepProps {
  hotkey: HotkeyBinding | null;
  mode: DictationMode;
  onComplete: () => void;
  onSkip: () => void;
}

type Scenario = "email" | "commit";

interface ScenarioData {
  title: string;
  category: string;
  icon: typeof Mail;
  promptText: string;
  rawText: string;
  cleanText: string;
  strippedFillers: string[];
  dummyAppTitle: string;
  timeSavedSeconds: number;
  wpm: number;
}

const SCENARIOS: Record<Scenario, ScenarioData> = {
  email: {
    title: "Quick Team Email",
    category: "Communication",
    icon: Mail,
    promptText:
      "Um so hi team, like we just deployed the new voice engine and um please test it before tomorrow morning.",
    rawText:
      "Um so hi team, like we just deployed the new voice engine and um please test it before tomorrow morning.",
    cleanText:
      "Hi team,\n\nWe just deployed the new voice engine and please test it before tomorrow morning.",
    strippedFillers: ["Um", "like", "um"],
    dummyAppTitle: "✉️ New Message — Mail",
    timeSavedSeconds: 24,
    wpm: 185,
  },
  commit: {
    title: "Git Commit Message",
    category: "Engineering",
    icon: Terminal,
    promptText: "Uh basically fix the audio buffer race condition and uh add unit tests for it",
    rawText: "Uh basically fix the audio buffer race condition and uh add unit tests for it",
    cleanText: "fix: prevent audio buffer race condition and add unit tests",
    strippedFillers: ["Uh", "basically", "uh"],
    dummyAppTitle: "💻 Terminal — git commit",
    timeSavedSeconds: 19,
    wpm: 165,
  },
};

export function TutorialStep({ hotkey, mode, onComplete, onSkip }: TutorialStepProps) {
  const [scenario, setScenario] = useState<Scenario>("email");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [pastedText, setPastedText] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const activeScenario = SCENARIOS[scenario];

  // Listen for live hotkey dictation if user tests their real mic
  useTauriEvent(events.transcriptDelivered, () => {
    if (step === 1) {
      setStep(2);
    }
  });

  // Simulated paste typing effect in step 3
  const handleSimulatePaste = () => {
    setIsPasting(true);
    setPastedText("");
    const target = activeScenario.cleanText;
    let index = 0;
    const interval = setInterval(() => {
      index += 3;
      if (index >= target.length) {
        setPastedText(target);
        clearInterval(interval);
        setIsPasting(false);
        setPasteSuccess(true);
      } else {
        setPastedText(target.slice(0, index));
      }
    }, 20);
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* ── Tutorial Header & Skip Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-opaque-elevated">
            <Wand2 className="size-4" />
          </div>
          <div>
            <div className="text-body font-semibold text-text-primary">
              Interactive Dictation Practice
            </div>
            <div className="text-xs text-text-secondary">
              Step {step} of 4 •{" "}
              {step === 1 ? "Speak" : step === 2 ? "Clean" : step === 3 ? "Paste" : "Summary"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors"
        >
          <span>Skip tutorial</span>
          <FastForward className="size-3.5" />
        </button>
      </div>

      {/* ── Scenario Switcher ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl bg-surface-primary p-1 border border-border-subtle">
        {(["email", "commit"] as const).map((key) => {
          const item = SCENARIOS[key];
          const Icon = item.icon;
          const isActive = scenario === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setScenario(key);
                setPastedText("");
                setPasteSuccess(false);
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-surface-elevated text-text-primary shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Step 1: Speak a Short Messy Thought ─────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="rounded-xl border border-border-subtle bg-surface-primary p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-text-tertiary">
              <span>Read aloud with fillers allowed:</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Volume2 className="size-3" />
                Raw thoughts welcome
              </span>
            </div>
            <p className="text-body font-serif italic text-text-primary leading-relaxed bg-surface-elevated p-3 rounded-lg border border-border-subtle/60">
              "{activeScenario.promptText}"
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 py-1 text-center">
            {hotkey && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span>Press</span>
                <Keycap keys={glyphsForBinding(hotkey)} />
                <span>{mode === "push_to_talk" ? "and hold to speak" : "to dictate"}</span>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                }}
                className="flex-1 flex items-center justify-center gap-2 h-[var(--control-height)] rounded-input bg-text-primary text-opaque-elevated text-body font-medium hover:opacity-90 transition-opacity"
              >
                <Mic className="size-4" />
                <span>Simulate Voice Input</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Show Before/After Post-Processing Diff ────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="grid grid-cols-1 gap-3">
            {/* Before (Raw input with strikethroughs) */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                <span>BEFORE (Raw Voice Transcript)</span>
                <span className="text-[11px] font-normal text-amber-600 dark:text-amber-500">
                  3 fillers detected
                </span>
              </div>
              <p className="text-xs font-mono text-stone-700 dark:text-stone-300 leading-relaxed">
                {scenario === "email" ? (
                  <>
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[0]}
                    </span>{" "}
                    so hi team,{" "}
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[1]}
                    </span>{" "}
                    we just deployed the new voice engine and{" "}
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[2]}
                    </span>{" "}
                    please test it before tomorrow morning.
                  </>
                ) : (
                  <>
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[0]}
                    </span>{" "}
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[1]}
                    </span>{" "}
                    fix the audio buffer race condition and{" "}
                    <span className="line-through text-red-500 font-semibold bg-red-100/70 dark:bg-red-900/40 px-1 rounded">
                      {activeScenario.strippedFillers[2]}
                    </span>{" "}
                    add unit tests for it
                  </>
                )}
              </p>
            </div>

            {/* After (Clean and enhanced) */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  AFTER (Polished Output)
                </span>
                <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-500">
                  Ready for paste
                </span>
              </div>
              <p className="text-xs font-sans text-stone-900 dark:text-white font-medium leading-relaxed whitespace-pre-line">
                {activeScenario.cleanText}
              </p>
            </div>
          </div>

          {/* Rule tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-primary px-2 py-1 text-[11px] font-medium text-text-secondary border border-border-subtle">
              <Check className="size-3 text-emerald-500" />
              Fillers stripped ({activeScenario.strippedFillers.join(", ")})
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-primary px-2 py-1 text-[11px] font-medium text-text-secondary border border-border-subtle">
              <Check className="size-3 text-emerald-500" />
              Auto-capitalization
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-primary px-2 py-1 text-[11px] font-medium text-text-secondary border border-border-subtle">
              <Check className="size-3 text-emerald-500" />
              Punctuation normalised
            </span>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="flex items-center justify-center gap-2 h-[var(--control-height)] rounded-input bg-text-primary text-opaque-elevated text-body font-medium hover:opacity-90 transition-opacity mt-1"
          >
            <span>Next: Try Auto-Paste Demo</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Step 3: Demonstrate Paste into Dummy Field ──────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Dummy Target App Window */}
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-primary shadow-xs">
            {/* Titlebar */}
            <div className="flex items-center justify-between border-b border-border-subtle bg-surface-elevated px-3 py-2 text-xs font-medium text-text-secondary">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-red-400/80" />
                <div className="size-2.5 rounded-full bg-amber-400/80" />
                <div className="size-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 font-mono text-[11px]">{activeScenario.dummyAppTitle}</span>
              </div>
              <span className="text-[10px] text-text-tertiary">Active Focus</span>
            </div>

            {/* Editor Body */}
            <div className="min-h-24 p-3 bg-white dark:bg-stone-950 font-sans text-xs text-stone-900 dark:text-stone-100">
              {pastedText ? (
                <div className="whitespace-pre-line leading-relaxed">
                  {pastedText}
                  {isPasting && (
                    <span className="inline-block w-1.5 h-3.5 bg-stone-900 dark:bg-white ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-text-tertiary italic">
                  Cursor blinking in target text field...
                </div>
              )}
            </div>
          </div>

          {/* Paste control or status */}
          <div className="flex flex-col gap-2">
            {!pasteSuccess ? (
              <button
                type="button"
                onClick={handleSimulatePaste}
                disabled={isPasting}
                className="flex items-center justify-center gap-2 h-[var(--control-height)] rounded-input bg-text-primary text-opaque-elevated text-body font-medium hover:opacity-90 transition-opacity"
              >
                <Clipboard className="size-4" />
                <span>{isPasting ? "Pasting into active field…" : "Simulate Instant Paste"}</span>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                  <Check className="size-4" />
                  <span>Pasted via Accessibility API in 14ms!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center justify-center gap-2 h-[var(--control-height)] rounded-input bg-text-primary text-opaque-elevated text-body font-medium hover:opacity-90 transition-opacity"
                >
                  <span>Next: History & Speed Summary</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Show History Entry and WPM Summary ──────────────────── */}
      {step === 4 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-200">
          {/* History Preview Card */}
          <div className="rounded-xl border border-border-subtle bg-surface-primary p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle pb-2 mb-2.5">
              <span className="font-semibold text-text-primary">Recorded in History</span>
              <span className="text-[11px]">Just now</span>
            </div>

            <p className="text-xs text-text-primary font-medium leading-relaxed whitespace-pre-line mb-3">
              {activeScenario.cleanText}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle/60 text-center">
              <div className="rounded-lg bg-surface-elevated p-2">
                <div className="text-[11px] text-text-tertiary">Speaking Speed</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {activeScenario.wpm} WPM
                </div>
              </div>
              <div className="rounded-lg bg-surface-elevated p-2">
                <div className="text-[11px] text-text-tertiary">Typing Baseline</div>
                <div className="text-sm font-bold text-text-secondary">40 WPM</div>
              </div>
              <div className="rounded-lg bg-surface-elevated p-2">
                <div className="text-[11px] text-text-tertiary">Time Saved</div>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  +{activeScenario.timeSavedSeconds}s
                </div>
              </div>
            </div>
          </div>

          {/* Speed highlight banner */}
          <div className="flex items-center gap-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 p-3 text-xs text-purple-900 dark:text-purple-200">
            <Flame className="size-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              You speak <strong>4.6× faster</strong> than you type. HushWrite cleans up your
              thoughts so you never have to re-edit.
            </span>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="flex items-center justify-center gap-2 h-[var(--control-height)] rounded-input bg-text-primary text-opaque-elevated text-body font-medium hover:opacity-90 transition-opacity mt-1"
          >
            <span>Finish Practice & Continue</span>
            <Check className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
