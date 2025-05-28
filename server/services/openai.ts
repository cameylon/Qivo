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
      
      // Create a proper file for OpenAI with the correct MIME type
      let mimeType: string;
      let filename: string;
      
      if (format === "webm" || format.includes("webm")) {
        mimeType = "audio/webm";
        filename = "audio.webm";
      } else if (format === "mp4" || format.includes("mp4")) {
        mimeType = "audio/mp4";
        filename = "audio.mp4";
      } else if (format === "wav") {
        mimeType = "audio/wav";
        filename = "audio.wav";
      } else {
        // Default to webm for unknown formats
        mimeType = "audio/webm";
        filename = "audio.webm";
      }
      
      const file = new File([audioBuffer], filename, { 
        type: mimeType 
      });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "verbose_json",
      });

      const processingTime = Date.now() - startTime;

      return {
        text: transcription.text,
        confidence: 0.95, // Whisper doesn't provide confidence, using default high value
        duration: transcription.duration,
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

      const systemPrompt = `You are a helpful voice assistant. You're having a real-time conversation with a user.
      
      Context:
      - Current emotion detected: ${context.emotion || 'neutral'}
      - Speaker: ${context.speaker || 'unknown'}
      - This is part of an ongoing voice conversation
      
      Respond naturally and conversationally. Keep responses concise but helpful.
      Be empathetic to the user's emotional state when appropriate.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history if available
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        context.conversationHistory.slice(-6).forEach((msg, index) => {
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
        max_tokens: 150,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;

      return {
        content: response.choices[0].message.content || "I'm sorry, I couldn't generate a response.",
        model: "gpt-4o",
        processingTime,
      };
    } catch (error) {
      console.error("Response generation error:", error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }
}

export const openaiService = new OpenAIService();
