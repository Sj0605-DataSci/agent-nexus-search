import React, { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { useAppSelector } from "@/store";

// Domain to icon component mapping
const DOMAIN_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  "linkedin.com": { icon: Linkedin, color: "#0A66C2" },
  "github.com": { icon: Github, color: "#181717" },
  "twitter.com": { icon: Twitter, color: "#1DA1F2" },
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

// Default icon for unknown domains
const DEFAULT_ICON = {
  icon: ExternalLink,
  color: "#6B7280",
};

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/;

// Get domain from URL
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

    console.log("Looking up icon for domain:", domain);

    // First try exact matches
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain === key || domain.endsWith(`.${key}`)) {
        console.log("Found exact icon match:", { domain, key });
        return value;
      }
    }

    // Then try partial matches for known domains
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain.includes(key)) {
        console.log("Found partial icon match:", { domain, key });
        return value;
      }
    }

    // Special case for Facebook domains
    if (domain.includes("facebook") || domain.includes("fb.")) {
      console.log("Matched Facebook domain:", domain);
      return DOMAIN_ICONS["facebook.com"] || DEFAULT_ICON;
    }

    console.log("No icon match found for domain:", domain);
    return DEFAULT_ICON;
  } catch (error) {
    console.error("Error in getDomainIcon:", error);
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
  const columns = ["FName", "LName", "Social Links", "Email", "Score", "Reason"];
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
        normalizedKey = "Social Links";
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

  const csvContent = [
    columns.join(","),
    ...sortedPeople.map(person =>
      columns
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

const renderSocialLink = (link: string) => {
  if (!link) return null;

  const trimmed = link.trim();
  if (!trimmed) return null;

  const isValidUrl = URL_REGEX.test(trimmed);
  if (!isValidUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <ExternalLink className="w-4 h-4" />
        <span className="truncate max-w-[120px] sm:max-w-none" title={trimmed}>
          {trimmed.length > 30 ? `${trimmed.substring(0, 27)}...` : trimmed}
        </span>
      </div>
    );
  }

  const domain = getDomain(trimmed);
  const { icon: Icon, color } = getDomainIcon(trimmed);
  const displayText = domain || trimmed;

  return (
    <a
      key={trimmed}
      href={trimmed.startsWith("http") ? trimmed : `https://${trimmed}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline flex items-center gap-1.5 text-sm"
      style={{ color }}
      title={trimmed}
    >
      <Icon className="w-4 h-4" />
      <span className="truncate max-w-[120px] sm:max-w-none">
        {displayText.length > 24 ? `${displayText.substring(0, 24)}...` : displayText}
      </span>
    </a>
  );
};

interface Person {
  FName?: string;
  LName?: string;
  "Social Links"?: string;
  Email?: string;
  Score?: string;
  Reason?: string;
  [key: string]: string | undefined;
}

const PersonCard = ({
  person,
  columns,
  darkMode,
  index,
}: {
  person: Person;
  columns: string[];
  darkMode: boolean;
  index: number;
}) => (
  <div
    className={`p-4 mb-4 rounded-lg shadow-sm ${
      darkMode ? "bg-gray-800" : "bg-white border border-gray-200"
    }`}
  >
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-base">
          {person.FName} {person.LName}
        </h3>
        {person.Score && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              parseFloat(person.Score) >= 8
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }`}
          >
            Score: {person.Score}
          </span>
        )}
      </div>

      {columns.map(col => {
        if (["FName", "LName", "Score"].includes(col)) return null;
        const value = person[col];
        if (!value || value === "null") return null;

        return (
          <div key={col} className="text-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
              {col}
            </div>
            {col === "Social Links" ? (
              <div className="flex flex-wrap gap-2">
                {value
                  .split(",")
                  .map(link => link.trim())
                  .filter(link => link)
                  .map((link, i) => (
                    <React.Fragment key={i}>{renderSocialLink(link)}</React.Fragment>
                  ))}
              </div>
            ) : col === "Reason" ? (
              <div
                className={`p-2 rounded text-sm ${
                  darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-700"
                }`}
              >
                {value}
              </div>
            ) : (
              <div className="break-words">{value}</div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface StructuredDataTableProps {
  people: Array<Record<string, string>>;
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

  const requestSort = useCallback((key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const sortedPeople = useMemo(() => {
    const sortablePeople = [...people];
    if (!sortConfig) return sortablePeople;

    return sortablePeople.sort((a, b) => {
      // Handle empty or null values
      if (!a[sortConfig.key] && !b[sortConfig.key]) return 0;
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;

      // Special handling for different data types
      if (sortConfig.key === "Score") {
        const aValue = parseFloat(a[sortConfig.key] || "0") || 0;
        const bValue = parseFloat(b[sortConfig.key] || "0") || 0;
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Default string comparison
      const aValue = String(a[sortConfig.key] || "").toLowerCase();
      const bValue = String(b[sortConfig.key] || "").toLowerCase();

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [people, sortConfig]);

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-end">
        <Button
          onClick={onDownload}
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      <div className="flex w-full overflow-y-auto">
        <div className="block xl:hidden space-y-3 px-2">
          {sortedPeople.map((person, i) => (
            <PersonCard key={i} person={person} columns={columns} darkMode={darkMode} index={i} />
          ))}
        </div>

        <div className="hidden xl:flex flex-1 min-w-0">
          <div className="overflow-x-auto w-full">
            <table
              className={`min-w-full divide-y ${darkMode ? "divide-gray-700 text-gray-300" : "divide-gray-200 text-gray-700"}`}
            >
              <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-opacity-50 ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                      onClick={() => requestSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        {col}
                        <span className="text-xs">{getSortIndicator(col)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {sortedPeople.map((person, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? darkMode
                          ? "bg-gray-900"
                          : "bg-white"
                        : darkMode
                          ? "bg-gray-800"
                          : "bg-gray-50"
                    }
                  >
                    {columns.map((col, j) => (
                      <td key={j} className="px-4 py-3 text-sm">
                        {!person[col] || person[col] === "null" ? (
                          <span className="text-gray-400">N/A</span>
                        ) : col === "Social Links" ? (
                          <div className="flex flex-col gap-1.5">
                            {person[col]
                              .split(",")
                              .map((link: string) => link.trim())
                              .filter((link: string) => link)
                              .map((link: string, i: number) => (
                                <React.Fragment key={i}>{renderSocialLink(link)}</React.Fragment>
                              ))}
                          </div>
                        ) : col === "Reason" ? (
                          <div
                            className={`p-2 rounded text-sm max-w-[400px] max-h-[200px] overflow-y-auto ${
                              darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {person[col]}
                          </div>
                        ) : (
                          <div className="break-words">{person[col]}</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
  const { people, columns } = parseStructuredData(content);

  if (people.length === 0) return <div className="whitespace-pre-wrap">{content}</div>;

  return (
    <StructuredDataTable
      people={people}
      columns={columns}
      darkMode={darkMode}
      onDownload={() => downloadAsCSV(people, columns)}
    />
  );
};

export { StructuredDataTable };
