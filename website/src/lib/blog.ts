/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { BLOG_POSTS, BlogPost } from "@/data/blogPosts";

const BLOG_CONTENT_DIR = path.join(process.cwd(), "content", "blog");

/**
 * Parses frontmatter and markdown body from MDX/MD file content.
 */
function parseMdxFile(content: string, slug: string): BlogPost | null {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    // If no frontmatter delimiters, fallback to treating whole file as markdown
    return {
      slug,
      title: slug.replace(/-/g, " "),
      description: "",
      date: new Date().toISOString().split("T")[0],
      readTime: "5 min read",
      category: "Guides",
      keywords: [],
      author: {
        name: "HushWrite Engineering",
        role: "Systems Team",
        avatar: "H",
      },
      shortFormHooks: [],
      keyTakeaways: [],
      content: content.trim(),
    };
  }

  const [, frontmatterRaw, body] = match;
  const metadata: Record<string, any> = {};

  // Simple and robust YAML parser for frontmatter fields
  const lines = frontmatterRaw.split(/\r?\n/);
  let currentKey = "";
  let inList = false;
  let inAuthor = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && inList && currentKey) {
      const val = trimmed
        .slice(2)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!Array.isArray(metadata[currentKey])) {
        metadata[currentKey] = [];
      }
      metadata[currentKey].push(val);
      continue;
    }

    if (inAuthor && line.startsWith("  ")) {
      const authorMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (authorMatch) {
        const [, aKey, aVal] = authorMatch;
        metadata.author = metadata.author || {};
        metadata.author[aKey] = aVal.trim().replace(/^["']|["']$/g, "");
      }
      continue;
    }

    const kvMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, rawVal] = kvMatch;
      currentKey = key;
      inAuthor = key === "author";

      if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
        // Parse inline array like ["a", "b"]
        inList = false;
        metadata[key] = rawVal
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else if (!rawVal) {
        inList = true;
        metadata[key] = [];
      } else {
        inList = false;
        metadata[key] = rawVal.replace(/^["']|["']$/g, "");
      }
    }
  }

  return {
    slug,
    title: metadata.title || slug.replace(/-/g, " "),
    description: metadata.description || "",
    date: metadata.date || new Date().toISOString().split("T")[0],
    updatedDate: metadata.updatedDate,
    readTime: metadata.readTime || "6 min read",
    category: (metadata.category as BlogPost["category"]) || "Guides",
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
    author: {
      name: metadata.author?.name || "Alex Gutscher",
      role: metadata.author?.role || "Lead Systems Engineer",
      avatar: metadata.author?.avatar || "A",
    },
    shortFormHooks: Array.isArray(metadata.shortFormHooks) ? metadata.shortFormHooks : [],
    keyTakeaways: Array.isArray(metadata.keyTakeaways) ? metadata.keyTakeaways : [],
    content: body.trim(),
  };
}

/**
 * Returns all blog posts from both website/content/blog MDX files and static data.
 * MDX files take precedence when slugs collide.
 */
export function getAllBlogPosts(): BlogPost[] {
  const postsMap = new Map<string, BlogPost>();

  // 1. Load from static array first
  for (const post of BLOG_POSTS) {
    postsMap.set(post.slug, post);
  }

  // 2. Load and overlay MDX files from website/content/blog/
  try {
    if (fs.existsSync(BLOG_CONTENT_DIR)) {
      const files = fs.readdirSync(BLOG_CONTENT_DIR);
      for (const file of files) {
        if (file.endsWith(".mdx") || file.endsWith(".md")) {
          const slug = file.replace(/\.mdx?$/, "");
          const filePath = path.join(BLOG_CONTENT_DIR, file);
          const raw = fs.readFileSync(filePath, "utf-8");
          const parsed = parseMdxFile(raw, slug);
          if (parsed) {
            postsMap.set(slug, parsed);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading blog MDX content directory:", err);
  }

  // Sort posts by date descending
  return Array.from(postsMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/**
 * Gets a single post by slug.
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  const mdxPath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_CONTENT_DIR, `${slug}.md`);

  if (fs.existsSync(mdxPath)) {
    return parseMdxFile(fs.readFileSync(mdxPath, "utf-8"), slug) ?? undefined;
  }
  if (fs.existsSync(mdPath)) {
    return parseMdxFile(fs.readFileSync(mdPath, "utf-8"), slug) ?? undefined;
  }

  return BLOG_POSTS.find((p) => p.slug === slug);
}
