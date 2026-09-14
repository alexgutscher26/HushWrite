import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// /api/download-count
//
// Calculates real-time live downloads aggregated directly from GitHub Releases
// asset statistics (and local increments).
// No fake/seeded numbers.
// ---------------------------------------------------------------------------

export const revalidate = 60;

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
let localIncrementOffset = 0;

async function fetchRealGitHubDownloads(): Promise<number> {
  const now = Date.now();
  // Cache for 60 seconds in-memory to prevent GitHub rate limits
  if (cachedCount !== null && now - lastFetchTime < 60_000) {
    return cachedCount + localIncrementOffset;
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/alexgutscher26/HushWrite/releases",
      {
        headers: {
          "User-Agent": "HushWrite-Website-Counter",
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(4_000),
      }
    );

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
      cachedCount = total;
      lastFetchTime = now;
      return total + localIncrementOffset;
    }
  } catch {
    // If GitHub API is temporarily unreachable, return cached value or fallback
  }

  return (cachedCount ?? 0) + localIncrementOffset;
}

export async function GET() {
  try {
    const count = await fetchRealGitHubDownloads();

    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { count: cachedCount ?? 0 },
      { status: 200 }
    );
  }
}

export async function POST() {
  localIncrementOffset += 1;
  return NextResponse.json({ ok: true, count: (cachedCount ?? 0) + localIncrementOffset });
}
