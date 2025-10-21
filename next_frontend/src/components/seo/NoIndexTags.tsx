"use client";

import { useEffect } from "react";
import { isProduction } from "@/utils/seo";

/**
 * Component that adds noindex meta tags to prevent search engine indexing in non-production environments
 */
export default function NoIndexTags() {
  useEffect(() => {
    // Only run in non-production environments
    if (!isProduction()) {
      // Create or update the robots meta tag
      let robotsMetaTag = document.querySelector('meta[name="robots"]');
      if (!robotsMetaTag) {
        robotsMetaTag = document.createElement("meta");
        robotsMetaTag.setAttribute("name", "robots");
        document.head.appendChild(robotsMetaTag);
      }
      robotsMetaTag.setAttribute(
        "content",
        "noindex, nofollow, noarchive, nositelinkssearchbox, nosnippet"
      );

      // Create or update the googlebot meta tag
      let googleBotMetaTag = document.querySelector('meta[name="googlebot"]');
      if (!googleBotMetaTag) {
        googleBotMetaTag = document.createElement("meta");
        googleBotMetaTag.setAttribute("name", "googlebot");
        document.head.appendChild(googleBotMetaTag);
      }
      googleBotMetaTag.setAttribute("content", "noindex, nofollow, noimageindex");

      // Create or update meta tags for LLM crawlers
      const llmCrawlers = [
        "GPTBot",
        "ChatGPT-User",
        "Google-Extended",
        "CCBot",
        "anthropic-ai",
        "Claude-Web",
        "Omgilibot",
        "FacebookBot",
      ];

      llmCrawlers.forEach(crawler => {
        let llmMetaTag = document.querySelector(`meta[name="${crawler}"]`);
        if (!llmMetaTag) {
          llmMetaTag = document.createElement("meta");
          llmMetaTag.setAttribute("name", crawler);
          document.head.appendChild(llmMetaTag);
        }
        llmMetaTag.setAttribute("content", "noindex");
      });

      // Add X-Robots-Tag via meta http-equiv (as a fallback)
      let httpEquivRobots = document.querySelector('meta[http-equiv="X-Robots-Tag"]');
      if (!httpEquivRobots) {
        httpEquivRobots = document.createElement("meta");
        httpEquivRobots.setAttribute("http-equiv", "X-Robots-Tag");
        document.head.appendChild(httpEquivRobots);
      }
      httpEquivRobots.setAttribute("content", "noindex, nofollow");
    }
  }, []);

  // This component doesn't render anything
  return null;
}
