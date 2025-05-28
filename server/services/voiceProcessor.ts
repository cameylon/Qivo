import { openaiService, type EmotionAnalysisResult } from './openai';
import { storage } from '../storage';
import type { Conversation, InsertConversation, InsertEmotionAnalysis, SpeakerProfile } from '@shared/schema';

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
    const startTime = Date.now();
    const messageId = `${sessionId}-${Date.now()}`;

    // Prevent duplicate processing
    if (this.processingQueue.has(messageId)) {
      return await this.processingQueue.get(messageId)!;
    }

    const processingPromise = this._processVoiceInternal(audioBuffer, sessionId, audioFormat, startTime);
    this.processingQueue.set(messageId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(messageId);
    }
  }

  private async _processVoiceInternal(
    audioBuffer: Buffer,
    sessionId: number,
    audioFormat: string,
    startTime: number
  ): Promise<VoiceProcessingResult> {
    try {
      // Step 1: Speech-to-Text
      const transcriptionResult = await openaiService.transcribeAudio(audioBuffer, audioFormat);
      
      if (!transcriptionResult.text.trim()) {
        throw new Error("No speech detected in audio");
      }

      // Step 2: Speaker Recognition (mock implementation)
      const speakerResult = await this.recognizeSpeaker(audioBuffer);

      // Step 3: Emotion Analysis
      const emotionResult = await openaiService.analyzeEmotion(transcriptionResult.text);

      // Step 4: Store user conversation
      const userConversation = await storage.createConversation({
        sessionId,
        type: 'user',
        content: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        emotion: emotionResult.currentEmotion,
        speakerId: speakerResult.speakerId,
        audioFormat,
        modelUsed: 'whisper-1',
        processingTime: null,
      });

      // Step 5: Store emotion analysis
      await storage.createEmotionAnalysis({
        conversationId: userConversation.id,
        sentiment: emotionResult.sentiment,
        emotions: JSON.stringify(emotionResult.emotions),
        confidence: emotionResult.confidence,
      });

      // Step 6: Get conversation history for context
      const recentConversations = await storage.getConversationsBySession(sessionId);
      const conversationHistory = recentConversations
        .slice(-10) // Last 10 messages
        .map(conv => conv.content);

      // Step 7: Generate AI response
      const aiResponse = await openaiService.generateResponse(
        transcriptionResult.text,
        {
          emotion: emotionResult.currentEmotion,
          speaker: speakerResult.speakerId,
          conversationHistory,
        }
      );

      // Step 8: Store AI response
      const aiConversation = await storage.createConversation({
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

      const totalProcessingTime = Date.now() - startTime;

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
      throw new Error(`Voice processing failed: ${error.message}`);
    }
  }

  private async recognizeSpeaker(audioBuffer: Buffer): Promise<SpeakerRecognitionResult> {
    // Mock speaker recognition - in production this would use voice biometrics
    const mockSpeakerId = "User_001";
    
    let profile = await storage.getSpeakerProfile(mockSpeakerId);
    
    if (!profile) {
      // Create new mock profile
      profile = await storage.createSpeakerProfile({
        speakerId: mockSpeakerId,
        name: "Demo User",
        voiceProfile: JSON.stringify({
          pitch: "medium",
          tone: "friendly",
          accent: "neutral",
        }),
        sessionCount: 1,
        isMock: true,
      });
    } else {
      // Update last seen and session count
      await storage.updateSpeakerProfile(mockSpeakerId, {
        lastSeen: new Date(),
        sessionCount: (profile.sessionCount || 0) + 1,
      });
      profile = await storage.getSpeakerProfile(mockSpeakerId);
    }

    return {
      speakerId: mockSpeakerId,
      confidence: 0.45, // Mock confidence for demo
      profile: profile!,
    };
  }

  async getSessionMetrics(sessionId: number) {
    const conversations = await storage.getConversationsBySession(sessionId);
    const session = await storage.getVoiceSession(sessionId);
    
    if (!session) {
      throw new Error("Session not found");
    }

    const userMessages = conversations.filter(c => c.type === 'user');
    const aiMessages = conversations.filter(c => c.type === 'ai');
    
    const avgConfidence = userMessages.length > 0 
      ? userMessages.reduce((sum, msg) => sum + (msg.confidence || 0), 0) / userMessages.length
      : 0;

    const avgResponseTime = aiMessages.length > 0
      ? aiMessages.reduce((sum, msg) => sum + (msg.processingTime || 0), 0) / aiMessages.length
      : 0;

    return {
      sessionId,
      totalMessages: conversations.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      avgTranscriptionConfidence: avgConfidence,
      avgResponseTime: avgResponseTime / 1000, // Convert to seconds
      sessionDuration: session.duration || 0,
      isActive: session.isActive,
    };
  }
}

export const voiceProcessor = new VoiceProcessor();
