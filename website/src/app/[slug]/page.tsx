import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO_PAGES, SeoPageData } from "@/data/seoPages";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(SEO_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGES[slug];
  if (!page) return {};

  return {
    title: `${page.metaTitle} · HushWrite`,
    description: page.metaDescription,
    alternates: {
      canonical: `https://HushWrite.app/${slug}`,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `https://HushWrite.app/${slug}`,
      siteName: "HushWrite",
      type: "website",
    },
  };
}

export default async function HighIntentSeoPage({ params }: Props) {
  const { slug } = await params;
  const page: SeoPageData | undefined = SEO_PAGES[slug];

  if (!page) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HushWrite",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "macOS, Windows",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: page.metaDescription,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* Background glow & subtle texture */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute -top-32 w-[700px] h-[600px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      </div>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Navbar />

      <section className="pt-36 pb-20 md:pt-44 md:pb-28 max-w-4xl mx-auto px-4">
        {/* Header Badge */}
        <div className="text-center max-w-[720px] mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-800">{page.badge}</span>
            <span className="text-xs font-mono text-neutral-500 pl-1 border-l border-neutral-200">
              Auditable Architecture
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-950 mb-6">
            {page.h1}
            <span className="block text-gradient-hero mt-1">{page.h1Highlight}</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-normal mb-8">
            {page.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#download"
              className="text-sm font-semibold text-white bg-[#141416] hover:bg-neutral-800 px-6 py-3 rounded-xl transition-all shadow-md"
            >
              Download HushWrite Free
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-semibold text-neutral-800 hover:text-neutral-950 bg-white hover:bg-neutral-50 border border-neutral-200/90 px-5 py-3 rounded-xl transition-all shadow-xs"
            >
              View Privacy Architecture
            </Link>
          </div>
        </div>

        {/* Regulatory & Compliance Disclaimer (when specified) */}
        {page.disclaimer && (
          <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed mb-12 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-amber-800 mb-2 uppercase text-[11px] tracking-wider font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Compliance & Regulatory Notice</span>
            </div>
            <p className="font-sans text-amber-900/90">{page.disclaimer}</p>
          </div>
        )}

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
          {page.keyStats.map((stat, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/90 text-left shadow-xs hover:shadow-sm hover:border-neutral-300 transition-all"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-semibold block mb-1">
                {stat.label}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-neutral-950 font-mono block mb-1">
                {stat.value}
              </span>
              <span className="text-[11px] text-neutral-500 block leading-tight">
                {stat.detail}
              </span>
            </div>
          ))}
        </div>

        {/* The Core Contrast / Architecture Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-50/80 border border-neutral-200/90 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-mono text-amber-700 uppercase tracking-wider font-semibold block mb-2">
                The Cloud Compromise
              </span>
              <h3 className="text-base font-bold text-neutral-950 mb-2">
                The Problem with Cloud Dictation
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
                {page.coreProblem}
              </p>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-white border border-neutral-200 text-[11px] font-mono text-neutral-500">
              Target Profile: {page.targetAudience}
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50/40 border-2 border-emerald-500/30 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-mono text-emerald-700 uppercase tracking-wider font-semibold block mb-2">
                The Local-First Solution
              </span>
              <h3 className="text-base font-bold text-neutral-950 mb-2">
                Physical Hardware Sovereignty
              </h3>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans">
                {page.architecturalSolution}
              </p>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-white border border-emerald-300 text-[11px] font-mono text-emerald-800 font-medium">
              ✓ 0 bytes outbound · GPU accelerated
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm mb-14">
          <div className="mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-600 font-semibold block mb-1">
              Substantiated Architectural Comparison
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-950">
              Local Architecture vs. Cloud SaaS
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-700 font-mono bg-neutral-50/80">
                  <th className="p-3.5 pr-4 w-1/4">Buyer Concern</th>
                  <th className="p-3.5 px-4 w-2/5 bg-neutral-100/70 text-neutral-950 font-bold border-x border-neutral-200">
                    HushWrite (Local-First)
                  </th>
                  <th className="p-3.5 px-4 w-1/3 text-neutral-500">
                    Competitor / Cloud Architecture
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700 font-mono">
                {page.comparisonTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 pr-4 font-bold text-neutral-950">
                      <div>{row.feature}</div>
                      <div className="text-[10px] text-neutral-500 font-normal font-sans mt-0.5">
                        {row.whyItMatters}
                      </div>
                    </td>
                    <td className="p-3.5 px-4 bg-emerald-50/30 border-x border-neutral-200 text-emerald-800 font-semibold">
                      {row.HushWrite}
                    </td>
                    <td className="p-3.5 px-4 text-neutral-600">{row.cloudComp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing Narrative Callout */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/90 mb-14 shadow-xs">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-600 font-semibold block mb-1">
            Pricing Narrative
          </span>
          <h2 className="text-xl font-bold text-neutral-950 mb-2">
            {page.pricingNarrative.headline}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-sans">
            {page.pricingNarrative.detail}
          </p>
        </div>

        {/* Social Clip & Real Outcome Demonstration */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/90 mb-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block mb-1">
              Real Workflow Outcome ({page.socialProofClip.platform})
            </span>
            <p className="text-sm font-semibold text-neutral-900 italic">
              {page.socialProofClip.quote}
            </p>
          </div>
          <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
            {page.socialProofClip.context}
          </span>
        </div>

        {/* Reproducible Audit Recipe */}
        <div className="p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 mb-14 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">How to Verify This Claim Yourself</h3>
          </div>
          <p className="text-xs text-neutral-300 font-mono leading-relaxed">
            {page.reproducibleAuditStep}
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-neutral-950 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {page.faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs hover:border-neutral-300 transition-all"
              >
                <h3 className="text-sm font-bold text-neutral-950 mb-2">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center p-8 sm:p-12 rounded-3xl bg-[#141416] text-white border border-neutral-800 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 blur-3xl pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to dictate without cloud exposure?
          </h2>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
            Download HushWrite for macOS and Windows. Free, open source, and 100% on-device.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/#download"
              className="text-sm font-semibold text-neutral-950 bg-white hover:bg-neutral-100 px-6 py-2.5 rounded-xl transition-colors shadow-md"
            >
              Download HushWrite
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 px-5 py-2.5 rounded-xl transition-colors"
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
