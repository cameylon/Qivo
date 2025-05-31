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
  wsRef: React.MutableRefObject<WebSocket | null>;
  queryData: (action: string, params?: any) => Promise<any>;
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
  const dataRequestsRef = useRef<Map<string, { resolve: (value: any) => void; reject: (error: any) => void }>>(new Map());

  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('WebSocket message received:', data);
    
    if (data.type === 'response') {
      setMessages(prev => [...prev, {
        type: data.data.speaker?.id === 'user' ? 'user' : 'ai',
        content: data.data.transcript || data.data.aiResponse || data.data.content,
        timestamp: new Date(),
        confidence: data.data.confidence,
        emotion: data.data.emotion?.dominantEmotion,
        speaker: data.data.speaker,
        processingTime: data.data.processingTime,
        model: data.data.model,
      }]);
      
      if (data.data.metrics) {
        setMetrics(data.data.metrics);
      }
    } else if (data.type === 'control') {
      if (data.data.action === 'session_started') {
        setSessionId(data.data.sessionId);
      } else if (data.data.action === 'session_ended') {
        setSessionId(null);
      }
    } else if (data.type === 'data') {
      const requestId = data.data.requestId;
      if (requestId && dataRequestsRef.current.has(requestId)) {
        const request = dataRequestsRef.current.get(requestId);
        if (request) {
          request.resolve(data.data);
          dataRequestsRef.current.delete(requestId);
        }
      }
    } else {
      console.warn(`Unknown message type: ${data.type}`);
    }
  }, []);

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

        // Play TTS audio if available
        if (data.aiAudio && data.aiAudio.audioData) {
          try {
            const audioBytes = atob(data.aiAudio.audioData);
            const audioArray = new Uint8Array(audioBytes.length);
            for (let i = 0; i < audioBytes.length; i++) {
              audioArray[i] = audioBytes.charCodeAt(i);
            }
            
            const audioBlob = new Blob([audioArray], { type: `audio/${data.aiAudio.format}` });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.play().then(() => {
              console.log('Playing AI response audio');
            }).catch(error => {
              console.warn('Failed to play AI audio:', error);
            });
            
            // Clean up URL after playing
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };
          } catch (error) {
            console.warn('Failed to process AI audio:', error);
          }
        }

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
      const dataSize = typeof data === 'string' ? data.length : data.byteLength;
      console.log(`Sending WebSocket message: ${dataSize} bytes, type: ${typeof data}`);
      
      // Debug: Log data type and first few bytes for binary data
      if (data instanceof ArrayBuffer) {
        const uint8View = new Uint8Array(data.slice(0, 20));
        console.log(`ArrayBuffer preview:`, Array.from(uint8View));
      }
      
      wsRef.current.send(data);
      console.log(`Message sent successfully via WebSocket`);
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

  const queryData = useCallback(async (action: string, params?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!isConnected || !wsRef.current) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = Math.random().toString(36).substring(7);
      dataRequestsRef.current.set(requestId, { resolve, reject });

      const message = JSON.stringify({
        type: 'control',
        data: { action, requestId, ...params }
      });

      try {
        wsRef.current.send(message);
        
        // Set timeout for requests
        setTimeout(() => {
          if (dataRequestsRef.current.has(requestId)) {
            const request = dataRequestsRef.current.get(requestId);
            if (request) {
              request.reject(new Error('Request timeout'));
              dataRequestsRef.current.delete(requestId);
            }
          }
        }, 10000); // 10 second timeout
      } catch (error) {
        dataRequestsRef.current.delete(requestId);
        reject(error);
      }
    });
  }, [isConnected]);

  return {
    isConnected,
    connectionStatus,
    messages,
    metrics,
    sendMessage,
    startSession,
    endSession,
    wsRef,
    queryData,
  };
}
