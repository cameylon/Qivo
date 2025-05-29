import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmotionalAnalysis } from "@/components/EmotionalAnalysis";
import { DataVisualization } from "@/components/DataVisualization";
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Download, 
  Wifi, 
  WifiOff,
  User,
  Brain,
  Activity,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  emotion?: string;
  emotionAnalysis?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    emotions: {
      joy: number;
      sadness: number;
      anger: number;
      fear: number;
      surprise: number;
      disgust: number;
      trust: number;
      anticipation: number;
    };
    dominantEmotion: string;
    emotionalIntensity: number;
    confidence: number;
    psychologicalInsights: {
      stressLevel: number;
      engagementLevel: number;
      cognitiveLoad: number;
      emotionalStability: number;
    };
    contextualFactors: {
      formality: number;
      urgency: number;
      clarity: number;
      empathy: number;
    };
    recommendations: string[];
  };
  speaker?: {
    id: string;
    name: string;
  };
  processingTime?: number;
  model?: string;
}

export default function VoiceProcessing() {
  const { toast } = useToast();
  
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [metrics, setMetrics] = useState({
    transcriptionConfidence: 0,
    emotionConfidence: 0,
    avgResponseTime: 0
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout>();

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
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
      case 'response':
        handleResponseMessage(data.data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleResponseMessage = (data: any) => {
    switch (data.action) {
      case 'session_started':
        setSessionId(data.sessionId);
        break;
      case 'transcript_ready':
        setMessages(prev => [...prev, {
          type: 'user',
          content: data.transcript,
          timestamp: new Date(),
          confidence: data.confidence,
        }]);
        break;
      case 'voice_processed':
        setMessages(prev => [...prev, {
          type: 'ai',
          content: data.aiResponse,
          timestamp: new Date(),
          processingTime: data.processingTime,
          model: 'gpt-4o',
        }]);
        
        setMetrics({
          transcriptionConfidence: Math.round(data.confidence * 100),
          emotionConfidence: Math.round((data.emotion?.confidence || 0) * 100),
          avgResponseTime: data.processingTime / 1000,
        });
        break;
    }
  };

  const sendMessage = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      console.log(`Sent WebSocket message: ${typeof data === 'string' ? data.length : data.byteLength} bytes`);
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              sendMessage(reader.result);
            }
          };
          reader.readAsArrayBuffer(audioBlob);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Error",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    setRecordingDuration(0);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
  };

  // Session management
  const handleStartSession = async () => {
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "WebSocket is not connected",
        variant: "destructive",
      });
      return;
    }

    const message = JSON.stringify({
      type: 'control',
      data: { action: 'start_session' },
    });

    sendMessage(message);
    
    toast({
      title: "Session Starting",
      description: "Initializing voice session...",
    });
  };

  const handleEndSession = async () => {
    if (isRecording) {
      stopRecording();
    }

    if (sessionId) {
      const message = JSON.stringify({
        type: 'control',
        data: { action: 'end_session' },
      });
      sendMessage(message);
    }

    setSessionId(null);
    toast({
      title: "Session Ended",
      description: "Voice session terminated",
    });
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!sessionId) {
        await handleStartSession();
        // Wait a moment for session to start
        setTimeout(() => {
          startRecording();
        }, 1000);
      } else {
        await startRecording();
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      stopRecording();
    };
  }, [connectWebSocket]);

  const userMessages = messages.filter(m => m.type === 'user');
  const aiMessages = messages.filter(m => m.type === 'ai');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Voice Processing Studio</h1>
          <p className="text-lg text-gray-600">Real-time speech-to-text with AI responses</p>
        </div>

        {/* Connection Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {connectionStatus}
              </Badge>
              {sessionId && (
                <Badge variant="outline">Session {sessionId}</Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!sessionId ? (
                <Button onClick={handleStartSession} disabled={!isConnected}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Session
                </Button>
              ) : (
                <Button onClick={handleEndSession} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recording Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center space-y-2">
                <Button
                  onClick={handleToggleRecording}
                  disabled={!isConnected}
                  size="lg"
                  className={`h-16 w-16 rounded-full ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {isRecording ? (
                    <Square className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
                <p className="text-sm font-medium">
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </p>
              </div>
              
              {isRecording && (
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold">
                    {formatDuration(recordingDuration)}
                  </div>
                  <p className="text-sm text-gray-600">Duration</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation Panel */}
          <div className="lg:col-span-2">
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Conversation</span>
                  <Badge variant="outline">{messages.length} messages</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Start recording to begin conversation</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex space-x-3 p-3 rounded-lg ${
                            message.type === 'user' 
                              ? "bg-blue-50 ml-8" 
                              : "bg-gray-50 mr-8"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                            message.type === 'user' ? "bg-blue-500" : "bg-gray-500"
                          }`}>
                            {message.type === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Brain className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">
                                {message.type === 'user' ? 'You' : 'AI Assistant'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-gray-700">{message.content}</p>
                            {message.confidence && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {Math.round(message.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Panel */}
          <div className="space-y-6">
            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Transcription Confidence</span>
                    <span>{metrics.transcriptionConfidence}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${metrics.transcriptionConfidence}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Emotion Confidence</span>
                    <span>{metrics.emotionConfidence}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${metrics.emotionConfidence}%` }}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">User Messages</p>
                      <p className="text-xl font-bold">{userMessages.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">AI Responses</p>
                      <p className="text-xl font-bold">{aiMessages.length}</p>
                    </div>
                  </div>

                  {metrics.avgResponseTime > 0 && (
                    <div className="mt-3">
                      <p className="text-gray-600 text-sm">Avg Response Time</p>
                      <p className="text-lg font-bold">{metrics.avgResponseTime.toFixed(1)}s</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}