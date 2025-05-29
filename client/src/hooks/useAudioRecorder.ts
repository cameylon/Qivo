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
      console.log('Starting audio recording...');
      
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording not supported in this browser');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder not supported in this browser');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('Microphone access granted');
      console.log('Stream active:', stream.active);
      console.log('Audio tracks:', stream.getAudioTracks().length);

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      source.connect(analyserRef.current);

      // Determine the best supported audio format
      let mimeType = '';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav'
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        mimeType = 'audio/webm'; // fallback
        console.warn('No supported audio format found, using fallback');
      }

      console.log('Using audio format:', mimeType);

      // Create MediaRecorder with minimal options for maximum compatibility
      const options: MediaRecorderOptions = { mimeType };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      // Set up event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log(`Audio data available: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send each chunk immediately for real-time processing
          if (onAudioData) {
            console.log(`Sending audio chunk: ${event.data.size} bytes`);
            onAudioData(event.data);
          }
        }
      };

      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started successfully');
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped');
        // Send final combined blob if we have chunks
        if (audioChunksRef.current.length > 0 && onAudioData) {
          const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log(`Sending final audio blob: ${finalBlob.size} bytes`);
          onAudioData(finalBlob);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start recording with frequent data events
      console.log('Starting recording...');
      mediaRecorderRef.current.start(500); // 500ms chunks for responsive real-time processing
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
      throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
