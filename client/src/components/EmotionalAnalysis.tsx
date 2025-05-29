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
    const iconProps = { className: "h-4 w-4" };
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

  const topEmotions = Object.entries(emotions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Primary Emotional State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Emotional State</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className={getSentimentColor(sentiment)}>
                {sentiment.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                Score: {sentimentScore > 0 ? '+' : ''}{sentimentScore.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{dominantEmotion}</p>
              <p className="text-sm text-gray-600">Dominant emotion</p>
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
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {topEmotions.map(([emotion, value]) => (
              <div key={emotion} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getEmotionIcon(emotion)}</span>
                  <span className="text-sm font-medium capitalize">{emotion}</span>
                </div>
                <span className="text-sm font-bold">{formatPercentage(value)}%</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 grid grid-cols-4 gap-2">
            {Object.entries(emotions).map(([emotion, value]) => (
              <div key={emotion} className="text-center">
                <div className="text-xs text-gray-600 mb-1 capitalize">{emotion}</div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${formatPercentage(value)}%` }}
                  />
                </div>
                <div className="text-xs font-medium mt-1">{formatPercentage(value)}%</div>
              </div>
            ))}
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
        <CardContent className="space-y-4">
          {Object.entries(psychologicalInsights).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span>{formatPercentage(value)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    key === 'stressLevel' && value > 0.6 ? 'bg-red-500' :
                    key === 'engagementLevel' && value > 0.7 ? 'bg-green-500' :
                    key === 'cognitiveLoad' && value > 0.7 ? 'bg-orange-500' :
                    key === 'emotionalStability' && value > 0.7 ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${formatPercentage(value)}%` }}
                />
              </div>
            </div>
          ))}
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
            {Object.entries(contextualFactors).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-sm font-medium capitalize mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatPercentage(value)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${formatPercentage(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span>AI Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                  <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
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