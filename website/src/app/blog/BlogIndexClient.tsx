"use client";

import { useState } from "react";
import Link from "next/link";
import { BlogPost } from "@/data/blogPosts";
import { Search, Sparkles, BookOpen } from "lucide-react";

export function BlogIndexClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = ["All", "Comparisons", "Privacy & Security", "Guides", "Engineering"];

  const filteredPosts = initialPosts.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Category Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-neutral-200">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-neutral-900 text-white font-semibold shadow-xs"
                  : "bg-white text-neutral-600 hover:text-neutral-950 border border-neutral-200/80 hover:bg-neutral-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search articles & keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 shadow-xs"
          />
        </div>
      </div>

      {/* Post Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {filteredPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 hover:shadow-md transition-all flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium">
                  {post.category}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">{post.readTime}</span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-neutral-950 group-hover:text-emerald-700 transition-colors leading-snug mb-2.5">
                {post.title}
              </h2>

              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed line-clamp-3 mb-6">
                {post.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 text-xs text-neutral-500 font-mono">
              <span>{post.date}</span>
              <span className="text-emerald-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Read Article →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/90 mb-16 shadow-xs">
          <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-900 mb-1">No articles found</h3>
          <p className="text-xs text-neutral-500">
            Try adjusting your search query or selecting a different category.
          </p>
        </div>
      )}
    </>
  );
}
