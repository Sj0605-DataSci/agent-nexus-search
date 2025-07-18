import React from "react";
import Link from "next/link";

interface StructuredContentRendererProps {
  content: string;
  darkMode: boolean;
}

export const isStructuredResearchResult = (text: string): boolean => {
  if (!text || text.length < 100) return false;

  // Check for markdown headers with numbers (e.g., ### **1. Product Management**)
  const hasNumberedHeaders = /###\s+\*\*\d+\.\s+[^*]+\*\*/.test(text);

  // Check for patterns that indicate structured research content
  const hasContactSection = text.includes("**Contact Information:**");
  const hasDetailSection = text.includes("**Details about");
  const hasLeadershipSection = text.includes("**Leadership") || text.includes("**Management");
  const hasEducationSection = text.includes("**Education:") || text.includes("**Education**");
  const hasSkillsSection = text.includes("**Skills:") || text.includes("**Skills**");
  const hasExperienceSection =
    text.includes("**Prior Experience:") ||
    text.includes("**Experience:") ||
    text.includes("**Current Role") ||
    text.includes("**Other Individuals");

  // Check for bullet points (both asterisk styles)
  const hasBulletPoints = text.includes("*   ") || text.includes("* ");

  // Check for citations in square brackets
  const hasCitations = /\[\d+(?:,\s*\d+)*\]/.test(text);

  // Check for bold text formatting (section headers or names)
  const hasBoldFormatting = /\*\*[^*]+\*\*/.test(text);

  // Check for lists of people with roles (common pattern in the examples)
  const hasNameWithRole = /\*\*[^:*]+:\*\*|\*\*[^*]+\*\*:|\*\*[^*]+,\s[^*]+\*\*/.test(text);

  // Check for email pattern (including redacted emails)
  const hasEmailPattern =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) ||
    text.includes("[email protected]") ||
    text.includes("email");

  // Check for website URLs
  const hasWebsiteUrls =
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\.[a-zA-Z]{2,}|\/[^\s\]\)]+)/.test(
      text
    ) ||
    text.includes("linkedin.com") ||
    text.includes("facebook.com") ||
    text.includes("medium.com") ||
    text.includes("youtube.com");

  // Check for "Here's what I found" or similar introductory phrases
  const hasIntroPhrase =
    text.includes("Here's what I found") ||
    text.includes("I found information") ||
    text.includes("I've found") ||
    text.includes("has a workforce of") ||
    text.includes("It's great that you're looking into");

  // If it has numbered headers or at least three of these patterns, consider it structured research content
  const patterns = [
    hasContactSection,
    hasDetailSection,
    hasLeadershipSection,
    hasEducationSection,
    hasSkillsSection,
    hasExperienceSection,
    hasBulletPoints,
    hasCitations,
    hasBoldFormatting,
    hasNameWithRole,
    hasEmailPattern,
    hasWebsiteUrls,
    hasIntroPhrase,
  ];

  const matchCount = patterns.filter(Boolean).length;
  return hasNumberedHeaders || matchCount >= 3;
};

const StructuredContentRenderer: React.FC<StructuredContentRendererProps> = ({
  content,
  darkMode,
}) => {
  // Process markdown text to HTML with proper formatting
  const processMarkdown = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Bold text
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // Italic text
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        // Links with markdown format [text](url)
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          (_, text, url) =>
            `<a href="${url}" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`
        )
        // Plain URLs like linkedin.com/in/profile
        .replace(
          /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(\.[a-zA-Z]{2,}|\/[^\s\]\)]+))/g,
          url => {
            // Skip if already part of an HTML tag
            if (url.includes("<a href") || url.includes("</a>")) return url;
            const fullUrl = url.startsWith("http") ? url : `https://${url}`;
            return `<a href="${fullUrl}" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
          }
        )
        // Citations
        .replace(
          /\[(\d+(?:,\s*\d+)*)\]/g,
          match =>
            `<span class="text-xs align-super ${darkMode ? "text-gray-400" : "text-gray-500"}">${match}</span>`
        )
        // Email addresses (including partially redacted ones with @ symbol)
        .replace(
          /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
          email => `<a href="mailto:${email}" class="text-blue-500 hover:underline">${email}</a>`
        )
        // Redacted emails with [email protected] format
        .replace(
          /\[email\s+protected\]/g,
          () => `<span class="text-gray-400 italic">[email protected]</span>`
        )
    );
  };

  // Process bullet points with proper formatting
  const processBulletPoint = (line: string): React.ReactNode => {
    // Extract the content without the bullet point
    const content = line.replace(/^\s*\*\s*/, "").trim();
    const processedContent = processMarkdown(content);

    return (
      <li className="leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: processedContent }} />
    );
  };

  // Process section headers
  const processSectionHeader = (text: string): React.ReactNode => {
    // Remove asterisks and colons from section headers
    const cleanedText = text.replace(/\*\*/g, "").replace(/:\s*$/, "");

    return (
      <h3
        className={`text-lg font-semibold mt-6 mb-3 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
      >
        {cleanedText}
      </h3>
    );
  };

  // Process markdown headers with numbers (e.g., ### **1. Product Management**)
  const processMarkdownHeader = (text: string): React.ReactNode => {
    // Extract the header level (number of #)
    const headerLevel = text.match(/^#+/)?.[0].length || 3;

    // Remove the ### and clean the text
    let cleanedText = text.replace(/^#+\s+/, "");
    // Remove asterisks if present
    cleanedText = cleanedText.replace(/\*\*/g, "");

    const headerClasses = {
      1: `text-2xl font-bold mt-8 mb-4 ${darkMode ? "text-blue-300" : "text-blue-700"}`,
      2: `text-xl font-bold mt-7 mb-3 ${darkMode ? "text-blue-300" : "text-blue-700"}`,
      3: `text-lg font-semibold mt-6 mb-3 ${darkMode ? "text-blue-400" : "text-blue-600"}`,
      4: `text-base font-semibold mt-5 mb-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`,
      5: `text-sm font-semibold mt-4 mb-2 ${darkMode ? "text-blue-500" : "text-blue-500"}`,
      6: `text-xs font-semibold mt-3 mb-1 ${darkMode ? "text-blue-500" : "text-blue-500"}`,
    };

    const className = headerClasses[headerLevel as keyof typeof headerClasses] || headerClasses[3];

    return <h3 className={className}>{cleanedText}</h3>;
  };

  // Process numbered points
  const processNumberedPoint = (line: string, index: number): React.ReactNode => {
    // Extract the content without the number
    const content = line.replace(/^\s*\d+\.\s*/, "").trim();
    const processedContent = processMarkdown(content);

    return (
      <div className="flex mb-3" key={`numbered-${index}`}>
        <div className="mr-2 font-semibold">{index + 1}.</div>
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    );
  };

  // Main render function
  const renderContent = () => {
    if (!content) return null;

    // Split content into lines for processing
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];

    let currentBulletPoints: string[] = [];
    let inNumberedList = false;
    let numberedListItems: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        // If we were collecting bullet points, render them now
        if (currentBulletPoints.length > 0) {
          elements.push(
            <ul className="list-disc pl-6 space-y-1 mb-4" key={`bullet-list-${index}`}>
              {currentBulletPoints.map((item, i) => (
                <React.Fragment key={`bullet-${index}-${i}`}>
                  {processBulletPoint(item)}
                </React.Fragment>
              ))}
            </ul>
          );
          currentBulletPoints = [];
        }

        // If we were collecting numbered list items, render them now
        if (numberedListItems.length > 0) {
          elements.push(
            <div className="mb-4" key={`numbered-list-${index}`}>
              {numberedListItems.map((item, i) => processNumberedPoint(item, i))}
            </div>
          );
          numberedListItems = [];
          inNumberedList = false;
        }

        return;
      }

      // Handle markdown headers (e.g., ### **1. Product Management**)
      if (trimmedLine.startsWith("#")) {
        elements.push(
          <React.Fragment key={`markdown-header-${index}`}>
            {processMarkdownHeader(trimmedLine)}
          </React.Fragment>
        );
        return;
      }

      // Handle section headers (bold text with colon)
      if (
        trimmedLine.startsWith("**") &&
        (trimmedLine.endsWith(":**") || trimmedLine.endsWith("**:"))
      ) {
        elements.push(
          <React.Fragment key={`header-${index}`}>
            {processSectionHeader(trimmedLine)}
          </React.Fragment>
        );
        return;
      }

      // Handle numbered list items (e.g., "1. Text")
      if (/^\d+\.\s/.test(trimmedLine)) {
        inNumberedList = true;
        numberedListItems.push(trimmedLine);
        return;
      }

      // Handle bullet points
      if (trimmedLine.startsWith("*")) {
        currentBulletPoints.push(trimmedLine);
        return;
      }

      // Handle regular paragraphs
      elements.push(
        <p
          className="mb-3"
          key={`para-${index}`}
          dangerouslySetInnerHTML={{ __html: processMarkdown(trimmedLine) }}
        />
      );
    });

    // Handle any remaining bullet points
    if (currentBulletPoints.length > 0) {
      elements.push(
        <ul className="list-disc pl-6 space-y-1 mb-4" key="bullet-list-final">
          {currentBulletPoints.map((item, i) => (
            <React.Fragment key={`bullet-final-${i}`}>{processBulletPoint(item)}</React.Fragment>
          ))}
        </ul>
      );
    }

    // Handle any remaining numbered list items
    if (numberedListItems.length > 0) {
      elements.push(
        <div className="mb-4" key="numbered-list-final">
          {numberedListItems.map((item, i) => processNumberedPoint(item, i))}
        </div>
      );
    }

    return (
      <div className={`structured-content px-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        {elements}
      </div>
    );
  };

  return renderContent();
};

export default StructuredContentRenderer;
