import { openaiService } from './openai';
import { storage } from '../storage';
import type { VoiceProcessingResult, SpeakerRecognitionResult } from './voiceProcessor';

export class FastVoiceProcessor {
  // Fast-path processing prioritizing immediate transcription feedback
  async processVoiceForRealtime(
    audioBuffer: Buffer,
    sessionId: number,
    audioFormat: string = "webm"
  ): Promise<{ transcript: string; confidence: number; processingTime: number }> {
    const startTime = Date.now();
    
    console.log(`⚡ Fast transcription for session ${sessionId}: ${audioBuffer.length} bytes`);

    try {
      // Priority 1: Get transcription as fast as possible
      const transcriptionResult = await openaiService.transcribeAudio(audioBuffer, audioFormat);
      const transcriptionTime = Date.now() - startTime;
      
      console.log(`📝 Fast transcription (${transcriptionTime}ms): "${transcriptionResult.text}"`);

      // Start background processing for full analysis (non-blocking)
      this.processBackgroundAnalysis(audioBuffer, sessionId, audioFormat, transcriptionResult)
        .catch(error => console.error('Background analysis error:', error));

      return {
        transcript: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        processingTime: transcriptionTime
      };
    } catch (error) {
      console.error('Fast transcription error:', error);
      throw new Error(`Fast transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Background processing for full analysis (runs async, doesn't block transcription response)
  async processBackgroundAnalysis(
    audioBuffer: Buffer,
    sessionId: number,
    audioFormat: string,
    transcriptionResult: any,
    websocketCallback?: (data: any) => void
  ): Promise<void> {
    try {
      console.log(`🔄 Starting background analysis for: "${transcriptionResult.text}"`);

      // Run all analysis tasks in parallel
      const [emotionResult, recentConversations] = await Promise.all([
        openaiService.analyzeEmotion(transcriptionResult.text),
        storage.getConversationsBySession(sessionId)
      ]);

      // Store user conversation with full analysis
      await storage.createConversation({
        sessionId,
        type: 'user',
        content: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        emotion: emotionResult.dominantEmotion,
        speakerId: `Speaker_${Math.random().toString(36).substring(7)}`, // Simplified for speed
        audioFormat,
        modelUsed: 'whisper-1',
        processingTime: null,
      });

      // Generate AI response
      const conversationHistory = recentConversations
        .slice(-6)
        .map(conv => conv.content);

      const aiResponse = await openaiService.generateResponse(
        transcriptionResult.text,
        {
          emotion: emotionResult.dominantEmotion,
          conversationHistory,
          speaker: 'user'
        }
      );

      // Store AI response
      await storage.createConversation({
        sessionId,
        type: 'ai',
        content: aiResponse.content,
        confidence: 1.0,
        emotion: 'helpful',
        speakerId: 'ai_assistant',
        audioFormat: null,
        modelUsed: aiResponse.model,
        processingTime: aiResponse.processingTime,
      });

      // Store emotion analysis
      const conversation = await storage.getConversationsBySession(sessionId);
      const latestConversation = conversation[conversation.length - 1];
      
      if (latestConversation) {
        await storage.createEmotionAnalysis({
          conversationId: latestConversation.id,
          sentiment: emotionResult.sentiment,
          sentimentScore: emotionResult.sentimentScore,
          emotions: JSON.stringify(emotionResult.emotions), // Convert to string for storage
          dominantEmotion: emotionResult.dominantEmotion,
          emotionalIntensity: emotionResult.emotionalIntensity,
          confidence: emotionResult.confidence,
          psychologicalInsights: JSON.stringify(emotionResult.psychologicalInsights),
          contextualFactors: JSON.stringify(emotionResult.contextualFactors),
          recommendations: emotionResult.recommendations,
        });
      }

      // Send complete analysis and AI response to frontend via WebSocket
      if (websocketCallback) {
        // Send emotion analysis
        websocketCallback({
          action: 'emotion_analysis_complete',
          emotionAnalysis: emotionResult,
          transcript: transcriptionResult.text,
          speaker: {
            id: `Speaker_${Math.random().toString(36).substring(7)}`,
            name: 'User'
          },
          sessionId
        });

        // Send AI response
        websocketCallback({
          action: 'ai_response_ready',
          aiResponse: aiResponse.content,
          processingTime: aiResponse.processingTime,
          model: aiResponse.model,
          speaker: {
            id: 'ai_assistant',
            name: 'AI Assistant'
          },
          sessionId
        });
      }

      console.log(`✅ Background analysis completed for: "${transcriptionResult.text}"`);
    } catch (error) {
      console.error('Background analysis failed:', error);
    }
  }

  // Optimized session metrics (cached and lightweight)
  async getSessionMetricsOptimized(sessionId: number) {
    try {
      const conversations = await storage.getConversationsBySession(sessionId);
      
      return {
        messageCount: conversations.length,
        avgConfidence: conversations.reduce((sum, conv) => sum + (conv.confidence || 0), 0) / Math.max(conversations.length, 1),
        dominantEmotions: conversations.map(conv => conv.emotion).filter(Boolean),
        sessionDuration: conversations.length > 0 
          ? Date.now() - (conversations[0].timestamp?.getTime() || Date.now())
          : 0
      };
    } catch (error) {
      console.error('Metrics error:', error);
      return {
        messageCount: 0,
        avgConfidence: 0,
        dominantEmotions: [],
        sessionDuration: 0
      };
    }
  }
}

export const fastVoiceProcessor = new FastVoiceProcessor();