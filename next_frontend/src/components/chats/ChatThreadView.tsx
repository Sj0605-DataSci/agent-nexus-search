"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatTimestamp, getFullTimestamp } from "@/utils/timeUtils";
import {
  Search,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Table,
  Download,
  ThumbsUp,
  ThumbsDown,
  Clock as ClockIcon,
  User as UserIcon,
} from "lucide-react";
import { getTimeBasedGreeting } from "../../utils/timeUtils";
import Image from "next/image";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import { loadAgents, selectAgentCards, selectAgentsStatus } from "@/store/agentsSlice";
import SearchModeToggle from "./SearchModeToggle";
import WorldConnectionsToggle from "./WorldConnectionsToggle";
import FormatToggle from "./FormatToggle";
import TagCarousel, { TagCategories } from "./TagCarousel";
import StructuredContentRenderer, { isStructuredResearchResult } from "./StructuredContentRenderer";
import Link from "next/link";
import OrbAura from "../OrbAura";

// Define feedback type for type safety
type FeedbackType = {
  messageId: string;
  isPositive: boolean;
  comment?: string;
};

const ChatThreadView = ({ threadId }: { threadId: string }) => {

  // Helper function to parse structured data for multiple people
  const parseStructuredData = (text: string) => {
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

  // Helper function to convert table data to CSV and download
  const downloadAsCSV = (people: any[], columns: string[]) => {
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

  // Helper function to render structured data as Excel-style table
  const renderAsTable = (content: string) => {
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
          {hasMoreMessages && (
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

  // Web Worker for chat processing
  const chatWorkerRef = useRef<Worker | null>(null);
  const router = useRouter();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("00000000-0000-4000-a000-000000000000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      setQuery(urlParams.get("q") || "");
      setSelectedAgent(urlParams.get("agent") || "00000000-0000-4000-a000-000000000000");
    }
  }, []);

  const [format, setFormat] = useState<"chat" | "table">("chat");
  const [searchMode, setSearchMode] = useState<"basic" | "deep">("basic");
  const [worldConnectionsMode, setWorldConnectionsMode] = useState<"connections" | "world">(
    "world"
  );
  const [messages, setMessages] = useState<
    { id: string; type: "user" | "agent"; content: string; timestamp: Date }[]
  >([]);

  // Feedback state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const [chatPairs, setChatPairs] = useState<any[]>([]);
  const [messagesOffset, setMessagesOffset] = useState<number>(0);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const MESSAGES_PER_PAGE = 50;
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Function to load more messages (older messages)
  const loadMoreMessages = async () => {
    if (!threadId || !hasMoreMessages) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error("User not authenticated.");
        return;
      }

      const messagesResponse = await apiClient.getChatMessages(
        userId,
        threadId,
        MESSAGES_PER_PAGE,
        messagesOffset
      );

      if (messagesResponse.messages && messagesResponse.messages.length > 0) {
        // Add messages to the beginning since we're loading older messages
        setChatPairs(prev => [...messagesResponse.messages, ...prev]);
        setMessagesOffset(prev => prev + MESSAGES_PER_PAGE);
        setHasMoreMessages(messagesOffset + MESSAGES_PER_PAGE < messagesResponse.total);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    }
  };

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const darkMode = useAppSelector(s => s.theme.dark);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  const dispatch = useAppDispatch();
  const agentsStatus = useAppSelector(selectAgentsStatus);
  const agentCards = useAppSelector(selectAgentCards);
  // const templates = useAppSelector(selectTemplates);
  // const hiredAgents = useAppSelector(selectHired);

  useEffect(() => {
    if (agentsStatus === "idle") dispatch(loadAgents());

    // Track page view when component mounts
    posthog.capture("chat_thread_viewed", {
      thread_id: threadId,
      is_new_thread: threadId === "new",
    });

    // Initialize web worker
    if (typeof window !== "undefined") {
      // Check if the browser supports service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then(registration => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch(error => {
            console.error("Service Worker registration failed:", error);
          });
      }

      // Initialize chat worker
      if (window.Worker) {
        chatWorkerRef.current = new Worker("/chatWorker.js");

        // Set up message handler for the worker
        chatWorkerRef.current.onmessage = event => {
          const { type, data } = event.data;

          switch (type) {
            case "processed_message":
              // Update message content with processed data
              setMessages(prevMessages =>
                prevMessages.map(msg =>
                  msg.id === data.id ? { ...msg, content: data.content } : msg
                )
              );
              break;

            case "processed_search_results":
              // Handle processed search results
              console.log("Processed search results:", data.sources);
              break;

            case "query_analysis":
              // Handle query analysis results
              console.log("Query analysis:", data);
              // Could use this data to suggest related searches
              break;
          }
        };
      }
    }

    // Cleanup worker on component unmount
    return () => {
      if (chatWorkerRef.current) {
        chatWorkerRef.current.terminate();
      }
    };
  }, [agentsStatus, dispatch, threadId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!threadId) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          console.error("User not authenticated.");
          return;
        }

        // Get messages with pagination - initially fetch first batch
        const messagesResponse = await apiClient.getChatMessages(
          userId,
          threadId,
          MESSAGES_PER_PAGE,
          0
        );

        setTotalMessages(messagesResponse.total);
        setMessagesOffset(MESSAGES_PER_PAGE);
        setHasMoreMessages(messagesResponse.total > MESSAGES_PER_PAGE);

        if (messagesResponse.messages && messagesResponse.messages.length > 0) {
          setChatPairs(messagesResponse.messages);
          setCurrentMessageIndex(messagesResponse.messages.length - 1);
        }
      } catch (error) {
        console.error("Error fetching chat messages:", error);
      }
    };

    // fetchMessages implementation

    fetchMessages();
  }, [threadId]);

  useEffect(() => {
    if (chatPairs.length > 0) {
      const currentPair = chatPairs[currentMessageIndex];
      setQuery(currentPair.main_query);

      const userMessage = {
        id: `${currentPair.id}-user`,
        type: "user" as const,
        content: currentPair.main_query,
        timestamp: new Date(currentPair.created_at),
      };

      let messageContent = currentPair.message;

      // Use web worker to process message content if available
      if (chatWorkerRef.current && typeof messageContent === "object" && messageContent !== null) {
        // Create a temporary message with loading state
        const agentMessage = {
          id: currentPair.id,
          type: "agent" as const,
          content: "Processing message...",
          timestamp: new Date(currentPair.updated_at),
        };

        setMessages([userMessage, agentMessage]);

        // Send message to worker for processing
        chatWorkerRef.current.postMessage({
          type: "process_message",
          data: {
            id: currentPair.id,
            content: messageContent,
          },
        });
      } else {
        // Fallback to synchronous processing if worker is not available
        if (typeof messageContent === "object" && messageContent !== null) {
          messageContent = JSON.stringify(messageContent, null, 2);
        }

        const agentMessage = {
          id: currentPair.id,
          type: "agent" as const,
          content: messageContent,
          timestamp: new Date(currentPair.updated_at),
        };

        setMessages([userMessage, agentMessage]);
      }
    }
  }, [currentMessageIndex, chatPairs]);

  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (!showAgentDropdown) return;

      const target = e.target as Node;

      const clickedOutside =
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target);

      if (clickedOutside) setShowAgentDropdown(false);
    }

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [showAgentDropdown]);

  const handleTagClick = (tag: string) => {
    setQuery(tag);
  };

  const handleAgentSelect = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    hired: boolean
  ) => {
    console.log("id", id);
    e.stopPropagation();

    if (!hired) {
      // Track when user clicks on non-hired agent
      posthog.capture("agent_marketplace_redirect", { agent_id: id });
      router.push(`/marketplace?agent=${id}`);
      return;
    }

    // Track agent selection
    posthog.capture("agent_selected", {
      agent_id: id,
      thread_id: threadId,
    });

    setSelectedAgent(id);
    setShowAgentDropdown(false);
  };
  const agentData = agentCards.find(a => a.id === selectedAgent) || agentCards[0];

  const handleSearch = async (incoming?: string) => {
    const q = incoming ?? query;
    if (!q.trim()) return;

    // Use web worker to analyze query if available
    if (chatWorkerRef.current) {
      chatWorkerRef.current.postMessage({
        type: "analyze_query",
        data: { query: q },
      });
    }

    // Track search query
    posthog.capture("search_initiated", {
      query: q,
      agent_id: selectedAgent,
      search_mode: searchMode,
      world_connections_mode: worldConnectionsMode,
      format: format,
      thread_id: threadId,
    });

    setMessages(m => [
      ...m,
      {
        id: Date.now().toString(),
        type: "user",
        content: q,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(m => [
      ...m,
      {
        id: loadingMessageId,
        type: "agent",
        content: "⏳ Searching for information...",
        timestamp: new Date(),
      },
    ]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error("No user ID found. User might not be authenticated.");
        setMessages(m =>
          m.map(msg =>
            msg.id === loadingMessageId
              ? {
                  ...msg,
                  content: "Error: You need to be logged in to use this feature.",
                }
              : msg
          )
        );
        return;
      }

      let currentContent = "⏳ Searching for information...";
      let sources: any[] = [];
      let searchQueries: string[] = [];
      let hasExtractedFinalAnswer = false;

      // Track search start time for duration calculation
      const searchStartTime = Date.now();

      await apiClient.sendStreamingChatRequest(
        userId,
        agentData.id,
        q,
        format,
        searchMode,
        worldConnectionsMode,
        threadId,
        (update: any) => {
          console.log("Streaming update:", update);

          switch (update.type) {
            case "thinking":
              // Update the loading message with thinking indicator
              currentContent = "🧠 Thinking...";
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "token":
              // Handle token updates from LLM streaming - show complete content directly
              const tokenContent =
                typeof update.content === "string"
                  ? update.content
                  : update.content && update.content.text
                    ? update.content.text
                    : "";

              if (tokenContent) {
                console.log("Token content:", tokenContent); // Debug log full content

                // Process content based on format
                if (format === "chat") {
                  currentContent = tokenContent;
                } else if (format === "table") {
                  // For table format, also use the token content directly
                  // The table rendering will be handled in the UI layer
                  currentContent = tokenContent;
                }

                hasExtractedFinalAnswer = true;

                // If web worker is available, use it to process the content
                if (chatWorkerRef.current) {
                  chatWorkerRef.current.postMessage({
                    type: "process_message",
                    data: {
                      id: loadingMessageId,
                      content: currentContent,
                    },
                  });
                } else {
                  // Fallback to synchronous update if worker is not available
                  setMessages(m =>
                    m.map(msg =>
                      msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                    )
                  );
                }
              }
              break;

            case "search_query":
              // Show search queries being used
              searchQueries.push(update.content.query);
              currentContent = `🔍 Searching: ${searchQueries.join(", ")}...`;
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "source":
              // Collect sources
              sources.push(update.content);

              // Only update the message with source count if we haven't extracted a final answer yet
              if (!hasExtractedFinalAnswer) {
                currentContent = `📚 Found ${sources.length} source${sources.length > 1 ? "s" : ""}...`;
                setMessages(m =>
                  m.map(msg =>
                    msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                  )
                );
              }

              // If we have enough sources, process them in the worker
              if (sources.length > 0 && sources.length % 5 === 0 && chatWorkerRef.current) {
                chatWorkerRef.current.postMessage({
                  type: "process_search_results",
                  data: { sources },
                });
              }
              break;

            case "message":
              // Final message
              if (update.content && update.content.content) {
                currentContent = update.content.content;
                setMessages(m =>
                  m.map(msg =>
                    msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                  )
                );
              }
              if (update.thread_id && threadId === "new") {
                router.replace(`/chat/${update.thread_id}`);
              }
              break;

            case "error":
              // Handle error
              currentContent = `Something went wrong`;
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "done":
              // All done
              if (sources.length > 0) {
                console.log("Sources gathered:", sources);
                // You could display sources in the UI here
              }

              // Track search completion with duration and result metrics
              posthog.capture("search_completed", {
                query: q,
                agent_id: selectedAgent,
                search_mode: searchMode,
                world_connections_mode: worldConnectionsMode,
                format: format,
                thread_id: threadId,
                duration_ms: Date.now() - searchStartTime,
                sources_count: sources.length,
                search_queries_count: searchQueries.length,
              });
              break;
          }
        }
      );
    } catch (error) {
      console.error("Error sending chat request:", error);

      // Track search error
      posthog.capture("search_error", {
        query: q,
        agent_id: selectedAgent,
        error: error instanceof Error ? error.message : String(error),
      });

      // Replace the loading message with an error
      setMessages(m =>
        m.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content:
                  "Sorry, there was an error processing your request. Please try again later.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();

      // Track search via Enter key
      posthog.capture("search_input_method", { method: "enter_key" });
    } else if (e.key === "Enter" && e.shiftKey) {
      // Allow new line on Shift+Enter
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { profile } = useAppSelector(state => state.profile);
  // Create personalized greeting with user's name if available
  const getPersonalizedGreeting = () => {
    const baseGreeting = getTimeBasedGreeting();
    if (profile?.full_name) {
      const firstName = profile.full_name.split(" ")[0];
      return `${baseGreeting}, ${firstName}`;
    }
    return baseGreeting;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // Corresponds to max-h-[120px]
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query]);

  // Function to handle feedback button clicks
  const handleFeedback = (messageId: string, isPositive: boolean) => {
    // Track feedback click
    posthog.capture("feedback_given", {
      message_id: messageId,
      thread_id: threadId,
      feedback: isPositive ? "positive" : "negative",
    });

    if (isPositive) {
      // Submit positive feedback directly
      handleFeedbackSubmit({
        messageId,
        isPositive,
        comment: "",
      });
    } else {
      // Open feedback modal for negative feedback
      setCurrentFeedback({
        messageId,
        isPositive,
        comment: "",
      });
      setFeedbackModalOpen(true);
    }
  };

  // Function to handle feedback submission
  const handleFeedbackSubmit = async (feedback: FeedbackType) => {
    try {
      // For debugging - log the threadId to make sure it's not undefined
      console.log("Thread ID:", threadId);
      console.log("Message ID:", feedback.messageId);

      // Get user ID from Supabase auth session
      console.log("Getting Supabase auth session...");
      const authResponse = await supabase.auth.getSession();
      console.log("Auth response:", authResponse);

      const session = authResponse.data.session;
      console.log("Session:", session ? "Found" : "Not found");

      const userId = session?.user?.id;

      if (!userId) {
        console.error("No user ID found. User might not be authenticated.");
        // Fallback to a hardcoded ID for testing if needed
        // const fallbackId = "06f7e3ea-162c-46a4-a494-4459dd4bea10";
        // console.log("Using fallback user ID:", fallbackId);
        return;
      }

      console.log("Using user ID from session:", userId);

      // Send feedback to backend API
      console.log("Sending feedback to API...");
      await apiClient.sendFeedback({
        message_id: feedback.messageId,
        thread_id: threadId,
        is_positive: feedback.isPositive,
        comment: feedback.comment || "",
        user_id: userId,
      });
      console.log("Feedback sent successfully");

      // Track successful feedback submission with structured logging pattern
      posthog.capture("feedback_submitted", {
        message_id: feedback.messageId,
        thread_id: threadId,
        is_positive: feedback.isPositive,
        has_comment: !!feedback.comment,
      });

      console.log("Feedback submitted successfully");

      // You could add a toast notification here to confirm submission
    } catch (error) {
      console.error("Error submitting feedback:", error);

      // Track failed feedback submission with structured error logging
      posthog.capture("feedback_submission_failed", {
        message_id: feedback.messageId,
        thread_id: threadId,
        error: error instanceof Error ? error.message : String(error),
      });

      // You could add an error toast notification here
    }
  };

  return (
    <div>
      <div
        className={`transition-all duration-300 relative z-10 ${sidebarCollapsed ? "ml-5" : "ml-12"} px-4 pt-8  flex flex-col ${
          messages.length ? "pt-1 pb-1" : "min-h-screen justify-start"
        }`}
      >
        <div
          className={`transition-all duration-500 text-center ${messages.length ? "py-4" : "mb-8"}`}
        >
          {!(messages?.length && messages.length > 0) && <OrbAura />}
          <h1
            className={`font-bold -mt-3 mb-2 ${darkMode ? "text-white" : "text-gray-900"} ${
              messages.length ? "text-2xl" : "text-4xl"
            }`}
          >
            {getPersonalizedGreeting()}
            <div className="mt-2">
              <span>What's on </span>
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text font-bold">
                your mind?
              </span>
            </div>
          </h1>
          {!messages.length && (
            <p className="text-gray-600 text-base sm:text-lg mt-6">
              Our AI filters through millions of profiles to surface truly relevant people, faster
              and more precisely than traditional platforms.
            </p>
          )}
        </div>

        <div
          className={`max-w-4xl mx-auto w-full ${messages.length ? "mb-2" : "mb-8"} transition-all duration-500`}
        >
          <div className="relative flex justify-center">
            <div
              className={`flex items-center flex-col rounded-2xl px-6 py-4 shadow-lg transition-all duration-200 focus-within:shadow-xl w-full max-w-3xl ${
                darkMode
                  ? "border border-gray-700 bg-gray-900/80 hover:border-gray-600"
                  : "border border-gray-200 bg-white hover:border-gray-300"
              }`}
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className=" flex flex-row w-full items-center">
                <Search
                  className={`h-5 w-5 mr-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                />
                <Textarea
                  placeholder="Search for people by skills, experience, or interests… (Shift+Enter for new line)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  ref={textareaRef}
                  onKeyDown={onKey}
                  rows={1}
                  className={`
                    flex bg-transparent text-base resize-none
                    border-0 focus:border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0
                    min-h-[40px] max-h-[120px]
                    ${darkMode ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-500"}
                  `}
                />
              </div>
              <div className=" flex flex-row justify-between w-full mt-2">
                <div className="flex items-center gap-2 mr-2">
                  <div className="flex space-x-2">
                    <SearchModeToggle
                      searchMode={searchMode}
                      darkMode={darkMode}
                      setSearchMode={(mode: "basic" | "deep") => {
                        posthog.capture("search_mode_changed", { mode });
                        setSearchMode(mode);
                      }}
                    />
                    <FormatToggle
                      format={format}
                      darkMode={darkMode}
                      setFormat={(mode: "chat" | "table") => {
                        posthog.capture("format_changed", { mode });
                        setFormat(mode);
                      }}
                    />
                    <WorldConnectionsToggle
                      worldConnectionsMode={worldConnectionsMode}
                      darkMode={darkMode}
                      setWorldConnectionsMode={(mode: "connections" | "world") => {
                        posthog.capture("world_connections_mode_changed", { mode });
                        setWorldConnectionsMode(mode);
                      }}
                    />
                  </div>
                </div>

                {/* Agent Selector */}
                <div className="relative z-[100]">
                  <Button
                    variant="ghost"
                    ref={toggleBtnRef}
                    onClick={() => setShowAgentDropdown(s => !s)}
                    disabled={agentsStatus === "loading"}
                    className={`
                      flex items-center gap-2 rounded-full px-4 py-1 border mr-3 
                      transition-all duration-200 shadow-sm hover:shadow h-[26px]
                      ${agentsStatus === "loading" ? "cursor-not-allowed opacity-60" : ""}
                      ${
                        darkMode
                          ? "border-gray-700/60 bg-gray-800/80 text-gray-200 hover:bg-gray-700/90"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    {agentsStatus === "loading" ? (
                      <>
                        <span className="block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span className="text-sm font-medium">Loading...</span>
                      </>
                    ) : (
                      <>
                        {agentData?.agentImageUrl ? (
                          <div className="relative w-4 h-4 rounded-full overflow-hidden">
                            <Image
                              src={agentData.agentImageUrl}
                              alt={`${agentData.name} avatar`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <span className="flex items-center justify-center w-4 h-4 text-md">
                            {agentData?.avatar}
                          </span>
                        )}
                        <span className="text-[12px] font-medium">{agentData?.name}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showAgentDropdown ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </Button>

                  {showAgentDropdown && (
                    <div
                      ref={dropdownRef}
                      className={`absolute right-0 top-full mt-2 w-[240px] rounded-xl shadow-xl z-[500] overflow-hidden
                    transform transition-all duration-200 origin-top-right
                    animate-in fade-in slide-in-from-top-5 zoom-in-95
                    ${
                      darkMode
                        ? "bg-gray-900 border border-gray-700/70"
                        : "bg-white border border-gray-200"
                    }`}
                    >
                      <div
                        className={`px-4 py-3 border-b ${darkMode ? "border-gray-700/70" : "border-gray-200"}`}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            Select Agent
                          </p>
                          <div
                            className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}
                          >
                            {agentCards.length} agents
                          </div>
                        </div>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {agentsStatus === "loading" ? (
                          <div className="p-6 flex flex-col items-center justify-center gap-2">
                            <span className="block h-6 w-6 rounded-full border-2 border-current border-t-transparent animate-spin text-blue-500" />
                            <p className="text-sm text-gray-500">Loading your agents...</p>
                          </div>
                        ) : agentCards.length === 0 ? (
                          <div className="p-6 text-center">
                            <p
                              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              No agents available
                            </p>
                            <Link
                              href="/marketplace"
                              className={`mt-2 inline-block text-sm font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                            >
                              Visit marketplace
                            </Link>
                          </div>
                        ) : (
                          <>
                            <div className="pt-1">
                              {agentCards.filter(a => a.hired).length > 0 && (
                                <div
                                  className={`px-4 py-1.5 text-xs font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                                >
                                  Your agents
                                </div>
                              )}
                              {agentCards
                                .filter(a => a.hired)
                                .map(a => (
                                  <button
                                    type="button"
                                    key={a.id}
                                    onClick={e => handleAgentSelect(e, a.id, a.hired)}
                                    className={`w-full flex items-center justify-between px-4 py-1 text-left transition-colors text-sm
                                      ${
                                        agentData?.id === a.id
                                          ? darkMode
                                            ? "bg-gray-800/80"
                                            : "bg-gray-100/80"
                                          : darkMode
                                            ? "hover:bg-gray-800/40"
                                            : "hover:bg-gray-50"
                                      }
                                      ${darkMode ? "text-gray-300" : "text-gray-900"}
                                    `}
                                  >
                                    <span className="flex items-center gap-3">
                                      {a?.agentImageUrl ? (
                                        <div className="relative w-7 h-7 rounded-full overflow-hidden">
                                          <Image
                                            src={a.agentImageUrl}
                                            alt={`${a.name} avatar`}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <span
                                          className={`flex items-center justify-center w-7 h-7 text-xl rounded-full
                                          ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}
                                        >
                                          {a?.avatar}
                                        </span>
                                      )}
                                      <span className="font-medium ">{a?.name}</span>
                                    </span>
                                    {agentData?.id === a.id && (
                                      <Check className="h-5 w-5 text-blue-500" />
                                    )}
                                  </button>
                                ))}
                            </div>

                            {agentCards.filter(a => !a.hired).length > 0 && (
                              <>
                                <div
                                  className={`pt-1 pb-2 border-t ${darkMode ? "border-gray-800" : "border-gray-100"}`}
                                >
                                  <div
                                    className={`px-4 py-1.5 text-xs font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                                  >
                                    Available to hire
                                  </div>
                                  {agentCards
                                    .filter(a => !a.hired)
                                    .map(a => (
                                      <button
                                        type="button"
                                        key={a.id}
                                        onClick={e => handleAgentSelect(e, a.id, a.hired)}
                                        className={`w-full flex items-center justify-between px-4 py-1 text-left transition-colors text-sm
                                          ${darkMode ? "hover:bg-gray-800/40 text-gray-400" : "hover:bg-gray-50 text-gray-600"}
                                        `}
                                      >
                                        <span className="flex items-center gap-3">
                                          {a?.agentImageUrl ? (
                                            <div className="relative w-7 h-7 rounded-full overflow-hidden">
                                              <Image
                                                src={a.agentImageUrl}
                                                alt={`${a.name} avatar`}
                                                fill
                                                className="object-cover"
                                              />
                                            </div>
                                          ) : (
                                            <span
                                              className={`flex items-center justify-center w-7 h-7 text-xl rounded-full
                                              ${darkMode ? "bg-gray-800/50" : "bg-gray-100"}`}
                                            >
                                              {a?.avatar}
                                            </span>
                                          )}
                                          <span>{a?.name}</span>
                                        </span>
                                        <span
                                          className={`text-xs px-2.5 py-1 rounded-full font-medium
                                            ${
                                              darkMode
                                                ? "bg-blue-900/30 text-blue-300 border border-blue-800/30"
                                                : "bg-blue-50 text-blue-600 border border-blue-100"
                                            }
                                          `}
                                        >
                                          Hire
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Button */}
              {/* <Button
                onClick={() => handleSearch()}
                disabled={!query.trim() || isLoading}
                className={`rounded-full px-6 py-2 text-white font-semibold transition-all duration-200 ${
                  !query.trim() || isLoading
                  ? darkMode
                  ? "bg-gray-800 cursor-not-allowed"
                  : "bg-gray-300 cursor-not-allowed"
                  : darkMode
                  ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:to-indigo-600"
                  : "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 hover:to-indigo-600"
                  }`}
                  >
                  Search
                  </Button> */}
            </div>
          </div>
          {!(messages.length > 0) && (
            <div className="flex  flex-col w-full z-[5] mt-3">
              {[
                { category: TagCategories.GENERAL, speed: 0.4 },
                { category: TagCategories.SALES, speed: 0.8 },
                { category: TagCategories.HR, speed: 0.5 },
              ].map((item, index) => (
                <TagCarousel
                  key={index}
                  onTagClick={handleTagClick}
                  category={item.category}
                  scrollSpeed={item.speed}
                />
              ))}
            </div>
          )}
          {chatPairs.length > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMessageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentMessageIndex === 0}
                className={`rounded-full transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span
                className={`text-sm font-medium tabular-nums ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {currentMessageIndex + 1} of {chatPairs.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentMessageIndex(prev => Math.min(chatPairs.length - 1, prev + 1))
                }
                disabled={currentMessageIndex === chatPairs.length - 1}
                className={`rounded-full transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {messages?.length && messages.length > 0 && (
        <div className="w-full mt-2">
          <div className="mb-4">
            <h2 className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Results
            </h2>
          </div>

          <div className="space-y-6">
            {messages.map(
              m =>
                m.type === "agent" && (
                  <div
                    key={m.id}
                    className={`rounded-xl p-6 transition-shadow ${
                      darkMode
                        ? "bg-gray-900/70 border border-gray-700 shadow-md hover:shadow-lg"
                        : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start">
                      <div
                        className={`rounded-full  mr-4 justify-center items-center h-12 w-12 bg-blue-50`}
                      >
                        <div className={`h-12 w-12 text-blue-600`}>
                          <OrbAura />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {format === "table" && parseStructuredData(m.content).isStructured ? (
                            renderAsTable(m.content)
                          ) : isStructuredResearchResult(m.content) ? (
                            <StructuredContentRenderer content={m.content} darkMode={darkMode} />
                          ) : (
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          )}
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <span
                            title={getFullTimestamp(m.timestamp)}
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} hover:${darkMode ? "text-gray-300" : "text-gray-600"} transition-colors cursor-default flex items-center`}
                          >
                            <ClockIcon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                            {formatTimestamp(m.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`rounded-full h-8 w-8 ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                              onClick={() => handleFeedback(m.id, true)}
                            >
                              <ThumbsUp
                                className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"} hover:text-green-500`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`rounded-full h-8 w-8 ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                              onClick={() => handleFeedback(m.id, false)}
                            >
                              <ThumbsDown
                                className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"} hover:text-red-500`}
                              />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent
          className={`sm:max-w-md ${darkMode ? "bg-gray-900 border-gray-700" : "bg-white"}`}
        >
          <DialogHeader>
            <DialogTitle className={darkMode ? "text-white" : "text-gray-900"}>
              {currentFeedback?.isPositive ? "What was helpful?" : "What went wrong?"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={
                currentFeedback?.isPositive
                  ? "Tell us what was helpful about this response..."
                  : "Tell us what went wrong with this response..."
              }
              value={currentFeedback?.comment || ""}
              onChange={e =>
                setCurrentFeedback(prev => (prev ? { ...prev, comment: e.target.value } : null))
              }
              className={`min-h-[100px] ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
              }`}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button
                variant="outline"
                className={
                  darkMode
                    ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (currentFeedback) {
                  handleFeedbackSubmit(currentFeedback);
                  setFeedbackModalOpen(false);
                  setCurrentFeedback(null);
                }
              }}
              className={
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatThreadView;
