import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChangelogClient } from "./ChangelogClient";
import { RELEASES } from "@/data/changelog";
import { GitBranch, Sparkles, ArrowDown } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog & Release Notes · HushWrite",
  description:
    "Official release notes and changelog for HushWrite. Track all new features, local AI model updates, performance optimizations, and bug fixes.",
  alternates: {
    canonical: "https://hushwrite.app/changelog",
  },
  openGraph: {
    title: "Changelog & Release Notes · HushWrite",
    description:
      "Official release notes and changelog for HushWrite. 100% on-device whisper.cpp voice dictation updates.",
    url: "https://hushwrite.app/changelog",
    siteName: "HushWrite",
    type: "website",
  },
};

export default function ChangelogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HushWrite Changelog",
    description:
      "Chronological release history, feature updates, and performance optimizations for HushWrite.",
    url: "https://hushwrite.app/changelog",
    mainEntity: RELEASES.map((rel) => ({
      "@type": "SoftwareApplication",
      name: `HushWrite v${rel.version}`,
      operatingSystem: "Windows, macOS",
      applicationCategory: "ProductivityApplication",
      softwareVersion: rel.version,
      datePublished: rel.date,
      description: rel.summary,
      downloadUrl: rel.downloadUrl,
    })),
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Background glow & subtle texture */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute -top-32 w-[700px] h-[600px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <main className="pt-36 pb-24 md:pt-44 md:pb-32 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="text-center max-w-[720px] mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-neutral-800">Public Release History</span>
            <span className="text-xs font-mono text-neutral-500 pl-1 border-l border-neutral-200">
              v{RELEASES[0]?.version} Active
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-950 mb-6">
            HushWrite <span className="text-gradient-hero">Changelog</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-normal mb-8">
            Every update, performance optimization, model quantization improvement, and fix
            shipped to HushWrite. Subscribe to releases on GitHub or download the latest desktop binary.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/#download"
              className="text-xs sm:text-sm font-semibold text-white bg-[#141416] hover:bg-neutral-800 px-5 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>Download Latest v{RELEASES[0]?.version}</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </Link>
            <a
              href="https://github.com/alexgutscher26/HushWrite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-semibold text-neutral-800 hover:text-neutral-950 bg-white hover:bg-neutral-50 border border-neutral-200/90 px-4 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-2"
            >
              <GitBranch className="w-3.5 h-3.5 text-neutral-500" />
              <span>GitHub Repo</span>
            </a>
          </div>
        </div>

        {/* Client component for interactive timeline and release cards */}
        <ChangelogClient />
      </main>

      <Footer />
    </div>
  );
}
