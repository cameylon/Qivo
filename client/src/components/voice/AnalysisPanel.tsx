import { User, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisPanelProps {
  currentEmotion?: {
    sentiment: string;
    emotions: {
      positive: number;
      neutral: number;
      negative: number;
    };
    currentEmotion: string;
    confidence: number;
  };
  currentSpeaker?: {
    id: string;
    name: string;
    confidence?: string;
  };
}

export function AnalysisPanel({ currentEmotion, currentSpeaker }: AnalysisPanelProps) {
  const emotions = currentEmotion?.emotions || { positive: 45, neutral: 35, negative: 20 };
  const mainEmotion = currentEmotion?.currentEmotion || "Curious & Engaged";
  
  const speaker = currentSpeaker || {
    id: "Unknown",
    name: "No Speaker Detected",
    confidence: "0%",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Emotion Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Analysis</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm font-medium">Positive</span>
            </div>
            <span className="text-sm text-gray-600">{emotions.positive}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${emotions.positive}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-sm font-medium">Neutral</span>
            </div>
            <span className="text-sm text-gray-600">{emotions.neutral}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gray-400 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${emotions.neutral}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm font-medium">Negative</span>
            </div>
            <span className="text-sm text-gray-600">{emotions.negative}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${emotions.negative}%` }}
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-center">
              <span className="text-sm text-gray-600">Current Emotion:</span>
              <span className="ml-2 text-sm font-semibold text-green-600">{mainEmotion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Recognition */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Speaker Recognition</h3>
        <div className="text-center mb-4">
          <div className="w-16 h-16 gradient-primary rounded-full mx-auto mb-3 flex items-center justify-center">
            <User className="text-white text-lg h-6 w-6" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">{speaker.name}</h4>
          <p className="text-sm text-gray-600">
            Active Voice Profile
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Match Confidence:</span>
            <span className="font-medium text-green-600">
              {speaker.confidence || "85%"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Voice Profile:</span>
            <span className="font-medium">{speaker.id}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Sessions:</span>
            <span className="font-medium">Active session</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Seen:</span>
            <span className="font-medium">Now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
