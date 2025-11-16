import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Return empty sitemap for non-production environments
  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  const baseUrl = "https://discoverminds.ai";
  const currentDate = new Date().toISOString();

  // Core pages with high priority - Tara focused
  const corePages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
  ];

  // Marketing and informational pages - Tara specific
  const marketingPages: MetadataRoute.Sitemap = [
    // Tara pages are now at root, no need for /tara prefix
  ];

  // Blog pages (if they exist)
  const blogPages: MetadataRoute.Sitemap = [
    // Add blog posts here when available
  ];

  // Legal and utility pages (lower priority)
  const legalPages = [
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  // Combine all routes
  const routes = [...corePages, ...marketingPages, ...blogPages, ...legalPages];

  return routes;
}
