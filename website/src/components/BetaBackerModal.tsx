/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { X, Sparkles, ArrowRight, ShieldCheck, Check, Heart, Users } from "lucide-react";
import { PlanTierKey } from "@/lib/stripe";

interface BetaBackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

const PRESET_AMOUNTS = [
  { amount: 10, label: "Minimum Backer", tag: "Most Accessible" },
  { amount: 25, label: "Core Contributor", tag: "Popular Choice" },
  { amount: 49, label: "Full Value", tag: "Standard $49 Price" },
  { amount: 100, label: "Generous Patron", tag: "Super Supporter" },
];

export function BetaBackerModal({
  isOpen,
  onClose,
  defaultAmount = 25,
}: BetaBackerModalProps) {
  const [customAmount, setCustomAmount] = useState<number>(defaultAmount);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAmount = Math.max(10, customAmount || 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentAmount < 10) {
      setError("The minimum beta-backer contribution is $10.00.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address to receive your lifetime license key.");
      return;
    }

    setLoading(true);

    try {
      const tierKey: PlanTierKey = "beta_backer_pwyw";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierKey,
          customAmount: currentAmount,
          customerEmail: email.trim(),
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || "Unable to initialize checkout. Please try again.");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during checkout setup.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c0d12]/95 p-6 md:p-8 shadow-2xl shadow-amber-950/20 text-white backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Limited Early Backer Offer
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            First 500 Backers
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Pay What You Want <span className="text-amber-400">Beta-Backer</span>
        </h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Support indie open-source privacy software. Choose any amount from{" "}
          <strong className="text-zinc-200">$10+</strong> and receive the permanent{" "}
          <strong className="text-amber-300">Core Lifetime License</strong> with all Pro models,
          zero telemetry, and no monthly fees.
        </p>

        {/* Amount Selector */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Choose Your Contribution
            </span>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ${currentAmount}
              </span>
              <span className="text-xs text-zinc-400 ml-1.5 font-medium">one-time</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = currentAmount === preset.amount;
              return (
                <button
                  key={preset.amount}
                  type="button"
                  onClick={() => setCustomAmount(preset.amount)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all text-center ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-sm shadow-amber-500/20"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm font-bold">${preset.amount}</span>
                  <span className="text-[10px] opacity-75 mt-0.5 truncate max-w-full">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={currentAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>$10 Minimum</span>
              <span>$49 Standard</span>
              <span>$100+ Patron</span>
            </div>
          </div>
        </div>

        {/* Benefits Checklist */}
        <div className="mb-6 space-y-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Perpetual Lifetime License:</strong> Never expires, zero subscription lock-in.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>All Whisper Models:</strong> Large v3 Turbo, Medium, custom vocabulary & style adapters.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>100% On-Device & Private:</strong> Audio and text never leave your RAM.
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email For License Delivery
            </label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Connecting to Secure Stripe Checkout...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 fill-zinc-950" />
                Back HushWrite for ${currentAmount}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Encrypted Stripe Checkout · 30-Day Money-Back Guarantee</span>
        </div>
      </div>
    </div>
  );
}
