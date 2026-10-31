import type { NextConfig } from "next";
import { SITE_URL } from "./src/lib/brand";

/**
 * Browser security headers on every response. No other site may show ours in a frame (clickjacking), files are
 * never guessed as another type, links don't leak full URLs to other sites, and no page may use the camera,
 * microphone or location. A full script policy would need a nonce on every Next.js script, so only
 * `frame-ancestors` is set in the CSP for now.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Vercel sends "*" by default. Only our own site needs to read these responses.
  { key: "Access-Control-Allow-Origin", value: SITE_URL },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Scorecard and Memory pages were renamed Records and Proof. Old links still land in the right place.
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      { source: "/scorecard", destination: "/records", permanent: true },
      { source: "/memory", destination: "/proof", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
