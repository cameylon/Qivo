import { openaiService, type EmotionAnalysisResult } from './openai';
import { storage } from '../storage';
import type { SpeakerProfile, Conversation, InsertConversation } from '@shared/schema';

export interface VoiceProcessingResult {
  transcript: string;
  confidence: number;
  emotion: EmotionAnalysisResult;
  speaker: SpeakerProfile;
  aiResponse: string;
  conversation: Conversation;
  processingTime: number;
}

export interface SpeakerRecognitionResult {
  speakerId: string;
  confidence: number;
  profile: SpeakerProfile;
}

export class VoiceProcessor {
  private processingQueue: Map<string, Promise<VoiceProcessingResult>> = new Map();

  async processVoiceMessage(
    audioBuffer: Buffer,
    sessionId: number,
    audioFormat: string = "webm"
  ): Promise<VoiceProcessingResult> {
    const processingKey = `${sessionId}_${Date.now()}`;
    
    if (this.processingQueue.has(processingKey)) {
      return this.processingQueue.get(processingKey)!;
    }

    const processingPromise = this._processVoiceInternal(audioBuffer, sessionId, audioFormat);
    this.processingQueue.set(processingKey, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(processingKey);
    }
  }

  private async _processVoiceInternal(
    audioBuffer: Buffer,
    sessionId: number,
    audioFormat: string
  ): Promise<VoiceProcessingResult> {
    try {
      const startTime = Date.now();

      console.log(`🎤 Processing voice for session ${sessionId}: ${audioBuffer.length} bytes`);

      // Step 1: Transcribe audio
      const transcriptionResult = await openaiService.transcribeAudio(audioBuffer, audioFormat);
      console.log(`📝 Transcription: "${transcriptionResult.text}"`);

      // Step 2: Recognize speaker (simplified for demo)
      const speakerResult = await this.recognizeSpeaker(audioBuffer);

      // Step 3: Get conversation history and analyze emotion in parallel
      const [emotionResult, recentConversations] = await Promise.all([
        openaiService.analyzeEmotion(transcriptionResult.text),
        storage.getConversationsBySession(sessionId),
      ]);

      console.log(`🧠 Enhanced emotion analysis completed:`, {
        dominantEmotion: emotionResult.dominantEmotion,
        sentiment: emotionResult.sentiment,
        sentimentScore: emotionResult.sentimentScore,
        emotionalIntensity: emotionResult.emotionalIntensity,
        stressLevel: emotionResult.psychologicalInsights.stressLevel,
        engagementLevel: emotionResult.psychologicalInsights.engagementLevel,
        recommendations: emotionResult.recommendations
      });

      // Step 4: Store user conversation
      const userConversation = await storage.createConversation({
        sessionId,
        type: 'user',
        content: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        emotion: emotionResult.dominantEmotion,
        speakerId: speakerResult.speakerId,
        audioFormat,
        modelUsed: 'whisper-1',
        processingTime: null,
      });

      // Step 5: Prepare enhanced conversation context
      const conversationHistory = recentConversations
        .slice(-6)
        .map(conv => conv.content);

      // Step 6: Generate AI response with enhanced emotional context
      const aiResponse = await openaiService.generateResponse(
        transcriptionResult.text,
        {
          emotion: emotionResult.dominantEmotion,
          speaker: speakerResult.speakerId,
          conversationHistory,
          emotionalContext: {
            sentiment: emotionResult.sentiment,
            sentimentScore: emotionResult.sentimentScore,
            emotionalIntensity: emotionResult.emotionalIntensity,
            stressLevel: emotionResult.psychologicalInsights.stressLevel,
            engagementLevel: emotionResult.psychologicalInsights.engagementLevel,
            recommendations: emotionResult.recommendations
          }
        }
      );

      // Step 7: Store emotion analysis in background
      setImmediate(async () => {
        try {
          await storage.createEmotionAnalysis({
            conversationId: userConversation.id,
            sentiment: emotionResult.sentiment,
            emotions: JSON.stringify({
              ...emotionResult.emotions,
              psychologicalInsights: emotionResult.psychologicalInsights,
              contextualFactors: emotionResult.contextualFactors,
              recommendations: emotionResult.recommendations
            }),
            confidence: emotionResult.confidence,
          });
        } catch (err) {
          console.warn('Failed to store enhanced emotion analysis:', err);
        }
      });

      // Step 8: Store AI response in background
      setImmediate(async () => {
        try {
          await storage.createConversation({
            sessionId,
            type: 'ai',
            content: aiResponse.content,
            confidence: null,
            emotion: null,
            speakerId: null,
            audioFormat: null,
            modelUsed: aiResponse.model,
            processingTime: aiResponse.processingTime,
          });
        } catch (err) {
          console.warn('Failed to store AI conversation:', err);
        }
      });

      const totalProcessingTime = Date.now() - startTime;

      console.log(`✅ Voice processing completed in ${totalProcessingTime}ms`);

      return {
        transcript: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        emotion: emotionResult,
        speaker: speakerResult.profile,
        aiResponse: aiResponse.content,
        conversation: userConversation,
        processingTime: totalProcessingTime,
      };

    } catch (error) {
      console.error("Voice processing error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Voice processing failed: ${errorMessage}`);
    }
  }

  private async recognizeSpeaker(audioBuffer: Buffer): Promise<SpeakerRecognitionResult> {
    // Enhanced speaker recognition with audio characteristics
    const audioHash = this.generateAudioHash(audioBuffer);
    const voiceCharacteristics = this.analyzeVoiceCharacteristics(audioBuffer);
    
    let speakerProfile = await storage.getSpeakerProfile(audioHash);
    
    if (!speakerProfile) {
      // Create new speaker profile with enhanced characteristics
      speakerProfile = await storage.createSpeakerProfile({
        speakerId: audioHash,
        name: `Speaker_${audioHash.substring(0, 8)}`,
        voiceCharacteristics: JSON.stringify({
          ...voiceCharacteristics,
          firstEncounter: new Date().toISOString(),
          audioQuality: this.assessAudioQuality(audioBuffer)
        }),
        confidence: 0.85,
        lastSeen: new Date(),
      });
      
      console.log(`👤 New speaker profile created: ${speakerProfile.name}`);
    } else {
      // Update existing profile with new interaction
      const updatedCharacteristics = {
        ...JSON.parse(speakerProfile.voiceCharacteristics || '{}'),
        lastInteraction: new Date().toISOString(),
        interactionCount: (JSON.parse(speakerProfile.voiceCharacteristics || '{}').interactionCount || 0) + 1,
        recentAudioQuality: this.assessAudioQuality(audioBuffer)
      };
      
      await storage.updateSpeakerProfile(audioHash, {
        voiceCharacteristics: JSON.stringify(updatedCharacteristics),
        lastSeen: new Date(),
      });
      
      console.log(`👤 Updated speaker profile: ${speakerProfile.name}`);
    }

    return {
      speakerId: audioHash,
      confidence: 0.85,
      profile: speakerProfile,
    };
  }

  private generateAudioHash(audioBuffer: Buffer): string {
    // Enhanced audio fingerprinting
    const characteristics = this.analyzeVoiceCharacteristics(audioBuffer);
    const hashData = `${characteristics.avgAmplitude}_${characteristics.pitch}_${characteristics.tone}`;
    return Buffer.from(hashData).toString('base64').substring(0, 16);
  }

  private analyzeVoiceCharacteristics(audioBuffer: Buffer): any {
    // Enhanced voice characteristic analysis
    const avgAmplitude = this.calculateAverageAmplitude(audioBuffer);
    const pitch = this.estimatePitch(avgAmplitude);
    const tone = this.estimateTone(audioBuffer);
    const variance = this.calculateVariance(audioBuffer);
    
    return {
      avgAmplitude: Math.round(avgAmplitude * 100) / 100,
      pitch: pitch,
      tone: tone,
      variance: Math.round(variance * 100) / 100,
      bufferSize: audioBuffer.length,
      timestamp: Date.now()
    };
  }

  private calculateAverageAmplitude(audioBuffer: Buffer): number {
    let sum = 0;
    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = audioBuffer.readInt16LE(i);
      sum += Math.abs(sample);
    }
    return sum / (audioBuffer.length / 2) / 32768;
  }

  private estimatePitch(avgAmplitude: number): number {
    return Math.min(800, Math.max(80, avgAmplitude * 400 + 200));
  }

  private estimateTone(audioBuffer: Buffer): string {
    const variance = this.calculateVariance(audioBuffer);
    if (variance > 0.3) return 'dynamic';
    if (variance > 0.15) return 'moderate';
    return 'steady';
  }

  private calculateVariance(audioBuffer: Buffer): number {
    const samples = [];
    for (let i = 0; i < Math.min(audioBuffer.length, 1000); i += 2) {
      samples.push(Math.abs(audioBuffer.readInt16LE(i)));
    }
    
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    
    return Math.sqrt(variance) / 32768;
  }

  private assessAudioQuality(audioBuffer: Buffer): string {
    const size = audioBuffer.length;
    if (size > 50000) return 'high';
    if (size > 10000) return 'medium';
    return 'low';
  }

  async getSessionMetrics(sessionId: number) {
    const conversations = await storage.getConversationsBySession(sessionId);
    const userMessages = conversations.filter(c => c.type === 'user');
    const aiMessages = conversations.filter(c => c.type === 'ai');
    
    const avgConfidence = userMessages.length > 0 
      ? userMessages.reduce((sum, msg) => sum + (msg.confidence || 0), 0) / userMessages.length
      : 0;

    const avgResponseTime = aiMessages.length > 0
      ? aiMessages.reduce((sum, msg) => sum + (msg.processingTime || 0), 0) / aiMessages.length
      : 0;

    return {
      totalMessages: conversations.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      avgTranscriptionConfidence: Math.round(avgConfidence * 100),
      avgResponseTime: Math.round(avgResponseTime),
      sessionDuration: conversations.length > 0 
        ? new Date(conversations[conversations.length - 1].timestamp).getTime() - 
          new Date(conversations[0].timestamp).getTime()
        : 0,
    };
  }
}

export const voiceProcessor = new VoiceProcessor();