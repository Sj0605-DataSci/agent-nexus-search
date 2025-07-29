"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatTimestamp, getFullTimestamp } from "@/utils/timeUtils";
import { showSuccessToast, showErrorToast } from "@/utils/toastManager";
import {
  FiSearch,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiThumbsUp,
  FiThumbsDown,
  FiClock,
  FiLink,
  FiExternalLink,
  FiInfo,
  FiRefreshCw,
} from "react-icons/fi";
import { BsTextParagraph } from "react-icons/bs";
import { getTimeBasedGreeting } from "../../utils/timeUtils";
import Image from "next/image";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { addChatThread } from "@/store/chatThreadsSlice";
import { apiClient } from "@/integrations/fastapi/client";
import { loadAgents, selectAgentCards, selectAgentsStatus } from "@/store/agentsSlice";
import SearchModeToggle from "./SearchModeToggle";
import WorldConnectionsToggle from "./WorldConnectionsToggle";
import FormatToggle from "./FormatToggle";
import TagCarousel, { TagCategories } from "./TagCarousel";
import StructuredContentRenderer, { isStructuredResearchResult } from "./StructuredContentRenderer";
import { parseStructuredData, renderAsTable } from "./StructuredDataUtils";
import Link from "next/link";
import OrbAura from "../OrbAura";
import { ProcessCitationReferences, SourceType } from "../common/Citation";

type FeedbackType = {
  messageId: string;
  isPositive: boolean;
  comment?: string;
};

type MessageType = {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: Date;
  sources?: SourceType[];
  sources_gathered?: SourceType[];
};

const ChatThreadView = ({ threadId }: { threadId: string }) => {
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
  const [messages, setMessages] = useState<MessageType[]>([]);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "sources">("content");
  const [chatPairs, setChatPairs] = useState<any[]>([]);
  const [messagesOffset, setMessagesOffset] = useState<number>(0);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const MESSAGES_PER_PAGE = 50;
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [cachedThreads, setCachedThreads] = useState<
    Record<string, { messages: any[]; timestamp: number }>
  >({});
  const { profile } = useAppSelector(state => state.profile);

  const userId = profile?.id;

  const loadMoreMessages = async () => {
    if (!threadId || !hasMoreMessages) return;

    try {
      const messagesResponse = await apiClient.getChatMessages(threadId);

      if (messagesResponse.messages && messagesResponse.messages.length > 0) {
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

  useEffect(() => {
    if (agentsStatus === "idle") dispatch(loadAgents());

    posthog.capture("chat_thread_viewed", {
      thread_id: threadId,
      is_new_thread: threadId === "new",
    });

    if (typeof window !== "undefined") {
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

      if (window.Worker) {
        chatWorkerRef.current = new Worker("/chatWorker.js");

        chatWorkerRef.current.onmessage = event => {
          const { type, data } = event.data;

          switch (type) {
            case "processed_message":
              setMessages(prevMessages =>
                prevMessages.map(msg =>
                  msg.id === data.id ? { ...msg, content: data.content } : msg
                )
              );
              break;

            case "processed_search_results":
              console.log("Processed search results:", data.sources);
              break;

            case "query_analysis":
              console.log("Query analysis:", data);
              break;
          }
        };
      }
    }

    return () => {
      if (chatWorkerRef.current) {
        chatWorkerRef.current.terminate();
      }
    };
  }, [agentsStatus, dispatch, threadId]);

  const fetchMessages = async (forceRefresh = false) => {
    if (!threadId) return;

    if (cachedThreads[threadId] && initialLoadComplete && !forceRefresh) {
      const { messages: cachedMessages, timestamp } = cachedThreads[threadId];
      const cacheAge = Date.now() - timestamp;
      // Use cached data if it's less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        setChatPairs(cachedMessages);
        setCurrentMessageIndex(cachedMessages.length - 1);
        return;
      }
    }

    setIsLoading(true);
    try {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      const messagesResponse = await apiClient.getChatMessages(threadId);
      setMessagesOffset(MESSAGES_PER_PAGE);
      setHasMoreMessages(messagesResponse.total > MESSAGES_PER_PAGE);

      if (messagesResponse.messages?.length > 0) {
        setChatPairs(messagesResponse.messages);
        setCurrentMessageIndex(messagesResponse.messages.length - 1);
        setCachedThreads(prev => ({
          ...prev,
          [threadId]: {
            messages: messagesResponse.messages,
            timestamp: Date.now(),
          },
        }));
      } else {
      }
      setInitialLoadComplete(true);
    } catch (error: any) {
      console.log("[ChatThreadView] fetchMessages error:", error);
      let message = "An error occurred while loading this chat thread.";
      if (error?.response?.status === 404) {
        message = "This chat thread was not found.";
      } else if (error?.response?.status === 403) {
        message = "You do not have access to this chat thread.";
      }
      console.log("[ChatThreadView] threadError:", message);
      setChatPairs([]);
      setCurrentMessageIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (threadId) {
      fetchMessages();
    }
  }, [threadId]);

  useEffect(() => {
    return () => {
      setInitialLoadComplete(false);
    };
  }, []);

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
      const sourcesData = currentPair.sources_gathered || [];
      console.log("Sources data from API:", sourcesData);

      if (chatWorkerRef.current && typeof messageContent === "object" && messageContent !== null) {
        const agentMessage = {
          id: currentPair.id,
          type: "agent" as const,
          content: "Processing message...",
          timestamp: new Date(currentPair.updated_at),
          sources: sourcesData,
        };

        setMessages([userMessage, agentMessage]);
        chatWorkerRef.current.postMessage({
          type: "process_message",
          data: {
            id: currentPair.id,
            content: messageContent,
          },
        });
      } else {
        if (typeof messageContent === "object" && messageContent !== null) {
          messageContent = JSON.stringify(messageContent, null, 2);
        }

        const agentMessage = {
          id: currentPair.id,
          type: "agent" as const,
          content: messageContent,
          timestamp: new Date(currentPair.updated_at),
          sources: sourcesData,
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
    e.stopPropagation();

    if (!hired) {
      posthog.capture("agent_marketplace_redirect", { agent_id: id });
      router.push(`/marketplace?agent=${id}`);
      return;
    }

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

    if (chatWorkerRef.current) {
      chatWorkerRef.current.postMessage({
        type: "analyze_query",
        data: { query: q },
      });
    }

    posthog.capture("search_initiated", {
      query: q,
      agent_id: selectedAgent,
      search_mode: searchMode,
      world_connections_mode: worldConnectionsMode,
      format: format,
      thread_id: threadId,
    });

    const userMessageId = Date.now().toString();
    setMessages(m => [
      ...m,
      {
        id: userMessageId,
        type: "user",
        content: q,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    const newLoadingMessageId = (Date.now() + 1).toString();
    setMessages(m => [
      ...m,
      {
        id: newLoadingMessageId,
        type: "agent",
        content: "⏳ Searching for information...",
        timestamp: new Date(),
      },
    ]);

    try {
      if (!userId) {
        console.error("No user ID found. User might not be authenticated.");
        setMessages(m =>
          m.map(msg =>
            msg.id === newLoadingMessageId
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
      let fullContent = "";
      let sources: any[] = [];
      let searchQueries: string[] = [];
      let hasExtractedFinalAnswer = false;
      let lastUpdateTime = Date.now();
      let updateDebounceMs = 100;

      const searchStartTime = Date.now();

      const updateMessageContent = (content: string) => {
        const now = Date.now();
        if (now - lastUpdateTime > updateDebounceMs) {
          setMessages(m =>
            m.map(msg => (msg.id === newLoadingMessageId ? { ...msg, content } : msg))
          );
          lastUpdateTime = now;
        }
      };

      await apiClient.sendStreamingChatRequest(
        agentData.id,
        q,
        format,
        searchMode,
        worldConnectionsMode,
        threadId,
        (update: any) => {
          console.log("Streaming update:", update);

          switch (update.type) {
            case "thread_id":
              if (update.content && update.content.thread_id) {
                const newUrl = `/chat/${update.content.thread_id}`;
                window.history.replaceState({ path: newUrl }, "", newUrl);

                dispatch(
                  addChatThread({
                    id: update.content.thread_id,
                    query: q,
                  })
                );
              }
              break;

            case "thinking":
              currentContent = "🧠 Thinking...";
              updateMessageContent(currentContent);
              break;

            case "token":
              const tokenContent =
                typeof update.content === "string"
                  ? update.content
                  : update.content && update.content.text
                    ? update.content.text
                    : "";

              if (tokenContent) {
                if (update.content && update.content.text) {
                  fullContent = tokenContent;
                  currentContent = fullContent;
                  hasExtractedFinalAnswer = true;
                }

                if (format === "chat" || format === "table") {
                  if (chatWorkerRef.current) {
                    chatWorkerRef.current.postMessage({
                      type: "process_message",
                      data: {
                        id: newLoadingMessageId,
                        content: currentContent,
                      },
                    });
                  } else {
                    updateMessageContent(currentContent);
                  }
                }
              }
              break;

            case "search_query":
              if (update.content && update.content.query) {
                searchQueries.push(update.content.query);
                if (!hasExtractedFinalAnswer) {
                  currentContent = `🔍 Searching: ${searchQueries.join(", ")}...`;
                  updateMessageContent(currentContent);
                }
              }
              break;

            case "source":
              if (update.content) {
                sources.push(update.content);

                if (!hasExtractedFinalAnswer) {
                  currentContent = `📚 Found ${sources.length} source${sources.length > 1 ? "s" : ""}...`;
                  updateMessageContent(currentContent);
                }

                if (sources.length > 0 && sources.length % 5 === 0 && chatWorkerRef.current) {
                  chatWorkerRef.current.postMessage({
                    type: "process_search_results",
                    data: { sources },
                  });
                }
              }
              break;

            case "message":
              if (update.content && update.content.content) {
                currentContent = update.content.content;
                updateMessageContent(currentContent);
              }
              if (update.thread_id && threadId === "new") {
                router.replace(`/chat/${update.thread_id}`);
              }
              break;

            case "error":
              const errorMessage =
                update.content && update.content.message
                  ? update.content.message
                  : "Something went wrong. Please try again.";

              currentContent = `❌ Error: ${errorMessage}`;
              updateMessageContent(currentContent);

              console.error("Stream error:", update.content);

              posthog.capture("stream_error", {
                query: q,
                agent_id: selectedAgent,
                error: errorMessage,
              });
              break;

            case "done":
              if (fullContent) {
                updateMessageContent(fullContent);
              }

              if (sources.length > 0) {
                console.log("Sources gathered:", sources);

                setMessages(m =>
                  m.map(msg => (msg.id === newLoadingMessageId ? { ...msg, sources } : msg))
                );
              }

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
                has_answer: hasExtractedFinalAnswer,
              });
              break;

            case "connected":
              console.log("Stream connected");
              break;

            default:
              console.warn("Unknown update type:", update.type);
              break;
          }
        }
      );
    } catch (error) {
      console.error("Error sending chat request:", error);

      posthog.capture("search_error", {
        query: q,
        agent_id: selectedAgent,
        error: error instanceof Error ? error.message : String(error),
      });

      setMessages(m =>
        m.map(msg =>
          msg.id === newLoadingMessageId
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

      posthog.capture("search_input_method", { method: "enter_key" });
    } else if (e.key === "Enter" && e.shiftKey) {
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query]);

  const handleFeedback = (messageId: string, isPositive: boolean) => {
    posthog.capture("feedback_given", {
      message_id: messageId,
      thread_id: threadId,
      feedback: isPositive ? "positive" : "negative",
    });

    if (isPositive) {
      handleFeedbackSubmit({
        messageId,
        isPositive,
        comment: "",
      });
    } else {
      setCurrentFeedback({
        messageId,
        isPositive,
        comment: "",
      });
      setFeedbackModalOpen(true);
    }
  };

  const handleFeedbackSubmit = async (feedback: FeedbackType) => {
    try {
      if (!userId) {
        return;
      }

      const response = await apiClient.sendFeedback({
        message_id: feedback.messageId,
        is_positive: feedback.isPositive,
        comment: feedback.comment || "",
      });

      if (response && response.success) {
        showSuccessToast("Feedback submitted successfully");
      }

      posthog.capture("feedback_submitted", {
        message_id: feedback.messageId,
        thread_id: threadId,
        is_positive: feedback.isPositive,
        has_comment: !!feedback.comment,
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to submit feedback";
      const statusCode = error?.response?.status || 500;

      showErrorToast("Failed to submit feedback", `Status: ${statusCode}`);

      posthog.capture("feedback_submission_failed", {
        message_id: feedback.messageId,
        thread_id: threadId,
        error: error instanceof Error ? error.message : String(error),
      });
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
          <div className="items-center justify-center h-20 ">
            {/* {!(messages?.length && messages.length > 0) && <OrbAura />} */}
          </div>
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
                <FiSearch
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
                        <FiChevronDown
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
                                      <FiCheck className="h-5 w-5 text-blue-500" />
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
                <FiChevronLeft className="h-5 w-5" />
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
                <FiChevronRight className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setInitialLoadComplete(false);
                  fetchMessages(true);
                }}
                className={`ml-2 rounded-full transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
                title="Refresh thread"
              >
                <FiRefreshCw className="h-4 w-4" />
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
            {messages.map(m => {
              // Debug log to check sources
              if (m.type === "agent" && m.sources) {
                console.log(`Message ${m.id} has ${m.sources.length} sources:`, m.sources);
              }

              return (
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
                        {m.sources && m.sources.length > 0 ? (
                          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                              <li className="mr-2">
                                <button
                                  onClick={() => setActiveTab("content")}
                                  className={`inline-flex items-center justify-center p-2 px-3 border-b-1 ${
                                    activeTab === "content"
                                      ? `${darkMode ? "text-blue-500 border-blue-500 font-semibold" : "text-blue-600 border-blue-600 font-semibold"}`
                                      : `${darkMode ? "text-gray-400 border-transparent hover:text-gray-300" : "text-gray-500 border-transparent hover:text-gray-600"}`
                                  } transition-all duration-200`}
                                >
                                  <BsTextParagraph className="w-4 h-4 mr-2" />
                                  Content
                                </button>
                              </li>
                              <li className="mr-2">
                                <button
                                  onClick={() => setActiveTab("sources")}
                                  className={`inline-flex items-center justify-center p-2 px-3 border-b-1 ${
                                    activeTab === "sources"
                                      ? `${darkMode ? "text-blue-500 border-blue-500 font-semibold" : "text-blue-600 border-blue-600 font-semibold"}`
                                      : `${darkMode ? "text-gray-400 border-transparent hover:text-gray-300" : "text-gray-500 border-transparent hover:text-gray-600"}`
                                  } transition-all duration-200`}
                                >
                                  <FiLink className="w-4 h-4 mr-2" />
                                  Sources
                                  <span
                                    className={`ml-2 px-2 py-0.5 text-xs rounded-full ${darkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}`}
                                  >
                                    {m.sources.length}
                                  </span>
                                </button>
                              </li>
                            </ul>
                          </div>
                        ) : null}

                        {(!m.sources || m.sources.length === 0 || activeTab === "content") && (
                          <div className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {m.content === null ? (
                              <div className="flex items-center">
                                <div className=" mr-2">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                </div>
                                <p className="italic">Query seems empty, Please Search again.</p>
                              </div>
                            ) : format === "table" &&
                              parseStructuredData(m.content).isStructured ? (
                              renderAsTable(
                                m.content,
                                darkMode,
                                messagesContainerRef,
                                hasMoreMessages,
                                loadMoreMessages
                              )
                            ) : isStructuredResearchResult(m.content) ? (
                              <StructuredContentRenderer content={m.content} darkMode={darkMode} />
                            ) : (
                              ProcessCitationReferences(m.content, m.sources || [])
                            )}
                          </div>
                        )}

                        {((m.sources && m.sources.length > 0) ||
                          (m.sources_gathered && m.sources_gathered.length > 0)) &&
                          activeTab === "sources" && (
                            <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} mt-2`}>
                              <div className="mb-3 flex items-center">
                                <FiInfo className="w-4 h-4 mr-2 text-blue-500" />
                                <span className="text-sm text-opacity-80">
                                  {m.sources?.length || m.sources_gathered?.length
                                    ? `${m.sources?.length || m.sources_gathered?.length} ${(m.sources?.length || m.sources_gathered?.length) === 1 ? "source" : "sources"} used to generate this response`
                                    : "No sources available"}
                                </span>
                              </div>
                              <ul className="space-y-3">
                                {(
                                  (m.sources && m.sources.length > 0
                                    ? m.sources
                                    : m.sources_gathered) || []
                                ).map((source: any, index: number) => {
                                  // Normalize source object to handle both formats
                                  const src = source?.value
                                    ? source
                                    : {
                                        value: source,
                                        title: `Source ${index + 1}`,
                                        short_url: `[${index + 1}]`,
                                      };

                                  return (
                                    <li
                                      key={index}
                                      className={`p-4 rounded-lg ${
                                        darkMode
                                          ? "bg-gray-800/50 hover:bg-gray-800/70"
                                          : "bg-gray-100/70 hover:bg-gray-100"
                                      } transition-colors duration-150 border ${
                                        darkMode ? "border-gray-700" : "border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-start">
                                        <div
                                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-3 ${
                                            darkMode
                                              ? "bg-blue-900/50 text-blue-300"
                                              : "bg-blue-100 text-blue-700"
                                          }`}
                                        >
                                          <span className="text-xs font-medium">
                                            {src.short_url || `[${index + 1}]`}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4
                                            className={`text-sm font-medium ${
                                              darkMode ? "text-gray-200" : "text-gray-800"
                                            } line-clamp-2`}
                                            title={src.title || "Untitled Source"}
                                          >
                                            {src.title || "Untitled Source"}
                                          </h4>
                                          <div className="flex items-center justify-between mt-2">
                                            <a
                                              href={src.value || "#"}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`text-xs flex items-center ${
                                                darkMode
                                                  ? "text-blue-400 hover:text-blue-300"
                                                  : "text-blue-600 hover:text-blue-500"
                                              } hover:underline truncate max-w-[70%]`}
                                              title={src.value}
                                            >
                                              {src.short_url || `Source ${index + 1}`}
                                              <FiExternalLink className="ml-1 w-3 h-3 flex-shrink-0" />
                                            </a>
                                            <a
                                              href={src.value || "#"}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`ml-2 px-2 py-1 text-xs rounded ${
                                                darkMode
                                                  ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                              } transition-colors duration-150 flex items-center whitespace-nowrap`}
                                            >
                                              <FiExternalLink className="mr-1 w-3 h-3" />
                                              Visit
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                                {!m.sources?.length && !m.sources_gathered?.length && (
                                  <li className="p-4 text-center text-gray-500">
                                    No sources available
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                        <div className="mt-4 flex justify-between items-center">
                          <span
                            title={getFullTimestamp(m.timestamp)}
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} hover:${darkMode ? "text-gray-300" : "text-gray-600"} transition-colors cursor-default flex items-center`}
                          >
                            <FiClock className="h-3.5 w-3.5 mr-1.5 inline-block" />
                            {formatTimestamp(m.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Only show feedback buttons when not loading (streaming is complete) and for agent messages */}
                            {!isLoading && m.type === "agent" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`rounded-full h-8 w-8 ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                                  onClick={() => handleFeedback(m.id, true)}
                                >
                                  <FiThumbsUp
                                    className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"} hover:text-green-500`}
                                  />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`rounded-full h-8 w-8 ${darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                                  onClick={() => handleFeedback(m.id, false)}
                                >
                                  <FiThumbsDown
                                    className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"} hover:text-red-500`}
                                  />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              );
            })}
          </div>
        </div>
      )}

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
