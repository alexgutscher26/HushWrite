import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, PlanTierKey } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required 'session_id' parameter." },
        { status: 400 },
      );
    }

    // Mock session support for development
    if (sessionId.startsWith("mock_sess_")) {
      const plan = (searchParams.get("plan") as PlanTierKey) || "pro_lifetime";
      const key = searchParams.get("key") || "FOUNDING-TEST-DEMO-KEY";
      const code = searchParams.get("code") || null;

      return NextResponse.json({
        sessionId,
        customerEmail: "developer@example.com",
        customerName: "HushWrite Tester",
        amountTotal: plan === "pro_lifetime" ? 4900 : 4900,
        currency: "usd",
        paymentStatus: "paid",
        status: "complete",
        licenseKey: key,
        tier: plan,
        discountCode: code,
        isSubscription: plan === "pro_annual",
        mode: "mock",
      });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe credentials are not configured on the server." },
        { status: 503 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription", "line_items"],
    });

    if (!session) {
      return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
    }

    const tier = (session.metadata?.tier as PlanTierKey) || "pro_lifetime";
    const licenseKey = session.metadata?.licenseKey || "";
    const discountCode =
      session.metadata?.discountCode !== "NONE" ? session.metadata?.discountCode : null;

    const customerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.customerEmail ||
      (typeof session.customer === "object" && session.customer && "email" in session.customer
        ? (session.customer as { email?: string }).email
        : null) ||
      null;

    const customerName =
      session.customer_details?.name ||
      (typeof session.customer === "object" && session.customer && "name" in session.customer
        ? (session.customer as { name?: string }).name
        : null) ||
      null;

    const isSubscription = session.mode === "subscription";
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;

    return NextResponse.json({
      sessionId: session.id,
      customerEmail,
      customerName,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
      status: session.status,
      licenseKey,
      tier,
      discountCode,
      isSubscription,
      subscriptionId,
    });
  } catch (err: unknown) {
    console.error("Error retrieving Stripe session:", err);
    const message = err instanceof Error ? err.message : "Failed to retrieve checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
