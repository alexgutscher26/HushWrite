import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const platformParam = searchParams.get("platform") || searchParams.get("os");

  let targetPlatform = platformParam?.toLowerCase();
  if (!targetPlatform) {
    const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
    if (userAgent.includes("win")) {
      targetPlatform = "windows";
    } else if (userAgent.includes("mac")) {
      targetPlatform = "mac";
    } else {
      targetPlatform = "windows";
    }
  }

  // Default to serving the Windows x64 NSIS setup executable
  return NextResponse.redirect(
    new URL("/downloads/HushWrite_1.2.1_x64-setup.exe", origin),
    {
      status: 302,
      headers: {
        "Content-Disposition": 'attachment; filename="HushWrite_1.2.1_x64-setup.exe"',
      },
    }
  );
}
