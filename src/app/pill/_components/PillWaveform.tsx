/**
 * SOURCE OF TRUTH KEYWORDS: PillWaveform, audioLevelChanged, 5-bar audio visualizer
 * WHAT:  Subscribes to audio-level-changed and animates the 5-bar white audio visualizer
 *        directly on the DOM for zero React re-render overhead.
 * WHERE: The pill's RECORDING / ARMING state.
 */

import { useRef } from "react";
import { events } from "@/lib/bindings";
import { useTauriEvent } from "@/lib/use-event";
import { getAccentConfig, type AccentColorId } from "@/lib/accent";
import { cn } from "@/lib/utils";

const BASE_HEIGHTS = [4, 11, 18, 11, 4];
const MAX_HEIGHTS = [8, 18, 24, 18, 8];

export function PillWaveform({
  className,
  barClassName,
  accentId,
  count = 5,
}: {
  className?: string;
  barClassName?: string;
  accentId?: string | null;
  count?: number;
}) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const gateLineRef = useRef<HTMLDivElement | null>(null);
  const accent = getAccentConfig(accentId as AccentColorId);

  useTauriEvent(events.audioLevelChanged, (payload) => {
    const rms = payload.level.rms ?? payload.level.peak ?? 0;
    const ratio = Math.min(1, Math.max(0, rms / 0.28));
    const smoothed = Math.pow(ratio, 0.65);

    for (let i = 0; i < count; i++) {
      const el = barsRef.current[i];
      if (!el) continue;
      const base = BASE_HEIGHTS[i % BASE_HEIGHTS.length];
      const max = MAX_HEIGHTS[i % MAX_HEIGHTS.length];
      const h = base + (max - base) * smoothed;
      el.style.height = `${h.toFixed(1)}px`;
    }

    if (gateLineRef.current && payload.level.gate_threshold != null && payload.level.gate_threshold > 0) {
      const gateRatio = Math.min(1, Math.max(0, payload.level.gate_threshold / 0.28));
      const gateHeight = 4 + 16 * Math.pow(gateRatio, 0.65);
      gateLineRef.current.style.bottom = `${gateHeight.toFixed(1)}px`;
      gateLineRef.current.style.opacity = "0.45";
    }
  });

  return (
    <div
      className={cn("relative flex items-center gap-[2.5px] h-[24px] shrink-0", className)}
      aria-hidden="true"
    >
      <div
        ref={gateLineRef}
        className="absolute left-0 right-0 h-[1px] bg-white/40 pointer-events-none transition-all duration-150 rounded-full"
        style={{ opacity: 0, bottom: "4px" }}
      />
      {Array.from({ length: count }).map((_, i) => {
        const h = BASE_HEIGHTS[i % BASE_HEIGHTS.length];
        return (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className={cn(
              "w-[3px] rounded-full transition-[height] duration-75 ease-out",
              barClassName,
            )}
            style={{
              height: `${h}px`,
              backgroundColor: accent.primary,
              boxShadow:
                accentId && accentId !== "monochrome" ? `0 0 8px ${accent.glow}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
