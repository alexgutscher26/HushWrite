/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mark } from "@/components/Mark";
import { transformCreatorText, CreatorTransformResult } from "@/lib/creatorTransform";
import {
  Mic,
  Brain,
  MessageSquare,
  ShieldCheck,
  Layers,
  Smartphone,
  Copy,
  Check,
  Download,
  ArrowRight,
  Share2,
  Sparkles,
} from "lucide-react";

const CREATOR_DEMOS = [
  {
    id: "youtube-script",
    platform: "YouTube / Video",
    icon: "🎬",
    title: "YouTube Video Script",
    spoken: "youtube script template title why offline ai is the future of productivity",
    target: "Google Docs / Notion / YouTube Studio",
    badge: "Scriptwriting",
  },
  {
    id: "linkedin-post",
    platform: "LinkedIn",
    icon: "💼",
    title: "LinkedIn Thought Leadership",
    spoken: "linkedin post template on why we stopped streaming microphone audio to cloud servers",
    target: "LinkedIn Web / Taplio / Buffer",
    badge: "Thought Leadership",
  },
  {
    id: "x-thread",
    platform: "X (Twitter)",
    icon: "🧵",
    title: "X (Twitter) Thread",
    spoken: "x thread template breakdown of our directml whisper speech benchmarks",
    target: "X.com / Typefully / Hypefury",
    badge: "Virality Threads",
  },
  {
    id: "substack-draft",
    platform: "Substack / Newsletter",
    icon: "💌",
    title: "Substack Newsletter",
    spoken: "substack draft on leaving cloud subscriptions for local tools",
    target: "Substack / Beehiiv / Medium",
    badge: "Long-form",
  },
  {
    id: "viral-hook",
    platform: "TikTok / Reels / Shorts",
    icon: "🪝",
    title: "3-Part Content Hook",
    spoken: "content hook template on how creators burn out from typing everything",
    target: "TikTok / Reels / Shorts",
    badge: "Hook Framework",
  },
  {
    id: "social-caption",
    platform: "Instagram",
    icon: "📱",
    title: "Social Caption & Hashtags",
    spoken: "instagram caption template for today's desk setup video",
    target: "Instagram / X / Threads",
    badge: "Social Media",
  },
  {
    id: "podcast-notes",
    platform: "Podcasts / Spotify",
    icon: "🎙️",
    title: "Podcast Episode Outline",
    spoken: "podcast show notes episode 84 with guest alex on local intelligence",
    target: "Descript / Spotify / Apple Podcasts",
    badge: "Podcasting",
  },
  {
    id: "sponsor-read",
    platform: "Sponsorships & Ads",
    icon: "📢",
    title: "60s Sponsor Read",
    spoken: "sponsor read template for audio hardware partner",
    target: "Sponsorships & Brand Deals",
    badge: "Monetization",
  },
];

const CREATOR_PILLARS = [
  {
    icon: <Mic className="w-5 h-5 text-emerald-600" />,
    title: "Brainstorm & Script Out Loud",
    desc: "Beat writer's block instantly. Talk through your ideas on a walk, in the car, or at your desk. HushWrite formats your spoken thoughts into clean, structured prose.",
  },
  {
    icon: <Brain className="w-5 h-5 text-purple-500" />,
    title: "Give AI 10x More Context",
    desc: "Speak detailed, multi-paragraph prompts directly into ChatGPT, Claude, and Perplexity hands-free. Iterate on video ideas 4x faster without typing fatigue.",
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
    title: "Engage With Your Audience Fast",
    desc: "Speed through YouTube comments, Instagram DMs, Substack replies, and Discord chats with natural, thoughtful voice replies.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    title: "Protect Unreleased Creator IP",
    desc: "Unpublished scripts, confidential sponsor rates, book drafts, and unreleased video ideas stay 100% on your machine. Zero cloud training on your voice or concepts.",
  },
  {
    icon: <Layers className="w-5 h-5 text-amber-500" />,
    title: "Works Across Every Creator App",
    desc: "Direct native injection into Notion, Google Docs, Apple Notes, Scrivener, Word, Final Cut Pro, DaVinci Resolve, and Descript.",
  },
  {
    icon: <Share2 className="w-5 h-5 text-sky-500" />,
    title: "Dictate Viral X Threads & LinkedIn Insights",
    desc: "Draft engaging X threads and LinkedIn posts in one breath using spoken commands like 'x thread template', 'tweet break', and 'linkedin post template'. Types straight into Typefully, Taplio, or your browser.",
  },
  {
    icon: <Smartphone className="w-5 h-5 text-neutral-800" />,
    title: "Mobile & Desktop Flexibility",
    desc: "Capture memos on the go with zero subscription fatigue. One-time purchase or free open source forever.",
  },
];

const CREATOR_COMPARISONS = [
  {
    feature: "Script & Idea Privacy",
    HushWrite: "100% On-Device (0 bytes cloud upload)",
    wispr: "Cloud streaming (Sent to servers)",
  },
  {
    feature: "Offline & Airplane Mode",
    HushWrite: "Full functionality without Wi-Fi",
    wispr: "Requires active Internet connection",
  },
  {
    feature: "X & LinkedIn Thread Macros",
    HushWrite: "Built-in X thread delimiters, LinkedIn hooks, and carousel templates",
    wispr: "Generic cloud rewriting without thread delimiters",
  },
  {
    feature: "Scriptwriting & Hook Templates",
    HushWrite: "Built-in voice macros (YouTube, Substack, Reels, X, LinkedIn)",
    wispr: "Standard AI rewriting",
  },
  {
    feature: "AI Prompt Context Capacity",
    HushWrite: "Unlimited words, zero cloud throttle",
    wispr: "Cloud token limits & tiers",
  },
  {
    feature: "Audio Retention Policy",
    HushWrite: "Instantly freed from RAM (0 storage)",
    wispr: "Cloud server audio logs",
  },
  {
    feature: "Pricing Model",
    HushWrite: "Free Starter / $49 Lifetime perpetual",
    wispr: "$12/month ($144/year recurring)",
  },
];

export default function CreatorsPage() {
  const [selectedDemo, setSelectedDemo] = useState(CREATOR_DEMOS[0]);
  const [currentSpoken, setCurrentSpoken] = useState(CREATOR_DEMOS[0].spoken);
  const [transformResult, setTransformResult] = useState<CreatorTransformResult>(() =>
    transformCreatorText(CREATOR_DEMOS[0].spoken),
  );
  const [displayedOutput, setDisplayedOutput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 14, 18, 22, 18, 14, 10, 14]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const stopLiveMic = useCallback(() => {
    isRecordingRef.current = false;
    setIsLiveMic(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setAudioLevels([10, 14, 18, 22, 18, 14, 10, 14]);
  }, []);

  useEffect(() => {
    return () => {
      stopLiveMic();
    };
  }, [stopLiveMic]);

  // Animate typed output when preset or text updates
  const animateOutput = useCallback((targetText: string) => {
    setIsTyping(true);
    setDisplayedOutput("");
    let i = 0;
    const speed = Math.max(6, Math.floor(600 / Math.max(targetText.length, 1)));
    const interval = setInterval(() => {
      if (i < targetText.length) {
        setDisplayedOutput(targetText.slice(0, i + 1));
        i += 2;
      } else {
        clearInterval(interval);
        setDisplayedOutput(targetText);
        setIsTyping(false);
      }
    }, speed);
  }, []);

  // Initial load
  useEffect(() => {
    const res = transformCreatorText(CREATOR_DEMOS[0].spoken);
    setTransformResult(res);
    setDisplayedOutput(res.transformed);
  }, []);

  const handleSelectPreset = (preset: (typeof CREATOR_DEMOS)[0]) => {
    stopLiveMic();
    setSelectedDemo(preset);
    setCurrentSpoken(preset.spoken);
    const result = transformCreatorText(preset.spoken);
    setTransformResult(result);
    animateOutput(result.transformed);
  };

  const handleInputChange = (text: string) => {
    setCurrentSpoken(text);
    const result = transformCreatorText(text);
    setTransformResult(result);
    setDisplayedOutput(result.transformed);
  };

  const startLiveMic = async () => {
    stopLiveMic();
    isRecordingRef.current = true;
    setIsLiveMic(true);

    // Audio Visualizer
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // @ts-expect-error WebkitAudioContext
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateBars = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const levels: number[] = [];
          for (let b = 0; b < 8; b++) {
            const raw = dataArray[b] || 0;
            levels.push(Math.max(8, Math.min(50, Math.floor((raw / 255) * 45) + 8)));
          }
          setAudioLevels(levels);
          animationFrameRef.current = requestAnimationFrame(updateBars);
        };
        animationFrameRef.current = requestAnimationFrame(updateBars);
      } catch (err) {
        console.warn("Web Audio mic stream error:", err);
      }
    }

    // Web Speech Recognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (isRecordingRef.current) setIsLiveMic(true);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let fullFinal = "";
          let interim = "";
          for (let i = 0; i < event.results.length; ++i) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullFinal += chunk + " ";
            } else {
              interim += chunk;
            }
          }
          const spoken = (fullFinal + interim).trim();
          if (spoken) {
            handleInputChange(spoken);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          if (event.error === "no-speech") return;
          console.warn("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Recognition start failed:", err);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transformResult.transformed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Background ambient glow matching landing page */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-neutral-100 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture matching landing page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none opacity-45" />

      {/* Fluid Island Pill Navbar */}
      <Navbar />

      <div className="relative pt-36 pb-24 md:pt-44 md:pb-32 px-4 max-w-5xl mx-auto space-y-24 z-10">
        {/* Hero Section matching Landing Page */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-xs font-mono font-medium text-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Flow for Creators · 100% Private On-Device</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.035em] text-neutral-950 max-w-4xl mx-auto leading-[1.06]">
            Turn thoughts into content,
            <span className="block text-[#737373] font-bold mt-1 sm:mt-2">4x faster.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed font-normal">
            HushWrite gives creators hours back every week by replacing typing, editing, and
            creative friction with your natural voice. Dictate viral threads on{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800">
              X (Twitter)
            </span>
            {", "}share thought leadership on{" "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800">
              LinkedIn
            </span>
            {", draft scripts in "}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800">
              Notion
            </span>
            {", and prompt AI without touching a keyboard."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/#download"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-sm font-semibold shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download HushWrite Free</span>
              <span className="text-xs text-neutral-400 font-normal">Windows & Mac</span>
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200/90 shadow-sm text-sm font-semibold text-neutral-800 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>View Creator Lifetime Deal ($49)</span>
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </Link>
          </div>
        </section>

        {/* Interactive Creator Voice Simulator matching InteractivePlayground style */}
        <section className="bg-neutral-50/90 border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 flex items-center gap-2.5">
                <span>Interactive Creator Voice Templates</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold">
                  Live Engine Active
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Click presets or use your microphone to test real-time creator schemas and voice
                templates.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CREATOR_DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleSelectPreset(demo)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedDemo.id === demo.id
                      ? "bg-neutral-950 text-white font-semibold shadow-sm scale-[1.02]"
                      : "bg-white text-neutral-600 hover:text-neutral-950 border border-neutral-200/80 hover:bg-neutral-100/80"
                  }`}
                >
                  <span>{demo.icon}</span>
                  <span>{demo.platform}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spoken Voice Input */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-medium">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLiveMic ? "bg-rose-500 animate-ping" : "bg-rose-500"
                      }`}
                    />
                    What You Speak Out Loud
                  </span>

                  {/* Interactive Live Microphone Button */}
                  <button
                    onClick={isLiveMic ? stopLiveMic : startLiveMic}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                      isLiveMic
                        ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm animate-pulse"
                        : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80"
                    }`}
                  >
                    {isLiveMic ? (
                      <>
                        <div className="flex items-center gap-0.5 h-3">
                          {audioLevels.map((lvl, idx) => (
                            <span
                              key={idx}
                              className="w-0.5 bg-rose-500 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(4, lvl / 3)}px` }}
                            />
                          ))}
                        </div>
                        <span>Listening... (Click to stop)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Test with Mic</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Editable / Interactive Voice Input Area */}
                <div className="bg-neutral-50/70 p-3.5 rounded-lg border border-neutral-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                  <textarea
                    value={currentSpoken}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Speak into microphone or type: 'youtube script template title my first video'..."
                    rows={3}
                    className="w-full bg-transparent font-mono text-xs sm:text-sm text-neutral-900 resize-none focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-[11px] text-neutral-400 font-mono">
                    <span>💡 Edit text or speak creator commands</span>
                    <span>{currentSpoken.length} chars</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-500 font-mono pt-1">
                Primary Apps:{" "}
                <strong className="text-neutral-700 font-semibold">{selectedDemo.target}</strong>
              </div>
            </div>

            {/* Formatted Content Output */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm ring-1 ring-emerald-500/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Instant Formatted Draft
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 border border-neutral-200 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Template</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs sm:text-sm font-mono text-neutral-100 bg-[#0e0e11] p-3.5 rounded-xl border border-neutral-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto shadow-inner selection:bg-neutral-800 selection:text-white min-h-[140px]">
                  {displayedOutput}
                  {isTyping && (
                    <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse shadow-[0_0_8px_#10b981]" />
                  )}
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-neutral-600 pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200/60 font-medium text-[11px]">
                    Type: {selectedDemo.badge}
                  </span>
                  {transformResult.matchedRules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium text-[11px]"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      {rule}
                    </span>
                  ))}
                </div>
                <span className="text-emerald-700 font-medium">
                  Latency: ~{transformResult.latencyUs}µs rule eval · 100% on-device
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Top 5 Ways Content Creators Flow (Bento Grid) */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-medium text-neutral-800">
                Creator Workflows
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-950">
              Top 5 Ways Content Creators Flow
            </h2>
            <p className="text-base text-neutral-600">
              Move from idea to publish-ready content without getting trapped in typing friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CREATOR_PILLARS.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 space-y-3.5 group"
              >
                <div className="w-11 h-11 rounded-xl bg-neutral-100/90 border border-neutral-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {pillar.icon}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-950">{pillar.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Creator IP & Privacy Callout */}
        <section className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-8 sm:p-10 space-y-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200/80 text-emerald-800 flex items-center justify-center text-xl shadow-xs shrink-0">
              🛡️
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-neutral-950">
                Why Top Creators Refuse Cloud Transcription
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                Your unreleased scripts and brand deals are your livelihood.
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl">
            Cloud dictation services upload your voice, audio recordings, and confidential draft
            text to external servers where they can be retained or used for third-party AI training.{" "}
            <strong className="text-neutral-950 font-semibold">
              HushWrite never touches the Internet.
            </strong>{" "}
            Your video ideas, client NDAs, sponsor pricing negotiations, and private creative drafts
            exist solely in your computer's memory.
          </p>

          <div className="pt-1">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4"
            >
              <span>Read our Zero-Telemetry Privacy Architecture</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* Head-to-Head Comparison with Wispr Flow */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-medium text-neutral-800">
                100% On-Device vs. Cloud Subscriptions
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-950">
              HushWrite vs. Wispr Flow for Creators
            </h2>
            <p className="text-base text-neutral-600">
              Compare local offline speech-to-text with cloud monthly subscriptions.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-200/90 overflow-x-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-200/80 bg-neutral-50/80 font-mono text-xs text-neutral-900 uppercase tracking-wider">
                  <th className="p-4 sm:p-5 font-semibold">Feature / Privacy Guard</th>
                  <th className="p-4 sm:p-5 font-bold text-emerald-800 bg-emerald-50/30">
                    HushWrite (100% On-Device)
                  </th>
                  <th className="p-4 sm:p-5 text-neutral-500 font-normal">Wispr Flow (Cloud)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {CREATOR_COMPARISONS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-4 sm:p-5 text-xs sm:text-sm font-medium text-neutral-900">
                      {row.feature}
                    </td>
                    <td className="p-4 sm:p-5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50/20">
                      {row.HushWrite}
                    </td>
                    <td className="p-4 sm:p-5 text-xs font-mono text-neutral-500">{row.wispr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom CTA Banner matching landing page finish */}
        <section className="bg-[#141416] border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 text-white shadow-xl relative overflow-hidden">
          <div className="w-[500px] h-[250px] bg-gradient-to-r from-emerald-500/10 to-transparent rounded-full blur-3xl absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center relative z-10">
            <Mark size="md" animated={true} />
          </div>

          <div className="space-y-2 max-w-xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Start Creating at the Speed of Speech
            </h2>
            <p className="text-sm text-neutral-400">
              Join thousands of writers, YouTubers, and podcasters drafting 4x faster with
              HushWrite.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2 relative z-10">
            <Link
              href="/#download"
              className="px-7 py-3.5 rounded-xl bg-white text-neutral-950 font-semibold hover:bg-neutral-100 transition-all text-sm shadow-md"
            >
              Download HushWrite Free
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3.5 rounded-xl bg-neutral-800 text-white/90 border border-neutral-700 hover:text-white hover:bg-neutral-700 transition-all text-sm font-medium"
            >
              Get Lifetime Access ($49)
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
