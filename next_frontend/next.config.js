/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
import withPWA from 'next-pwa';

const advancedHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Service-Worker-Allowed", value: "/" },
];

const API_HOST = "https://discoverminds-ai.up.railway.app";
const LOCAL_API = "http://localhost:8000";

const nextConfig = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
  },
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    sw: '/sw.js',
  },
  async headers() {
    return [{ source: "/:path*", headers: advancedHeaders }];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_HOST}/api/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${LOCAL_API}/api/:path*`,
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
      {
        source: "/monitoring",
        destination: "https://browser.sentry-cdn.com",
      },
    ];
  },

  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Suppress specific build warnings
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "discoverminds",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
