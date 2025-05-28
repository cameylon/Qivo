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
      
      console.log(`🎤 Processing audio: ${filename}, size: ${audioBuffer.length} bytes, format: ${format}`);
      
      // Create the file object for OpenAI
      const file = new File([audioBuffer], filename, { 
        type: mimeType 
      });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "json",
        language: "en", // Specify English for better accuracy
        temperature: 0.0, // Use deterministic transcription for consistency
      });

      const processingTime = Date.now() - startTime;

      return {
        text: transcription.text,
        confidence: 0.95, // Whisper doesn't provide confidence, using default high value
        duration: undefined,
      };
    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
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

      // Simplified system prompt for faster processing
      const systemPrompt = `You are a helpful voice assistant. Keep responses concise and natural. Current emotion: ${context.emotion || 'neutral'}.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Limit conversation history to reduce token count and processing time
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        context.conversationHistory.slice(-4).forEach((msg, index) => {
          messages.push({
            role: index % 2 === 0 ? "user" : "assistant",
            content: msg
          });
        });
      }

      messages.push({ role: "user", content: transcript });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 100, // Reduced for faster responses
        temperature: 0.6, // Slightly reduced for more focused responses
        stream: true, // Enable streaming for real-time token delivery
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

      // Simplified system prompt for faster processing
      const systemPrompt = `You are Qivo, a helpful voice assistant. Keep responses concise and natural. Current emotion: ${context.emotion || 'neutral'}.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Limit conversation history to reduce token count and processing time
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        context.conversationHistory.slice(-3).forEach((msg, index) => {
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
        max_tokens: 80, // Even smaller for ultra-fast responses
        temperature: 0.6,
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
