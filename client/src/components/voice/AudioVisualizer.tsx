import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  duration: number;
  audioFormat: string;
}

export function AudioVisualizer({
  isRecording,
  audioLevel,
  duration,
  audioFormat,
}: AudioVisualizerProps) {
  const [waveData, setWaveData] = useState<number[]>(
    Array(15).fill(0).map(() => Math.random() * 100)
  );

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setWaveData(prev => {
          const newData = [...prev];
          // Shift existing data
          for (let i = 0; i < newData.length - 1; i++) {
            newData[i] = newData[i + 1];
          }
          // Add new data point based on audio level
          newData[newData.length - 1] = Math.max(20, Math.min(90, audioLevel * 100 + Math.random() * 20));
          return newData;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isRecording, audioLevel]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Audio Input</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
          <span className={`text-sm font-medium ${isRecording ? "text-red-600" : "text-gray-600"}`}>
            {isRecording ? "Recording" : "Standby"}
          </span>
        </div>
      </div>

      {/* Audio Waveform Visualization */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <div className="flex items-end justify-center space-x-1 h-24">
          {waveData.map((height, index) => (
            <div
              key={index}
              className="w-2 bg-accent rounded-full animate-wave"
              style={{
                height: `${height}%`,
                animationDelay: `${index * 0.1}s`,
                opacity: isRecording ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Format:</span>
          <span className="ml-2 font-medium">{audioFormat.toUpperCase()}</span>
        </div>
        <div>
          <span className="text-gray-600">Sample Rate:</span>
          <span className="ml-2 font-medium">48kHz</span>
        </div>
        <div>
          <span className="text-gray-600">Channels:</span>
          <span className="ml-2 font-medium">Mono</span>
        </div>
        <div>
          <span className="text-gray-600">Duration:</span>
          <span className="ml-2 font-medium">{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}
