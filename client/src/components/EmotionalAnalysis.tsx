import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Activity, Target, Users, AlertTriangle, Lightbulb } from "lucide-react";

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

interface PsychologicalInsights {
  stressLevel: number;
  engagementLevel: number;
  cognitiveLoad: number;
  emotionalStability: number;
}

interface ContextualFactors {
  formality: number;
  urgency: number;
  clarity: number;
  empathy: number;
}

interface EmotionalAnalysisProps {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  emotions: EmotionData;
  dominantEmotion: string;
  emotionalIntensity: number;
  confidence: number;
  psychologicalInsights: PsychologicalInsights;
  contextualFactors: ContextualFactors;
  recommendations: string[];
}

export function EmotionalAnalysis({
  sentiment,
  sentimentScore,
  emotions,
  dominantEmotion,
  emotionalIntensity,
  confidence,
  psychologicalInsights,
  contextualFactors,
  recommendations,
}: EmotionalAnalysisProps) {
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.7) return 'bg-red-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatPercentage = (value: number) => Math.round(value * 100);

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'joy': return '😊';
      case 'sadness': return '😢';
      case 'anger': return '😠';
      case 'fear': return '😨';
      case 'surprise': return '😲';
      case 'disgust': return '🤢';
      case 'trust': return '🤝';
      case 'anticipation': return '🎯';
      default: return '😐';
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'joy': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'sadness': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'anger': return 'bg-red-100 border-red-300 text-red-800';
      case 'fear': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'surprise': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'disgust': return 'bg-green-100 border-green-300 text-green-800';
      case 'trust': return 'bg-cyan-100 border-cyan-300 text-cyan-800';
      case 'anticipation': return 'bg-pink-100 border-pink-300 text-pink-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getEmotionGradient = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'joy': return 'from-yellow-400 to-yellow-600';
      case 'sadness': return 'from-blue-400 to-blue-600';
      case 'anger': return 'from-red-400 to-red-600';
      case 'fear': return 'from-purple-400 to-purple-600';
      case 'surprise': return 'from-orange-400 to-orange-600';
      case 'disgust': return 'from-green-400 to-green-600';
      case 'trust': return 'from-cyan-400 to-cyan-600';
      case 'anticipation': return 'from-pink-400 to-pink-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const topEmotions = Object.entries(emotions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Primary Emotional State */}
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${getEmotionGradient(dominantEmotion)} opacity-5`}></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Emotional State</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative">
          {/* Large Dominant Emotion Display */}
          <div className="text-center py-4">
            <div className="text-8xl mb-2 animate-pulse">
              {getEmotionIcon(dominantEmotion)}
            </div>
            <div className={`inline-block px-4 py-2 rounded-full border-2 ${getEmotionColor(dominantEmotion)} font-bold text-lg`}>
              {dominantEmotion.toUpperCase()}
            </div>
          </div>

          {/* Sentiment Indicator */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                sentiment === 'positive' ? 'bg-green-500' :
                sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'
              } animate-pulse`}></div>
              <Badge className={getSentimentColor(sentiment)}>
                {sentiment.toUpperCase()}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {sentimentScore > 0 ? '+' : ''}{sentimentScore.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Sentiment Score</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Emotional Intensity</span>
              <span>{formatPercentage(emotionalIntensity)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getIntensityColor(emotionalIntensity)}`}
                style={{ width: `${formatPercentage(emotionalIntensity)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Analysis Confidence</span>
              <span>{formatPercentage(confidence)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${formatPercentage(confidence)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotion Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-500" />
            <span>Emotion Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top 3 Emotions with Visual Cards */}
          <div className="space-y-3">
            {topEmotions.map(([emotion, value], index) => (
              <div key={emotion} className={`relative p-4 rounded-lg border-2 ${getEmotionColor(emotion)} transform transition-all duration-300 hover:scale-105`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                      {getEmotionIcon(emotion)}
                    </div>
                    <div>
                      <div className="font-bold text-lg capitalize">{emotion}</div>
                      <div className="text-sm opacity-75">#{index + 1} strongest emotion</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatPercentage(value)}%</div>
                    <div className="text-sm opacity-75">intensity</div>
                  </div>
                </div>
                {/* Visual intensity bar */}
                <div className="mt-3 bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${getEmotionGradient(emotion)} h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${formatPercentage(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Comprehensive Emotion Chart */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-center">Complete Emotion Spectrum</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(emotions).map(([emotion, value]) => (
                <div key={emotion} className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getEmotionIcon(emotion)}</span>
                      <span className="text-sm font-medium capitalize">{emotion}</span>
                    </div>
                    <span className="text-sm font-bold">{formatPercentage(value)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`bg-gradient-to-r ${getEmotionGradient(emotion)} h-3 rounded-full transition-all duration-1000`}
                      style={{ width: `${formatPercentage(value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychological Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <span>Psychological Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Gauges for Psychological Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(psychologicalInsights).map(([key, value]) => {
              const label = key.replace(/([A-Z])/g, ' $1').trim();
              const percentage = formatPercentage(value);
              const getInsightIcon = (insight: string) => {
                switch (insight) {
                  case 'stressLevel': return '⚡';
                  case 'engagementLevel': return '🎯';
                  case 'cognitiveLoad': return '🧠';
                  case 'emotionalStability': return '⚖️';
                  default: return '📊';
                }
              };
              const getInsightColor = (insight: string, val: number) => {
                switch (insight) {
                  case 'stressLevel': 
                    return val > 0.7 ? 'text-red-600 bg-red-50 border-red-200' :
                           val > 0.4 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                           'text-green-600 bg-green-50 border-green-200';
                  case 'engagementLevel':
                    return val > 0.7 ? 'text-green-600 bg-green-50 border-green-200' :
                           val > 0.4 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                           'text-red-600 bg-red-50 border-red-200';
                  case 'cognitiveLoad':
                    return val > 0.7 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                           val > 0.4 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                           'text-green-600 bg-green-50 border-green-200';
                  case 'emotionalStability':
                    return val > 0.7 ? 'text-blue-600 bg-blue-50 border-blue-200' :
                           val > 0.4 ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                           'text-purple-600 bg-purple-50 border-purple-200';
                  default: return 'text-gray-600 bg-gray-50 border-gray-200';
                }
              };

              return (
                <div key={key} className={`p-4 rounded-lg border-2 ${getInsightColor(key, value)}`}>
                  <div className="text-center mb-3">
                    <div className="text-3xl mb-1">{getInsightIcon(key)}</div>
                    <div className="font-semibold text-sm capitalize">{label}</div>
                  </div>
                  
                  {/* Circular Progress Indicator */}
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-transparent transition-all duration-1000"
                      style={{
                        borderTopColor: key === 'stressLevel' && value > 0.6 ? '#ef4444' :
                                       key === 'engagementLevel' && value > 0.7 ? '#22c55e' :
                                       key === 'cognitiveLoad' && value > 0.7 ? '#f97316' :
                                       key === 'emotionalStability' && value > 0.7 ? '#3b82f6' :
                                       '#6b7280',
                        transform: `rotate(${value * 360}deg)`,
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{percentage}%</span>
                    </div>
                  </div>
                  
                  {/* Linear Progress Bar */}
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        key === 'stressLevel' && value > 0.6 ? 'bg-red-500' :
                        key === 'engagementLevel' && value > 0.7 ? 'bg-green-500' :
                        key === 'cognitiveLoad' && value > 0.7 ? 'bg-orange-500' :
                        key === 'emotionalStability' && value > 0.7 ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contextual Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-500" />
            <span>Communication Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(contextualFactors).map(([key, value]) => {
              const getContextIcon = (factor: string) => {
                switch (factor) {
                  case 'formality': return '🎩';
                  case 'urgency': return '⏰';
                  case 'clarity': return '💎';
                  case 'empathy': return '❤️';
                  default: return '📝';
                }
              };
              const getContextGradient = (factor: string) => {
                switch (factor) {
                  case 'formality': return 'from-purple-400 to-indigo-600';
                  case 'urgency': return 'from-red-400 to-orange-600';
                  case 'clarity': return 'from-blue-400 to-cyan-600';
                  case 'empathy': return 'from-pink-400 to-rose-600';
                  default: return 'from-gray-400 to-gray-600';
                }
              };

              return (
                <div key={key} className="bg-white p-4 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="text-center">
                    <div className="text-4xl mb-2 animate-pulse">
                      {getContextIcon(key)}
                    </div>
                    <div className="text-sm font-medium capitalize mb-2">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-3xl font-bold mb-3 bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                      {formatPercentage(value)}%
                    </div>
                    
                    {/* Animated Progress Ring */}
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={`transition-all duration-1000 ${
                            key === 'formality' ? 'text-purple-500' :
                            key === 'urgency' ? 'text-red-500' :
                            key === 'clarity' ? 'text-blue-500' :
                            key === 'empathy' ? 'text-pink-500' :
                            'text-indigo-500'
                          }`}
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${value * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                    </div>

                    {/* Linear Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`bg-gradient-to-r ${getContextGradient(key)} h-3 rounded-full transition-all duration-1000`}
                        style={{ width: `${formatPercentage(value)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span>AI Recommendations</span>
              <Badge variant="secondary" className="ml-2">Smart Insights</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="relative bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-400 transform transition-all duration-300 hover:scale-105 hover:shadow-md">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                          Recommendation #{index + 1}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm leading-relaxed">{recommendation}</p>
                    </div>
                  </div>
                  
                  {/* Priority indicator */}
                  <div className="absolute top-2 right-2">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-red-400' : 
                      index === 1 ? 'bg-yellow-400' : 
                      'bg-green-400'
                    } animate-ping`}></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Action Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">AI Analysis Summary</span>
              </div>
              <p className="text-sm text-blue-700">
                Based on the emotional analysis, the AI recommends {recommendations.length} specific action{recommendations.length > 1 ? 's' : ''} 
                to improve communication effectiveness and emotional well-being.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Indicators */}
      {(psychologicalInsights.stressLevel > 0.7 || emotionalIntensity > 0.8) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Attention Indicators</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {psychologicalInsights.stressLevel > 0.7 && (
                <p className="text-sm text-orange-700">
                  • High stress level detected ({formatPercentage(psychologicalInsights.stressLevel)}%)
                </p>
              )}
              {emotionalIntensity > 0.8 && (
                <p className="text-sm text-orange-700">
                  • Very high emotional intensity ({formatPercentage(emotionalIntensity)}%)
                </p>
              )}
              {psychologicalInsights.cognitiveLoad > 0.8 && (
                <p className="text-sm text-orange-700">
                  • High cognitive load detected ({formatPercentage(psychologicalInsights.cognitiveLoad)}%)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}