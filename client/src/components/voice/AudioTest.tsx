import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AudioTest() {
  const [testStatus, setTestStatus] = useState<string>('Ready to test');
  const [microphonePermission, setMicrophonePermission] = useState<string>('Unknown');
  const [mediaRecorderSupport, setMediaRecorderSupport] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<number>(0);

  const testMicrophone = async () => {
    setTestStatus('Testing microphone access...');
    
    try {
      // Check MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        setMediaRecorderSupport(false);
        setTestStatus('MediaRecorder not supported in this browser');
        return;
      }
      setMediaRecorderSupport(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('Granted');
      setTestStatus('Microphone access granted. Testing recording...');

      // Test MediaRecorder
      const recorder = new MediaRecorder(stream);
      let dataReceived = false;

      recorder.ondataavailable = (event) => {
        console.log('TEST: Audio data received:', event.data.size, 'bytes');
        setAudioData(prev => prev + event.data.size);
        dataReceived = true;
      };

      recorder.onstart = () => {
        console.log('TEST: Recording started');
        setTestStatus('Recording for 3 seconds...');
      };

      recorder.onstop = () => {
        console.log('TEST: Recording stopped');
        setTestStatus(dataReceived 
          ? `Success! Captured ${audioData} bytes of audio data` 
          : 'Recording stopped but no audio data received');
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('TEST: Recorder error:', event);
        setTestStatus('Recording error occurred');
      };

      // Start recording
      recorder.start(500);

      // Stop after 3 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);

    } catch (error) {
      console.error('Microphone test failed:', error);
      setMicrophonePermission('Denied');
      setTestStatus(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Audio System Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>MediaRecorder Support:</strong> {mediaRecorderSupport ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Microphone Permission:</strong> {microphonePermission}
          </div>
          <div className="col-span-2">
            <strong>Audio Data Captured:</strong> {audioData} bytes
          </div>
        </div>
        
        <div className="p-3 bg-gray-100 rounded text-sm">
          <strong>Status:</strong> {testStatus}
        </div>

        <Button onClick={testMicrophone} className="w-full">
          Test Microphone & Recording
        </Button>
      </CardContent>
    </Card>
  );
}