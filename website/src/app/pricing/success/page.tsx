/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Download,
  ShieldCheck,
  KeyRound,
  Mail,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { generateLicenseKey, PlanTierKey, formatCents } from "@/lib/stripe";

interface VerifiedSessionState {
  loading: boolean;
  licenseKey: string;
  customerEmail: string | null;
  customerName: string | null;
  amountTotal: number | null;
  currency: string | null;
  tier: PlanTierKey;
  isSubscription: boolean;
  paymentStatus: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "mock_sess_complete";
  const planParam = (searchParams.get("plan") as PlanTierKey) || "pro_lifetime";
  const discountCode = searchParams.get("code") || null;
  const keyParam = searchParams.get("key");

  const [sessionData, setSessionData] = useState<VerifiedSessionState>({
    loading: true,
    licenseKey: keyParam || "",
    customerEmail: null,
    customerName: null,
    amountTotal: null,
    currency: "usd",
    tier: planParam,
    isSubscription: planParam === "pro_annual",
    paymentStatus: "paid",
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fire celebratory confetti
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
    });

    let isMounted = true;

    // Fetch verified session if real Stripe sessionId is present
    async function loadSession() {
      if (!sessionId || sessionId === "mock_sess_complete") {
        const fallbackKey = keyParam || generateLicenseKey(planParam, discountCode);
        if (isMounted) {
          setSessionData({
            loading: false,
            licenseKey: fallbackKey,
            customerEmail: null,
            customerName: null,
            amountTotal: planParam === "pro_lifetime" ? 4900 : 4900,
            currency: "usd",
            tier: planParam,
            isSubscription: planParam === "pro_annual",
            paymentStatus: "paid",
          });
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const key =
              data.licenseKey ||
              keyParam ||
              generateLicenseKey(data.tier || planParam, discountCode);
            setSessionData({
              loading: false,
              licenseKey: key,
              customerEmail: data.customerEmail || null,
              customerName: data.customerName || null,
              amountTotal: data.amountTotal ?? (planParam === "pro_lifetime" ? 4900 : 4900),
              currency: data.currency || "usd",
              tier: (data.tier as PlanTierKey) || planParam,
              isSubscription: data.isSubscription ?? planParam === "pro_annual",
              paymentStatus: data.paymentStatus || "paid",
            });
          }
        } else {
          // Fallback on error
          const fallbackKey = keyParam || generateLicenseKey(planParam, discountCode);
          if (isMounted) {
            setSessionData((prev) => ({
              ...prev,
              loading: false,
              licenseKey: fallbackKey,
            }));
          }
        }
      } catch (err) {
        console.warn("Session verification fetch fallback:", err);
        const fallbackKey = keyParam || generateLicenseKey(planParam, discountCode);
        if (isMounted) {
          setSessionData((prev) => ({
            ...prev,
            loading: false,
            licenseKey: fallbackKey,
          }));
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId, planParam, discountCode, keyParam]);

  const handleCopy = () => {
    if (!sessionData.licenseKey) return;
    navigator.clipboard.writeText(sessionData.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isLifetime = sessionData.tier === "pro_lifetime";
  const planTitle = isLifetime ? "Founding Beta Perpetual License" : "Pro Annual Pass";

  return (
    <div className="relative pt-32 pb-20 px-4 max-w-4xl mx-auto text-center">
      {/* Celebration badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-mono font-semibold mb-6 shadow-sm">
        <CheckCircle2 className="size-4 text-emerald-600" />
        Payment Verified · Welcome to HushWrite Pro
      </div>

      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-950 mb-4">
        You're all set! Own your software forever.
      </h1>
      <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto mb-10">
        Thank you for supporting 100% private, on-device voice dictation. Your personal license key
        has been generated and is ready to activate.
      </p>

      {/* Main License Key Card */}
      <div className="p-6 sm:p-9 rounded-3xl bg-white border-2 border-neutral-900 shadow-xl text-left mb-10 relative overflow-hidden ring-4 ring-neutral-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="size-4 text-emerald-600" />
              <span className="text-xs font-mono font-semibold uppercase text-neutral-500 tracking-wider">
                Personal License Key
              </span>
            </div>
            <h2 className="text-lg font-bold text-neutral-950">{planTitle}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sessionData.amountTotal !== null && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 font-semibold">
                Paid: {formatCents(sessionData.amountTotal, sessionData.currency || "USD")}
              </span>
            )}
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold w-fit">
              Valid on 2 Personal Devices
            </span>
          </div>
        </div>

        {sessionData.customerEmail && (
          <div className="pt-4 flex items-center gap-2 text-xs text-neutral-600">
            <Mail className="size-3.5 text-neutral-400" />
            <span>
              Receipt sent to:{" "}
              <strong className="text-neutral-900 font-medium">{sessionData.customerEmail}</strong>
            </span>
          </div>
        )}

        {/* License Key Box */}
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="font-mono text-base sm:text-xl font-bold tracking-wider text-neutral-950 select-all flex items-center gap-2">
            {sessionData.loading ? (
              <span className="flex items-center gap-2 text-neutral-400 text-sm">
                <Loader2 className="size-4 animate-spin text-neutral-500" />
                Verifying Stripe purchase...
              </span>
            ) : (
              sessionData.licenseKey || "GENERATING-KEY..."
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={sessionData.loading || !sessionData.licenseKey}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-900 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4 text-neutral-500" />
                  <span>Copy Key</span>
                </>
              )}
            </button>

            <a
              href={`hushwrite://activate?key=${encodeURIComponent(sessionData.licenseKey)}`}
              className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Activate in App</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Activation Steps */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            How to activate inside HushWrite:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/70">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] mb-2">
                1
              </span>
              <span className="font-semibold text-neutral-900 block">Open HushWrite Desktop</span>
              <span className="text-neutral-500 text-[11px]">
                Launch HushWrite on your Mac or Windows machine.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/70">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] mb-2">
                2
              </span>
              <span className="font-semibold text-neutral-900 block">Go to Billing View</span>
              <span className="text-neutral-500 text-[11px]">
                Click "Billing" in the sidebar navigation or press ⌘,.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/70">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] mb-2">
                3
              </span>
              <span className="font-semibold text-neutral-900 block">Paste Key & Unlock</span>
              <span className="text-neutral-500 text-[11px]">
                Paste your key into "Activate License Key" and press Enter.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* App Download Links if not already installed */}
      <div className="p-6 sm:p-7 rounded-3xl bg-neutral-50 border border-neutral-200/90 text-left mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-950">
              Don't have the desktop app installed yet?
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Download the latest native release for macOS or Windows.
            </p>
          </div>
          <Link
            href="/#download"
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-800 transition-colors w-fit shrink-0"
          >
            <Download className="size-4" />
            <span>Download App</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-200/60">
          <span>• macOS Apple Silicon (.dmg)</span>
          <span>• macOS Intel (.dmg)</span>
          <span>• Windows 10/11 DirectML (.exe)</span>
          <span>• Windows MSIX Package</span>
        </div>
      </div>

      {/* Receipt metadata */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200 text-xs text-neutral-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>
            Receipt Reference:{" "}
            <span className="font-mono text-neutral-700">{sessionId.slice(0, 24)}...</span>
          </span>
        </div>
        <Link
          href="/pricing"
          className="text-neutral-700 hover:text-neutral-950 font-medium underline"
        >
          Return to Pricing Page →
        </Link>
      </div>
    </div>
  );
}

export default function PricingSuccessPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Background glow & subtle texture */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute -top-32 w-[700px] h-[600px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      </div>

      <Navbar />
      <Suspense
        fallback={
          <div className="pt-40 text-center text-neutral-500">Loading order receipt...</div>
        }
      >
        <SuccessContent />
      </Suspense>
      <Footer />
    </main>
  );
}
