/**
 * SOURCE OF TRUTH KEYWORDS: OverlaySection, OverlayStyle, AccentPicker, AnchorGrid
 * WHAT:  Interactive customizer for overlay styles (5 styles), 9-point anchor positioning,
 *        dynamic accent palettes, celebration confetti, and stealth menu bar visibility.
 */

import {
  OVERLAY_STYLES,
  ACCENT_PALETTES,
  PILL_ANCHORS,
  type AccentColorId,
  type OverlayStyleId,
  type PillAnchorId,
  getAccentConfig,
} from "@/lib/accent";
import type { SettingValue } from "@/lib/bindings";
import { cn } from "@/lib/utils";
import { Sparkles, EyeOff, Layout, Check, Shield } from "lucide-react";

interface OverlaySectionProps {
  values: { [key in string]: SettingValue } | null;
  onWrite: (key: string, value: SettingValue) => void;
}

export function OverlaySection({ values, onWrite }: OverlaySectionProps) {
  const currentStyle = (
    values?.["ui.overlay_style"]?.type === "CHOICE"
      ? values["ui.overlay_style"].value
      : "floating_pill"
  ) as OverlayStyleId;

  const currentAccent = (
    values?.["ui.accent_color"]?.type === "CHOICE" ? values["ui.accent_color"].value : "monochrome"
  ) as AccentColorId;

  const currentAnchor = (
    values?.["ui.pill_anchor"]?.type === "CHOICE" ? values["ui.pill_anchor"].value : "bottom_center"
  ) as PillAnchorId;

  const showTray =
    values?.["ui.show_tray_icon"]?.type !== "BOOL" || values["ui.show_tray_icon"].value !== false;

  const confettiEnabled =
    values?.["ui.confetti_effect"]?.type !== "BOOL" || values["ui.confetti_effect"].value !== false;

  const isCompact =
    values?.["ui.pill_compact"]?.type === "BOOL" && values["ui.pill_compact"].value === true;

  const opacityValue =
    values?.["ui.pill_opacity"]?.type === "NUMBER" && values["ui.pill_opacity"].value !== null
      ? values["ui.pill_opacity"].value
      : 100;

  const accent = getAccentConfig(currentAccent);

  return (
    <div className="space-y-6 pt-2">
      {/* ── Live Interactive Preview Screen ──────────────────────────── */}
      <div className="rounded-2xl border border-stone-200/80 bg-stone-950 p-4 text-white shadow-xl dark:border-stone-800">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-stone-300">Live Indicator Preview</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-stone-400">
            <span>
              Style:{" "}
              <strong className="text-white capitalize">{currentStyle.replace(/_/g, " ")}</strong>
            </span>
            <span>
              Accent: <strong className="text-white capitalize">{accent.label}</strong>
            </span>
          </div>
        </div>

        {/* Mock Display Viewport */}
        <div className="relative mt-3 h-44 w-full rounded-xl border border-white/10 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 overflow-hidden flex items-center justify-center">
          {/* Subtle grid backdrop */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Bezel Notch representation */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-3.5 bg-black/90 rounded-b-xl border-b border-x border-white/15" />

          {/* Render Active Style Mockup inside Display */}
          {currentStyle === "none" ? (
            <div className="flex flex-col items-center gap-1.5 text-stone-400 animate-in fade-in duration-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800/80 text-stone-400">
                <EyeOff className="size-4" />
              </div>
              <p className="text-xs font-medium text-stone-300">Stealth Mode Active</p>
              <p className="text-[11px] text-stone-500">
                Overlay is hidden.{" "}
                {showTray
                  ? "Menu bar icon is visible."
                  : "100% invisible recording (audio cues only)."}
              </p>
            </div>
          ) : currentStyle === "notch_slim_band" ? (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 rounded-b-md bg-stone-900 border-b border-x border-white/20 flex items-center justify-center px-1 shadow-lg">
              <div
                className="h-[3px] w-full rounded-full animate-pulse transition-all"
                style={{
                  backgroundColor: accent.primary,
                  boxShadow: `0 0 10px ${accent.glow}`,
                }}
              />
            </div>
          ) : currentStyle === "notch" ? (
            <div
              style={{
                borderColor: currentAccent !== "monochrome" ? accent.border : undefined,
                boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 15px ${accent.bgGlow}`,
              }}
              className="absolute top-0 left-1/2 -translate-x-1/2 min-w-[220px] h-8 rounded-b-2xl bg-stone-900/95 border-b border-x border-white/20 px-3 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
            >
              {/* Waveform */}
              <div className="flex items-center gap-0.5">
                {[5, 12, 18, 12, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      height: `${h}px`,
                      backgroundColor: accent.primary,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-stone-200">Listening…</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-stone-300">
                Alt
              </span>
            </div>
          ) : currentStyle === "notch_drop_pill" ? (
            <div
              style={{
                borderColor: currentAccent !== "monochrome" ? accent.border : undefined,
                boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${accent.bgGlow}`,
              }}
              className="absolute top-6 left-1/2 -translate-x-1/2 min-w-[230px] h-8 rounded-full bg-stone-900/95 border border-white/20 px-3 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-0.5">
                {[6, 14, 20, 14, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      height: `${h}px`,
                      backgroundColor: accent.primary,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-stone-200 truncate">
                {isCompact ? "" : "Listening — hold"}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-stone-300">
                Alt
              </span>
            </div>
          ) : (
            /* Floating Pill Preview with 9-anchor positioning */
            <div
              style={{
                opacity: opacityValue / 100,
                borderColor: currentAccent !== "monochrome" ? accent.border : undefined,
                boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 20px ${accent.bgGlow}`,
              }}
              className={cn(
                "absolute min-w-[210px] h-8 rounded-full bg-stone-900/95 border border-white/20 px-3 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md transition-all duration-300",
                currentAnchor === "top_left" && "top-3 left-3",
                currentAnchor === "top_center" && "top-3 left-1/2 -translate-x-1/2",
                currentAnchor === "top_right" && "top-3 right-3",
                currentAnchor === "center_left" && "top-1/2 -translate-y-1/2 left-3",
                currentAnchor === "center" && "top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2",
                currentAnchor === "center_right" && "top-1/2 -translate-y-1/2 right-3",
                currentAnchor === "bottom_left" && "bottom-3 left-3",
                currentAnchor === "bottom_center" && "bottom-3 left-1/2 -translate-x-1/2",
                currentAnchor === "bottom_right" && "bottom-3 right-3",
              )}
            >
              <div className="flex items-center gap-0.5">
                {[6, 14, 20, 14, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      height: `${h}px`,
                      backgroundColor: accent.primary,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-stone-200">
                {isCompact ? "" : "Listening — hold"}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-stone-300">
                Alt
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 1. Five Styles Selector ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layout className="size-4 text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
            Overlay Style (5 Designs)
          </h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Choose how HushWrite appears on screen during speech dictation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {OVERLAY_STYLES.map((style) => {
            const isSelected = currentStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onWrite("ui.overlay_style", { type: "CHOICE", value: style.id })}
                className={cn(
                  "flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer relative",
                  isSelected
                    ? "border-stone-900 bg-stone-100/90 dark:border-white dark:bg-stone-800/90 ring-1 ring-stone-900/10 dark:ring-white/20 shadow-xs"
                    : "border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40 dark:hover:bg-stone-800/50",
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-stone-900 dark:text-white">
                    {style.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                      isSelected
                        ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                        : "bg-stone-200/60 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
                    )}
                  >
                    {style.tag}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Dynamic Accent Color Palette ──────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Accent Colour</h3>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Customise the glowing aura, dynamic waveform visualizer, and border tones.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(ACCENT_PALETTES).map((pal) => {
            const isSelected = currentAccent === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => onWrite("ui.accent_color", { type: "CHOICE", value: pal.id })}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-stone-900 bg-stone-100 dark:border-white dark:bg-stone-800 ring-1 ring-stone-900 dark:ring-white shadow-xs"
                    : "border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40 dark:hover:bg-stone-800/40",
                )}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/10 shadow-xs"
                  style={{
                    backgroundColor: pal.primary,
                    boxShadow: `0 0 10px ${pal.glow}`,
                  }}
                >
                  {isSelected && (
                    <Check
                      className={cn(
                        "size-3.5",
                        pal.id === "monochrome" ? "text-stone-900" : "text-white",
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-900 dark:text-white truncate">
                    {pal.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. 9-Point Anchor Position Grid (Floating Pill only) ──────── */}
      {currentStyle === "floating_pill" && (
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-stone-900 dark:text-white">
                Floating Pill Screen Position (9 Anchors)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Click any position on the screen grid to anchor your floating pill overlay.
              </p>
            </div>
            <span className="text-[11px] font-medium font-mono text-stone-600 dark:text-stone-300 capitalize">
              {currentAnchor.replace(/_/g, " ")}
            </span>
          </div>

          <div className="mx-auto max-w-[280px] p-3 rounded-xl border border-stone-300/80 bg-stone-200/50 dark:border-stone-700 dark:bg-stone-950/80 shadow-inner">
            <div className="grid grid-cols-3 gap-2">
              {PILL_ANCHORS.map((anchor) => {
                const isSelected = currentAnchor === anchor.id;
                return (
                  <button
                    key={anchor.id}
                    type="button"
                    onClick={() => onWrite("ui.pill_anchor", { type: "CHOICE", value: anchor.id })}
                    className={cn(
                      "flex flex-col items-center justify-center h-11 rounded-lg border text-[10px] font-medium transition-all cursor-pointer",
                      isSelected
                        ? "border-stone-900 bg-stone-900 text-white shadow-md dark:border-white dark:bg-white dark:text-stone-900"
                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
                    )}
                  >
                    <span>{anchor.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Toggles & Visibility Options ─────────────────────────── */}
      <div className="divide-y divide-stone-200/60 dark:divide-stone-800/80 border-t border-stone-200/60 dark:border-stone-800/80 pt-2">
        {/* Celebration Confetti */}
        <div className="flex items-center justify-between py-3">
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>Celebration confetti</span>
              <Sparkles className="size-3.5 text-amber-500" />
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Burst celebratory particle confetti when transcription successfully finishes and
              pastes.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={confettiEnabled}
            onClick={() => onWrite("ui.confetti_effect", { type: "BOOL", value: !confettiEnabled })}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              confettiEnabled ? "bg-stone-900 dark:bg-white" : "bg-stone-300 dark:bg-stone-700",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-stone-900 shadow-sm ring-0 transition duration-200 ease-in-out",
                confettiEnabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* Menu Bar / Tray Icon Visibility */}
        <div className="flex items-center justify-between py-3">
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>Show menu bar / tray icon</span>
              <Shield className="size-3.5 text-stone-400" />
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Show the HushWrite menu bar glyph. When turned off and overlay is set to None,
              dictation operates with <strong>zero visible indicators</strong>.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showTray}
            onClick={() => onWrite("ui.show_tray_icon", { type: "BOOL", value: !showTray })}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              showTray ? "bg-stone-900 dark:bg-white" : "bg-stone-300 dark:bg-stone-700",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-stone-900 shadow-sm ring-0 transition duration-200 ease-in-out",
                showTray ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
