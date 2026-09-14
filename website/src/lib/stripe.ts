import Stripe from "stripe";

export type PlanTierKey = "pro_lifetime" | "pro_annual" | "beta_backer_pwyw";
export type DiscountCode = "SWITCHER-40" | "STUDENT-50" | "OSS-50" | string;

export interface PricingDetails {
  tier: PlanTierKey;
  name: string;
  amountCents: number;
  currency: string;
  interval?: "year";
  discountApplied?: string;
  originalAmountCents: number;
}

export interface CheckoutSessionDetails {
  sessionId: string;
  customerEmail: string | null;
  customerName: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentStatus: string;
  status: string | null;
  licenseKey: string;
  tier: PlanTierKey;
  discountCode: string | null;
  isSubscription: boolean;
  subscriptionId?: string | null;
  invoiceUrl?: string | null;
}

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: (process.env.STRIPE_API_VERSION ||
        "2025-03-31.basil") as unknown as Stripe.LatestApiVersion,
      typescript: true,
      appInfo: {
        name: "HushWrite",
        version: "0.1.0",
        url: "https://hushwrite.app",
      },
    });
  }

  return stripeInstance;
}

export function calculatePrice(
  tier: PlanTierKey,
  discountCode?: string | null,
  customAmountDollars?: number | null,
): PricingDetails {
  const normalizedDiscount = discountCode?.trim().toUpperCase();

  if (tier === "beta_backer_pwyw") {
    const originalAmountCents = 4900;
    // Default to $25 if not provided, clamp minimum to $10 (1000 cents)
    const dollars = Math.max(10, Math.round(Number(customAmountDollars) || 25));
    const amountCents = dollars * 100;

    return {
      tier,
      name: `HushWrite Early Beta Backer Lifetime ($${dollars} Pay What You Want)`,
      amountCents,
      currency: "usd",
      discountApplied: `Beta Backer Tier ($${dollars} custom contribution, $49 std value)`,
      originalAmountCents,
    };
  }

  if (tier === "pro_lifetime") {
    const originalAmountCents = 4900; // $49.00 Founding Beta

    if (normalizedDiscount === "SWITCHER-40") {
      return {
        tier,
        name: "HushWrite Founding Beta (Switcher Guarantee)",
        amountCents: 3900, // $39.00 ($10 off)
        currency: "usd",
        discountApplied: "Switcher Guarantee ($10 Off Founding Beta)",
        originalAmountCents,
      };
    }

    if (normalizedDiscount === "STUDENT-50" || normalizedDiscount === "OSS-50") {
      return {
        tier,
        name:
          normalizedDiscount === "STUDENT-50"
            ? "HushWrite Founding Beta (Student & Academic Grant)"
            : "HushWrite Founding Beta (Open Source Maintainer Grant)",
        amountCents: 2400, // $24.00 (~50% off)
        currency: "usd",
        discountApplied: "Academic / OSS 50% Grant",
        originalAmountCents,
      };
    }

    if (normalizedDiscount?.startsWith("HUSHWRITE-") || normalizedDiscount?.startsWith("REF-")) {
      return {
        tier,
        name: "HushWrite Founding Beta (Referral Bonus)",
        amountCents: 3900, // $39.00 ($10 off)
        currency: "usd",
        discountApplied: `Friend Referral Bonus ($10 Off with ${normalizedDiscount})`,
        originalAmountCents,
      };
    }

    return {
      tier,
      name: "HushWrite Founding Beta License",
      amountCents: 4900,
      currency: "usd",
      originalAmountCents,
    };
  }

  // tier === "pro_annual"
  const originalAmountCents = 4900; // $49.00 / yr

  if (normalizedDiscount === "SWITCHER-40") {
    return {
      tier,
      name: "HushWrite Pro Annual Pass (Switcher Deal)",
      amountCents: 2900, // $29.00 / first yr (40% off)
      currency: "usd",
      interval: "year",
      discountApplied: "Switcher Deal (40% Off First Year)",
      originalAmountCents,
    };
  }

  if (normalizedDiscount === "STUDENT-50" || normalizedDiscount === "OSS-50") {
    return {
      tier,
      name:
        normalizedDiscount === "STUDENT-50"
          ? "HushWrite Pro Annual Pass (Student Grant)"
          : "HushWrite Pro Annual Pass (Open Source Grant)",
      amountCents: 2400, // $24.00 / yr (50% off)
      currency: "usd",
      interval: "year",
      discountApplied: "Academic / OSS 50% Annual Grant",
      originalAmountCents,
    };
  }

  if (normalizedDiscount?.startsWith("HUSHWRITE-") || normalizedDiscount?.startsWith("REF-")) {
    return {
      tier,
      name: "HushWrite Pro Annual Pass (Referral Bonus)",
      amountCents: 3900, // $39.00 / yr ($10 off)
      currency: "usd",
      interval: "year",
      discountApplied: `Friend Referral Bonus ($10 Off with ${normalizedDiscount})`,
      originalAmountCents,
    };
  }

  return {
    tier,
    name: "HushWrite Pro Annual Pass",
    amountCents: 4900,
    currency: "usd",
    interval: "year",
    originalAmountCents,
  };
}

/**
 * Generates an authentic, cryptographically-spaced HushWrite license key.
 * Formats match desktop app activation rules in `src/lib/plan.ts`.
 */
export function generateLicenseKey(tier: PlanTierKey, discountCode?: string | null): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Base32 unambiguous
  const chunk = (len: number) => {
    let res = "";
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const discount = discountCode?.trim().toUpperCase();

  let prefix = "PRO";
  if (discount === "SWITCHER-40") {
    prefix = "SWITCHER";
  } else if (discount === "STUDENT-50") {
    prefix = "STUDENT";
  } else if (discount === "OSS-50") {
    prefix = "OSS";
  } else if (tier === "beta_backer_pwyw") {
    prefix = "BACKER";
  } else if (tier === "pro_lifetime") {
    prefix = "FOUNDING";
  }

  return `${prefix}-${chunk(4)}-${chunk(4)}-${chunk(4)}`;
}

/** Formats cents into human readable dollar strings (e.g. 4900 -> "$49.00") */
export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
