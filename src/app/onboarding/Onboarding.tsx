/**
 * SOURCE OF TRUTH KEYWORDS: Onboarding, OnboardingStep, usePermissions,
 *   checkPermissions, listModels, modelStateChanged, defaultModel, StepShell
 * WHAT:  The first-run flow: a three-slide tour of what the app does, then
 *        permissions, then the model, then a real hotkey test, and finally an
 *        invitation that asks for nothing.
 * WHY:   The tour comes first because the operator asked for the app to teach
 *        before it asks: a permission dialog is a strange first thing to meet,
 *        and someone who has been shown what the app does has a reason to grant
 *        it. Past the tour, the step is DERIVED from what the backend reports,
 *        never advanced by a counter — permission granted, model ready, session delivered. So a user
 *        who already granted microphone access skips that screen, and one who
 *        quits mid-download returns to exactly where they were rather than to
 *        step one. Only the microphone blocks progress: accessibility merely
 *        degrades paste to clipboard-only, so gating on it would be inventing a
 *        requirement the app does not have. The model's live state is applied
 *        here rather than inside the model step, because it is what decides
 *        whether the flow ADVANCES: a model on disk but unverified reports
 *        Verifying and only flips to Ready when the background hash check
 *        finishes, so a step listening on its own would update its own display
 *        and leave the user stuck on it forever. Finishing writes
 *        general.onboarding_complete and only then closes the window: the Rust
 *        side gates this window on that setting at launch, so closing without
 *        it would reopen onboarding on the next start with everything already
 *        done. A failed write therefore keeps the window open and says why,
 *        rather than closing on a promise it did not keep.
 * WHERE: Mounted by src/entries/onboarding.tsx. Steps live in ./_components.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  commands,
  events,
  type AppError,
  type HotkeyBinding,
  type ModelReport,
  type ModelState,
} from "@/lib/bindings";
import { unwrapCommand, useCommand } from "@/lib/ipc";
import { useTauriEvent } from "@/lib/use-event";
import { ErrorSurface } from "@/components/global";
import { StepShell } from "./_components/StepShell";
import { usePermissions } from "@/lib/use-permissions";
import { dictationModeFrom } from "@/lib/dictation-mode";
import { PermissionStep } from "./_components/PermissionStep";
import { ModelStep } from "./_components/ModelStep";
import { HotkeyStep } from "./_components/HotkeyStep";
import { TourStep } from "./_components/TourStep";
import { InviteStep } from "./_components/InviteStep";
import { TutorialStep } from "./_components/TutorialStep";
import { OverlayStep } from "./_components/OverlayStep";

function PasteCalibrationStep({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [delay, setDelay] = useState<number | null>(null);

  const calibrate = async () => {
    setRunning(true);
    const result = await unwrapCommand(() => commands.calibratePasteDelay());
    setRunning(false);
    if (result.status === "ok") setDelay(result.data);
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="rounded-input border border-border-subtle bg-surface-primary p-4">
        <p className="text-body font-medium text-text-primary">Tune paste timing for this app</p>
        <p className="mt-1 text-caption text-text-secondary">
          Focus an editable field, then let HushWrite measure how quickly Ctrl+V is accepted.
        </p>
      </div>
      {delay !== null ? (
        <div className="flex items-center gap-2 rounded-input bg-emerald-50 p-3 text-caption text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Timer className="size-4" /> Measured {delay} ms for the frontmost app.
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-input px-3 py-1.5 text-caption text-text-secondary hover:text-text-primary">Skip</button>
        <button type="button" onClick={delay === null ? calibrate : onDone} disabled={running} className="rounded-input bg-text-primary px-4 py-1.5 text-body font-medium text-opaque-elevated disabled:opacity-50">
          {running ? "Measuring…" : delay === null ? "Measure Ctrl+V" : "Continue"}
        </button>
      </div>
    </div>
  );
}

/** Declared by the Onboarding capability in the registry. Named here because
 *  "which setting means first run is over" is a contract between the two
 *  windows, and it is the only settings key the frontend has to know. */
const ONBOARDING_COMPLETE_KEY = "general.onboarding_complete";
const ONBOARDING_STEP_INDEX_KEY = "general.onboarding_step_index";
const TUTORIAL_COMPLETE_KEY = "general.tutorial_complete";

function pickModel(models: readonly ModelReport[]): ModelReport | null {
  return models.find((model) => model.descriptor.is_default) ?? models[0] ?? null;
}

function dictationHotkey(hotkeys: readonly (HotkeyBinding | null)[]): HotkeyBinding | null {
  return hotkeys.find((binding): binding is HotkeyBinding => binding !== null) ?? null;
}

export function Onboarding() {
  const permissions = usePermissions();
  const models = useCommand(commands.listModels, []);
  const registry = useCommand(commands.getRegistry, []);
  // Read rather than assumed: every screen here that teaches the gesture has to
  // match dictation.mode, or it teaches the wrong one. No live subscription —
  // nothing changes settings during first run.
  const settings = useCommand(commands.getSettings, []);

  const savedStepIndex =
    typeof settings.data?.[ONBOARDING_STEP_INDEX_KEY]?.value === "number"
      ? (settings.data[ONBOARDING_STEP_INDEX_KEY].value as number)
      : 0;
  const savedTutorialComplete = settings.data?.[TUTORIAL_COMPLETE_KEY]?.value === true;

  // Adaptive re-entry: state initialized or restored from saved registry settings
  const [toured, setToured] = useState(false);
  const [overlayChosen, setOverlayChosen] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [pasteCalibrated, setPasteCalibrated] = useState(false);
  const [tested, setTested] = useState(false);
  const [invited, setInvited] = useState(false);
  const [finishError, setFinishError] = useState<AppError | null>(null);
  const [liveStates, setLiveStates] = useState<Readonly<Record<string, ModelState>>>({});

  useEffect(() => {
    if (savedStepIndex >= 1) {
      setToured(true);
    }
    if (savedStepIndex >= 4) {
      setOverlayChosen(true);
    }
    if (savedTutorialComplete || savedStepIndex >= 5) {
      setTutorialDone(true);
    }
    if (savedStepIndex >= 6) {
      setPasteCalibrated(true);
    }
    if (savedStepIndex >= 7) {
      setTested(true);
      setInvited(true);
    }
  }, [savedStepIndex, savedTutorialComplete]);

  const persistStep = useCallback((stepIdx: number) => {
    void unwrapCommand(() =>
      commands.setSetting({
        key: ONBOARDING_STEP_INDEX_KEY,
        value: { type: "NUMBER", value: stepIdx },
      }),
    );
  }, []);

  useTauriEvent(events.modelStateChanged, (payload) => {
    setLiveStates((current) => ({ ...current, [payload.model_id]: payload.state }));
  });

  const micGranted =
    permissions.data?.find((report) => report.permission === "MICROPHONE")?.state === "GRANTED";
  const model = useMemo(() => {
    const picked = pickModel(models.data ?? []);
    if (!picked) return null;
    return { ...picked, state: liveStates[picked.descriptor.id] ?? picked.state };
  }, [liveStates, models.data]);
  const modelReady = model?.state.kind === "READY";

  const mode = dictationModeFrom(settings.data);

  const hotkey = dictationHotkey(
    (registry.data?.capabilities ?? []).map((capability) => capability.hotkey?.default ?? null),
  );

  const handleOverlayDone = useCallback(() => {
    setOverlayChosen(true);
    persistStep(4);
  }, [persistStep]);

  const handleTutorialDone = useCallback(() => {
    setTutorialDone(true);
    void unwrapCommand(() =>
      commands.setSetting({ key: TUTORIAL_COMPLETE_KEY, value: { type: "BOOL", value: true } }),
    );
    persistStep(5);
  }, [persistStep]);

  const finish = useCallback(() => {
    void unwrapCommand(() =>
      commands.setSetting({ key: ONBOARDING_COMPLETE_KEY, value: { type: "BOOL", value: true } }),
    ).then((result) => {
      if (result.status === "error") {
        setFinishError(result.error);
        return;
      }
      persistStep(7);
      void getCurrentWindow().close();
    });
  }, [persistStep]);

  const error = permissions.error ?? models.error ?? registry.error;

  return (
    <div className="h-full">
      <div data-tauri-drag-region className="h-[var(--titlebar-height)]" />
      {error ? (
        <ErrorSurface
          error={error}
          onRetry={() => {
            permissions.reload();
            models.reload();
            registry.reload();
          }}
        />
      ) : invited ? (
        <InviteStep onFinish={finish} finishError={finishError} hotkey={hotkey} mode={mode} />
      ) : !toured ? (
        <TourStep
          hotkey={hotkey}
          mode={mode}
          onDone={() => {
            setToured(true);
            persistStep(1);
          }}
        />
      ) : !micGranted ? (
        <StepShell
          title="Two permissions"
          description="HushWrite runs entirely on your Mac. It needs the microphone to hear you, and accessibility to paste for you."
        >
          <PermissionStep
            reports={permissions.data ?? []}
            onChanged={() => {
              permissions.reload();
              persistStep(2);
            }}
          />
        </StepShell>
      ) : !modelReady && model ? (
        <StepShell
          title="One model to download"
          description="This runs on your machine, so the model lives on your disk. It is downloaded once."
        >
          <ModelStep
            model={model}
            onChanged={() => {
              models.reload();
              persistStep(3);
            }}
          />
        </StepShell>
      ) : !overlayChosen ? (
        <StepShell
          title="Choose your overlay style"
          description="Pick how HushWrite looks on screen during dictation. You can change this anytime in Settings."
        >
          <OverlayStep onDone={handleOverlayDone} />
        </StepShell>
      ) : !tutorialDone ? (
        <StepShell
          title="Guided Practice"
          description="Practice dictating a messy thought and watch HushWrite turn it into clean formatted text."
        >
          <TutorialStep
            hotkey={hotkey}
            mode={mode}
            onComplete={handleTutorialDone}
            onSkip={handleTutorialDone}
          />
        </StepShell>
      ) : !pasteCalibrated ? (
        <StepShell
          title="Tune paste timing"
          description="One quick measurement helps each app receive your dictation at the right speed."
        >
          <PasteCalibrationStep
            onDone={() => {
              setPasteCalibrated(true);
              persistStep(6);
            }}
          />
        </StepShell>
      ) : (
        <StepShell
          title="Try it"
          description={
            mode === "push_to_talk"
              ? "Hold the hotkey anywhere, say something, and let go."
              : "Press the hotkey anywhere, say something, and press it again."
          }
          action={
            tested ? (
              <button
                type="button"
                onClick={() => {
                  setInvited(true);
                  persistStep(7);
                }}
                className="h-[var(--control-height)] rounded-input bg-text-primary px-4 text-body font-medium text-opaque-elevated transition-opacity hover:opacity-90"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInvited(true);
                  persistStep(7);
                }}
                className="h-[var(--control-height)] rounded-input px-3 text-caption text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
              >
                Skip for now
              </button>
            )
          }
        >
          <HotkeyStep
            hotkey={hotkey}
            mode={mode}
            onDelivered={() => {
              setTested(true);
              persistStep(5);
            }}
          />
        </StepShell>
      )}
    </div>
  );
}
