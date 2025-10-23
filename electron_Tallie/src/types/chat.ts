/**
 * Chat Types for Tally Chat Interface
 */

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: Record<string, ChatMessage[]>; // threadId -> messages
}

export interface CreateThreadRequest {
  title?: string;
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
}
