/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import { SwitcherModal } from "@/components/SwitcherModal";
import { StudentGrantModal } from "@/components/StudentGrantModal";
import { PlanTierKey } from "@/lib/stripe";

type ProBilling = "lifetime" | "annual";

interface PricingTier {
  id: "free" | "pro" | "team";
  name: string;
  badge?: string;
  price: string;
  period: string;
  subtext: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  isPrimary: boolean;
}

const COMMUNITY_PACKS = [
  {
    title: "VS Code & GitHub Engineering Pack",
    category: "Developer",
    badge: "Official Preset",
    description:
      "Conventional commit prefixes (feat:, fix:), CamelCase symbol conversion, and pull request markdown schemas.",
    example: "“insert pr template” → Markdown checklist with test coverage & reviewers",
  },
  {
    title: "Legal Brief & Privilege Drafting Pack",
    category: "Legal",
    badge: "Official Preset",
    description:
      "Confidentiality headers, Latin maxims (res judicata, habeas corpus), statutory formats, and client intake schemas.",
    example: "“insert privileged header” → CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED",
  },
  {
    title: "Customer Support & Fast Replies",
    category: "Operations",
    badge: "Official Preset",
    description:
      "Empathetic ticket signoffs, refund policy explanations, and structured reproduction step checklists.",
    example: "“insert refund snippet” → Formatted policy reply with order ID prompt",
  },
  {
    title: "Clinical SOAP Notes & Medical Terms",
    category: "Healthcare",
    badge: "Official Preset",
    description:
      "Subjective, Objective, Assessment, Plan (SOAP) layout with 400+ common medication phonetic mappings.",
    example: "“insert soap template” → Formatted clinical chart headers",
  },
];

const PRICING_FAQS = [
  {
    question: "What is included in Founding Beta ($49 one-time)?",
    answer:
      "Founding Beta ($49 one-time) gives you permanent lifetime access to all HushWrite features on up to 2 personal devices. It includes immediate Windows Store & direct installer access now, Mac Early Access for technical testers, and guarantees the official signed & notarized Mac release as soon as it is available.",
  },
  {
    question: "What is the difference between Free and Founding Beta?",
    answer:
      "Free gives you unlimited local dictation using the lightweight Whisper Base model with standard punctuation. Founding Beta unlocks Whisper Large v3 Turbo & Medium models, per-app style adaptation (Slack vs code vs email), custom vocabulary & client jargon, and automatic filler word stripping.",
  },
  {
    question: "What is the status of the macOS release?",
    answer:
      "HushWrite is fully released and optimized for Windows 10/11 today. The macOS version is currently in Early Access for technical testers who can run test binaries or build from source. Founding Beta supporters are guaranteed full access to the official, signed, and notarized macOS release at no extra charge the moment it is available.",
  },
  {
    question: "Does HushWrite ever send my audio or text to the cloud?",
    answer:
      "Never. Every model inference, dictionary lookup, and text transformation runs 100% locally on your computer's CPU and GPU via whisper.cpp. Audio is processed directly in RAM and discarded immediately.",
  },
  {
    question: "How does the Switcher Discount work?",
    answer:
      "If you currently pay for Wispr Flow, Superwhisper, or Dragon, you can claim $10 off Founding Beta (pay only $39 one-time) or 40% off Pro Annual by emailing proof of an active receipt or account screenshot.",
  },
  {
    question: "Do you offer Student and Open Source Maintainer pricing?",
    answer:
      "Yes! Students, educators, and verified open-source maintainers receive a 50% discount ($24 for Founding Beta or $24/yr for Pro Annual). Simply reach out with your student ID or GitHub profile.",
  },
  {
    question: "How do Team licenses work?",
    answer:
      "Team licenses ($15/seat/month) include everything in Pro plus enterprise packaging (silent MSIX / PKG deployment), centralized team vocabularies, commercial licensing rights, and priority technical support.",
  },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [proBilling, setProBilling] = useState<ProBilling>("lifetime");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isStudentGrantOpen, setIsStudentGrantOpen] = useState(false);
  const [studentGrantTab, setStudentGrantTab] = useState<"student" | "oss">("student");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async (tier: PlanTierKey) => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          discountCode: refCode || undefined,
        }),
      });
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed: " + (data.error || "Unknown error"));
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Unable to reach checkout server. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const proPrice = refCode
    ? proBilling === "lifetime"
      ? "$39"
      : "$39"
    : proBilling === "lifetime"
      ? "$49"
      : "$49";

  const proPeriod = refCode
    ? proBilling === "lifetime"
      ? "one-time ($10 off)"
      : "/ yr ($10 off)"
    : proBilling === "lifetime"
      ? "one-time"
      : "/ year";

  const proSubtext = refCode
    ? proBilling === "lifetime"
      ? "Friend referral applied ($10 off reg. $49) · Own forever"
      : "Friend referral applied ($10 off reg. $49) · Continuous updates"
    : proBilling === "lifetime"
      ? "Pay once · Own forever · Windows Store + Mac Early Access"
      : "Equivalent to $4.08/mo · Continuous updates";

  const tiers: PricingTier[] = [
    {
      id: "free",
      name: "Free",
      badge: "Free Forever",
      price: "$0",
      period: "forever",
      subtext: "100% on-device · Zero cloud needed",
      description:
        "Fast local dictation for individuals. Experience sub-200ms transcription directly on your hardware.",
      features: [
        "100% on-device Whisper Base model",
        "Sub-200ms instantaneous transcription",
        "Universal hotkey (Alt+Space / ⌥Space)",
        "Standard punctuation & raw text insertion",
        "Windows (DirectML) native & Mac early access",
        "Audio and transcripts never leave RAM",
      ],
      ctaText: "Download Free Forever",
      ctaHref: "/#download",
      isPrimary: false,
    },
    {
      id: "pro",
      name: proBilling === "lifetime" ? "Founding Beta" : "Pro Annual",
      badge: refCode
        ? "Referral Gift Applied"
        : proBilling === "lifetime"
          ? "Founding Beta · Best Value"
          : "Most Flexible",
      price: proPrice,
      period: proPeriod,
      subtext: proSubtext,
      description:
        "Includes Windows Store access now, Mac Early Access for technical testers, and a signed/notarized Mac release as soon as it is available.",
      features: [
        "Everything in Free, plus:",
        "Windows Store access & direct installer (.exe / .msi / winget)",
        "Mac Early Access for technical testers",
        "Signed & notarized Mac release as soon as available",
        "Whisper Large v3 Turbo & Medium models",
        "Per-app writing styles (Slack, Mail, Code, Docs)",
        "Custom dictionary for technical terms & client names",
        "Automatic filler word removal (strips ums/ahs)",
        "Valid on 2 personal devices (Windows & macOS)",
        "Works 100% offline & air-gap verified",
      ],
      ctaText:
        proBilling === "lifetime"
          ? `Get Founding Beta (${proPrice} one-time)`
          : `Start Pro Annual (${proPrice}/yr)`,
      ctaHref: "/#download",
      isPrimary: true,
    },
    {
      id: "team",
      name: "Team",
      badge: "For Organizations",
      price: "$15",
      period: "/ seat / mo",
      subtext: "Billed annually · Commercial license",
      description:
        "Admin deployment, shared organizational vocabularies, and compliance guarantees for teams.",
      features: [
        "Everything in Pro included for all seats",
        "Admin deployment via MSIX & PKG installers",
        "Centralized team dictionary & shared prompt packs",
        "Commercial-use rights & volume seat licensing",
        "Tamper-evident local compliance audit log",
        "Priority business SLA & dedicated support",
      ],
      ctaText: "Contact Team Sales",
      ctaHref: "mailto:sales@HushWrite.app?subject=Team%20Inquiry",
      isPrimary: false,
    },
  ];

  return (
    <main
      id="main-content"
      className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white overflow-x-hidden relative"
    >
      {/* Background glow & subtle texture */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute -top-32 w-[700px] h-[600px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-16 flex flex-col items-center text-center px-4">
        {/* Value Proposition Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-neutral-800">
            Simple, Transparent Pricing · No Cloud Subscriptions Required
          </span>
        </div>

        <div className="max-w-[760px] mx-auto mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] text-neutral-950 mb-6">
            Invest in speed.
            <span className="block text-gradient-hero mt-1">Own your software forever.</span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Zero cloud compute markups. Choose Free forever, purchase a perpetual Pro license to own
            on your machine, or deploy across your team.
          </p>
        </div>

        {/* Friend Referral Welcome Banner */}
        {refCode && (
          <div className="mb-8 max-w-3xl w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border-2 border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.1)] text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center shrink-0">
                <Gift className="size-5 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-semibold uppercase text-emerald-800 tracking-wider">
                    Friend Referral Applied
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-xs font-mono font-bold text-emerald-900 shadow-xs">
                    {refCode}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-emerald-950">
                  $10 Off Founding Beta + Developer Prompt Pack Included
                </h2>
                <p className="text-xs text-emerald-800/90 mt-0.5">
                  Your invite bonus is active. Select Founding Beta ($39 one-time) below to check out.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold shadow-xs">
                {proBilling === "lifetime" ? "$39 Founding Beta" : "$39 / Year"}
              </span>
            </div>
          </div>
        )}

        {/* Competitive Migration / Switcher Offer */}
        <div className="mb-12 max-w-3xl w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-neutral-50/90 to-white border border-neutral-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/60">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-mono font-semibold mb-2">
                <span>⚡</span> Switcher Guarantee · Zero Cloud Latency
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 tracking-tight">
                Migrating from Wispr Flow or Superwhisper?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                Stop paying $120–$180/year in cloud compute taxes for voice data that can run
                locally.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="block text-[11px] font-mono text-neutral-400 line-through">
                  $49 reg.
                </span>
                <span className="block text-sm font-bold font-mono text-emerald-700">
                  $39 one-time
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Claim Switcher Deal</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50/60 border border-neutral-200/60">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                1
              </span>
              <div>
                <span className="font-semibold text-neutral-900 block">$10 Off Founding Beta</span>
                <span className="text-[11px] text-neutral-500">
                  Pay only $39 once (reg. $49) and own your license forever.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50/60 border border-neutral-200/60">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                2
              </span>
              <div>
                <span className="font-semibold text-neutral-900 block">40% Off Annual Pass</span>
                <span className="text-[11px] text-neutral-500">
                  Pay only $29 for your entire first year if choosing subscription.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50/60 border border-neutral-200/60">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                3
              </span>
              <div>
                <span className="font-semibold text-neutral-900 block">Frictionless Switch</span>
                <span className="text-[11px] text-neutral-500">
                  Instant activation with receipt or active subscription screenshot.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Plan Billing Toggle */}
        <div className="inline-flex items-center p-1 rounded-full bg-neutral-100/90 border border-neutral-200/90 mb-12 shadow-inner">
          <button
            onClick={() => setProBilling("lifetime")}
            className={`text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 ${
              proBilling === "lifetime"
                ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/60"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            <span>Founding Beta ($49)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold">
              Pay Once · Own Forever
            </span>
          </button>

          <button
            onClick={() => setProBilling("annual")}
            className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
              proBilling === "annual"
                ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/60"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            <span>Annual Pass ($49/yr)</span>
          </button>
        </div>

        {/* 3 Streamlined Pricing Cards (Free | Pro | Team) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl w-full text-left mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-300 ${
                tier.isPrimary
                  ? "bg-white border-2 border-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.08)] relative ring-4 ring-neutral-900/5 lg:-translate-y-2"
                  : "bg-white border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-neutral-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-bold text-neutral-950">{tier.name}</h3>
                  {tier.badge && (
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                        tier.isPrimary
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200/90 font-semibold"
                          : "bg-neutral-100 text-neutral-700 border-neutral-200/80 font-medium"
                      }`}
                    >
                      {tier.badge}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-mono text-neutral-950 tracking-tight">
                      {tier.price}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{tier.period}</span>
                  </div>
                  <p className="text-[12px] text-neutral-500 font-mono mt-1">{tier.subtext}</p>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-6 font-sans">
                  {tier.description}
                </p>

                <div className="space-y-3 mb-8 text-xs sm:text-sm text-neutral-700">
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 font-bold shrink-0 flex items-center justify-center text-[10px] border border-emerald-200/60 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {tier.id === "pro" ? (
                <button
                  type="button"
                  onClick={() =>
                    handleCheckout(proBilling === "lifetime" ? "pro_lifetime" : "pro_annual")
                  }
                  disabled={checkoutLoading}
                  className="w-full py-3 rounded-full text-xs sm:text-sm font-semibold text-center transition-all bg-neutral-900 text-white hover:bg-neutral-800 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {checkoutLoading ? "Connecting to Stripe..." : tier.ctaText}
                </button>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className={`w-full py-3 rounded-full text-xs sm:text-sm font-semibold text-center transition-all ${
                    tier.isPrimary
                      ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md hover:shadow-lg"
                      : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-900 border border-neutral-200/70"
                  }`}
                >
                  {tier.ctaText}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Student, Academic & Open-Source Developer Grant */}
        <div className="max-w-4xl w-full p-7 sm:p-9 rounded-3xl bg-neutral-50/70 border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] mb-16 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200/90 text-xs font-mono font-semibold text-neutral-800 shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Academic Grants & Open Source Sponsorship
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-[-0.03em]">
                Student & Open Source Developer Grant
              </h2>
              <p className="mt-2 text-sm text-neutral-600 max-w-xl">
                We support researchers, students, and open-source creators who push the boundaries
                of knowledge and open software. Enjoy a flat 50% discount on Founding Beta or Pro Annual.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
              <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Flat Grant Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-700">50% OFF</span>
                <span className="text-xs text-neutral-600 font-sans">Founding Beta & Annual</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Founding Beta: $24 · Annual: $24/yr
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Track 1: Students & Educators */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950">
                      Students & Academic Faculty
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-semibold">
                      Verified via .edu or student ID
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  For high school, undergraduate, and graduate students, professors, and academic
                  researchers writing theses, papers, or lab notes.
                </p>
                <ul className="text-xs text-neutral-700 space-y-1.5 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>$24 Founding Beta (normally $49)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>$24 / year Pro Annual (normally $49/yr)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>LaTeX & Academic citation formatting triggers</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStudentGrantTab("student");
                  setIsStudentGrantOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-900 text-xs font-semibold text-center border border-neutral-200/70 transition-colors cursor-pointer"
              >
                Apply with Student ID / .edu →
              </button>
            </div>

            {/* Track 2: Open Source Maintainers */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-2xl">🐙</span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950">Open Source Maintainers</h3>
                    <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60 font-semibold">
                      Active maintainer of public repo (50+ ★)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  For contributors and maintainers creating free software for the community. We
                  sponsor your dictation tooling so you can ship code faster.
                </p>
                <ul className="text-xs text-neutral-700 space-y-1.5 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span>$24 Founding Beta or $24/yr Annual</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span>Engineering commit prefix & PR macro templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span>Free community pack distribution for your project</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStudentGrantTab("oss");
                  setIsStudentGrantOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 text-neutral-900 text-xs font-semibold text-center border border-neutral-200/70 transition-colors cursor-pointer"
              >
                Apply with GitHub Profile →
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>
                <strong>Fast Verification:</strong> Codes are typically approved and emailed back
                within 12 hours. No complicated bureaucratic paperwork.
              </span>
            </div>
            <span className="font-mono text-emerald-700 font-semibold text-[11px] shrink-0">
              12hr turn-around
            </span>
          </div>
        </div>

        {/* Virality: Shareable Vocabulary & Voice-Command Packs */}
        <div className="max-w-4xl w-full p-6 sm:p-8 rounded-3xl bg-neutral-50/60 border border-neutral-200/80 mb-16 text-left shadow-sm">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-neutral-200/90 text-[10px] font-mono font-semibold text-emerald-700 shadow-xs mb-2">
              <span>📦</span> Shareable Workflows & Virality
            </div>
            <h2 className="text-2xl font-bold text-neutral-950 tracking-[-0.02em] mb-1">
              Public Voice-Command & Vocabulary Packs
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Export your shortcuts or install curated community packs in one click. Your team can
              sync vocabularies via plain{" "}
              <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/60 font-mono">
                .HushWrite/pack.json
              </code>{" "}
              files.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {COMMUNITY_PACKS.map((pack, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-neutral-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-neutral-900">{pack.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold">
                      {pack.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                    {pack.description}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 text-[11px] font-mono text-neutral-700 truncate">
                  {pack.example}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-700">
            <span>
              🎁 <strong>Referral Program:</strong> Dictate 50 times → Unlock your personal invite
              link to give friends free Pro packs.
            </span>
            <span className="font-mono text-emerald-700 font-semibold text-[11px]">
              Zero spam · Triggered post-activation
            </span>
          </div>
        </div>

        {/* Badge & Macro Generator */}
        <BadgeGenerator />

        {/* FAQs */}
        <div className="max-w-3xl w-full text-left mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 mb-6 text-center tracking-[-0.03em]">
            Pricing & Licensing FAQ
          </h2>
          <div className="space-y-3">
            {PRICING_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
                  >
                    <h3 className="text-sm font-bold text-neutral-950">{faq.question}</h3>
                    <span
                      className={`w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs text-neutral-600 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans border-t border-neutral-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />

      {/* Interactive Custom Modals */}
      <SwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        defaultPlan={proBilling}
      />

      <StudentGrantModal
        isOpen={isStudentGrantOpen}
        onClose={() => setIsStudentGrantOpen(false)}
        defaultTab={studentGrantTab}
      />
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PricingContent />
    </Suspense>
  );
}
