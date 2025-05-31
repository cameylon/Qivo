import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const voiceSessions = pgTable("voice_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  totalMessages: integer("total_messages").default(0),
  isActive: boolean("is_active").default(true),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  type: text("type").notNull(), // 'user' | 'ai' | 'system'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  confidence: real("confidence"), // transcription confidence
  emotion: text("emotion"), // detected emotion
  speakerId: text("speaker_id"), // speaker recognition result
  processingTime: integer("processing_time"), // in milliseconds
  audioFormat: text("audio_format"),
  modelUsed: text("model_used"),
});

export const emotionAnalysis = pgTable("emotion_analysis", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  sentiment: text("sentiment").notNull(), // 'positive' | 'negative' | 'neutral'
  emotions: text("emotions").notNull(), // JSON string of emotion scores
  confidence: real("confidence").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const speakerProfiles = pgTable("speaker_profiles", {
  id: serial("id").primaryKey(),
  speakerId: text("speaker_id").notNull().unique(),
  name: text("name"),
  voiceProfile: text("voice_profile"), // JSON string of voice characteristics
  lastSeen: timestamp("last_seen").defaultNow(),
  sessionCount: integer("session_count").default(0),
  isMock: boolean("is_mock").default(true),
});

export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  wsConnections: integer("ws_connections").default(0),
  avgResponseTime: real("avg_response_time"), // in seconds
  transcriptionAccuracy: real("transcription_accuracy"), // percentage
  systemHealth: text("system_health").default('operational'),
  uptime: integer("uptime"), // in seconds
});

// Insert schemas
export const insertVoiceSessionSchema = createInsertSchema(voiceSessions).omit({
  id: true,
  startTime: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  timestamp: true,
});

export const insertEmotionAnalysisSchema = createInsertSchema(emotionAnalysis).omit({
  id: true,
  timestamp: true,
});

export const insertSpeakerProfileSchema = createInsertSchema(speakerProfiles).omit({
  id: true,
  lastSeen: true,
});

export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type EmotionAnalysis = typeof emotionAnalysis.$inferSelect;
export type InsertEmotionAnalysis = z.infer<typeof insertEmotionAnalysisSchema>;
export type SpeakerProfile = typeof speakerProfiles.$inferSelect;
export type InsertSpeakerProfile = z.infer<typeof insertSpeakerProfileSchema>;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;

// WebSocket message types
export const voiceMessageSchema = z.object({
  type: z.enum(['audio', 'control', 'response', 'data']),
  data: z.any(),
  sessionId: z.string().optional(),
  timestamp: z.number().optional(),
});

export type VoiceMessage = z.infer<typeof voiceMessageSchema>;
