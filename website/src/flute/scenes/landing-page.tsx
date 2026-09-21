"use client";

import React from "react";
import { Surface } from "@webprodigies/flute";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AppGridMarquee } from "@/components/AppGridMarquee";
import { TaglineReveal } from "@/components/TaglineReveal";
import { FeatureBento } from "@/components/FeatureBento";

export default function LandingPageScene() {
  return (
    <Surface
      id="landing-page"
      style={{
        width: 1400,
        height: 920,
        overflow: "hidden",
        borderRadius: "16px",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.08)",
        background: "#ffffff",
      }}
    >
      <div className="relative w-full h-full bg-white text-neutral-900 overflow-y-auto selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <Hero />
        <AppGridMarquee />
        <TaglineReveal />
        <FeatureBento />
      </div>
    </Surface>
  );
}
