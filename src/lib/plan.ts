/**
 * SOURCE OF TRUTH KEYWORDS: PlanTier, usePlan, canUseTurboModel, canUseContextEngine, canUseFillerStripper, canUseVoiceSnippets, canUseTeamDictionarySync, checkRemoteLicenseStatus
 * WHAT:  Single source of truth for plan licensing, subscription validation, and feature gating in the HushWrite desktop app.
 * WHY:   Centralizes tier capabilities (Starter vs Pro vs Team) and synchronizes subscription cancellations/renewals with Stripe while preserving 100% offline privacy for perpetual Lifetime licenses.
 * WHERE: Consumed by BillingView, SettingsView, model selectors, and enhancement settings.
 */

import { useSyncExternalStore } from "react";
import { commands } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";

export type PlanTier = "starter" | "pro" | "team";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "lifetime";

export interface PlanState {
  tier: PlanTier;
  isTrial: boolean;
  trialExpiresAt: number | null; // timestamp ms
  licenseKey: string | null;
  subscriptionStatus?: SubscriptionStatus;
  expiresAt?: number | null; // timestamp ms
  lastVerifiedAt?: number | null; // timestamp ms
}

export interface SubscriptionCheckResult {
  valid: boolean;
  tier: PlanTier;
  isLifetime: boolean;
  status: SubscriptionStatus | "expired" | "unknown";
  expiresAt: number | null;
  message: string;
}

const STORAGE_KEY = "HushWrite.license_plan";

const DEFAULT_STATE: PlanState = {
  tier: "starter",
  isTrial: false,
  trialExpiresAt: null,
  licenseKey: null,
  subscriptionStatus: undefined,
  expiresAt: null,
  lastVerifiedAt: null,
};

let memoryState: PlanState = DEFAULT_STATE;
const listeners = new Set<() => void>();

function getStoredState(): PlanState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: PlanState = JSON.parse(raw);

    // Verify trial expiry
    if (parsed.isTrial && parsed.trialExpiresAt && Date.now() > parsed.trialExpiresAt) {
      return { ...parsed, tier: "starter", isTrial: false };
    }

    // Verify annual subscription expiry if recorded
    if (
      parsed.tier !== "starter" &&
      parsed.subscriptionStatus !== "lifetime" &&
      parsed.expiresAt &&
      Date.now() > parsed.expiresAt
    ) {
      return {
        ...parsed,
        tier: "starter",
        subscriptionStatus: "canceled",
      };
    }

    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(next: PlanState) {
  memoryState = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("HushWrite-plan-changed", { detail: next }));
    } catch {}
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memoryState = getStoredState();
      listener();
    }
  };
  const handleCustom = () => {
    memoryState = getStoredState();
    listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener("HushWrite-plan-changed", handleCustom);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("HushWrite-plan-changed", handleCustom);
    }
  };
}

function getSnapshot(): PlanState {
  if (typeof window !== "undefined" && memoryState === DEFAULT_STATE) {
    memoryState = getStoredState();
  }
  return memoryState;
}

/** Automatically activates the settings features unlocked by Pro upon license activation or trial start */
async function unlockProFeatures() {
  try {
    // 1. Enable automatic filler word stripping (flagship Pro benefit)
    void unwrapCommand(() =>
      commands.setSetting({
        key: "enhance.strip_fillers",
        value: { type: "BOOL", value: true },
      }),
    );
    // 2. Enable spoken formatting commands
    void unwrapCommand(() =>
      commands.setSetting({
        key: "enhance.spoken_commands",
        value: { type: "BOOL", value: true },
      }),
    );
    // 3. Enable common abbreviation expansions
    void unwrapCommand(() =>
      commands.setSetting({
        key: "enhance.expand_abbreviations",
        value: { type: "BOOL", value: true },
      }),
    );
    // 4. If Large v3 Turbo or Medium is already downloaded, activate it
    const modelsResult = await unwrapCommand(commands.listModels);
    if (modelsResult.status === "ok") {
      const turbo = modelsResult.data.find(
        (m) => m.descriptor.id === "large-v3-turbo" && m.state.kind === "READY",
      );
      if (turbo) {
        void unwrapCommand(() =>
          commands.setSetting({
            key: "transcription.model",
            value: { type: "CHOICE", value: "large-v3-turbo" },
          }),
        );
      } else {
        const medium = modelsResult.data.find(
          (m) => m.descriptor.id === "medium-q5_0" && m.state.kind === "READY",
        );
        if (medium) {
          void unwrapCommand(() =>
            commands.setSetting({
              key: "transcription.model",
              value: { type: "CHOICE", value: "medium-q5_0" },
            }),
          );
        }
      }
    }
  } catch {}
}

/**
 * Checks subscription validity against the license API endpoint.
 * Respects air-gap / offline mode gracefully: Lifetime licenses never query network.
 */
export async function checkRemoteLicenseStatus(key: string): Promise<SubscriptionCheckResult> {
  const cleanKey = key.trim().toUpperCase();

  // 1. Lifetime licenses are perpetual and strictly offline
  if (cleanKey.startsWith("LIFETIME-") || cleanKey.startsWith("FOUNDING-")) {
    return {
      valid: true,
      tier: "pro",
      isLifetime: true,
      status: "lifetime",
      expiresAt: null,
      message: "Perpetual License · Never Expires",
    };
  }

  // 2. Endpoints to verify active subscription or cancellation
  const endpoints = [
    "http://localhost:3000/api/license/verify",
    "https://HushWrite.app/api/license/verify",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: cleanKey }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          valid: data.valid,
          tier: data.tier || "pro",
          isLifetime: data.isLifetime || false,
          status: data.status || (data.valid ? "active" : "canceled"),
          expiresAt: data.expiresAt || null,
          message:
            data.message ||
            (data.valid ? "Subscription Active" : "Subscription Expired or Canceled"),
        };
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // 3. Offline / Air-Gapped Fallback: keep existing access
  const isTeam = cleanKey.startsWith("TEAM-");
  return {
    valid: true,
    tier: isTeam ? "team" : "pro",
    isLifetime: false,
    status: "active",
    expiresAt: null,
    message: "Active (Offline Mode)",
  };
}

export function usePlan() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);

  const startTrial = () => {
    const expires = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
    saveState({
      tier: "pro",
      isTrial: true,
      trialExpiresAt: expires,
      licenseKey: "TRIAL-14DAYS-ACTIVE",
      subscriptionStatus: "active",
      expiresAt: expires,
      lastVerifiedAt: Date.now(),
    });
    unlockProFeatures();
  };

  const setTier = (tier: PlanTier) => {
    saveState({
      ...state,
      tier,
      isTrial: false,
      trialExpiresAt: null,
    });
    if (tier === "pro" || tier === "team") {
      unlockProFeatures();
    }
  };

  const activateLicense = (key: string): boolean => {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return false;

    const isLifetime =
      cleanKey.startsWith("LIFETIME-") ||
      cleanKey.startsWith("FOUNDING-") ||
      cleanKey.startsWith("BACKER-");
    const isTeam = cleanKey.startsWith("TEAM-");
    const isPro =
      cleanKey.startsWith("PRO-") ||
      cleanKey.startsWith("STUDENT-") ||
      cleanKey.startsWith("OSS-") ||
      cleanKey.startsWith("SWITCHER-") ||
      cleanKey.startsWith("BACKER-") ||
      cleanKey.length >= 8;

    if (isTeam || isPro) {
      saveState({
        tier: isTeam ? "team" : "pro",
        isTrial: false,
        trialExpiresAt: null,
        licenseKey: cleanKey,
        subscriptionStatus: isLifetime ? "lifetime" : "active",
        expiresAt: isLifetime ? null : Date.now() + 365 * 24 * 60 * 60 * 1000,
        lastVerifiedAt: Date.now(),
      });
      unlockProFeatures();

      // Non-blocking background sync with Stripe if online
      if (!isLifetime) {
        void checkRemoteLicenseStatus(cleanKey).then((result) => {
          if (!result.valid && result.status === "canceled") {
            saveState({
              ...getStoredState(),
              tier: "starter",
              subscriptionStatus: "canceled",
              lastVerifiedAt: Date.now(),
            });
          } else if (result.valid) {
            saveState({
              ...getStoredState(),
              subscriptionStatus: result.isLifetime ? "lifetime" : "active",
              expiresAt: result.expiresAt,
              lastVerifiedAt: Date.now(),
            });
          }
        });
      }
      return true;
    }
    return false;
  };

  const syncSubscription = async (): Promise<SubscriptionCheckResult | null> => {
    if (!state.licenseKey) return null;
    const result = await checkRemoteLicenseStatus(state.licenseKey);

    if (!result.valid && result.status === "canceled") {
      saveState({
        ...state,
        tier: "starter",
        subscriptionStatus: "canceled",
        lastVerifiedAt: Date.now(),
      });
    } else if (result.valid) {
      saveState({
        ...state,
        tier: result.tier,
        subscriptionStatus: result.isLifetime ? "lifetime" : "active",
        expiresAt: result.expiresAt,
        lastVerifiedAt: Date.now(),
      });
    }

    return result;
  };

  const resetToStarter = () => {
    saveState(DEFAULT_STATE);
  };

  const trialDaysRemaining = state.trialExpiresAt
    ? Math.max(0, Math.ceil((state.trialExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    tier: state.tier,
    isTrial: state.isTrial,
    trialDaysRemaining,
    licenseKey: state.licenseKey,
    subscriptionStatus: state.subscriptionStatus,
    expiresAt: state.expiresAt,
    lastVerifiedAt: state.lastVerifiedAt,
    isStarter: state.tier === "starter",
    isPro: state.tier === "pro" || state.tier === "team",
    isTeam: state.tier === "team",
    startTrial,
    setTier,
    activateLicense,
    syncSubscription,
    resetToStarter,
  };
}

// ── Feature Gate Functions ───────────────────────────────────────────────

/** Whether the user can select Whisper Large v3 Turbo or Medium models */
export function canUseTurboModel(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether the user can activate the Smart Context Engine (VS Code, Slack, Notion) */
export function canUseContextEngine(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether the user can enable automatic filler word stripping */
export function canUseFillerStripper(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether custom dictionary allows unlimited words (Starter allows up to 25) */
export function getDictionaryWordLimit(tier: PlanTier): number {
  if (tier === "starter") return 25;
  return Infinity;
}

/** Whether voice snippets and text expansions are enabled */
export function canUseVoiceSnippets(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether spoken editing commands (new line, delete sentence) are enabled */
export function canUseSpokenCommands(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether domain-specific vocabulary packs (code, legal, med) are enabled */
export function canUseDomainPacks(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether encrypted multi-device sync is enabled */
export function canUseMultiDeviceSync(tier: PlanTier): boolean {
  return tier === "pro" || tier === "team";
}

/** Whether shared team dictionary and centralized pool sync are enabled */
export function canUseTeamDictionarySync(tier: PlanTier): boolean {
  return tier === "team";
}

/** Whether the user can enable Adaptive Model Auto-Switching */
export function canUseAdaptiveEscalation(_tier: PlanTier): boolean {
  return true;
}

/** Whether a specific target model requires a Pro or Team license */
export function isProModel(modelId: string): boolean {
  const proModelIds = [
    "large-v3-turbo",
    "large-v3",
    "medium",
    "medium-q5_0",
    "qwen-2.5-1.5b-instruct",
    "phi-3.5-mini-instruct",
  ];
  return proModelIds.some((id) => modelId.toLowerCase().includes(id));
}
