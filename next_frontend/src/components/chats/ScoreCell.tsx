import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScoringItem {
  confidence: number;
  traitTitle: string;
  traitDescription: string;
}

interface ScoreData {
  confidence: number;
  quotes?: string[];
  matching_traits?: string[];
  scoring?: ScoringItem[];
}

interface ScoreCellProps {
  score: ScoreData | null;
  type: "yes" | "maybe" | "no";
}

export const ScoreCell: React.FC<ScoreCellProps> = ({ score, type }) => {
  if (!score) {
    return (
      <div className="px-1 transition duration-100">
        <span className="relative inline-flex h-3 w-3 rounded-full bg-gray-300"></span>
      </div>
    );
  }
  const getColorClasses = (type: string, confidence: number) => {
    if (confidence === 0) {
      return "bg-gray-300 text-gray-600 border-gray-400";
    }

    switch (type) {
      case "yes":
        return "bg-green-400";
      case "maybe":
        return "bg-yellow-200";
      case "no":
        return "bg-red-200";
      default:
        return "bg-gray-400";
    }
  };

  const tooltipContent = (
    <div className="max-w-xs">
      {score.scoring && score.scoring.length > 0 && (
        <div className="space-y-3">
          {score.scoring.map((item, idx) => (
            <div key={idx} className="border-t border-gray-200 first:border-t-0 first:pt-1 pt-2">
              <div
                className="text-sm font-medium text-gray-800"
                dangerouslySetInnerHTML={{ __html: item.traitTitle }}
              />
              {item.traitDescription && (
                <div
                  className="text-xs mt-1 text-gray-600"
                  dangerouslySetInnerHTML={{ __html: item.traitDescription }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="px-1 transition  duration-100 hover:scale-125">
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${getColorClasses(type, score.confidence)}`}
            ></span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-md p-3 border border-gray-200 bg-gray-50 text-sm !p-2"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScoreCell;
