import { useEffect, useRef } from "react";
import { Trash2, Download, User, Bot, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
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

interface ConversationPanelProps {
  messages: Message[];
  isSessionActive: boolean;
}

export function ConversationPanel({ messages, isSessionActive }: ConversationPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearConversation = () => {
    // This would typically clear the conversation
    console.log("Clear conversation");
  };

  const handleExportConversation = () => {
    const conversationData = {
      messages,
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
    };
    
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], {
      type: "application/json",
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-96">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Conversation</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportConversation}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Mic className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No conversation yet</p>
              <p className="text-xs mt-1">Start recording to begin voice processing</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === 'user' ? (
                  /* User Message */
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600 text-sm h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm text-gray-900">{message.content}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatTime(message.timestamp)}</span>
                        {message.confidence && (
                          <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                        )}
                        {message.emotion && (
                          <span className="text-blue-600">Emotion: {message.emotion}</span>
                        )}
                        {message.speaker && (
                          <span>Speaker: {message.speaker.id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : message.type === 'ai' ? (
                  /* AI Response */
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                      <Bot className="text-white text-sm h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="gradient-primary-subtle rounded-lg p-3 border border-primary/20">
                        <p className="text-sm text-gray-900">{message.content}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatTime(message.timestamp)}</span>
                        {message.processingTime && (
                          <span>Generated in: {(message.processingTime / 1000).toFixed(1)}s</span>
                        )}
                        {message.model && (
                          <span>Model: {message.model}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* System Message */
                  <div className="flex justify-center">
                    <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                      <p className="text-xs text-gray-600 text-center">{message.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Processing Indicator */}
            {isSessionActive && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                  <Bot className="text-white text-sm h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span className="text-sm text-gray-600">Ready for voice input...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
