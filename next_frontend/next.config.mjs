import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules equivalent for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const advancedHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Service-Worker-Allowed", value: "/" },
];

const PRODUCTION_API = "https://apis.discoverminds.ai";
const STAGING_API = "https://staging-apis.discoverminds.ai";
const LOCAL_API = "http://localhost:8000";

const nextConfig = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
    instrumentationHook: true,
    workerThreads: true,
    cpus: 4,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wznveojncixcptajnjom.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/public-files/**",
      },
      {
        protocol: "https",
        hostname: "mtxrobrwanikajymnkaf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/public-files/**",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: advancedHeaders }];
  },

  async rewrites() {
    const apiDestination =
      process.env.NODE_ENV === "production"
        ? `${PRODUCTION_API}/api/:path*`
        : process.env.NODE_ENV === "development"
          ? `${STAGING_API}/api/:path*`
          : `${LOCAL_API}/api/:path*`;

    return [
      {
        source: "/api/:path*",
        destination: apiDestination,
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

  skipTrailingSlashRedirect: true,

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("canvas");
    }
    
    // Fix for caching issues
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.join(process.cwd(), '.next/cache/webpack'),
      name: isServer ? 'server' : 'client',
      version: '1.0.1', // Change this to invalidate cache
    };
    
    // Optimize chunking
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    };
    
    return config;
  },
};

// Only use Sentry in production builds
const config = process.env.NODE_ENV === "production" 
  ? withSentryConfig(withAnalyzer(nextConfig), {
      org: "discoverminds",
      project: "web-prod",
      silent: false,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : withAnalyzer(nextConfig);

export default config;
