import { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { FaDatabase, FaNetworkWired, FaSort } from "react-icons/fa";
import { MdOutlineQueryStats } from "react-icons/md";
import { TbBrain } from "react-icons/tb";

import "../../styles/search-animations.css";

declare module "react" {
  interface CSSProperties {
    "--shiny-width"?: string;
    "--progress"?: string;
  }
}

interface SearchQueryDisplayProps {
  showSearchQueries: boolean;
  streamingSearchQueries: string[];
  isStreaming: boolean;
}

export const SearchQueryDisplay = ({
  showSearchQueries,
  streamingSearchQueries,
  isStreaming,
}: SearchQueryDisplayProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("initializing");
  const [progress, setProgress] = useState(0);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const collapsedStyle = "max-h-0 opacity-0 p-0";
  const expandedStyle = "max-h-[200px] opacity-100";
  const transitionStyle = "transition-all duration-300 ease-in-out";

  useEffect(() => {
    if (isStreaming && streamingSearchQueries.length === 0) {
      if (progress === 0) setProgress(5);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 60) {
            const increment = prev < 40 ? 0.5 : 0.2;
            return prev + increment;
          }
          return prev;
        });
      }, 300);

      return () => clearInterval(progressInterval);
    }
  }, [isStreaming, streamingSearchQueries.length, progress]);

  useEffect(() => {
    const hasSQL = streamingSearchQueries.some(q => q.includes("keyword") || q.includes("SQL"));
    const hasVector = streamingSearchQueries.some(
      q => q.includes("vector") || q.includes("semantic")
    );
    const hasFusion = streamingSearchQueries.some(q => q.includes("rank") || q.includes("fusion"));

    if (hasSQL && progress < 70) {
      setProgress(70);
    }

    if (hasVector && hasSQL && progress < 85) {
      setProgress(85);
    }

    if (hasFusion && hasVector && hasSQL && progress < 95) {
      setProgress(95);
    }
  }, [streamingSearchQueries, progress]);

  useEffect(() => {
    if (!isStreaming) {
      setCurrentStage("completed");
      const timer = setTimeout(() => {
        setProgress(100);
      }, 300);
      return () => clearTimeout(timer);
    }

    let newStage: string;
    let newProgress: number;

    if (streamingSearchQueries.length === 0) {
      newStage = "initializing";
      newProgress = progress;
    } else if (streamingSearchQueries.length <= 2) {
      newStage = "analyzing";
      newProgress = Math.max(progress, 30);
    } else if (streamingSearchQueries.length <= 4) {
      newStage = "searching";
      newProgress = Math.max(progress, 50);
    } else if (streamingSearchQueries.length <= 6) {
      newStage = "ranking";
      newProgress = Math.max(progress, 70);
    } else {
      newStage = "finalizing";
      newProgress = Math.max(progress, 90);
    }

    const stageTimer = setTimeout(() => {
      setCurrentStage(newStage);
    }, 200);

    const progressTimer = setTimeout(() => {
      setProgress(newProgress);
    }, 400);

    return () => {
      clearTimeout(stageTimer);
      clearTimeout(progressTimer);
    };
  }, [isStreaming, streamingSearchQueries.length]);

  if (!showSearchQueries && streamingSearchQueries.length === 0 && !isStreaming) return null;

  const getStageInfo = () => {
    switch (currentStage) {
      case "initializing":
        return {
          icon: <TbBrain className="h-4 w-4 text-purple-600" />,
          text: "Initializing search",
        };
      case "analyzing":
        return {
          icon: <MdOutlineQueryStats className="h-4 w-4 text-blue-600" />,
          text: "Analyzing query",
        };
      case "searching":
        return {
          icon: <FaDatabase className="h-4 w-4 text-indigo-600" />,
          text: "Searching connections",
        };
      case "ranking":
        return { icon: <FaSort className="h-4 w-4 text-teal-600" />, text: "Ranking results" };
      case "finalizing":
        return {
          icon: <FaNetworkWired className="h-4 w-4 text-emerald-600" />,
          text: "Finalizing results",
        };
      case "completed":
        return { icon: <FiSearch className="h-4 w-4 text-green-600" />, text: "Search completed" };
      default:
        return {
          icon: <FiSearch className="h-4 w-4 text-purple-600" />,
          text: "Search in progress",
        };
    }
  };

  const { icon, text } = getStageInfo();

  return (
    <div className="mb-4 transition-all duration-300 ease-in-out">
      <div
        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          <span>{text}</span>
        </div>

        <div
          className="h-1 bg-gray-200 rounded-full overflow-hidden flex-grow mx-4"
          style={{ width: "100px" }}
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700 ease-out"
            style={{ width: `${isStreaming ? progress : 100}%` }}
          ></div>
        </div>

        <button
          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
          aria-label={isCollapsed ? "Expand search queries" : "Collapse search queries"}
          onClick={e => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div
        className={`relative mt-1 transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100 "
        }`}
        style={{ scrollbarWidth: "thin" }}
      >
        {isStreaming && streamingSearchQueries.length === 0 && (
          <div className="text-sm relative">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 w-full overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative h-6 w-6 flex items-center justify-center">
                    <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-50"></div>
                    <TbBrain className="h-5 w-5 text-purple-600 relative z-10" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">
                    Searching knowledge base
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-md border border-gray-100 animate-fadeIn">
                <div className="flex items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">What's happening now:</span>
                </div>
                <div className="text-xs text-gray-600">
                  {progress <= 10 && (
                    <span className="block py-0.5">Understanding what you're looking for...</span>
                  )}
                  {progress > 10 && progress <= 20 && (
                    <span className="block py-0.5">
                      Planning the best way to find your answer...
                    </span>
                  )}
                  {progress > 20 && progress <= 30 && (
                    <span className="block py-0.5">
                      Looking for exact matche in our database...
                    </span>
                  )}
                  {progress > 30 && progress <= 40 && (
                    <span className="block py-0.5">
                      Searching for important keyword in your question...
                    </span>
                  )}
                  {progress > 40 && progress <= 50 && (
                    <span className="block py-0.5">
                      Finding the meaning behind your question...
                    </span>
                  )}
                  {progress > 50 && progress <= 60 && (
                    <span className="block py-0.5">
                      Looking for similar questions others have asked...
                    </span>
                  )}
                  {progress > 60 && progress <= 70 && (
                    <span className="block py-0.5">
                      Connecting related information from different sources...
                    </span>
                  )}
                  {progress > 70 && progress <= 80 && (
                    <span className="block py-0.5">
                      Finding the most helpful information for you...
                    </span>
                  )}
                  {progress > 80 && progress <= 90 && (
                    <span className="block py-0.5">
                      Organizing answers from most to least relevant...
                    </span>
                  )}
                  {progress > 90 && (
                    <span className="block py-0.5">
                      Putting everything together for your answer...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {streamingSearchQueries.length > 0 && (
          <div className="py-2 pr-2">
            <ul className="space-y-3">
              <li key={`query-${12}`} className="animate-fadeIn" style={{ animationDelay: "10ms" }}>
                <div className="bg-white rounded-lg p-2 w-full">
                  <div className="flex items-center">
                    <div className="mr-2">
                      <TbBrain className="h-5 w-5 text-purple-600 relative z-10" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-gray-800 break-words">
                        Searched in knowledge base
                      </span>
                      <span className="text-xs text-gray-500 block">
                        Found the <span className="text-teal-600 font-medium">most helpful</span>{" "}
                        information for you...
                      </span>
                    </div>
                  </div>
                </div>
              </li>
              {streamingSearchQueries.map((query, index) => {
                const isKeyword = query?.includes("keyword") || query?.includes("SQL");
                const isVector = query?.includes("vector") || query?.includes("semantic");
                const isRanking = query?.includes("rank") || query?.includes("fusion");
                const isQueryAnalysis = query?.includes("filters") || query?.includes("keyphrases");
                const isSqlQuery = query?.includes("ORDER BY") && query?.includes("WHERE");
                console.log("query", isSqlQuery, isQueryAnalysis, query);

                let queryIcon = <FiSearch className="h-4 w-4 text-gray-600" />;
                let queryColor = "from-purple-500 to-blue-500";
                let queryType = "";

                if (isQueryAnalysis) {
                  queryIcon = <MdOutlineQueryStats className="h-4 w-4 text-blue-600" />;
                  queryColor = "from-blue-500 to-sky-500";
                  queryType = "Query Analysis";
                } else if (isSqlQuery) {
                  queryIcon = <FaDatabase className="h-4 w-4 text-indigo-600" />;
                  queryColor = "from-indigo-500 to-blue-500";
                  queryType = "SQL Query";
                } else if (isKeyword) {
                  queryIcon = <FaDatabase className="h-4 w-4 text-indigo-600" />;
                  queryColor = "from-indigo-500 to-blue-500";
                  queryType = "SQL-based search";
                } else if (isVector) {
                  queryIcon = <TbBrain className="h-4 w-4 text-purple-600" />;
                  queryColor = "from-purple-500 to-violet-500";
                  queryType = "Semantic search";
                } else if (isRanking) {
                  queryIcon = <FaSort className="h-4 w-4 text-teal-600" />;
                  queryColor = "from-teal-500 to-emerald-500";
                  queryType = "Result ranking";
                }

                const animationDelay = `${index * 150}ms`;

                return (
                  <li key={`query-${index}`} className="animate-fadeIn" style={{ animationDelay }}>
                    <div className="bg-white rounded-lg p-2 w-full">
                      <div className="flex items-center">
                        <div className="mr-2">{queryIcon}</div>
                        <div className="flex-1">
                          {isSqlQuery ? (
                            <div>
                              <div className="mb-3 flex items-center space-x-2 text-sm text-gray-500">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                  <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                                  <path d="M3 12A9 3 0 0 0 21 12"></path>
                                </svg>
                                <span className="font-medium">SQL query</span>
                                <button
                                  onClick={() => toggleSection("sql-query-" + index)}
                                  className="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-3 w-3 transition-transform duration-200 ${collapsedSections["sql-query-" + index] ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
                                      fill="currentColor"
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                    ></path>
                                  </svg>
                                </button>
                              </div>
                              <div
                                className={`relative ml-[7px] max-w-[calc(100vw-6rem)] border-l-2 pl-3 ${transitionStyle} ${collapsedSections["sql-query-" + index] ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[500px] opacity-100"}`}
                              >
                                <div className="whitespace-pre bg-muted/50 p-3 font-mono text-xs text-muted-foreground rounded-md">
                                  {query.split("\n").map((line, i) => {
                                    const highlightedLine = line.replace(
                                      /\b(SELECT|FROM|WHERE|AND|OR|LIKE|IN|JOIN|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|TRUE|FALSE)\b/gi,
                                      match => `<span class="text-foreground">${match}</span>`
                                    );

                                    return (
                                      <div
                                        key={i}
                                        dangerouslySetInnerHTML={{ __html: highlightedLine }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : isQueryAnalysis ? (
                            <div>
                              <div className="mb-2 flex justify-between items-center">
                                <button
                                  onClick={() => toggleSection("query-analysis-" + index)}
                                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-3 w-3 transition-transform duration-200 ${collapsedSections["query-analysis-" + index] ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
                                      fill="currentColor"
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                    ></path>
                                  </svg>
                                </button>
                              </div>
                              <div
                                className={`text-xs overflow-hidden ${transitionStyle} ${collapsedSections["query-analysis-" + index] ? collapsedStyle : "max-h-[500px] opacity-100"}`}
                              >
                                <div className="space-y-3">
                                  {query.split(" | ").map((section, i) => {
                                    const [sectionName, sectionContent] = section.includes(":")
                                      ? [
                                          section.split(":")[0],
                                          section.split(":").slice(1).join(":"),
                                        ]
                                      : ["", section];

                                    if (!sectionContent.trim()) return null;

                                    const sectionId = `section-${i}-${sectionName}`;
                                    const isSectionCollapsed =
                                      collapsedSections[sectionId] || false;

                                    return (
                                      <div
                                        key={i}
                                        className="mb-2 border-b border-gray-100 pb-1 last:border-b-0 last:pb-0"
                                      >
                                        {sectionName && (
                                          <div
                                            className="flex items-center justify-between cursor-pointer py-1"
                                            onClick={() => toggleSection(sectionId)}
                                          >
                                            <span className="font-medium text-gray-700">
                                              {sectionName}
                                            </span>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${isSectionCollapsed ? "-rotate-90" : ""}`}
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                        <div
                                          className={`overflow-hidden ${transitionStyle} ${isSectionCollapsed ? collapsedStyle : expandedStyle}`}
                                        >
                                          <div className="py-1 pl-2">
                                            {sectionName === "FILTERS" ? (
                                              <div>
                                                <div className="mb-3 flex items-center space-x-2 text-sm text-muted-foreground">
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="lucide lucide-funnel h-4 w-4"
                                                    aria-hidden="true"
                                                  >
                                                    <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                                                  </svg>
                                                  <span className="font-medium">Filters</span>
                                                </div>
                                                <div className="relative ml-[7px] max-w-[calc(100vw-6rem)] border-l-2 pl-3">
                                                  <div className="flex flex-wrap gap-2">
                                                    {sectionContent
                                                      .split(";")
                                                      .map((filter, filterIndex) => {
                                                        if (!filter.trim()) return null;
                                                        const parts = filter.split(":");
                                                        const filterName = parts[0].trim();
                                                        const filterValue = parts
                                                          .slice(1)
                                                          .join(":")
                                                          .trim();

                                                        let icon = (
                                                          <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="lucide lucide-map-pin h-3.5 w-3.5 mr-1.5 text-muted-foreground"
                                                            aria-hidden="true"
                                                          >
                                                            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                                                            <circle cx="12" cy="10" r="3"></circle>
                                                          </svg>
                                                        );

                                                        if (
                                                          filterName
                                                            .toLowerCase()
                                                            .includes("company")
                                                        ) {
                                                          icon = (
                                                            <svg
                                                              xmlns="http://www.w3.org/2000/svg"
                                                              width="24"
                                                              height="24"
                                                              viewBox="0 0 24 24"
                                                              fill="none"
                                                              stroke="currentColor"
                                                              strokeWidth="2"
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              className="lucide lucide-building h-3.5 w-3.5 mr-1.5 text-muted-foreground"
                                                              aria-hidden="true"
                                                            >
                                                              <rect
                                                                width="16"
                                                                height="20"
                                                                x="4"
                                                                y="2"
                                                                rx="2"
                                                                ry="2"
                                                              ></rect>
                                                              <path d="M9 22v-4h6v4"></path>
                                                              <path d="M8 6h.01"></path>
                                                              <path d="M16 6h.01"></path>
                                                              <path d="M12 6h.01"></path>
                                                              <path d="M12 10h.01"></path>
                                                              <path d="M12 14h.01"></path>
                                                              <path d="M16 10h.01"></path>
                                                              <path d="M16 14h.01"></path>
                                                              <path d="M8 10h.01"></path>
                                                              <path d="M8 14h.01"></path>
                                                            </svg>
                                                          );
                                                        } else if (
                                                          filterName
                                                            .toLowerCase()
                                                            .includes("position")
                                                        ) {
                                                          icon = (
                                                            <svg
                                                              xmlns="http://www.w3.org/2000/svg"
                                                              width="24"
                                                              height="24"
                                                              viewBox="0 0 24 24"
                                                              fill="none"
                                                              stroke="currentColor"
                                                              strokeWidth="2"
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              className="lucide lucide-briefcase h-3.5 w-3.5 mr-1.5 text-muted-foreground"
                                                              aria-hidden="true"
                                                            >
                                                              <rect
                                                                width="20"
                                                                height="14"
                                                                x="2"
                                                                y="7"
                                                                rx="2"
                                                                ry="2"
                                                              ></rect>
                                                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                                            </svg>
                                                          );
                                                        } else if (
                                                          filterName
                                                            .toLowerCase()
                                                            .includes("skills")
                                                        ) {
                                                          icon = (
                                                            <svg
                                                              xmlns="http://www.w3.org/2000/svg"
                                                              width="24"
                                                              height="24"
                                                              viewBox="0 0 24 24"
                                                              fill="none"
                                                              stroke="currentColor"
                                                              strokeWidth="2"
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              className="lucide lucide-code h-3.5 w-3.5 mr-1.5 text-muted-foreground"
                                                              aria-hidden="true"
                                                            >
                                                              <polyline points="16 18 22 12 16 6"></polyline>
                                                              <polyline points="8 6 2 12 8 18"></polyline>
                                                            </svg>
                                                          );
                                                        } else if (
                                                          filterName.toLowerCase().includes("work")
                                                        ) {
                                                          icon = (
                                                            <svg
                                                              xmlns="http://www.w3.org/2000/svg"
                                                              width="24"
                                                              height="24"
                                                              viewBox="0 0 24 24"
                                                              fill="none"
                                                              stroke="currentColor"
                                                              strokeWidth="2"
                                                              strokeLinecap="round"
                                                              strokeLinejoin="round"
                                                              className="lucide lucide-briefcase-business h-3.5 w-3.5 mr-1.5 text-muted-foreground"
                                                              aria-hidden="true"
                                                            >
                                                              <path d="M12 12h.01"></path>
                                                              <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                                                              <path d="M22 13a18.15 18.15 0 0 1-20 0"></path>
                                                              <rect
                                                                width="20"
                                                                height="14"
                                                                x="2"
                                                                y="6"
                                                                rx="2"
                                                              ></rect>
                                                            </svg>
                                                          );
                                                        }

                                                        return (
                                                          <div
                                                            key={filterIndex}
                                                            className="rounded-lg border text-card-foreground border-none bg-muted/50 shadow-none"
                                                          >
                                                            <div className="flex h-auto items-center space-x-2 p-2">
                                                              <div className="flex items-center text-xs">
                                                                {icon}
                                                                <span className="font-medium">
                                                                  {filterName}
                                                                </span>
                                                              </div>
                                                              <span className="font-mono text-xs text-muted-foreground">
                                                                {filterValue}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : sectionName === "KEYPHRASES" ? (
                                              <div>
                                                <div className="mb-3 flex items-center space-x-2 text-sm text-muted-foreground">
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="lucide lucide-key h-4 w-4"
                                                    aria-hidden="true"
                                                  >
                                                    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path>
                                                    <path d="m21 2-9.6 9.6"></path>
                                                    <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                                  </svg>
                                                  <span className="font-medium">Key phrases</span>
                                                </div>
                                                <div className="relative ml-[7px] max-w-[calc(100vw-6rem)] border-l-2 pl-3">
                                                  <div className="flex flex-wrap gap-2">
                                                    {sectionContent
                                                      .split(",")
                                                      .map((item, itemIndex) => (
                                                        <div
                                                          key={itemIndex}
                                                          className="rounded-lg border text-card-foreground border-none bg-muted/50 shadow-none"
                                                        >
                                                          <div className="p-6 px-2 py-1.5 text-xs">
                                                            {item.trim()}
                                                          </div>
                                                        </div>
                                                      ))}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : sectionName === "TRAITS" ? (
                                              <div>
                                                <div className="mb-3 flex items-center space-x-2 text-sm text-muted-foreground">
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="lucide lucide-puzzle h-4 w-4"
                                                    aria-hidden="true"
                                                  >
                                                    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"></path>
                                                  </svg>
                                                  <span className="font-medium">Traits</span>
                                                </div>
                                                <div className="relative ml-[7px] max-w-[calc(100vw-6rem)] border-l-2 pl-3">
                                                  <div className="flex flex-wrap gap-2">
                                                    {sectionContent
                                                      .split(",")
                                                      .map((item, itemIndex) => (
                                                        <div
                                                          key={itemIndex}
                                                          className="rounded-lg border text-card-foreground border-none bg-muted/50 shadow-none"
                                                        >
                                                          <div className="p-6 px-2 py-1.5 text-xs">
                                                            {item.trim()}
                                                          </div>
                                                        </div>
                                                      ))}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : sectionName === "DESCRIPTIONS" ? (
                                              <div>
                                                <div className="mb-3 flex items-center space-x-2 text-sm text-muted-foreground">
                                                  <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="lucide lucide-list h-4 w-4"
                                                    aria-hidden="true"
                                                  >
                                                    <line x1="8" y1="6" x2="21" y2="6"></line>
                                                    <line x1="8" y1="12" x2="21" y2="12"></line>
                                                    <line x1="8" y1="18" x2="21" y2="18"></line>
                                                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                                                  </svg>
                                                  <span className="font-medium">Descriptions</span>
                                                </div>
                                                <div className="relative ml-[7px] max-w-[calc(100vw-6rem)] border-l-2 pl-3">
                                                  <div className="flex flex-wrap gap-2">
                                                    {sectionContent
                                                      .split(",")
                                                      .map((item, itemIndex) => (
                                                        <div
                                                          key={itemIndex}
                                                          className="rounded-lg border text-card-foreground border-none bg-muted/50 shadow-none"
                                                        >
                                                          <div className="p-6 px-2 py-1.5 text-xs">
                                                            {item.trim()}
                                                          </div>
                                                        </div>
                                                      ))}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="ml-[7px] border-l-2 pl-3">
                                                <span className="text-gray-700 text-xs">
                                                  {sectionContent.trim()}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm text-gray-800 break-words">{query}</span>
                              <span className="text-xs text-gray-500 block uppercase font-medium">
                                {queryType}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
