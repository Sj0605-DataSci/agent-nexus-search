"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { formatTimestamp, getFullTimestamp } from "@/utils/timeUtils";
import { throttle } from "@/utils/throttle";
import { ChatNavigationControls } from "./ChatNavigationControls";
import { showErrorToast } from "@/utils/toastManager";
import { createUserFriendlyErrorMessage } from "@/utils/errorUtils";
import { FiClock } from "react-icons/fi";
import { SearchQueryDisplay } from "./SearchQueryDisplay";
import { getTimeBasedGreeting } from "../../utils/timeUtils";
import posthog from "posthog-js";
import SearchInputField from "./SearchInputField";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { addChatThread } from "@/store/chatThreadsSlice";
import { apiClient } from "@/integrations/fastapi/client";
import { selectAgentCards } from "@/store/agentsSlice";
import TagCarousel, { TagCategories } from "./TagCarousel";
import { renderAsTable } from "./StructuredDataUtils";
import dynamic from "next/dynamic";
import StyledMarkdown from "../common/StyledMarkdown";
import MessagePlaceholder from "./MessagePlaceholder";
import FeedbackModule from "./FeedbackModule"; // Import FeedbackModule component

const LinkedInUrlModal = dynamic(() => import("../profile/LinkedInUrlModal"), { ssr: false });

import { ChatSource, MessageType } from "@/types/chat";
import { WorkerMessage } from "@/types/api";
import { ChatPair, CachedThread, ChatThreadViewProps } from "@/types/chatThreadView";
import { getStoredToken } from "@/utils/tokenManagement";
import toast from "react-hot-toast";

const ChatThreadView: React.FC<ChatThreadViewProps> = ({ threadId, initialQuery = "" }) => {
  const chatWorkerRef = useRef<Worker | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const userAccessToken = getStoredToken();

  const [query, setQuery] = useState<string>(initialQuery ? initialQuery : "");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState<boolean>(false);
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

  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  const dispatch = useAppDispatch();
  const agentCards = useAppSelector(selectAgentCards);
  useEffect(() => {
    posthog.capture("chat_thread_viewed", {
      thread_id: threadId,
      is_new_thread: threadId === "new",
    });
  }, [dispatch, threadId]);

  const fetchMessages = async (forceRefresh = false) => {
    if (!threadId || threadId === "new") return;

    if (cachedThreads[threadId] && initialLoadComplete && !forceRefresh) {
      const { messages: cachedMessages, timestamp } = cachedThreads[threadId];
      const cacheAge = Date.now() - timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        setChatPairs(cachedMessages || []);
        setCurrentMessageIndex(Math.max(0, (cachedMessages?.length || 0) - 1));
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
      } else {
        setChatPairs([]);
        setCurrentMessageIndex(0);
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
      } else if (typedError.response?.status === 401) {
        message = "Please log in to view this chat thread.";
      } else if (!navigator.onLine) {
        message = "You're offline. Please check your internet connection.";
      }

      showErrorToast("Load Failed", message);
      setChatPairs([]);
      setCurrentMessageIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (threadId && threadId !== "new" && userAccessToken) {
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
    if (profile && !profile.linkedin_url) {
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

  const handleTagClick = (tag: string) => {
    if (!isStreaming) {
      setQuery(tag);
    }
  };

  const handleSearch = async (incoming?: string) => {
    if (isStreaming) return;

    const q = incoming ?? query;
    if (!q.trim()) return;

    if (threadId && threadId !== "new") {
      const newChatPair: ChatPair = {
        id: `temp-${Date.now()}`,
        main_query: q,
        message: "⏳ Searching for information...",
        created_at: new Date(),
        updated_at: new Date(),
        world_connections: "connections",
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
      agent_id: "arya",
      search_mode: "basic",
      world_connections_mode: "connections",
      format: "table",
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
      let currentContent = "⏳ Searching for information...";
      let sources: ChatSource[] = [];
      let searchQueries: string[] = [];
      setStreamingSearchQueries([]);
      setShowSearchQueries(false);
      let lastUpdateTime = Date.now();
      let updateDebounceMs = 100;

      const searchStartTime = Date.now();

      const updateMessageContent = (content: string) => {
        const now = Date.now();
        if (now - lastUpdateTime > updateDebounceMs) {
          setMessages(m =>
            m?.map(msg => {
              if (msg.id === newLoadingMessageId) {
                return { ...msg, content };
              }
              return msg;
            })
          );
          lastUpdateTime = now;
        }
      };

      await apiClient.sendStreamingChatRequest(
        agentCards[0]?.id ?? null,
        q,
        threadId ?? null,
        (update: any) => {
          switch (update.type) {
            case "thread_id":
              if (update.content && update.content.thread_id) {
                const newThreadId = update.content.thread_id;
                if (userAccessToken && newThreadId !== threadId) {
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
              setShowSearchQueries(true);
              break;

            case "sql_search_results":
              if (update.content && update.content.message) {
                searchQueries.push(update.content.message);
                setStreamingSearchQueries(prev => [...prev, update.content.message]);
              }
              break;

            case "vector_search_results":
              if (update.content && update.content.message) {
                searchQueries.push(update.content.message);
                setStreamingSearchQueries(prev => [...prev, update.content.message]);
              }
              break;

            case "fusion_ranking":
              if (update.content && update.content.message) {
                searchQueries.push(update.content.message);
                setStreamingSearchQueries(prev => [...prev, update.content.message]);
              }
              break;

            case "query_analysis":
              if (update.content) {
                searchQueries.push(update.content);
                setStreamingSearchQueries(prev => [...prev, update.content]);
              }
              break;
            case "sql_query":
              if (update.content) {
                if (update.content.query) {
                  const sqlQuery = update.content.query;
                  const fullSqlQuery = sqlQuery;
                  console.log("SQL Query:", fullSqlQuery);
                  searchQueries.push(fullSqlQuery);
                  setStreamingSearchQueries(prev => [...prev, fullSqlQuery]);
                } else if (update.content.message) {
                  searchQueries.push(update.content.message);
                  setStreamingSearchQueries(prev => [...prev, update.content.message]);
                }
              }
              break;

            case "token":
              if (update.content && update.content.text) {
                currentContent = update.content.text;

                updateMessageContent(currentContent);

                setMessages(m => {
                  if (m.length === 0) return m;
                  const lastIndex = m.length - 1;
                  const updatedMessages = [...m];
                  updatedMessages[lastIndex] = {
                    ...updatedMessages[lastIndex],
                    id: update.content.message_id || updatedMessages[lastIndex].id,
                  };
                  return updatedMessages;
                });
                setShowSearchQueries(false);
                setIsStreaming(false);
              }

              setShowSearchQueries(false);

              posthog.capture("search_completed", {
                query: q,
                search_mode: "basic",
                world_connections_mode: "connections",
                format: "table",
                thread_id: threadId,
                duration_ms: Date.now() - searchStartTime,
                sources_count: sources.length,
                search_queries_count: searchQueries.length,
                has_answer: true,
              });
              break;

            case "connected":
              console.log("Stream connected");
              break;
            case "error":
              const rawErrorMessage =
                update.content && update.content.message
                  ? update.content.message
                  : "Something went wrong. Please try again.";

              currentContent = createUserFriendlyErrorMessage(rawErrorMessage);
              updateMessageContent(currentContent);

              posthog.capture("stream_error", {
                query: q,
                agent_id: "arya",
                error: rawErrorMessage,
              });
              break;

            case "done":
              setIsStreaming(false);
              setIsLoading(false);
              setShowSearchQueries(false);

              if (update.content?.message_id) {
                setMessages(m => {
                  if (m.length === 0) return m;
                  const lastIndex = m.length - 1;
                  const updatedMessages = [...m];
                  updatedMessages[lastIndex] = {
                    ...updatedMessages[lastIndex],
                    id: update.content.message_id,
                  };
                  return updatedMessages;
                });
              }
              break;

            default:
              console.warn("Unknown update type:", update.type);
              break;
          }
        }
      );
    } catch (error) {
      toast.error(error as string);
      console.error("Error sending chat request:", error);
      posthog.capture("search_error", {
        query: q,
        agent_id: "arya",
        error: error instanceof Error ? error.message : String(error),
      });

      setMessages(m =>
        m?.map(msg =>
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
      setShowSearchQueries(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const throttledHandleSearch = useMemo(() => throttle(handleSearch, 1000), []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query?.trim() && !isStreaming) {
      throttledHandleSearch();
    }
  };
  useEffect(() => {
    if (initialQuery && query?.trim() && !isStreaming) {
      throttledHandleSearch();
    }
  }, [initialQuery, throttledHandleSearch]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getPersonalizedGreeting = useCallback(() => {
    const baseGreeting = getTimeBasedGreeting();
    if (profile?.full_name?.trim()) {
      const firstName = profile.full_name.trim().split(" ")[0];
      return `${baseGreeting}, ${firstName}`;
    }
    return baseGreeting;
  }, [profile?.full_name]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query]);

  return (
    <div>
      <div
        className={` relative z-10 ${sidebarCollapsed ? "md:ml-5" : "md:ml-12"} md:px-4 pt-8 flex flex-col`}
      >
        {threadId === "new" && messages?.length === 0 && !isStreaming && (
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
                Our AI-powered smart search unlocks hidden opportunities in your extended network,
                <br />
                connecting you through trusted warm introductions instead of ineffective cold
                outreach.
              </p>
            )}
          </div>
        )}
        <div
          className={`max-w-4xl mx-auto w-full ${messages?.length ? "mb-2" : "mb-8 "} mt-5 md:mt-0  duration-200`}
        >
          <SearchInputField
            query={query}
            setQuery={setQuery}
            textareaRef={textareaRef}
            onKey={handleKeyDown}
            onSubmit={handleSubmit}
            isStreaming={isStreaming}
            hideGroupOption={false}
            defaultSearchButton={false}
          />
          {threadId === "new" && !(messages.length > 0) && (
            <div className="flex  flex-col w-full z-[5] mt-3">
              {[
                { category: TagCategories.GENERAL, speed: 0.3 },
                { category: TagCategories.SALES, speed: 0.5 },
                { category: TagCategories.HR, speed: 0.4 },
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
          {messages?.length > 0 && (
            <ChatNavigationControls
              currentIndex={currentMessageIndex}
              totalItems={chatPairs.length}
              isStreaming={isStreaming || isLoading}
              onPrevious={() => setCurrentMessageIndex(prev => Math.max(0, prev - 1))}
              onNext={() =>
                setCurrentMessageIndex(prev => Math.min(chatPairs.length - 1, prev + 1))
              }
              onRefresh={() => {
                if (isStreaming || isLoading) return;
                setInitialLoadComplete(false);
                setIsLoading(true);
                fetchMessages(true);
              }}
              canNavigateNext={false}
              canNavigatePrevious={false}
            />
          )}
        </div>
      </div>
      {!(threadId === "new" || isStreaming) && (messages.length === 0 || chatPairs.length === 0) ? (
        <div className="flex w-full h-full">
          <MessagePlaceholder
            message={
              threadId !== "new" && initialLoadComplete
                ? "No messages found for this conversation. Please try another search."
                : undefined
            }
          />
        </div>
      ) : (
        <></>
      )}
      {messages && messages?.length > 0 && (
        <div
          ref={chatScrollContainerRef}
          className="w-full md:px-20 overflow-y-scroll scrollbar-hide"
        >
          <div className="space-y-6">
            {messages?.map(m => {
              return (
                m?.type === "agent" && (
                  <>
                    <div key={m?.id || 1} className="rounded-xl bg-white">
                      <div className="flex items-start">
                        <div className="flex-1 h-full ">
                          {isStreaming && (
                            <SearchQueryDisplay
                              showSearchQueries={showSearchQueries}
                              streamingSearchQueries={streamingSearchQueries}
                              isStreaming={isStreaming}
                            />
                          )}

                          {(!m.sources || m.sources.length === 0) && !isStreaming && (
                            <div className="text-gray-700">
                              {m?.content === null ? (
                                <div className="flex items-center">
                                  <div className="mr-2">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                  </div>
                                  <p className="italic">Query seems empty, Please Search again.</p>
                                </div>
                              ) : /(fname|lname|link)/i.test(m.content) ? (
                                <div className="flex w-full">{renderAsTable(m.content)}</div>
                              ) : (
                                <StyledMarkdown
                                  content={m.content}
                                  sources={m.sources || m.sources_gathered}
                                />
                              )}
                            </div>
                          )}

                          <div className="mt-3 pb-4 px-3 flex justify-between items-center">
                            <span
                              title={getFullTimestamp(m.timestamp)}
                              className="text-sm text-gray-500 hover:text-gray-600 transition-colors cursor-default flex items-center"
                            >
                              <FiClock className="h-3.5 w-3.5 mr-1.5 inline-block" />
                              {formatTimestamp(m.timestamp)}
                            </span>
                            {!isLoading && m.type === "agent" && (
                              <FeedbackModule
                                messageId={m.id}
                                threadId={threadId}
                                setMessages={setMessages}
                              />
                            )}
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
    </div>
  );
};

export default ChatThreadView;
