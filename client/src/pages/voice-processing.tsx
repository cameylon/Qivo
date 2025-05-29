import { useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

export default function VoiceProcessing() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<number | null>(null);

  const {
    isConnected,
    connectionStatus,
    messages,
    metrics,
    sendMessage,
    startSession,
    endSession,
  } = useWebSocket();

  const {
    isRecording,
    audioLevel,
    recordingDuration,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecorder({
    onAudioData: useCallback((audioBlob: Blob) => {
      if (sessionId && isConnected && audioBlob.size > 0) {
        console.log(`Processing audio: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            console.log(`Sending audio data: ${reader.result.byteLength} bytes`);
            sendMessage(reader.result);
          }
        };
        reader.onerror = () => {
          console.error('Failed to read audio blob');
          toast({
            title: "Audio Error",
            description: "Failed to process audio data",
            variant: "destructive",
          });
        };
        reader.readAsArrayBuffer(audioBlob);
      }
    }, [sessionId, isConnected, sendMessage, toast]),
    onError: useCallback((error: string) => {
      toast({
        title: "Recording Error",
        description: error,
        variant: "destructive",
      });
    }, [toast])
  });

  const handleStartSession = async () => {
    try {
      const newSessionId = await startSession();
      setSessionId(newSessionId);
      toast({
        title: "Session Started",
        description: `Voice session ${newSessionId} is active`,
      });
    } catch (error) {
      toast({
        title: "Session Error",
        description: error instanceof Error ? error.message : "Failed to start session",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async () => {
    try {
      if (isRecording) {
        stopRecording();
      }
      await endSession();
      setSessionId(null);
      toast({
        title: "Session Ended",
        description: "Voice session terminated",
      });
    } catch (error) {
      toast({
        title: "Session Error",
        description: error instanceof Error ? error.message : "Failed to end session",
        variant: "destructive",
      });
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (!sessionId) {
        await handleStartSession();
      }
      await startRecording();
    }
  };

  const handleExportSession = () => {
    const data = {
      sessionId,
      messages: messages.slice(-50),
      metrics,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-session-${sessionId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Session Exported",
      description: "Session data downloaded successfully",
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const latestMessage = messages[messages.length - 1];
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
              <Button 
                onClick={handleExportSession} 
                disabled={!sessionId || messages.length === 0}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
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
                  className={cn(
                    "h-16 w-16 rounded-full",
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                      : "bg-blue-500 hover:bg-blue-600"
                  )}
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
                <>
                  <div className="flex-1 max-w-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Audio Level</span>
                      <span>{Math.round(audioLevel)}%</span>
                    </div>
                    <Progress value={audioLevel} className="h-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold">
                      {formatDuration(recordingDuration)}
                    </div>
                    <p className="text-sm text-gray-600">Duration</p>
                  </div>
                </>
              )}
            </div>

            {recordingError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{recordingError}</p>
              </div>
            )}
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
                <ScrollArea className="h-80">
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
                          className={cn(
                            "flex space-x-3 p-3 rounded-lg",
                            message.type === 'user' 
                              ? "bg-blue-50 ml-8" 
                              : "bg-gray-50 mr-8"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm",
                            message.type === 'user' ? "bg-blue-500" : "bg-gray-500"
                          )}>
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
                </ScrollArea>
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
                    <span>{metrics?.transcriptionConfidence || 0}%</span>
                  </div>
                  <Progress value={metrics?.transcriptionConfidence || 0} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Emotion Confidence</span>
                    <span>{metrics?.emotionConfidence || 0}%</span>
                  </div>
                  <Progress value={metrics?.emotionConfidence || 0} />
                </div>

                <Separator />

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

                {metrics?.avgResponseTime && (
                  <div>
                    <p className="text-gray-600 text-sm">Avg Response Time</p>
                    <p className="text-lg font-bold">{metrics.avgResponseTime}s</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Analysis */}
            {latestMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>Latest Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestMessage.emotion && (
                    <div>
                      <p className="text-sm text-gray-600">Detected Emotion</p>
                      <Badge variant="outline" className="mt-1">
                        {latestMessage.emotion}
                      </Badge>
                    </div>
                  )}
                  
                  {latestMessage.speaker && (
                    <div>
                      <p className="text-sm text-gray-600">Speaker</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {latestMessage.speaker.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  )}

                  {latestMessage.processingTime && (
                    <div>
                      <p className="text-sm text-gray-600">Processing Time</p>
                      <p className="font-medium">{latestMessage.processingTime}ms</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}