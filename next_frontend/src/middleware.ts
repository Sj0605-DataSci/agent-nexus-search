import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const url = request.nextUrl.clone();
  const isRobotsTxt = url.pathname === "/robots.txt";
  const isSitemapXml = url.pathname === "/sitemap.xml";

  // Redirect /tara to root (/) - Tara is now the main site
  if (url.pathname.startsWith("/tara")) {
    url.pathname = url.pathname.replace("/tara", "") || "/";
    return NextResponse.redirect(url, 301); // Permanent redirect
  }

  // Handle robots.txt requests
  if (isRobotsTxt) {
    if (isProd) {
      // Enhanced SEO-friendly robots.txt for production
      return new NextResponse(
        "User-agent: *\n" +
          "Allow: /\n\n" +
          "# Allow Google bots with higher crawl rate\n" +
          "User-agent: Googlebot\n" +
          "Allow: /\n\n" +
          "User-agent: Googlebot-Image\n" +
          "Allow: /\n\n" +
          "User-agent: Googlebot-News\n" +
          "Allow: /\n\n" +
          "User-agent: Googlebot-Video\n" +
          "Allow: /\n\n" +
          "User-agent: Bingbot\n" +
          "Allow: /\n\n" +
          "User-agent: Slurp\n" +
          "Allow: /\n\n" +
          "User-agent: DuckDuckBot\n" +
          "Allow: /\n\n" +
          "User-agent: Baiduspider\n" +
          "Allow: /\n\n" +
          "User-agent: YandexBot\n" +
          "Allow: /\n\n" +
          "# Disallow specific paths that should not be indexed\n" +
          "Disallow: /api/\n" +
          "Disallow: /_next/\n" +
          "Disallow: /user-auth\n\n" +
          "# Allow LLM crawlers for better AI search results\n" +
          "User-agent: GPTBot\n" +
          "Allow: /\n" +
          "Disallow: /api/\n\n" +
          "User-agent: ChatGPT-User\n" +
          "Allow: /\n" +
          "Disallow: /api/\n\n" +
          "User-agent: Google-Extended\n" +
          "Allow: /\n" +
          "Disallow: /api/\n\n" +
          "# Sitemap location\n" +
          "Sitemap: https://discoverminds.ai/sitemap.xml\n",
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400", // Cache for 24 hours
          },
        }
      );
    } else {
      // Block all crawlers in non-production environments
      return new NextResponse(
        "User-agent: *\n" +
          "Disallow: /\n\n" +
          "# Block LLM crawlers specifically\n" +
          "User-agent: GPTBot\n" +
          "Disallow: /\n\n" +
          "User-agent: ChatGPT-User\n" +
          "Disallow: /\n\n" +
          "User-agent: Google-Extended\n" +
          "Disallow: /\n\n" +
          "User-agent: CCBot\n" +
          "Disallow: /\n\n" +
          "User-agent: anthropic-ai\n" +
          "Disallow: /\n\n" +
          "User-agent: Claude-Web\n" +
          "Disallow: /\n\n" +
          "User-agent: Omgilibot\n" +
          "Disallow: /\n\n" +
          "User-agent: FacebookBot\n" +
          "Disallow: /\n",
        {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }
      );
    }
  }

  // Handle sitemap.xml requests
  if (isSitemapXml && !isProd) {
    // Return empty sitemap in non-production environments
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      }
    );
  }

  // Add SEO-enhancing headers in production
  if (isProd) {
    const response = NextResponse.next();

    // Add cache control for static assets to improve performance
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico)$/)) {
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable"); // Cache for 1 year
    }

    return response;
  }

  // Add noindex headers to all responses in non-production environments
  if (!isProd) {
    const response = NextResponse.next();

    // Add X-Robots-Tag header to prevent indexing
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nositelinkssearchbox, nosnippet"
    );

    return response;
  }

  return NextResponse.next();
}

// import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// const isProtectedRoute = createRouteMatcher([
//   '/(with-sidebar)(.*)', // Protect all routes under /with-sidebar
// ]);

// export default clerkMiddleware((auth, req) => {
//   if (isProtectedRoute(req)) auth.protect();
// });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)", "/robots.txt", "/sitemap.xml"],
};
