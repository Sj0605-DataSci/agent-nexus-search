/**
 * SEO utility functions for consistent URL handling and SEO best practices
 */

/**
 * Base URL for the production site
 */
export const BASE_URL = 'https://discoverminds.ai';

/**
 * Normalizes a URL path by removing trailing slashes (except for homepage)
 * and ensuring consistent formatting
 * 
 * @param path - The URL path to normalize
 * @returns The normalized path
 */
export function normalizePath(path: string): string {
  // Return as-is for homepage
  if (path === '/') return path;
  
  // Remove trailing slash if present
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Creates a canonical URL from a path
 * 
 * @param path - The URL path
 * @returns The full canonical URL
 */
export function getCanonicalUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  return `${BASE_URL}${normalizedPath}`;
}

/**
 * Creates a slug from a string by converting to lowercase,
 * replacing spaces with hyphens, and removing special characters
 * 
 * @param text - The text to convert to a slug
 * @returns The slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Checks if the current environment is production
 * 
 * @returns True if the current environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Generates OpenGraph image URL for a specific page
 * 
 * @param path - The page path
 * @returns The OpenGraph image URL
 */
export function getOgImageUrl(path?: string): string {
  // Default OG image
  const defaultOgImage = `${BASE_URL}/Images/og-image.png`;
  
  // Return default if no path provided
  if (!path) return defaultOgImage;
  
  // Check if there's a specific OG image for this path
  // This could be expanded to include more path-specific images
  if (path === '/about') {
    return `${BASE_URL}/Images/og-about.png`;
  } else if (path === '/pricing') {
    return `${BASE_URL}/Images/og-pricing.png`;
  } else if (path.startsWith('/blog/')) {
    // For blog posts, you might want to generate dynamic OG images
    // This is just a placeholder implementation
    return `${BASE_URL}/Images/og-blog.png`;
  }
  
  // Return default OG image for all other paths
  return defaultOgImage;
}

/**
 * Generates a breadcrumb structure for structured data
 * 
 * @param path - The current path
 * @returns Array of breadcrumb items for structured data
 */
export function generateBreadcrumbs(path: string): Array<{name: string, item: string}> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [];
  
  // Add home
  breadcrumbs.push({
    name: 'Home',
    item: BASE_URL
  });
  
  // Build breadcrumbs for each path segment
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      item: `${BASE_URL}${currentPath}`
    });
  }
  
  return breadcrumbs;
}
