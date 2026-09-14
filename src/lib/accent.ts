/**
 * SOURCE OF TRUTH KEYWORDS: AccentColor, ACCENT_PALETTES, getAccentConfig
 * WHAT:  Defines accent color palettes, glows, waveform gradients, and particle colors
 *        for overlay customisation (Pill, Notch, Slim Band, Drop Pill).
 */

export type AccentColorId =
  "monochrome" | "amber" | "purple" | "cyan" | "emerald" | "rose" | "sunset" | "aurora";

export interface AccentConfig {
  id: AccentColorId;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  glow: string;
  border: string;
  bgGlow: string;
  waveformGradient: string;
  particleColors: string[];
}

export const ACCENT_PALETTES: Record<AccentColorId, AccentConfig> = {
  monochrome: {
    id: "monochrome",
    label: "Monochrome",
    description: "Crisp white & deep glass aesthetic",
    primary: "#ffffff",
    secondary: "#a1a1aa",
    glow: "rgba(255, 255, 255, 0.35)",
    border: "rgba(255, 255, 255, 0.22)",
    bgGlow: "rgba(255, 255, 255, 0.06)",
    waveformGradient: "from-white via-zinc-200 to-white/70",
    particleColors: ["#ffffff", "#e4e4e7", "#a1a1aa", "#71717a"],
  },
  amber: {
    id: "amber",
    label: "Electric Amber",
    description: "Vibrant warm gold and solar amber glow",
    primary: "#f59e0b",
    secondary: "#fbbf24",
    glow: "rgba(245, 158, 11, 0.45)",
    border: "rgba(245, 158, 11, 0.35)",
    bgGlow: "rgba(245, 158, 11, 0.12)",
    waveformGradient: "from-amber-400 via-amber-300 to-amber-500",
    particleColors: ["#f59e0b", "#fbbf24", "#fcd34d", "#d97706", "#ffedd5"],
  },
  purple: {
    id: "purple",
    label: "Cyber Violet",
    description: "Deep futuristic neon purple & ultraviolet",
    primary: "#a855f7",
    secondary: "#c084fc",
    glow: "rgba(168, 85, 247, 0.45)",
    border: "rgba(168, 85, 247, 0.35)",
    bgGlow: "rgba(168, 85, 247, 0.12)",
    waveformGradient: "from-purple-400 via-violet-300 to-fuchsia-400",
    particleColors: ["#a855f7", "#c084fc", "#e879f9", "#7e22ce", "#f3e8ff"],
  },
  cyan: {
    id: "cyan",
    label: "Neon Cyan",
    description: "Luminescent hyper-electric ocean cyan",
    primary: "#06b6d4",
    secondary: "#38bdf8",
    glow: "rgba(6, 182, 212, 0.45)",
    border: "rgba(6, 182, 212, 0.35)",
    bgGlow: "rgba(6, 182, 212, 0.12)",
    waveformGradient: "from-cyan-400 via-sky-300 to-teal-300",
    particleColors: ["#06b6d4", "#38bdf8", "#67e8f9", "#0891b2", "#cffafe"],
  },
  emerald: {
    id: "emerald",
    label: "Emerald Mint",
    description: "Crisp radiant emerald mint energy",
    primary: "#10b981",
    secondary: "#34d399",
    glow: "rgba(16, 185, 129, 0.45)",
    border: "rgba(16, 185, 129, 0.35)",
    bgGlow: "rgba(16, 185, 129, 0.12)",
    waveformGradient: "from-emerald-400 via-green-300 to-teal-400",
    particleColors: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#d1fae5"],
  },
  rose: {
    id: "rose",
    label: "Rose Quartz",
    description: "Warm glowing ruby and neon pink flare",
    primary: "#f43f5e",
    secondary: "#fb7185",
    glow: "rgba(244, 63, 94, 0.45)",
    border: "rgba(244, 63, 94, 0.35)",
    bgGlow: "rgba(244, 63, 94, 0.12)",
    waveformGradient: "from-rose-400 via-pink-300 to-rose-500",
    particleColors: ["#f43f5e", "#fb7185", "#fda4af", "#e11d48", "#ffe4e6"],
  },
  sunset: {
    id: "sunset",
    label: "Sunset Flare",
    description: "Dynamic gradient solar flare orange",
    primary: "#ff6b4a",
    secondary: "#fb923c",
    glow: "rgba(255, 107, 74, 0.45)",
    border: "rgba(255, 107, 74, 0.35)",
    bgGlow: "rgba(255, 107, 74, 0.12)",
    waveformGradient: "from-orange-400 via-amber-300 to-rose-400",
    particleColors: ["#ff6b4a", "#fb923c", "#f97316", "#f43f5e", "#ffedd5"],
  },
  aurora: {
    id: "aurora",
    label: "Aurora Green",
    description: "Ethereal northern lights & luminous lime",
    primary: "#22c55e",
    secondary: "#84cc16",
    glow: "rgba(34, 197, 94, 0.45)",
    border: "rgba(34, 197, 94, 0.35)",
    bgGlow: "rgba(34, 197, 94, 0.12)",
    waveformGradient: "from-green-400 via-emerald-300 to-lime-400",
    particleColors: ["#22c55e", "#84cc16", "#4ade80", "#16a34a", "#dcfce7"],
  },
};

export function getAccentConfig(id?: string | null): AccentConfig {
  if (id && id in ACCENT_PALETTES) {
    return ACCENT_PALETTES[id as AccentColorId];
  }
  return ACCENT_PALETTES.monochrome;
}

export type OverlayStyleId =
  "floating_pill" | "notch" | "notch_slim_band" | "notch_drop_pill" | "none";

export interface OverlayStyleDef {
  id: OverlayStyleId;
  label: string;
  tag: string;
  description: string;
}

export const OVERLAY_STYLES: OverlayStyleDef[] = [
  {
    id: "floating_pill",
    label: "Floating Pill",
    tag: "Classic",
    description:
      "Floating translucent pill with live waveform, transcript & status. Positionable at 9 anchors.",
  },
  {
    id: "notch",
    label: "Top Notch",
    tag: "Dynamic Island",
    description:
      "Seamless dynamic island hugging the top screen bezel with integrated audio feedback.",
  },
  {
    id: "notch_slim_band",
    label: "Notch Slim Band",
    tag: "Minimalist",
    description: "Ultra-sleek glowing band beside the notch that pulses softly with your speech.",
  },
  {
    id: "notch_drop_pill",
    label: "Notch Drop Pill",
    tag: "Anchor Drop",
    description: "Floating pill suspended just beneath the notch with an elegant anchor curve.",
  },
  {
    id: "none",
    label: "None (Stealth)",
    tag: "Invisible",
    description: "Completely hidden overlay. Zero screen distraction, 100% audio feedback cues.",
  },
];

export type PillAnchorId =
  | "top_left"
  | "top_center"
  | "top_right"
  | "center_left"
  | "center"
  | "center_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

export const PILL_ANCHORS: { id: PillAnchorId; label: string; row: number; col: number }[] = [
  { id: "top_left", label: "Top Left", row: 0, col: 0 },
  { id: "top_center", label: "Top Center", row: 0, col: 1 },
  { id: "top_right", label: "Top Right", row: 0, col: 2 },
  { id: "center_left", label: "Center Left", row: 1, col: 0 },
  { id: "center", label: "Center", row: 1, col: 1 },
  { id: "center_right", label: "Center Right", row: 1, col: 2 },
  { id: "bottom_left", label: "Bottom Left", row: 2, col: 0 },
  { id: "bottom_center", label: "Bottom Center", row: 2, col: 1 },
  { id: "bottom_right", label: "Bottom Right", row: 2, col: 2 },
];
