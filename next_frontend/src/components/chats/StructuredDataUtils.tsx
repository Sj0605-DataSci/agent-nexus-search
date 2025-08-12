import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useAppSelector } from "@/store";

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

  let icon = "🔗";
  let displayText = trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    displayText = url.hostname.replace("www.", "");

    if (url.hostname.includes("linkedin.com")) icon = "💼";
    else if (url.hostname.includes("github.com")) icon = "🐙";
    else if (url.hostname.includes("stackoverflow.com")) icon = "🔍";
  } catch (e) {
    console.warn("Invalid URL:", trimmed);
  }

  return (
    <a
      key={trimmed}
      href={trimmed.startsWith("http") ? trimmed : `https://${trimmed}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline flex items-center gap-1.5 text-sm"
      title={trimmed}
    >
      <span>{icon}</span>
      <span className="truncate max-w-[120px] sm:max-w-none">{displayText}</span>
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

export const renderAsTable = (
  content: string,
  darkMode: boolean,
  messagesContainerRef: React.RefObject<HTMLDivElement | null>,
  hasMoreMessages?: boolean,
  loadMoreMessages?: () => void
) => {
  const { people, columns } = parseStructuredData(content);
  if (people.length === 0) return <div className="whitespace-pre-wrap">{content}</div>;

  const sortedPeople = sortPeople(people);

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => downloadAsCSV(people, columns)}
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
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
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
                              .map(link => link.trim())
                              .filter(link => link)
                              .map((link, i) => (
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
