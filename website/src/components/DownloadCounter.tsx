"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

// ---------------------------------------------------------------------------
// DownloadCounter
//
// Fetches the live count directly from the Cloudflare Worker.
// Renders nothing if the Worker is unreachable — no static fallback.
// ---------------------------------------------------------------------------

const WORKER_URL =
  "https://hushwrite-download-counter.workinbox69.workers.dev";

function formatCount(n: number): string {
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k+";
  }
  return n.toLocaleString() + "+";
}

export function DownloadCounter({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(WORKER_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ count: number }>;
      })
      .then(({ count }) => {
        if (!cancelled && typeof count === "number" && count > 0) {
          setCount(count);
        }
      })
      .catch(() => {
        // Worker unreachable — render nothing
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Animate from 0 → real count once data arrives
  useEffect(() => {
    if (count === null) return;
    const duration = 1200;
    const startTime = performance.now();
    let raf: number;

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(count! * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  // Don't render anything until we have a real live value
  if (count === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-xs font-mono select-none ${className}`}
    >
      <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="font-semibold text-neutral-900 tabular-nums">
        {formatCount(displayed)}
      </span>
      <span className="text-neutral-500">free downloads</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
    </div>
  );
}
