import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FiBookmark, FiExternalLink } from "react-icons/fi";

export type SourceType = {
  title: string;
  value: string;
  short_url?: string;
};

export const Citation = ({ index, sources }: { index: number; sources: SourceType[] }) => {
  const source = sources.find((_, i) => i === index - 1);

  if (!source) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-pointer text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors">
            <FiBookmark className="w-3 h-3 mr-1" />[{index}]
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md p-3 text-sm">
          <div className="font-medium mb-1">{source.title || "Source Reference"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
            {source.value}
          </div>
          <a
            href={source.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            Visit source <FiExternalLink className="ml-1 w-3 h-3" />
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const ProcessCitationReferences = (content: string, sources: SourceType[]) => {
  if (!sources || sources.length === 0) return <div className="whitespace-pre-wrap">{content}</div>;

  const citationRegex = /\[(\d+)\]/g;
  const parts = content.split(citationRegex);
  if (parts.length <= 1) return <div className="whitespace-pre-wrap">{content}</div>;

  const result: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(<span key={`text-${i}`}>{parts[i]}</span>);
    }
    if (i < parts.length - 1 && !isNaN(parseInt(parts[i + 1]))) {
      const citationIndex = parseInt(parts[i + 1]);
      result.push(<Citation key={`citation-${i}`} index={citationIndex} sources={sources} />);
      i++;
    }
  }
  return <div className="whitespace-pre-wrap">{result}</div>;
};
