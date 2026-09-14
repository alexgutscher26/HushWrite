/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  ShieldCheck,
  Eye,
  Lock,
  WifiOff,
  Wifi,
  Terminal,
  Mail,
  Download,
  CheckCircle2,
} from "lucide-react";

interface AppPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  rawSpoken: string;
  formattedOutput: string;
}

const APP_PRESETS: AppPreset[] = [
  {
    id: "slack",
    name: "Slack",
    category: "Team Chat",
    icon: "#",
    rawSpoken:
      "hey team quick update on the latency benchmarks real time factor dropped to zero point two please test and report any bugs in eng channel",
    formattedOutput: `Hey team, quick update on the latency benchmarks:

• Real-time factor dropped to 0.20x with sub-180ms latency
• DirectML and Metal GPU offloading are active
• Please test your dictations and report any edge cases in #eng-bugs`,
  },
  {
    id: "cursor",
    name: "Cursor & VS Code",
    category: "Code & Commits",
    icon: "{ }",
    rawSpoken:
      "write an async function handlePaymentWebhook that validates stripe signatures and updates customer status in supabase",
    formattedOutput: `export async function handlePaymentWebhook(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new Error("Missing stripe signature");

  const event = stripe.webhooks.constructEvent(
    await req.text(),
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === "customer.subscription.updated") {
    await supabase.from("subscriptions").upsert({
      customer_id: event.data.object.customer,
      status: event.data.object.status,
    });
  }
  return new Response("ok", { status: 200 });
}`,
  },
  {
    id: "notion",
    name: "Notion & Linear",
    category: "Issues & Notes",
    icon: "≡",
    rawSpoken:
      "bug template step one toggle air gap mode step two dictate paragraph step three verify zero packets in packet monitor",
    formattedOutput: `### [Bug Verification]: Air-Gap Network Egress
- **Steps to Reproduce:**
  1. Toggle Air-Gap mode in Settings
  2. Dictate paragraph across multiple apps
  3. Run packet monitor (\`pktmon\` or \`lulu\`)
- **Result:** 0 bytes outbound · 100% local decode
- **Status:** Verified ✅`,
  },
  {
    id: "mail",
    name: "Mail & Docs",
    category: "Executive Email",
    icon: "✉",
    rawSpoken:
      "thanks for reaching out regarding our security model all speech processing runs locally on device with zero cloud telemetry",
    formattedOutput: `Hi Sarah,

Thanks for reaching out. Regarding our security model, all speech recognition and formatting runs entirely on device via local Whisper models. Zero audio or telemetry ever leaves your computer.

Let me know if you would like to review our plain-English privacy architecture.

Best regards,
Alex`,
  },
  {
    id: "github-airplane",
    name: "GitHub (Airplane Mode)",
    category: "Air-Gapped Issue",
    icon: "✈",
    rawSpoken:
      "issue title memory leak in webview audio buffer description steps to reproduce toggle air gap mode disconnect wifi dictate five paragraphs expected behavior memory stays flat at eighty megabytes with zero network egress observed behavior verified zero bytes sent via packet monitor",
    formattedOutput: `### Bug: Memory Profile & Network Egress in Air-Gap Mode

**Steps to Reproduce:**
1. Toggle Airplane / Air-Gap Mode in HushWrite Settings
2. Disconnect Wi-Fi and Ethernet (\`0 bytes/sec\` egress)
3. Dictate 5 continuous paragraphs into the issue editor

**Expected Behavior:**
- Working set memory stays flat at ~80MB
- 0 bytes outbound packets captured in packet monitor (\`pktmon\` / \`lulu\`)
- Text arrives instantly at cursor with sub-200ms latency

**Audit Result:**
Verified ✅ — 100% on-device Whisper decode. 0 bytes transmitted over network.`,
  },
  {
    id: "chatgpt",
    name: "ChatGPT & Claude",
    category: "AI Prompts",
    icon: "✦",
    rawSpoken:
      "summarize our competitive advantage in private on-device dictation focusing on zero cloud streaming and sub-200ms latency",
    formattedOutput: `Please analyze and structure our positioning for on-device AI dictation:

1. Technical Moat: whisper.cpp running 100% locally via Apple Metal / Windows DirectML (sub-180ms latency)
2. Verifiable Privacy: 0 bytes outbound egress, audited by Wireshark/LuLu, zero accounts required
3. Workflow Impact: Universal global hotkey typing directly into any active app without clipboard hijack`,
  },
];

export function Hero() {
  const [selectedApp, setSelectedApp] = useState<AppPreset>(APP_PRESETS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [typedText, setTypedText] = useState(APP_PRESETS[0].formattedOutput);
  const [pillState, setPillState] = useState<"idle" | "listening" | "processing" | "pasted">(
    "idle",
  );
  const [detectedOs, setDetectedOs] = useState<"mac" | "windows" | "linux">("mac");
  const [wifiDisabled, setWifiDisabled] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([
    14, 28, 45, 75, 40, 60, 25, 55, 30, 15,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes("win")) setDetectedOs("windows");
      else if (userAgent.includes("mac")) setDetectedOs("mac");
      else setDetectedOs("linux");
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pillState === "listening") {
      interval = setInterval(() => {
        setWaveformBars(Array.from({ length: 12 }, () => Math.floor(Math.random() * 60) + 15));
      }, 80);
    } else {
      setWaveformBars([12, 16, 20, 24, 20, 16, 12, 16, 20, 16, 12, 16]);
    }
    return () => clearInterval(interval);
  }, [pillState]);

  const startSimulation = (preset = selectedApp) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setTypedText("");
    setPillState("listening");

    setTimeout(() => {
      setPillState("processing");
      let currentText = "";
      const target = preset.formattedOutput;
      let i = 0;
      const speed = Math.max(8, Math.floor(1400 / target.length));

      const interval = setInterval(() => {
        if (i < target.length) {
          currentText += target[i];
          setTypedText(currentText);
          i++;
        } else {
          clearInterval(interval);
          setPillState("pasted");
          setIsSimulating(false);
          setTimeout(() => {
            setPillState("idle");
          }, 3500);
        }
      }, speed);
    }, 900);
  };

  const handleSelectApp = (preset: AppPreset) => {
    setSelectedApp(preset);
    setTypedText(preset.formattedOutput);
    setPillState("idle");
    setIsSimulating(false);
  };

  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleHeroDownload = () => {
    setDownloadStarted(true);
    setTimeout(() => {
      setDownloadStarted(false);
    }, 4500);
  };

  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden flex flex-col items-center bg-[#ffffff] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Subtle Ambient Light Glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-neutral-100 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture filling entire Hero section */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_95%_90%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-45" />

      {/* Two-Tier Headline matching the screenshot */}
      <div className="relative text-center max-w-4xl px-4 mx-auto mb-6 z-10">
        {/* Platform Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-neutral-800">
            Available on Windows 10 & 11 · Mac Early Access for Technical Testers
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold tracking-[-0.035em] text-neutral-950 mb-6 leading-[1.06]">
          Speak naturally.
          <span className="block text-[#737373] font-bold mt-1 sm:mt-2">Keep it private.</span>
        </h1>

        {/* Subtitle with Inline Badges */}
        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Turn your voice into polished text in any app — processed 100% locally on your device with{" "}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs sm:text-sm font-medium text-neutral-800 align-middle my-1">
            <Eye className="w-3.5 h-3.5 text-neutral-500" />
            <span>No audio uploads</span>
          </span>
          {", "}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs sm:text-sm font-medium text-neutral-800 align-middle my-1">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>Zero cloud transcripts</span>
          </span>
          {", and "}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-xs sm:text-sm font-medium text-neutral-800 align-middle my-1">
            <Lock className="w-3.5 h-3.5 text-neutral-500" />
            <span>100% offline & private</span>
          </span>
          .
        </p>
      </div>

      {/* Two CTA Buttons */}
      <div className="relative flex flex-col sm:flex-row items-center gap-3.5 mb-14 z-10">
        <a
          href="/downloads/HushWrite_1.2.1_x64-setup.exe"
          download="HushWrite_1.2.1_x64-setup.exe"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-sm font-semibold shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Windows: Download Free (v1.2.1)</span>
          <span className="text-xs text-neutral-400 font-normal hidden sm:inline">
            (Code Signed .exe)
          </span>
        </a>
        <a
          href="#download"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200/90 shadow-sm text-sm font-semibold text-neutral-800 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Terminal className="w-4 h-4 text-neutral-500" />
          <span>macOS: Download Early-Access Beta</span>
        </a>
      </div>

      {/* Interactive Desktop Product Simulator */}
      <div className="w-full max-w-5xl px-4 relative z-10">
        {/* Simulator Controls & Wi-Fi Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          {/* Floating Push-To-Talk Island */}
          <div
            onClick={() => startSimulation()}
            className="group rounded-full bg-white/95 backdrop-blur-xl border border-neutral-200/90 hover:border-emerald-500/50 px-4 py-2.5 flex items-center gap-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              {pillState === "idle" && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-mono text-neutral-700 font-medium group-hover:text-neutral-950">
                    HushWrite ready · Click to dictate
                  </span>
                </>
              )}

              {pillState === "listening" && (
                <>
                  <div className="flex items-center gap-0.5 h-4">
                    {waveformBars.slice(0, 6).map((bar, i) => (
                      <span
                        key={i}
                        className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, bar / 3)}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-neutral-950 font-semibold">
                    Listening on-device...
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 font-medium">
                    VAD active
                  </span>
                </>
              )}

              {pillState === "processing" && (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent motion-safe:animate-spin" />
                  <span className="text-xs font-mono text-neutral-700 font-medium">
                    Local GPU inference ({wifiDisabled ? "air-gap mode" : "direct VRAM"})
                  </span>
                </>
              )}

              {pillState === "pasted" && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span className="text-xs font-mono text-neutral-950 font-semibold">
                    Injected in 172ms
                  </span>
                </>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                startSimulation();
              }}
              className="text-xs font-mono font-medium text-white bg-[#141416] hover:bg-neutral-800 px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1"
            >
              {isSimulating ? (
                <span>Speaking...</span>
              ) : (
                <>
                  {detectedOs === "windows" ? (
                    <span>Alt+Space</span>
                  ) : (
                    <>
                      <span className="text-[11px] font-sans font-semibold">⌥</span>
                      <span>Space</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Wi-Fi Simulator Toggle */}
          <div className="flex items-center gap-2 bg-white border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-3.5 py-1.5 rounded-full text-xs font-mono">
            <span className="text-neutral-500">Network simulation:</span>
            <button
              onClick={() => setWifiDisabled(!wifiDisabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full transition-all font-semibold ${
                wifiDisabled
                  ? "bg-amber-50 text-amber-800 border border-amber-200/90 shadow-sm"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/90"
              }`}
            >
              {wifiDisabled ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Airplane mode (0 net)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Application Window Frame */}
        <div className="rounded-2xl bg-white border border-neutral-200/90 overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Window Titlebar */}
          <div className="bg-neutral-50/90 px-4 py-3 border-b border-neutral-200/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block opacity-80" />
              <span className="text-xs font-mono text-neutral-500 ml-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                Target app: <strong className="text-neutral-900">{selectedApp.name}</strong>
              </span>
            </div>

            {/* App Switcher Tabs */}
            <div className="flex items-center gap-1 bg-neutral-200/70 p-1 rounded-xl border border-neutral-200/80">
              {APP_PRESETS.map((preset) => {
                const isSelected = selectedApp.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectApp(preset)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                      isSelected
                        ? "bg-white text-neutral-950 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-neutral-200/60"
                        : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60"
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-60">{preset.icon}</span>
                    <span>{preset.name.split("&")[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor Body */}
          <div className="p-5 sm:p-7 bg-neutral-50/50 flex flex-col gap-4">
            {/* Raw Spoken Input Bar */}
            <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-700 block mb-1">
                  What you said, unedited
                </span>
                <p className="text-xs sm:text-sm text-neutral-700 font-mono">
                  &ldquo;{selectedApp.rawSpoken}&rdquo;
                </p>
              </div>

              <button
                onClick={() => startSimulation()}
                disabled={isSimulating}
                className="self-start sm:self-auto text-xs font-semibold text-neutral-800 hover:text-neutral-950 bg-white hover:bg-neutral-50 border border-neutral-200/90 shadow-sm px-4 py-2 rounded-lg transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSimulating ? "Transcribing..." : "Simulate dictation"}</span>
              </button>
            </div>

            {/* Formatted Output Canvas */}
            <div className="font-mono text-xs sm:text-sm text-neutral-900 leading-relaxed overflow-x-auto whitespace-pre-wrap p-5 rounded-xl bg-white border border-neutral-200/90 min-h-[200px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] relative">
              {typedText}
              {isSimulating && (
                <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 motion-safe:animate-pulse shadow-[0_0_8px_#10b981]" />
              )}
            </div>

            {/* Bottom Status Bar — this is the one place "0 bytes" and latency live */}
            <div className="pt-2 flex items-center justify-between text-xs font-mono text-neutral-500 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  whisper.cpp DirectML / Metal
                </span>
                <span className="text-neutral-400 hidden sm:inline">
                  Model: Whisper Small (190 MB)
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-neutral-600">Latency: ~172ms</span>
                <span className="text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                  Network egress: 0 bytes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
