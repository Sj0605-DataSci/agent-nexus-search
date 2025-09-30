import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globby } from 'globby';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dynamic Sitemap Generator
 * 
 * This script generates a comprehensive sitemap.xml file for better SEO.
 * It automatically discovers pages in the Next.js app and adds them to the sitemap.
 */
async function generateSitemap() {
  const prettierConfig = await prettier.resolveConfig('./.prettierrc.json');
  
  // Base URL for the site
  const baseUrl = 'https://discoverminds.ai';
  
  // Get current date for lastmod
  const date = new Date().toISOString().split('T')[0];
  
  // Define static pages with custom priorities and change frequencies
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/pricing', priority: '0.8', changefreq: 'monthly' },
    { url: '/terms', priority: '0.5', changefreq: 'monthly' },
    { url: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
    { url: '/user-query', priority: '0.9', changefreq: 'weekly' },
    { url: '/user-auth', priority: '0.7', changefreq: 'monthly' },
    { url: '/connections', priority: '0.8', changefreq: 'weekly' },
    { url: '/agents', priority: '0.8', changefreq: 'weekly' },
    { url: '/research-person', priority: '0.9', changefreq: 'weekly' },
  ];
  
  // Dynamically discover pages from the app directory
  const pagesDirectory = path.join(process.cwd(), 'src/app');
  const pageFiles = await globby([
    // Include these patterns
    `${pagesDirectory}/**/page.tsx`,
    `${pagesDirectory}/**/page.jsx`,
    
    // Exclude these patterns
    `!${pagesDirectory}/**/_*/**`, // Exclude private folders starting with _
    `!${pagesDirectory}/**/api/**`, // Exclude API routes
    `!${pagesDirectory}/**/auth/**`, // Exclude auth routes
    `!${pagesDirectory}/**/chat/**`, // Exclude dynamic chat routes
    `!${pagesDirectory}/**/(with-sidebar)/**`, // Exclude layout folders
  ]);
  
  // Process discovered pages
  const dynamicPages = await Promise.all(
    pageFiles.map(async (file) => {
      // Get relative path from pages directory
      const relPath = file.replace(`${pagesDirectory}`, '').replace(/\/page\.(tsx|jsx)$/, '');
      
      // Skip if this is already in staticPages
      if (staticPages.some(page => page.url === relPath)) {
        return null;
      }
      
      // Skip if this contains dynamic route params like [id]
      if (relPath.includes('[') && relPath.includes(']')) {
        return null;
      }
      
      // Default values for dynamic pages
      return {
        url: relPath || '/',
        priority: '0.7',
        changefreq: 'monthly',
      };
    })
  );
  
  // Filter out null values and combine static and dynamic pages
  const allPages = [
    ...staticPages,
    ...dynamicPages.filter(Boolean),
  ];
  
  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages.map(({ url, priority, changefreq }) => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
  `).join('')}
</urlset>`;
  
  // Format with prettier
  const formatted = prettier.format(sitemap, {
    ...prettierConfig,
    parser: 'html',
  });
  
  // Write to public directory
  const sitemapPath = path.join(process.cwd(), 'public/sitemap.xml');
  fs.writeFileSync(sitemapPath, formatted);
  
  console.log(`✅ Sitemap generated at ${sitemapPath}`);
  
  // Also generate robots.txt based on environment
  const isProduction = process.env.NODE_ENV === 'production' && 
    process.env.NEXT_PUBLIC_APP_ENV !== 'staging' &&
    process.env.VERCEL_ENV !== 'preview';
  
  const robotsTxtPath = path.join(process.cwd(), 'public/robots.txt');
  
  if (isProduction) {
    const productionRobots = `# Production robots.txt

# Allow all crawlers for production
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /_error
Disallow: /404
Disallow: /500

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml`;
    
    fs.writeFileSync(robotsTxtPath, productionRobots);
    console.log(`✅ Production robots.txt generated`);
  } else {
    const stagingRobots = `# Staging/Development robots.txt
# This environment is not intended for search engine indexing

# Block all crawlers
User-agent: *
Disallow: /`;
    
    fs.writeFileSync(robotsTxtPath, stagingRobots);
    console.log(`🛡️ Staging/development robots.txt generated - All crawlers blocked`);
  }
}

// Run the generator
generateSitemap().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
