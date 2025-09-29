import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_APP_ENV !== "staging" &&
  process.env.VERCEL_ENV !== "preview";

const robotsTxtPath = join(process.cwd(), "public/robots.txt");

if (isProduction) {
  // Production - allow crawling
  const productionContent = `# Production robots.txt

# Allow all crawlers for production
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /_error
Disallow: /404
Disallow: /500

# Sitemap location
Sitemap: https://www.discoverminds.ai/sitemap.xml`;

  writeFileSync(robotsTxtPath, productionContent);
  console.log("✅ Generated production robots.txt");
} else {
  // Staging/development - block all crawlers
  const stagingContent = `# Staging/Development robots.txt
# This environment is not intended for search engine indexing

# Block all crawlers
User-agent: *
Disallow: /`;

  writeFileSync(robotsTxtPath, stagingContent);
  console.log("🛡️  Generated staging/development robots.txt - All crawlers blocked");
}
