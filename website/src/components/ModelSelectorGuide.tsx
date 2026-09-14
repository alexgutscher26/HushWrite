"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HardDrive,
  Cpu,
  Languages,
  Layers,
  Bot,
  SlidersHorizontal,
  ArrowRight,
  Info,
  Check,
  Flame,
} from "lucide-react";

export interface ModelInfo {
  id: string;
  name: string;
  family: "Whisper (ASR)" | "Parakeet (ONNX)" | "Smart Cleanup (LLM)";
  tier: "Lightweight" | "Balanced" | "Pro" | "Distilled" | "Fast Tier" | "Smart Cleanup";
  badge?: string;
  size: string;
  latency: string;
  ramUsage: string;
  accuracy: number;
  description: string;
  recommendedFor: string;
  quantization: string;
  languages: "99 Languages" | "English Only" | "Multilingual";
  fileName: string;
  repo: string;
  engine: "whisper.cpp (GGML)" | "ONNX Runtime" | "llama-cpp-2 (GGUF)";
  availability: "Available Now" | "Engine Roadmap" | "Cleanup Backend";
  isDefault?: boolean;
  popular?: boolean;
}

export const MODELS: ModelInfo[] = [
  {
    id: "tiny-q5_1",
    name: "Whisper Tiny (q5_1)",
    family: "Whisper (ASR)",
    tier: "Lightweight",
    badge: "Ultra-Light 32 MB",
    size: "32 MB",
    latency: "35 ms",
    ramUsage: "100 MB",
    accuracy: 90.5,
    description:
      "Ultra-compact 5-bit quantized Tiny Whisper model. The lowest memory footprint in the catalog with instantaneous sub-40ms response times.",
    recommendedFor: "RAM-constrained devices, background task decodes, legacy hardware",
    quantization: "q5_1 Quantized",
    languages: "99 Languages",
    fileName: "ggml-tiny-q5_1.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
  },
  {
    id: "base-q5_1",
    name: "Whisper Base (q5_1)",
    family: "Whisper (ASR)",
    tier: "Lightweight",
    badge: "Instant Battery Saver",
    size: "60 MB",
    latency: "65 ms",
    ramUsage: "250 MB",
    accuracy: 95.0,
    description:
      "Instantaneous decoding with low resource consumption. Ideal for quick messages, system voice commands, and older laptops.",
    recommendedFor: "Older laptops, battery conservation, quick messages, instant command entry",
    quantization: "q5_1 Quantized",
    languages: "99 Languages",
    fileName: "ggml-base-q5_1.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "small-q5_1",
    name: "Whisper Small (q5_1)",
    family: "Whisper (ASR)",
    tier: "Balanced",
    badge: "Default Recommended",
    size: "190 MB",
    latency: "150 ms",
    ramUsage: "450 MB",
    accuracy: 98.5,
    description:
      "The official out-of-the-box default for all users. The ultimate balance of sub-200ms speed, low memory footprint, and high punctuation accuracy.",
    recommendedFor: "Software developers, daily dictation, technical notes, bilingual typing",
    quantization: "q5_1 Quantized",
    languages: "99 Languages",
    fileName: "ggml-small-q5_1.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    isDefault: true,
    popular: true,
  },
  {
    id: "small.en-tdrz",
    name: "Whisper Small (tdrz)",
    family: "Whisper (ASR)",
    tier: "Balanced",
    badge: "Speaker Diarization",
    size: "488 MB",
    latency: "180 ms",
    ramUsage: "950 MB",
    accuracy: 98.4,
    description:
      "Specialized TinyDiarize model trained to detect and output speaker turn tokens automatically during transcription.",
    recommendedFor: "Meeting transcriptions, multi-speaker interviews, podcast drafting",
    quantization: "Full Precision (tdrz)",
    languages: "English Only",
    fileName: "ggml-small.en-tdrz.bin",
    repo: "akashmjn/tinydiarize-whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
  },
  {
    id: "medium-q5_0",
    name: "Whisper Medium (q5_0)",
    family: "Whisper (ASR)",
    tier: "Pro",
    badge: "Multilingual Pro",
    size: "539 MB",
    latency: "240 ms",
    ramUsage: "1.0 GB",
    accuracy: 98.9,
    description:
      "Pro model providing exceptional accuracy across all 99 languages with balanced RAM consumption at 5-bit quantization.",
    recommendedFor: "Users with 8GB or 16GB RAM seeking deep multilingual transcription",
    quantization: "q5_0 Quantized",
    languages: "99 Languages",
    fileName: "ggml-medium-q5_0.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
  },
  {
    id: "large-v3-turbo-q5_0",
    name: "Large v3 Turbo (q5_0)",
    family: "Whisper (ASR)",
    tier: "Pro",
    badge: "Opt-In High Accuracy",
    size: "574 MB",
    latency: "180 ms",
    ramUsage: "1.1 GB",
    accuracy: 99.7,
    description:
      "Latest turbo architecture unlocking maximum precision across complex vocabulary, technical terms, and heavy accents with DirectML acceleration.",
    recommendedFor:
      "Medical, legal, engineering architecture, specialized vocabulary, 99 languages",
    quantization: "q5_0 Quantized",
    languages: "99 Languages",
    fileName: "ggml-large-v3-turbo-q5_0.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "large-v3-turbo-q8_0",
    name: "Large v3 Turbo (q8_0)",
    family: "Whisper (ASR)",
    tier: "Pro",
    badge: "Maximum Precision",
    size: "874 MB",
    latency: "210 ms",
    ramUsage: "1.6 GB",
    accuracy: 99.9,
    description:
      "Near-unquantized 8-bit precision for zero-compromise multilingual translation and highest fidelity across subtle accents.",
    recommendedFor:
      "Highest fidelity across subtle accents, multi-speaker audio, and technical jargon",
    quantization: "q8_0 Quantized",
    languages: "99 Languages",
    fileName: "ggml-large-v3-turbo-q8_0.bin",
    repo: "ggerganov/whisper.cpp",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "distil-small.en",
    name: "Distil-Whisper Small",
    family: "Whisper (ASR)",
    tier: "Distilled",
    badge: "6x Faster Speed",
    size: "336 MB",
    latency: "100 ms",
    ramUsage: "450 MB",
    accuracy: 98.0,
    description:
      "Distilled English Small model. Up to 6x faster inference than standard Whisper Small with minimal memory overhead.",
    recommendedFor: "Ultra-responsive everyday English dictation, chat, rapid coding commands",
    quantization: "Distilled Weights",
    languages: "English Only",
    fileName: "ggml-distil-small.en.bin",
    repo: "distil-whisper/distil-small.en",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "distil-large-v3",
    name: "Distil-Whisper Large v3",
    family: "Whisper (ASR)",
    tier: "Distilled",
    badge: "Peak Speed & Quality",
    size: "1.52 GB",
    latency: "180 ms",
    ramUsage: "1.8 GB",
    accuracy: 99.5,
    description:
      "Large v3 knowledge distilled into a fast runtime. Delivers studio-level punctuation at 6x the throughput of standard Large v3.",
    recommendedFor: "Power users wanting Large v3 quality at 6x the transcription speed",
    quantization: "Distilled Weights",
    languages: "English Only",
    fileName: "ggml-distil-large-v3.bin",
    repo: "distil-whisper/distil-large-v3-ggml",
    engine: "whisper.cpp (GGML)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet TDT 0.6B v2",
    family: "Parakeet (ONNX)",
    tier: "Fast Tier",
    badge: "Sub-50ms Fast Tier",
    size: "600 MB",
    latency: "42 ms",
    ramUsage: "550 MB",
    accuracy: 98.2,
    description:
      "NVIDIA's official Parakeet TDT 0.6B v2 architecture running via ONNX Runtime & DirectML. The gold standard English fast tier for sub-50ms real-time streaming dictation.",
    recommendedFor:
      "High-speed English dictation, live streaming transcription, ultra-low latency voice typing",
    quantization: "ONNX Runtime / DirectML",
    languages: "English Only",
    fileName: "parakeet-tdt-0.6b-v2.onnx",
    repo: "nvidia/parakeet-tdt-0.6b-v2",
    engine: "ONNX Runtime",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "parakeet-tdt_ctc-110m",
    name: "Parakeet TDT-CTC 110M",
    family: "Parakeet (ONNX)",
    tier: "Fast Tier",
    badge: "Instant 20ms Decode",
    size: "110 MB",
    latency: "20 ms",
    ramUsage: "180 MB",
    accuracy: 94.8,
    description:
      "Ultra-compact 110M parameter hybrid CTC-TDT model. Blazing sub-25ms response, ideal for instantaneous hotkey voice triggers and fast coding commands.",
    recommendedFor:
      "Instant hotkey voice shortcuts, low-spec CPU devices, rapid single-phrase entry",
    quantization: "ONNX Runtime / DirectML",
    languages: "English Only",
    fileName: "parakeet-tdt_ctc-110m.onnx",
    repo: "nvidia/parakeet-tdt_ctc-110m",
    engine: "ONNX Runtime",
    availability: "Available Now",
  },
  {
    id: "qwen2.5-1.5b-instruct",
    name: "Qwen 2.5 1.5B Instruct",
    family: "Smart Cleanup (LLM)",
    tier: "Smart Cleanup",
    badge: "Sub-Second Polishing",
    size: "1.1 GB",
    latency: "320 ms",
    ramUsage: "1.2 GB",
    accuracy: 99.2,
    description:
      "Compact on-device LLM via llama-cpp-2 (GGUF). Provides sub-second filler cleanup, punctuation enhancement, and markdown formatting matching Whisper's 99-language coverage.",
    recommendedFor:
      "Automatic speech-to-text cleanup, filler word removal, multilingual grammar formatting on CPU",
    quantization: "GGUF (Q4_K_M / Q5_K_M)",
    languages: "99 Languages",
    fileName: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
    engine: "llama-cpp-2 (GGUF)",
    availability: "Available Now",
    popular: true,
  },
  {
    id: "phi-3.5-mini-instruct",
    name: "Phi-3.5 Mini Instruct",
    family: "Smart Cleanup (LLM)",
    tier: "Smart Cleanup",
    badge: "Deep Voice Transforms",
    size: "2.3 GB",
    latency: "580 ms",
    ramUsage: "2.4 GB",
    accuracy: 99.6,
    description:
      "High-reasoning small language model tailored for complex voice transformations ('Hey HushWrite, make that formal') and structured document synthesis entirely on-device.",
    recommendedFor:
      "Power users wanting conversational voice rewriting, tone adjustments, and executive email drafting",
    quantization: "GGUF (Q4_K_M / Q6_K)",
    languages: "Multilingual",
    fileName: "Phi-3.5-mini-instruct-Q4_K_M.gguf",
    repo: "bartowski/Phi-3.5-mini-instruct-GGUF",
    engine: "llama-cpp-2 (GGUF)",
    availability: "Available Now",
    popular: true,
  },
];

type FilterCategory =
  | "All"
  | "Popular"
  | "Whisper (ASR)"
  | "Parakeet (ONNX)"
  | "Smart Cleanup (LLM)"
  | "Lightweight"
  | "Balanced"
  | "Pro"
  | "Distilled";

export function ModelSelectorGuide() {
  const [selectedModelId, setSelectedModelId] = useState<string>("small-q5_1");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");

  const filteredModels = useMemo(() => {
    if (activeCategory === "Popular") {
      return MODELS.filter((m) => m.popular || m.isDefault);
    }
    if (activeCategory === "All") {
      return MODELS;
    }
    if (
      activeCategory === "Whisper (ASR)" ||
      activeCategory === "Parakeet (ONNX)" ||
      activeCategory === "Smart Cleanup (LLM)"
    ) {
      return MODELS.filter((m) => m.family === activeCategory);
    }
    return MODELS.filter((m) => m.tier === activeCategory);
  }, [activeCategory]);

  const selectedModel = useMemo(() => {
    return MODELS.find((m) => m.id === selectedModelId) || MODELS[2]; // fallback to small-q5_1
  }, [selectedModelId]);

  return (
    <section
      id="models"
      className="py-24 md:py-32 relative overflow-hidden bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white"
    >
      {/* Subtle Ambient Light Glow matching Hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture matching Hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-45" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4 transition-transform hover:scale-[1.02] cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-medium text-neutral-800">
              Offline Model Architecture & Quantization Matrix
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-neutral-950 tracking-[-0.03em] mb-4">
            Select the right engine for your hardware.
          </h2>
          <p className="text-neutral-600 text-base sm:text-lg leading-relaxed">
            HushWrite runs 100% locally on your machine. Choose between quantized Whisper GGML,
            ultra-fast Parakeet ONNX, and on-device GGUF LLMs for intelligent text rewriting.
          </p>
        </div>

        {/* Practical Recommendation Callout Banner */}
        <div className="mb-10 p-5 sm:p-6 rounded-2xl bg-neutral-900 text-white shadow-xl border border-neutral-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-400">
                    Practical Recommendation
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                    Shipped Default
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Default: Whisper Small (q5_1) · Opt-In: Large v3 Turbo (q5_0) · Fast Tier:
                  Parakeet ONNX
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  Whisper Small (190 MB) provides the ideal balance of sub-200ms latency and high
                  punctuation accuracy. For specialized vocabulary, toggle Large v3 Turbo (q5_0).
                  For sub-50ms English streaming, enable the Parakeet ONNX fast tier.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                onClick={() => {
                  setActiveCategory("Balanced");
                  setSelectedModelId("small-q5_1");
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Default Model</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-start md:justify-center gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none no-scrollbar">
          {(
            [
              "All",
              "Popular",
              "Whisper (ASR)",
              "Parakeet (ONNX)",
              "Smart Cleanup (LLM)",
              "Balanced",
              "Pro",
              "Distilled",
            ] as FilterCategory[]
          ).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm font-semibold"
                    : "bg-neutral-100/80 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/80"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Model Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mb-8">
          {filteredModels.map((model) => {
            const isSelected = selectedModel.id === model.id;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#141416] text-white font-semibold border-[#141416] shadow-md scale-[1.01] ring-2 ring-neutral-900/20"
                    : "bg-white text-neutral-700 border-neutral-200/80 hover:text-neutral-950 hover:bg-neutral-50 hover:border-neutral-300 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold truncate block">{model.name}</span>
                    {model.isDefault && (
                      <span
                        className={`text-[9px] font-mono px-1 rounded uppercase tracking-wider font-bold shrink-0 ${
                          isSelected
                            ? "bg-emerald-400/20 text-emerald-300"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        Default
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono block mb-2 truncate ${
                      isSelected ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {model.family}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-dashed border-neutral-200/30">
                  <span
                    className={isSelected ? "text-neutral-300" : "text-neutral-600 font-medium"}
                  >
                    {model.size}
                  </span>
                  <span className={isSelected ? "text-emerald-400 font-bold" : "text-neutral-500"}>
                    {model.latency}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Model Details Panel */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-950">
                  {selectedModel.name}
                </h3>
                {selectedModel.badge && (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {selectedModel.badge}
                  </span>
                )}
                {selectedModel.isDefault && (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 text-white font-semibold">
                    Built-in Default
                  </span>
                )}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                  {selectedModel.engine}
                </span>
                <span
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    selectedModel.availability === "Available Now"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      : selectedModel.availability === "Engine Roadmap"
                        ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                        : "bg-purple-50 text-purple-700 border border-purple-200/80"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedModel.availability}
                </span>
              </div>

              <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-4">
                {selectedModel.description}
              </p>

              {/* Hardware & Use-Case Card */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs mb-4">
                <span className="font-bold text-neutral-900 block mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Optimal Hardware & Use-Case:
                </span>
                <span className="text-neutral-600 leading-relaxed">
                  {selectedModel.recommendedFor}
                </span>
              </div>

              {/* Technical Specifications Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-neutral-600">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-100/60 border border-neutral-200/60">
                  <Languages className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{selectedModel.languages}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-100/60 border border-neutral-200/60">
                  <Cpu className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{selectedModel.quantization}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-100/60 border border-neutral-200/60 col-span-2 sm:col-span-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Air-Gap / Offline OK</span>
                </div>
              </div>

              <div className="mt-3 text-[11px] font-mono text-neutral-400">
                Upstream Hugging Face Repository:{" "}
                <span className="text-neutral-700 font-semibold">{selectedModel.repo}</span>
              </div>
            </div>

            {/* Metrics HUD */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="flex items-center justify-between text-neutral-500 text-[10px] uppercase mb-1">
                  <span>Latency</span>
                  <Zap className="w-3 h-3 text-amber-500" />
                </div>
                <span className="font-bold text-neutral-950 text-base">
                  {selectedModel.latency}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">typical inference</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="flex items-center justify-between text-neutral-500 text-[10px] uppercase mb-1">
                  <span>Disk Size</span>
                  <HardDrive className="w-3 h-3 text-blue-500" />
                </div>
                <span className="font-bold text-neutral-950 text-base">{selectedModel.size}</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5 truncate">
                  {selectedModel.fileName}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="flex items-center justify-between text-neutral-500 text-[10px] uppercase mb-1">
                  <span>RAM Usage</span>
                  <Cpu className="w-3 h-3 text-purple-500" />
                </div>
                <span className="font-bold text-neutral-950 text-base">
                  {selectedModel.ramUsage}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">active memory</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/90">
                <div className="flex items-center justify-between text-emerald-700 text-[10px] uppercase font-bold mb-1">
                  <span>Accuracy</span>
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="font-bold text-emerald-700 text-base">
                  {selectedModel.accuracy}%
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  benchmark score
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Windows Quantization & Deep Engine Architecture Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Windows Quantization */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mb-4 font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-neutral-950 mb-2">
                Why Quantization (q5_0, q8_0) Matters on Windows
              </h4>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Unlike macOS with its unified memory and Apple Neural Engine (ANE), Windows CPUs
                rely on SIMD vector units (AVX2/AVX-512) and DirectML. 5-bit (
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  q5_0
                </code>{" "}
                /{" "}
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  q5_1
                </code>
                ) and 8-bit (
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  q8_0
                </code>
                ) quantization is your main lever to compress weights by up to 65%, avoiding memory
                bandwidth stalls and delivering sub-200ms latency without thermal throttling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tested on Intel Core i5/i7/i9 & AMD Ryzen</span>
            </div>
          </div>

          {/* Card 2: Parakeet ONNX Runtime */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center mb-4 font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-neutral-950 mb-2">
                Parakeet ONNX Runtime: English Fast Tier
              </h4>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                NVIDIA’s{" "}
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  parakeet-tdt-0.6b-v2
                </code>{" "}
                is the architecture Windows dictation engines have converged on for ultra-fast
                streaming (sub-50ms). Running via ONNX Runtime with DirectML, it excels at English
                throughput. For 99-language coverage, Whisper remains the primary engine.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>English Fast Mode · Whisper for Multilingual</span>
            </div>
          </div>

          {/* Card 3: Local LLM Smart Cleanup */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center mb-4 font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-neutral-950 mb-2">
                Local LLMs for Smart Cleanup & Voice Commands
              </h4>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Without cloud API roundtrips, HushWrite leverages{" "}
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  llama-cpp-2
                </code>{" "}
                in GGUF format (
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  Qwen 2.5 1.5B
                </code>{" "}
                &{" "}
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  Phi-3.5 Mini
                </code>
                ). Quantized to{" "}
                <code className="text-neutral-900 bg-neutral-200/60 px-1 py-0.5 rounded text-[11px]">
                  Q4_K_M
                </code>{" "}
                on CPU, it executes filler removal, code formatting, and voice transformations with
                zero cloud egress.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sub-Second On-Device Voice Transformation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
