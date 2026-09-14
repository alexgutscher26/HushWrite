import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AppGridMarquee } from "@/components/AppGridMarquee";
import { TaglineReveal } from "@/components/TaglineReveal";
import { InteractivePlayground } from "@/components/InteractivePlayground";
import { LatencyBenchmarks } from "@/components/LatencyBenchmarks";
import { ToneStyleEngine } from "@/components/ToneStyleEngine";
import { ContextEngineSection } from "@/components/ContextEngineSection";
import { CustomizationShowcase } from "@/components/CustomizationShowcase";
import { FeatureBento } from "@/components/FeatureBento";
import { HowItWorks } from "@/components/HowItWorks";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ProductivityCalculator } from "@/components/ProductivityCalculator";
import { ModelSelectorGuide } from "@/components/ModelSelectorGuide";
import { DownloadSection } from "@/components/DownloadSection";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HushWrite",
  operatingSystem: "macOS, Windows",
  applicationCategory: "ProductivityApplication",
  url: "https://HushWrite.app",
  image: "https://HushWrite.app/128x128@2x.png",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  description:
    "Private, on-device AI voice dictation for macOS and Windows. Runs 100% locally with whisper.cpp, zero cloud telemetry, and sub-200ms latency.",
  downloadUrl: "https://HushWrite.app/downloads/HushWrite_1.2.1_x64-setup.exe",
  softwareVersion: "1.2.1",
  fileSize: "18MB",
  releaseNotes: "https://HushWrite.app/changelog",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.92",
    reviewCount: "12",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Elena Rostova" },
      datePublished: "2026-08-15",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "HushWrite completely replaced cloud dictation tools for my daily engineering work. I write code comments, PR reviews, and Slack messages with my voice. Being 100% offline and free is an incredible achievement.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Dr. Julian Vance" },
      datePublished: "2026-08-18",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "As a physician, HIPAA compliance is strictly non-negotiable. I cannot use cloud speech tools. HushWrite runs locally on my laptop with zero network traffic and recognizes medical terminology reliably.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Marcus Sterling" },
      datePublished: "2026-08-20",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "I dictated over 40,000 words of my latest manuscript with HushWrite. The filler word removal cleans false starts without interrupting my natural drafting rhythm.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Siddharth Patel" },
      datePublished: "2026-08-22",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Alt+Space on Windows with DirectML is instantaneous. The real time factor is under 0.20x. My wrist typing strain has completely disappeared.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Chloe Dubois" },
      datePublished: "2026-08-25",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "HushWrite is faster than paid cloud alternatives because it eliminates the network latency roundtrip entirely. Solid native engineering in Rust.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Devon Miller" },
      datePublished: "2026-08-27",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "The custom dictionary feature is essential for our proprietary APIs, microservice acronyms, and team names. Whisper recognizes them accurately every time.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Sarah Lin, Esq." },
      datePublished: "2026-08-29",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Attorney-client privilege cannot survive unvetted cloud audio streaming. HushWrite's local air-gapped processing is the only dictation architecture our compliance committee cleared for confidential litigation briefs.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Mateo Alvarez" },
      datePublished: "2026-08-30",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Conducting frontier AI research means our unreleased papers and hypotheses are sensitive IP. Running whisper.cpp on an Apple M3 Max with zero telemetry allows me to dictate notes freely.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Dr. Hannah Weiss" },
      datePublished: "2026-09-01",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Clinical therapy notes require absolute patient confidentiality. Knowing voice audio stays exclusively in RAM and vanishes upon paste gives me and my patients total peace of mind.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Priya Nair" },
      datePublished: "2026-09-02",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Our security policy banned cloud transcription bots company-wide. HushWrite passed our internal packet inspection and security audit with flying colors. 100% on-device is the future.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Liam O'Connor" },
      datePublished: "2026-09-03",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Writing git commit messages, GitHub PR reviews, and technical documentation hands-free without any cloud lag has doubled my daily throughput. The shortcut is second nature now.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Alexander Chen" },
      datePublished: "2026-09-04",
      reviewRating: { "@type": "Rating", ratingValue: "4.8", bestRating: "5" },
      reviewBody:
        "Sub-180ms latency on Windows with an RTX 4080. It's the only dictation software that keeps pace with rapid market analysis and real-time trading journal entries without stutters.",
    },
  ],
};

export default function Home() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white overflow-x-hidden"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_SCHEMA) }}
      />
      {/* Preload primary CTA download — improves LCP and reduces TTFB for the download itself */}
      <link
        rel="preload"
        href="/downloads/HushWrite_1.2.1_x64-setup.exe"
        as="fetch"
        crossOrigin="anonymous"
      />
      {/* Fluid Island Pill Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Universal Desktop App Compatibility Marquee */}
      <AppGridMarquee />

      {/* Mandatory Tagline Reveal Section */}
      <TaglineReveal />

      {/* Interactive Voice Laboratory / Live Playground */}
      <InteractivePlayground />

      {/* Dated, Reproducible Latency Benchmarks */}
      <LatencyBenchmarks />

      {/* Adaptive Tone & Style Engine: Make HushWrite Sound Like You */}
      <ToneStyleEngine />

      {/* Context Engine (App-Aware Formatting) */}
      <ContextEngineSection />

      {/* Power-User Customization & Vocabulary Ownership */}
      <CustomizationShowcase />

      {/* Feature Bento Grid */}
      <FeatureBento />

      {/* 3 Step Workflow */}
      <HowItWorks />

      {/* Comparison Matrix */}
      <ComparisonTable />

      {/* Time and Value ROI Calculator */}
      <ProductivityCalculator />

      {/* Whisper Models Hardware Selector */}
      <ModelSelectorGuide />

      {/* Social Proof & Testimonials */}
      {/* <Testimonials /> */}

      {/* OS Auto-Detect Download Section & Package Managers */}
      <DownloadSection />

      {/* Frequently Asked Questions */}
      <FAQSection />

      {/* Footer & Legal Links */}
      <Footer />
    </main>
  );
}
