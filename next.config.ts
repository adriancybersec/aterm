import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev resources are blocked unless the browser host is listed. The lab
  // preview is opened on 127.0.0.1 and on the Cursor port proxy.
  allowedDevOrigins: ["127.0.0.1", "localhost", "**.agent.cvm.dev"],
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
