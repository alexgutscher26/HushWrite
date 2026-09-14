import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Architecture & Verifiability Ledger · HushWrite",
  description:
    "Plain-English, auditable proof of how HushWrite processes voice, audio, and transcriptions 100% locally on your machine. Zero cloud streaming, zero accounts, zero telemetry.",
};

const DATA_BOUNDARY_MATRIX = [
  {
    type: "Microphone Audio",
    storage: "Volatile RAM buffer only",
    cloud: "0 Bytes (Never uploaded)",
    retention: "Instantly freed upon decode completion",
    status: "Strictly Local",
  },
  {
    type: "Transcripts & Pasted Text",
    storage: "Local SQLite database or RAM-only (Incognito)",
    cloud: "0 Bytes (Never uploaded)",
    retention: "Configurable auto-purge (0-30 days) or 1-click wipe",
    status: "Strictly Local",
  },
  {
    type: "Custom Dictionary & Snippets",
    storage: "Local SQLite (`dictionary` table)",
    cloud: "0 Bytes (Never uploaded)",
    retention: "Editable & erasable on demand",
    status: "Strictly Local",
  },
  {
    type: "App & Window Context",
    storage: "Ephemeral memory (Target app title/bundle ID)",
    cloud: "0 Bytes (Never uploaded)",
    retention: "Discarded after formatting rule evaluation",
    status: "Strictly Local",
  },
  {
    type: "User Account & Authentication",
    storage: "None (Zero accounts or logins required)",
    cloud: "0 Bytes (No user auth service exists)",
    retention: "N/A — 100% anonymous & local",
    status: "Zero Accounts",
  },
  {
    type: "Telemetry & Usage Analytics",
    storage: "None (Zero tracking SDKs)",
    cloud: "0 Bytes (No analytics beacons or crash telemetry)",
    retention: "N/A — No identifiers generated",
    status: "Zero Telemetry",
  },
  {
    type: "Whisper AI Model Weights",
    storage: "Local Disk (`~/.HushWrite/models`)",
    cloud: "1-time download from HuggingFace/GitHub",
    retention: "Permanent offline storage",
    status: "Air-Gap Ready",
  },
  {
    type: "Software Update Checks",
    storage: "None",
    cloud: "GitHub Releases API (Query only)",
    retention: "Can be disabled via 'Check for updates' toggle",
    status: "User Controlled",
  },
];

const VERIFICATION_QUESTIONS = [
  {
    q: "Is audio ever uploaded? — No, never.",
    a: "No. Never. Spoken voice captured from your microphone is streamed strictly into a temporary volatile RAM buffer on your physical machine and passed directly to the local Whisper inference engine. The millisecond decoding finishes, the raw audio buffer is immediately freed and zeroed. Zero bytes of audio are ever transmitted over the network.",
    badge: "0 Bytes Audio Uploaded",
  },
  {
    q: "Are transcripts ever uploaded? — No, never.",
    a: "No. Never. Transcripts are generated locally on-device and typed directly into your active window at your cursor position via native OS keyboard injection. HushWrite maintains no cloud transcript databases, remote backups, or synchronization servers. Your spoken words never touch an external server.",
    badge: "0 Cloud Transcripts",
  },
  {
    q: "Does the product work with no internet connection?",
    a: "Yes, 100%. Once model weights are stored on your local disk, HushWrite requires zero internet connectivity to operate. You can dictate on airplanes, in air-gapped secure development facilities, or during network outages with zero drop in speed or accuracy.",
    badge: "100% Offline Capable",
  },
  {
    q: "What data leaves the device for licensing, updates, or error reporting?",
    a: "HushWrite is free and open-source under the MIT license, so there are zero licensing calls, seat tracking, or activation checks. For software updates, HushWrite makes an optional, read-only HTTPS query to the official public GitHub Releases API to check version tags (which can be disabled with one click in Settings). Zero crash logs, stack traces, or error diagnostics leave your machine.",
    badge: "Zero Licensing Telemetry",
  },
  {
    q: "Is analytics disabled by default?",
    a: "Yes. Telemetry and analytics are zero by default—HushWrite contains no analytics SDKs, telemetry beacons, Google Analytics, PostHog, or third-party tracking scripts. We do not track words spoken, session frequencies, or what applications you dictate into.",
    badge: "Zero Analytics by Default",
  },
  {
    q: "Can users delete all local history?",
    a: "Yes. Local history is stored in an on-device SQLite database (`HushWrite.db`). You can purge your entire history at any time with a single click in Settings, configure automatic purge retention rules (e.g. wipe after 24 hours, 7 days, or 30 days), or use Incognito Mode so transcripts are never written to disk in the first place.",
    badge: "1-Click Wipe & Incognito",
  },
  {
    q: "What model runs locally?",
    a: "HushWrite runs open-source OpenAI Whisper architecture models compiled into compact, quantized GGML weights (Tiny, Base, Small, Medium, and Large-v3-Turbo) using whisper.cpp. Models execute natively with GPU hardware acceleration via Apple Metal on macOS and DirectML or CUDA on Windows.",
    badge: "Open-Source Whisper Models",
  },
  {
    q: "Can advanced users block the app's network access and retain core functionality?",
    a: "Yes. Advanced users and IT administrators can block HushWrite in Windows Defender Firewall, Little Snitch, LuLu, or pf, or toggle HushWrite's built-in 'Air-Gap Mode' in Settings. Core dictation, custom phonetic dictionary biasing, and context-aware formatting continue to function with 100% reliability.",
    badge: "Firewall & Air-Gap Friendly",
  },
  {
    q: "How does HushWrite differ from cloud dictation tools like Wispr Flow?",
    a: "Cloud tools like Wispr Flow stream your voice over WebSockets to remote GPU clusters, store transcripts in cloud databases, and use cloud LLMs for post-processing. HushWrite executes speech recognition and prompt formatting on your local hardware using whisper.cpp with sub-180ms latency.",
    badge: "Architecture vs Policy",
  },
  {
    q: "How can I independently test and verify these claims?",
    a: "You can monitor HushWrite using standard packet capture tools (Wireshark, Little Snitch, LuLu, or Windows pktmon). When you press the dictation hotkey and speak for 10 minutes, your network monitor will register exactly 0 bytes of egress traffic.",
    badge: "Verifiable by Anyone",
  },
];

const REPRODUCIBLE_TEST_RECIPES = [
  {
    os: "macOS",
    tool: "Little Snitch / LuLu",
    title: "Real-Time Connection Monitoring",
    command: "lulu --monitor /Applications/HushWrite.app",
    description:
      "Launch LuLu or Little Snitch in Alert Mode. Start dictating in any application. Notice that zero connection alert prompts appear during voice capture, decode, or text insertion.",
  },
  {
    os: "Windows",
    tool: "Pktmon / Wireshark",
    title: "Packet Inspection During Dictation",
    command: "pktmon filter add -n HushWrite && pktmon start --etw",
    description:
      "Bind packet monitor to HushWrite.exe. Dictate high-entropy paragraphs. Stop the trace and inspect the capture: zero TCP/UDP packets leave your network interface.",
  },
  {
    os: "Linux / Cross-Platform",
    tool: "NetHogs / tcpdump",
    title: "Process Bandwidth Auditing",
    command: "sudo nethogs -d 1",
    description:
      "Monitor process bandwidth in real-time. Dictate for several minutes continuously. HushWrite will register 0 KB/s upload and 0 KB/s download.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Background ambient glow matching landing page */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-neutral-100 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture matching landing page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none opacity-45" />

      <Navbar />

      <section className="pt-36 pb-20 md:pt-44 md:pb-28 max-w-5xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-[760px] mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-800">
              Verifiable Trust · 100% Local-First
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.035em] text-neutral-950 mb-6 leading-[1.06]">
            Privacy by architecture.
            <span className="block text-[#737373] font-bold mt-1 sm:mt-2">
              Not merely by policy.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-normal">
            Cloud dictation services ask you to trust legal privacy policies while streaming your
            raw voice to remote servers. HushWrite protects your confidential thoughts with physical
            architecture:{" "}
            <strong className="text-neutral-950 font-semibold">
              your voice never leaves your device.
            </strong>
          </p>
        </div>

        {/* Visual Data Flow Diagram */}
        <div className="p-6 sm:p-8 rounded-2xl bg-neutral-50/90 border border-neutral-200/90 shadow-sm mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 block mb-1">
                Data Boundary Flow
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-950">
                How voice flows from microphone to active window
              </h2>
              <p className="text-xs font-mono text-emerald-700 mt-1">
                Microphone → Your Computer (whisper.cpp & RAM) → Any App (Zero network egress)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-mono font-medium text-emerald-800 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Air-Gapped Local Loop
            </div>
          </div>

          {/* Diagram Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-base mb-3 shadow-xs">
                  🎙️
                </div>
                <h3 className="text-sm font-bold text-neutral-950 mb-1">1. Microphone</h3>
                <p className="text-xs text-neutral-600 leading-normal">
                  OS audio stream captured into temporary volatile RAM buffer (CPAL / WASAPI /
                  CoreAudio).
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 mt-4 block">
                RAM only · 0 bytes to disk
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-emerald-500/40 relative flex flex-col justify-between shadow-sm ring-1 ring-emerald-500/20">
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-base mb-3 shadow-xs">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-neutral-950 mb-1">2. Local Whisper Engine</h3>
                <p className="text-xs text-neutral-600 leading-normal">
                  Decoded on-device via{" "}
                  <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono text-[11px]">
                    whisper.cpp
                  </code>{" "}
                  using native Metal (macOS) or DirectML/CUDA (Windows).
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 mt-4 block">
                On-device GPU/NPU
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-base mb-3 shadow-xs">
                  ⚙️
                </div>
                <h3 className="text-sm font-bold text-neutral-950 mb-1">3. Context Rules</h3>
                <p className="text-xs text-neutral-600 leading-normal">
                  Local regex & jargon bias rules format text, strip fillers, and match app context.
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 mt-4 block">
                Instant local transform
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-base mb-3 shadow-xs">
                  📋
                </div>
                <h3 className="text-sm font-bold text-neutral-950 mb-1">4. Direct Insertion</h3>
                <p className="text-xs text-neutral-600 leading-normal">
                  Formatted text is typed directly into your focused cursor via native OS input
                  injection.
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-700 mt-4 block">
                Audio RAM buffer purged
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-700 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓ Net Result:</span>
              <span>Zero audio packets. Zero transcripts in the cloud. No remote logging.</span>
            </div>
            <span className="font-mono text-[11px] text-neutral-500">
              Audit method: Wireshark / LuLu / Little Snitch
            </span>
          </div>
        </div>

        {/* The Data Boundary Matrix */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 shadow-sm mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">
                The HushWrite Local Data Boundary
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600">
                A line-by-line breakdown of every data asset and its storage guarantee.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-neutral-100 border border-neutral-200 text-neutral-700 font-medium">
              Audit Version: 1.0.0
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200/80 bg-neutral-50/80 text-neutral-900 font-mono uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Data Type</th>
                  <th className="py-3 px-4 font-semibold">Storage Location</th>
                  <th className="py-3 px-4 font-semibold">Cloud Transmission</th>
                  <th className="py-3 px-4 font-semibold">Retention & Erasure</th>
                  <th className="py-3 px-4 font-semibold">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/70 text-neutral-700 font-mono">
                {DATA_BOUNDARY_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-950 font-sans">{row.type}</td>
                    <td className="py-3.5 px-4 text-neutral-800">{row.storage}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-bold">{row.cloud}</td>
                    <td className="py-3.5 px-4 text-neutral-600">{row.retention}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8 Plain-Language Questions */}
        <div className="mb-14">
          <div className="text-center max-w-[680px] mx-auto mb-10">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-700 block mb-2">
              Auditable Plain-English FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-950">
              Direct answers. Zero legalese.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VERIFICATION_QUESTIONS.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium">
                      {item.badge}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">#{idx + 1}</span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-950 mb-2">{item.q}</h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reproducible Verification Recipes */}
        <div className="p-6 sm:p-8 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 shadow-sm mb-14">
          <div className="max-w-2xl mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200/90 text-xs font-mono text-neutral-800 mb-3 shadow-xs">
              <span>🔬</span> Reproducible Audit Recipes
            </div>
            <h2 className="text-2xl font-bold text-neutral-950 mb-2">
              Turn &ldquo;Trust Me&rdquo; into &ldquo;Verify Me&rdquo;
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Don&apos;t take our word for it. Here is how security teams, enterprise compliance
              officers, and power users can independently verify HushWrite with network inspection
              tools:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {REPRODUCIBLE_TEST_RECIPES.map((recipe, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-neutral-950">{recipe.tool}</span>
                    <span className="text-[10px] text-neutral-500 font-sans">{recipe.os}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-emerald-800 mb-2">{recipe.title}</h3>
                  <p className="text-neutral-600 text-xs font-sans leading-relaxed mb-4">
                    {recipe.description}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e0e11] border border-neutral-800 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner">
                  <code>{recipe.command}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The Competitive Trust Wedge */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 shadow-sm mb-14">
          <h2 className="text-xl font-bold text-neutral-950 mb-4">
            The Trust Wedge: Local Architecture vs. Cloud Promises
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed font-sans">
            <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <h3 className="text-sm font-bold text-neutral-950 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Cloud Dictation (e.g. Wispr Flow, Cloud APIs)
              </h3>
              <ul className="space-y-2 text-xs text-neutral-600 list-disc list-inside">
                <li>Audio streams across public networks to remote GPU endpoints.</li>
                <li>Requires account creation, authentication tokens, and user IDs.</li>
                <li>
                  Transcripts and voice snippets may be retained for model fine-tuning unless
                  explicitly opted out.
                </li>
                <li>
                  Dependent on third-party uptime, internet bandwidth, and corporate cloud retention
                  policies.
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50/30 border border-emerald-200/80">
              <h3 className="text-sm font-bold text-neutral-950 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                HushWrite On-Device Architecture
              </h3>
              <ul className="space-y-2 text-xs text-neutral-700 list-disc list-inside">
                <li>0 bytes of audio or transcript leave your physical hardware.</li>
                <li>Zero accounts, zero logins, zero marketing or crash telemetry.</li>
                <li>Model weights execute directly in local memory via whisper.cpp.</li>
                <li>
                  Works completely offline on airplanes, air-gapped workstations, and strict
                  enterprise networks.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center p-8 sm:p-12 rounded-3xl bg-[#141416] border border-neutral-800 text-white shadow-xl relative overflow-hidden">
          <div className="w-[500px] h-[250px] bg-gradient-to-r from-emerald-500/10 to-transparent rounded-full blur-3xl absolute -top-24 left-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dictate with total confidence.
            </h2>
            <p className="text-sm text-neutral-400">
              HushWrite is free, open source, and built for people who value privacy as an absolute
              guarantee.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3.5 pt-4 relative z-10">
            <Link
              href="/#download"
              className="px-7 py-3.5 rounded-xl bg-white text-neutral-950 font-semibold hover:bg-neutral-100 transition-all text-sm shadow-md"
            >
              Download HushWrite Free
            </Link>
            <Link
              href="/"
              className="px-6 py-3.5 rounded-xl bg-neutral-800 text-white/90 border border-neutral-700 hover:text-white hover:bg-neutral-700 transition-all text-sm font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
