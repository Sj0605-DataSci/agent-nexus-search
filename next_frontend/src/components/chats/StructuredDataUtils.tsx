import React, { useState, useCallback, useMemo } from "react";
import PersonDetailModal from "./PersonDetailModal";
import { Button } from "@/components/ui/button";
import {
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Linkedin,
  Github,
  Twitter,
  Facebook as FacebookIcon,
  Youtube,
  Instagram,
  Globe,
  MessageSquare,
  Search,
  Code,
  Package,
  Film,
  Music,
  Apple,
  AlertCircle,
  MessageSquareText,
  Laptop2,
  BookOpenText,
  AtSign,
  BriefcaseBusiness,
  ChevronDown,
  User,
} from "lucide-react";
import { useAppSelector } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomAvatar from "@/components/ui/CustomAvatar";
import { SocialLinks } from "../ui/SocialLinks";

// Domain to icon component mapping
const DOMAIN_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  "linkedin.com": { icon: Linkedin, color: "#0A66C2" },
  "github.com": { icon: Github, color: "#181717" },
  "twitter.com": { icon: Twitter, color: "#000000" },
  "facebook.com": { icon: FacebookIcon, color: "#1877F2" },
  "fb.com": { icon: FacebookIcon, color: "#1877F2" },
  "fb.gg": { icon: FacebookIcon, color: "#1877F2" },
  "youtube.com": { icon: Youtube, color: "#FF0000" },
  "youtu.be": { icon: Youtube, color: "#FF0000" },
  "instagram.com": { icon: Instagram, color: "#E4405F" },
  "reddit.com": { icon: MessageSquare, color: "#FF4500" },
  "medium.com": { icon: BookOpenText, color: "#000000" },
  "stackoverflow.com": { icon: MessageSquare, color: "#F48024" },
  "google.com": { icon: Search, color: "#4285F4" },
  "microsoft.com": { icon: Laptop2, color: "#00A4EF" },
  "apple.com": { icon: Apple, color: "#000000" },
  "amazon.com": { icon: Package, color: "#FF9900" },
  "netflix.com": { icon: Film, color: "#E50914" },
  "spotify.com": { icon: Music, color: "#1DB954" },
  "dev.to": { icon: Code, color: "#0A0A0A" },
};

const DEFAULT_ICON = {
  icon: ExternalLink,
  color: "#6B7280",
};

const getDomain = (url: string): string => {
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      "www.",
      ""
    );
    return domain;
  } catch {
    return "";
  }
};

// Get icon for domain
const getDomainIcon = (url: string) => {
  if (!url) return DEFAULT_ICON;

  try {
    const domain = getDomain(url).toLowerCase();
    if (!domain) return DEFAULT_ICON;

    // First try exact matches
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain === key || domain.endsWith(`.${key}`)) {
        return value;
      }
    }

    // Then try partial matches for known domains
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain.includes(key)) {
        return value;
      }
    }

    // Special case for Facebook domains
    if (domain.includes("facebook") || domain.includes("fb.")) {
      return DOMAIN_ICONS["facebook.com"] || DEFAULT_ICON;
    }

    return DEFAULT_ICON;
  } catch (error) {
    return DEFAULT_ICON;
  }
};

/**
 * Parses text to determine if it contains structured data with people information
 */
export const parseStructuredData = (text: string) => {
  const lines = text.split("\n").filter(line => line.trim());

  // Check if we have structured data with colons
  if (lines.length === 0 || !lines.some(line => line.includes(":"))) {
    return { isStructured: false, people: [], columns: [] };
  }

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
  };
};

const sortPeople = (people: Array<Record<string, string>>) => {
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

export const downloadAsCSV = (people: Array<Record<string, string>>, columns: string[]) => {
  if (!people?.length) {
    console.warn("No data to export");
    return;
  }

  const sortedPeople = sortPeople(people);

  // Process data for CSV
  const processedPeople = sortedPeople.map(person => {
    const processed = { ...person };

    // Handle NULL email
    if (processed.Email === "NULL" || processed.Email === "null") {
      processed.Email = "";
    }

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

interface Person {
  FName?: string;
  LName?: string;
  SocialLinks?: string;
  Email?: string;
  Score?: string;
  Reason?: string;
  Avatar?: string;
  Company?: string;
  Title?: string;
  [key: string]: string | undefined;
}

const PersonCard = ({
  person,
  columns,
  darkMode,
  index,
  onPersonClick,
}: {
  person: Person;
  columns: string[];
  darkMode: boolean;
  index: number;
  onPersonClick?: (person: Person) => void;
}) => {
  const fullName = `${person.FName || ""} ${person.LName || ""}`.trim();

  return (
    <div
      onClick={() => onPersonClick?.(person)}
      className={`p-4 mb-4 rounded-xl shadow-sm transition-colors duration-100 hover:bg-muted/50 cursor-pointer ${
        darkMode ? "bg-gray-800" : "bg-white border-0 shadow-sm"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <CustomAvatar
            name={`${person.FName || ""} ${person.LName || ""}`.trim()}
            src={person.Avatar}
            size="md"
            className="border-0 shadow-sm"
          />

          <div className="flex min-w-32  flex-col w-full">
            <div className=" w-full flex items-center justify-between flex-row ">
              <span className="overflow-hidden break-words text-base font-semibold">
                {fullName}
              </span>
              {person.Score && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center text-ms justify-center h-6 w-6 rounded-full bg-[#00C853] text-white font-semibold">
                    {person.Score}
                  </div>
                </div>
              )}
            </div>

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
                socialLinks={person["SocialLinks"]}
                maxLinks={3}
                textSize="text-xs"
                showTooltip={false}
                showLabels={true}
              />
            </div>
          </div>
        </div>

        {columns.some(col => col === "Reason" && person[col] && person[col] !== "null") && (
          <ul className="list-disc pl-1 text-[#666666]">
            {columns.map(col => {
              if (
                [
                  "FName",
                  "LName",
                  "Score",
                  "SocialLinks",
                  "Email",
                  "Avatar",
                  "Company",
                  "Title",
                ].includes(col)
              )
                return null;
              const value = person[col];
              if (!value || value === "null") return null;

              return (
                <div key={col}>
                  <span className="whitespace-pre-wrap">
                    <span className="text-sm text-[#666666]">{value}</span>
                  </span>
                </div>
              );
            })}
          </ul>
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
      const aValue = a[sortConfig.key as keyof Person] || "";
      const bValue = b[sortConfig.key as keyof Person] || "";
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
        case "Reason":
          // For reasons: longer text first
          return bStr.length - aStr.length;
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

  // Process people data to extract company and title information
  const processedPeople = useMemo(() => {
    return sortedPeople.map((person: Person) => {
      // Try to extract company and title from the data
      const processedPerson = { ...person };

      // Look for company information in the data
      if (!processedPerson.Company) {
        for (const key of Object.keys(person)) {
          if (key.toLowerCase().includes("company") || key.toLowerCase().includes("organization")) {
            processedPerson.Company = person[key] || "";
            break;
          }
        }
      }

      // Look for title information in the data
      if (!processedPerson.Title) {
        for (const key of Object.keys(person)) {
          if (
            key.toLowerCase().includes("title") ||
            key.toLowerCase().includes("position") ||
            key.toLowerCase().includes("role")
          ) {
            processedPerson.Title = person[key] || "";
            break;
          }
        }
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
        <div className="block xl:hidden w-full">
          {/* Mobile filter dropdown */}
          <div className="flex justify-end px-2 mb-3">
            <div className="flex items-center min-w-[120px]">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-between whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  <span className="text-sm text-gray-700">
                    {sortConfig?.key === "FName" ? "Name" : sortConfig?.key === "SocialLinks" ? "Links" : sortConfig?.key || "Score"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-100 border-1 w-40">
                  {["Name", "Score", "SocialLinks", "Email", "Reason"]
                    .filter(col => columns.includes(col === "Name" ? "FName" : col))
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
        <div className="hidden xl:block w-full">
          <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
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
                                {sortConfig?.key === "FName" ? "Name" : sortConfig?.key === "SocialLinks" ? "Links" : sortConfig?.key || "Score"}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50 transition-transform" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-50 border-gray-100 border-1">
                              {["Name", "Score", "SocialLinks", "Email", "Reason"]
                                .filter(col => columns.includes(col === "Name" ? "FName" : col))
                                .map(col => (
                                  <DropdownMenuItem
                                    key={col}
                                    onClick={() => {
                                      const sortKey = col === "Name" ? "FName" : col;
                                      requestSort(sortKey);
                                    }}
                                  >
                                    {col === "SocialLinks" ? "Links" : col}
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

                    return (
                      <tr
                        key={i}
                        className="border-0 transition-all duration-200 data-[state=selected]:bg-muted/80 cursor-pointer hover:bg-white relative group after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gray-100 after:to-transparent"
                        onClick={() => handlePersonClick(person, i)}
                      >
                        <td className="p-3 align-middle py-3">
                          <div className="flex items-center gap-4 pl-2">
                            <CustomAvatar
                              name={`${person.FName || ""} ${person.LName || ""}`.trim()}
                              src={person.Avatar}
                              size="md"
                              className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group-hover:shadow-md group-hover:border-gray-200 group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-cyan-100"
                            />

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

                              {person.Title && (
                                <span className="text-xs text-[#666666]">{person.Title}</span>
                              )}

                              {person["SocialLinks"] && (
                                <div className="flex flex-col">
                                  <SocialLinks
                                    email={person.Email}
                                    socialLinks={person["SocialLinks"]}
                                    maxLinks={3}
                                    textSize="text-xs"
                                    showTooltip={true}
                                    showLabels={false}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-middle py-3">
                          <div className="flex items-center justify-center">
                            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-green-100">
                              {person.Score}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-middle py-3">
                          <div className="max-h-[120px] overflow-hidden relative">
                            <div className="text-sm text-[#666666] line-clamp-5">
                              {person?.Reason}
                            </div>
                            {person?.Reason && person.Reason.split('\n').length > 6 && (
                              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-middle py-3">
                          <div className="flex flex-col items-center justify-center gap-2">
                            {/* Mutual connections */}
                            <div className="relative">
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
                              <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-cyan-100">
                                <span className="text-xs font-medium text-cyan-600">M</span>
                              </div>
                            </div>
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

export const renderAsTable = (
  content: string,
  darkMode: boolean,
  messagesContainerRef: React.RefObject<HTMLDivElement | null>,
  hasMoreMessages?: boolean,
  loadMoreMessages?: () => void
) => {
  const { people, columns, isStructured } = parseStructuredData(content);

  // Process people data to extract avatar URLs if available
  const processedPeople: Person[] = people.map(person => {
    // Create a properly typed Person object
    const processedPerson: Person = {
      ...(Object.fromEntries(
        Object.entries(person).map(([key, value]) => [key, value || ""])
      ) as unknown as Person),
    };

    // Look for avatar/image information in the data
    if (!processedPerson.Avatar) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("avatar") ||
          key.toLowerCase().includes("image") ||
          key.toLowerCase().includes("photo") ||
          key.toLowerCase().includes("picture")
        ) {
          processedPerson.Avatar = person[key] || "";
          break;
        }
      }
    }

    // Look for company information
    if (!processedPerson.Company) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("company") ||
          key.toLowerCase().includes("organization") ||
          key.toLowerCase().includes("employer")
        ) {
          processedPerson.Company = person[key] || "";
          break;
        }
      }
    }

    // Look for title/role information
    if (!processedPerson.Title) {
      for (const key of Object.keys(person)) {
        if (
          key.toLowerCase().includes("title") ||
          key.toLowerCase().includes("position") ||
          key.toLowerCase().includes("role") ||
          key.toLowerCase().includes("job")
        ) {
          processedPerson.Title = person[key] || "";
          break;
        }
      }
    }

    return processedPerson;
  });

  if (!isStructured || people.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="flex w-full h-full flex-col">
      <div className="mb-4 px-3 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
        <div className=" flex justify-end">
          <Button
            onClick={() => downloadAsCSV(people, columns)}
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 rounded-md px-3 ${
              darkMode
                ? "border-1 border-gray-100 text-gray-300 hover:bg-gray-800"
                : "border-1 border-gray-100 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StructuredDataTable
        people={processedPeople}
        columns={columns}
        darkMode={darkMode}
        onDownload={() => downloadAsCSV(people, columns)}
      />
    </div>
  );
};

export { StructuredDataTable };
