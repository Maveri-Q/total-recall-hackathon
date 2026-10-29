import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Scorecard and Memory pages were renamed Records and Proof. Old links still land in the right place.
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
