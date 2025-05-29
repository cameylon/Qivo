import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, PieChart, Activity, Brain, Heart, Users, Target } from "lucide-react";

interface EmotionData {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
}

interface DataVisualizationProps {
  emotions: EmotionData;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
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
  transcriptionConfidence: number;
  avgResponseTime: number;
  messageCount: number;
}

export function DataVisualization({
  emotions,
  sentiment,
  sentimentScore,
  emotionalIntensity,
  confidence,
  psychologicalInsights,
  contextualFactors,
  transcriptionConfidence,
  avgResponseTime,
  messageCount,
}: DataVisualizationProps) {

  const formatPercentage = (value: number) => Math.round(value * 100);

  // Create emotion chart data
  const emotionEntries = Object.entries(emotions).sort(([,a], [,b]) => b - a);
  const maxEmotion = Math.max(...Object.values(emotions));

  // Color schemes for different data types
  const emotionColors = {
    joy: '#fbbf24',
    sadness: '#3b82f6',
    anger: '#ef4444',
    fear: '#8b5cf6',
    surprise: '#f97316',
    disgust: '#10b981',
    trust: '#06b6d4',
    anticipation: '#ec4899',
  };

  const psychologyColors = {
    stressLevel: '#ef4444',
    engagementLevel: '#10b981',
    cognitiveLoad: '#f97316',
    emotionalStability: '#3b82f6',
  };

  const contextColors = {
    formality: '#8b5cf6',
    urgency: '#ef4444',
    clarity: '#06b6d4',
    empathy: '#ec4899',
  };

  // Create radial chart for emotions
  const createRadialPath = (value: number, index: number, total: number) => {
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const endX = centerX + Math.cos(angle) * radius * value;
    const endY = centerY + Math.sin(angle) * radius * value;
    
    return `M ${centerX} ${centerY} L ${endX} ${endY}`;
  };

  return (
    <div className="space-y-6">
      {/* Main Performance Dashboard */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span>Performance Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* KPI Cards */}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {formatPercentage(transcriptionConfidence / 100)}%
              </div>
              <div className="text-sm text-gray-600">Transcription</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${transcriptionConfidence}%` }}
                />
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {formatPercentage(confidence)}%
              </div>
              <div className="text-sm text-gray-600">AI Confidence</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${formatPercentage(confidence)}%` }}
                />
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-purple-600">
                {avgResponseTime.toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Response Time</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (5 - avgResponseTime) * 20)}%` }}
                />
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-orange-600">
                {messageCount}
              </div>
              <div className="text-sm text-gray-600">Messages</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, messageCount * 10)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotion Spectrum Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-red-500" />
            <span>Emotion Spectrum Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Emotion Bar Chart */}
            <div>
              <h4 className="font-semibold mb-4 text-center">Emotion Intensity Levels</h4>
              <div className="space-y-3">
                {emotionEntries.map(([emotion, value]) => (
                  <div key={emotion} className="flex items-center space-x-3">
                    <div className="w-20 text-sm font-medium capitalize">{emotion}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                      <div 
                        className="h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                        style={{ 
                          width: `${formatPercentage(value)}%`,
                          background: `linear-gradient(90deg, ${emotionColors[emotion as keyof typeof emotionColors]}80, ${emotionColors[emotion as keyof typeof emotionColors]})`
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {formatPercentage(value)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl">
                      {emotion === 'joy' && '😊'}
                      {emotion === 'sadness' && '😢'}
                      {emotion === 'anger' && '😠'}
                      {emotion === 'fear' && '😨'}
                      {emotion === 'surprise' && '😲'}
                      {emotion === 'disgust' && '🤢'}
                      {emotion === 'trust' && '🤝'}
                      {emotion === 'anticipation' && '🎯'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emotion Radar Chart */}
            <div className="flex flex-col items-center">
              <h4 className="font-semibold mb-4">Emotion Radar</h4>
              <div className="relative">
                <svg width="200" height="200" className="transform rotate-0">
                  {/* Background circles */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  <circle cx="100" cy="100" r="60" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  <circle cx="100" cy="100" r="40" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  <circle cx="100" cy="100" r="20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  
                  {/* Emotion lines */}
                  {emotionEntries.map(([emotion, value], index) => {
                    const angle = (index / emotionEntries.length) * 2 * Math.PI - Math.PI / 2;
                    const endX = 100 + Math.cos(angle) * 80 * value;
                    const endY = 100 + Math.sin(angle) * 80 * value;
                    const labelX = 100 + Math.cos(angle) * 95;
                    const labelY = 100 + Math.sin(angle) * 95;
                    
                    return (
                      <g key={emotion}>
                        <line 
                          x1="100" 
                          y1="100" 
                          x2={endX} 
                          y2={endY}
                          stroke={emotionColors[emotion as keyof typeof emotionColors]}
                          strokeWidth="3"
                          className="transition-all duration-1000"
                        />
                        <circle 
                          cx={endX} 
                          cy={endY} 
                          r="4" 
                          fill={emotionColors[emotion as keyof typeof emotionColors]}
                          className="transition-all duration-1000"
                        />
                        <text 
                          x={labelX} 
                          y={labelY} 
                          textAnchor="middle" 
                          className="text-xs font-medium fill-gray-700"
                        >
                          {emotion.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Center point */}
                  <circle cx="100" cy="100" r="3" fill="#374151" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychological Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-500" />
            <span>Psychological Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(psychologicalInsights).map(([key, value]) => {
              const label = key.replace(/([A-Z])/g, ' $1').trim();
              const color = psychologyColors[key as keyof typeof psychologyColors];
              
              return (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium capitalize">{label}</span>
                    <Badge variant="outline">{formatPercentage(value)}%</Badge>
                  </div>
                  
                  {/* Circular progress */}
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          stroke={color}
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${value * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{formatPercentage(value)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${formatPercentage(value)}%`,
                            backgroundColor: color
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {value > 0.7 ? 'High' : value > 0.4 ? 'Medium' : 'Low'} level detected
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Communication Context Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-green-500" />
            <span>Communication Context Matrix</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(contextualFactors).map(([key, value]) => {
              const label = key.replace(/([A-Z])/g, ' $1').trim();
              const color = contextColors[key as keyof typeof contextColors];
              
              return (
                <div key={key} className="bg-white p-6 rounded-lg border-2 border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {key === 'formality' && '🎩'}
                      {key === 'urgency' && '⏰'}
                      {key === 'clarity' && '💎'}
                      {key === 'empathy' && '❤️'}
                    </div>
                    <div className="font-semibold text-lg capitalize mb-2">{label}</div>
                    <div className="text-3xl font-bold mb-4" style={{ color }}>
                      {formatPercentage(value)}%
                    </div>
                    
                    {/* Stepped progress indicator */}
                    <div className="flex justify-center space-x-1 mb-4">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div 
                          key={step}
                          className={`w-3 h-8 rounded-sm transition-all duration-300 ${
                            step <= value * 5 ? 'opacity-100' : 'opacity-20'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {value > 0.8 ? 'Excellent' :
                       value > 0.6 ? 'Good' :
                       value > 0.4 ? 'Moderate' :
                       value > 0.2 ? 'Fair' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            <span>Sentiment Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            {/* Sentiment meter */}
            <div className="relative">
              <div className="text-6xl mb-4">
                {sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐'}
              </div>
              <Badge 
                variant={sentiment === 'positive' ? 'default' : sentiment === 'negative' ? 'destructive' : 'secondary'}
                className="text-lg px-4 py-2"
              >
                {sentiment.toUpperCase()}
              </Badge>
            </div>
            
            {/* Sentiment scale */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
              <div className="relative h-8 bg-gradient-to-r from-red-400 via-gray-300 to-green-400 rounded-full">
                <div 
                  className="absolute top-1 w-6 h-6 bg-white border-2 border-gray-800 rounded-full shadow-lg transition-all duration-1000"
                  style={{ 
                    left: `${Math.max(0, Math.min(94, (sentimentScore + 1) * 47))}%` 
                  }}
                />
              </div>
              <div className="text-center mt-2">
                <span className="text-2xl font-bold">{sentimentScore.toFixed(2)}</span>
                <span className="text-sm text-gray-600 ml-1">sentiment score</span>
              </div>
            </div>
            
            {/* Emotional intensity */}
            <div>
              <div className="text-lg font-semibold mb-2">Emotional Intensity</div>
              <div className="max-w-sm mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="h-6 rounded-full transition-all duration-1000 flex items-center justify-center text-white font-bold"
                    style={{ 
                      width: `${formatPercentage(emotionalIntensity)}%`,
                      background: `linear-gradient(90deg, ${
                        emotionalIntensity > 0.7 ? '#ef4444' :
                        emotionalIntensity > 0.4 ? '#f97316' :
                        '#10b981'
                      }, ${
                        emotionalIntensity > 0.7 ? '#dc2626' :
                        emotionalIntensity > 0.4 ? '#ea580c' :
                        '#059669'
                      })`
                    }}
                  >
                    {formatPercentage(emotionalIntensity)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}