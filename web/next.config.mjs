import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// The app is fully self-contained in this directory. Pin Turbopack's root here
// so it stops ambiguously inferring it from the repo-root lockfile (the root
// package-lock.json legitimately backs scripts/ and isn't the app root).
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
