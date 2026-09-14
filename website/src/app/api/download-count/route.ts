import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// /api/download-count
//
// Calculates real-time live downloads aggregated from the persistent
// Cloudflare KV counter (and GitHub Releases asset statistics fallback).
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WORKER_URL =
  process.env.DOWNLOAD_COUNTER_URL ||
  "https://hushwrite-download-counter.workinbox69.workers.dev";

interface GitHubAsset {
  name: string;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

let cachedCount: number | null = null;
let lastFetchTime = 0;

async function fetchLiveDownloads(): Promise<number> {
  const now = Date.now();
  // Short 2s in-memory throttle to protect against bursts
  if (cachedCount !== null && now - lastFetchTime < 2_000) {
    return cachedCount;
  }

  // 1. Primary: Cloudflare KV Persistent Download Counter
  try {
    const workerRes = await fetch(WORKER_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (workerRes.ok) {
      const data = (await workerRes.json()) as { count?: number };
      if (typeof data.count === "number" && data.count >= 0) {
        cachedCount = data.count;
        lastFetchTime = now;
        return data.count;
      }
    }
  } catch {
    // Cloudflare Worker unreachable, fall back to GitHub Releases API
  }

  // 2. Fallback: Aggregate directly from GitHub Releases assets
  try {
    const res = await fetch("https://api.github.com/repos/alexgutscher26/HushWrite/releases", {
      headers: {
        "User-Agent": "HushWrite-Website-Counter",
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    if (res.ok) {
      const releases = (await res.json()) as GitHubRelease[];
      let total = 0;
      if (Array.isArray(releases)) {
        for (const release of releases) {
          if (Array.isArray(release.assets)) {
            for (const asset of release.assets) {
              total += asset.download_count || 0;
            }
          }
        }
      }
      if (total > 0) {
        cachedCount = total;
        lastFetchTime = now;
        return total;
      }
    }
  } catch {
    // Both unavailable, return cached value or 0
  }

  return cachedCount ?? 0;
}

export async function GET() {
  try {
    const count = await fetchLiveDownloads();

    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { count: cachedCount ?? 0 },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}

export async function POST() {
  try {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3_000),
    });

    if (res.ok) {
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") {
        cachedCount = data.count;
        lastFetchTime = Date.now();
        return NextResponse.json({ ok: true, count: data.count });
      }
    }
  } catch {
    // Silently fall back
  }

  if (cachedCount !== null) {
    cachedCount += 1;
  }
  return NextResponse.json({ ok: true, count: cachedCount ?? 1 });
}
