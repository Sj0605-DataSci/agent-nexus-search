import React, { useState } from "react";
import { Filter, SortAsc, SortDesc, Grid, List } from "lucide-react";
import EnhancedProfileCard from "./EnhancedProfileCard";
import {
  EnhancedProfile,
  ProfileSortOption,
  ProfileViewMode,
  ProfileMatchType,
} from "@/types/enhancedProfile";

interface EnhancedProfileListProps {
  profiles: EnhancedProfile[];
  title?: string;
  onProfileSelect?: (profile: EnhancedProfile) => void;
}

const EnhancedProfileList: React.FC<EnhancedProfileListProps> = ({
  profiles,
  title = "Search Results",
  onProfileSelect,
}) => {
  const [sortBy, setSortBy] = useState<ProfileSortOption>("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ProfileViewMode>("grid");
  const [filterBy, setFilterBy] = useState<"all" | ProfileMatchType>("all");

  // Calculate primary score for each profile
  const getProfilePrimaryScore = (profile: EnhancedProfile) => {
    const scores = [
      { type: "yes", confidence: profile.yes_score.confidence },
      { type: "maybe", confidence: profile.maybe_score.confidence },
      { type: "no", confidence: profile.no_score.confidence },
    ];
    return scores.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );
  };

  // Filter profiles based on primary match type
  const filteredProfiles = profiles.filter(profile => {
    if (filterBy === "all") return true;
    const primaryScore = getProfilePrimaryScore(profile);
    return primaryScore.type === filterBy;
  });

  // Sort profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
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
        aValue = Math.max(a.yes_score.confidence, a.maybe_score.confidence, a.no_score.confidence);
        bValue = Math.max(b.yes_score.confidence, b.maybe_score.confidence, b.no_score.confidence);
        break;
    }

    if (typeof aValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  const handleSortChange = (newSortBy: ProfileSortOption) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  // Get filter counts
  const filterCounts = {
    all: profiles.length,
    yes: profiles.filter(p => getProfilePrimaryScore(p).type === "yes").length,
    maybe: profiles.filter(p => getProfilePrimaryScore(p).type === "maybe").length,
    no: profiles.filter(p => getProfilePrimaryScore(p).type === "no").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">
            {sortedProfiles.length} of {profiles.length} profiles
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-1">
            {(["all", "yes", "maybe", "no"] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setFilterBy(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterBy === filter
                    ? filter === "yes"
                      ? "bg-green-100 text-green-800"
                      : filter === "maybe"
                        ? "bg-yellow-100 text-yellow-800"
                        : filter === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}(
                {filterCounts[filter]})
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex gap-1">
            {(
              [
                { key: "relevance", label: "Relevance" },
                { key: "yes_score", label: "Yes Score" },
                { key: "maybe_score", label: "Maybe Score" },
                { key: "no_score", label: "No Score" },
                { key: "name", label: "Name" },
                { key: "company", label: "Company" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSortChange(key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === key
                    ? "bg-blue-100 text-blue-800"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
                {sortBy === key &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="w-3 h-3" />
                  ) : (
                    <SortDesc className="w-3 h-3" />
                  ))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Grid/List */}
      {sortedProfiles.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {sortedProfiles.map(profile => (
            <EnhancedProfileCard
              key={
                profile.id || `${profile.first_name}-${profile.last_name}-${profile.linkedin_url}`
              }
              profile={profile}
              onViewDetails={onProfileSelect ? () => onProfileSelect(profile) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No profiles found</h3>
          <p className="text-gray-600">
            {filterBy === "all"
              ? "No profiles match your current search criteria."
              : `No profiles with primary "${filterBy}" match found. Try adjusting your filters.`}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {profiles.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{filterCounts.yes}</div>
              <div className="text-xs text-gray-600">Strong Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{filterCounts.maybe}</div>
              <div className="text-xs text-gray-600">Potential Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{filterCounts.no}</div>
              <div className="text-xs text-gray-600">Poor Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{profiles.length}</div>
              <div className="text-xs text-gray-600">Total Profiles</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileList;
