/**
 * SOURCE OF TRUTH KEYWORDS: OverlayStep, OnboardingOverlayStyle
 * WHAT:  First-run onboarding step to choose from the 5 overlay styles (Floating Pill,
 *        Top Notch, Notch Slim Band, Notch Drop Pill, Stealth/None) and accent colour.
 */

import { useState } from "react";
import {
  OVERLAY_STYLES,
  ACCENT_PALETTES,
  type AccentColorId,
  type OverlayStyleId,
  getAccentConfig,
} from "@/lib/accent";
import { commands } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { Sparkles, Check, EyeOff, Layout } from "lucide-react";

interface OverlayStepProps {
  onDone: () => void;
}

export function OverlayStep({ onDone }: OverlayStepProps) {
  const [selectedStyle, setSelectedStyle] = useState<OverlayStyleId>("floating_pill");
  const [selectedAccent, setSelectedAccent] = useState<AccentColorId>("monochrome");
  const accent = getAccentConfig(selectedAccent);

  const handleSelectStyle = (styleId: OverlayStyleId) => {
    setSelectedStyle(styleId);
    void unwrapCommand(() =>
      commands.setSetting({
        key: "ui.overlay_style",
        value: { type: "CHOICE", value: styleId },
      }),
    );
  };

  const handleSelectAccent = (accentId: AccentColorId) => {
    setSelectedAccent(accentId);
    void unwrapCommand(() =>
      commands.setSetting({
        key: "ui.accent_color",
        value: { type: "CHOICE", value: accentId },
      }),
    );
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      {/* ── Top interactive preview ─────────────────────────────────── */}
      <div className="relative h-28 w-full rounded-2xl border border-stone-200/80 bg-stone-950 overflow-hidden flex items-center justify-center p-3 dark:border-stone-800">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />

        {/* Top notch frame representation */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-3 bg-black/90 rounded-b-xl border-b border-x border-white/15" />

        {selectedStyle === "none" ? (
          <div className="flex items-center gap-2 text-stone-400">
            <EyeOff className="size-4" />
            <span className="text-xs font-medium text-stone-300">
              Stealth (Zero on-screen indicator)
            </span>
          </div>
        ) : selectedStyle === "notch_slim_band" ? (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1.5 rounded-b-md bg-stone-900 border-b border-x border-white/20 flex items-center justify-center px-1">
            <div
              className="h-[2px] w-full rounded-full animate-pulse transition-all"
              style={{
                backgroundColor: accent.primary,
                boxShadow: `0 0 8px ${accent.glow}`,
              }}
            />
          </div>
        ) : selectedStyle === "notch" ? (
          <div
            style={{
              borderColor: selectedAccent !== "monochrome" ? accent.border : undefined,
              boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 15px ${accent.bgGlow}`,
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 min-w-[210px] h-7 rounded-b-2xl bg-stone-900/95 border-b border-x border-white/20 px-3 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-0.5">
              {[4, 10, 16, 10, 5].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full animate-pulse"
                  style={{ height: `${h}px`, backgroundColor: accent.primary }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-stone-200">Listening…</span>
            <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-mono text-stone-300">
              Alt
            </span>
          </div>
        ) : selectedStyle === "notch_drop_pill" ? (
          <div
            style={{
              borderColor: selectedAccent !== "monochrome" ? accent.border : undefined,
              boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${accent.bgGlow}`,
            }}
            className="absolute top-4 left-1/2 -translate-x-1/2 min-w-[210px] h-7 rounded-full bg-stone-900/95 border border-white/20 px-3 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-0.5">
              {[4, 10, 16, 10, 5].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full animate-pulse"
                  style={{ height: `${h}px`, backgroundColor: accent.primary }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-stone-200">Listening…</span>
            <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-mono text-stone-300">
              Alt
            </span>
          </div>
        ) : (
          <div
            style={{
              borderColor: selectedAccent !== "monochrome" ? accent.border : undefined,
              boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${accent.bgGlow}`,
            }}
            className="min-w-[210px] h-7 rounded-full bg-stone-900/95 border border-white/20 px-3 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-0.5">
              {[4, 10, 16, 10, 5].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full animate-pulse"
                  style={{ height: `${h}px`, backgroundColor: accent.primary }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-stone-200">Listening…</span>
            <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-mono text-stone-300">
              Alt
            </span>
          </div>
        )}
      </div>

      {/* ── 5 Styles Selection List ──────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <Layout className="size-3.5 text-stone-500" />
          <span>Indicator Style</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OVERLAY_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => handleSelectStyle(style.id)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-stone-900 bg-stone-100 dark:border-white dark:bg-stone-800 ring-1 ring-stone-900 dark:ring-white"
                    : "border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40 dark:hover:bg-stone-800/50",
                )}
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-stone-900 dark:text-white">
                    {style.label}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    {style.tag}
                  </p>
                </div>
                {isSelected && (
                  <Check className="size-3.5 text-stone-900 dark:text-white shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Accent Color Swatches ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Accent Glow</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.values(ACCENT_PALETTES).map((pal) => {
            const isSelected = selectedAccent === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                title={pal.label}
                onClick={() => handleSelectAccent(pal.id)}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer",
                  isSelected
                    ? "ring-2 ring-stone-900 dark:ring-white scale-110"
                    : "border-black/15 hover:scale-105",
                )}
                style={{
                  backgroundColor: pal.primary,
                  boxShadow: isSelected ? `0 0 10px ${pal.glow}` : undefined,
                }}
              >
                {isSelected && (
                  <Check
                    className={cn(
                      "size-3",
                      pal.id === "monochrome" ? "text-stone-900" : "text-white",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Continue Button ─────────────────────────────────────────── */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="h-9 px-5 rounded-input bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
