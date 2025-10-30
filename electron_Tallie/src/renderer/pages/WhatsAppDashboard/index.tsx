import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../../../lib/api/axiosInstance';
import './styles.css';

interface WhatsAppThread {
  id: string;
  user_id: string;
  title: string;
  device_type: string;
  device_id: string;
  weave_url: string;
  created_at: string;
  updated_at: string;
}

interface WhatsAppMessage {
  id: string;
  user_id: string;
  agent_id: string;
  chat_thread_id: string;
  main_query: string;
  message: {
    content: string;
  };
  weave_url: string;
  device_type: string;
  device_id: string;
  endpoint: string;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

const WhatsAppDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<WhatsAppThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<WhatsAppThread | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [threadsPage, setThreadsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [threadsPagination, setThreadsPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch WhatsApp threads
  const fetchThreads = async (page: number = 1) => {
    setLoading(true);
    try {
      // Use axiosInstance which handles authentication automatically
      const response = await axiosInstance.get(
        `/chat/threads?page=${page}&page_size=20`
      );

      const result = response.data;
      
      console.log('📊 API Response:', result);
      console.log('📋 All threads:', result.data.threads);
      console.log('📋 Total threads:', result.data.threads.length);
      
      // Check device types in all threads
      const deviceTypes = result.data.threads.map((t: any) => t.device_type);
      console.log('📱 Device types found:', [...new Set(deviceTypes)]);
      
      // Filter only WhatsApp threads
      const whatsappThreads = result.data.threads.filter(
        (thread: WhatsAppThread) => thread.device_type === 'whatsapp'
      );
      
      console.log('📱 WhatsApp threads:', whatsappThreads);
      console.log('📱 WhatsApp count:', whatsappThreads.length);

      // Show only WhatsApp threads
      setThreads(whatsappThreads);
      
      // Update pagination to reflect filtered count
      const whatsappCount = whatsappThreads.length;
      const filteredPagination = {
        total: whatsappCount,
        page: page,
        page_size: 20,
        total_pages: Math.ceil(whatsappCount / 20),
        has_next: false, // Since we're filtering client-side, no next page
        has_previous: page > 1
      };
      setThreadsPagination(filteredPagination);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast.error('Failed to load WhatsApp threads');
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a thread
  const fetchMessages = async (threadId: string, page: number = 1) => {
    setLoading(true);
    try {
      // Use axiosInstance which handles authentication automatically
      const response = await axiosInstance.get(
        `/chat/messages/${threadId}?page=${page}&page_size=50`
      );

      console.log('💬 Messages API Response:', response.data);
      console.log('💬 Messages data:', response.data.data);
      
      // The API returns { total: X, messages: [...] }
      const messagesData = response.data.data?.messages || [];
      
      console.log('💬 Extracted messages:', messagesData);
      console.log('💬 Message count:', messagesData.length);
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      setMessages([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Load threads on mount
  useEffect(() => {
    fetchThreads(threadsPage);
  }, [threadsPage]);

  // Handle thread selection
  const handleThreadClick = (thread: WhatsAppThread) => {
    setSelectedThread(thread);
    setMessagesPage(1);
    fetchMessages(thread.id, 1);
  };

  // Handle back to threads
  const handleBackToThreads = () => {
    setSelectedThread(null);
    setMessages([]);
  };

  // Filter threads by search query
  const filteredThreads = threads.filter((thread) =>
    (thread.device_id?.includes(searchQuery) || false) ||
    (thread.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format time for messages
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render threads list view
  if (!selectedThread) {
    return (
      <div className="whatsapp-dashboard">
        <div className="dashboard-header">
          <button onClick={() => navigate('/chat')} className="back-btn" style={{ marginBottom: '16px' }}>
            ← Back to Chat
          </button>
          <h1>📱 WhatsApp Dashboard</h1>
          <p className="subtitle">View and manage WhatsApp bot conversations</p>
        </div>

        <div className="search-filter-bar">
          <input
            type="text"
            placeholder="Search by phone number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="stats">
            <span className="stat-badge">
              {threadsPagination?.total || 0} Total Threads
            </span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading threads...</p>
          </div>
        ) : (
          <>
            <div className="threads-list">
              {filteredThreads.length === 0 ? (
                <div className="empty-state">
                  <p>No WhatsApp conversations found</p>
                  <small>Threads will appear here when customers message the bot</small>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="thread-item"
                    onClick={() => handleThreadClick(thread)}
                  >
                    <div className="thread-icon">📱</div>
                    <div className="thread-info">
                      <div className="thread-title">{thread.title}</div>
                      <div className="thread-phone">{thread.device_id}</div>
                    </div>
                    <div className="thread-meta">
                      <div className="thread-time">
                        {formatTimestamp(thread.updated_at)}
                      </div>
                      <div className="thread-date">
                        {new Date(thread.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {threadsPagination && threadsPagination.total_pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setThreadsPage((p) => p - 1)}
                  disabled={!threadsPagination.has_previous}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {threadsPagination.page} of {threadsPagination.total_pages}
                </span>
                <button
                  onClick={() => setThreadsPage((p) => p + 1)}
                  disabled={!threadsPagination.has_next}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Render messages view
  return (
    <div className="whatsapp-dashboard">
      <div className="messages-header">
        <button onClick={handleBackToThreads} className="back-btn">
          ← Back to Threads
        </button>
        <div className="thread-details">
          <h2>{selectedThread.title}</h2>
          <p className="thread-phone">{selectedThread.device_id}</p>
          <p className="thread-date">
            Started: {new Date(selectedThread.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      ) : (
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages in this thread</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="message-group">
                <div className="message user-message">
                  <div className="message-header">
                    <span className="message-sender">👤 Customer</span>
                    <span className="message-time">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                  <div className="message-content">{msg.main_query}</div>
                </div>

                <div className="message agent-message">
                  <div className="message-header">
                    <span className="message-sender">🤖 Agent</span>
                    <span className="message-time">
                      {formatMessageTime(msg.updated_at)}
                    </span>
                  </div>
                  <div className="message-content">{msg.message.content}</div>
                  {msg.weave_url && (
                    <a
                      href={msg.weave_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trace-link"
                    >
                      🔗 View Trace
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppDashboard;
