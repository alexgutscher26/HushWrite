/**
 * SOURCE OF TRUTH KEYWORDS: InviteStep, onboarding-finish, onboarding-complete,
 *   onboarding-summary, hotkey-reminder
 * WHAT:  The final screen of onboarding: celebratory completion screen,
 *        shortcut reminder, privacy assurance, and the button into the app.
 * WHY:   IT COMES AFTER SETUP, NOT BEFORE. Everything ahead of it is configuration;
 *        this screen reassures the user that everything is ready, reminds them of
 *        their chosen shortcut gesture, and launches them directly into everyday use.
 *
 *        CLEAR SHORTCUT RECALL. The user just tested their shortcut, but seeing it
 *        one more time in a calm, clear card anchors muscle memory before they leave
 *        onboarding.
 *
 *        ERROR HANDLING PRESERVED. Writing `onboarding_complete` can fail, and this
 *        screen owns the button that writes it. Onboarding's contract is that a failed
 *        write KEEPS THE WINDOW OPEN and says why rather than closing on a promise it
 *        did not keep — so the error has to surface here.
 * WHERE: Rendered by Onboarding after the hotkey test succeeds.
 */

import { ArrowRight, BookOpen, Laptop, ShieldCheck, Sparkles } from "lucide-react";
import type { AppError, HotkeyBinding } from "@/lib/bindings";
import type { DictationMode } from "@/lib/dictation-mode";
import { glyphsForBinding } from "@/lib/hotkey";
import { ErrorSurface, Keycap, Mark } from "@/components/global";
import { cn } from "@/lib/utils";

export interface InviteStepProps {
  onFinish: () => void;
  finishError: AppError | null;
  hotkey?: HotkeyBinding | null;
  mode?: DictationMode;
}

export function InviteStep({
  onFinish,
  finishError,
  hotkey = null,
  mode = "toggle",
}: InviteStepProps) {
  const isPushToTalk = mode === "push_to_talk";
  const hotkeyGlyphs = hotkey ? glyphsForBinding(hotkey) : null;

  return (
    <section className="flex h-full flex-col overflow-y-auto px-8">
      <div className="my-auto flex w-full max-w-md flex-col items-center gap-4 py-5 mx-auto">
        {/* Identity & Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Mark size="lg" label="HushWrite" />

          <div className="flex flex-col items-center gap-1 mt-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft/40 px-2.5 py-0.5 text-caption font-medium text-accent">
              <Sparkles className="size-3" />
              <span>Setup Complete</span>
            </div>
            <h1 className="text-title text-text-primary">You&rsquo;re all set!</h1>
            <p className="max-w-xs text-body text-text-secondary text-balance">
              HushWrite is running in the background and ready whenever you want to speak.
            </p>
          </div>
        </div>

        {/* Shortcut Quick Card */}
        <div className="hairline w-full rounded-card bg-sunken/40 p-3.5 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-label text-text-primary font-medium">
                Your Dictation Shortcut
              </span>
              <span className="text-caption text-text-secondary">
                {isPushToTalk
                  ? "Hold to speak, release to paste"
                  : "Press to start, press again to stop"}
              </span>
            </div>
            {hotkeyGlyphs && hotkeyGlyphs.length > 0 ? (
              <Keycap keys={hotkeyGlyphs} size="md" />
            ) : (
              <span className="text-caption font-mono text-text-tertiary">Default key</span>
            )}
          </div>
        </div>

        {/* Three core feature pillars */}
        <div className="grid w-full grid-cols-1 gap-2 text-left">
          <div className="flex items-start gap-3 rounded-card bg-sunken/20 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-input bg-sunken text-accent">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-label text-text-primary font-medium">
                100% On-Device &amp; Private
              </span>
              <span className="text-caption text-text-secondary">
                Audio is transcribed locally on your computer. Nothing is ever uploaded to the
                cloud.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-card bg-sunken/20 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-input bg-sunken text-accent">
              <Laptop className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-label text-text-primary font-medium">
                Transcribes Everywhere
              </span>
              <span className="text-caption text-text-secondary">
                Works instantly across all code editors, browsers, messaging apps, and notes.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-card bg-sunken/20 p-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-input bg-sunken text-accent">
              <BookOpen className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-label text-text-primary font-medium">Custom Vocabulary</span>
              <span className="text-caption text-text-secondary">
                Teach HushWrite custom acronyms, technical terms, and names in your Dictionary
                anytime.
              </span>
            </div>
          </div>
        </div>

        {/* Error Surface if finish fails */}
        {finishError ? (
          <div className="w-full">
            <ErrorSurface size="compact" error={finishError} onRetry={onFinish} />
          </div>
        ) : null}

        {/* Action Button */}
        <div className="flex w-full flex-col items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={onFinish}
            className={cn(
              "h-[var(--control-height)] w-full rounded-input px-6 text-body font-medium transition-all",
              "bg-text-primary text-opaque-elevated hover:opacity-90 active:scale-[0.99]",
              "flex items-center justify-center gap-2 cursor-pointer",
            )}
          >
            <span>Start using HushWrite</span>
            <ArrowRight className="size-4" />
          </button>
          <span className="text-caption text-text-tertiary text-center">
            Look for HushWrite in your menu bar or system tray anytime.
          </span>
        </div>
      </div>
    </section>
  );
}
