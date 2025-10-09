import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { fileURLToPath } from "url";

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

const cacheHeaders = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

const PRODUCTION_API = "https://apis.discoverminds.ai";
const STAGING_API = "https://staging-apis.discoverminds.ai";
const LOCAL_API = "http://localhost:8000";

const nextConfig = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
    instrumentationHook: true,
    workerThreads: true,
    cpus: 4,
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "@radix-ui/react-icons",
      "react-icons",
      "react-icons/ai",
      "react-icons/fa",
      "react-icons/fa6",
      "react-icons/fi",
      "react-icons/bs",
      "react-icons/gi",
    ],
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
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
    return [
      { source: "/:path*", headers: advancedHeaders },
      // Cache static assets aggressively
      { source: "/_next/static/:path*", headers: cacheHeaders },
      { source: "/static/:path*", headers: cacheHeaders },
      // Cache CSS with long TTL
      { source: "/:path*.css", headers: cacheHeaders },
      // Cache fonts
      { source: "/fonts/:path*", headers: cacheHeaders },
      // Cache images with moderate TTL
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
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

    // Suppress critical dependency warnings from instrumentation packages
    config.ignoreWarnings = [
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
      {
        message:
          /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ];

    // Fix for caching issues
    config.cache = {
      type: "filesystem",
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.join(process.cwd(), ".next/cache/webpack"),
      name: isServer ? "server" : "client",
      version: "1.0.3", // Change this to invalidate cache
    };

    // Optimize chunking and reduce bundle size (client-side only)
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: "deterministic",
        chunkIds: "deterministic",
        splitChunks: {
          chunks: "async", // Changed from "all" to "async" to reduce initial load
          maxInitialRequests: 25,
          maxAsyncRequests: 30,
          minSize: 20000,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              name(module, chunks, cacheGroupKey) {
                const moduleFileName = module
                  .identifier()
                  .split("/")
                  .reduceRight(item => item);
                const allChunksNames = chunks.map(item => item.name).join("~");
                return `${cacheGroupKey}-${allChunksNames}-${moduleFileName}`;
              },
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            // Only split out truly heavy libraries
            heavy: {
              test: /[\\/]node_modules[\\/](framer-motion|recharts)[\\/]/,
              name: "heavy-libs",
              chunks: "async",
              priority: 10,
            },
          },
        },
        minimize: process.env.NODE_ENV === "production",
      };
    }

    return config;
  },
};

// Only use Sentry in production builds
const config =
  process.env.NODE_ENV === "production"
    ? withSentryConfig(withAnalyzer(nextConfig), {
        org: "discoverminds",
        project: "web-prod",
        silent: false,
        widenClientFileUpload: true,
        tunnelRoute: "/monitoring",
        disableLogger: true,
        automaticVercelMonitors: true,
        telemetry: false, // Disable Sentry telemetry
        sourcemaps: {
          disable: true, // Disable source map uploads
        },
      })
    : withAnalyzer(nextConfig);

export default config;
