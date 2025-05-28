interface MetricsPanelProps {
  metrics: {
    transcriptionConfidence: number;
    emotionConfidence: number;
    speakerConfidence: string;
    avgResponseTime: number;
  } | null;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const transcriptionConfidence = metrics?.transcriptionConfidence || 94;
  const emotionConfidence = metrics?.emotionConfidence || 87;
  const speakerConfidence = metrics?.speakerConfidence || "85%";
  const responseTime = metrics?.avgResponseTime || 1.2;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Metrics</h3>
      <div className="space-y-4">
        {/* Transcription Accuracy */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Transcription Confidence</span>
            <span className="text-sm font-medium">{transcriptionConfidence}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${transcriptionConfidence}%` }}
            />
          </div>
        </div>

        {/* Emotion Detection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Emotion Confidence</span>
            <span className="text-sm font-medium">{emotionConfidence}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300" 
              style={{ width: `${emotionConfidence}%` }}
            />
          </div>
        </div>

        {/* Speaker Recognition */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Speaker Match</span>
            <span className="text-sm font-medium">{speakerConfidence}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        {/* Response Time */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Avg Response Time</span>
            <span className="text-sm font-medium">{responseTime.toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
