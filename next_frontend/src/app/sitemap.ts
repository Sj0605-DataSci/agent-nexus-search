import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Return empty sitemap for non-production environments
  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  const baseUrl = "https://discoverminds.ai";
  const currentDate = new Date().toISOString();

  // Core pages with high priority
  const corePages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily" as const, // Increased from weekly to daily for homepage
      priority: 1,
    },
    {
      url: `${baseUrl}/user-query`,
      lastModified: currentDate,
      changeFrequency: "daily" as const, // Increased from weekly to daily for main feature
      priority: 0.9,
    },
  ];

  // Marketing and informational pages
  const marketingPages = [
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const, // Increased from monthly to weekly
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const, // Increased from monthly to weekly
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/use-cases`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];

  // Blog pages (if they exist)
  const blogPages = [
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    // Add individual blog posts here if available
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
    {
      url: `${baseUrl}/user-auth`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.6, // Slightly increased from 0.5
    },
  ];

  // Combine all routes
  const routes = [...corePages, ...marketingPages, ...blogPages, ...legalPages];

  return routes;
}
