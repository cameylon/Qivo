import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  emotion?: string;
  speaker?: {
    id: string;
    name: string;
  };
  processingTime?: number;
  model?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: string;
  messages: WebSocketMessage[];
  metrics: any;
  sendMessage: (data: string | ArrayBuffer | Uint8Array) => void;
  startSession: () => Promise<number>;
  endSession: () => Promise<void>;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        console.log('WebSocket disconnected');
        
        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          setConnectionStatus(`Reconnecting in ${delay/1000}s...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionStatus('Connection failed');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('Connection failed');
    }
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'control':
        handleControlMessage(data.data);
        break;
      case 'response':
        handleResponseMessage(data.data);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  };

  const handleControlMessage = (data: any) => {
    switch (data.action) {
      case 'connected':
        setMessages(prev => [...prev, {
          type: 'system',
          content: data.message,
          timestamp: new Date(),
        }]);
        break;
      case 'session_started':
        setSessionId(data.sessionId);
        setMessages(prev => [...prev, {
          type: 'system',
          content: `Session ${data.sessionId} started`,
          timestamp: new Date(),
        }]);
        break;
      case 'session_ended':
        setSessionId(null);
        setMessages(prev => [...prev, {
          type: 'system',
          content: 'Session ended',
          timestamp: new Date(),
        }]);
        break;
      case 'error':
        console.error('WebSocket error:', data.error);
        setMessages(prev => [...prev, {
          type: 'system',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        }]);
        break;
      case 'pong':
        // Handle ping/pong for connection health
        break;
    }
  };

  const handleResponseMessage = (data: any) => {
    switch (data.action) {
      case 'processing':
        // Could show a processing indicator
        break;
      case 'transcript_ready':
        // Add user message immediately when transcript is ready
        setMessages(prev => [...prev, {
          type: 'user',
          content: data.transcript,
          timestamp: new Date(),
          confidence: data.confidence,
        }]);
        break;
      case 'voice_processed':
        // Only add AI response since user message was already added in transcript_ready
        setMessages(prev => [...prev, {
          type: 'ai',
          content: data.aiResponse,
          timestamp: new Date(),
          processingTime: data.processingTime,
          model: 'gpt-4o',
        }]);

        // Update metrics
        setMetrics({
          transcriptionConfidence: Math.round(data.confidence * 100),
          emotionConfidence: Math.round(data.emotion?.confidence * 100),
          speakerConfidence: data.speaker?.confidence,
          avgResponseTime: data.processingTime / 1000,
        });
        break;
    }
  };

  const sendMessage = useCallback((data: string | ArrayBuffer | Uint8Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      console.error('WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }
  }, []);

  const startSession = useCallback(async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const message = JSON.stringify({
        type: 'control',
        data: { action: 'start_session' },
      });

      sendMessage(message);

      // Wait for session_started response
      const checkSession = setInterval(() => {
        if (sessionId !== null) {
          clearInterval(checkSession);
          resolve(sessionId);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkSession);
        if (sessionId === null) {
          reject(new Error('Session start timeout'));
        }
      }, 5000);
    });
  }, [isConnected, sendMessage, sessionId]);

  const endSession = useCallback(async (): Promise<void> => {
    if (!isConnected || !sessionId) {
      throw new Error('No active session to end');
    }

    const message = JSON.stringify({
      type: 'control',
      data: { action: 'end_session' },
    });

    sendMessage(message);
  }, [isConnected, sessionId, sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Ping to keep connection alive
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(() => {
        const message = JSON.stringify({
          type: 'control',
          data: { action: 'ping' },
        });
        sendMessage(message);
      }, 30000); // Every 30 seconds

      return () => clearInterval(pingInterval);
    }
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    connectionStatus,
    messages,
    metrics,
    sendMessage,
    startSession,
    endSession,
  };
}
