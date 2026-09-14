import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// /api/download-count
//
// Server-side proxy to the Cloudflare Worker.
// Returns 503 instead of a fake number if the Worker is unreachable.
// The client-side DownloadCounter component hits the Worker directly,
// but this route exists for server-side usage / caching if needed.
// ---------------------------------------------------------------------------

const WORKER_URL =
  "https://hushwrite-download-counter.workinbox69.workers.dev";

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(WORKER_URL, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3_000),
    });

    if (!res.ok) throw new Error(`Worker responded ${res.status}`);

    const data = (await res.json()) as { count: number };
    return NextResponse.json(
      { count: data.count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Counter unavailable" },
      { status: 503 },
    );
  }
}

export async function POST() {
  try {
    await fetch(`${WORKER_URL}/increment`, {
      method: "POST",
      signal: AbortSignal.timeout(2_000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
