/**
 * Chat Service - Handles communication with Tally Chat API
 */

export interface StreamingUpdate {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'token' | 'answer' | 'done' | 'error';
  content?: any;
  tool?: string;
  args?: any;
  result?: any;
}

class ChatService {
  private baseUrl = 'http://localhost:8000';

  /**
   * Send a message to Tally Chat and receive streaming responses
   */
  async sendMessage(
    query: string,
    onUpdate: (update: StreamingUpdate) => void
  ): Promise<void> {
    try {
      // Get auth token
      const token = localStorage.getItem('discover_minds_access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Make request to backend
      const response = await fetch(`${this.baseUrl}/api/chat/tally`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data.trim()) {
              try {
                const update: StreamingUpdate = JSON.parse(data);
                console.log('Received update:', update); // Debug log
                onUpdate(update);
              } catch (e) {
                console.error('Failed to parse SSE data:', data, e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat service error:', error);
      onUpdate({
        type: 'error',
        content: error.message || 'Failed to send message',
      });
    }
  }
}

export const chatService = new ChatService();
