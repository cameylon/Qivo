import { useState, useEffect } from "react";
import { Sidebar } from "@/components/voice/Sidebar";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import { ConversationPanel } from "@/components/voice/ConversationPanel";
import { MetricsPanel } from "@/components/voice/MetricsPanel";
import { AnalysisPanel } from "@/components/voice/AnalysisPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import { Mic, Square, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VoiceProcessing() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const {
    isConnected,
    connectionStatus,
    messages,
    metrics,
    sendMessage,
    startSession,
    endSession,
    wsRef,
  } = useWebSocket();

  const {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    recordingDuration,
    audioFormat,
  } = useAudioRecorder((audioBlob) => {
    if (sessionId && isConnected && audioBlob.size > 1024) {
      console.log(`Processing audio chunk: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      // Convert blob to ArrayBuffer and send as binary data
      audioBlob.arrayBuffer().then((buffer) => {
        console.log(`Transmitting audio: ${buffer.byteLength} bytes`);
        sendMessage(buffer);
      }).catch((error) => {
        console.error('Audio conversion failed:', error);
      });
    }
  });

  const handleStartSession = async () => {
    try {
      const newSessionId = await startSession();
      setSessionId(newSessionId);
      setIsSessionActive(true);
      toast({
        title: "Session Started",
        description: "Voice processing session is now active",
      });
    } catch (error) {
      toast({
        title: "Session Error",
        description: error.message,
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
      setIsSessionActive(false);
      toast({
        title: "Session Ended",
        description: "Voice processing session has been terminated",
      });
    } catch (error) {
      toast({
        title: "Session Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartRecording = async () => {
    if (!isSessionActive) {
      await handleStartSession();
    }
    
    try {
      await startRecording();
      toast({
        title: "Recording Started",
        description: "Now listening for voice input",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({
      title: "Recording Stopped",
      description: "Voice input processing complete",
    });
  };

  const handleExportSession = () => {
    const data = {
      sessionId,
      messages: messages.slice(-50), // Last 50 messages
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
      description: "Session data has been downloaded",
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        metrics={metrics}
        sessionId={sessionId}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Real-time Voice Processing
              </h2>
              <p className="text-sm text-gray-600">
                Monitor live audio streams and AI responses
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Audio Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleStartRecording}
                  disabled={isRecording || !isConnected}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleStopRecording}
                  disabled={!isRecording}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <Button
                onClick={handleExportSession}
                disabled={!sessionId}
                className="gradient-primary text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Session
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Audio Input & Metrics */}
            <div className="lg:col-span-1 space-y-6">
              <AudioVisualizer
                isRecording={isRecording}
                audioLevel={audioLevel}
                duration={recordingDuration}
                audioFormat={audioFormat}
              />
              <MetricsPanel metrics={metrics} />
            </div>

            {/* Right Column: Conversation & Analysis */}
            <div className="lg:col-span-2 space-y-6">
              <ConversationPanel
                messages={messages}
                isSessionActive={isSessionActive}
              />
              <AnalysisPanel
                currentEmotion={messages[messages.length - 1]?.emotion}
                currentSpeaker={messages[messages.length - 1]?.speaker}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
