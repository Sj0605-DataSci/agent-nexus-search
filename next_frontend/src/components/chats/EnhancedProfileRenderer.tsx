import React, { useState } from "react";
import EnhancedProfileList from "./EnhancedProfileList";
import EnhancedProfileTable from "./EnhancedProfileTable";
import StructuredContentRenderer from "./StructuredContentRenderer";
import { parseStructuredData, renderAsTable } from "./StructuredDataUtils";
import { isEnhancedProfileData, extractEnhancedProfiles, sanitizeEnhancedProfile } from "@/utils/profileDataParser";
import { extractProfilesFromCurrentFormat, isConvertibleStructuredData } from "@/utils/structuredDataConverter";
import { EnhancedProfile } from "@/types/enhancedProfile";
import { Table, Grid } from "lucide-react";

interface EnhancedProfileRendererProps {
  content: string;
  sources?: any[];
  onProfileSelect?: (profile: EnhancedProfile) => void;
}

export const EnhancedProfileRenderer: React.FC<EnhancedProfileRendererProps> = ({
  content,
  sources,
  onProfileSelect
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  
  
  try {
    // Check if content contains enhanced profile data
    const hasEnhancedProfiles = isEnhancedProfileData(content);
    
    if (hasEnhancedProfiles) {
      // Extract and render enhanced profiles
      const profiles = extractEnhancedProfiles(content);
      
      if (profiles.length > 0) {
        // Sanitize and validate profiles
        const sanitizedProfiles = profiles
          .map(profile => sanitizeEnhancedProfile(profile))
          .filter(profile => profile.first_name && profile.last_name);

        if (sanitizedProfiles.length > 0) {
          return (
            <div className="enhanced-profile-container">
              {/* View Toggle */}
              <div className="mb-4 flex justify-end">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                      viewMode === 'list' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Card View"
                  >
                    <Grid className="w-4 h-4" />
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                      viewMode === 'table' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Table View"
                  >
                    <Table className="w-4 h-4" />
                    Table
                  </button>
                </div>
              </div>

              {/* Render based on view mode */}
              {viewMode === 'list' ? (
                <EnhancedProfileList
                  profiles={sanitizedProfiles}
                  title={`Found ${sanitizedProfiles.length} Profile${sanitizedProfiles.length === 1 ? '' : 's'}`}
                  onProfileSelect={onProfileSelect}
                />
              ) : (
                <EnhancedProfileTable
                  profiles={sanitizedProfiles}
                  onProfileSelect={onProfileSelect}
                />
              )}
            </div>
          );
        }
      }
    }

    // Check if it's convertible structured data (current format)
    if (isConvertibleStructuredData(content)) {
      console.log("Converting structured data to enhanced profiles");
      const convertedProfiles = extractProfilesFromCurrentFormat(content);
      
      if (convertedProfiles.length > 0) {
        return (
          <div className="enhanced-profile-container">
            {/* View Toggle */}
            <div className="mb-4 flex justify-end">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Card View"
                >
                  <Grid className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                    viewMode === 'table' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Table View"
                >
                  <Table className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>

            {/* Render based on view mode */}
            {viewMode === 'list' ? (
              <EnhancedProfileList
                profiles={convertedProfiles}
                title={`Found ${convertedProfiles.length} Profile${convertedProfiles.length === 1 ? '' : 's'}`}
                onProfileSelect={onProfileSelect}
              />
            ) : (
              <EnhancedProfileTable
                profiles={convertedProfiles}
                onProfileSelect={onProfileSelect}
              />
            )}
          </div>
        );
      }
    }
  } catch (error) {
    console.error("Error rendering enhanced profiles:", error);
    // Fall back to regular markdown rendering
  }

  // Check if it's structured table data (old format) - fallback
  if (parseStructuredData(content) && /(fname|lname|link)/i.test(content)) {
    return (
      <div className="flex w-full">
        {renderAsTable(content, false, { current: null }, false, () => {})}
      </div>
    );
  }

  // Fall back to regular markdown rendering for non-profile content
  return (
    <StructuredContentRenderer
      content={content}
    />
  );
};

export default EnhancedProfileRenderer;
