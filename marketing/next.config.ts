import type { NextConfig } from "next";

// Static export — the landing has no server needs, so it builds to plain HTML
// in `out/` and can be hosted anywhere (Vercel, Netlify, GitHub Pages, S3…).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
