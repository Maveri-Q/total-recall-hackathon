import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0A1712",
    theme_color: "#0A1712",
    icons: [
      { src: "/brand/oddsight-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/oddsight-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
