import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server listens on every interface. The preview is opened at
  // 127.0.0.1, which Next otherwise treats as a cross-origin dev request and
  // blocks. That block stops the dev channel and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
