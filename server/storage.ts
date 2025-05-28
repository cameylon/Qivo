import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and } from 'drizzle-orm';
import { 
  users, 
  voiceSessions,
  conversations,
  emotionAnalysis,
  speakerProfiles,
  systemMetrics,
  type User, 
  type InsertUser,
  type VoiceSession,
  type InsertVoiceSession,
  type Conversation,
  type InsertConversation,
  type EmotionAnalysis,
  type InsertEmotionAnalysis,
  type SpeakerProfile,
  type InsertSpeakerProfile,
  type SystemMetrics,
  type InsertSystemMetrics,
} from "@shared/schema";

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Voice Sessions
  createVoiceSession(session: InsertVoiceSession): Promise<VoiceSession>;
  getVoiceSession(id: number): Promise<VoiceSession | undefined>;
  updateVoiceSession(id: number, updates: Partial<VoiceSession>): Promise<VoiceSession | undefined>;
  getActiveSession(userId?: number): Promise<VoiceSession | undefined>;

  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationsBySession(sessionId: number): Promise<Conversation[]>;
  getRecentConversations(limit?: number): Promise<Conversation[]>;

  // Emotion Analysis
  createEmotionAnalysis(analysis: InsertEmotionAnalysis): Promise<EmotionAnalysis>;
  getEmotionAnalysisByConversation(conversationId: number): Promise<EmotionAnalysis | undefined>;

  // Speaker Profiles
  createSpeakerProfile(profile: InsertSpeakerProfile): Promise<SpeakerProfile>;
  getSpeakerProfile(speakerId: string): Promise<SpeakerProfile | undefined>;
  updateSpeakerProfile(speakerId: string, updates: Partial<SpeakerProfile>): Promise<SpeakerProfile | undefined>;
  getAllSpeakerProfiles(): Promise<SpeakerProfile[]>;

  // System Metrics
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getLatestSystemMetrics(): Promise<SystemMetrics | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if demo speaker profile exists
      const existingProfile = await db.select().from(speakerProfiles).where(eq(speakerProfiles.speakerId, "User_001")).limit(1);
      
      if (existingProfile.length === 0) {
        // Create demo speaker profile
        await db.insert(speakerProfiles).values({
          speakerId: "User_001",
          name: "Demo User",
          voiceProfile: JSON.stringify({ 
            pitch: "medium", 
            tone: "friendly", 
            accent: "neutral" 
          }),
          sessionCount: 3,
          isMock: true,
        });
      }
    } catch (error) {
      console.log('Demo data initialization skipped - tables may not exist yet');
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createVoiceSession(insertSession: InsertVoiceSession): Promise<VoiceSession> {
    const result = await db.insert(voiceSessions).values({
      ...insertSession,
      userId: insertSession.userId || null,
      duration: insertSession.duration || null,
    }).returning();
    return result[0];
  }

  async getVoiceSession(id: number): Promise<VoiceSession | undefined> {
    const result = await db.select().from(voiceSessions).where(eq(voiceSessions.id, id)).limit(1);
    return result[0];
  }

  async updateVoiceSession(id: number, updates: Partial<VoiceSession>): Promise<VoiceSession | undefined> {
    const result = await db.update(voiceSessions).set(updates).where(eq(voiceSessions.id, id)).returning();
    return result[0];
  }

  async getActiveSession(userId?: number): Promise<VoiceSession | undefined> {
    const conditions = [eq(voiceSessions.isActive, true)];
    
    if (userId) {
      conditions.push(eq(voiceSessions.userId, userId));
    }
    
    const result = await db.select().from(voiceSessions).where(and(...conditions)).limit(1);
    return result[0];
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values({
      ...insertConversation,
      confidence: insertConversation.confidence || null,
      emotion: insertConversation.emotion || null,
      speakerId: insertConversation.speakerId || null,
      processingTime: insertConversation.processingTime || null,
      audioFormat: insertConversation.audioFormat || null,
      modelUsed: insertConversation.modelUsed || null,
    }).returning();
    
    // Update session message count - simplified approach
    const messageCount = await db.select().from(conversations).where(eq(conversations.sessionId, insertConversation.sessionId));
    await db.update(voiceSessions)
      .set({ totalMessages: messageCount.length })
      .where(eq(voiceSessions.id, insertConversation.sessionId));
    
    return result[0];
  }

  async getConversationsBySession(sessionId: number): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(conversations.timestamp);
  }

  async getRecentConversations(limit = 50): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .orderBy(desc(conversations.timestamp))
      .limit(limit);
  }

  async createEmotionAnalysis(insertAnalysis: InsertEmotionAnalysis): Promise<EmotionAnalysis> {
    const result = await db.insert(emotionAnalysis).values(insertAnalysis).returning();
    return result[0];
  }

  async getEmotionAnalysisByConversation(conversationId: number): Promise<EmotionAnalysis | undefined> {
    const result = await db.select().from(emotionAnalysis)
      .where(eq(emotionAnalysis.conversationId, conversationId))
      .limit(1);
    return result[0];
  }

  async createSpeakerProfile(insertProfile: InsertSpeakerProfile): Promise<SpeakerProfile> {
    const result = await db.insert(speakerProfiles).values({
      ...insertProfile,
      name: insertProfile.name || null,
      voiceProfile: insertProfile.voiceProfile || null,
      sessionCount: insertProfile.sessionCount || 0,
      isMock: insertProfile.isMock || false,
    }).returning();
    return result[0];
  }

  async getSpeakerProfile(speakerId: string): Promise<SpeakerProfile | undefined> {
    const result = await db.select().from(speakerProfiles)
      .where(eq(speakerProfiles.speakerId, speakerId))
      .limit(1);
    return result[0];
  }

  async updateSpeakerProfile(speakerId: string, updates: Partial<SpeakerProfile>): Promise<SpeakerProfile | undefined> {
    const result = await db.update(speakerProfiles)
      .set(updates)
      .where(eq(speakerProfiles.speakerId, speakerId))
      .returning();
    return result[0];
  }

  async getAllSpeakerProfiles(): Promise<SpeakerProfile[]> {
    return await db.select().from(speakerProfiles);
  }

  async createSystemMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const result = await db.insert(systemMetrics).values({
      ...insertMetrics,
      wsConnections: insertMetrics.wsConnections || 0,
      avgResponseTime: insertMetrics.avgResponseTime || null,
      transcriptionAccuracy: insertMetrics.transcriptionAccuracy || null,
      systemHealth: insertMetrics.systemHealth || 'operational',
      uptime: insertMetrics.uptime || null,
    }).returning();
    return result[0];
  }

  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const result = await db.select().from(systemMetrics)
      .orderBy(desc(systemMetrics.timestamp))
      .limit(1);
    return result[0];
  }
}

export const storage = new DatabaseStorage();
