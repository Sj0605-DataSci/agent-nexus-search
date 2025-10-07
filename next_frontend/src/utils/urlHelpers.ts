/**
 * Converts a search query to a URL-friendly slug format
 * Example: "CTO with experience in AI" -> "CTO-with-experience-in-AI"
 */
export function queryToSlug(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w-]/g, "") // Remove special characters except hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Converts a URL slug back to a readable search query
 * Example: "CTO-with-experience-in-AI" -> "CTO with experience in AI"
 */
export function slugToQuery(slug: string): string {
  return slug
    .replace(/-/g, " ") // Replace hyphens with spaces
    .trim();
}
