import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWorkingAudioRecorderReturn {
  isRecording: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export function useWorkingAudioRecorder(
  onAudioData?: (audioBlob: Blob) => void
): UseWorkingAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const sum = dataArray.reduce((acc, value) => acc + value, 0);
      const average = sum / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      console.log('Starting audio recording...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      console.log('Microphone stream obtained');
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up audio analysis
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        console.log('Audio analysis setup complete');
      } catch (audioError) {
        console.warn('Audio analysis setup failed:', audioError);
      }

      // Create MediaRecorder
      let mediaRecorder: MediaRecorder;
      
      try {
        // Try with opus codec first
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000
          });
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm',
            audioBitsPerSecond: 16000
          });
        } else {
          mediaRecorder = new MediaRecorder(stream);
        }
      } catch (recorderError) {
        console.error('MediaRecorder creation failed:', recorderError);
        throw new Error('Your browser does not support audio recording');
      }
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          if (onAudioData) {
            console.log('Sending audio chunk to callback');
            onAudioData(event.data);
          }
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
        setIsRecording(true);
        updateAudioLevel();
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        setIsRecording(false);
        
        if (chunksRef.current.length > 0 && onAudioData) {
          const blob = new Blob(chunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          console.log('Final audio blob:', blob.size, 'bytes');
          onAudioData(blob);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      // Start recording with 1 second intervals
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(1000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('Recording start failed:', errorMessage);
      setError(errorMessage);
      setIsRecording(false);
    }
  }, [onAudioData, updateAudioLevel]);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Audio track stopped');
      });
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsRecording(false);
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
    error,
  };
}