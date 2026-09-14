/**
 * HushWrite Download Counter — Cloudflare Worker
 *
 * Stores a monotonically-increasing download count in Cloudflare KV.
 * Exposes two endpoints:
 *
 *   GET  /          → { "count": 1842 }
 *   POST /increment → { "ok": true, "count": 1843 }
 *
 * CORS is open so the Next.js server-side fetch (running on Vercel) can reach it.
 * The KV binding is named DOWNLOAD_COUNTER (see wrangler.toml).
 */

export interface Env {
  DOWNLOAD_COUNTER: KVNamespace;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
} as const;

const KV_KEY = "total_downloads";

async function getCount(kv: KVNamespace): Promise<number> {
  const raw = await kv.get(KV_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // POST /increment — atomic-ish increment using a read-modify-write.
    // For very high traffic, replace with Durable Objects for true atomicity.
    if (request.method === "POST" && url.pathname === "/increment") {
      const current = await getCount(env.DOWNLOAD_COUNTER);
      const next = current + 1;
      await env.DOWNLOAD_COUNTER.put(KV_KEY, String(next));
      return new Response(JSON.stringify({ ok: true, count: next }), {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // GET / — return the current count
    if (request.method === "GET") {
      const count = await getCount(env.DOWNLOAD_COUNTER);
      return new Response(JSON.stringify({ count }), {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
