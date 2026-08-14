import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep Turbopack rooted in this repo (avoids picking up a parent lockfile).
  turbopack: {
    root,
  },
  images: {
    // Google profile photos, shown on the account button after signing in.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
