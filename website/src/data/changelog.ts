export interface ChangelogItem {
  category: "Added" | "Changed" | "Fixed" | "Performance" | "Security" | "Infra";
  title: string;
  description?: string;
  details?: string[];
}

export interface ReleaseNote {
  version: string;
  anchor: string;
  title: string;
  date: string;
  isLatest?: boolean;
  tagUrl: string;
  downloadUrl?: string;
  sha256?: string;
  summary: string;
  items: ChangelogItem[];
}

export const RELEASES: ReleaseNote[] = [
  {
    version: "1.0.2",
    anchor: "1-0-2",
    title: "Stripe Managed Payments & Production Hardening",
    date: "September 12, 2026",
    isLatest: true,
    tagUrl: "https://github.com/alexgutscher26/HushWrite/releases/tag/v1.0.2",
    downloadUrl: "https://github.com/alexgutscher26/HushWrite/releases/download/v1.0.2/HushWrite-Setup-1.0.2.exe",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    summary:
      "Upgrade to Stripe API 2025-03-31.basil for Managed Payments compliance, dynamic digital software tax codes, and zero-warning backend Rust Clippy and database iterator optimization.",
    items: [
      {
        category: "Changed",
        title: "Stripe Checkout & Managed Payments Compliance",
        details: [
          "Upgraded Stripe API version to 2025-03-31.basil for Managed Payments compliance.",
          "Added digital software tax codes (txcd_10103000) across all dynamic checkout line items.",
        ],
      },
      {
        category: "Performance",
        title: "Production Rust Backend Optimization",
        details: [
          "Refactored LLM transform sorting and pattern matching for zero Clippy warnings.",
          "Hardened app profile iterator flattening in local SQLite database service.",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    anchor: "0-1-0",
    title: "Public Launch · 100% On-Device Whisper & Hardware Acceleration",
    date: "August 31, 2026",
    tagUrl: "https://github.com/alexgutscher26/HushWrite/releases/tag/v0.1.0",
    downloadUrl: "https://github.com/alexgutscher26/HushWrite/releases/download/v0.1.0/HushWrite-Setup-0.1.0.exe",
    sha256: "a68f0b741517316a81ad4a6f44ec82245dbfcadfb9cae4751f813a37b1263884",
    summary:
      "The initial public release of HushWrite! Real-time, 100% on-device speech-to-text powered by whisper.cpp, DirectML and Apple Metal GPU acceleration, global push-to-talk hotkeys, and app-aware formatting.",
    items: [
      {
        category: "Added",
        title: "100% On-Device Whisper Inference",
        details: [
          "small-q5_1 (190 MB) as the default Starter tier model for fast, low-memory transcription.",
          "base-q5_1 (90 MB) for instant lightweight decodes on constrained hardware.",
          "large-v3-turbo (q4_0, q5_0, q8_0) precision models unlocked under the HushWrite Pro tier.",
        ],
      },
      {
        category: "Performance",
        title: "Hardware GPU Acceleration Backend",
        details: [
          "Windows DirectML execution provider for DirectX 12 GPUs (NVIDIA, AMD, Intel).",
          "macOS Apple Silicon Metal acceleration with sub-200ms tail latency.",
        ],
      },
      {
        category: "Added",
        title: "Advanced Global Hotkeys & Mouse Triggers",
        details: [
          "Multiple Bindings: Assign primary (dictation.hotkey) and secondary shortcuts.",
          "Mouse Push-to-Talk: Support binding auxiliary mouse buttons (Middle Click, Mouse 4, Mouse 5).",
          "Double-Tap Fast Dictation: Double-tapping within 300 ms triggers immediate high-priority audio processing.",
          "Command Shortcuts: Option/Alt + Shift + Space (Toggle Dashboard) and Option/Alt + Escape (Discard).",
          "Conflict Detection: Interactive warnings against colliding OS shortcuts (Cmd+C/V/Q, Alt+F4).",
          "Per-App Overrides: Custom shortcuts configured for specific apps via App Profiles.",
          "Per-Binding State Tracking: Thread-safe tracker maintaining isolated held state and press timing.",
        ],
      },
      {
        category: "Added",
        title: "Real-Time Settings Search & Adaptive Theme Switcher",
        details: [
          "Live filter input searching setting labels, descriptions, registry keys, and sections in real time.",
          "System, Light, and Dark interface options in General Settings with obsidian glass window tinting.",
          "One-click JSON export and import for all global settings, per-app profiles, and custom dictionary entries.",
        ],
      },
      {
        category: "Added",
        title: "App Profile Manager & In-App Documentation",
        details: [
          "Quick-add preset chips for VS Code, Cursor, Slack, Notion, and Terminal with sparse override settings.",
          "Keyboard Shortcuts & Voice Commands Reference Panel accessible via '?' or header action.",
          "Window Bounds Persistence: Automatically saves and restores dashboard window size and coordinates across launches.",
        ],
      },
      {
        category: "Added",
        title: "Feature Gating & HushWrite Pro Licensing",
        details: [
          "Free Starter tier ($0 forever) with 25 dictionary words and 100 history items.",
          "HushWrite Pro ($8/mo or $149 Lifetime) unlocking Large Turbo, Smart Context Engine, and Filler Word Stripper.",
          "Team tier ($15/user/mo) with centralized team dictionary sync and fleet management.",
        ],
      },
      {
        category: "Fixed",
        title: "Interface Translucency & Styling Polish",
        details: [
          "Fixed dark theme contrast and window translucency by applying dynamic background: var(--surface-glass) and explicit color-scheme declarations.",
          "Corrected type signature of descriptor_for in http_models/catalog.rs.",
          "Fixed desktop billing view to use native design system tokens (bg-surface, hairline, text-text-primary).",
          "Aligned default onboarding download target to Whisper Small (small-q5_1).",
        ],
      },
    ],
  },
];
