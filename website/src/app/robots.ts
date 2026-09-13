import type { MetadataRoute } from "next";

const BASE_URL = "https://hushwrite.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/pricing/success",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
