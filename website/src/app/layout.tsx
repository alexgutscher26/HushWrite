import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://hushwrite.app"),
  applicationName: "HushWrite",
  title: "HushWrite · Private On-Device AI Voice Dictation | macOS & Windows",
  description:
    "Dictate anywhere. Nothing leaves your device. Fast, polished voice dictation for macOS and Windows that never sends your voice or transcripts off your computer.",
  keywords: [
    "HushWrite",
    "private speech to text",
    "on device voice dictation",
    "whisper ai offline",
    "local speech recognition",
    "air gapped dictation",
    "Tauri 2",
    "Rust",
  ],
  authors: [{ name: "HushWrite Contributors" }],
  category: "productivity",
  openGraph: {
    title: "HushWrite · Speak naturally. Write anywhere. Keep it private.",
    description:
      "Turn your voice into polished text in any app—processed locally on your PC or Mac. No uploaded audio. No cloud transcript history.",
    url: "https://hushwrite.app",
    siteName: "HushWrite",
    images: [
      {
        url: "/128x128@2x.png",
        width: 256,
        height: 256,
        alt: "HushWrite Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HushWrite · Dictate anywhere. Nothing leaves your device.",
    description:
      "Fast, polished on-device AI voice dictation. 100% private by architecture. Free forever & open source.",
    images: ["/128x128@2x.png"],
  },
  icons: {
    icon: "/32x32.png",
    apple: "/128x128@2x.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark scroll-smooth`}>
      <head>
        {/* Preconnect to Google Fonts CDN — eliminates render-blocking font latency (LCP) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preconnect to the download counter Worker so the first fetch is faster */}
        <link rel="preconnect" href="https://hushwrite-download-counter.workinbox69.workers.dev" crossOrigin="anonymous" />
        {/* dns-prefetch fallback for browsers that don't support preconnect */}
        <link rel="dns-prefetch" href="https://hushwrite-download-counter.workinbox69.workers.dev" />
      </head>
      <body className="min-h-screen bg-[#000000] font-sans text-white antialiased selection:bg-white/20 selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1f1f1f] focus:text-white focus:rounded-lg focus:border focus:border-white/20"
        >
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
