import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getThreads,
  createThread,
  deleteThread,
  setActiveThread,
  getActiveThreadId,
  getMessages,
  addMessage,
  updateThread,
  getStoredUserId,
  clearUserId,
} from '../../../lib/localStorage';
import { ChatThread, ChatMessage } from '../../../types/chat';
import { tallyChatService } from '../../../lib/TallyChatService';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

export default function Chat() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const currentAssistantMessageRef = useRef<string>(''); // Use ref to track latest value
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  // Connect to WebSocket on mount or when user ID becomes available
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const attemptConnection = () => {
      const userId = getStoredUserId();
      
      if (!userId) {
        if (retryCount < maxRetries) {
          console.log(`No user ID found, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          setTimeout(attemptConnection, retryDelay);
          return;
        } else {
          console.error('No user ID found after max retries');
          return;
        }
      }

      console.log('Connecting to Tally WebSocket with user ID:', userId);

      // Connect to Tally WebSocket
      tallyChatService.connect(userId, {
        onThinking: (message) => {
          setToolStatus(message);
        },
        onAnswer: (message) => {
          setCurrentAssistantMessage(message);
          currentAssistantMessageRef.current = message;
        },
        onError: (message) => {
          console.error('Tally chat error:', message);
          setToolStatus('');
          setIsLoading(false);
          
          // Add error message to chat
          if (activeThreadId) {
            const errorMessage = addMessage(activeThreadId, {
              threadId: activeThreadId,
              role: 'assistant',
              content: `Error: ${message}`,
            });
            setMessages(prev => [...prev, errorMessage]);
          }
        },
        onDone: () => {
          // Save final assistant message
          const finalMessage = currentAssistantMessageRef.current.trim();
          
          if (finalMessage && activeThreadId) {
            const assistantMessage = addMessage(activeThreadId, {
              threadId: activeThreadId,
              role: 'assistant',
              content: finalMessage,
            });
            setMessages(prev => [...prev, assistantMessage]);
            loadThreads(); // Refresh to update message count
          }
          
          setIsLoading(false);
          setToolStatus('');
          setCurrentAssistantMessage('');
          currentAssistantMessageRef.current = '';
        }
      });
    };

    // Start connection attempt
    attemptConnection();

    // Cleanup on unmount
    return () => {
      tallyChatService.disconnect();
    };
  }, [activeThreadId, navigate]);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAssistantMessage]);

  const loadThreads = () => {
    const loadedThreads = getThreads();
    setThreads(loadedThreads);
    
    const activeId = getActiveThreadId();
    if (activeId) {
      setActiveThreadIdState(activeId);
    } else if (loadedThreads.length > 0) {
      setActiveThreadIdState(loadedThreads[0].id);
      setActiveThread(loadedThreads[0].id);
    }
  };

  const loadMessages = (threadId: string) => {
    const loadedMessages = getMessages(threadId);
    setMessages(loadedMessages);
  };

  const handleCreateThread = () => {
    const newThread = createThread('New Chat');
    setThreads([newThread, ...threads]);
    setActiveThreadIdState(newThread.id);
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadIdState(threadId);
    setActiveThread(threadId);
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteThread(threadId);
      loadThreads();
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeThreadId || isLoading) return;

    // Check if WebSocket is connected
    if (!tallyChatService.isConnected()) {
      console.error('WebSocket not connected');
      alert('Not connected to server. Please refresh the page.');
      return;
    }

    const userMessageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setToolStatus('');
    setCurrentAssistantMessage('');
    currentAssistantMessageRef.current = ''; // Reset ref

    // Add user message
    const userMessage = addMessage(activeThreadId, {
      threadId: activeThreadId,
      role: 'user',
      content: userMessageContent,
    });

    setMessages(prev => [...prev, userMessage]);

    // Update thread title if it's the first message
    const thread = threads.find(t => t.id === activeThreadId);
    if (thread && thread.messageCount === 1) {
      const title = userMessageContent.substring(0, 30) + (userMessageContent.length > 30 ? '...' : '');
      updateThread(activeThreadId, { title });
      loadThreads();
    }

    // Send query through WebSocket
    tallyChatService.sendQuery(userMessageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        // Disconnect WebSocket
        tallyChatService.disconnect();
        
        // Sign out from Supabase
        await signOut();
        
        // Clear all auth data
        localStorage.removeItem('discover_minds_access_token');
        localStorage.removeItem('discover_minds_user');
        clearUserId();
        
        // Navigate to login
        navigate('/');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  return (
    <div className="chat-container">
      {/* Top Navigation Bar */}
      <div className="chat-navbar">
        <div className="navbar-left">
          <h1 className="app-title">Tally Chat</h1>
        </div>
        <div className="navbar-right">
          <button className="nav-btn" onClick={() => navigate('/whatsapp-dashboard')} title="WhatsApp Dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            WhatsApp
          </button>
          <button className="nav-btn" onClick={() => navigate('/upload')} title="Upload Document">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload
          </button>
          <button className="nav-btn" onClick={() => navigate('/settings')} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m0-18a9 9 0 0 1 9 9m-9-9a9 9 0 0 0-9 9m9 9a9 9 0 0 1-9-9m9 9a9 9 0 0 0 9-9"></path>
            </svg>
            Settings
          </button>
          <button className="nav-btn" onClick={() => navigate('/profile')} title="Profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </button>
          <button className="nav-btn logout-btn" onClick={handleLogout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="chat-content">
      {/* Sidebar with threads */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button className="new-chat-btn" onClick={handleCreateThread} title="New Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div className="threads-list">
          {threads.length === 0 ? (
            <div className="empty-state">
              <p>No chats yet</p>
              <p className="empty-hint">Click + to start a new chat</p>
            </div>
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                className={`thread-item ${thread.id === activeThreadId ? 'active' : ''}`}
                onClick={() => handleSelectThread(thread.id)}
              >
                <div className="thread-content">
                  <div className="thread-title">{thread.title}</div>
                  {thread.lastMessage && (
                    <div className="thread-preview">{thread.lastMessage}</div>
                  )}
                  <div className="thread-meta">
                    {thread.messageCount} messages • {new Date(thread.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="delete-thread-btn"
                  onClick={(e) => handleDeleteThread(thread.id, e)}
                  title="Delete chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {activeThreadId ? (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <h3>Start a conversation</h3>
                  <p>Ask me anything about your Tally data!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div key={message.id} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Show streaming assistant message */}
              {currentAssistantMessage && (
                <div className="message assistant">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="message-text">{currentAssistantMessage}</div>
                  </div>
                </div>
              )}
              
              {/* Show tool status */}
              {toolStatus && (
                <div className="tool-status">
                  <div className="tool-status-icon">
                    <div className="spinner"></div>
                  </div>
                  <div className="tool-status-text">{toolStatus}</div>
                </div>
              )}
              
              {/* Show typing indicator when loading but no tool status */}
              {isLoading && !toolStatus && !currentAssistantMessage && (
                <div className="message assistant">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <textarea
                className="message-input"
                placeholder="Ask about your Tally data..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={1}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="no-thread-selected">
            <h3>No chat selected</h3>
            <p>Select a chat from the sidebar or create a new one</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
