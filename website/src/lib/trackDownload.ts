// ---------------------------------------------------------------------------
// trackDownload.ts
// Best-effort live download tracking that notifies the Cloudflare KV counter
// and updates on-page DownloadCounter components in real time.
// ---------------------------------------------------------------------------

export async function trackDownload(filename?: string) {
  try {
    // Notify local UI components immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hushwrite:downloaded", {
          detail: { filename, timestamp: Date.now() },
        }),
      );
    }

    // Call the download-count increment API (best-effort fire-and-forget)
    await fetch("/api/download-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    // Silently ignore network failures on tracking
  }
}
