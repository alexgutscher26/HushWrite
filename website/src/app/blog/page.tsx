import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogIndexClient } from "./BlogIndexClient";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Engineering & Privacy Blog · HushWrite",
  description:
    "Technical breakdowns, latency benchmarks, air-gap audits, and developer workflows for 100% on-device voice dictation.",
  alternates: {
    canonical: "https://hushwrite.app/blog",
  },
  openGraph: {
    title: "Engineering & Privacy Blog · HushWrite",
    description:
      "Technical breakdowns, latency benchmarks, air-gap audits, and developer workflows for 100% on-device voice dictation.",
    url: "https://hushwrite.app/blog",
    siteName: "HushWrite",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HushWrite Engineering & Privacy Blog",
    description:
      "Technical breakdowns, latency benchmarks, and guides for private local-first voice dictation.",
    url: "https://hushwrite.app/blog",
    mainEntity: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      url: `https://hushwrite.app/blog/${post.slug}`,
      author: {
        "@type": "Person",
        name: post.author.name,
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <section className="pt-36 pb-20 md:pt-44 md:pb-28 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-[680px] mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-800">
              Voice Dictation & Privacy Engineering
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-950 mb-6">
            Articles & Technical <span className="text-gradient-hero">Guides</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed font-normal">
            Technical breakdowns, fair comparison benchmarks, and workflows for air-gapped,
            on-device voice dictation on Windows and macOS.
          </p>
        </div>

        {/* Client side category filter and search */}
        <BlogIndexClient initialPosts={posts} />
      </section>

      <Footer />
    </main>
  );
}
