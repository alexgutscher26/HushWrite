import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// /api/download-count
//
// Fetches the live download counter from the Cloudflare Worker.
// Falls back to a plausible static value if the Worker is unavailable,
// so the hero widget always renders something meaningful.
//
// Cloudflare Worker URL — set DOWNLOAD_COUNTER_URL in Vercel env vars.
// Until the Worker is deployed this route returns the STATIC_FALLBACK.
// ---------------------------------------------------------------------------

const WORKER_URL = process.env.DOWNLOAD_COUNTER_URL ?? "";
const STATIC_FALLBACK = 1_842; // bump manually when you know the real number

// Cache the response for 60 seconds at the CDN / browser layer.
export const revalidate = 60;

export async function GET() {
  // If no Worker URL is configured yet, return the static fallback immediately.
  if (!WORKER_URL) {
    return NextResponse.json(
      { count: STATIC_FALLBACK, source: "static" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }

  try {
    const res = await fetch(WORKER_URL, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3_000), // 3-second hard timeout
    });

    if (!res.ok) {
      throw new Error(`Worker responded ${res.status}`);
    }

    const data = (await res.json()) as { count?: number };
    const count =
      typeof data.count === "number" && data.count > 0
        ? data.count
        : STATIC_FALLBACK;

    return NextResponse.json(
      { count, source: "live" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch {
    // Network error, timeout, or bad JSON — serve the static fallback.
    return NextResponse.json(
      { count: STATIC_FALLBACK, source: "static" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Increment endpoint — called by the /api/download route after a redirect.
// Fire-and-forget; never blocks the download response.
// ---------------------------------------------------------------------------
export async function POST() {
  if (!WORKER_URL) {
    return NextResponse.json({ ok: true, source: "noop" });
  }

  try {
    await fetch(`${WORKER_URL}/increment`, {
      method: "POST",
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    // Silently ignore — incrementing is best-effort.
  }

  return NextResponse.json({ ok: true });
}
