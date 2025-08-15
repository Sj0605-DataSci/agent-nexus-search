// Base types for chat functionality

export type SearchMode = "basic" | "deep";
export type FormatType = "chat" | "table";
export type WorldConnectionsMode = "connections" | "world";

export type ActiveTab = "content" | "sources";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
}

// Source type for chat message sources
export interface ChatSource {
  value: string;
  title: string;
  short_url?: string;
  [key: string]: unknown; // For any additional properties
}

export interface FeedbackType {
  messageId: string;
  isPositive: boolean;
  comment?: string;
}

export interface MessageType {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
  is_positive?: boolean;
  sources_gathered?: ChatSource[];
  [key: string]: unknown;
}
