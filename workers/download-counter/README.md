# Download Counter — Cloudflare Worker

A lightweight Cloudflare Worker that stores a monotonically-increasing
download count in **Cloudflare KV** and exposes it over HTTP. The Next.js
`/api/download-count` route fetches from here and caches the result for 60s.

---

## One-time setup

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the KV namespace

```bash
cd workers/download-counter
wrangler kv namespace create "DOWNLOAD_COUNTER"
```

Copy the `id` printed in the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "DOWNLOAD_COUNTER"
id = "abc123..."   # ← replace this
```

### 3. Seed the counter (start at a number matching your real downloads)

```bash
wrangler kv key put --namespace-id=<YOUR_ID> --remote "total_downloads" "1842"
```

### 4. Deploy

```bash
wrangler deploy
```

The Worker URL will be printed, e.g.:

```
https://hushwrite-download-counter.<your-account>.workers.dev
```

---

## Wire up the Next.js API route

Set the environment variable in your Vercel project dashboard (or `.env.local`
for local testing):

```
DOWNLOAD_COUNTER_URL=https://hushwrite-download-counter.<account>.workers.dev
```

Without this variable set, the `/api/download-count` route returns the static
fallback value (`STATIC_FALLBACK` in `route.ts`) silently.

---

## Endpoints

| Method | Path         | Description                              |
| ------ | ------------ | ---------------------------------------- |
| `GET`  | `/`          | Returns `{ "count": 1842 }`              |
| `POST` | `/increment` | Increments count by 1, returns new count |

---

## Production hardening (optional)

For very high traffic, replace the KV read-modify-write with a
**Durable Object** for true atomic increments. The current approach is
fine for thousands of downloads per day; at 100+ concurrent increments
per second, counter drift may occur.

---

## Deployed Worker

- **URL:** `https://hushwrite-download-counter.workinbox69.workers.dev`
- **KV Namespace ID:** `7c16b72d8710477dafa70b4b6469db10`
- **Version:** `84c77b60-aba8-486b-b572-b4f6dafe95d8`

Set this in Vercel env vars:

```n DOWNLOAD_COUNTER_URL=https://hushwrite-download-counter.workinbox69.workers.dev

```
