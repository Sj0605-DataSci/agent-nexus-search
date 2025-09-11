import { useState, useEffect } from "react";
import { FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaDatabase, FaNetworkWired, FaSort } from "react-icons/fa";
import { MdOutlineQueryStats } from "react-icons/md";
import { TbBrain } from "react-icons/tb";
import { format } from "sql-formatter";

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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentStage, setCurrentStage] = useState<string>("initializing");
  const [progress, setProgress] = useState(0);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

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
    const hasSQL = streamingSearchQueries.some(q => {
      if (typeof q === "string") {
        return q.includes("keyword") || q.includes("SQL");
      }
      return false;
    });
    const hasVector = streamingSearchQueries.some(q => {
      if (typeof q === "string") {
        return q.includes("vector") || q.includes("semantic");
      }
      return false;
    });
    const hasFusion = streamingSearchQueries.some(q => {
      if (typeof q === "string") {
        return q.includes("rank") || q.includes("fusion");
      }
      return false;
    });

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

  const getProgressMessage = (progress: number): string => {
    if (progress <= 10) {
      return "Understanding what you're looking for...";
    } else if (progress <= 20) {
      return "Analyzing your question and preparing search strategy...";
    } else if (progress <= 40) {
      return "Searching through knowledge base for relevant information...";
    } else if (progress <= 60) {
      return "Finding the most accurate answers to your question...";
    } else if (progress <= 90) {
      return "Organizing answers from most to least relevant...";
    } else {
      return "Putting everything together for your answer...";
    }
  };

  const renderQueryAnalysis = (query: any) => {
    let parsedQuery;
    if (typeof query === "string") {
      try {
        parsedQuery = JSON.parse(query);
      } catch (e) {
        return <div className="text-xs text-gray-700">{query}</div>;
      }
    } else {
      parsedQuery = query;
    }

    return (
      <div className="space-y-4 w-full text-xs">
        {/* Keyphrases Section */}
        {parsedQuery?.keyphrases?.keyphrases?.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center space-x-2 text-sm text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
              >
                <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path>
                <path d="m21 2-9.6 9.6"></path>
                <circle cx="7.5" cy="15.5" r="5.5"></circle>
              </svg>
              <span className="font-medium uppercase">Keyphrases</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {parsedQuery.keyphrases.keyphrases.map((phrase: string, i: number) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Traits Section */}
        {parsedQuery?.traits?.traits?.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center space-x-2 text-sm text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-600"
              >
                <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"></path>
              </svg>
              <span className="font-medium uppercase">Traits</span>
            </div>
            <div className="space-y-2 pl-6">
              {parsedQuery.traits.traits.map((trait: string, i: number) => (
                <div key={i} className="flex items-center">
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full mr-2">
                    {trait}
                  </span>
                  {parsedQuery.traits.descriptions?.[i] && (
                    <span className="text-gray-600">{parsedQuery.traits.descriptions[i]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Section */}
        {parsedQuery?.filters &&
          Object.keys(parsedQuery.filters).some(
            key => Array.isArray(parsedQuery.filters[key]) && parsedQuery.filters[key]?.length > 0
          ) && (
            <div className="mb-4">
              <div className="mb-2 flex items-center space-x-2 text-sm text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-indigo-600"
                >
                  <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                </svg>
                <span className="font-medium uppercase">Filters</span>
              </div>
              <div className="flex flex-wrap gap-3 pl-6">
                {Object.entries(parsedQuery.filters).map(([filterName, values]: [string, any]) => {
                  if (!Array.isArray(values) || values.length === 0) return null;

                  let icon = null;
                  if (filterName.toLowerCase().includes("location")) {
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 text-gray-500"
                      >
                        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    );
                  } else if (filterName.toLowerCase().includes("company")) {
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 text-gray-500"
                      >
                        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
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
                  } else if (filterName.toLowerCase().includes("position")) {
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 text-gray-500"
                      >
                        <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    );
                  } else if (filterName.toLowerCase().includes("skills")) {
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 text-gray-500"
                      >
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                    );
                  }

                  return (
                    <div
                      key={filterName}
                      className="rounded-md border border-gray-100 bg-gray-50 shadow-sm my-0.5"
                    >
                      <div className="flex items-center py-0.5 px-1 text-xs">
                        <div className="flex items-center gap-0.5 min-w-0 shrink-0">
                          <span className="scale-75">{icon}</span>
                          <span className="font-medium capitalize text-[10px] text-gray-600 leading-tight">
                            {filterName.replace("_", " ")}:
                          </span>
                        </div>
                        <div className="ml-0.5 flex flex-wrap gap-0.5 min-w-0">
                          {values.map((value: string, i: number) => (
                            <span
                              key={i}
                              className="bg-white text-gray-700 px-1 py-[1px] text-[10px] rounded-sm border border-gray-200 leading-none"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    );
  };

  const getQueryTypeInfo = (query: string | object) => {
    let queryIcon = <FiSearch className="h-4 w-4 text-gray-600" />;
    let queryColor = "from-purple-500 to-blue-500";
    let queryType = "";
    let isSqlQuery = false;
    let isQueryAnalysis = false;

    let parsedQuery;
    if (typeof query === "string") {
      try {
        parsedQuery = JSON.parse(query);
      } catch (e) {
        parsedQuery = null;
      }
    } else {
      parsedQuery = query;
    }

    switch (true) {
      case Boolean(parsedQuery?.keyphrases) ||
        Boolean(parsedQuery?.traits) ||
        Boolean(parsedQuery?.filters):
        queryIcon = <MdOutlineQueryStats className="h-4 w-4 text-blue-600" />;
        queryColor = "from-blue-500 to-sky-500";
        queryType = "Query Analysis";
        isQueryAnalysis = true;
        break;

      case typeof parsedQuery?.query === "string" &&
        parsedQuery?.query?.includes("ORDER BY") &&
        parsedQuery?.query?.includes("WHERE"):
      case typeof query === "string" && query.includes("ORDER BY") && query.includes("WHERE"):
        queryIcon = <FaDatabase className="h-4 w-4 text-indigo-600" />;
        queryColor = "from-indigo-500 to-blue-500";
        queryType = "SQL Query";
        isSqlQuery = true;
        break;

      case typeof query === "string" && (query.includes("keyword") || query.includes("SQL")):
        queryIcon = <FaDatabase className="h-4 w-4 text-indigo-600" />;
        queryColor = "from-indigo-500 to-blue-500";
        queryType = "SQL-based search";
        break;

      case typeof query === "string" && (query.includes("vector") || query.includes("semantic")):
        queryIcon = <TbBrain className="h-4 w-4 text-purple-600" />;
        queryColor = "from-purple-500 to-violet-500";
        queryType = "Semantic search";
        break;

      case typeof query === "string" && (query.includes("rank") || query.includes("fusion")):
        queryIcon = <FaSort className="h-4 w-4 text-teal-600" />;
        queryColor = "from-teal-500 to-emerald-500";
        queryType = "Result ranking";
        break;

      default:
        break;
    }

    return { queryIcon, queryColor, queryType, isSqlQuery, isQueryAnalysis };
  };

  return (
    <div className="mb-4 transition-all duration-300 w-full ease-in-out">
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
            className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${!isCollapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div
        className={`relative mt-1 transition-all duration-300 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : " opacity-100 "
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
                  <span className="block py-0.5">{getProgressMessage(progress)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {streamingSearchQueries.length > 0 && (
          <div className="py-2 pr-2">
            <ul className="space-y-1">
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
                const { queryIcon, queryColor, queryType } = getQueryTypeInfo(query);
                const animationDelay = `${index * 150}ms`;

                return (
                  <li key={`query-${index}`} className="animate-fadeIn" style={{ animationDelay }}>
                    <div className="bg-white rounded-lg p-2 w-full">
                      <div className="flex items-center">
                        <div className="mr-2">{queryIcon}</div>
                        <div className="flex-1">
                          {getQueryTypeInfo(query).isSqlQuery ? (
                            <div>
                              <div
                                onClick={() => toggleSection("sql-query-" + index)}
                                className=" flex items-center space-x-2 text-sm text-gray-500"
                              >
                                <span className="font-medium">SQL query</span>
                                <button className="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none">
                                  {collapsedSections["sql-query-" + index] ? (
                                    <FiChevronUp className="h-4 w-4 transition-transform duration-200" />
                                  ) : (
                                    <FiChevronDown className="h-4 w-4 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                              <div
                                className={`relative mt-3 ml-[7px] max-w-[calc(100vw-6rem)] border-l-1 border-gray-200 pl-3 ${transitionStyle} ${collapsedSections["sql-query-" + index] ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[800px] opacity-100"}`}
                              >
                                <div className="whitespace-pre bg-muted/50 p-3 font-mono text-xs text-muted-foreground rounded-md">
                                  {(() => {
                                    try {
                                      const formattedQuery = format(query, {
                                        language: "postgresql",
                                        tabWidth: 2,
                                      });
                                      return (
                                        <div className="whitespace-pre bg-muted/50 p-3 font-mono text-xs text-muted-foreground rounded-md">
                                          <div
                                            dangerouslySetInnerHTML={{
                                              __html: formattedQuery.replace(
                                                /\b(SELECT|FROM|WHERE|AND|OR|LIKE|IN|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|VIEW|INDEX|DISTINCT|UNION|ALL|AS|WITH|CASE|WHEN|THEN|ELSE|END|IS|NULL|NOT|BETWEEN|EXISTS|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|EXTRACT|DATE|TIMESTAMP|INTERVAL|TRUE|FALSE)\b/gi,
                                                match =>
                                                  `<span class="text-foreground">${match}</span>`
                                              ),
                                            }}
                                          />
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback if formatting fails
                                      return <div>{query}</div>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          ) : getQueryTypeInfo(query).isQueryAnalysis ? (
                            <div>
                              <div
                                onClick={() => toggleSection("query-analysis-" + index)}
                                className=" flex items-center space-x-2 text-sm text-gray-500"
                              >
                                {/* <MdOutlineQueryStats className="h-4 w-4" /> */}
                                <span className="font-medium">Query Analysis</span>
                                <button className="ml-auto text-gray-500 hover:text-gray-700 focus:outline-none">
                                  {collapsedSections["query-analysis-" + index] ? (
                                    <FiChevronUp className="h-4 w-4 transition-transform duration-200" />
                                  ) : (
                                    <FiChevronDown className="h-4 w-4 transition-transform duration-200" />
                                  )}
                                </button>
                              </div>
                              <div
                                className={`relative ml-[7px] mt-3 max-w-[calc(100vw-6rem)] border-l-1 border-gray-200 pl-3 ${transitionStyle} ${collapsedSections["query-analysis-" + index] ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[500px] opacity-100"}`}
                              >
                                {renderQueryAnalysis(query)}
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
