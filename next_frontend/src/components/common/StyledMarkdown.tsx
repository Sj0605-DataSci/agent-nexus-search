import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";

import { Source } from "../chats/SourcesList";

interface StyledMarkdownProps {
  content: string;
  className?: string;
  sources?: (Source | string | { sources: Source[] })[] | null | undefined;
  score?: number;
}

interface BaseProps {
  node?: any; // ReactMarkdown node type
}

interface CodeProps extends React.HTMLAttributes<HTMLElement>, BaseProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement>, BaseProps {
  isHeaderRow?: boolean;
}

interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement>, BaseProps {
  ordered?: boolean;
}

// Extract citation numbers from content like [1] or [1,2,3]
const extractCitationNumbers = (text: string): number[] => {
  const matches = text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g);
  const numbers: number[] = [];

  for (const match of matches) {
    const nums = match[1].split(",").map(num => parseInt(num.trim(), 10));
    numbers.push(...nums);
  }

  return numbers;
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

// Find source by index (1-based)
const findSource = (sources: any[], index: number): Source | null => {
  const normalized = sources.flatMap(item => (item?.sources ? item.sources : item ? [item] : []));
  return normalized[index - 1] || null;
};

const StyledMarkdown: React.FC<StyledMarkdownProps> = ({
  content,
  className,
  sources = [],
  score,
}) => {
  let displayScore = score;
  let markdownContent = content;

  if (score === undefined) {
    const scoreMatches = [...content.matchAll(/\*\*Score:\*\*\s*(\d+\/\d+)/gi)];
    if (scoreMatches.length > 0) {
      const scoreText = scoreMatches[0][0];
      const scoreValue = scoreMatches[0][1];
      const [numerator, denominator] = scoreValue.split("/").map(Number);
      displayScore = (numerator / denominator) * 100;
    }
  }

  // Process content for markdown rendering
  let processedContent = markdownContent
    // Format citations like [1, 2, 3] as superscripts
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, numbers) => {
      return `<sup class="text-xs text-blue-600">[${numbers}]</sup>`;
    })
    // Remove extra newlines before list items
    .replace(/(\n\s*\n)(?=\s*\*)/g, "\n");
    

  return (
    <div className={cn("prose max-w-none prose-headings:font-sans relative", className)}>
      {displayScore !== undefined && <div className=" ">{renderScoreBadge(displayScore)}</div>}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-6 pb-2 border-b border-gray-200" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-8 mb-4 text-blue-700" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-xl font-semibold mt-6 mb-3 flex items-center text-blue-600"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold mt-5 mb-2 text-gray-800" {...props} />
          ),

          // Text
          p: ({ node, ...props }) => (
            <p className="my-4 leading-relaxed text-gray-700" {...props} />
          ),

          // Links
          a: ({ node, children, ...props }) => {
            const content = children?.toString() || "";
            const isCitation = /^\[\d+(?:\s*,\s*\d+)*\]$/.test(content);

            if (isCitation && sources) {
              const citationNumbers = extractCitationNumbers(content);
              const citationSources = citationNumbers
                .map(num => findSource(sources, num))
                .filter((source): source is Source => source !== null);

              if (citationSources.length > 0) {
                return (
                  <sup className="relative inline-flex group align-baseline">
                    <span className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-help px-0.5">
                      [{citationNumbers.join(", ")}]
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 max-h-96 overflow-y-auto p-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      {citationSources.map((source, idx) => (
                        <div key={idx} className="mb-3 last:mb-0 pb-2 border-b last:border-b-0">
                          <div className="font-medium text-gray-900 mb-1">
                            Source {citationNumbers[idx]}
                          </div>
                          {source.title && (
                            <div className="text-gray-700 mb-2 text-sm">{source.title}</div>
                          )}
                          <a
                            href={source.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center"
                            onClick={e => e.stopPropagation()}
                          >
                            {new URL(source.value).hostname.replace("www.", "")}
                            <svg
                              className="w-3 h-3 ml-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </sup>
                );
              }
            }

            return (
              <a
                className="text-blue-600 hover:underline hover:text-blue-800 transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },

          // Lists
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc list-inside my-3 space-y-1.5 pl-5 [&>li]:pl-2 [&+ul]:-mt-2"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside my-3 space-y-1.5 pl-5 [&>li]:pl-2" {...props} />
          ),
          li: ({ node, ordered, ...props }: ListItemProps) => (
            <li className={cn("my-1.5 leading-relaxed", ordered ? "pl-1" : "pl-0")} {...props} />
          ),

          code: ({ node, inline, className, children, ...props }: CodeProps) => {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <div className="my-4 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gray-800 text-gray-200 text-xs p-2 font-mono">{match[1]}</div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="!m-0 !rounded-none !bg-gray-900 !p-4 text-sm"
                  showLineNumbers
                  wrapLines
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 text-sm font-mono">
                {children}
              </code>
            );
          },

          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-400 pl-4 py-1 my-4 text-gray-700 italic bg-blue-50 rounded-r"
              {...props}
            />
          ),

          // Tables
          table: ({ node, ...props }) => (
            <div className="my-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200" {...props} />,
          tr: ({ node, isHeaderRow, ...props }: TableRowProps) => (
            <tr
              className={cn(
                isHeaderRow ? "bg-gray-50" : "bg-white hover:bg-gray-50 transition-colors",
                "hover:bg-gray-50"
              )}
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" {...props} />
          ),

          hr: ({ node, ...props }) => <hr className="my-8 border-t border-gray-200" {...props} />,

          img: ({ node, ...props }) => (
            <div className="my-6 rounded-lg overflow-hidden shadow-lg">
              <img
                className="w-full h-auto max-h-[500px] object-contain"
                loading="lazy"
                {...props}
              />
              {props.alt && (
                <div className="text-center text-sm text-gray-500 mt-2">{props.alt}</div>
              )}
            </div>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default StyledMarkdown;
