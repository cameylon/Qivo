import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recordingDuration: number;
  audioFormat: string;
}

export function useAudioRecorder(
  onAudioData?: (audioBlob: Blob) => void
): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const audioFormat = 'webm'; // Default format

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average audio level
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;
    const normalizedLevel = average / 255;
    
    setAudioLevel(normalizedLevel);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access with optimized settings for low latency
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Reduced from 48000 for faster processing
          channelCount: 1, // Mono for smaller data size
        },
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      source.connect(analyserRef.current);

      // Set up MediaRecorder with optimal settings
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send audio chunks immediately for real-time transcription
          if (onAudioData && event.data.size > 1024) {
            console.log(`Real-time audio chunk: ${event.data.size} bytes`);
            onAudioData(event.data);
          }
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          if (onAudioData) {
            onAudioData(audioBlob);
          }
        }
      };

      // Start recording with smaller time slices for lower latency
      mediaRecorderRef.current.start(1500); // 1.5-second chunks for faster processing
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setRecordingDuration(elapsed);
        }
      }, 1000);

      // Start audio analysis
      analyzeAudio();

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to access microphone: ${error.message}`);
    }
  }, [onAudioData, analyzeAudio]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    recordingDuration,
    audioFormat,
  };
}
