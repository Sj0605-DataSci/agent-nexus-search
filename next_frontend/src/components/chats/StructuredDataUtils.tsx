import React, { useState, useCallback, useMemo } from "react";
import PersonDetailModal from "./PersonDetailModal";
import { Button } from "@/components/ui/button";
import { Download, BriefcaseBusiness, ChevronDown, Quote } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomAvatar from "@/components/ui/CustomAvatar";
import { SocialLinks } from "../ui/SocialLinks";
import { ScoreCell } from "./ScoreCell";
import Image from "next/image";

// Define types for the scoring data
export interface ScoringItem {
  confidence: number;
  traitTitle: string;
  traitDescription: string;
}

export interface ScoreData {
  confidence: number;
  quotes: string[];
  matching_traits: string[];
  scoring?: ScoringItem[];
}

export interface Person {
  id?: string;
  FName?: string; // mapped from first_name
  LName?: string; // mapped from last_name
  SocialLinks?: string; // mapped from linkedin_url
  Avatar?: string; // mapped from profile_photo_url
  Company?: string; // mapped from company
  Title?: string; // mapped from position
  Location?: string; // mapped from location
  Headline?: string; // mapped from headline
  Score?: string; // calculated from scoring
  scoring?: ScoringItem[];
  all_quotes?: string[];
  MutualConnection?: string; // mapped from mutual_connection
  [key: string]: any; // Using any to resolve type compatibility issues
}

/**
 * Parses text to determine if it contains structured data with people information
 */
export const parseStructuredData = (text: string) => {
  try {
    const jsonData = JSON.parse(text);

    if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id) {
      const people = jsonData.map((person): Person => {
        // Calculate score from scoring array
        let score = "0";
        if (Array.isArray(person.scoring) && person.scoring.length > 0) {
          // Use the highest confidence scoring item as the score
          const highestScoring = [...person.scoring].sort((a, b) => b.confidence - a.confidence)[0];
          score = highestScoring.confidence.toString();
        }

        return {
          id: person.id || "",
          FName: person.first_name || "",
          LName: person.last_name || "",
          SocialLinks: person.linkedin_url || "",
          Avatar: person.profile_photo_url || "",
          Company: person.company || "",
          Title: person.position || "",
          Location: person.location || "",
          Headline: person.headline || "",
          Score: score,
          scoring: person.scoring || [],
          all_quotes: person.all_quotes || [],
          MutualConnection: person.mutual_connection || "",
        };
      });

      const columns = [
        "FName",
        "LName",
        "SocialLinks",
        "Score",
        "Company",
        "Title",
        "Location",
        "Headline",
        "MutualConnection",
      ];

      return {
        isStructured: true,
        people,
        columns,
        isJsonFormat: true,
      };
    }
  } catch (e) {
    // If JSON parsing fails, continue with the original text parsing logic
  }

  // Fallback to the original text parsing logic
  const lines = text.split("\n").filter(line => line.trim());

  // Check if we have structured data with colons
  if (lines.length === 0 || !lines.some(line => line.includes(":")))
    return { isStructured: false, people: [], columns: [] };

  const people: Array<Record<string, string>> = [];
  const columns = ["FName", "LName", "SocialLinks", "Email", "Score", "Reason"];
  let currentPerson: Record<string, string> = {};

  for (const line of lines) {
    if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Normalize key names to match our columns
      let normalizedKey = "";
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes("fname") || lowerKey.includes("first")) {
        normalizedKey = "FName";
      } else if (lowerKey.includes("lname") || lowerKey.includes("last")) {
        normalizedKey = "LName";
      } else if (lowerKey.includes("social") || lowerKey.includes("link")) {
        normalizedKey = "SocialLinks";
      } else if (lowerKey.includes("email")) {
        normalizedKey = "Email";
      } else if (lowerKey.includes("score")) {
        normalizedKey = "Score";
      } else if (lowerKey.includes("reason")) {
        normalizedKey = "Reason";
      }

      if (normalizedKey) {
        // If we're starting a new person (FName is usually first)
        if (normalizedKey === "FName" && Object.keys(currentPerson).length > 0) {
          people.push(currentPerson);
          currentPerson = {};
        }

        currentPerson[normalizedKey] = value;
      }
    }
  }

  // Add the last person
  if (Object.keys(currentPerson).length > 0) {
    people.push(currentPerson);
  }

  return {
    isStructured: people.length > 0,
    people,
    columns,
    isJsonFormat: false,
  };
};

const sortPeople = (people: Person[]) => {
  return [...people].sort((a, b) => {
    const hasEmailA = a.Email && a.Email !== "null" && a.Email !== "N/A" && a.Email.trim() !== "";
    const hasEmailB = b.Email && b.Email !== "null" && b.Email !== "N/A" && b.Email.trim() !== "";

    if (hasEmailA && !hasEmailB) return -1;
    if (!hasEmailA && hasEmailB) return 1;

    const scoreA = parseFloat(a.Score || "0") || 0;
    const scoreB = parseFloat(b.Score || "0") || 0;
    return scoreB - scoreA;
  });
};

export const downloadAsCSV = (people: Person[], columns: string[]) => {
  if (!people?.length) {
    console.warn("No data to export");
    return;
  }

  const sortedPeople = sortPeople(people);

  // Process data for CSV
  const processedPeople = sortedPeople.map(person => {
    // Create a new object with string values for CSV export
    const processed: Record<string, string> = {};

    // Convert complex types to strings for CSV export
    Object.entries(person).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        processed[key] = "";
      } else if (Array.isArray(value)) {
        if (key === "all_quotes") {
          processed[key] = value.join("\n");
        } else if (key === "scoring") {
          // Format scoring array for CSV
          const scoringStr = (value as ScoringItem[])
            .map(item => `${item.traitTitle}: ${item.confidence}`)
            .join(", ");
          processed[key] = scoringStr;
        } else {
          processed[key] = JSON.stringify(value);
        }
      } else if (typeof value === "object") {
        processed[key] = JSON.stringify(value);
      } else {
        processed[key] = String(value);
      }
    });

    // Merge FName and LName into Name
    if (processed.FName || processed.LName) {
      processed.Name = [processed.FName, processed.LName].filter(Boolean).join(" ").trim();
    }

    // Process SocialLinks to remove brackets and extra quotes
    if (processed["SocialLinks"]) {
      try {
        const links = processed["SocialLinks"]
          .replace(/^\[|\]$/g, "") // Remove square brackets
          .split(",")
          .map(link => link.trim().replace(/^['"]|['"]$/g, "")) // Remove quotes and trim
          .filter(Boolean);
        processed["SocialLinks"] = links.join(", ");
      } catch (e) {
        console.error("Error processing SocialLinks:", e);
      }
    }

    return processed;
  });

  // Create display columns - replace FName/LName with Name
  const hasNameField = columns.includes("FName") || columns.includes("LName");
  const displayColumns = [
    ...(hasNameField ? ["Name"] : []), // Add Name column first if needed
    ...columns.filter(col => col !== "FName" && col !== "LName" && col !== "Name"), // Add other columns except FName/LName
  ];

  const csvContent = [
    displayColumns.join(","),
    ...processedPeople.map(person =>
      displayColumns
        .map(column => {
          let value = person[column];
          if (value === undefined || value === null || value === "null" || value === "N/A") {
            value = "";
          }

          const strValue = String(value).trim();
          const escapedValue = strValue.replace(/"/g, '""');

          if (
            escapedValue.includes(",") ||
            escapedValue.includes('"') ||
            escapedValue.includes("\n") ||
            escapedValue.includes("\r")
          ) {
            return `"${escapedValue}"`;
          }
          return escapedValue;
        })
        .join(",")
    ),
  ].join("\r\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `contacts_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Score structure from API response
// Using the exported types from above

// Helper component for displaying traits
const TraitBadge = ({ trait, type }: { trait: string; type: "yes" | "maybe" | "no" }) => {
  const colors = {
    yes: "bg-green-100 text-green-800",
    maybe: "bg-yellow-100 text-yellow-800",
    no: "bg-red-100 text-red-800",
  };

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colors[type]} mr-1 mb-1`}
    >
      {trait}
    </div>
  );
};

const PersonCard = ({
  person,
  darkMode,
  onPersonClick,
}: {
  person: Person;
  columns: string[];
  darkMode: boolean;
  index: number;
  onPersonClick?: (person: Person) => void;
}) => {
  const fullName = `${person.FName || ""} ${person.LName || ""}`.trim();

  // Get quotes from all_quotes
  const headline = person.Headline || "";

  return (
    <div
      onClick={() => onPersonClick?.(person)}
      className={`rounded-lg p-4 cursor-pointer  ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-50"} shadow-sm hover:shadow-md border-b transition-colors hover:bg-muted/50`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {person.Avatar ? (
            <div className="relative h-12 w-12 rounded-full overflow-hidden">
              <Image
                src={person.Avatar}
                alt={fullName}
                width={48}
                height={48}
                className="object-cover rounded-full border border-gray-200"
                unoptimized={person.Avatar.includes("linkedin.com")}
                onError={e => {
                  // Hide the image and show the avatar on error
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  // The CustomAvatar will be shown as it's the next sibling
                }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ display: "none" }}
              >
                <CustomAvatar name={fullName} size="md" />
              </div>
            </div>
          ) : (
            <CustomAvatar name={fullName} size="md" />
          )}
        </div>
        <div className="flex min-w-32 flex-col w-full">
          <div className="w-full flex items-center justify-between flex-row">
            <span className="overflow-hidden break-words text-base font-semibold">{fullName}</span>
          </div>

          {headline && <div className="text-sm text-[#666666] line-clamp-1">{headline}</div>}

          {person.Company && (
            <div className="text-sm font-medium leading-snug text-[#666666]">
              <span className="inline">
                <BriefcaseBusiness className="relative -top-[1.5px] mr-1 inline-block size-4 shrink-0 text-[#666666]" />
                {person.Company}
              </span>
            </div>
          )}

          {person.Title && <span className="text-xs text-[#666666]">{person.Title}</span>}

          <div className="mt-1">
            <SocialLinks
              email={person.Email}
              socialLinks={person.SocialLinks}
              maxLinks={3}
              textSize="text-xs"
              showTooltip={false}
              showLabels={true}
            />
          </div>
        </div>

        <div className="p-2 align-middle py-2">
          <div className="flex flex-col items-center gap-0.5">
            {person.scoring && Array.isArray(person.scoring) && person.scoring.length > 0 && (
              <>
                {(person.scoring as ScoringItem[])
                  .filter(item => item.confidence && item.traitTitle)
                  .sort((a, b) => b.confidence - a.confidence) // Sort by confidence in descending order
                  .slice(0, 3)
                  .map((scoreItem: ScoringItem, idx: number) => (
                    <ScoreCell
                      key={idx}
                      score={{
                        confidence: scoreItem.confidence,
                        scoring: [scoreItem],
                      }}
                      type={
                        scoreItem.confidence > 0.7
                          ? "yes"
                          : scoreItem.confidence > 0.3
                            ? "maybe"
                            : "no"
                      }
                    />
                  ))}
              </>
            )}
          </div>
        </div>

        {person.MutualConnection && (
          <div className="flex items-center mt-2">
            <div className="flex items-center text-xs justify-center text-sm h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-medium mr-1">
              AG
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface StructuredDataTableProps {
  people: Person[];
  columns: string[];
  darkMode: boolean;
  onDownload: () => void;
}

const StructuredDataTable: React.FC<StructuredDataTableProps> = ({
  people,
  columns,
  darkMode,
  onDownload,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "Score",
    direction: "desc",
  });
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);

  const requestSort = useCallback((key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: "desc", // Always sort in descending order as per requirements
    }));
  }, []);

  const sortedPeople = useMemo(() => {
    if (!sortConfig) return [...people];

    return [...people].sort((a, b) => {
      // Special handling for complex fields
      if (
        sortConfig.key === "YesScore" ||
        sortConfig.key === "MaybeScore" ||
        sortConfig.key === "NoScore"
      ) {
        const aScore = a[sortConfig.key]?.confidence || 0;
        const bScore = b[sortConfig.key]?.confidence || 0;
        return bScore - aScore; // Higher scores first
      }

      const aValue = a[sortConfig.key as keyof Person] || "";
      const bValue = b[sortConfig.key as keyof Person] || "";

      // Handle array values
      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        return bValue.length - aValue.length; // More items first
      }

      const aStr = String(aValue);
      const bStr = String(bValue);

      switch (sortConfig.key) {
        case "FName":
          // For names: A to Z
          return aStr.localeCompare(bStr);
        case "Score":
          // For scores: higher to lower
          return (parseFloat(bStr) || 0) - (parseFloat(aStr) || 0);
        case "SocialLinks":
          // For SocialLinks: count of links (more to less)
          const aLinks = aStr ? aStr.split("\n").filter(Boolean).length : 0;
          const bLinks = bStr ? bStr.split("\n").filter(Boolean).length : 0;
          return bLinks - aLinks;
        case "Email":
          // For emails: Z to A, then empty ones
          if (!aStr) return 1;
          if (!bStr) return -1;
          return bStr.localeCompare(aStr);
        case "Company":
          // For company: A to Z (ascending order)
          return aStr.localeCompare(bStr);
        case "Headline":
        case "Location":
          // Alphabetical order
          return aStr.localeCompare(bStr);
        case "MutualConnection":
          // Has mutual first
          return aStr ? -1 : bStr ? 1 : 0;
        default:
          // Default string comparison
          return bStr.localeCompare(aStr);
      }
    });
  }, [people, sortConfig]);

  const handlePersonClick = useCallback((person: Person, index: number) => {
    setSelectedPerson(person);
    setSelectedPersonIndex(index);
  }, []);

  // Process people data to ensure all required fields are available
  const processedPeople = useMemo(() => {
    return sortedPeople.map((person: Person) => {
      // Create a processed copy with all required fields
      const processedPerson = { ...person };

      // Ensure score is properly formatted
      if (processedPerson.YesScore && !processedPerson.Score) {
        processedPerson.Score = processedPerson.YesScore.confidence.toString();
      }

      // Ensure traits are available
      if (!processedPerson.YesTraits && processedPerson.YesScore?.matching_traits) {
        processedPerson.YesTraits = processedPerson.YesScore.matching_traits;
      }

      if (!processedPerson.MaybeTraits && processedPerson.MaybeScore?.matching_traits) {
        processedPerson.MaybeTraits = processedPerson.MaybeScore.matching_traits;
      }

      if (!processedPerson.NoTraits && processedPerson.NoScore?.matching_traits) {
        processedPerson.NoTraits = processedPerson.NoScore.matching_traits;
      }

      return processedPerson;
    });
  }, [sortedPeople]);

  return (
    <div className="w-full">
      <PersonDetailModal
        person={selectedPerson}
        isOpen={!!selectedPerson}
        onClose={() => {
          setSelectedPerson(null);
          setSelectedPersonIndex(null);
        }}
        currentIndex={selectedPersonIndex ?? 0}
        totalCount={processedPeople.length}
        onNext={() => {
          if (selectedPersonIndex !== null && selectedPersonIndex < processedPeople.length - 1) {
            const nextIndex = selectedPersonIndex + 1;
            setSelectedPersonIndex(nextIndex);
            setSelectedPerson(processedPeople[nextIndex]);
          }
        }}
        onPrevious={() => {
          if (selectedPersonIndex !== null && selectedPersonIndex > 0) {
            const prevIndex = selectedPersonIndex - 1;
            setSelectedPersonIndex(prevIndex);
            setSelectedPerson(processedPeople[prevIndex]);
          }
        }}
      />

      <div className="flex w-full overflow-y-auto">
        {/* Mobile view */}
        <div className="block md:hidden w-full">
          {/* Mobile filter dropdown */}
          <div className="flex justify-end px-2 mb-3">
            <div className="flex items-center min-w-[120px]">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-between whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  <span className="text-sm text-gray-700">
                    {sortConfig?.key === "FName"
                      ? "Name"
                      : sortConfig?.key === "SocialLinks"
                        ? "Links"
                        : sortConfig?.key || "Score"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-100 border-1 w-40">
                  {["Name", "Score", "SocialLinks", "Email", "Reason"]
                    ?.filter(col => columns.includes(col === "Name" ? "FName" : col))
                    .map(col => (
                      <DropdownMenuItem
                        key={col}
                        className="text-sm px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          const sortKey = col === "Name" ? "FName" : col;
                          requestSort(sortKey);
                        }}
                      >
                        {col}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Mobile person cards */}
          <div className="space-y-4 px-2">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-400 hover:text-gray-300 cursor-pointer">
                Person
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  <div className="text-sm font-medium text-gray-400 hover:text-gray-300 cursor-pointer">
                    Quotes
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-400 hover:text-gray-300 cursor-pointer">
                  Mutuals
                </div>
              </div>
            </div>
            {processedPeople.map((person, i) => (
              <PersonCard
                key={i}
                person={person}
                columns={columns}
                darkMode={darkMode}
                index={i}
                onPersonClick={person => handlePersonClick(person, i)}
              />
            ))}
          </div>
        </div>

        {/* Desktop view */}
        <div className="hidden md:block w-full">
          <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
            <div className="relative w-full overflow-auto rounded-xl">
              <table className="w-full caption-bottom text-sm border-separate border-spacing-0 [&_tr:not(:last-child)]:after:content-[''] [&_tr:not(:last-child)]:after:block [&_tr:not(:last-child)]:after:h-px [&_tr:not(:last-child)]:after:bg-gradient-to-r [&_tr:not(:last-child)]:after:from-transparent [&_tr:not(:last-child)]:after:via-gray-100 [&_tr:not(:last-child)]:after:to-transparent [&_tr:not(:last-child)]:after:mx-4">
                <thead className="[&_tr]:border-b-0">
                  <tr className="sticky top-0 z-10 bg-white transition-shadow duration-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.1)]">
                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-center font-medium pl-4">
                      <div className="flex items-center justify-start">Person</div>
                    </th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-[#666666] [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center min-w-[120px] gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center justify-between whitespace-nowrap rounded-full border-0 bg-transparent py-2 text-sm shadow-none ring-offset-background focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 mx-auto h-7 w-fit px-2 transition-colors hover:bg-muted/30 hover:text-accent-foreground">
                              <span style={{ pointerEvents: "none" }}>
                                {sortConfig?.key === "FName"
                                  ? "Name"
                                  : sortConfig?.key === "SocialLinks"
                                    ? "Links"
                                    : sortConfig?.key === "YesScore"
                                      ? "Match Score"
                                      : sortConfig?.key || "Score"}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-50 border-gray-100 border-1">
                              {["Name", "Score", "YesScore", "Company"]
                                .filter(col => columns.includes(col === "Name" ? "FName" : col))
                                .map(col => (
                                  <DropdownMenuItem
                                    key={col}
                                    onClick={() => {
                                      const sortKey = col === "Name" ? "FName" : col;
                                      requestSort(sortKey);
                                    }}
                                  >
                                    {col === "SocialLinks"
                                      ? "Links"
                                      : col === "YesScore"
                                        ? "Match Score"
                                        : col}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </th>
                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-center font-medium">
                      <div className="flex items-center justify-start">Quotes</div>
                    </th>
                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-center font-medium pl-0 pr-[7px]">
                      <div className="flex items-center justify-center">
                        <div className="flex justify-center">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 border-0 rounded-full px-3 hover:bg-muted/30"
                              onClick={() => requestSort("MutualConnection")}
                            >
                              Mutuals
                            </Button>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-0">
                  {processedPeople.map((person, i) => {
                    const fullName = `${person.FName || ""} ${person.LName || ""}`.trim();
                    const initials = fullName
                      .split(" ")
                      .map(name => name.charAt(0))
                      .join("")
                      .toUpperCase();

                    const all_quotes = Array.isArray(person.all_quotes)
                      ? person.all_quotes
                      : Array.isArray(person.Quotes)
                        ? person.Quotes
                        : [];

                    return (
                      <tr
                        key={i}
                        className="border-b transition-colors duration-100 hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer relative group after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gray-100 after:to-transparent"
                        onClick={() => handlePersonClick(person, i)}
                      >
                        <td className="p-3 align-middle py-3">
                          <div className="flex items-center gap-4 pl-2">
                            <a
                              href="#"
                              className="relative flex shrink-0 overflow-hidden rounded-full h-12 w-12 flex-shrink-0"
                            >
                              {person.Avatar ? (
                                <Image
                                  src={person.Avatar}
                                  alt={fullName}
                                  width={48}
                                  height={48}
                                  className="aspect-square h-full w-full object-cover border border-gray-200"
                                  onError={e => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    target.nextElementSibling?.classList.remove("hidden");
                                  }}
                                  unoptimized={person.Avatar.includes("linkedin.com")}
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary text-base">
                                  <CustomAvatar name={fullName} size="md" />
                                </span>
                              )}
                            </a>

                            <div className="flex w-32 min-w-32 max-w-32 flex-col sm:w-40 sm:min-w-40 sm:max-w-40">
                              <span className="overflow-hidden break-words text-base font-semibold">
                                {fullName}
                              </span>
                              {person.Company && (
                                <div className="text-sm font-medium leading-snug text-[#666666]">
                                  <span className="inline">
                                    <BriefcaseBusiness className="relative -top-[1.5px] mr-1 inline-block size-4 shrink-0 text-[#666666]" />
                                    {person.Company}
                                  </span>
                                </div>
                              )}

                              {person.Headline ? (
                                <div className="text-sm text-[#666666] line-clamp-1">
                                  {person.Headline}
                                </div>
                              ) : person.Title ? (
                                <span className="text-xs text-[#666666]">{person.Title}</span>
                              ) : null}
                              {person.SocialLinks && (
                                <div className="flex flex-col mt-1">
                                  <SocialLinks
                                    socialLinks={person.SocialLinks}
                                    maxLinks={2}
                                    textSize="text-xs"
                                    showTooltip={true}
                                    showLabels={false}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 align-middle py-2">
                          <div className="flex flex-col items-center gap-0.5">
                            {person.scoring &&
                              Array.isArray(person.scoring) &&
                              person.scoring.length > 0 && (
                                <>
                                  {(person.scoring as ScoringItem[])
                                    .filter(item => item.confidence && item.traitTitle)
                                    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence in descending order
                                    .slice(0, 3)
                                    .map((scoreItem: ScoringItem, idx: number) => (
                                      <ScoreCell
                                        key={idx}
                                        score={{
                                          confidence: scoreItem.confidence,
                                          scoring: [scoreItem],
                                        }}
                                        type={
                                          scoreItem.confidence > 0.7
                                            ? "yes"
                                            : scoreItem.confidence > 0.3
                                              ? "maybe"
                                              : "no"
                                        }
                                      />
                                    ))}
                                </>
                              )}
                          </div>
                        </td>
                        <td className="p-3 align-middle py-3">
                          <div className="max-h-[180px] overflow-hidden relative">
                            {all_quotes.length > 0 && (
                              <div className="mb-4">
                                <ul className="list-disc pl-5 ">
                                  {all_quotes.slice(0, 5).map((quote: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">
                                      <div
                                        className="text-sm text-gray-700"
                                        dangerouslySetInnerHTML={{ __html: quote }}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-middle py-3">
                          <div className="flex flex-col items-center justify-center gap-2">
                            {/* Mutual connections */}
                            {person.MutualConnection ? (
                              <div
                                className="relative group cursor-pointer"
                                title={`Mutual connection: ${person.MutualConnection}`}
                              >
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
                                <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-cyan-100 group-hover:scale-105">
                                  <span className="text-xs font-medium text-cyan-600">
                                    {person.MutualConnection.substring(0, 1).toUpperCase()}
                                  </span>
                                </div>
                                <span className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-200">
                                  Mutual
                                </span>
                              </div>
                            ) : (
                              <div className="h-8 w-8"></div> /* Empty placeholder to maintain alignment */
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
        </div>
      </div>
    </div>
  );
};

export const renderAsTable = (content: string) => {
  const { people, columns, isStructured } = parseStructuredData(content);

  const processedPeople: Person[] = people.map(person => {
    const processedPerson: Person = {
      ...(Object.fromEntries(
        Object.entries(person).map(([key, value]) => [key, value || ""])
      ) as unknown as Person),
    };

    if (!processedPerson.Avatar) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("avatar") ||
          key.toLowerCase().includes("image") ||
          key.toLowerCase().includes("photo") ||
          key.toLowerCase().includes("picture")
        ) {
          processedPerson.Avatar = String(person[key as keyof typeof person] || "");
          break;
        }
      }
    }

    if (!processedPerson.Company) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("company") ||
          key.toLowerCase().includes("organization") ||
          key.toLowerCase().includes("employer")
        ) {
          processedPerson.Company = String(person[key as keyof typeof person] || "");
          break;
        }
      }
    }

    if (!processedPerson.Title) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("title") ||
          key.toLowerCase().includes("position") ||
          key.toLowerCase().includes("role") ||
          key.toLowerCase().includes("job")
        ) {
          processedPerson.Title = String(person[key as keyof typeof person] || "");
          break;
        }
      }
    }

    return processedPerson;
  });

  // Debug logs removed

  if (!isStructured || people.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-600">
          {!!processedPeople?.length && processedPeople?.length > 0
            ? `I have found ${processedPeople?.length} results`
            : "No Results"}
        </h2>
        <div className=" flex justify-end">
          <Button
            onClick={() => downloadAsCSV(people, columns)}
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 rounded-md px-3 border-1 border-gray-100 text-gray-700 hover:bg-gray-50`}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StructuredDataTable
        people={processedPeople}
        columns={columns}
        darkMode={false}
        onDownload={() => downloadAsCSV(people, columns)}
      />
    </div>
  );
};

export { StructuredDataTable };
