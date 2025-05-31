import { openaiService } from './openai';

export class StreamingVoiceProcessor {
  private audioChunks: Map<string, Buffer[]> = new Map();
  private processingTimeout: Map<string, NodeJS.Timeout> = new Map();
  
  // Process audio in smaller chunks for lower latency
  async processAudioChunk(
    clientId: string,
    audioChunk: Buffer,
    sessionId: number,
    isComplete: boolean = false
  ): Promise<{ transcript?: string; confidence?: number; isPartial: boolean }> {
    
    // Store chunk
    if (!this.audioChunks.has(clientId)) {
      this.audioChunks.set(clientId, []);
    }
    this.audioChunks.get(clientId)!.push(audioChunk);
    
    // Clear existing timeout
    if (this.processingTimeout.has(clientId)) {
      clearTimeout(this.processingTimeout.get(clientId)!);
    }
    
    // If chunk is large enough or complete, process immediately
    const totalSize = this.audioChunks.get(clientId)!.reduce((sum, chunk) => sum + chunk.length, 0);
    
    if (totalSize > 50000 || isComplete) { // Process when we have enough audio
      return this.processAccumulatedAudio(clientId, sessionId, isComplete);
    }
    
    // Otherwise, set timeout to process after short delay
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.processAccumulatedAudio(clientId, sessionId, true)
          .then(resolve)
          .catch(() => resolve({ isPartial: true }));
      }, 500); // Process after 500ms of silence
      
      this.processingTimeout.set(clientId, timeout);
    });
  }
  
  private async processAccumulatedAudio(
    clientId: string,
    sessionId: number,
    isComplete: boolean
  ): Promise<{ transcript?: string; confidence?: number; isPartial: boolean }> {
    try {
      const chunks = this.audioChunks.get(clientId) || [];
      if (chunks.length === 0) {
        return { isPartial: true };
      }
      
      // Combine chunks
      const audioBuffer = Buffer.concat(chunks);
      
      // Only process if we have substantial audio
      if (audioBuffer.length < 10000) {
        return { isPartial: true };
      }
      
      console.log(`🎵 Processing ${chunks.length} chunks (${audioBuffer.length} bytes) for client ${clientId}`);
      
      // Fast transcription
      const startTime = Date.now();
      const transcriptionResult = await openaiService.transcribeAudio(audioBuffer, 'webm');
      const processingTime = Date.now() - startTime;
      
      console.log(`⚡ Streaming transcription (${processingTime}ms): "${transcriptionResult.text}"`);
      
      // Clear processed chunks if complete
      if (isComplete) {
        this.audioChunks.delete(clientId);
        this.processingTimeout.delete(clientId);
      }
      
      return {
        transcript: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        isPartial: !isComplete
      };
      
    } catch (error) {
      console.error('Streaming processing error:', error);
      return { isPartial: true };
    }
  }
  
  // Clean up client data
  clearClient(clientId: string) {
    this.audioChunks.delete(clientId);
    if (this.processingTimeout.has(clientId)) {
      clearTimeout(this.processingTimeout.get(clientId)!);
      this.processingTimeout.delete(clientId);
    }
  }
}

export const streamingProcessor = new StreamingVoiceProcessor();