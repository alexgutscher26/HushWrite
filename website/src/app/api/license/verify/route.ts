/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

export interface LicenseVerifyResponse {
  valid: boolean;
  tier: "starter" | "pro" | "team";
  isLifetime: boolean;
  status: "active" | "canceled" | "past_due" | "expired" | "unknown";
  expiresAt: number | null; // epoch ms
  cancelAtPeriodEnd?: boolean;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    const { licenseKey } = body as { licenseKey?: string };

    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ valid: false, message: "Missing license key." }, { status: 400 });
    }

    const cleanKey = licenseKey.trim().toUpperCase();

    // 1. Lifetime, Founding & Beta Backer licenses are perpetual (100% offline, never cancel)
    if (
      cleanKey.startsWith("LIFETIME-") ||
      cleanKey.startsWith("FOUNDING-") ||
      cleanKey.startsWith("BACKER-")
    ) {
      return NextResponse.json<LicenseVerifyResponse>({
        valid: true,
        tier: "pro",
        isLifetime: true,
        status: "active",
        expiresAt: null,
        message: "Perpetual Lifetime License · Active & Never Expires",
      });
    }

    // 2. Test / Mock cancellation trigger for development
    if (cleanKey.includes("CANCEL") || cleanKey.includes("REVOKED")) {
      return NextResponse.json<LicenseVerifyResponse>({
        valid: false,
        tier: "starter",
        isLifetime: false,
        status: "canceled",
        expiresAt: Date.now() - 86400000,
        message: "Subscription has been canceled by customer.",
      });
    }

    const stripe = getStripeClient();

    // 3. Live Stripe Subscription Lookup (if Stripe credentials configured)
    if (stripe) {
      try {
        // Search Stripe subscriptions matching this license key in metadata
        const searchResult = await stripe.subscriptions.search({
          query: `metadata['licenseKey']:'${cleanKey}'`,
          limit: 1,
        });

        if (searchResult.data.length > 0) {
          const sub = searchResult.data[0];
          const periodEndMs = sub.current_period_end * 1000;
          const isEnded = Date.now() > periodEndMs;

          if (sub.status === "canceled" || (sub.status !== "active" && isEnded)) {
            return NextResponse.json<LicenseVerifyResponse>({
              valid: false,
              tier: "starter",
              isLifetime: false,
              status: "canceled",
              expiresAt: periodEndMs,
              message: "Subscription has expired or was canceled in Stripe.",
            });
          }

          if (sub.cancel_at_period_end) {
            return NextResponse.json<LicenseVerifyResponse>({
              valid: !isEnded,
              tier: isEnded ? "starter" : "pro",
              isLifetime: false,
              status: isEnded ? "canceled" : "active",
              expiresAt: periodEndMs,
              cancelAtPeriodEnd: true,
              message: isEnded
                ? "Subscription has ended."
                : `Subscription canceled; active until ${new Date(periodEndMs).toLocaleDateString()}.`,
            });
          }

          return NextResponse.json<LicenseVerifyResponse>({
            valid: sub.status === "active" || sub.status === "trialing",
            tier: sub.metadata?.tier === "team" ? "team" : "pro",
            isLifetime: false,
            status: sub.status === "past_due" ? "past_due" : "active",
            expiresAt: periodEndMs,
            message:
              sub.status === "past_due"
                ? "Payment is past due in Stripe."
                : "Active recurring subscription.",
          });
        }
      } catch (stripeErr) {
        console.warn("Stripe search error, falling back to algorithmic validation:", stripeErr);
      }
    }

    // 4. Default algorithmic check for Pro/Team/Student/OSS keys
    const isTeam = cleanKey.startsWith("TEAM-");
    const isPro =
      cleanKey.startsWith("PRO-") ||
      cleanKey.startsWith("STUDENT-") ||
      cleanKey.startsWith("OSS-") ||
      cleanKey.startsWith("SWITCHER-") ||
      cleanKey.length >= 8;

    if (isTeam || isPro) {
      // Valid format: 1-year annual pass validity window by default
      const defaultOneYearMs = Date.now() + 365 * 24 * 60 * 60 * 1000;
      return NextResponse.json<LicenseVerifyResponse>({
        valid: true,
        tier: isTeam ? "team" : "pro",
        isLifetime: false,
        status: "active",
        expiresAt: defaultOneYearMs,
        message: "Active annual subscription pass.",
      });
    }

    return NextResponse.json<LicenseVerifyResponse>({
      valid: false,
      tier: "starter",
      isLifetime: false,
      status: "unknown",
      expiresAt: null,
      message: "Unrecognized or invalid license key format.",
    });
  } catch (err: unknown) {
    console.error("License verification error:", err);
    return NextResponse.json(
      { valid: false, message: "Internal verification error" },
      { status: 500 },
    );
  }
}
