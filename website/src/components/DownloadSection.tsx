/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Check,
  Copy,
  Laptop,
  ShieldCheck,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  Mic,
  Eye,
  Keyboard,
  WifiOff,
  HelpCircle,
  Mail,
  FileText,
} from "lucide-react";

export function DownloadSection() {
  const [detectedOs, setDetectedOs] = useState<"mac" | "windows" | "linux">("mac");
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [showMacInstructions, setShowMacInstructions] = useState(false);
  const [showChecksumModal, setShowChecksumModal] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{
    title: string;
    desc: string;
  } | null>(null);

  const handleDownloadClick = (filename: string, platformName: string) => {
    setDownloadToast({
      title: `Downloading HushWrite for ${platformName}`,
      desc: `Your download (${filename}) has started. Check your Downloads folder.`,
    });
    setTimeout(() => {
      setDownloadToast(null);
    }, 6000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("win")) setDetectedOs("windows");
      else if (ua.includes("mac")) setDetectedOs("mac");
      else setDetectedOs("linux");
    }
  }, []);

  const copyChecksum = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedChecksum(id);
    setTimeout(() => setCopiedChecksum(null), 2500);
  };

  const checksums = [
    {
      file: "HushWrite_1.2.0_x64-setup.exe",
      platform: "Windows 64-bit Installer (.exe) · Code Signed",
      sha256: "086e74bf239d2a86e6d3db5bf70e478a7e7629cc3226b1e51a876dea19589429",
    },
    {
      file: "HushWrite_1.2.0_x64_en-US.msi",
      platform: "Windows MSI Package · Code Signed",
      sha256: "ae4db24f7c9609453bb580b1c7595529f50000f0e970621f0fe2b73ecce1a5ce",
    },
    {
      file: "HushWrite_1.2.0_aarch64.dmg",
      platform: "macOS Apple Silicon (M1/M2/M3/M4)",
      sha256: "95d8c8e26b8e9fe8f5c2a6eb089cb1857d2053d70fe339c635391494016f60d5",
    },
    {
      file: "HushWrite_1.2.0_x64.dmg",
      platform: "macOS Intel 64-bit",
      sha256: "95d8c8e26b8e9fe8f5c2a6eb089cb1857d2053d70fe339c635391494016f60d5",
    },
  ];

  return (
    <section
      id="download"
      className="py-24 md:py-32 relative overflow-hidden bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white"
    >
      {/* Subtle Ambient Light Glow matching Hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-3xl pointer-events-none opacity-80" />

      {/* Subtle Pixel Grid Texture matching Hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-45" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4 transition-transform hover:scale-[1.02] cursor-default">
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-mono font-medium text-neutral-800">
              Download HushWrite v1.2.0
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-neutral-950 mb-4">
            Start Speaking. Stop Typing.
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
            Free and fully functional offline. Official Microsoft Trusted Signed Windows installer (.exe)
            and MSI package with zero friction.
          </p>
        </div>

        {/* Download Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Windows Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 flex flex-col justify-between shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-neutral-900" />
                  <h3 className="text-xl font-bold text-neutral-950">HushWrite for Windows</h3>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold">
                  Verified · Code Signed
                </span>
              </div>
              <span className="text-xs font-mono text-neutral-500 block mb-2">
                Windows 10 / 11 (64-bit)
              </span>
              <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-6">
                Full hardware-accelerated local whisper engine. Digitally signed with Microsoft Trusted Signing for instant, safe installation with zero SmartScreen blocks.
              </p>
            </div>

            <div className="space-y-3">
              {/* Primary CTA: Setup .exe */}
              <a
                href="/downloads/HushWrite_1.2.0_x64-setup.exe"
                download="HushWrite_1.2.0_x64-setup.exe"
                onClick={() => handleDownloadClick("HushWrite_1.2.0_x64-setup.exe", "Windows (.exe)")}
                className="w-full text-center text-xs sm:text-sm font-semibold text-white bg-[#141416] hover:bg-neutral-800 py-3.5 px-4 rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Windows Installer (.exe)</span>
              </a>

              {/* Secondary CTA: MSI Package */}
              <a
                href="/downloads/HushWrite_1.2.0_x64_en-US.msi"
                download="HushWrite_1.2.0_x64_en-US.msi"
                onClick={() => handleDownloadClick("HushWrite_1.2.0_x64_en-US.msi", "Windows MSI")}
                className="w-full text-center text-xs font-medium text-neutral-800 hover:bg-neutral-50 bg-white border border-neutral-200/90 py-2.5 px-3 rounded-lg transition-all shadow-xs hover:scale-[1.01] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>Download Windows MSI Package (.msi)</span>
              </a>

              {/* Windows SmartScreen Reassurance Notice */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/90 text-left">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-neutral-700 leading-relaxed">
                    <p className="font-semibold text-neutral-900">
                      Officially code-signed by Alex Gutscher
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      As a newly released version, Windows SmartScreen may show a one-time prompt while Microsoft establishes reputation for this fresh build. Click <strong className="text-neutral-800 font-medium">&quot;More info&quot;</strong> → <strong className="text-neutral-800 font-medium">&quot;Run anyway&quot;</strong> to install.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* macOS Card - Early Access for Technical Testers */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 flex flex-col justify-between shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-neutral-900" />
                  <h3 className="text-xl font-bold text-neutral-950">HushWrite for macOS</h3>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-bold">
                  Early Access · Technical Testers
                </span>
              </div>
              <span className="text-xs font-mono text-neutral-500 block mb-2">
                Mac Early Access is available for Apple Silicon and Intel Macs.
              </span>
              <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed mb-4">
                The current build is distributed through our official GitHub Releases and requires a
                one-time macOS approval because it is not yet signed and notarized. We are funding
                Apple Developer signing from early customer revenue.
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed mb-6 italic">
                If you prefer a signed installation, use the Windows version today or join the Mac waitlist for the signed release.
              </p>
            </div>

            <div className="space-y-3">
              {/* Separated macOS Buttons */}
              <div className="flex flex-col gap-2.5">
                <a
                  href="/downloads/HushWrite_1.2.0_aarch64.dmg"
                  download="HushWrite_1.2.0_aarch64.dmg"
                  onClick={() => handleDownloadClick("HushWrite_1.2.0_aarch64.dmg", "macOS Apple Silicon")}
                  className="w-full text-center text-xs sm:text-sm font-semibold text-white bg-[#141416] hover:bg-neutral-800 py-3.5 px-4 rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>macOS Apple Silicon: Download unsigned early-access beta</span>
                </a>

                <a
                  href="/downloads/HushWrite_1.2.0_x64.dmg"
                  download="HushWrite_1.2.0_x64.dmg"
                  onClick={() => handleDownloadClick("HushWrite_1.2.0_x64.dmg", "macOS Intel")}
                  className="w-full text-center text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50 bg-white border border-neutral-200/90 py-3 px-4 rounded-xl transition-all shadow-xs hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-500" />
                  <span>macOS Intel: Download unsigned early-access beta</span>
                </a>
              </div>

              {/* Mandatory Security Approval Notice Under Mac Buttons */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-left">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-semibold text-amber-950">
                      Requires one-time macOS security approval. Signed/notarized release is planned.
                    </p>
                    <p className="text-[11px] text-amber-800/90 mt-1">
                      We are funding Apple Developer signing from early customer revenue.
                    </p>
                    <button
                      onClick={() => setShowMacInstructions(!showMacInstructions)}
                      className="text-amber-800 hover:text-amber-950 underline font-medium mt-1.5 inline-flex items-center gap-1"
                    >
                      {showMacInstructions ? "Hide approval steps" : "View quick 2-step approval guide"}
                    </button>
                    {showMacInstructions && (
                      <div className="mt-2.5 p-2.5 bg-white/95 rounded-lg border border-amber-200 text-[11px] text-neutral-700 space-y-1.5 font-sans">
                        <p><strong>Method 1:</strong> Right-click <code>HushWrite.app</code> in your Applications folder → click <strong>Open</strong> → click <strong>Open</strong> in the prompt.</p>
                        <p><strong>Method 2:</strong> Go to <strong>System Settings → Privacy & Security</strong> → scroll down and click <strong>&ldquo;Open Anyway&rdquo;</strong>.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Release Safety Basics & Cryptographic Integrity Section */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-neutral-200/90 shadow-sm mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200/80 text-xs font-mono text-neutral-800 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Release Safety Basics</span>
              </div>
              <h3 className="text-xl font-bold text-neutral-950">
                Transparent, Verifiable Releases
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                Because early-access macOS builds require manual approval, every build is published with strict cryptographic integrity and open provenance.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://github.com/alexgutscher26/HushWrite/tags"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141416] hover:bg-neutral-800 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <span>Official GitHub Releases & Tags</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Official Repository
                </span>
                <a
                  href="https://github.com/alexgutscher26/HushWrite"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1"
                >
                  <span>HushWrite</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium mt-3">
                ✓ Publisher matched to website
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Current Version
                </span>
                <span className="font-mono text-xs font-bold text-neutral-950">
                  v1.2.0 · Stable Release
                </span>
              </div>
              <a
                href="https://github.com/alexgutscher26/HushWrite/releases/tag/v1.2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-neutral-600 hover:text-neutral-950 underline mt-3 inline-block"
              >
                Read release notes →
              </a>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Checksums
                </span>
                <span className="font-mono text-xs font-bold text-neutral-950 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
                  SHA256SUMS.txt
                </span>
              </div>
              <button
                onClick={() => setShowChecksumModal(!showChecksumModal)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium underline mt-3 text-left"
              >
                {showChecksumModal ? "Hide checksum list" : "View SHA-256 hashes →"}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                  Privacy & Support
                </span>
                <div className="flex flex-col gap-1 text-xs">
                  <Link href="/privacy" className="text-neutral-950 font-semibold hover:underline flex items-center gap-1">
                    <FileText className="w-3 h-3 text-neutral-500" />
                    <span>Privacy Policy</span>
                  </Link>
                  <a href="mailto:support@hushwrite.app" className="text-neutral-600 hover:text-neutral-950 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span>support@hushwrite.app</span>
                  </a>
                </div>
              </div>
              <span className="text-[11px] text-neutral-500 mt-2">
                Open communication & support
              </span>
            </div>
          </div>

          {/* Expandable Checksums List */}
          {showChecksumModal && (
            <div className="p-4 rounded-xl bg-neutral-950 text-white font-mono text-xs mb-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <span className="text-emerald-400 font-bold">SHA256SUMS.txt (v1.2.0)</span>
                <span className="text-[10px] text-neutral-400">Verify in terminal: shasum -a 256 &lt;filename&gt;</span>
              </div>
              <div className="space-y-3">
                {checksums.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded bg-neutral-900/80 border border-neutral-800">
                    <div>
                      <span className="text-neutral-300 font-semibold block">{item.file}</span>
                      <span className="text-[10px] text-neutral-500 font-sans">{item.platform}</span>
                      <span className="text-[11px] text-emerald-300/90 break-all select-all block mt-0.5">{item.sha256}</span>
                    </div>
                    <button
                      onClick={() => copyChecksum(item.sha256, item.file)}
                      className="self-start sm:self-auto px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] shrink-0 flex items-center gap-1 transition-colors"
                    >
                      {copiedChecksum === item.file ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expected Mac Permissions Guide */}
        <div className="p-6 sm:p-8 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-sm mb-10">
          <div className="max-w-2xl mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200/80 text-xs font-mono text-neutral-800 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-600" />
              <span>System Permissions Guide</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-950 mb-1">
              Expected macOS Permissions Explained
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              When launching HushWrite for the first time on macOS, the operating system will request the following permissions. Here is why each one is necessary:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-3">
                  <Mic className="w-4 h-4 text-emerald-700" />
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1.5">1. Microphone Access</h4>
                <p className="text-neutral-600 leading-relaxed">
                  Required to capture your voice. Audio streams exclusively into volatile local RAM for whisper.cpp processing and is immediately zeroed upon completion.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold mt-4 block">
                0 bytes uploaded or saved to disk
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-3">
                  <Keyboard className="w-4 h-4 text-blue-700" />
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1.5">2. Accessibility Permissions</h4>
                <p className="text-neutral-600 leading-relaxed">
                  Required for text insertion. Enables HushWrite to inject transcribed text directly at your active cursor position in any app without stealing focus.
                </p>
              </div>
              <span className="text-[11px] font-mono text-neutral-500 font-medium mt-4 block">
                Direct cursor injection in any target window
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200/80 flex items-center justify-center mb-3">
                  <Eye className="w-4 h-4 text-purple-700" />
                </div>
                <h4 className="font-bold text-neutral-950 text-sm mb-1.5">3. Input Monitoring (Global Hotkey)</h4>
                <p className="text-neutral-600 leading-relaxed">
                  Required so HushWrite can listen for your global push-to-talk hotkey (<kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[10px]">⌥ Space</kbd>) while running quietly in the background.
                </p>
              </div>
              <span className="text-[11px] font-mono text-neutral-500 font-medium mt-4 block">
                Global push-to-talk shortcut detection
              </span>
            </div>
          </div>
        </div>

        {/* Network Access & Data Sovereignty Statement */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-emerald-600/30 shadow-sm mb-10 ring-4 ring-emerald-500/5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-mono text-emerald-800 uppercase tracking-wider font-semibold block mb-0.5">
                  Network Access Transparency
                </span>
                <h3 className="text-lg font-bold text-neutral-950">
                  What Network Access is Optional vs. Zero
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                HushWrite has <strong>no required user account</strong>, <strong>no telemetry by default</strong>, and <strong>zero audio or transcript egress</strong>. The only optional network activities are:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-neutral-600">
                <li className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">1.</span>
                  <span><strong>Model Weight Downloads:</strong> 1-time download of Whisper GGML model files from official Hugging Face / GitHub mirrors.</span>
                </li>
                <li className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">2.</span>
                  <span><strong>Update Checks:</strong> Read-only query to the GitHub Releases API (can be toggled off in Settings).</span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 font-medium flex items-center gap-2">
                <span className="text-base">💡</span>
                <span><em>For a local-first dictation app, this transparency matters as much as the binary itself.</em></span>
              </div>
            </div>
          </div>
        </div>

        {/* System Requirements & Verification Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3">
            <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-neutral-900 block mb-0.5">Disk Space</span>
              <span className="text-neutral-500">190 MB for default Whisper Small model</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3">
            <Cpu className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-neutral-900 block mb-0.5">GPU Acceleration</span>
              <span className="text-neutral-500">Apple Silicon Metal & Windows DirectML</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-neutral-900 block mb-0.5">Privacy Verified</span>
              <span className="text-neutral-500">Zero network egress · 100% On-Device</span>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Download Toast Notification */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-neutral-950 text-white border border-neutral-800 shadow-2xl flex items-start gap-3 transition-all duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-sm text-neutral-100 mb-0.5">
              {downloadToast.title}
            </p>
            <p className="text-neutral-300 leading-relaxed">
              {downloadToast.desc}
            </p>
          </div>
          <button
            onClick={() => setDownloadToast(null)}
            className="text-neutral-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

