"use client";
import React, { useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { formatTimestamp, getFullTimestamp } from "@/utils/timeUtils";
import { ChatNavigationControls } from "./ChatNavigationControls";
import { AgentDropdown } from "./AgentDropdown";
import { showSuccessToast, showErrorToast } from "@/utils/toastManager";
import { FiSearch, FiClock, FiThumbsUp, FiThumbsDown, FiLink } from "react-icons/fi";
import { BsTextParagraph } from "react-icons/bs";
import SourcesList from "./SourcesList";
import { getTimeBasedGreeting } from "../../utils/timeUtils";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import SearchInputField from "./SearchInputField";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { addChatThread } from "@/store/chatThreadsSlice";
import { apiClient } from "@/integrations/fastapi/client";
import { loadAgents, selectAgentCards, selectAgentsStatus } from "@/store/agentsSlice";
import SearchModeToggle from "./SearchModeToggle";
import WorldConnectionsToggle from "./WorldConnectionsToggle";
import FormatToggle from "./FormatToggle";
import TagCarousel, { TagCategories } from "./TagCarousel";
import { parseStructuredData, renderAsTable } from "./StructuredDataUtils";
import OrbAura from "../OrbAura";
import dynamic from "next/dynamic";
import StyledMarkdown from "../common/StyledMarkdown";

const FeedbackModal = dynamic(() => import("./FeedbackModal"));
const LinkedInUrlModal = dynamic(() => import("../profile/LinkedInUrlModal"), { ssr: false });

import {
  ChatSource,
  SearchMode,
  FormatType,
  WorldConnectionsMode,
  FeedbackType,
  MessageType,
} from "@/types/chat";
import { WorkerMessage } from "@/types/api";
import { ChatPair, CachedThread, ChatThreadViewProps } from "@/types/chatThreadView";

const ChatThreadView: React.FC<ChatThreadViewProps> = ({ threadId }) => {
  const chatWorkerRef = useRef<Worker | null>(null);
  const router = useRouter();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>(
    "00000000-0000-4000-a000-000000000000"
  );
  const [format, setFormat] = useState<FormatType>("table");
  const [searchMode, setSearchMode] = useState<SearchMode>("basic");
  const [worldConnectionsMode, setWorldConnectionsMode] = useState<WorldConnectionsMode>("world");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState<boolean>(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "sources">("content");
  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [messagesOffset, setMessagesOffset] = useState<number>(0);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(threadId != "new");
  const [cachedThreads, setCachedThreads] = useState<Record<string, CachedThread>>({});
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingSearchQueries, setStreamingSearchQueries] = useState<string[]>([]);
  const [showSearchQueries, setShowSearchQueries] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, boolean>>({});

  const MESSAGES_PER_PAGE = 50;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTitle = urlParams.get("title");

      if (urlTitle !== null) {
        setQuery(urlTitle);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("title");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, []);
  const { profile } = useAppSelector(state => state.profile);

  const userId = profile?.id;

  const loadMoreMessages = async () => {
    if (!threadId || !hasMoreMessages) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

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
      if (cacheAge < 5 * 60 * 1000) {
        setChatPairs(cachedMessages);
        setCurrentMessageIndex(cachedMessages.length - 1);
        setIsLoading(false); 
        return;
      }
    }
    setIsLoading(true);
    try {
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
      }
      setInitialLoadComplete(true);
    } catch (error: unknown) {
      console.error("[ChatThreadView] fetchMessages error:", error);
      let message = "An error occurred while loading this chat thread.";

      interface ErrorResponse {
        response?: {
          status?: number;
          data?: {
            detail?: string;
          };
        };
      }

      const typedError = error as ErrorResponse;

      if (typedError.response?.status === 404) {
        message = "This chat thread was not found.";
      } else if (typedError.response?.status === 403) {
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
    if (threadId && threadId !== "new") {
      setIsLoading(true);
      setTimeout(() => {
        fetchMessages();
      }, 100);
    }
    return () => {
      setInitialLoadComplete(false);
    };
  }, [threadId]);

  useEffect(() => {
    const hasDismissed = localStorage.getItem("hasDismissedLinkedInModal");
    if (profile && !profile.linkedin_url && hasDismissed !== "true") {
      setLinkedinModalOpen(true);
    }
  }, [profile]);

  useEffect(() => {
    if (chatPairs.length > 0 && currentMessageIndex < chatPairs.length) {
      const currentPair = chatPairs[currentMessageIndex];
      if (currentPair.main_query) {
        setQuery(String(currentPair.main_query));
      }

      const userMessage: MessageType = {
        id: `${currentPair.id}-user`,
        type: "user",
        content: String(currentPair.main_query || ""),
        timestamp: new Date(String(currentPair.created_at)),
      };

      let messageContent = currentPair.message;
      const sourcesData: ChatSource[] = Array.isArray(currentPair.sources_gathered)
        ? currentPair.sources_gathered
        : [];

      console.log("Sources data from API:", sourcesData);

      if (chatWorkerRef.current && typeof messageContent === "object" && messageContent !== null) {
        const agentMessage: MessageType = {
          id: String(currentPair.id),
          type: "agent",
          content: "Processing message...",
          timestamp: new Date(String(currentPair.updated_at)),
          sources: sourcesData,
        };

        setMessages([userMessage, agentMessage]);

        const workerMessage: WorkerMessage = {
          type: "process_message",
          data: {
            id: String(currentPair.id),
            content: messageContent,
          },
        };

        chatWorkerRef.current.postMessage(workerMessage);
      } else {
        const content =
          typeof messageContent === "object"
            ? JSON.stringify(messageContent, null, 2)
            : String(messageContent || "");

        const agentMessage: MessageType = {
          id: String(currentPair.id),
          type: "agent",
          content: content,
          timestamp: new Date(String(currentPair.updated_at)),
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
    if (!isStreaming) {
      // Only update query if not streaming
      setQuery(tag);
    }
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
    if (isStreaming) return;

    const q = incoming ?? query;
    if (!q.trim()) return;

    // Optimistically update UI for new search
    if (threadId !== "new") {
      const newChatPair: ChatPair = {
        id: `temp-${Date.now()}`,
        main_query: q,
        message: "⏳ Searching for information...",
        created_at: new Date(),
        updated_at: new Date(),
      };
      setChatPairs(prev => [...prev, newChatPair]);
      setCurrentMessageIndex(chatPairs.length);
    }

    setIsStreaming(true);
    setIsLoading(true);

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

    const userMessage: MessageType = {
      id: `user-${Date.now()}`,
      type: "user",
      content: q,
      timestamp: new Date(),
    };

    const newLoadingMessageId = `agent-${Date.now()}`;
    const agentMessage: MessageType = {
      id: newLoadingMessageId,
      type: "agent",
      content: "⏳ Searching for information...",
      timestamp: new Date(),
    };

    setMessages([userMessage, agentMessage]);

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
      let sources: ChatSource[] = [];
      let searchQueries: string[] = [];
      setStreamingSearchQueries([]);
      setShowSearchQueries(false);
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
          switch (update.type) {
            case "thread_id":
              if (update.content && update.content.thread_id) {
                const newThreadId = update.content.thread_id;
                if (newThreadId !== threadId) {
                  const newUrl = `/chat/${newThreadId}`;
                  window.history.replaceState({ path: newUrl }, "", newUrl);

                  dispatch(
                    addChatThread({
                      id: newThreadId,
                      query: q,
                    })
                  );
                } else if (threadId && update.content.messages) {
                  setChatPairs(prev => {
                    const newMessages = Array.isArray(update.content.messages)
                      ? update.content.messages
                      : [];
                    return [...newMessages, ...prev];
                  });
                  setCurrentMessageIndex(prev => prev + 1);
                }
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
                  setShowSearchQueries(false);
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
                setStreamingSearchQueries(prev => [...prev, update.content.query]);
                setShowSearchQueries(true);
                if (!hasExtractedFinalAnswer) {
                  currentContent = `🔍 Searching: ${searchQueries.join(", ")}...`;
                  updateMessageContent(currentContent);
                }
              }
              break;

            case "source":
              if (update.content) {
                if (Array.isArray(update.content.sources)) {
                  sources.push(...update.content.sources);
                } else {
                  sources.push(update.content);
                }

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
                if (chatWorkerRef.current) {
                  chatWorkerRef.current.postMessage({
                    type: "process_message",
                    data: { id: newLoadingMessageId, content: fullContent },
                  });
                }
              }

              if (sources.length > 0) {
                console.log("Sources gathered:", sources);

                setMessages(m =>
                  m.map(msg => (msg.id === newLoadingMessageId ? { ...msg, sources } : msg))
                );
              }

              setShowSearchQueries(false);

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
      setIsStreaming(false);
      setIsLoading(false);
      setQuery("");
      setShowSearchQueries(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isStreaming) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSearch();
        posthog.capture("search_input_method", { method: "enter_key" });
      }
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

    setFeedbackSubmitted(prev => ({ ...prev, [messageId]: true }));

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
      try {
        const response = await apiClient.sendFeedback({
          message_id: feedback.messageId,
          is_positive: feedback.isPositive,
          comment: feedback.comment || "",
        });

        if (response?.success) {
          showSuccessToast("Feedback submitted successfully");
          setFeedbackSubmitted(prev => ({ ...prev, [feedback.messageId]: true }));
        }

        posthog.capture("feedback_submitted", {
          message_id: feedback.messageId,
          thread_id: threadId,
          is_positive: feedback.isPositive,
          has_comment: !!feedback.comment,
        });
      } catch (error) {
        console.error("Error submitting feedback:", error);
        showErrorToast("Failed to submit feedback. Please try again.");
        setFeedbackSubmitted(prev => ({ ...prev, [feedback.messageId]: false }));
      }
    } catch (error: any) {
      const statusCode = error?.response?.status || 500;
      showErrorToast("Failed to submit feedback", `Status: ${statusCode}`);
      posthog.capture("feedback_submission_failed", {
        message_id: feedback.messageId,
        thread_id: threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      setFeedbackSubmitted(prev => ({ ...prev, [feedback.messageId]: false }));
    }
  };
  const SearchQueryDisplay = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    if (!showSearchQueries && streamingSearchQueries.length === 0 && !isStreaming) return null;

    return (
      <div className="mb-4 rounded-lg border border-gray-200  p-3 overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 ">
            <FiSearch className="h-4 w-4 text-purple-500" />
            <span className="font-medium">Searching with:</span>
          </div>
          <div className="flex items-center gap-2">
            {/* {isStreaming && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse delay-100"></div>
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse delay-200"></div>
              </div>
            )} */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-2 p-1 rounded-full hover:bg-gray-200 -700 transition-colors"
              aria-label={isCollapsed ? "Expand search queries" : "Collapse search queries"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-gray-500  transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`relative pl-6 mt-3 transition-all duration-300 ${isCollapsed ? "h-0 opacity-0 overflow-hidden" : "opacity-100"}`}
        >
          <div className="absolute left-[9px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500 to-blue-500"></div>

          {isStreaming && streamingSearchQueries.length === 0 && (
            <div className="py-2 text-sm text-gray-500  flex items-center relative">
              <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-purple-500 animate-pulse"></div>
              <div className="ml-4 flex items-center">
                <span>Preparing search queries...</span>
              </div>
            </div>
          )}

          {streamingSearchQueries.length > 0 && (
            <div className="will-change-transform">
              <ul className="space-y-4 mb-3">
                {streamingSearchQueries.map((query, index) => (
                  <li key={`query-${index}`} className="flex items-start transform-gpu">
                    <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border-2 border-white "></div>

                    <div className="ml-4 bg-white  rounded-lg p-2 shadow-sm border border-gray-100  w-full">
                      <span className="text-sm text-gray-800  font-medium">{query}</span>
                    </div>
                  </li>
                ))}

                {isStreaming && (
                  <li className="flex items-start transform-gpu">
                    <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-blue-500 animate-pulse"></div>
                    <div className="ml-4 flex items-center py-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-1"></div>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-100 mr-1"></div>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-200"></div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {isCollapsed && streamingSearchQueries.length > 0 && (
          <div className="text-xs text-gray-500  mt-1 pl-2">
            {streamingSearchQueries.length} search queries {isStreaming ? "(streaming)" : ""}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div
        className={`transition-all duration-300 relative z-10 ${sidebarCollapsed ? "md:ml-5" : "md:ml-12"} md:px-4 pt-8 flex flex-col ${
          messages.length ? "pt-1 pb-1" : "min-h-screen justify-start"
        }`}
      >
        {threadId === "new" && messages.length === 0 && !isStreaming && (
          <div className={`transition-all duration-500 text-center mb-8`}>
            <div className="items-center justify-center h-20 "></div>
            <h1 className={`font-bold -mt-3 mb-2 text-gray-900 text-2xl md:text-4xl`}>
              {getPersonalizedGreeting()}
              <div className="mt-2">
                <span>What's on </span>
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text font-bold">
                  your mind?
                </span>
              </div>
            </h1>
            {!messages.length && (
              <p className="text-gray-600 text-sm md:text-lg mt-6">
                Our AI filters through millions of profiles to surface truly relevant people, faster
                and more precisely than traditional platforms.
              </p>
            )}
          </div>
        )}
        <div
          className={`max-w-4xl mx-auto w-full ${messages.length ? "mb-2" : "mb-8 "} mt-5 md:mt-0 transition-all duration-500`}
        >
          <div className="relative flex justify-center w-full px-2 sm:px-0">
            <div
              className="flex flex-col rounded-2xl px-3 sm:px-6 py-3 sm:py-4 shadow-lg transition-all duration-200 focus-within:shadow-xl w-full max-w-3xl border border-gray-200 bg-white hover:border-gray-300"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <SearchInputField
                query={query}
                setQuery={setQuery}
                textareaRef={textareaRef}
                onKey={onKey}
                isStreaming={isStreaming}
              />
              <div className="flex flex-col sm:flex-row justify-between w-full mt-2 gap-2 sm:gap-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SearchModeToggle
                    searchMode={searchMode}
                    disabled={
                      isStreaming ||
                      (chatPairs.length > 0 &&
                        currentMessageIndex < chatPairs.length &&
                        chatPairs[currentMessageIndex].main_query === query &&
                        query.trim() !== "")
                    }
                    setSearchMode={(mode: "basic" | "deep") => {
                      posthog.capture("search_mode_changed", { mode });
                      setSearchMode(mode);
                    }}
                  />
                  <WorldConnectionsToggle
                    worldConnectionsMode={worldConnectionsMode}
                    setWorldConnectionsMode={(mode: "connections" | "world") => {
                      posthog.capture("world_connections_mode_changed", { mode });
                      setWorldConnectionsMode(mode);
                    }}
                  />
                </div>

                <div className="mt-2 sm:mt-0 w-full sm:w-auto">
                  <AgentDropdown
                    agentsStatus={agentsStatus}
                    isStreaming={isStreaming}
                    agentData={agentData}
                    agentCards={agentCards}
                    onAgentSelect={handleAgentSelect}
                  />
                </div>
              </div>
            </div>
          </div>
          {threadId === "new" && !(messages.length > 0) && (
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
          <ChatNavigationControls
            currentIndex={currentMessageIndex}
            totalItems={chatPairs.length}
            isStreaming={isStreaming || isLoading}
            onPrevious={() => setCurrentMessageIndex(prev => Math.max(0, prev - 1))}
            onNext={() => setCurrentMessageIndex(prev => Math.min(chatPairs.length - 1, prev + 1))}
            onRefresh={() => {
              if (isStreaming || isLoading) return;
              setInitialLoadComplete(false);
              setIsLoading(true);
              fetchMessages(true);
            }}
          />
        </div>
      </div>

      {messages && messages.length > 0 && (
        <div className="w-full mt-2">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
          </div>

          <div className="space-y-6">
            {messages.map(m => {
              // Debug log to check sources
              if (m.type === "agent" && m.sources) {
                console.log(`Message ${m.id} has ${m.sources.length} sources:`, m.sources);
              }

              return (
                m.type === "agent" && (
                  <>
                    <div
                      key={m.id}
                      className="rounded-xl p-6 transition-shadow bg-white border border-gray-200 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start">
                        <div
                          className={`rounded-full hidden md:flex  mr-4 justify-center items-center h-12 w-12 bg-blue-50`}
                        >
                          <div className={`h-12 w-12 text-blue-600`}>
                            <OrbAura />
                          </div>
                        </div>
                        <div className="flex-1">
                          {isStreaming && <SearchQueryDisplay />}
                          {m.sources && m.sources.length > 0 ? (
                            <div className="mb-4 border-b border-gray-200">
                              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                                <li className="mr-2">
                                  <button
                                    onClick={() => setActiveTab("content")}
                                    className={`inline-flex items-center justify-center p-2 px-3 border-b-1 ${
                                      activeTab === "content"
                                        ? "text-blue-600 border-blue-600 font-semibold"
                                        : "text-gray-500 border-transparent hover:text-gray-600"
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
                                        ? "text-blue-600 border-blue-600 font-semibold"
                                        : "text-gray-500 border-transparent hover:text-gray-600"
                                    } transition-all duration-200`}
                                  >
                                    <FiLink className="w-4 h-4 mr-2" />
                                    Sources
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                      {m.sources.length}
                                    </span>
                                  </button>
                                </li>
                              </ul>
                            </div>
                          ) : null}

                          {(!m.sources || m.sources.length === 0 || activeTab === "content") &&
                            !isStreaming && (
                              <div className="text-gray-700">
                                {m.content === null ? (
                                  <div className="flex items-center">
                                    <div className=" mr-2">
                                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                    <p className="italic">
                                      Query seems empty, Please Search again.
                                    </p>
                                  </div>
                                ) : format === "table" &&
                                  parseStructuredData(m.content).isStructured ? (
                                  renderAsTable(
                                    m.content,
                                    false,
                                    messagesContainerRef,
                                    hasMoreMessages,
                                    loadMoreMessages
                                  )
                                ) : (
                                  <StyledMarkdown
                                    content={m.content}
                                    sources={m.sources || m.sources_gathered}
                                  />
                                )}
                              </div>
                            )}

                          {activeTab === "sources" && (
                            <SourcesList sources={m.sources} sourcesGathered={m.sources_gathered} />
                          )}

                          <div className="mt-4 flex justify-between items-center">
                            <span
                              title={getFullTimestamp(m.timestamp)}
                              className="text-sm text-gray-500 hover:text-gray-600 transition-colors cursor-default flex items-center"
                            >
                              <FiClock className="h-3.5 w-3.5 mr-1.5 inline-block" />
                              {formatTimestamp(m.timestamp)}
                            </span>
                            <div className="flex items-center gap-2">
                              {!isLoading && m.type === "agent" && !feedbackSubmitted[m.id] && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 hover:bg-gray-100"
                                    onClick={() => handleFeedback(m.id, true)}
                                  >
                                    <FiThumbsUp className="h-4 w-4 text-gray-500 hover:text-green-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 hover:bg-gray-100"
                                    onClick={() => handleFeedback(m.id, false)}
                                  >
                                    <FiThumbsDown className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              );
            })}
          </div>
        </div>
      )}

      {linkedinModalOpen && (
        <LinkedInUrlModal
          open={linkedinModalOpen}
          onOpenChange={isOpen => {
            setLinkedinModalOpen(isOpen);
            // If the modal is closed and the profile still lacks a URL, set the flag
            if (!isOpen && profile && !profile.linkedin_url) {
              localStorage.setItem("hasDismissedLinkedInModal", "true");
            }
          }}
        />
      )}

      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        initialFeedback={currentFeedback}
        onSubmit={feedback => {
          handleFeedbackSubmit(feedback);
          setCurrentFeedback(null);
        }}
      />
    </div>
  );
};

export default ChatThreadView;
