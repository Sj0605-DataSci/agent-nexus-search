import React, { useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  ExternalLink,
  Quote,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { EnhancedProfile, ProfileScore } from "@/types/enhancedProfile";

interface EnhancedProfileCardProps {
  profile: EnhancedProfile;
  onViewDetails?: () => void;
}

const ScoreCircle: React.FC<{
  score: ProfileScore;
  type: "yes" | "maybe" | "no";
  size?: "sm" | "md" | "lg";
}> = ({ score, type, size = "md" }) => {
  const getColorClasses = (type: string, confidence: number) => {
    if (confidence === 0) {
      return {
        bg: "bg-gray-300",
        border: "border-gray-400",
        text: "text-gray-600",
      };
    }

    switch (type) {
      case "yes":
        return {
          bg: "bg-blue-600",
          border: "border-blue-700",
          text: "text-white",
        };
      case "maybe":
        return {
          bg: "bg-blue-300",
          border: "border-blue-400",
          text: "text-blue-900",
        };
      case "no":
        return {
          bg: "bg-gray-400",
          border: "border-gray-500",
          text: "text-gray-800",
        };
      default:
        return {
          bg: "bg-gray-300",
          border: "border-gray-400",
          text: "text-gray-600",
        };
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const colors = getColorClasses(type, score.confidence);

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-semibold mb-2 capitalize">
        {type} Score: {score.confidence}%
      </div>
      {score.matching_traits.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium mb-1">Matching Traits:</div>
          <ul className="text-xs space-y-1">
            {score.matching_traits.map((trait, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {score.quotes.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Supporting Quotes:</div>
          <ul className="text-xs space-y-1">
            {score.quotes.slice(0, 3).map((quote, idx) => (
              <li key={idx} className="italic">
                "{quote}"
              </li>
            ))}
            {score.quotes.length > 3 && (
              <li className="text-gray-400">+{score.quotes.length - 3} more...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              ${sizeClasses[size]} 
              ${colors.bg} 
              ${colors.border} 
              ${colors.text}
              border-2 rounded-full flex items-center justify-center 
              font-semibold cursor-help transition-all duration-200 
              hover:scale-110 hover:shadow-md
            `}
          >
            {score.confidence}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const EnhancedProfileCard: React.FC<EnhancedProfileCardProps> = ({ profile, onViewDetails }) => {
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const displayQuotes = showAllQuotes ? profile.all_quotes : profile.all_quotes.slice(0, 2);

  // Get the highest confidence score to determine primary match
  const scores = [
    { type: "yes" as const, score: profile.yes_score },
    { type: "maybe" as const, score: profile.maybe_score },
    { type: "no" as const, score: profile.no_score },
  ];
  const primaryMatch = scores.reduce((prev, current) =>
    current.score.confidence > prev.score.confidence ? current : prev
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      {/* Header with photo and basic info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              onError={e => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          {/* Fallback initials avatar */}
          <div
            className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-gray-200 ${profile.profile_photo_url ? "hidden" : ""}`}
          >
            {profile.first_name?.[0]}
            {profile.last_name?.[0]}
          </div>
        </div>

        {/* Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{fullName}</h3>
              <p className="text-sm text-gray-600 mb-1">{profile.headline}</p>

              {/* Company and Position */}
              {(profile.company || profile.position) && (
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <BriefcaseBusiness className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {profile.position && profile.company
                      ? `${profile.position} at ${profile.company}`
                      : profile.position || profile.company}
                  </span>
                </div>
              )}

              {/* Location */}
              {profile.location && (
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{profile.location}</span>
                </div>
              )}
            </div>

            {/* LinkedIn Link */}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="View LinkedIn Profile"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Score Circles */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-gray-700">Scores:</span>
        <div className="flex flex-col items-center gap-1">
          <ScoreCircle score={profile.yes_score} type="yes" />
          <ScoreCircle score={profile.maybe_score} type="maybe" />
          <ScoreCircle score={profile.no_score} type="no" />
        </div>

        {/* Primary match indicator */}
        <div className="ml-auto">
          <span
            className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${
              primaryMatch.type === "yes"
                ? "bg-blue-100 text-blue-800"
                : primaryMatch.type === "maybe"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-100 text-gray-700"
            }
          `}
          >
            {primaryMatch.score.confidence}% {primaryMatch.type}
          </span>
        </div>
      </div>

      {/* Quotes Section */}
      {profile.all_quotes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Quote className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Profile Quotes ({profile.all_quotes.length})
            </span>
          </div>
          <div className="space-y-2">
            {displayQuotes.map((quote, idx) => (
              <div key={idx} className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-gray-700 italic">"{quote}"</p>
              </div>
            ))}
          </div>
          {profile.all_quotes.length > 2 && (
            <button
              onClick={() => setShowAllQuotes(!showAllQuotes)}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showAllQuotes ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {profile.all_quotes.length - 2} More
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Mutual Connections */}
      {profile.mutual_connection && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Mutual Connection</span>
          </div>
          <div className="bg-blue-50 rounded-md p-3">
            <p className="text-sm text-blue-800">Connected through: {profile.mutual_connection}</p>
          </div>
        </div>
      )}

      {/* Action Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          View Full Details
        </button>
      )}
    </div>
  );
};

export default EnhancedProfileCard;
