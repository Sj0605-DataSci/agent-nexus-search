import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  User,
  Quote,
  Users,
  Grid,
  List,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CustomAvatar from "@/components/ui/CustomAvatar";
import { EnhancedProfile, ProfileSortOption } from "@/types/enhancedProfile";

interface EnhancedProfileTableProps {
  profiles: EnhancedProfile[];
  title?: string;
  onProfileSelect?: (profile: EnhancedProfile) => void;
}

interface SortConfig {
  key: ProfileSortOption;
  direction: "asc" | "desc";
}

// CSV download function for enhanced profiles
const downloadEnhancedProfilesCSV = (profiles: EnhancedProfile[]) => {
  if (!profiles?.length) {
    console.warn("No profiles to export");
    return;
  }

  const csvHeaders = [
    "Name",
    "Company",
    "Position",
    "Location",
    "LinkedIn URL",
    "Yes Score",
    "Yes Confidence",
    "Yes Traits",
    "Maybe Score",
    "Maybe Confidence",
    "Maybe Traits",
    "No Score",
    "No Confidence",
    "No Traits",
    "All Quotes",
    "Mutual Connection",
  ];

  const csvRows = profiles.map(profile => {
    const fullName = `${profile.first_name} ${profile.last_name}`.trim();

    return [
      fullName,
      profile.company || "",
      profile.position || "",
      profile.location || "",
      profile.linkedin_url || "",
      profile.yes_score.confidence.toString(),
      profile.yes_score.confidence.toString(),
      profile.yes_score.matching_traits.join("; "),
      profile.maybe_score.confidence.toString(),
      profile.maybe_score.confidence.toString(),
      profile.maybe_score.matching_traits.join("; "),
      profile.no_score.confidence.toString(),
      profile.no_score.confidence.toString(),
      profile.no_score.matching_traits.join("; "),
      profile.all_quotes.join("; "),
      profile.mutual_connection || "",
    ].map(field => {
      // Escape CSV fields that contain commas, quotes, or newlines
      const escapedField = String(field).replace(/"/g, '""');
      if (escapedField.includes(",") || escapedField.includes('"') || escapedField.includes("\n")) {
        return `"${escapedField}"`;
      }
      return escapedField;
    });
  });

  const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\r\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `enhanced_profiles_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ScoreCell: React.FC<{
  score: { confidence: number; quotes: string[]; matching_traits: string[] };
  type: "yes" | "maybe" | "no";
}> = ({ score, type }) => {
  const getColorClasses = (type: string, confidence: number) => {
    if (confidence === 0) {
      return "bg-gray-300 text-gray-600 border-gray-400";
    }

    switch (type) {
      case "yes":
        return "bg-blue-600 text-white border-blue-700"; // Dark blue
      case "maybe":
        return "bg-blue-300 text-blue-900 border-blue-400"; // Light blue
      case "no":
        return "bg-gray-400 text-gray-800 border-gray-500"; // Grey
      default:
        return "bg-gray-300 text-gray-600 border-gray-400";
    }
  };

  const tooltipContent = (
    <div className="p-2 max-w-xs">
      <div className="font-semibold mb-1">
        {type.charAt(0).toUpperCase() + type.slice(1)} Score: {score.confidence}%
      </div>
      {score.matching_traits.length > 0 && (
        <div className="mb-2">
          <div className="text-sm font-medium">Matching Traits:</div>
          <ul className="text-xs list-disc list-inside">
            {score.matching_traits.map((trait, idx) => (
              <li key={idx}>{trait}</li>
            ))}
          </ul>
        </div>
      )}
      {score.quotes.length > 0 && (
        <div>
          <div className="text-sm font-medium">Supporting Quotes:</div>
          <div className="text-xs">
            {score.quotes.slice(0, 2).map((quote, idx) => (
              <div key={idx} className="italic">
                "{quote}"
              </div>
            ))}
            {score.quotes.length > 2 && (
              <div className="text-gray-400">+{score.quotes.length - 2} more</div>
            )}
          </div>
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
            inline-flex items-center justify-center w-8 h-8 rounded-full border-2 
            font-semibold text-sm transition-all duration-200 hover:scale-110 cursor-pointer
            ${getColorClasses(type, score.confidence)}
          `}
          >
            {score.confidence}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white border-gray-700">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const EnhancedProfileTable: React.FC<EnhancedProfileTableProps> = ({
  profiles,
  title = "Enhanced Profile Results",
  onProfileSelect,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "relevance",
    direction: "desc",
  });
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const requestSort = useCallback((key: ProfileSortOption) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortConfig.key) {
        case "name":
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case "company":
          aValue = a.company?.toLowerCase() || "";
          bValue = b.company?.toLowerCase() || "";
          break;
        case "yes_score":
          aValue = a.yes_score.confidence;
          bValue = b.yes_score.confidence;
          break;
        case "maybe_score":
          aValue = a.maybe_score.confidence;
          bValue = b.maybe_score.confidence;
          break;
        case "no_score":
          aValue = a.no_score.confidence;
          bValue = b.no_score.confidence;
          break;
        case "relevance":
        default:
          // Sort by highest confidence score across all categories
          aValue = Math.max(
            a.yes_score.confidence,
            a.maybe_score.confidence,
            a.no_score.confidence
          );
          bValue = Math.max(
            b.yes_score.confidence,
            b.maybe_score.confidence,
            b.no_score.confidence
          );
          break;
      }

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [profiles, sortConfig]);

  const handleProfileClick = useCallback(
    (profile: EnhancedProfile) => {
      onProfileSelect?.(profile);
    },
    [onProfileSelect]
  );

  return (
    <div className="w-full">
      {/* Header with controls */}
      <div className="mb-4 px-3 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{profiles.length} profiles found</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "cards"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Card View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Download CSV Button */}
          <Button
            onClick={() => downloadEnhancedProfilesCSV(profiles)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-md px-3 border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    <button
                      onClick={() => requestSort("name")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Profile
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    <div className="flex items-center gap-1">
                      <Quote className="w-4 h-4" />
                      Quotes
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" />
                      Mutual
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedProfiles.map((profile, index) => {
                  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

                  return (
                    <tr
                      key={profile.id || index}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleProfileClick(profile)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {profile.profile_photo_url ? (
                            <img
                              src={profile.profile_photo_url}
                              alt={fullName}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={e => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                target.nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <CustomAvatar
                            name={fullName}
                            size="md"
                            className={`w-10 h-10 ${profile.profile_photo_url ? "hidden" : ""}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{fullName}</div>
                            <div className="text-sm text-gray-500 truncate">{profile.headline}</div>
                            {profile.company && (
                              <div className="text-xs text-gray-400 truncate">
                                {profile.position && `${profile.position} at `}
                                {profile.company}
                              </div>
                            )}
                            {profile.location && (
                              <div className="text-xs text-gray-400 truncate">
                                {profile.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <ScoreCell score={profile.yes_score} type="yes" />
                          <ScoreCell score={profile.maybe_score} type="maybe" />
                          <ScoreCell score={profile.no_score} type="no" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {profile.all_quotes.length > 0 ? (
                            <div className="space-y-1">
                              {profile.all_quotes.slice(0, 2).map((quote, idx) => (
                                <div key={idx} className="truncate italic">
                                  "{quote}"
                                </div>
                              ))}
                              {profile.all_quotes.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{profile.all_quotes.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No quotes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {profile.mutual_connection ? (
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                            M
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {profile.linkedin_url && (
                            <a
                              href={profile.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View - Reuse existing EnhancedProfileList component */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProfiles.map((profile, index) => (
            <div
              key={profile.id || index}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6"
            >
              {/* This would be the EnhancedProfileCard component content */}
              <div className="text-center">
                <div className="font-medium text-gray-900">
                  {profile.first_name} {profile.last_name}
                </div>
                <div className="text-sm text-gray-500 mt-1">{profile.headline}</div>
                <div className="flex flex-col items-center gap-1 mt-3">
                  <ScoreCell score={profile.yes_score} type="yes" />
                  <ScoreCell score={profile.maybe_score} type="maybe" />
                  <ScoreCell score={profile.no_score} type="no" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileTable;
