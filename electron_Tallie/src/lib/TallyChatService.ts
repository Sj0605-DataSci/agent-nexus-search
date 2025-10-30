/**
 * Tally Chat Service - WebSocket-based communication with backend
 * Handles bidirectional communication for Tally operations
 */

import { TallyService } from './TallyService';
import { getWSBaseURL } from '../config/environment';

export interface TallyMessage {
  type: 'query' | 'tally_xml' | 'tally_result' | 'thinking' | 'answer' | 'error' | 'done';
  content?: any;
  xml?: string;
  operation?: string;
  result?: any;
  success?: boolean;
  message?: string;
}

export interface TallyChatCallbacks {
  onThinking?: (message: string) => void;
  onAnswer?: (message: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

class TallyChatService {
  private ws: WebSocket | null = null;
  private tallyService: TallyService;
  private callbacks: TallyChatCallbacks = {};
  private baseUrl = getWSBaseURL(); // WebSocket URL from environment config
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private shouldReconnect = true; // Flag to control reconnection

  constructor() {
    this.tallyService = new TallyService();
  }

  /**
   * Connect to backend WebSocket
   */
  connect(userId: string, callbacks: TallyChatCallbacks) {
    this.callbacks = callbacks;
    this.shouldReconnect = true; // Enable reconnection when explicitly connecting
    
    // Close existing connection if any
    if (this.ws) {
      this.shouldReconnect = false; // Don't reconnect the old connection
      this.ws.close();
    }

    const wsUrl = `${this.baseUrl}/api/chat/tally/ws/${userId}`;
    console.log('Connecting to Tally WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Tally WebSocket connected');
      this.reconnectAttempts = 0;
      this.shouldReconnect = true; // Re-enable after successful connection
      
      // Send a ready/ping message to keep connection alive
      // Backend expects messages, so send a ping to prevent immediate disconnect
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          message: 'Client connected and ready'
        }));
      }
    };

    this.ws.onmessage = async (event) => {
      try {
        const data: TallyMessage = JSON.parse(event.data);
        await this.handleMessage(data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Tally WebSocket error:', error);
      this.callbacks.onError?.('Connection error occurred');
    };

    this.ws.onclose = () => {
      console.log('Tally WebSocket disconnected');
      
      // Only attempt to reconnect if shouldReconnect is true
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
          this.connect(userId, callbacks);
        }, this.reconnectDelay);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.callbacks.onError?.('Connection lost. Please refresh the page.');
      }
      // If shouldReconnect is false, just close without reconnecting
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(data: TallyMessage) {
    console.log('Received message:', data.type);

    switch (data.type) {
      case 'thinking':
        // Show thinking indicator
        const thinkingMsg = data.content?.message || 'Processing...';
        this.callbacks.onThinking?.(thinkingMsg);
        break;

      case 'tally_xml':
        // Backend wants us to execute XML on local Tally
        console.log('Received XML execution request');
        await this.executeTallyXML(data.xml!, data.operation);
        break;

      case 'answer':
        // Show answer to user
        const answerMsg = data.content?.message || data.content;
        this.callbacks.onAnswer?.(answerMsg);
        break;

      case 'done':
        // Query completed
        this.callbacks.onDone?.();
        break;

      case 'error':
        // Show error to user
        const errorMsg = data.content?.message || data.content || 'An error occurred';
        this.callbacks.onError?.(errorMsg);
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  /**
   * Execute XML on local Tally and send result back to backend
   */
  private async executeTallyXML(xml: string, operation?: string) {
    try {
      console.log('Executing XML on Tally:', operation);
      
      // Execute XML on local Tally
      const result = await this.tallyService.executeRawXML(xml);
      
      // Send result back to backend
      this.sendMessage({
        type: 'tally_result',
        result: result,
        success: true,
        operation: operation
      });
      
      console.log('Tally XML executed successfully');
    } catch (error: any) {
      console.error('Error executing Tally XML:', error);
      
      // Send error back to backend
      this.sendMessage({
        type: 'tally_result',
        result: null,
        success: false,
        message: error.message || 'Failed to execute XML on Tally'
      });
    }
  }

  /**
   * Send a message through WebSocket
   */
  private sendMessage(message: TallyMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      this.callbacks.onError?.('Not connected to server');
    }
  }

  /**
   * Send a user query
   */
  sendQuery(query: string) {
    this.sendMessage({
      type: 'query',
      message: query
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.shouldReconnect = false; // Disable reconnection on intentional disconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0; // Reset reconnect attempts
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const tallyChatService = new TallyChatService();
