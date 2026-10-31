import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

/** Every page is public; the API routes aren't pages, so search engines can skip them. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${SITE_URL}/sitemap.xml` };
}
