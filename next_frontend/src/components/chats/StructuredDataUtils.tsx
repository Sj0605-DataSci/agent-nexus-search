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

  const people: any[] = [];
  const columns = ["FName", "LName", "Social Links", "Email", "Phone No", "Score", "Reason"];
  let currentPerson: any = {};

  for (const line of lines) {
    if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Normalize key names to match our columns
      let normalizedKey = "";
      if (key.toLowerCase().includes("fname") || key.toLowerCase().includes("first")) {
        normalizedKey = "FName";
      } else if (key.toLowerCase().includes("lname") || key.toLowerCase().includes("last")) {
        normalizedKey = "LName";
      } else if (key.toLowerCase().includes("social") || key.toLowerCase().includes("link")) {
        normalizedKey = "Social Links";
      } else if (key.toLowerCase().includes("email")) {
        normalizedKey = "Email";
      } else if (key.toLowerCase().includes("phone")) {
        normalizedKey = "Phone No";
      } else if (key.toLowerCase().includes("score")) {
        normalizedKey = "Score";
      } else if (key.toLowerCase().includes("reason")) {
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

/**
 * Helper function to convert table data to CSV and download
 */
export const downloadAsCSV = (people: any[], columns: string[]) => {
  if (people.length === 0) return;

  // Create CSV content
  const csvContent = [
    // Header row
    columns.join(","),
    // Data rows
    ...people.map(person =>
      columns
        .map(column => {
          const value = person[column] || "N/A";
          // Escape quotes and wrap in quotes if contains comma or quote
          const escapedValue = value.toString().replace(/"/g, '""');
          return escapedValue.includes(",") ||
            escapedValue.includes('"') ||
            escapedValue.includes("\n")
            ? `"${escapedValue}"`
            : escapedValue;
        })
        .join(",")
    ),
  ].join("\n");

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

/**
 * Helper function to render structured data as Excel-style table
 */
export const renderAsTable = (
  content: string, 
  darkMode: boolean,
  messagesContainerRef: React.RefObject<HTMLDivElement | null>,
  hasMoreMessages?: boolean,
  loadMoreMessages?: () => void
) => {
  const { people, columns } = parseStructuredData(content);

  if (people.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div>
      {/* Download button */}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
        {hasMoreMessages && loadMoreMessages && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMoreMessages}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Load Older Messages
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table
            className={`min-w-full divide-y divide-gray-200 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {people.map((person, personIndex) => (
                <tr
                  key={personIndex}
                  className={
                    personIndex % 2 === 0
                      ? darkMode
                        ? "bg-gray-900"
                        : "bg-white"
                      : darkMode
                        ? "bg-gray-800"
                        : "bg-gray-50"
                  }
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="px-4 py-4 whitespace-normal text-sm break-words"
                    >
                      {person[column] ? (
                        person[column] === "null" || person[column] === "N/A" ? (
                          <span className="text-gray-400">N/A</span>
                        ) : column === "Social Links" ? (
                          person[column].split(",").map((link: string, i: number) => (
                            <div key={i} className="mb-1">
                              <a
                                href={link.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-xs"
                              >
                                {link.trim()}
                              </a>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm">{person[column]}</span>
                        )
                      ) : (
                        <span className="text-gray-400">N/A</span>
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
  );
};
