import React, { useState, useCallback, useMemo } from "react";
import PersonDetailModal from "./PersonDetailModal";
import { Button } from "@/components/ui/button";
import { Download, BriefcaseBusiness, ChevronDown, Quote, SortAsc, SortDesc } from "lucide-react";
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
// import { Person } from "@/types/person";
import { getInitials, capitalize } from "@/utils/stringUtils";

// Define types for the scoring data
export interface ScoringItem {
  confidence: number;
  traitTitle: string;
  traitDescription: string;
  filter?: string;
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

const UserCardView = ({
  person,
  userName,
  onPersonClick,
}: {
  person: Person;
  userName?: string;
  index: number;
  onPersonClick?: (person: Person) => void;
}) => {
  const fullName = `${person.FName || ""} ${person.LName || ""}`.trim();
  const all_quotes = Array.isArray(person.all_quotes)
    ? person.all_quotes
    : Array.isArray(person.Quotes)
      ? person.Quotes
      : [];

  // Get quotes from all_quotes
  const headline = person.Headline || "";

  return (
    <>
      <div
        onClick={() => onPersonClick?.(person)}
        className={`rounded-lg md:hidden p-4 cursor-pointer  bg-white hover:bg-gray-50 shadow-sm hover:shadow-md border-b border-gray-200 transition-colors hover:bg-muted/50`}
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
              <span className="overflow-hidden break-words text-base font-semibold">
                {fullName}
              </span>
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
              <div className="flex items-center text-xs justify-center text-sm h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-medium mr-1">
                {userName ? getInitials(userName).charAt(0) : "A"}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface StructuredDataTableProps {
  people: Person[];
  columns: string[];
  userName?: string;
  darkMode: boolean;
  onDownload: () => void;
}

const StructuredDataTable: React.FC<StructuredDataTableProps> = ({ people, userName }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "relevance", direction: "desc" });
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);
  const requestSort = useCallback((key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const sortOptions = useMemo(() => {
    const dynamicTraits = new Set<string>();
    people.forEach(person => {
      person.scoring?.forEach(item => {
        if (item.filter) {
          dynamicTraits.add(item.filter);
        }
      });
    });

    const traitOptions = Array.from(dynamicTraits).map(trait => ({ key: trait, label: trait }));

    return [
      { key: "relevance", label: "Score" },
      ...traitOptions,
      { key: "name", label: "Name" },
      { key: "company", label: "Company" },
    ];
  }, [people]);

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.key) {
        case "relevance":
          const aTotalScore = a.scoring?.reduce((sum, item) => sum + item.confidence, 0) || 0;
          const bTotalScore = b.scoring?.reduce((sum, item) => sum + item.confidence, 0) || 0;
          return (aTotalScore - bTotalScore) * direction;

        case "name":
          const aName = `${a.FName || ""} ${a.LName || ""}`.trim();
          const bName = `${b.FName || ""} ${b.LName || ""}`.trim();
          return bName.localeCompare(aName) * direction;

        default:
          const aTrait = a.scoring?.find(item => item.filter === sortConfig.key);
          const bTrait = b.scoring?.find(item => item.filter === sortConfig.key);
          const aScore = aTrait?.confidence || 0;
          const bScore = bTrait?.confidence || 0;
          return (aScore - bScore) * direction;
      }
    });
  }, [people, sortConfig]);

  const handlePersonClick = useCallback((person: Person, index: number) => {
    setSelectedPerson(person);
    setSelectedPersonIndex(index);
  }, []);

  const processedPeople = useMemo(() => {
    return sortedPeople;
  }, [sortedPeople]);

  return (
    <div className="w-full">
      <PersonDetailModal
        person={selectedPerson}
        isOpen={!!selectedPerson}
        userName={userName}
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

      <div className="flex flex-col w-full">
        <div className="flex items-center  md:w-full gap-2mb-2 border-gray-200">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex gap-2 flex-wrap pl-2">
            {sortOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => requestSort(key)}
                className={`flex items-center justify-center gap-1 px-2 py-1 min-w-[80px] rounded-md text-xs font-medium transition-all ${
                  sortConfig.key === key
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="whitespace-nowrap">{capitalize(label)}</span>
                {sortConfig.key === key &&
                  (sortConfig.direction === "asc" ? (
                    <SortAsc className="w-3 h-3 ml-0.5" />
                  ) : (
                    <SortDesc className="w-3 h-3 ml-0.5" />
                  ))}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full">
          <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
            <div className="relative w-full rounded-xl">
              <div className="block mt-3 md:hidden w-full">
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
                    <UserCardView
                      key={i}
                      person={person}
                      userName={userName}
                      index={i}
                      onPersonClick={person => handlePersonClick(person, i)}
                    />
                  ))}
                </div>
              </div>
              <table className="w-full caption-bottom text-sm border-collapse">
                <thead className="[&_tr]:border-b-0">
                  <tr className="sticky top-0 z-10 bg-white transition-shadow duration-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.1)]">
                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-left font-medium pl-4">
                      <div className="flex items-center min-w-[220px] justify-start">Person</div>
                    </th>

                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-left font-medium">
                      <div className="flex items-center justify-start">Score</div>
                    </th>
                    <th className="h-10 px-4 align-middle text-[#666666] [&:has([role=checkbox])]:pr-0 text-left font-medium">
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
                    const all_quotes = Array.isArray(person.all_quotes)
                      ? person.all_quotes
                      : Array.isArray(person.Quotes)
                        ? person.Quotes
                        : [];

                    return (
                      <>
                        <tr
                          key={person.i}
                          className="border-b hidden md:table-row transition-colors duration-100 hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer relative group after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gray-100 after:to-transparent"
                          onClick={() => handlePersonClick(person, i)}
                        >
                          <td className=" align-middle py-3">
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
                              {person.MutualConnection ? (
                                <div
                                  className="relative group cursor-pointer"
                                  title={`Mutual connection: ${person.MutualConnection}`}
                                >
                                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
                                  <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-cyan-100 group-hover:scale-105">
                                    <span className="text-xs font-medium text-cyan-600">
                                      {userName ? getInitials(userName).charAt(0) : "A"}
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
                      </>
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

export const renderAsTable = (content: string, userName?: string) => {
  const { people, columns, isStructured } = parseStructuredData(content);

  if (!isStructured || people.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className=" w-full flex flex-col">
      <div className="mb-2 flex justify-between items-center ">
        <h2 className="text-lg font-medium text-gray-600">
          {!!people?.length && people?.length > 0
            ? `I have found ${people?.length} results across ${userName != "Ashish Gupta" ? `${userName}'s` : "founder's"} 20,175+ 1st degree connections`
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
        people={people}
        columns={columns}
        darkMode={false}
        userName={userName}
        onDownload={() => downloadAsCSV(people, columns)}
      />
    </div>
  );
};

export { StructuredDataTable };
