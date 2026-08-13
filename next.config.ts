import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist (via pdf-to-img) resolves its worker/cmap/standard-font assets
  // by relative path from its own location in node_modules at runtime — that
  // breaks if Turbopack/webpack bundles it into a route's server chunk, which
  // moves the code without those sibling asset files. Keeping it external
  // makes Node `require`/`import` it directly from node_modules instead,
  // where its relative paths still resolve.
  serverExternalPackages: ["pdfjs-dist", "pdf-to-img"],
};

export default nextConfig;
