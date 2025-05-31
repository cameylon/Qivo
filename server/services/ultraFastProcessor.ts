import { openaiService } from './openai.js';
import { storage } from '../storage.js';

export class UltraFastProcessor {
  private audioChunks: Map<string, Buffer[]> = new Map();
  private processingTimeout: Map<string, NodeJS.Timeout> = new Map();
  private lastProcessTime: Map<string, number> = new Map();

  async processAudioChunkUltraFast(
    clientId: string,
    audioChunk: Buffer,
    sessionId: number,
    websocketCallback?: (data: any) => void
  ): Promise<void> {
    try {
      // Add chunk to buffer
      if (!this.audioChunks.has(clientId)) {
        this.audioChunks.set(clientId, []);
      }
      this.audioChunks.get(clientId)!.push(audioChunk);

      // Clear existing timeout
      if (this.processingTimeout.has(clientId)) {
        clearTimeout(this.processingTimeout.get(clientId)!);
      }

      // Set aggressive timeout for ultra-fast processing
      this.processingTimeout.set(clientId, setTimeout(async () => {
        await this.processAccumulatedAudioUltraFast(clientId, sessionId, websocketCallback);
      }, 200)); // Process after 200ms of silence
      
    } catch (error) {
      console.error('Ultra-fast audio chunk processing failed:', error);
    }
  }

  private async processAccumulatedAudioUltraFast(
    clientId: string,
    sessionId: number,
    websocketCallback?: (data: any) => void
  ): Promise<void> {
    try {
      const chunks = this.audioChunks.get(clientId);
      if (!chunks || chunks.length === 0) return;

      // Combine all chunks
      const combinedBuffer = Buffer.concat(chunks);
      
      // Skip if too small
      if (combinedBuffer.length < 512) {
        console.log('⚡ Audio too small for ultra-fast processing');
        return;
      }

      console.log(`⚡ ULTRA-FAST processing: ${combinedBuffer.length} bytes`);
      
      const startTime = Date.now();

      // Ultra-fast transcription only
      const transcriptionResult = await openaiService.transcribeAudio(combinedBuffer, 'webm');
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ ULTRA-FAST transcription (${processingTime}ms): "${transcriptionResult.text}"`);

      // Send immediate result to frontend
      if (websocketCallback) {
        websocketCallback({
          action: 'ultra_fast_transcription',
          transcript: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          processingTime,
          speaker: {
            id: `Speaker_${Math.random().toString(36).substring(7)}`,
            name: 'User'
          },
          sessionId
        });
      }

      // Store minimal conversation record
      await storage.createConversation({
        sessionId,
        type: 'user',
        content: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        emotion: 'unknown', // Skip emotion for speed
        speakerId: `Speaker_${Math.random().toString(36).substring(7)}`,
        audioFormat: 'webm',
        modelUsed: 'whisper-1',
        processingTime,
      });

      // Clear processed chunks
      this.audioChunks.set(clientId, []);
      this.lastProcessTime.set(clientId, Date.now());

    } catch (error) {
      console.error('Ultra-fast processing failed:', error);
    }
  }

  clearClient(clientId: string) {
    if (this.processingTimeout.has(clientId)) {
      clearTimeout(this.processingTimeout.get(clientId)!);
      this.processingTimeout.delete(clientId);
    }
    this.audioChunks.delete(clientId);
    this.lastProcessTime.delete(clientId);
  }
}

export const ultraFastProcessor = new UltraFastProcessor();