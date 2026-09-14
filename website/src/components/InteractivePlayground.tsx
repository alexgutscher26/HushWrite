/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Copy, Check, Volume2, Cpu } from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  category: string;
  rawSpoken: string;
  fillerWords: string[];
  cleanTranscription: string;
  smartFormatted: string;
  latency: number;
  wordCount: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: "tech",
    title: "Backend Refactor Note",
    category: "Coding & Architecture",
    rawSpoken:
      "we need to refactor the payment gateway to use exponential backoff with jitter and add an idempotent key to prevent double charging on stripe webhooks",
    fillerWords: ["um", "like"],
    cleanTranscription:
      "We need to refactor the payment gateway to use exponential backoff with jitter and add an idempotent key to prevent double charging on Stripe webhooks.",
    smartFormatted: `// Architecture Decision: Payment Gateway Resiliency
1. Implement exponential backoff with Full Jitter algorithm
2. Enforce Idempotency-Key headers on all Stripe webhook handlers
3. Guarantee zero duplicate billing during network timeouts`,
    latency: 184,
    wordCount: 29,
  },
  {
    id: "standup",
    title: "Daily Standup Update",
    category: "Team Chat & Slack",
    rawSpoken:
      "yesterday I finished the directml windows integration and today I am going to write tests for the audio resampler no blockers on my end",
    fillerWords: ["uh", "guys"],
    cleanTranscription:
      "Yesterday I finished the DirectML Windows integration, and today I am going to write tests for the audio resampler. No blockers on my end.",
    smartFormatted: `Daily Standup Update:
• Yesterday: Completed DirectML Windows GPU integration
• Today: Writing unit tests for the Rubato audio resampler
• Blockers: None`,
    latency: 162,
    wordCount: 27,
  },
  {
    id: "medical",
    title: "Clinical & Technical Note",
    category: "Medical Jargon",
    rawSpoken:
      "patient presents with acute benign paroxysmal positional vertigo recommend epley maneuver and vestibular rehabilitation therapy discontinue meclizine",
    fillerWords: [],
    cleanTranscription:
      "Patient presents with acute benign paroxysmal positional vertigo. Recommend Epley maneuver and vestibular rehabilitation therapy. Discontinue meclizine.",
    smartFormatted: `DIAGNOSIS: Acute Benign Paroxysmal Positional Vertigo (BPPV)
PLAN:
1. Perform in-office Epley canalith repositioning maneuver
2. Referral to Vestibular Rehabilitation Therapy (VRT)
3. Discontinue Meclizine`,
    latency: 208,
    wordCount: 19,
  },
  {
    id: "strategy",
    title: "Q4 Roadmap Strategy",
    category: "Product & Docs",
    rawSpoken:
      "our main focus for q four is shipping the local whisper turbo model cutting battery drain on macos and releasing the enterprise offline installer",
    fillerWords: ["um"],
    cleanTranscription:
      "Our main focus for Q4 is shipping the local Whisper Turbo model, cutting battery drain on macOS, and releasing the enterprise offline installer.",
    smartFormatted: `### Q4 Strategic Priorities

• Whisper Large Turbo: Faster decode speeds with sub-200ms latency
• Zero Battery Drain: Asynchronous Metal and DirectML inference optimizations
• Enterprise Offline Installer: Air-gapped MSIX and PKG packages for regulated teams`,
    latency: 174,
    wordCount: 23,
  },
];

const TELEMETRY = [
  { label: "Processing latency", getValue: (s: Scenario) => `${s.latency} ms`, accent: false },
  { label: "Cloud egress", getValue: () => "0 bytes", accent: true },
  { label: "VRAM footprint", getValue: () => "~380 MB", accent: false },
  { label: "Software cost", getValue: () => "Free (MIT)", accent: true },
];

export function InteractivePlayground() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<"clean" | "formatted">("formatted");
  const [displayedText, setDisplayedText] = useState(SCENARIOS[0].smartFormatted);
  const [isCopied, setIsCopied] = useState(false);
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>([
    10, 14, 18, 22, 18, 14, 10, 14, 18, 14, 10, 14, 16, 12, 14, 10,
  ]);

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
        // ignore if already stopped
      }
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setAudioLevels([10, 14, 18, 22, 18, 14, 10, 14, 18, 14, 10, 14, 16, 12, 14, 10]);
  }, []);

  useEffect(() => {
    return () => {
      stopLiveMic();
    };
  }, [stopLiveMic]);

  // Handle synthetic animation when playing preset simulations
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isLiveMic) {
      interval = setInterval(() => {
        setAudioLevels(Array.from({ length: 16 }, () => Math.floor(Math.random() * 55) + 12));
      }, 80);
    } else if (!isLiveMic) {
      setAudioLevels([10, 14, 18, 22, 18, 14, 10, 14, 18, 14, 10, 14, 16, 12, 14, 10]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isLiveMic]);

  const handleScenarioSelect = (scenario: Scenario) => {
    stopLiveMic();
    setActiveScenario(scenario);
    setIsPlaying(true);
    setDisplayedText("");

    const targetText = mode === "formatted" ? scenario.smartFormatted : scenario.cleanTranscription;
    let i = 0;
    const interval = setInterval(() => {
      if (i < targetText.length) {
        setDisplayedText(targetText.slice(0, i + 1));
        i += 2;
      } else {
        clearInterval(interval);
        setDisplayedText(targetText);
        setIsPlaying(false);
      }
    }, 12);
  };

  const startLiveMic = async () => {
    stopLiveMic();
    isRecordingRef.current = true;
    setIsLiveMic(true);
    setLiveTranscript("Listening to your voice... Speak into your microphone.");

    // Setup real-time audio visualizer via Web Audio API
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

        const updateAudioBars = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          // Downsample to 16 bars
          const newLevels: number[] = [];
          for (let b = 0; b < 16; b++) {
            const rawVal = dataArray[b] || 0;
            // Map 0..255 to reasonable visual height
            const level = Math.max(10, Math.min(85, Math.floor((rawVal / 255) * 80) + 10));
            newLevels.push(level);
          }
          setAudioLevels(newLevels);
          animationFrameRef.current = requestAnimationFrame(updateAudioBars);
        };

        animationFrameRef.current = requestAnimationFrame(updateAudioBars);
      } catch (err) {
        console.warn("Could not start Web Audio analyzer:", err);
      }
    }

    // Setup Speech Recognition
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
          if (isRecordingRef.current) {
            setIsLiveMic(true);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let fullFinal = "";
          let interim = "";
          for (let i = 0; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullFinal += transcriptChunk + " ";
            } else {
              interim += transcriptChunk;
            }
          }
          const fullText = (fullFinal + interim).trim();
          if (fullText) {
            setLiveTranscript(fullText);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === "no-speech") {
            return;
          }
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setLiveTranscript(
              "Microphone permission was denied. Please allow microphone access in your browser.",
            );
            return;
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore if already active
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    } else {
      setLiveTranscript(
        "Microphone active. (Note: Browser Web Speech API is supported in Chrome, Edge, and Safari; HushWrite desktop app runs 100% offline with whisper.cpp on all platforms).",
      );
    }
  };

  const toggleLiveMic = () => {
    if (isLiveMic) {
      stopLiveMic();
    } else {
      startLiveMic();
    }
  };

  const handleCopy = () => {
    const textToCopy = isLiveMic ? liveTranscript : displayedText;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section
      id="playground"
      className="py-24 md:py-32 relative overflow-hidden bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white"
    >
      {/* Subtle Ambient Light Glow matching Hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture matching Hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-45" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {/* Section Header matching Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4 transition-transform hover:scale-[1.02] cursor-default">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-medium text-neutral-800">
              Interactive Voice Lab
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-neutral-950 tracking-[-0.03em] mb-4">
            Test HushWrite in your browser.
          </h2>
          <p className="text-neutral-600 text-base sm:text-lg leading-relaxed">
            Experience how HushWrite turns unstructured messy speech into formatted writing while
            stripping filler words with zero cloud latency.
          </p>
        </div>

        {/* Playground Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Preset Scenarios (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-bold text-neutral-900">Select a scenario</span>
                <span className="text-[11px] font-mono text-neutral-500">Instant decode</span>
              </div>

              <div className="flex flex-col gap-2">
                {SCENARIOS.map((scenario) => {
                  const isSelected = activeScenario.id === scenario.id && !isLiveMic;
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => handleScenarioSelect(scenario)}
                      aria-pressed={isSelected}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                        isSelected
                          ? "bg-neutral-50 border-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-neutral-950"
                          : "bg-white border-neutral-200/80 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-neutral-900">
                          {scenario.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold">
                          {scenario.latency}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate font-mono">
                        {scenario.rawSpoken}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Real Mic Trigger */}
              {/* <div className="mt-4 pt-4 border-t border-neutral-200/80">
                <button
                  onClick={toggleLiveMic}
                  aria-pressed={isLiveMic}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                    isLiveMic
                      ? "bg-emerald-500 text-white font-bold shadow-md"
                      : "bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 shadow-sm"
                  }`}
                >
                  <Mic
                    className={`w-3.5 h-3.5 ${isLiveMic ? "text-white motion-safe:animate-pulse" : "text-emerald-600"}`}
                  />
                  <span>{isLiveMic ? "Stop microphone" : "Test live with microphone"}</span>
                </button>
              </div> */}
            </div>

            {/* Telemetry Stats */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-xs font-semibold text-neutral-800">
                  Local system telemetry
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TELEMETRY.map(({ label, getValue, accent }) => (
                  <div
                    key={label}
                    className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80"
                  >
                    <span className="text-neutral-500 block text-[10px] font-mono">{label}</span>
                    <span
                      className={`font-bold text-sm ${accent ? "text-emerald-700" : "text-neutral-900"}`}
                    >
                      {getValue(activeScenario)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Output Viewer (7 cols) - Styled as macOS window */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between overflow-hidden">
            <div className="p-6">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {isLiveMic ? "Live audio stream" : activeScenario.title}
                    </h3>
                    <span className="text-xs font-mono text-neutral-500">
                      {isLiveMic ? "In-browser speech recognition" : activeScenario.category}
                    </span>
                  </div>
                </div>

                {!isLiveMic && (
                  <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-full border border-neutral-200/80">
                    <button
                      onClick={() => {
                        setMode("clean");
                        setDisplayedText(activeScenario.cleanTranscription);
                      }}
                      className={`text-xs px-3 py-1 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                        mode === "clean"
                          ? "bg-white text-neutral-950 font-semibold shadow-sm border border-neutral-200/70"
                          : "text-neutral-600 hover:text-neutral-950"
                      }`}
                    >
                      Clean text
                    </button>
                    <button
                      onClick={() => {
                        setMode("formatted");
                        setDisplayedText(activeScenario.smartFormatted);
                      }}
                      className={`text-xs px-3 py-1 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                        mode === "formatted"
                          ? "bg-white text-neutral-950 font-semibold shadow-sm border border-neutral-200/70"
                          : "text-neutral-600 hover:text-neutral-950"
                      }`}
                    >
                      Smart format
                    </button>
                  </div>
                )}
              </div>

              {/* Sound Wave Bars */}
              <div className="my-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-1 h-5">
                  {audioLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className="w-1 rounded-full bg-emerald-500 transition-all duration-75"
                      style={{ height: `${Math.max(4, lvl / 2.5)}px` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
                  GPU-accelerated voice detection
                </span>
              </div>

              {/* Raw Spoken Voice */}
              {!isLiveMic && (
                <div className="mb-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-xs font-semibold text-emerald-700 block mb-1">
                    What you said:
                  </span>
                  <p className="text-xs text-neutral-700 font-mono leading-relaxed">
                    &ldquo;{activeScenario.rawSpoken}&rdquo;
                  </p>
                </div>
              )}

              {/* Output Box */}
              <div className="p-5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs sm:text-sm min-h-[180px] whitespace-pre-wrap leading-relaxed shadow-inner border border-neutral-800">
                {isLiveMic ? liveTranscript : displayedText}
                {(isPlaying || isLiveMic) && (
                  <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 motion-safe:animate-pulse shadow-[0_0_8px_#10b981]" />
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 border-t border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">
                Pasted directly into active cursor position
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-white bg-[#141416] hover:bg-neutral-800 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Copy text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
