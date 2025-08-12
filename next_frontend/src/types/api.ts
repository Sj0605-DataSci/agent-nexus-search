import { ChatSource } from './chat';

// Base API response type
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

// API response types
export interface ChatMessage {
  id: string;
  main_query: string;
  message: string | object;
  created_at: string;
  updated_at: string;
  sources_gathered?: ChatSource[];
  is_positive?: boolean;
  feedback_comment?: string;
  [key: string]: unknown;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  total: number;
}
// Worker message types
export type WorkerMessageType = 
  | 'process_message' 
  | 'process_search_results' 
  | 'analyze_query' 
  | 'processed_message' 
  | 'query_analysis';

export interface WorkerMessage {
  type: WorkerMessageType;
  data: unknown;
}

// Stream update types
export type StreamUpdateType = 
  | 'thread_id'
  | 'thinking'
  | 'token'
  | 'search_query'
  | 'source'
  | 'message'
  | 'error'
  | 'done'
  | 'connected';

export interface StreamUpdate {
  type: StreamUpdateType;
  content?: {
    thread_id?: string;
    query?: string;
    text?: string;
    message?: string;
    [key: string]: unknown;
  };
  thread_id?: string;
  [key: string]: unknown;
}
