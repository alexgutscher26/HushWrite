/**
 * SOURCE OF TRUTH KEYWORDS: Dashboard, HushWriteShell, navItems, useHashRoute,
 *   dictationHotkey, StatsView, HistoryView, SettingsView, ShortcutsModal, ChangelogModal
 * WHAT:  The dashboard shell redesigned with rich modern aesthetics:
 *        - Window bar with sidebar toggle, user avatar, bell
 *        - Expanded left sidebar (HushWrite branding, navigation items,
 *          team invite, free month, settings with badge, help)
 *        - Spacious rounded white canvas card hosting active views
 * WHERE: Mounted by src/entries/dashboard.tsx.
 */

import { useEffect, useMemo, useState } from "react";
import { emitTo } from "@tauri-apps/api/event";
import {
  Bell,
  User,
  WandSparkles,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  Gift,
  Copy,
} from "lucide-react";
import {
  commands,
  type HotkeyBinding,
  type NavDef,
  type RegistrySnapshot,
  type SettingValue,
} from "@/lib/bindings";
import { unwrapCommand, useCommand } from "@/lib/ipc";
import { usePlan } from "@/lib/plan";
import { useSettings } from "./use-settings";
import {
  ErrorBoundary,
  ErrorSurface,
  Skeleton,
  ScrollArea,
  ShortcutsModal,
  ChangelogModal,
} from "@/components/global";
import { BillingView } from "./billing";
import { navigateTo, useHashRoute } from "./use-hash-route";
import { dictationModeFrom, type DictationMode } from "@/lib/dictation-mode";
import { useTauriEvent } from "@/lib/use-event";
import { navSelectedChannel } from "@/lib/window-events";
import { useWindowBoundsPersistence } from "@/lib/window-state";
import { StatsView } from "./stats/StatsView";
import { HistoryView } from "./history/HistoryView";
import { SettingsView } from "./settings/SettingsView";
import { InsightsView } from "./insights/InsightsView";
import { DictionaryView } from "./dictionary/DictionaryView";
import { UpdateNotice } from "./_components/UpdateNotice";

/**
 * WHAT:  The user's dictation hotkey — their override if they have one, the
 *        registry's default otherwise.
 */
function dictationHotkey(
  registry: RegistrySnapshot,
  values: { [key in string]: SettingValue } | null,
): HotkeyBinding | null {
  for (const capability of registry.capabilities) {
    const hotkey = capability.hotkey;
    if (!hotkey) continue;
    const override = hotkey.setting_key ? values?.[hotkey.setting_key] : undefined;
    return override?.type === "HOTKEY" ? override.value : hotkey.default;
  }
  return null;
}

export function Dashboard() {
  useWindowBoundsPersistence();
  const registry = useCommand(commands.getRegistry, []);
  const settings = useSettings();
  const { route, section } = useHashRoute();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resumeCardDismissed, setResumeCardDismissed] = useState(false);
  const [referralDismissed, setReferralDismissed] = useState(false);
  const referralStatus = useCommand(commands.getReferralStatus, []);
  const { activateLicense } = usePlan();

  // Auto-activate license key if passed via URL or deep-link (?key=... or ?activate=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const incomingKey = params.get("key") || params.get("activate");
      if (incomingKey) {
        const ok = activateLicense(incomingKey);
        if (ok) {
          setToastMessage("Pro License activated successfully!");
        }
      }
    } catch {}
  }, [activateLicense]);

  const isOnboardingIncomplete = settings.data?.["general.onboarding_complete"]?.value !== true;
  const savedStepIndex =
    typeof settings.data?.["general.onboarding_step_index"]?.value === "number"
      ? (settings.data["general.onboarding_step_index"].value as number)
      : 0;
  const isAirGapped = settings.data?.["privacy.air_gap_mode"]?.value === true;

  useTauriEvent(navSelectedChannel, (payload) => {
    if (payload.route === "help") {
      setShowShortcuts(true);
    } else if (payload.route === "invite") {
      const url = referralStatus.data?.referral_url || "https://HushWrite.app/pricing";
      void unwrapCommand(() => commands.copyText({ text: url })).then(() =>
        showToast("Personal referral link copied to clipboard!"),
      );
    } else {
      navigateTo(payload.route);
    }
  });

  // Global dashboard keyboard shortcuts (Cmd/Ctrl + 1..4, and '?')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (!isInput && e.key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          navigateTo("dictation");
        } else if (e.key === "2") {
          e.preventDefault();
          navigateTo("insights");
        } else if (e.key === "3") {
          e.preventDefault();
          navigateTo("history");
        } else if (e.key === "4") {
          e.preventDefault();
          navigateTo("settings");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const navItems = useMemo<NavDef[]>(() => {
    const items = (registry.data?.capabilities ?? [])
      .map((capability) => capability.nav)
      .filter((nav): nav is NavDef => nav !== null);
    return items.sort((a, b) => a.order - b.order);
  }, [registry.data]);

  const metrics = useMemo(
    () => (registry.data?.capabilities ?? []).flatMap((capability) => capability.metrics),
    [registry.data],
  );

  // Known dashboard routes matching the sidebar navigation
  const knownRoutes = useMemo(
    () => new Set(["dictation", "insights", "dictionary", "settings", "billing"]),
    [],
  );

  // Active route fallback to "dictation" (or "stats")
  const activeRoute =
    route === "stats"
      ? "dictation"
      : knownRoutes.has(route) || navItems.some((item) => item.route === route)
        ? route
        : "dictation";

  // Synchronize route state with detached sidebar pill window
  useEffect(() => {
    void emitTo("sidebar", "nav-route-sync", { route: activeRoute });
  }, [activeRoute]);

  if (registry.error) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f4f2ee] dark:bg-[#141210]">
        <ErrorSurface error={registry.error} onRetry={registry.reload} />
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f4f2ee] text-stone-900 select-none dark:bg-[#141210] dark:text-stone-100">
      {/* ── Top Window Bar (Traffic-light / Window Controls) ─────────────── */}
      <header
        data-tauri-drag-region
        className="flex h-10 shrink-0 items-center justify-between px-3.5"
      >
        {/* Top Left: User profile */}
        <div data-tauri-drag-region={false} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => showToast("Alex's Personal Account")}
            title="User Account Profile — Signed in locally as Alex Gutscher"
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-white transition-colors cursor-pointer"
          >
            <User className="h-4 w-4" />
          </button>
        </div>

        {/* Top Center: Air Gap Isolation Badge */}
        <div data-tauri-drag-region={false} className="flex items-center gap-2.5">
          {isAirGapped && (
            <div
              title="Air-Gap & Hardware Isolation Active — All outbound networking, cloud telemetry, and auto-update pings are completely disabled."
              className="flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-xs dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Air-Gapped</span>
            </div>
          )}
        </div>

        {/* Top Right: Notifications */}
        <div data-tauri-drag-region={false} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowChangelog(true)}
            title="Changelog & Updates — View latest release notes, improvements, and feature updates"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main App Shell Body (Content Canvas) ─────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden px-3 pb-3">
        {/* ── Main Canvas (Rounded Card) ─────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-stone-200/70 bg-white shadow-xs dark:border-stone-800/80 dark:bg-[#1b1917] text-stone-900 dark:text-stone-100">
          {/* Adaptive Onboarding Re-entry Banner */}
          {isOnboardingIncomplete && !resumeCardDismissed && (
            <div className="flex items-center justify-between border-b border-amber-200/70 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 px-5 py-3 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 animate-in fade-in slide-in-from-top-1 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <WandSparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Finish Setting Up HushWrite
                    </span>
                    <span className="rounded-md bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      Step {savedStepIndex + 1} of 5
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                    You have incomplete onboarding steps. Resume where you left off to complete
                    guided practice.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void commands.openOnboardingWindow()}
                  title="Resume Guided Setup — Walk through permissions, model downloads, and audio calibration"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <span>Resume Setup</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setResumeCardDismissed(true)}
                  title="Dismiss onboarding banner — You can resume setup at any time from Settings"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Post-Activation Referral Trigger (After 50 Dictations) */}
          {referralStatus.data?.eligible && !referralDismissed && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 px-5 py-3 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 animate-in fade-in slide-in-from-top-1 shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      🎉 50 Dictations Milestone Reached!
                    </span>
                    <span className="rounded-md bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200 font-mono">
                      Referral Unlocked
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-tight mt-0.5">
                    You've built a solid local dictation habit. Invite colleagues or friends: they
                    get a welcome discount, and you unlock free Pro developer packs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (referralStatus.data?.referral_url) {
                      void unwrapCommand(() =>
                        commands.copyText({ text: referralStatus.data!.referral_url }),
                      ).then(() => showToast("Personal invite link copied to clipboard!"));
                    }
                  }}
                  title="Copy Personal Referral Link — Share with teammates and friends to unlock Pro developer features"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Invite Link</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setReferralDismissed(true);
                    await unwrapCommand(() => commands.dismissReferralPrompt());
                    referralStatus.reload();
                  }}
                  title="Dismiss referral notice — You can always find your referral link in the Invite & Earn sidebar menu"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <ErrorBoundary
            key={activeRoute}
            fallback={({ error, reset }) => (
              <ErrorSurface
                error={{
                  code: "INTERNAL",
                  message: "This view stopped working.",
                  recoverable: true,
                  action: { kind: "RETRY" },
                  detail: error.message,
                }}
                onRetry={reset}
              />
            )}
          >
            {registry.data ? (
              <View
                route={activeRoute}
                section={section}
                registry={registry.data}
                metrics={metrics}
                hotkey={dictationHotkey(registry.data, settings.data)}
                mode={dictationModeFrom(settings.data)}
              />
            ) : (
              <ScrollArea contentClassName="p-8">
                <Skeleton rows={6} />
              </ScrollArea>
            )}
          </ErrorBoundary>

          {/* ── Docked Update Notification & Release Notes ────────────────── */}
          <UpdateNotice />
        </main>
      </div>

      {/* ── Toast Feedback Notification ──────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-8 z-50 flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg dark:bg-stone-100 dark:text-stone-900 animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Global Modals ────────────────────────────────────────────────── */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
    </div>
  );
}

/** The one route-to-component table. Everything else about the nav is declared. */
function View({
  route,
  section,
  registry,
  metrics,
  hotkey,
  mode,
}: {
  route: string;
  section: string | null;
  registry: RegistrySnapshot;
  metrics: RegistrySnapshot["capabilities"][number]["metrics"];
  hotkey: HotkeyBinding | null;
  mode: DictationMode;
}) {
  switch (route) {
    case "dictation":
    case "stats":
      return <StatsView metrics={metrics} hotkey={hotkey} mode={mode} />;
    case "insights":
      return <InsightsView hotkey={hotkey} mode={mode} />;
    case "history":
      return <HistoryView hotkey={hotkey} mode={mode} />;
    case "settings":
      return <SettingsView registry={registry} section={section} />;
    case "billing":
      return <BillingView />;
    case "dictionary":
      return <DictionaryView />;
    default:
      return <StatsView metrics={metrics} hotkey={hotkey} mode={mode} />;
  }
}
