"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { formatTimestamp, getFullTimestamp, getTimeBasedGreeting } from "@/utils/timeUtils";
import { throttle } from "@/utils/throttle";
import { ChatNavigationControls } from "./ChatNavigationControls";
import { createUserFriendlyErrorMessage } from "@/utils/errorUtils";
import toast from "react-hot-toast";
import { FiClock } from "react-icons/fi";
import posthog from "posthog-js";
import dynamic from "next/dynamic";
import SearchInputField from "./SearchInputField";
import { useAppDispatch, useAppSelector } from "@/store";
import { addChatThread } from "@/store/chatThreadsSlice";
import { apiClient } from "@/integrations/fastapi/client";
import { selectHired } from "@/store/agentsSlice";
import TagCarousel, { TagCategories } from "./TagCarousel";
import { renderAsTable } from "./StructuredDataUtils";
import StyledMarkdown from "../common/StyledMarkdown";
import MessagePlaceholder from "./MessagePlaceholder";
import FeedbackModule from "./FeedbackModule";

const LinkedInUrlModal = dynamic(() => import("../profile/LinkedInUrlModal"), { ssr: false });
const SearchQueryDisplay = dynamic(() => import("@/components/chats/SearchQueryDisplay"), {
  ssr: false,
});

import { ChatSource, MessageType } from "@/types/chat";
import { WorkerMessage } from "@/types/api";
import { ChatPair, CachedThread, ChatThreadViewProps } from "@/types/chatThreadView";
import { getStoredToken } from "@/utils/tokenManagement";

const isEmptyOrErrorMessage = (content: string | null | undefined): boolean => {
  if (!content) return true;
  
  const errorMessages = [
    "null",
    "No matching connections found for your query.",
    "⚠️ An error occurred while searching. Please try again later.",
    "⏳ Searching for information..."
  ];
  
  return errorMessages.includes(content);
};

const ChatThreadView: React.FC<ChatThreadViewProps> = ({ threadId, initialQuery = "" }) => {
  const chatWorkerRef = useRef<Worker | null>(null);
  const userAccessToken = getStoredToken();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const initWorker = async () => {
          if (!chatWorkerRef.current) {
            chatWorkerRef.current = new Worker(
              new URL("/workers/chat.worker.js", window.location.origin)
            );
          }
        };

        initWorker().catch(err => {
          console.error("Worker initialization error:", err);
        });
      } catch (error) {
        console.error("Failed to initialize chat worker:", error);
      }
    }

    return () => {
      if (chatWorkerRef.current) {
        chatWorkerRef.current.terminate();
        chatWorkerRef.current = null;
      }
    };
  }, []);

  const [query, setQuery] = useState<string>(initialQuery ? initialQuery : "");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState<boolean>(false);
  const [chatPairs, setChatPairs] = useState<ChatPair[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(threadId != "new");
  const [cachedThreads, setCachedThreads] = useState<Record<string, CachedThread>>({});
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingSearchQueries, setStreamingSearchQueries] = useState<string[]>([]);

  const hiredRaw = useAppSelector(selectHired);
  const hiredIds = hiredRaw.map(h => h.id);

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

  const dispatch = useAppDispatch();
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

      toast.error(`Load Failed: ${message}`);
      setChatPairs([]);
      setCurrentMessageIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (threadId && threadId !== "new" && userAccessToken) {
        setIsLoading(true);
        try {
          if (isMounted) {
            await fetchMessages();
          }
        } catch (error) {
          console.error("Error loading messages:", error);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
      setInitialLoadComplete(false);
    };
  }, [threadId, userAccessToken]);

  useEffect(() => {
    if (profile && !profile.linkedin_url) {
      setLinkedinModalOpen(true);
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    if (chatPairs.length > 0 && currentMessageIndex < chatPairs.length) {
      const currentPair = chatPairs[currentMessageIndex];
      if (currentPair.main_query && isMounted) {
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

      if (
        chatWorkerRef.current &&
        typeof messageContent === "object" &&
        messageContent !== null &&
        isMounted
      ) {
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

        // Only post message if worker exists and component is mounted
        if (chatWorkerRef.current && isMounted) {
          chatWorkerRef.current.postMessage(workerMessage);
        }
      } else if (isMounted) {
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

    return () => {
      isMounted = false;
    };
  }, [currentMessageIndex, chatPairs]);

  const handleTagClick = (tag: string) => {
    if (!isStreaming) {
      setQuery(tag);

      // Track tag click with analytics
      posthog.capture("tag_clicked", {
        tag: tag,
        location: "chat_thread",
        thread_id: threadId,
        is_new_thread: threadId === "new",
      });
    }
  };

  const handleSearch = async (incoming?: string) => {
    if (isStreaming) return;
    setIsStreaming(true);

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
      const accessToken = await Promise.resolve(getStoredToken());
      let agentId = hiredIds[0] ?? null;
      if (accessToken && hiredIds && !hiredIds[0]) {
        updateMessageContent("⏳ Initializing agent...");

        let attempts = 0;
        const maxAttempts = 10; // 10 attempts * 500ms = 5 seconds max wait time
        while (!agentId && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          agentId = hiredIds[0] ?? null;
          attempts++;
        }

        if (!agentId) {
          console.warn("Could not get agent ID after waiting");
        }
      }

      await apiClient.sendStreamingChatRequest(agentId, q, threadId ?? null, (update: any) => {
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
                searchQueries.push(sqlQuery);
                setStreamingSearchQueries(prev => [...prev, sqlQuery]);
              }
            }
            break;
          case "final_answer":
            if (update.content && update.content.message[0]?.content) {
              currentContent = update.content.message[0].content;
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
              setIsStreaming(false);
            }

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
      });
    } catch (error: any) {
      console.error("Error sending chat request:", error);

      const isRateLimitError =
        error?.isRateLimit ||
        (error?.message &&
          (error.message.includes("429") ||
            error.message.includes("rate limit") ||
            error.message.includes("maximum number of free searches")));

      posthog.capture("search_error", {
        query: q,
        agent_id: "arya",
        error: error instanceof Error ? error.message : String(error),
        isRateLimit: isRateLimitError,
      });

      setMessages(m =>
        m?.map(msg =>
          msg.id === newLoadingMessageId
            ? {
                ...msg,
                content: isRateLimitError
                  ? "⚠️ Search limit reached. Please try again later or upgrade your plan."
                  : "⚠️ An error occurred while searching. Please try again later.",
                error: true,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query?.trim() && !isStreaming) {
        posthog.capture("search_keyboard_shortcut", {
          key: "enter",
          location: "chat_thread",
          query_length: query.trim().length,
          thread_id: threadId,
          input_method: "keyboard",
        });
        handleSearch();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query?.trim() && !isStreaming) {
      posthog.capture("search_form_submitted", {
        location: "chat_thread",
        query_length: query.trim().length,
        thread_id: threadId,
        input_method: "form",
      });
      handleSearch();
    }
  };
  useEffect(() => {
    let isMounted = true;

    if (initialQuery && query?.trim() && !isStreaming && isMounted) {
      handleSearch();
    }

    return () => {
      isMounted = false;
    };
  }, [initialQuery]);

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
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [query]);

  return (
    <div>
      <div className={` relative z-10 md:pt-4 flex flex-col`}>
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
            defaultSearchButton={true}
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
      {!(threadId === "new" || isStreaming) && messages.length === 0 && isLoading ? (
        <div className="flex w-full  max-w-4xl mx-auto h-full">
          <MessagePlaceholder
            message={
              isLoading
                ? undefined
                : threadId !== "new" && initialLoadComplete
                  ? "No messages found for this conversation. Please try another search."
                  : undefined
            }
          />
        </div>
      ) : (
        <></>
      )}
      {messages &&
        messages?.length > 0 &&
        messages?.map(m => {
          return (
            m?.type === "agent" && (
              <div className="max-w-4xl mx-auto px-2 w-full  md:px-0 overflow-y-scroll scrollbar-hide">
                <div
                  key={m?.id || 1}
                  className="rounded-xl flex-col flex-1 h-full w-full space-y-4 overflow-hidden flex items-start bg-white"
                >
                  {isStreaming && (
                    <SearchQueryDisplay
                      streamingSearchQueries={streamingSearchQueries}
                      isStreaming={isStreaming}
                    />
                  )}

                  {(!m.sources || m.sources.length === 0) && !isStreaming && (
                    <div className="text-gray-700 w-full ">
                      {isEmptyOrErrorMessage(m?.content) ||
                      m?.content === "" ? (
                        <div className="flex flex-col items-center justify-center w-full py-10  px-4 mx-auto">
                          <Image
                            src="/search/NoDataFound.svg"
                            alt="No data found"
                            width={100}
                            height={100}
                            className="mb-6"
                            priority
                          />
                          <h3 className="text-xl font-medium text-gray-800 mb-2">
                            No Results Found
                          </h3>
                          <p className="text-gray-600 text-center mb-6 max-w-md">
                            We couldn't find any matching results for your query. Try adjusting your
                            search terms or explore different keywords.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                            <button
                              onClick={() => textareaRef.current?.focus()}
                              className="flex items-center justify-center h-10 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm"
                            >
                              <FiSearch className="mr-2 h-4 w-4" />
                              Try Another Search
                            </button>
                            <button
                              onClick={() => setQuery("")}
                              className="flex items-center justify-center h-10 px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                            >
                              <FiRefreshCw className="mr-2 h-4 w-4" />
                              Clear Query
                            </button>
                          </div>
                        </div>
                      ) : /(first_name|last_name)/i.test(m.content) ||
                        (typeof m.content === "string" &&
                          (m.content.startsWith("[{") || m.content.startsWith("{"))) ? (
                        <div className="flex w-full">{renderAsTable(m.content)}</div>
                      ) : (
                        <StyledMarkdown
                          content={m.content}
                          sources={m.sources || m.sources_gathered}
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-3 pb-4 flex w-full justify-between items-center">
                    <span
                      title={getFullTimestamp(m.timestamp)}
                      className="text-sm text-gray-500 hover:text-gray-600 transition-colors cursor-default flex items-center"
                    >
                      <FiClock className="h-3.5 w-3.5 mr-1.5 inline-block" />
                      {formatTimestamp(m.timestamp)}
                    </span>
                    {!isLoading && m.type === "agent" && userAccessToken && (
                      <FeedbackModule
                        messageId={m.id}
                        threadId={threadId}
                        setMessages={setMessages}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          );
        })}

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
