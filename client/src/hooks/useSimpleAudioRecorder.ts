import { useState, useRef, useCallback } from 'react';

interface UseSimpleAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioLevel: number;
}

export function useSimpleAudioRecorder(
  onAudioData?: (audioBlob: Blob) => void
): UseSimpleAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const analyzeAudio = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting audio recording...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });
      
      console.log('✓ Microphone access granted');
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        console.log(`📊 Audio chunk received: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Send immediately for real-time processing
          if (onAudioData) {
            onAudioData(event.data);
          }
        }
      };

      mediaRecorder.onstart = () => {
        console.log('✓ MediaRecorder started');
        setIsRecording(true);
        analyzeAudio();
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped');
        setIsRecording(false);
        
        // Send final combined audio if we have chunks
        if (chunksRef.current.length > 0 && onAudioData) {
          const finalBlob = new Blob(chunksRef.current, { type: mimeType });
          console.log(`📤 Final audio blob: ${finalBlob.size} bytes`);
          onAudioData(finalBlob);
        }
        
        // Cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      console.log('🔴 Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [onAudioData, analyzeAudio]);

  const stopRecording = useCallback(() => {
    console.log('⏹️ Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Audio track stopped');
      });
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioLevel,
  };
}