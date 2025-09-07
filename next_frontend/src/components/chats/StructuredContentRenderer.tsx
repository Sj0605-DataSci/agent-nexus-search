import React from "react";
import Link from "next/link";

interface StructuredContentRendererProps {
  content: string;
}

export const isStructuredResearchResult = (text: string): boolean => {
  if (!text || text.length < 100) return false;

  const hasNumberedHeaders = /###\s+\*\*\d+\.\s+[^*]+\*\*/.test(text);

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

  const hasBulletPoints = text.includes("*   ") || text.includes("* ");

  const hasCitations = /\[\d+(?:,\s*\d+)*\]/.test(text);

  const hasBoldFormatting = /\*\*[^*]+\*\*/.test(text);

  const hasNameWithRole = /\*\*[^:*]+:\*\*|\*\*[^*]+\*\*:|\*\*[^*]+,\s[^*]+\*\*/.test(text);

  const hasEmailPattern =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text) ||
    text.includes("[email protected]") ||
    text.includes("email");

  const hasWebsiteUrls =
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\.[a-zA-Z]{2,}|\/[^\s\]\)]+)/.test(
      text
    ) ||
    text.includes("linkedin.com") ||
    text.includes("facebook.com") ||
    text.includes("medium.com") ||
    text.includes("youtube.com");

  const hasIntroPhrase =
    text.includes("Here's what I found") ||
    text.includes("I found information") ||
    text.includes("I've found") ||
    text.includes("has a workforce of") ||
    text.includes("It's great that you're looking into");

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

const StructuredContentRenderer: React.FC<StructuredContentRendererProps> = ({ content }) => {
  const extractAndProcessScore = (text: string): { content: string; score?: number } => {
    const scoreMatch = text.match(/\*\*Score:\*\*\s*(\d+\/\d+)/i);
    if (!scoreMatch) return { content: text };

    const scoreText = scoreMatch[0];
    const scoreValue = scoreMatch[1];
    const [numerator, denominator] = scoreValue.split("/")?.map(Number);
    const percentage = (numerator / denominator) * 100;

    return {
      content: text.replace(scoreText, "").trim(),
      score: percentage,
    };
  };

  const processMarkdown = (text: string): string => {
    if (!text) return "";

    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_, text, url) =>
          `<a href="${url}" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`
      )
      .replace(
        /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(\.[a-zA-Z]{2,}|\/[^\s\]\)]+))/g,
        url => {
          if (url.includes("<a href") || url.includes("</a>")) return url;
          const fullUrl = url.startsWith("http") ? url : `https://${url}`;
          return `<a href="${fullUrl}" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
      )
      .replace(
        /\[(\d+(?:,\s*\d+)*)\]/g,
        match => `<span class="text-xs align-super text-gray-500">${match}</span>`
      )
      .replace(
        /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
        email => `<a href="mailto:${email}" class="text-blue-500 hover:underline">${email}</a>`
      )
      .replace(
        /\[email\s+protected\]/g,
        () => `<span class="text-gray-400 italic">[email protected]</span>`
      );
  };

  const processBulletPoint = (line: string): React.ReactNode => {
    const content = line.replace(/^\s*\*\s*/, "").trim();
    const processedContent = processMarkdown(content);

    return (
      <li className="leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: processedContent }} />
    );
  };

  const processSectionHeader = (text: string): React.ReactNode => {
    const cleanedText = text.replace(/\*\*/g, "").replace(/:\s*$/, "");

    if (/^\d+\.\s+\*\*[^*]+\*\*/.test(text)) {
      return (
        <h2 className="text-xl font-bold mt-8 mb-4 pb-2 border-b border-gray-200 text-blue-700">
          {cleanedText}
        </h2>
      );
    }
    return (
      <h3 className="text-lg font-semibold mt-6 mb-3 flex items-center text-blue-600">
        <span className="flex-1">{cleanedText}</span>
      </h3>
    );
  };

  const processMarkdownHeader = (text: string): React.ReactNode => {
    const headerLevel = text.match(/^#+/)?.[0].length || 3;

    let cleanedText = text.replace(/^#+\s+/, "");
    cleanedText = cleanedText.replace(/\*\*/g, "");

    const headerClasses = {
      1: "text-2xl font-bold mt-8 mb-4 text-blue-700",
      2: "text-xl font-bold mt-7 mb-3 text-blue-700",
      3: "text-lg font-semibold mt-6 mb-3 text-blue-600",
      4: "text-base font-semibold mt-5 mb-2 text-blue-600",
      5: "text-sm font-semibold mt-4 mb-2 text-blue-500",
      6: "text-xs font-semibold mt-3 mb-1 text-blue-500",
    };

    const className = headerClasses[headerLevel as keyof typeof headerClasses] || headerClasses[3];

    return <h3 className={className}>{cleanedText}</h3>;
  };

  const processNumberedPoint = (line: string, index: number): React.ReactNode => {
    const content = line.replace(/^\s*\d+\.\s*/, "").trim();
    const processedContent = processMarkdown(content);

    return (
      <div className="flex mb-3" key={`numbered-${index}`}>
        <div className="mr-2 font-semibold">{index + 1}.</div>
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    );
  };

  const renderScoreBadge = (score: number) => {
    if (isNaN(score)) return null;

    const hue = Math.round(score * 1.2);
    const bgColor = `hsl(${hue}, 90%, 95%)`;
    const borderColor = `hsl(${hue}, 90%, 40%)`;
    const textColor = `hsl(${hue}, 90%, 25%)`;

    const getScoreLabel = (score: number) => {
      if (score >= 90) return "Excellent";
      if (score >= 75) return "Very Good";
      if (score >= 50) return "Good";
      if (score >= 25) return "Fair";
      return "Poor";
    };

    return (
      <div
        className="group relative inline-flex items-center ml-3 px-3 py-1.5 rounded-full border border-gray-200 transition-all duration-300 hover:scale-105"
        style={{
          background: bgColor,
          borderColor: borderColor,
        }}
      >
        <span className="relative z-10 text-xs font-semibold" style={{ color: textColor }}>
          <span className="mr-1.5 opacity-80">{getScoreLabel(score)}</span>
          <span
            className="inline-flex items-center justify-center w-6 h-5 rounded-md font-mono"
            style={{
              background: `hsla(${hue}, 90%, 90%, 0.7)`,
              color: textColor,
            }}
          >
            {Math.round(score)}
          </span>
        </span>
      </div>
    );
  };

  const renderContent = () => {
    if (!content) return null;

    const { content: processedContent, score } = extractAndProcessScore(content);

    const lines = processedContent.split("\n").filter(line => line.trim() !== "*");
    const elements: React.ReactNode[] = [];

    if (score !== undefined) {
      elements.push(
        <div key="score-badge" className="mb-4">
          {renderScoreBadge(score)}
        </div>
      );
    }

    let currentBulletPoints: { line: string; level: number }[] = [];

    const flushBulletPoints = () => {
      if (currentBulletPoints.length > 0) {
        const renderNestedList = (
          items: typeof currentBulletPoints,
          level: number
        ): React.ReactNode => {
          const listItems: React.ReactNode[] = [];
          let i = 0;
          while (i < items.length) {
            const currentItem = items[i];
            let nestedItems: typeof currentBulletPoints = [];
            let j = i + 1;
            while (j < items.length && items[j].level > level) {
              nestedItems.push(items[j]);
              j++;
            }
            listItems.push(
              <React.Fragment key={`${level}-${i}`}>
                {processBulletPoint(currentItem.line)}
                {nestedItems.length > 0 && renderNestedList(nestedItems, level + 1)}
              </React.Fragment>
            );
            i = j;
          }
          return <ul className="list-disc pl-6 space-y-1 mb-4">{listItems}</ul>;
        };

        elements.push(renderNestedList(currentBulletPoints, 0));
        currentBulletPoints = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const bulletMatch = line.match(/^(\s*)\*/);

      if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const level = Math.floor(indent / 4);
        currentBulletPoints.push({ line: trimmedLine, level });
        return;
      }

      flushBulletPoints();

      if (!trimmedLine) return;

      if (trimmedLine.startsWith("#")) {
        elements.push(
          <React.Fragment key={`markdown-header-${index}`}>
            {processMarkdownHeader(trimmedLine)}
          </React.Fragment>
        );
        return;
      }

      if (
        trimmedLine.startsWith("**") &&
        (trimmedLine.endsWith(":**") ||
          trimmedLine.endsWith("**:") ||
          /\*\*\d+\.\s+[^*]+\*\*/.test(trimmedLine))
      ) {
        const isProfileHeader = /^\*\*\d+\.\s+[^*]+\*\*/.test(trimmedLine);

        elements.push(
          <div
            key={`header-container-${index}`}
            className={`${isProfileHeader ? "mt-8 first:mt-0" : ""}`}
          >
            {processSectionHeader(trimmedLine)}
            {isProfileHeader && (
              <div className="mt-2 mb-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            )}
          </div>
        );
        return;
      }

      elements.push(
        <p
          className="mb-3"
          key={`para-${index}`}
          dangerouslySetInnerHTML={{ __html: processMarkdown(trimmedLine) }}
        />
      );
    });

    flushBulletPoints();

    return (
      <div className="structured-content px-1 text-gray-700">
        {elements.length > 0 ? (
          elements
        ) : (
          <div className="p-4 rounded-lg bg-gray-50 text-center">
            <p className="text-gray-500">No content available</p>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
};

export default StructuredContentRenderer;
