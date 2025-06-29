import type { NextConfig } from "next";

const advancedHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
];
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: advancedHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/:path*", destination: "https://discoverminds-ai.up.railway.app/:path*" },
      {
        source: "/:path*",
        destination: "https://discoverminds-ai.up.railway.app/:path*",
      },
      { source: "/:path*", destination: "http://localhost:8000/:path*" },
    ];
  },
};

export default nextConfig;
