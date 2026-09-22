/**
 * SOURCE OF TRUTH KEYWORDS: SettingsView, getRegistry, getSettings, setSetting,
 *   SettingSection, SECTION_ORDER, advanced-disclosure, toControlSetting, AppProfiles,
 *   settings-search, theme-switcher, settings-tabs
 * WHAT:  The settings page: modern categorized tab navigation (General, Recording,
 *        Overlay & HUD, Transcription & AI, Output & Typing, Per-App Profiles, Privacy & Data),
 *        real-time search, theme switcher, speech model manager, and backup & restore.
 * WHY:   Organized tabs eliminate vertical clutter while instant search and explicit theme
 *        controls make settings discovery effortless and pleasant.
 * WHERE: Rendered by Dashboard.tsx for the registry's "settings" route.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  X,
  Sun,
  Moon,
  Monitor,
  SlidersHorizontal,
  Mic,
  Layers,
  Cpu,
  Keyboard,
  Laptop,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useScrollRestoration } from "../use-scroll-restoration";
import {
  commands,
  type AppError,
  type EngineCapabilities,
  type OsPermission,
  type PermissionReport,
  type RegistrySnapshot,
  type SettingDef as RegistrySettingDef,
  type SettingSection,
  type SettingValue,
} from "@/lib/bindings";
import { unwrapCommand, useCommand } from "@/lib/ipc";
import { missingPermissions, usePermissions } from "@/lib/use-permissions";
import { useSettings } from "../use-settings";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import {
  ErrorSurface,
  SettingControl,
  Skeleton,
  EmptyState,
  ProFeatureModal,
} from "@/components/global";
import type { SettingOption } from "@/components/global";
import { PermissionNotice } from "./_components/PermissionNotice";
import { ModelManager } from "./_components/ModelManager";
import { AbbreviationManager } from "./_components/AbbreviationManager";
import { AppProfiles } from "./_components/AppProfiles";
import { SettingsBackup } from "./_components/SettingsBackup";
import { OverlaySection } from "./_components/OverlaySection";
import { VoiceTransformPreview } from "./_components/VoiceTransformPreview";
import { RulePreviewSandbox } from "./_components/RulePreviewSandbox";
import { WpmCalibrationWizard } from "../_components/WpmCalibrationWizard";
import { toControlSetting, type DynamicOptions } from "./to-setting-def";
import { navigateTo } from "../use-hash-route";
import { usePlan, canUseFillerStripper, type PlanTier } from "@/lib/plan";

export type SettingsTabId =
  "general" | "recording" | "overlay" | "transcription" | "output" | "profiles" | "privacy";

interface TabItem {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  sectionKey?: SettingSection;
}

const SETTINGS_TABS: readonly TabItem[] = [
  {
    id: "general",
    label: "General",
    icon: SlidersHorizontal,
    description:
      "Interface theme, typing speed calibration, setup wizard, and configuration backups.",
    sectionKey: "GENERAL",
  },
  {
    id: "recording",
    label: "Recording",
    icon: Mic,
    description:
      "Microphone input device, dictation hotkeys, activation triggers, and permissions.",
    sectionKey: "RECORDING",
  },
  {
    id: "overlay",
    label: "Overlay & HUD",
    icon: Layers,
    description:
      "Floating indicator pill style, position, visual feedback, live HUD preview, and opacity.",
    sectionKey: "OVERLAY",
  },
  {
    id: "transcription",
    label: "Transcription & AI",
    icon: Cpu,
    description:
      "Language selection, offline Whisper & AI speech models, and custom abbreviations.",
    sectionKey: "TRANSCRIPTION",
  },
  {
    id: "output",
    label: "Output & Typing",
    icon: Keyboard,
    description:
      "Simulated keystrokes vs clipboard paste, typing delays, auto-capitalization, and formatting.",
    sectionKey: "OUTPUT",
  },
  {
    id: "profiles",
    label: "Per-App Profiles",
    icon: Laptop,
    description:
      "Contextual dictation overrides that automatically activate when specific apps are in front.",
  },
  {
    id: "privacy",
    label: "Privacy & Data",
    icon: ShieldCheck,
    description:
      "Air-gap isolation mode, zero cloud telemetry, local storage retention, and factory data wipe.",
    sectionKey: "PRIVACY",
  },
];

const SECTION_LABEL: Readonly<Record<SettingSection, string>> = {
  RECORDING: "Recording",
  OVERLAY: "Overlay & Indicator",
  TRANSCRIPTION: "Transcription",
  OUTPUT: "Output",
  VOCABULARY: "Vocabulary",
  PRIVACY: "Privacy",
  GENERAL: "General",
};

export interface SettingsViewProps {
  registry: RegistrySnapshot;
  section: string | null;
}

export function SettingsView({ registry, section }: SettingsViewProps) {
  const settings = useSettings();
  const devices = useCommand(commands.listInputDevices, []);
  const models = useCommand(commands.listModels, []);
  const languages = useCommand(commands.listLanguages, []);
  const engine = useCommand(commands.getEngineCapabilities, []);
  const permissions = usePermissions();
  const { tier } = usePlan();
  const [proModalOpen, setProModalOpen] = useState(false);
  const [writeError, setWriteError] = useState<AppError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { containerRef, onScroll } = useScrollRestoration("settings", Boolean(settings.data));

  // Determine initial active tab from route section
  const initialTab = useMemo<SettingsTabId>(() => {
    if (!section) return "general";
    const sec = section.toLowerCase();
    if (sec === "models") return "transcription";
    const found = SETTINGS_TABS.find((t) => t.id === sec);
    return found ? found.id : "general";
  }, [section]);

  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Sync hash section route changes to active tab
  useEffect(() => {
    if (section) {
      const sec = section.toLowerCase();
      if (sec === "dictionary" || sec === "vocabulary") {
        navigateTo("dictionary");
        return;
      }
      if (sec === "models") {
        setActiveTab("transcription");
        return;
      }
      const found = SETTINGS_TABS.find((t) => t.id === sec);
      if (found) {
        setActiveTab(found.id);
      }
    }
  }, [section]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    navigateTo("settings", tabId);
  };

  const dynamic = useMemo<DynamicOptions>(() => {
    const defaultDev = (devices.data ?? []).find((d) => d.is_default);
    const deviceOptions: SettingOption[] = [
      {
        value: "default",
        label: defaultDev ? `System Default (${defaultDev.name})` : "System Default",
      },
      ...(devices.data ?? []).map((device) => ({
        value: device.id,
        label: device.name,
      })),
    ];
    const modelOptions: SettingOption[] = (models.data ?? []).map((model) => ({
      value: model.descriptor.id,
      label: model.descriptor.id.includes("q3_")
        ? `${model.descriptor.display_name} [Compressed]`
        : model.descriptor.display_name,
      description: `${formatBytes(model.descriptor.size_bytes)} · ${model.descriptor.approx_ram_mb} MB memory`,
      disabled: model.state.kind !== "READY",
    }));

    const engineName = engine.data?.display_name ?? "the selected engine";
    const languageOptions: SettingOption[] = (languages.data ?? []).map((language) => ({
      value: language.code,
      label: language.supported
        ? language.label
        : `${language.label} — not supported by ${engineName}`,
      description: language.supported
        ? undefined
        : `${engineName} cannot transcribe ${language.label}.`,
      disabled: !language.supported,
    }));
    return { INPUT_DEVICES: deviceOptions, MODELS: modelOptions, LANGUAGES: languageOptions };
  }, [devices.data, engine.data, languages.data, models.data]);

  const write = useCallback(
    (key: string, value: SettingValue) => {
      if (
        key === "enhance.strip_fillers" &&
        value.type === "BOOL" &&
        value.value === true &&
        !canUseFillerStripper(tier)
      ) {
        setProModalOpen(true);
        return;
      }
      void unwrapCommand(() => commands.setSetting({ key, value })).then((result) => {
        setWriteError(result.status === "error" ? result.error : null);
      });
    },
    [tier],
  );

  const allDefs = useMemo(
    () => registry.capabilities.flatMap((capability) => capability.settings),
    [registry],
  );

  const grouped = useMemo(() => {
    const map = new Map<SettingSection, RegistrySettingDef[]>();
    for (const capability of registry.capabilities) {
      for (const def of capability.settings) {
        const bucket = map.get(def.section);
        if (bucket) bucket.push(def);
        else map.set(def.section, [def]);
      }
    }
    return map;
  }, [registry]);

  const filteredDefs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return allDefs.filter(
      (def) =>
        def.label.toLowerCase().includes(query) ||
        def.description.toLowerCase().includes(query) ||
        def.key.toLowerCase().includes(query) ||
        SECTION_LABEL[def.section]?.toLowerCase().includes(query),
    );
  }, [allDefs, searchQuery]);

  const currentTabDef = SETTINGS_TABS.find((t) => t.id === activeTab) ?? SETTINGS_TABS[0];

  // Missing permissions notice badge for the recording tab
  const recordingDefs = grouped.get("RECORDING") ?? [];
  const recordingMissingPermissions = useMemo(() => {
    return [
      ...new Set(
        recordingDefs.flatMap((def) =>
          missingPermissions(def.requires_permission, permissions.data),
        ),
      ),
    ] as OsPermission[];
  }, [recordingDefs, permissions.data]);

  if (settings.error) return <ErrorSurface error={settings.error} onRetry={settings.reload} />;

  if (!settings.data) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-8 py-6">
        <Skeleton rows={8} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      data-scroll-area
      className="flex h-full min-h-0 flex-col overflow-y-auto px-8 py-6 space-y-6"
    >
      {writeError ? <ErrorSurface size="compact" error={writeError} /> : null}

      {/* ── Page Header & Search ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            Settings
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Configure speech models, audio devices, overlay visuals, and app preferences.
          </p>
        </div>

        {/* Real-time Settings Search Bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all settings..."
            className="w-full h-9 rounded-xl border border-stone-200/80 bg-stone-50/80 pl-9 pr-8 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:border-stone-800 dark:bg-stone-900/50 dark:text-white dark:placeholder:text-stone-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 p-0.5 rounded-full cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Search Results View (when querying) ────────────────────── */}
      {filteredDefs !== null ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Found {filteredDefs.length} matching setting{filteredDefs.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-stone-800 dark:text-stone-200 underline hover:opacity-80 cursor-pointer"
            >
              Clear search
            </button>
          </div>

          {filteredDefs.length === 0 ? (
            <EmptyState
              headline="No settings match your search"
              description="Try searching for a different setting, keyword, or clear your query."
            />
          ) : (
            <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
              {filteredDefs.map((def) => (
                <div key={def.key} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300 uppercase tracking-wider">
                      {SECTION_LABEL[def.section]}
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
                      {def.key}
                    </span>
                  </div>
                  <SettingControl
                    setting={toControlSetting(
                      def,
                      settings.data?.[def.key],
                      dynamic,
                      engine.data,
                      permissions.data,
                      (value) => write(def.key, value),
                      tier,
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Tabbed View ──────────────────────────────────────────── */
        <div className="flex flex-col space-y-5">
          {/* Horizontal Segmented Tab Navigation */}
          <nav
            aria-label="Settings Categories"
            className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100/90 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/80 overflow-x-auto no-scrollbar shadow-xs shrink-0"
          >
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasWarning = tab.id === "recording" && recordingMissingPermissions.length > 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  title={`${tab.label} — ${tab.description}`}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-white"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive
                        ? "text-stone-900 dark:text-white"
                        : "text-stone-400 dark:text-stone-500",
                    )}
                  />
                  <span>{tab.label}</span>
                  {hasWarning && (
                    <span
                      title="Microphone permission required — click to grant microphone access in Windows/macOS Settings"
                      className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active Tab Header Banner */}
          <div className="flex items-start justify-between pb-1">
            <div>
              <div className="flex items-center gap-2.5">
                <currentTabDef.icon className="size-5 text-stone-700 dark:text-stone-300" />
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                  {currentTabDef.label}
                </h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {currentTabDef.description}
              </p>
            </div>
          </div>

          {/* ── Tab Content Panes ─────────────────────────────────── */}
          <div className="animate-in fade-in duration-150">
            {activeTab === "general" && (
              <GeneralTabContent
                defs={grouped.get("GENERAL") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                onWrite={write}
                tier={tier}
              />
            )}

            {activeTab === "recording" && (
              <RecordingTabContent
                defs={grouped.get("RECORDING") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                missingPermissionsList={recordingMissingPermissions}
                onWrite={write}
                tier={tier}
              />
            )}

            {activeTab === "overlay" && (
              <OverlayTabContent
                defs={grouped.get("OVERLAY") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                onWrite={write}
                tier={tier}
              />
            )}

            {activeTab === "transcription" && (
              <TranscriptionTabContent
                defs={grouped.get("TRANSCRIPTION") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                onWrite={write}
                tier={tier}
              />
            )}

            {activeTab === "output" && (
              <OutputTabContent
                defs={grouped.get("OUTPUT") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                onWrite={write}
                tier={tier}
              />
            )}

            {activeTab === "profiles" && (
              <ProfilesTabContent
                allDefs={allDefs}
                globals={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
              />
            )}

            {activeTab === "privacy" && (
              <PrivacyTabContent
                defs={grouped.get("PRIVACY") ?? []}
                values={settings.data}
                dynamic={dynamic}
                engine={engine.data}
                permissions={permissions.data}
                onWrite={write}
                tier={tier}
              />
            )}
          </div>
        </div>
      )}

      {/* Pro Modal */}
      <ProFeatureModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        featureName="Filler Word Removal"
        description="Automatically remove ums, uhs, and verbal hesitations in real-time with HushWrite Pro."
      />
    </div>
  );
}

// ─── Tab Content Components ──────────────────────────────────────────────────

/** 1. General Tab */
function GeneralTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  const { theme, setTheme } = useTheme();
  const [showCalibration, setShowCalibration] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const baselineWpm =
    (values?.["general.baseline_wpm"]?.type === "NUMBER"
      ? values["general.baseline_wpm"].value
      : null) ?? 40;

  const plain = defs.filter((def) => !def.advanced);
  const advanced = defs.filter((def) => def.advanced);

  return (
    <div className="space-y-6">
      {showCalibration ? (
        <WpmCalibrationWizard
          currentBaselineWpm={baselineWpm}
          onClose={() => setShowCalibration(false)}
          onSaved={() => {}}
        />
      ) : null}

      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Appearance & Theme</h3>

        {/* Explicit Theme Switcher */}
        <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800/80">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              Interface theme
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Follow system appearance or force light or dark mode.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-stone-200/80 bg-stone-100/80 p-0.5 dark:border-stone-800 dark:bg-stone-900">
            {(
              [
                { id: "system", label: "System", icon: <Monitor className="size-3.5" /> },
                { id: "light", label: "Light", icon: <Sun className="size-3.5" /> },
                { id: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
              ] as { id: ThemeChoice; label: string; icon: React.ReactNode }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  theme === opt.id
                    ? "bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-white"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white",
                )}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Regular General Settings */}
        {plain.map((def) => (
          <SettingControl
            key={def.key}
            className="border-b border-stone-100 dark:border-stone-800/80 last:border-b-0 py-3"
            setting={toControlSetting(
              def,
              values?.[def.key],
              dynamic,
              engine,
              permissions,
              (value) => onWrite(def.key, value),
              tier,
            )}
          />
        ))}

        {/* Speed Calibration */}
        <div className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-stone-800/80">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              Calibrate typing speed
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Benchmark your natural speech pace or take a typing test to measure accurate time
              savings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCalibration(true)}
            className="h-8 shrink-0 rounded-xl border border-stone-200/80 bg-stone-100 px-3 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200/80 dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
          >
            Calibrate speed…
          </button>
        </div>

        {/* Re-run Onboarding Setup */}
        <div className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-stone-800/80">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              First-run setup wizard
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Redo microphone checks, audio calibration, and the dictation hotkey guide.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void unwrapCommand(commands.openOnboardingWindow);
            }}
            className="h-8 shrink-0 rounded-xl border border-stone-200/80 bg-stone-100 px-3 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200/80 dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
          >
            Run setup again…
          </button>
        </div>

        {/* Advanced Disclosure */}
        {advanced.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")}
              />
              Advanced Settings
            </button>
            {showAdvanced && (
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800/60 border-t border-stone-100 dark:border-stone-800/80">
                {advanced.map((def) => (
                  <SettingControl
                    key={def.key}
                    className="py-3"
                    setting={toControlSetting(
                      def,
                      values?.[def.key],
                      dynamic,
                      engine,
                      permissions,
                      (value) => onWrite(def.key, value),
                      tier,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup & Export / Import Card */}
      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs">
        <SettingsBackup />
      </div>

      {/* About & Community Recognition Card */}
      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
              About HushWrite
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              High-performance, zero-cloud speech-to-text engineered in Rust and Tauri v2.
            </p>
          </div>
          <span className="inline-flex items-center rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-mono text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
            v1.0.0 · MIT License
          </span>
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-4 text-xs text-stone-600 dark:text-stone-400 flex-wrap">
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/alexgutscher26/HushWrite"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 dark:hover:text-white transition-colors underline underline-offset-2"
            >
              GitHub Repository
            </a>
            <span>·</span>
            <a
              href="https://github.com/alexgutscher26/HushWrite/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 dark:hover:text-white transition-colors underline underline-offset-2"
            >
              Issue Tracker
            </a>
            <span>·</span>
            <a
              href="https://github.com/alexgutscher26/HushWrite/blob/main/CONTRIBUTORS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-900 dark:hover:text-white transition-colors underline underline-offset-2"
            >
              Contributors & Community
            </a>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="size-3.5" /> 100% On-Device & Zero Egress
          </span>
        </div>
      </div>
    </div>
  );
}

/** 2. Recording Tab */
function RecordingTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  missingPermissionsList,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  missingPermissionsList: readonly OsPermission[];
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const plain = defs.filter((def) => !def.advanced);
  const advanced = defs.filter((def) => def.advanced);

  return (
    <div className="space-y-5">
      <PermissionNotice permissions={missingPermissionsList} />

      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
        {plain.map((def) => (
          <SettingControl
            key={def.key}
            className="py-3 first:pt-0 last:pb-0"
            setting={toControlSetting(
              def,
              values?.[def.key],
              dynamic,
              engine,
              permissions,
              (value) => onWrite(def.key, value),
              tier,
            )}
          />
        ))}

        {advanced.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")}
              />
              Advanced Recording Options
            </button>
            {showAdvanced && (
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800/60 border-t border-stone-100 dark:border-stone-800/80">
                {advanced.map((def) => (
                  <SettingControl
                    key={def.key}
                    className="py-3"
                    setting={toControlSetting(
                      def,
                      values?.[def.key],
                      dynamic,
                      engine,
                      permissions,
                      (value) => onWrite(def.key, value),
                      tier,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 3. Overlay Tab */
function OverlayTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  return (
    <div className="space-y-5">
      <OverlaySection values={values} onWrite={onWrite} />

      {defs.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
          {defs.map((def) => (
            <SettingControl
              key={def.key}
              className="py-3 first:pt-0 last:pb-0"
              setting={toControlSetting(
                def,
                values?.[def.key],
                dynamic,
                engine,
                permissions,
                (value) => onWrite(def.key, value),
                tier,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 4. Transcription & AI Tab */
function TranscriptionTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const plain = defs.filter((def) => !def.advanced);
  const advanced = defs.filter((def) => def.advanced);

  return (
    <div className="space-y-6">
      {/* Settings Controls */}
      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
        {plain.map((def) => (
          <div key={def.key}>
            <SettingControl
              className="py-3 first:pt-0"
              setting={toControlSetting(
                def,
                values?.[def.key],
                dynamic,
                engine,
                permissions,
                (value) => onWrite(def.key, value),
                tier,
              )}
            />
            {def.key === "enhance.expand_abbreviations" &&
              (values?.[def.key]?.type !== "BOOL" || values[def.key].value !== false) && (
                <div className="py-3">
                  <AbbreviationManager
                    languageCode={
                      values?.["transcription.language"]?.type === "CHOICE"
                        ? values["transcription.language"].value
                        : undefined
                    }
                    disabledValue={values?.["enhance.disabled_abbreviations"]}
                    onUpdateDisabled={(val) => onWrite("enhance.disabled_abbreviations", val)}
                  />
                </div>
              )}
          </div>
        ))}

        {advanced.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")}
              />
              Advanced AI & Engine Options
            </button>
            {showAdvanced && (
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800/60 border-t border-stone-100 dark:border-stone-800/80">
                {advanced.map((def) => (
                  <SettingControl
                    key={def.key}
                    className="py-3"
                    setting={toControlSetting(
                      def,
                      values?.[def.key],
                      dynamic,
                      engine,
                      permissions,
                      (value) => onWrite(def.key, value),
                      tier,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Speech Models Management */}
      <div
        data-section="models"
        className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs"
      >
        <ModelManager />
      </div>
    </div>
  );
}

/** 5. Output & Typing Tab */
function OutputTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const plain = defs.filter((def) => !def.advanced);
  const advanced = defs.filter((def) => def.advanced);

  return (
    <div className="space-y-6">
      <RulePreviewSandbox />

      <VoiceTransformPreview />

      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
        {plain.map((def) => (
          <SettingControl
            key={def.key}
            className="py-3 first:pt-0 last:pb-0"
            setting={toControlSetting(
              def,
              values?.[def.key],
              dynamic,
              engine,
              permissions,
              (value) => onWrite(def.key, value),
              tier,
            )}
          />
        ))}

        {advanced.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")}
              />
              Advanced Formatting & Typing
            </button>
            {showAdvanced && (
              <div className="mt-3 divide-y divide-stone-100 dark:divide-stone-800/60 border-t border-stone-100 dark:border-stone-800/80">
                {advanced.map((def) => (
                  <SettingControl
                    key={def.key}
                    className="py-3"
                    setting={toControlSetting(
                      def,
                      values?.[def.key],
                      dynamic,
                      engine,
                      permissions,
                      (value) => onWrite(def.key, value),
                      tier,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 6. Per-App Profiles Tab */
function ProfilesTabContent({
  allDefs,
  globals,
  dynamic,
  engine,
  permissions,
}: {
  allDefs: readonly RegistrySettingDef[];
  globals: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
}) {
  return (
    <div
      data-section="profiles"
      className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs space-y-4"
    >
      <AppProfiles
        defs={allDefs}
        globals={globals}
        dynamic={dynamic}
        engine={engine}
        permissions={permissions}
      />
    </div>
  );
}

/** 7. Privacy & Security Tab */
function PrivacyTabContent({
  defs,
  values,
  dynamic,
  engine,
  permissions,
  onWrite,
  tier,
}: {
  defs: readonly RegistrySettingDef[];
  values: { [key in string]: SettingValue } | null;
  dynamic: DynamicOptions;
  engine: EngineCapabilities | null;
  permissions: readonly PermissionReport[] | null;
  onWrite: (key: string, value: SettingValue) => void;
  tier?: PlanTier;
}) {
  return (
    <div className="space-y-6">
      {/* Privacy Setting Controls */}
      <div className="rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800/80 dark:bg-stone-900/40 p-5 shadow-xs divide-y divide-stone-100 dark:divide-stone-800/60">
        {defs.map((def) => (
          <SettingControl
            key={def.key}
            className="py-3 first:pt-0 last:pb-0"
            setting={toControlSetting(
              def,
              values?.[def.key],
              dynamic,
              engine,
              permissions,
              (value) => onWrite(def.key, value),
              tier,
            )}
          />
        ))}
      </div>

      {/* Danger Zone: History & Data Wipe */}
      <div className="rounded-2xl border border-red-200/80 bg-red-50/20 dark:border-red-950/60 dark:bg-red-950/10 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
          Data Management & Reset
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Permanently delete local speech transcripts or completely reset HushWrite to fresh
          defaults.
        </p>
        <PrivacyControls />
      </div>
    </div>
  );
}

/** Privacy panel controls for history clearing and full data wipe */
function PrivacyControls() {
  const [confirmingHistory, setConfirmingHistory] = useState(false);
  const [deletedHistory, setDeletedHistory] = useState<number | null>(null);

  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [wipeStats, setWipeStats] = useState<string | null>(null);

  return (
    <div className="flex flex-col divide-y divide-stone-200/60 dark:divide-stone-800/60 pt-1">
      {/* Clear Transcripts */}
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-900 dark:text-white">Delete all history</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {deletedHistory === null
              ? "Deletes every session transcript permanently. This cannot be undone."
              : `Successfully deleted ${deletedHistory} transcript${deletedHistory === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!confirmingHistory) {
              setConfirmingHistory(true);
              return;
            }
            void unwrapCommand(commands.clearHistory).then((result) => {
              if (result.status === "ok") setDeletedHistory(result.data);
              setConfirmingHistory(false);
            });
          }}
          onBlur={() => setConfirmingHistory(false)}
          className={cn(
            "h-8 shrink-0 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer",
            confirmingHistory
              ? "bg-red-600 text-white shadow-xs"
              : "border border-stone-200/80 bg-stone-100 text-stone-700 hover:text-red-600 hover:border-red-200 dark:border-stone-800 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:text-red-400",
          )}
        >
          {confirmingHistory ? "Confirm delete history" : "Delete history…"}
        </button>
      </div>

      {/* Wipe All Data / Factory Reset */}
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Delete all data & reset
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {wipeStats ??
              "Drops all transcripts, custom dictionary entries, and resets all settings to original defaults."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!confirmingWipe) {
              setConfirmingWipe(true);
              return;
            }
            void unwrapCommand(commands.wipeAllData).then((result) => {
              if (result.status === "ok") {
                const { sessions_deleted, dictionary_entries_deleted, settings_deleted } =
                  result.data;
                setWipeStats(
                  `Reset complete. Wiped ${sessions_deleted} sessions, ${dictionary_entries_deleted} vocabulary items, and reset ${settings_deleted} settings.`,
                );
              }
              setConfirmingWipe(false);
            });
          }}
          onBlur={() => setConfirmingWipe(false)}
          className={cn(
            "h-8 shrink-0 rounded-xl px-3 text-xs font-semibold transition-all cursor-pointer",
            confirmingWipe
              ? "bg-red-600 text-white shadow-xs"
              : "border border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50",
          )}
        >
          {confirmingWipe ? "Confirm wipe all data" : "Delete all data…"}
        </button>
      </div>
    </div>
  );
}
