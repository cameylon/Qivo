import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration?: number;
}

export interface EmotionAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1 scale
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
  };
  dominantEmotion: string;
  emotionalIntensity: number; // 0 to 1 scale
  confidence: number;
  psychologicalInsights: {
    stressLevel: number;
    engagementLevel: number;
    cognitiveLoad: number;
    emotionalStability: number;
  };
  contextualFactors: {
    formality: number;
    urgency: number;
    clarity: number;
    empathy: number;
  };
  recommendations: string[];
}

export interface AIResponse {
  content: string;
  model: string;
  processingTime: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: string;
  duration?: number;
  processingTime: number;
}

export class OpenAIService {
  async transcribeAudio(audioBuffer: Buffer, format: string = "webm"): Promise<TranscriptionResult> {
    try {
      const startTime = Date.now();
      
      // Validate that we have audio data
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("No audio data provided");
      }
      
      // Check minimum audio size (at least 1KB)
      if (audioBuffer.length < 1024) {
        throw new Error("Audio data too small to process");
      }
      
      // Create a proper file for OpenAI with the correct MIME type
      let mimeType: string;
      let filename: string;
      
      // Determine the format based on the actual buffer content or format parameter
      if (format === "webm" || format.includes("webm") || format.includes("opus")) {
        mimeType = "audio/webm";
        filename = "audio.webm";
      } else if (format === "mp4" || format.includes("mp4")) {
        mimeType = "audio/mp4";
        filename = "audio.mp4";
      } else if (format === "wav") {
        mimeType = "audio/wav";
        filename = "audio.wav";
      } else {
        // Default to webm for unknown formats since most browsers support it
        mimeType = "audio/webm";
        filename = "audio.webm";
      }
      
      console.log(`Processing audio: ${filename}, size: ${audioBuffer.length} bytes, format: ${format}`);
      
      // Create the file object for OpenAI
      const file = new File([audioBuffer], filename, { 
        type: mimeType 
      });

      console.log(`Sending to OpenAI Whisper API with file type: ${file.type}`);

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "json",
        language: "en",
        temperature: 0.0,
      });

      console.log(`Transcription successful: "${transcription.text}"`);
      const processingTime = Date.now() - startTime;

      if (!transcription.text || transcription.text.trim().length === 0) {
        console.warn("Empty transcription result from OpenAI");
        throw new Error("No speech detected in audio");
      }

      return {
        text: transcription.text.trim(),
        confidence: 0.95,
        duration: undefined,
      };
    } catch (error) {
      console.error("Transcription error details:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('API key')) {
        throw new Error("OpenAI API key issue - please check your API key configuration");
      } else if (errorMessage.includes('Invalid audio')) {
        throw new Error("Audio format not supported - please try a different recording");
      } else {
        throw new Error(`Transcription failed: ${errorMessage}`);
      }
    }
  }

  async analyzeEmotion(text: string): Promise<EmotionAnalysisResult> {
    try {
      const startTime = Date.now();

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an advanced emotional intelligence and psychological analysis AI with expertise in linguistics, psychology, and human behavior. Analyze text for comprehensive emotional, psychological, and contextual insights.

Provide detailed analysis in JSON format with these EXACT fields:
{
  "sentiment": "positive|negative|neutral",
  "sentimentScore": number (-1 to 1),
  "emotions": {
    "joy": number (0-1),
    "sadness": number (0-1),
    "anger": number (0-1),
    "fear": number (0-1),
    "surprise": number (0-1),
    "disgust": number (0-1),
    "trust": number (0-1),
    "anticipation": number (0-1)
  },
  "dominantEmotion": "string",
  "emotionalIntensity": number (0-1),
  "confidence": number (0-1),
  "psychologicalInsights": {
    "stressLevel": number (0-1),
    "engagementLevel": number (0-1),
    "cognitiveLoad": number (0-1),
    "emotionalStability": number (0-1)
  },
  "contextualFactors": {
    "formality": number (0-1),
    "urgency": number (0-1),
    "clarity": number (0-1),
    "empathy": number (0-1)
  },
  "recommendations": ["string array of 2-3 actionable insights"]
}

Analyze linguistic patterns, emotional undertones, psychological state indicators, stress markers, engagement levels, cognitive load, and provide practical recommendations.`,
          },
          {
            role: "user",
            content: `Perform comprehensive emotional and psychological analysis of this text: "${text}"`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const processingTime = Date.now() - startTime;

      console.log(`Advanced emotion analysis completed in ${processingTime}ms`);

      // Validate and normalize the response
      const emotions = result.emotions || {};
      const insights = result.psychologicalInsights || {};
      const contextual = result.contextualFactors || {};

      return {
        sentiment: ['positive', 'negative', 'neutral'].includes(result.sentiment) 
          ? result.sentiment : 'neutral',
        sentimentScore: Math.max(-1, Math.min(1, result.sentimentScore || 0)),
        emotions: {
          joy: Math.max(0, Math.min(1, emotions.joy || 0)),
          sadness: Math.max(0, Math.min(1, emotions.sadness || 0)),
          anger: Math.max(0, Math.min(1, emotions.anger || 0)),
          fear: Math.max(0, Math.min(1, emotions.fear || 0)),
          surprise: Math.max(0, Math.min(1, emotions.surprise || 0)),
          disgust: Math.max(0, Math.min(1, emotions.disgust || 0)),
          trust: Math.max(0, Math.min(1, emotions.trust || 0)),
          anticipation: Math.max(0, Math.min(1, emotions.anticipation || 0)),
        },
        dominantEmotion: result.dominantEmotion || 'neutral',
        emotionalIntensity: Math.max(0, Math.min(1, result.emotionalIntensity || 0.5)),
        confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
        psychologicalInsights: {
          stressLevel: Math.max(0, Math.min(1, insights.stressLevel || 0.3)),
          engagementLevel: Math.max(0, Math.min(1, insights.engagementLevel || 0.5)),
          cognitiveLoad: Math.max(0, Math.min(1, insights.cognitiveLoad || 0.4)),
          emotionalStability: Math.max(0, Math.min(1, insights.emotionalStability || 0.7)),
        },
        contextualFactors: {
          formality: Math.max(0, Math.min(1, contextual.formality || 0.5)),
          urgency: Math.max(0, Math.min(1, contextual.urgency || 0.3)),
          clarity: Math.max(0, Math.min(1, contextual.clarity || 0.7)),
          empathy: Math.max(0, Math.min(1, contextual.empathy || 0.5)),
        },
        recommendations: Array.isArray(result.recommendations) 
          ? result.recommendations.slice(0, 3) 
          : ['Continue natural conversation', 'Maintain current emotional tone'],
      };
    } catch (error) {
      console.error("Emotion analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Return comprehensive neutral fallback
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        emotions: {
          joy: 0.1,
          sadness: 0.1,
          anger: 0.1,
          fear: 0.1,
          surprise: 0.1,
          disgust: 0.1,
          trust: 0.2,
          anticipation: 0.2,
        },
        dominantEmotion: 'neutral',
        emotionalIntensity: 0.3,
        confidence: 0.5,
        psychologicalInsights: {
          stressLevel: 0.3,
          engagementLevel: 0.5,
          cognitiveLoad: 0.4,
          emotionalStability: 0.7,
        },
        contextualFactors: {
          formality: 0.5,
          urgency: 0.3,
          clarity: 0.7,
          empathy: 0.5,
        },
        recommendations: ['Continue natural conversation', 'Monitor for clearer emotional signals'],
      };
    }
  }

  async generateResponse(
    transcript: string, 
    context: { emotion?: string; speaker?: string; conversationHistory?: string[] }
  ): Promise<AIResponse> {
    try {
      const startTime = Date.now();

      // Enhanced OpenAI agent system prompt with advanced capabilities
      const systemPrompt = `You are Qivo, an advanced AI voice assistant powered by OpenAI's intelligent agent capabilities. You excel at:

CONTEXT AWARENESS:
- Current speaker emotion: ${context.emotion || 'neutral'}
- Speaker ID: ${context.speaker || 'new user'}
- Conversation context: Active voice session

RESPONSE GUIDELINES:
- Be conversational, empathetic, and helpful
- Adapt your tone to match the user's emotional state
- Provide concise but meaningful responses
- Use natural speech patterns suitable for voice interaction
- Remember context from previous exchanges in this session

CAPABILITIES:
- Real-time voice processing and understanding
- Emotional intelligence and adaptive responses
- Contextual memory within conversations
- Multi-turn dialogue management`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Enhanced conversation context with better memory management
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-6); // Increased for better context
        recentHistory.forEach((msg, index) => {
          messages.push({
            role: index % 2 === 0 ? "user" : "assistant",
            content: msg
          });
        });
      }

      messages.push({ role: "user", content: transcript });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Latest model with agent capabilities
        messages: messages,
        max_tokens: 150, // Increased for more thoughtful responses
        temperature: 0.7, // Balanced for natural conversation
        top_p: 0.9, // Enhanced creativity while maintaining focus
        presence_penalty: 0.1, // Slight penalty to avoid repetition
        frequency_penalty: 0.1, // Encourage varied vocabulary
        stream: true,
      });

      let fullContent = "";
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        content: fullContent || "I'm sorry, I couldn't generate a response.",
        model: "gpt-4o",
        processingTime,
      };
    } catch (error) {
      console.error("Response generation error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
  }

  async generateStreamingResponse(
    transcript: string, 
    context: { emotion?: string; speaker?: string; conversationHistory?: string[] },
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    try {
      const startTime = Date.now();

      // Advanced OpenAI agent prompt for streaming responses
      const systemPrompt = `You are Qivo, an intelligent AI voice assistant with advanced conversational abilities. 

AGENT BEHAVIOR:
- Analyze user intent and emotional context deeply
- Provide adaptive, contextually aware responses
- Use sophisticated natural language understanding
- Maintain conversational flow and engagement

CURRENT SESSION:
- Speaker emotion: ${context.emotion || 'neutral'}
- Speaker: ${context.speaker || 'unknown'}
- Mode: Real-time voice conversation

RESPONSE STYLE:
- Natural, conversational tone
- Emotionally intelligent responses
- Concise but meaningful
- Suitable for voice interaction`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Enhanced context management for streaming
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        context.conversationHistory.slice(-5).forEach((msg, index) => {
          messages.push({
            role: index % 2 === 0 ? "user" : "assistant",
            content: msg
          });
        });
      }

      messages.push({ role: "user", content: transcript });

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 120, // Optimized for streaming quality
        temperature: 0.8, // Enhanced creativity for agent responses
        top_p: 0.95,
        presence_penalty: 0.2,
        frequency_penalty: 0.1,
        stream: true,
      });

      let fullContent = "";
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onToken(content); // Stream tokens in real-time
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        content: fullContent || "I'm sorry, I couldn't generate a response.",
        model: "gpt-4o",
        processingTime,
      };

    } catch (error) {
      console.error("Streaming response error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate streaming AI response: ${errorMessage}`);
    }
  }

  async generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<TTSResult> {
    try {
      const startTime = Date.now();
      
      if (!text || text.trim().length === 0) {
        throw new Error("No text provided for speech synthesis");
      }

      console.log(`Generating speech for text: "${text.substring(0, 100)}..." using voice: ${voice}`);

      const mp3 = await openai.audio.speech.create({
        model: "tts-1", // Use tts-1 for faster processing, tts-1-hd for higher quality
        voice: voice,
        input: text,
        response_format: "mp3",
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const processingTime = Date.now() - startTime;

      console.log(`Speech generation completed: ${buffer.length} bytes, ${processingTime}ms`);

      return {
        audioBuffer: buffer,
        format: "mp3",
        processingTime,
      };
    } catch (error) {
      console.error("Text-to-speech error:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('API key')) {
        throw new Error("OpenAI API key issue - please check your API key configuration");
      } else if (errorMessage.includes('quota')) {
        throw new Error("OpenAI quota exceeded - please check your account limits");
      } else {
        throw new Error(`Speech generation failed: ${errorMessage}`);
      }
    }
  }
}

export const openaiService = new OpenAIService();
