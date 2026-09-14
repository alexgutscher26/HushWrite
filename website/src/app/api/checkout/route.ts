/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { calculatePrice, generateLicenseKey, getStripeClient, PlanTierKey } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    const { tier, discountCode, customerEmail, customAmount } = body as {
      tier: PlanTierKey;
      discountCode?: string | null;
      customerEmail?: string | null;
      customAmount?: number | null;
    };

    if (tier !== "pro_lifetime" && tier !== "pro_annual" && tier !== "beta_backer_pwyw") {
      return NextResponse.json(
        { error: "Invalid tier specified. Expected 'pro_lifetime', 'pro_annual', or 'beta_backer_pwyw'." },
        { status: 400 },
      );
    }

    const pricing = calculatePrice(tier, discountCode, customAmount);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const licenseKey = generateLicenseKey(tier, discountCode);
    const stripe = getStripeClient();

    if (!stripe) {
      // Graceful fallback for local development or demo without active Stripe credentials
      const mockSessionId = `mock_sess_${Date.now()}_${randomBytes(8).toString("hex")}`;
      const successUrl = new URL("/pricing/success", origin);
      successUrl.searchParams.set("session_id", mockSessionId);
      successUrl.searchParams.set("plan", tier);
      successUrl.searchParams.set("key", licenseKey);
      if (discountCode) successUrl.searchParams.set("code", discountCode);

      return NextResponse.json({
        url: successUrl.toString(),
        sessionId: mockSessionId,
        mode: "mock",
        pricing,
        licenseKey,
      });
    }

    const successUrl = `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}&plan=${tier}${
      discountCode ? `&code=${encodeURIComponent(discountCode)}` : ""
    }&key=${encodeURIComponent(licenseKey)}`;
    const cancelUrl = `${origin}/pricing`;

    const isSubscription = tier === "pro_annual";

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            product_data: {
              name: pricing.name,
              description: pricing.discountApplied
                ? `Includes special discount: ${pricing.discountApplied}`
                : "HushWrite 100% on-device voice-to-text with Whisper Large v3 Turbo & Medium.",
              tax_code: process.env.STRIPE_PRODUCT_TAX_CODE || "txcd_10103000",
            },
            unit_amount: pricing.amountCents,
            ...(isSubscription
              ? {
                  recurring: {
                    interval: "year",
                  },
                }
              : {}),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
      customer_email: customerEmail?.trim() || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier,
        discountCode: discountCode || "NONE",
        licenseKey,
        customerEmail: customerEmail?.trim() || "",
      },
      ...(isSubscription
        ? {
            subscription_data: {
              metadata: {
                tier,
                discountCode: discountCode || "NONE",
                licenseKey,
                customerEmail: customerEmail?.trim() || "",
              },
            },
          }
        : {}),
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      licenseKey,
    });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
