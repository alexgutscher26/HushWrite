"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

// ---------------------------------------------------------------------------
// DownloadCounter
//
// Fetches /api/download-count on mount, shows an animated number, and
// falls back gracefully if the endpoint is unavailable.
//
// Props:
//   className  — optional extra class names on the wrapper
// ---------------------------------------------------------------------------

interface Props {
  className?: string;
}

function formatCount(n: number): string {
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k+";
  }
  return n.toLocaleString() + "+";
}

export function DownloadCounter({ className = "" }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const [isLive, setIsLive] = useState(false);

  // Fetch the count once on mount.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/download-count")
      .then((r) => r.json())
      .then((data: { count: number; source: string }) => {
        if (cancelled) return;
        setCount(data.count);
        setIsLive(data.source === "live");
      })
      .catch(() => {
        // Network error — leave count as null (skeleton stays hidden)
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Animate the number upward from 0 when count arrives.
  useEffect(() => {
    if (count === null) return;

    const start = 0;
    const end = count;
    const duration = 1200; // ms
    const startTime = performance.now();

    let raf: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  // Don't render until we have a value (avoids layout shift).
  if (count === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-xs font-mono select-none ${className}`}
      title={isLive ? "Live download count" : "Approximate download count"}
    >
      <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="font-semibold text-neutral-900 tabular-nums">
        {formatCount(displayed)}
      </span>
      <span className="text-neutral-500">free downloads</span>
      {isLive && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
          aria-label="live"
        />
      )}
    </div>
  );
}
