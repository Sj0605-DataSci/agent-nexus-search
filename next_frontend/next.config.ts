import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/:path*"
        : "https://discoverminds-ai.up.railway.app/:path*";

    return [
      {
        source: "/api/:path*",
        destination: apiTarget,
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
