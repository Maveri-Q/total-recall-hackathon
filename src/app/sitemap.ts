import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

/** The public pages. My calls needs sign-in, so it isn't listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/records", "/proof"].map((path) => ({ url: `${SITE_URL}${path}` }));
}
