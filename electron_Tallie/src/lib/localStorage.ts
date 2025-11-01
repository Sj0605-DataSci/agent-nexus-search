/**
 * LocalStorage utility for chat threads and messages
 */

import { ChatThread, ChatMessage, ChatState } from '../types/chat';
import { TallyConfig } from '../types/tally';
import { DeviceInfo } from '../types/device';

const STORAGE_KEYS = {
  CHAT_STATE: 'tally_chat_state',
  TALLY_CONFIG: 'tally_config',
  DEVICE_INFO: 'device_info',
};

// ============================================
// Chat State Management
// ============================================

export const getChatState = (): ChatState => {
  const stored = localStorage.getItem(STORAGE_KEYS.CHAT_STATE);
  if (!stored) {
    return {
      threads: [],
      activeThreadId: null,
      messages: {},
    };
  }
  return JSON.parse(stored);
};

export const saveChatState = (state: ChatState): void => {
  localStorage.setItem(STORAGE_KEYS.CHAT_STATE, JSON.stringify(state));
};

export const createThread = (title?: string): ChatThread => {
  const state = getChatState();
  
  const newThread: ChatThread = {
    id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title || 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
  };
  
  state.threads.unshift(newThread);
  state.activeThreadId = newThread.id;
  state.messages[newThread.id] = [];
  
  saveChatState(state);
  return newThread;
};

export const getThreads = (): ChatThread[] => {
  const state = getChatState();
  return state.threads;
};

export const getThread = (threadId: string): ChatThread | undefined => {
  const state = getChatState();
  return state.threads.find(t => t.id === threadId);
};

export const updateThread = (threadId: string, updates: Partial<ChatThread>): void => {
  const state = getChatState();
  const threadIndex = state.threads.findIndex(t => t.id === threadId);
  
  if (threadIndex !== -1) {
    state.threads[threadIndex] = {
      ...state.threads[threadIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveChatState(state);
  }
};

export const deleteThread = (threadId: string): void => {
  const state = getChatState();
  state.threads = state.threads.filter(t => t.id !== threadId);
  delete state.messages[threadId];
  
  if (state.activeThreadId === threadId) {
    state.activeThreadId = state.threads[0]?.id || null;
  }
  
  saveChatState(state);
};

export const setActiveThread = (threadId: string): void => {
  const state = getChatState();
  state.activeThreadId = threadId;
  saveChatState(state);
};

export const getActiveThreadId = (): string | null => {
  const state = getChatState();
  return state.activeThreadId;
};

// ============================================
// Message Management
// ============================================

export const getMessages = (threadId: string): ChatMessage[] => {
  const state = getChatState();
  return state.messages[threadId] || [];
};

export const addMessage = (threadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
  const state = getChatState();
  
  const newMessage: ChatMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  if (!state.messages[threadId]) {
    state.messages[threadId] = [];
  }
  
  state.messages[threadId].push(newMessage);
  
  // Update thread
  const thread = state.threads.find(t => t.id === threadId);
  if (thread) {
    thread.messageCount = state.messages[threadId].length;
    thread.lastMessage = message.content.substring(0, 50);
    thread.updatedAt = new Date().toISOString();
  }
  
  saveChatState(state);
  return newMessage;
};

export const updateMessage = (threadId: string, messageId: string, content: string): void => {
  const state = getChatState();
  
  if (state.messages[threadId]) {
    const messageIndex = state.messages[threadId].findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      state.messages[threadId][messageIndex].content = content;
      saveChatState(state);
    }
  }
};

export const clearMessages = (threadId: string): void => {
  const state = getChatState();
  state.messages[threadId] = [];
  
  const thread = state.threads.find(t => t.id === threadId);
  if (thread) {
    thread.messageCount = 0;
    thread.lastMessage = undefined;
  }
  
  saveChatState(state);
};

// ============================================
// Tally Configuration
// ============================================

export const getTallyConfig = (): TallyConfig => {
  const stored = localStorage.getItem(STORAGE_KEYS.TALLY_CONFIG);
  if (!stored) {
    return {
      port: 9000,
      connected: false,
    };
  }
  return JSON.parse(stored);
};

export const saveTallyConfig = (config: TallyConfig): void => {
  localStorage.setItem(STORAGE_KEYS.TALLY_CONFIG, JSON.stringify(config));
};

// ============================================
// Device Info
// ============================================

export const getDeviceInfo = (): DeviceInfo | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.DEVICE_INFO);
  if (!stored) return null;
  return JSON.parse(stored);
};

export const saveDeviceInfo = (info: DeviceInfo): void => {
  localStorage.setItem(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(info));
};

export const clearDeviceInfo = (): void => {
  localStorage.removeItem(STORAGE_KEYS.DEVICE_INFO);
};
