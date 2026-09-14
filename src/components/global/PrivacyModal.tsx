/**
 * SOURCE OF TRUTH KEYWORDS: PrivacyModal, privacy-policy, local-data-boundary, on-device-proof
 * WHAT:  The "Privacy & Local Data Architecture" modal in HushWrite.
 * WHY:   Gives users immediate, transparent, and auditable proof that all audio processing,
 *        model weights, transcripts, custom dictionary entries, and settings reside 100% locally.
 * WHERE: Triggered from onboarding tour, permission steps, or settings view.
 */

import { useEffect } from "react";
import { X, ShieldCheck, HardDrive, Cpu, Trash2, Lock, EyeOff } from "lucide-react";

export interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrivacyPoint {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
}

const PRIVACY_POINTS: PrivacyPoint[] = [
  {
    icon: <Cpu className="size-4 text-text-primary" />,
    title: "100% On-Device Whisper Inference",
    description:
      "All audio captured by your microphone is fed directly into local whisper.cpp models running on your CPU or GPU. Zero audio bytes ever leave your machine.",
    badge: "Zero Cloud",
  },
  {
    icon: <HardDrive className="size-4 text-text-primary" />,
    title: "Local SQLite Storage & Control",
    description:
      "Transcripts, phonetic dictionary words, and preferences are stored only on your local drive in SQLite. Nothing is synced or transmitted to external servers.",
    badge: "Local Disk",
  },
  {
    icon: <Trash2 className="size-4 text-text-primary" />,
    title: "Automatic Retention & Full Wipe",
    description:
      "Configure automatic transcript purging (e.g. 7 or 30 days) that sweeps every 6 hours, or perform an instant factory reset from Settings > Privacy.",
    badge: "Self-Purging",
  },
  {
    icon: <EyeOff className="size-4 text-text-primary" />,
    title: "Zero Telemetry & No Analytics",
    description:
      "HushWrite has no tracking beacons, telemetry SDKs, or analytics trackers. We do not track words spoken, dictation duration, or active applications.",
    badge: "No Trackers",
  },
  {
    icon: <Lock className="size-4 text-text-primary" />,
    title: "Incognito & Lock Screen Purge",
    description:
      "Use Incognito mode to dictate without writing anything to disk, and enable Purge-on-Lock to wipe clipboard and RAM buffers whenever Windows or macOS locks.",
    badge: "Memory Guard",
  },
];

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-elevated border border-[var(--border-hairline)] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-input bg-sunken text-text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-body font-semibold text-text-primary">
                Privacy & Local Architecture
              </h2>
              <p className="text-caption text-text-secondary">What data stays on your machine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-input text-text-secondary transition-colors hover:bg-sunken hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-input bg-sunken/60 p-3 text-caption text-text-secondary leading-relaxed border border-[var(--border-hairline)]">
            HushWrite is engineered as a zero-cloud utility. Your speech is processed locally on
            your machine and never leaves your computer.
          </div>

          <div className="space-y-3">
            {PRIVACY_POINTS.map((pt) => (
              <div
                key={pt.title}
                className="flex items-start gap-3 rounded-input border border-[var(--border-hairline)] bg-surface p-3 transition-colors"
              >
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-sunken">
                  {pt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption font-medium text-text-primary">{pt.title}</span>
                    <span className="shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[10px] font-mono text-text-secondary">
                      {pt.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-text-secondary leading-normal">
                    {pt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-sunken/30 px-5 py-3">
          <span className="text-caption text-text-secondary">Local-first · Offline ready</span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-input bg-text-primary px-4 text-caption font-medium text-opaque-elevated transition-opacity hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
