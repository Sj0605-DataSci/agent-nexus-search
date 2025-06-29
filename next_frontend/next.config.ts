/** @type {import('next').NextConfig} */
const advancedHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
];

const API_HOST = "https://discoverminds-ai.up.railway.app";
const LOCAL_API = "http://localhost:8000";

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: advancedHeaders }];
  },

  async rewrites() {
    return [
      /* ---------- API traffic to Railway ---------- */
      {
        source: "/api/:path*",
        destination: `${API_HOST}/api/:path*`,
      },
      /* ---------- local fallback when Railway is offline ---------- */
      {
        source: "/api/:path*",
        destination: `${LOCAL_API}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
