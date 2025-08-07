import { ChatMessage } from './api';
import { 
  ChatSource, 
  MessageType, 
  SearchMode, 
  FormatType, 
  WorldConnectionsMode, 
  ActiveTab,
  FeedbackType 
} from './chat';

export interface ChatPair extends Omit<ChatMessage, 'message'> {
  message: string | object;
}

export interface CachedThread {
  messages: ChatPair[];
  timestamp: number;
}

export interface ChatThreadViewProps {
  threadId: string;
}

export interface ChatThreadViewState {
  query: string;
  selectedAgent: string;
  format: FormatType;
  searchMode: SearchMode;
  worldConnectionsMode: WorldConnectionsMode;
  messages: MessageType[];
  feedbackModalOpen: boolean;
  linkedinModalOpen: boolean;
  currentFeedback: FeedbackType | null;
  activeTab: ActiveTab;
  chatPairs: ChatPair[];
  messagesOffset: number;
  hasMoreMessages: boolean;
  currentMessageIndex: number;
  isLoading: boolean;
  initialLoadComplete: boolean;
  cachedThreads: Record<string, CachedThread>;
}
