"use client";

import Link from "next/link";
import { Mark } from "./Mark";
import { GithubIcon } from "./GithubIcon";
import { ArrowUp, ShieldCheck, Cpu, Sparkles } from "lucide-react";

interface FooterLink {
  href: string;
  label: string;
  accent?: boolean;
  badge?: string;
  external?: boolean;
  icon?: boolean;
}

const SOLUTIONS_LINKS: FooterLink[] = [
  { href: "/developers", label: "Developers & IDEs" },
  { href: "/creators", label: "Content Creators" },
  { href: "/dictation-for-medical-professionals", label: "Medical Professionals" },
  { href: "/hipaa-voice-notes", label: "HIPAA Voice Notes" },
  { href: "/dictation-for-lawyers", label: "Legal & Attorneys" },
  { href: "/private-dictation-app", label: "Privacy Architecture" },
];

const COMPARISONS_LINKS: FooterLink[] = [
  { href: "/wispr-flow-alternative", label: "Wispr Flow Alternative" },
  {
    href: "/blog/wispr-flow-alternative-windows-local-dictation",
    label: "Wispr Alternative (Windows)",
    badge: "New",
  },
  {
    href: "/blog/HushWrite-vs-wispr-flow-vs-superwhisper-2026-latency-accuracy-comparison",
    label: "Methodology Benchmark",
  },
  {
    href: "/blog/best-private-dictation-software-for-developers",
    label: "Best Dictation for Devs",
  },
  { href: "/offline-voice-to-text-for-windows", label: "Offline Windows Dictation" },
  { href: "/#comparison", label: "Cloud vs Local Matrix" },
];

const RESOURCES_LINKS: FooterLink[] = [
  { href: "/changelog", label: "Changelog & Releases", badge: "v1.3.0" },
  { href: "/blog", label: "Technical Blog" },
  {
    href: "/blog/how-to-dictate-github-issues-prs-cursor-prompts",
    label: "Dictate Cursor & PRs",
    badge: "Guide",
  },
  {
    href: "/blog/local-voice-dictation-notion-slack-gmail-windows",
    label: "Slack & Notion Dictation",
  },
  {
    href: "/blog/how-to-dictate-linkedin-posts-x-threads-voice",
    label: "X & LinkedIn Dictation",
    badge: "Guide",
  },
  {
    href: "/blog/how-to-use-voice-dictation-without-uploading-sensitive-work-drafts",
    label: "Zero-Cloud Drafts Guide",
  },
  { href: "/privacy", label: "Privacy Promise", accent: true },
  { href: "/pricing", label: "Pricing & Lifetime" },
  { href: "/#download", label: "Download App" },
  {
    href: "mailto:support@hushwrite.app",
    label: "Support Contact",
    external: true,
  },
];

const ECOSYSTEM_LINKS: FooterLink[] = [
  {
    href: "/changelog",
    label: "Release Notes & History",
  },
  {
    href: "https://github.com/alexgutscher26/HushWrite",
    label: "GitHub Repository",
    external: true,
    icon: true,
  },
  {
    href: "https://github.com/alexgutscher26/HushWrite/tags",
    label: "Official Releases & SHA256",
    external: true,
    badge: "v1.3.0",
  },
  {
    href: "#download",
    label: "Windows Code-Signed (.exe & MSI)",
  },
  {
    href: "https://github.com/ggerganov/whisper.cpp",
    label: "whisper.cpp Engine",
    external: true,
  },
  {
    href: "https://github.com/alexgutscher26/HushWrite/blob/main/LICENSE",
    label: "Open Source (MIT)",
    external: true,
  },
];

// Deterministic bell-curve-shaped bar heights, so the waveform looks like a
// trailing-off audio clip rather than random noise, and stays stable across renders.
const WAVE_BARS = Array.from({ length: 56 }, (_, i) => {
  const center = 27.5;
  const distance = Math.abs(i - center) / center;
  const envelope = 1 - Math.pow(distance, 1.7);
  const wobble = Math.sin(i * 1.3) * 0.18;
  return Math.max(0.14, Math.min(1, envelope + wobble));
});

function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-neutral-600 hover:text-neutral-950 focus-visible:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm transition-colors ${className}`}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function NavLinkItem({ link }: { link: FooterLink }) {
  const content = (
    <span className="inline-flex items-center gap-1.5">
      {link.icon && (
        <GithubIcon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-950 transition-colors" />
      )}
      <span>{link.label}</span>
      {link.badge && (
        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono font-medium">
          {link.badge}
        </span>
      )}
    </span>
  );

  if (link.external) {
    return (
      <li className="group">
        <ExternalLink href={link.href}>{content}</ExternalLink>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={link.href}
        className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm ${
          link.accent
            ? "text-emerald-700 hover:text-emerald-800 font-medium"
            : "text-neutral-600 hover:text-neutral-950"
        }`}
      >
        {content}
      </Link>
    </li>
  );
}

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      aria-label="Site footer"
      className="relative border-t border-neutral-200/80 bg-neutral-50/70 pt-16 pb-12 overflow-hidden text-neutral-600"
    >
      {/* Signature moment: a waveform trailing off along the top edge */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-6 flex items-end justify-center gap-[3px] px-4 pointer-events-none"
      >
        {WAVE_BARS.map((h, i) => (
          <span
            key={i}
            className="motion-safe:animate-[HushWrite-wave_2.8s_ease-in-out_infinite] w-full max-w-[3px] rounded-full bg-gradient-to-t from-emerald-500/50 to-emerald-300/10 origin-bottom"
            style={{
              height: `${Math.round(h * 10000) / 100}%`,
              animationDelay: `${Math.round(i * 0.035 * 1000) / 1000}s`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes HushWrite-wave {
          0%,
          100% {
            transform: scaleY(0.45);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Pixelated square-cell matrix grid with firework-burst upward fade */}
      <div className="absolute inset-0 pointer-events-none opacity-45 overflow-hidden [mask-image:radial-gradient(ellipse_75%_85%_at_50%_100%,#000_20%,rgba(0,0,0,0.4)_55%,transparent_85%)]">
        <svg className="w-full h-full text-neutral-300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="footer-pixel-matrix-grid"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <rect
                x="2"
                y="2"
                width="10"
                height="10"
                rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-pixel-matrix-grid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-neutral-200/80">
          {/* Brand */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-white border border-neutral-200/90 shadow-sm">
                <Mark size="sm" animated />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-neutral-950 tracking-tight">
                  HushWrite
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono font-medium">
                  v1.3.0
                </span>
              </div>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed max-w-sm">
              Local speech-to-text for Windows (with Mac Early Access for technical testers). Free
              forever, open source, and your audio never leaves your device. Built with Rust, Tauri
              2, and whisper.cpp.
            </p>

            <ul className="flex flex-wrap items-center gap-2">
              <li className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-neutral-700 border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs">
                <span className="relative flex w-2 h-2" aria-hidden="true">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
                </span>
                Works fully offline
              </li>
              <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-neutral-700 border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
                MIT License
              </li>
              <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-neutral-700 border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs font-mono">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                GPU Accelerated
              </li>
            </ul>
          </div>

          {/* Link Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Solutions */}
            <nav aria-label="Solutions" className="flex flex-col gap-2.5 text-sm">
              <span className="text-neutral-900 font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                Solutions
              </span>
              <ul className="flex flex-col gap-2.5">
                {SOLUTIONS_LINKS.map((link) => (
                  <NavLinkItem key={link.href + link.label} link={link} />
                ))}
              </ul>
            </nav>

            {/* Comparisons */}
            <nav aria-label="Comparisons" className="flex flex-col gap-2.5 text-sm">
              <span className="text-neutral-900 font-semibold mb-1">Comparisons</span>
              <ul className="flex flex-col gap-2.5">
                {COMPARISONS_LINKS.map((link) => (
                  <NavLinkItem key={link.href + link.label} link={link} />
                ))}
              </ul>
            </nav>

            {/* Resources & Guides */}
            <nav aria-label="Resources" className="flex flex-col gap-2.5 text-sm">
              <span className="text-neutral-900 font-semibold mb-1">Resources</span>
              <ul className="flex flex-col gap-2.5">
                {RESOURCES_LINKS.map((link) => (
                  <NavLinkItem key={link.href + link.label} link={link} />
                ))}
              </ul>
            </nav>

            {/* Ecosystem & Open Source */}
            <nav aria-label="Ecosystem" className="flex flex-col gap-2.5 text-sm">
              <span className="text-neutral-900 font-semibold mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
                Ecosystem
              </span>
              <ul className="flex flex-col gap-2.5">
                {ECOSYSTEM_LINKS.map((link) => (
                  <NavLinkItem key={link.href + link.label} link={link} />
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>
              © {new Date().getFullYear()} HushWrite. Zero telemetry, 100% on-device data
              sovereignty.
            </p>
            <a
              href="https://HushWrite.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-85 transition-opacity"
            >
              <img
                src="https://img.shields.io/badge/dictated%20with-HushWrite-5865F2?style=flat-square&logo=soundcharts&logoColor=white"
                alt="Dictated with HushWrite"
              />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-neutral-200/80 px-3 py-1 rounded-full shadow-sm">
              <span className="text-neutral-500">Shortcut:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200/80 text-neutral-800 text-[10px] font-mono font-medium">
                ⌥ Space / Alt+Space
              </kbd>
            </div>

            <button
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-950 border border-neutral-200/90 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 transition-colors"
            >
              <span>Top</span>
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
