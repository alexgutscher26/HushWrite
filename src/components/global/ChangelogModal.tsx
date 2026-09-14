/**
 * SOURCE OF TRUTH KEYWORDS: ChangelogModal, whats-new, release-notes, in-app-changelog
 * WHAT:  The "What's New in HushWrite" release notes modal in the desktop app.
 * WHY:   Presents version highlights (on-device whisper models, theme switcher,
 *        search, backup/restore, shortcuts panel, pro features, directml acceleration).
 * WHERE: Triggered from dashboard header "What's New" pill or settings view.
 */

import { useEffect } from "react";
import {
  X,
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Search,
  Sun,
  Download,
  Keyboard,
  MousePointer,
} from "lucide-react";

export interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReleaseEntry {
  version: string;
  date: string;
  badge?: string;
  title: string;
  highlights: {
    icon: React.ReactNode;
    title: string;
    description: string;
  }[];
}

const RELEASES: ReleaseEntry[] = [
  {
    version: "v1.2.1",
    date: "September 14, 2026",
    badge: "Latest",
    title: "HushWrite 1.2.1 — Smart Inline Learning & Developer Accuracy",
    highlights: [
      {
        icon: <Sparkles className="size-4 text-text-primary" />,
        title: "Inline Edit Learning & Quick-Correct Flow",
        description:
          "Automatically detects when you correct misheard words and shows a floating prompt to permanently add rules into your local dictionary with 1 click.",
      },
      {
        icon: <Layers className="size-4 text-text-primary" />,
        title: "AI, ML & Developer Domain Packs",
        description:
          "Pre-mapped phonetic replacements for PyTorch, CUDA, WhisperX, LLM, RAG, Ollama, Kubernetes, docker-compose, and VS Code.",
      },
      {
        icon: <Zap className="size-4 text-text-primary" />,
        title: "Dual-Layer Prompt Biasing & SQLite Rules",
        description:
          "Dictionary terms are passed directly into Whisper's decoding prompt tokens and enforced with deterministic whole-word post-processing.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "September 2026",
    badge: "Stable Release",
    title: "HushWrite 1.0.0 — Production Ready On-Device Voice AI",
    highlights: [
      {
        icon: <Cpu className="size-4 text-text-primary" />,
        title: "100% On-Device Whisper Inference",
        description:
          "Private local transcription with Whisper Small (190MB Starter default), Base (90MB), and Large v3 Turbo (Pro tier). Zero audio sent to external cloud servers.",
      },
      {
        icon: <Zap className="size-4 text-text-primary" />,
        title: "DirectML & Metal Hardware Acceleration",
        description:
          "DirectX 12 GPU acceleration for Windows and Metal acceleration for Apple Silicon delivering sub-200ms latency.",
      },
      {
        icon: <MousePointer className="size-4 text-text-primary" />,
        title: "Dual Hotkeys, Mouse Push-to-Talk & Conflict Shield",
        description:
          "Bind primary & secondary shortcuts, mouse thumb buttons (Mouse 4/5/Middle), double-tap fast mode (<300ms), and collision warnings.",
      },
      {
        icon: <Search className="size-4 text-text-primary" />,
        title: "Real-Time Settings Search",
        description:
          "Instant search bar across all settings, technical options, hotkeys, and sections with live matching.",
      },
      {
        icon: <Sun className="size-4 text-text-primary" />,
        title: "Adaptive Theme Switcher (System / Light / Dark)",
        description:
          "Seamless theme selection with dark obsidian glass window tinting and high-contrast typography.",
      },
      {
        icon: <Download className="size-4 text-text-primary" />,
        title: "Settings Backup & JSON Migration",
        description:
          "One-click export and import of all global preferences, per-app profiles, and custom dictionary entries.",
      },
      {
        icon: <Keyboard className="size-4 text-text-primary" />,
        title: "Keyboard Shortcuts & Spoken Commands Cheatsheet",
        description:
          "Full in-app reference panel accessible anytime by pressing '?' or clicking the shortcuts button.",
      },
      {
        icon: <Layers className="size-4 text-text-primary" />,
        title: "Per-App Profiles & Presets",
        description:
          "Quick-add profiles for VS Code, Cursor, Slack, Notion, and Terminal with sparse setting overrides.",
      },
      {
        icon: <ShieldCheck className="size-4 text-text-primary" />,
        title: "HushWrite Pro & Team Plans",
        description:
          "Unlock Large v3 Turbo, automatic filler word stripper (ums/ahs), unlimited dictionary words, and centralized team dictionary sync.",
      },
    ],
  },
];

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="hairline rounded-card bg-elevated shadow-card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="hairline border-b border-[var(--border-hairline)] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-text-primary" />
            <h3 className="text-body font-bold text-text-primary">What's New in HushWrite</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog modal"
            className="hairline rounded-input p-1.5 text-text-tertiary transition-colors hover:bg-sunken hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {RELEASES.map((rel, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-body font-bold text-text-primary">
                    {rel.version}
                  </span>
                  <span className="text-caption text-text-secondary">({rel.date})</span>
                  {rel.badge && (
                    <span className="rounded-full bg-text-primary px-2 py-0.5 text-caption font-semibold text-opaque-elevated">
                      {rel.badge}
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-body font-semibold text-text-primary">{rel.title}</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rel.highlights.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="hairline rounded-card bg-surface p-3 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-input bg-sunken shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-caption font-semibold text-text-primary mb-0.5">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="hairline border-t border-[var(--border-hairline)] px-5 py-3 bg-surface flex items-center justify-between text-caption text-text-secondary">
          <span>HushWrite updates automatically via GitHub Releases.</span>
          <button
            type="button"
            onClick={onClose}
            className="hairline rounded-input bg-sunken px-3 py-1 text-caption font-medium text-text-primary hover:bg-sunken-strong"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
