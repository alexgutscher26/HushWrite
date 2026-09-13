import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/data/seoPages";
import { BLOG_POSTS } from "@/data/blogPosts";

const BASE_URL = "https://hushwrite.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString();

  // 1. Core Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/developers`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/creators`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/content-creators`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/invite`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // 2. High-Intent Programmatic SEO Landing Pages
  const seoRoutes: MetadataRoute.Sitemap = Object.keys(SEO_PAGES).map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // 3. Blog Articles
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date).toISOString() : currentDate,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticRoutes, ...seoRoutes, ...blogRoutes];
}
