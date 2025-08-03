/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "next-pwa";

const advancedHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Service-Worker-Allowed", value: "/" },
];

const PRODUCTION_API = "https://discoverminds-ai.up.railway.app";
const STAGING_API = "https://staging-apis.discoverminds.ai";
const LOCAL_API = "http://localhost:8000";

const nextConfig = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wznveojncixcptajnjom.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/public-files/**',
      },
      {
        protocol: 'https',
        hostname: 'mtxrobrwanikajymnkaf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/public-files/**',
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: advancedHeaders }];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${PRODUCTION_API}/api/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${LOCAL_API}/api/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${STAGING_API}/api/:path*`,
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
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
