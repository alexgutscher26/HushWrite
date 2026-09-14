"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  Copy,
  Download,
  ExternalLink,
  Tag,
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
  Wrench,
  Flame,
  CheckCircle2,
  Code2,
} from "lucide-react";
import { RELEASES, ReleaseNote, ChangelogItem } from "@/data/changelog";

export function ChangelogClient() {
  const [copiedAnchor, setCopiedAnchor] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const copyToClipboard = (text: string, type: "anchor" | "hash", id: string) => {
    navigator.clipboard.writeText(text);
    if (type === "anchor") {
      setCopiedAnchor(id);
      setTimeout(() => setCopiedAnchor(null), 2000);
    } else {
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const getCategoryIcon = (category: ChangelogItem["category"]) => {
    switch (category) {
      case "Added":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
      case "Performance":
        return <Zap className="w-3.5 h-3.5 text-purple-500" />;
      case "Fixed":
        return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
      case "Security":
        return <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />;
      case "Changed":
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  const getCategoryBadgeClass = (category: ChangelogItem["category"]) => {
    switch (category) {
      case "Added":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Performance":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "Fixed":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "Security":
        return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
      case "Changed":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Sidebar Quick-Nav */}
      <aside className="lg:col-span-3">
        <div className="sticky top-28 space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-700 font-semibold mb-3">
              Version Timeline
            </h2>
            <nav className="space-y-1">
              {RELEASES.map((rel) => (
                <a
                  key={rel.version}
                  href={`#${rel.anchor}`}
                  className="flex items-center justify-between px-3 py-2 text-xs rounded-xl text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-all group font-mono"
                >
                  <span className="font-semibold text-neutral-800 group-hover:text-black">
                    v{rel.version}
                  </span>
                  {rel.isLatest ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      Latest
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-700">{rel.date.split(",")[0]}</span>
                  )}
                </a>
              ))}
            </nav>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 text-neutral-600 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span>Release Integrity</span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              All HushWrite builds are code-signed and published with reproducible SHA-256 checksums to GitHub Releases.
            </p>
            <a
              href="https://github.com/alexgutscher26/HushWrite/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-black"
            >
              <span>View GitHub Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Release Feed */}
      <main className="lg:col-span-9 space-y-12">
        {RELEASES.map((release) => {
          const filteredItems =
            selectedCategory === "all"
              ? release.items
              : release.items.filter((item) => item.category.toLowerCase() === selectedCategory);

          return (
            <article
              key={release.version}
              id={release.anchor}
              className="relative scroll-mt-32 p-7 sm:p-9 rounded-3xl bg-white border border-neutral-200/90 shadow-xs hover:border-neutral-300/90 transition-all"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-neutral-950">
                      v{release.version}
                    </span>
                    {release.isLatest && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Latest Stable
                      </span>
                    )}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/changelog#${release.anchor}`,
                          "anchor",
                          release.anchor
                        )
                      }
                      title="Copy link to this release"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      {copiedAnchor === release.anchor ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-800">
                    {release.title}
                  </h3>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end gap-1 font-mono text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{release.date}</span>
                  </div>
                  <a
                    href={release.tagUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    <Tag className="w-3 h-3 text-neutral-400" />
                    <span>Git Tag</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-neutral-600 leading-relaxed font-sans mb-8">
                {release.summary}
              </p>

              {/* Categorized Changes */}
              <div className="space-y-6 mb-8">
                {filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border font-mono ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>
                      <h4 className="text-sm font-bold text-neutral-950 font-sans">{item.title}</h4>
                    </div>

                    {item.description && (
                      <p className="text-xs text-neutral-600 leading-relaxed font-sans pl-1">
                        {item.description}
                      </p>
                    )}

                    {item.details && item.details.length > 0 && (
                      <ul className="space-y-1.5 pl-1">
                        {item.details.map((detail, dIdx) => (
                          <li
                            key={dIdx}
                            className="text-xs text-neutral-700 flex items-start gap-2 leading-relaxed"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Checksum & Download Action Bar */}
              <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {release.sha256 && (
                  <div className="flex items-center gap-2 max-w-full overflow-hidden">
                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      SHA256:
                    </span>
                    <code className="text-[11px] font-mono bg-neutral-100 px-2 py-1 rounded text-neutral-600 truncate max-w-[200px] sm:max-w-[320px]">
                      {release.sha256}
                    </code>
                    <button
                      onClick={() => copyToClipboard(release.sha256!, "hash", release.version)}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                      title="Copy SHA-256 hash"
                    >
                      {copiedHash === release.version ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {release.downloadUrl && (
                    <a
                      href={release.downloadUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#141416] hover:bg-neutral-800 px-4 py-2 rounded-xl transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .exe</span>
                    </a>
                  )}
                  <a
                    href={release.tagUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-white border border-neutral-200/90 px-3.5 py-2 rounded-xl hover:bg-neutral-50 transition-all"
                  >
                    <span>Release Assets</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
