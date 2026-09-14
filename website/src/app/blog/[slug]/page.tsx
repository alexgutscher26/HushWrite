/* eslint-disable @next/next/no-html-link-for-pages */
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/blog";
import { BlogPost } from "@/data/blogPosts";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: "Article Not Found · HushWrite" };

  return {
    title: `${post.title} · HushWrite Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `https://hushwrite.app/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} · HushWrite Blog`,
      description: post.description,
      type: "article",
      url: `https://hushwrite.app/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author.name],
      siteName: "HushWrite",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updatedDate || post.date,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "HushWrite",
      url: "https://hushwrite.app",
      logo: {
        "@type": "ImageObject",
        url: "https://hushwrite.app/favicon.ico",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://hushwrite.app/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
  };

  // Helper to parse inline markdown: links [text](url), **bold**, `code`, and *italic*
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const [, linkText, href] = match;
          const isInternal = href.startsWith("/") || href.startsWith("#");
          if (isInternal) {
            return (
              <Link
                key={i}
                href={href}
                className="text-emerald-700 font-medium underline underline-offset-4 hover:text-emerald-950 transition-colors"
              >
                {linkText}
              </Link>
            );
          }
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-medium underline underline-offset-4 hover:text-emerald-950 transition-colors"
            >
              {linkText}
            </a>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={i} className="text-neutral-950 font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded-md bg-neutral-100 text-emerald-800 font-mono text-[12px] border border-neutral-200/80"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2 && !part.startsWith("**")) {
        return (
          <em key={i} className="italic text-neutral-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Helper to format markdown headers and blocks into clean HTML structure
  const renderFormattedContent = (rawText: string) => {
    const lines = rawText.trim().split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (keyId: string | number) => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.map((r) =>
        r
          .split("|")
          .filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1)
          .map((c) => c.trim()),
      );
      tableBuffer = [];

      if (rows.length < 2) return;
      const headers = rows[0];
      const dataRows = rows.slice(2);

      elements.push(
        <div
          key={`table-${keyId}`}
          className="my-6 overflow-x-auto border border-neutral-200/90 rounded-2xl shadow-xs bg-white"
        >
          <table className="w-full text-left text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-950 font-mono bg-neutral-50/80">
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="p-3.5 px-4 font-bold">
                    {formatInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700 font-mono">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-neutral-50/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`p-3.5 px-4 ${cIdx === 0 ? "font-bold text-neutral-950" : ""}`}
                    >
                      {formatInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    };

    lines.forEach((line, idx) => {
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 text-neutral-200 text-xs font-mono overflow-x-auto mb-6 shadow-inner border border-neutral-800"
            >
              <code>{codeBuffer.join("\n")}</code>
            </pre>,
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          flushTable(idx);
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        tableBuffer.push(line.trim());
        return;
      } else {
        flushTable(idx);
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={idx}
            className="text-lg sm:text-xl font-bold text-neutral-950 mt-10 mb-4 tracking-tight"
          >
            {formatInlineMarkdown(line.replace("### ", ""))}
          </h3>,
        );
      } else if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={idx} className="text-sm sm:text-base font-bold text-neutral-900 mt-6 mb-2">
            {formatInlineMarkdown(line.replace("#### ", ""))}
          </h4>,
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={idx}
            className="text-xl sm:text-2xl font-bold text-neutral-950 mt-12 mb-5 tracking-tight border-b border-neutral-100 pb-3"
          >
            {formatInlineMarkdown(line.replace("## ", ""))}
          </h2>,
        );
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote
            key={idx}
            className="p-4 sm:p-5 my-6 rounded-2xl bg-emerald-50/40 border-l-4 border-emerald-500 text-xs sm:text-sm text-neutral-800 leading-relaxed font-sans shadow-xs"
          >
            {formatInlineMarkdown(line.replace("> ", ""))}
          </blockquote>,
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li
            key={idx}
            className="text-xs sm:text-sm text-neutral-700 leading-relaxed flex items-start gap-2.5 mb-2 ml-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
            <span>{formatInlineMarkdown(line.replace("- ", ""))}</span>
          </li>,
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li
            key={idx}
            className="text-xs sm:text-sm text-neutral-700 leading-relaxed flex items-start gap-2 mb-2 ml-2"
          >
            <span className="font-mono text-emerald-700 font-semibold text-xs">
              {line.match(/^\d+\./)?.[0]}
            </span>
            <span>{formatInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</span>
          </li>,
        );
      } else if (line.trim() === "---") {
        elements.push(<hr key={idx} className="my-8 border-neutral-200/80" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={idx} className="text-xs sm:text-sm text-neutral-700 leading-relaxed mb-4">
            {formatInlineMarkdown(line)}
          </p>,
        );
      }
    });

    flushTable("final-eof");

    return elements;
  };

  const allPosts = getAllBlogPosts();
  const otherPosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <main className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Background glow & subtle texture */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute -top-32 w-[700px] h-[600px] bg-gradient-to-b from-neutral-100/90 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />
      </div>

      <Navbar />

      <article className="pt-36 pb-20 md:pt-44 md:pb-28 max-w-3xl mx-auto px-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-8">
          <Link href="/" className="hover:text-neutral-950 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-neutral-950 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-emerald-700 font-semibold truncate max-w-[240px]">
            {post.category}
          </span>
        </nav>

        {/* Article Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium">
              {post.category}
            </span>
            <span className="text-xs font-mono text-neutral-500">
              {post.readTime} · Published {post.date}
            </span>
            {post.updatedDate && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Updated {post.updatedDate}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-950 mb-6 leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed">{post.description}</p>

          {/* Author Badge */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-neutral-200">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-800">
              {post.author.avatar}
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-950 block">
                {post.author.name}
              </span>
              <span className="text-[11px] font-mono text-neutral-500">{post.author.role}</span>
            </div>
          </div>
        </header>

        {/* Key Takeaways Box */}
        {post.keyTakeaways.length > 0 && (
          <div className="p-6 sm:p-7 rounded-3xl bg-neutral-50/80 border border-neutral-200/90 mb-12 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Key Strategic Takeaways
            </div>
            <ul className="space-y-2">
              {post.keyTakeaways.map((takeaway, idx) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-neutral-700 leading-relaxed flex items-start gap-2"
                >
                  <span className="text-emerald-700 font-mono font-semibold">0{idx + 1}.</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rendered Content */}
        <div className="prose prose-neutral max-w-none text-neutral-800">
          {renderFormattedContent(post.content)}
        </div>

        {/* Short-Form Video & Content Hooks Box */}
        {post.shortFormHooks.length > 0 && (
          <div className="my-12 p-6 sm:p-7 rounded-3xl bg-neutral-50/80 border border-neutral-200/90 shadow-xs">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold block mb-2">
              Short-Form Content Angle
            </span>
            <div className="space-y-2">
              {post.shortFormHooks.map((hook, hIdx) => (
                <div
                  key={hIdx}
                  className="p-3.5 rounded-2xl bg-white text-xs font-mono text-neutral-800 border border-neutral-200/80 shadow-2xs"
                >
                  &quot;{hook}&quot;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mid-Article Download Banner */}
        <div className="my-14 p-8 sm:p-12 rounded-3xl bg-[#141416] text-white border border-neutral-800 shadow-xl text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 blur-3xl pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Experience 100% On-Device Voice Typing
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6 leading-relaxed">
            HushWrite runs locally on your Mac or Windows PC. No cloud transcription, no audio uploads,
            zero subscriptions.
          </p>
          <a
            href="/#download"
            className="inline-block text-sm font-semibold text-neutral-950 bg-white hover:bg-neutral-100 px-6 py-2.5 rounded-xl transition-colors shadow-md"
          >
            Download HushWrite (Free Forever)
          </a>
        </div>

        {/* Related Articles */}
        <div className="pt-12 border-t border-neutral-200">
          <h3 className="text-base font-bold text-neutral-950 mb-6">Related Guides & Analyses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherPosts.map((other: BlogPost) => (
              <Link
                key={other.slug}
                href={`/blog/${other.slug}`}
                className="p-5 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 hover:shadow-md transition-all block shadow-xs"
              >
                <span className="text-[10px] font-mono text-emerald-700 block mb-1 font-semibold">
                  {other.category}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-950 line-clamp-2 mb-2">
                  {other.title}
                </h4>
                <span className="text-[11px] font-mono text-neutral-400">{other.readTime}</span>
              </Link>
            ))}
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
