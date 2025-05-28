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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private voiceSessions: Map<number, VoiceSession>;
  private conversations: Map<number, Conversation>;
  private emotionAnalyses: Map<number, EmotionAnalysis>;
  private speakerProfiles: Map<string, SpeakerProfile>;
  private systemMetrics: Map<number, SystemMetrics>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.voiceSessions = new Map();
    this.conversations = new Map();
    this.emotionAnalyses = new Map();
    this.speakerProfiles = new Map();
    this.systemMetrics = new Map();
    this.currentId = 1;

    // Initialize with default speaker profiles
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create mock speaker profiles
    const mockProfile: SpeakerProfile = {
      id: 1,
      speakerId: "User_001",
      name: "Demo User",
      voiceProfile: JSON.stringify({ 
        pitch: "medium", 
        tone: "friendly", 
        accent: "neutral" 
      }),
      lastSeen: new Date(),
      sessionCount: 3,
      isMock: true,
    };
    this.speakerProfiles.set("User_001", mockProfile);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createVoiceSession(insertSession: InsertVoiceSession): Promise<VoiceSession> {
    const id = this.currentId++;
    const session: VoiceSession = {
      ...insertSession,
      id,
      startTime: new Date(),
      endTime: null,
      totalMessages: 0,
      isActive: true,
    };
    this.voiceSessions.set(id, session);
    return session;
  }

  async getVoiceSession(id: number): Promise<VoiceSession | undefined> {
    return this.voiceSessions.get(id);
  }

  async updateVoiceSession(id: number, updates: Partial<VoiceSession>): Promise<VoiceSession | undefined> {
    const session = this.voiceSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.voiceSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveSession(userId?: number): Promise<VoiceSession | undefined> {
    return Array.from(this.voiceSessions.values()).find(
      (session) => session.isActive && (userId ? session.userId === userId : true)
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentId++;
    const conversation: Conversation = {
      ...insertConversation,
      id,
      timestamp: new Date(),
    };
    this.conversations.set(id, conversation);
    
    // Update session message count
    const session = this.voiceSessions.get(conversation.sessionId);
    if (session) {
      session.totalMessages = (session.totalMessages || 0) + 1;
      this.voiceSessions.set(conversation.sessionId, session);
    }
    
    return conversation;
  }

  async getConversationsBySession(sessionId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((conv) => conv.sessionId === sessionId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async getRecentConversations(limit = 50): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async createEmotionAnalysis(insertAnalysis: InsertEmotionAnalysis): Promise<EmotionAnalysis> {
    const id = this.currentId++;
    const analysis: EmotionAnalysis = {
      ...insertAnalysis,
      id,
      timestamp: new Date(),
    };
    this.emotionAnalyses.set(id, analysis);
    return analysis;
  }

  async getEmotionAnalysisByConversation(conversationId: number): Promise<EmotionAnalysis | undefined> {
    return Array.from(this.emotionAnalyses.values()).find(
      (analysis) => analysis.conversationId === conversationId
    );
  }

  async createSpeakerProfile(insertProfile: InsertSpeakerProfile): Promise<SpeakerProfile> {
    const id = this.currentId++;
    const profile: SpeakerProfile = {
      ...insertProfile,
      id,
      lastSeen: new Date(),
      sessionCount: 0,
      isMock: insertProfile.isMock || false,
    };
    this.speakerProfiles.set(profile.speakerId, profile);
    return profile;
  }

  async getSpeakerProfile(speakerId: string): Promise<SpeakerProfile | undefined> {
    return this.speakerProfiles.get(speakerId);
  }

  async updateSpeakerProfile(speakerId: string, updates: Partial<SpeakerProfile>): Promise<SpeakerProfile | undefined> {
    const profile = this.speakerProfiles.get(speakerId);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...updates };
    this.speakerProfiles.set(speakerId, updatedProfile);
    return updatedProfile;
  }

  async getAllSpeakerProfiles(): Promise<SpeakerProfile[]> {
    return Array.from(this.speakerProfiles.values());
  }

  async createSystemMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const id = this.currentId++;
    const metrics: SystemMetrics = {
      ...insertMetrics,
      id,
      timestamp: new Date(),
    };
    this.systemMetrics.set(id, metrics);
    return metrics;
  }

  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const metrics = Array.from(this.systemMetrics.values());
    return metrics.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))[0];
  }
}

export const storage = new MemStorage();
