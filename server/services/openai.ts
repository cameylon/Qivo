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
  emotions: {
    positive: number;
    neutral: number;
    negative: number;
  };
  currentEmotion: string;
  confidence: number;
}

export interface AIResponse {
  content: string;
  model: string;
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
      
      if (error.message?.includes('API key')) {
        throw new Error("OpenAI API key issue - please check your API key configuration");
      } else if (error.message?.includes('Invalid audio')) {
        throw new Error("Audio format not supported - please try a different recording");
      } else {
        throw new Error(`Transcription failed: ${error.message}`);
      }
    }
  }

  async analyzeEmotion(text: string): Promise<EmotionAnalysisResult> {
    try {
      const startTime = Date.now();

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an emotion analysis expert. Analyze the sentiment and emotions in the given text. 
            Provide scores for positive, neutral, and negative emotions (0-100, must sum to 100).
            Also identify the primary emotion being expressed.
            Respond with JSON in this format: {
              "sentiment": "positive|negative|neutral",
              "emotions": {
                "positive": number,
                "neutral": number,
                "negative": number
              },
              "currentEmotion": "string describing the main emotion",
              "confidence": number (0-1)
            }`
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const processingTime = Date.now() - startTime;

      return {
        sentiment: result.sentiment || 'neutral',
        emotions: {
          positive: Math.max(0, Math.min(100, result.emotions?.positive || 33)),
          neutral: Math.max(0, Math.min(100, result.emotions?.neutral || 34)),
          negative: Math.max(0, Math.min(100, result.emotions?.negative || 33)),
        },
        currentEmotion: result.currentEmotion || 'Neutral',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      };
    } catch (error) {
      console.error("Emotion analysis error:", error);
      // Return neutral emotion on error
      return {
        sentiment: 'neutral',
        emotions: { positive: 33, neutral: 34, negative: 33 },
        currentEmotion: 'Neutral',
        confidence: 0.5,
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
      throw new Error(`Failed to generate AI response: ${error.message}`);
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
      throw new Error(`Failed to generate streaming AI response: ${error.message}`);
    }
  }
}

export const openaiService = new OpenAIService();
