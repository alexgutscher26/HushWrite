import { NextRequest, NextResponse } from "next/server";

const DOWNLOADS = {
  windows: {
    path: "/downloads/HushWrite_1.3.0_x64-setup.exe",
    filename: "HushWrite_1.3.0_x64-setup.exe",
  },
  "windows-msi": {
    path: "/downloads/HushWrite_1.3.0_x64_en-US.msi",
    filename: "HushWrite_1.3.0_x64_en-US.msi",
  },
} as const;

type DownloadPlatform = keyof typeof DOWNLOADS;

function detectPlatform(request: NextRequest, requested: string | null): string {
  if (requested) return requested.trim().toLowerCase();

  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
}

function isDownloadPlatform(platform: string): platform is DownloadPlatform {
  return platform in DOWNLOADS;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const platform = detectPlatform(
    request,
    searchParams.get("platform") || searchParams.get("os"),
  );

  if (!isDownloadPlatform(platform)) {
    return NextResponse.json(
      {
        error: "No hosted installer is available for this platform yet.",
        platform,
        supportedPlatforms: Object.keys(DOWNLOADS),
      },
      { status: 404 },
    );
  }

  const download = DOWNLOADS[platform];

  // Fire-and-forget counter increment — never blocks the download redirect.
  void fetch(new URL("/api/download-count", origin).toString(), {
    method: "POST",
  }).catch(() => {
    // Silently ignore — incrementing is best-effort.
  });

  return NextResponse.redirect(new URL(download.path, origin), {
    status: 302,
    headers: {
      "Content-Disposition": `attachment; filename="${download.filename}"`,
    },
  });
}
