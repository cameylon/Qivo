import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { voiceProcessor } from './voiceProcessor';
import { fastVoiceProcessor } from './fastVoiceProcessor';
import { ultraFastProcessor } from './ultraFastProcessor';
import { storage } from '../storage';
import type { VoiceMessage } from '@shared/schema';

interface ClientConnection {
  ws: WebSocket;
  sessionId?: number;
  userId?: number;
  isAuthenticated: boolean;
  lastActivity: Date;
}

export class VoiceWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private connectionCount = 0;

  constructor(server: Server) {
    // Use a separate port for WebSocket to avoid conflicts with Vite
    this.wss = new WebSocketServer({ port: 8080 });
    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket server initialized on port 8080');
    
    // Start health check
    this.startHealthCheck();
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      ws,
      isAuthenticated: false,
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);
    this.connectionCount++;

    console.log(`WebSocket client connected: ${clientId}. Total connections: ${this.connectionCount}`);

    this.sendMessage(ws, {
      type: 'system',
      data: {
        action: 'connected',
        clientId,
        message: 'Connected to voice processing server',
      }
    });

    ws.on('message', async (data: Buffer) => {
      await this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });
  }

  private async handleMessage(clientId: string, data: Buffer) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      // Try to parse as JSON first (control messages)
      const textData = data.toString('utf8');
      if (textData.length < 1000 && textData.trim().startsWith('{')) {
        let buffer: Buffer;
        try {
          buffer = Buffer.from(textData, 'utf8');
        } catch {
          buffer = data;
        }

        const message: VoiceMessage = JSON.parse(textData);
        console.log('Control message:', message.type);
        await this.handleControlMessage(clientId, message);
      } else {
        // Handle as audio data
        console.log(`🎵 AUDIO DATA RECEIVED: ${data.length} bytes - Processing for transcription...`);
        await this.handleAudioData(clientId, data);
      }
    } catch (error) {
      console.warn('Failed to parse message as JSON, treating as audio data');
      await this.handleAudioData(clientId, data);
    }
  }

  private async handleControlMessage(clientId: string, message: VoiceMessage) {
    if (message.type !== 'control' || !message.data?.action) {
      return;
    }

    const data = message.data;
    await this.handleControlAction(clientId, data);
  }

  private async handleControlAction(clientId: string, data: any) {
    switch (data.action) {
      case 'start_session':
        await this.startVoiceSession(clientId, data.userId);
        break;
      case 'end_session':
        await this.endVoiceSession(clientId);
        break;
      case 'query':
        this.sendMessage(this.clients.get(clientId)!.ws, {
          type: 'response',
          data: { action: 'query_response', result: 'Query functionality not implemented yet' }
        });
        break;
      case 'get_conversations':
        await this.handleGetConversations(clientId, data);
        break;
      case 'get_session_conversations':
        await this.handleGetSessionConversations(clientId, data);
        break;
      case 'get_session_metrics':
        await this.handleGetSessionMetrics(clientId, data);
        break;
      case 'get_speakers':
        await this.handleGetSpeakers(clientId);
        break;
      case 'get_system_metrics':
        await this.handleGetSystemMetrics(clientId);
        break;
      default:
        console.warn(`Unknown control action: ${data.action}`);
    }
  }

  private async handleAudioData(clientId: string, audioBuffer: Buffer) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) {
      this.sendError(client?.ws, "No active session for audio processing");
      return;
    }

    console.log(`Processing audio for client ${clientId}: ${audioBuffer.length} bytes`);

    try {
      // Send immediate acknowledgment
      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'processing',
          message: 'Transcribing audio...',
        }
      });

      // Use ultra-fast processor for immediate transcription
      await ultraFastProcessor.processAudioChunkUltraFast(
        clientId,
        audioBuffer,
        client.sessionId,
        (data) => {
          this.sendMessage(client.ws, {
            type: 'response',
            data
          });
        }
      );

      // Run complete analysis with all features
      setTimeout(async () => {
        try {
          console.log(`🔄 Starting complete analysis with emotion and AI response`);
          await fastVoiceProcessor.processBackgroundAnalysis(
            audioBuffer,
            client.sessionId!,
            'webm',
            undefined,
            (data) => {
              console.log(`📊 Sending analysis result:`, data.action);
              this.sendMessage(client.ws, {
                type: 'response',
                data
              });
            }
          );
        } catch (error) {
          console.error('Complete analysis error:', error);
        }
      }, 200);

    } catch (error) {
      console.error(`Audio processing error for client ${clientId}:`, error);
      this.sendError(client.ws, `Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async startVoiceSession(clientId: string, userId?: number) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const session = await storage.createVoiceSession({
        userId: userId || null,
        duration: null,
      });

      client.sessionId = session.id;
      client.userId = userId;

      console.log(`Voice session ${session.id} started for client ${clientId}`);

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'session_started',
          sessionId: session.id,
          message: 'Voice session started successfully'
        }
      });

    } catch (error) {
      console.error(`Failed to start voice session for client ${clientId}:`, error);
      this.sendError(client.ws, 'Failed to start voice session');
    }
  }

  private async endVoiceSession(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    try {
      await storage.updateVoiceSession(client.sessionId, {
        endTime: new Date(),
        duration: null,
      });

      console.log(`Voice session ${client.sessionId} ended for client ${clientId}`);

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'session_ended',
          sessionId: client.sessionId,
          message: 'Voice session ended successfully'
        }
      });

      // Clear session
      ultraFastProcessor.clearClient(clientId);
      client.sessionId = undefined;

    } catch (error) {
      console.error(`Failed to end voice session for client ${clientId}:`, error);
      this.sendError(client.ws, 'Failed to end voice session');
    }
  }

  private async handleGetConversations(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const limit = data.limit || 50;
      const conversations = await storage.getRecentConversations(limit);

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'conversations',
          conversations,
          count: conversations.length
        }
      });
    } catch (error) {
      console.error('Failed to get conversations:', error);
      this.sendError(client.ws, 'Failed to retrieve conversations');
    }
  }

  private async handleGetSessionConversations(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const sessionId = data.sessionId;
      if (!sessionId) {
        this.sendError(client.ws, 'Session ID required');
        return;
      }

      const conversations = await storage.getConversationsBySession(sessionId);

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'session_conversations',
          sessionId,
          conversations,
          count: conversations.length
        }
      });
    } catch (error) {
      console.error('Failed to get session conversations:', error);
      this.sendError(client.ws, 'Failed to retrieve session conversations');
    }
  }

  private async handleGetSessionMetrics(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const sessionId = data.sessionId;
      if (!sessionId) {
        this.sendError(client.ws, 'Session ID required');
        return;
      }

      const metrics = await fastVoiceProcessor.getSessionMetricsOptimized(sessionId);

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'session_metrics',
          sessionId,
          metrics
        }
      });
    } catch (error) {
      console.error('Failed to get session metrics:', error);
      this.sendError(client.ws, 'Failed to retrieve session metrics');
    }
  }

  private async handleGetSpeakers(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const speakers = await storage.getAllSpeakerProfiles();

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'speakers',
          speakers,
          count: speakers.length
        }
      });
    } catch (error) {
      console.error('Failed to get speakers:', error);
      this.sendError(client.ws, 'Failed to retrieve speakers');
    }
  }

  private async handleGetSystemMetrics(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const metrics = await storage.getLatestSystemMetrics();
      const currentMetrics = {
        connections: this.connectionCount,
        activeSessions: Array.from(this.clients.values()).filter(c => c.sessionId).length,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date(),
        ...metrics
      };

      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'system_metrics',
          metrics: currentMetrics
        }
      });
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      this.sendError(client.ws, 'Failed to retrieve system metrics');
    }
  }

  private sendMessage(ws: WebSocket, message: VoiceMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket | undefined, error: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendMessage(ws, {
        type: 'error',
        data: { message: error }
      });
    }
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client?.sessionId) {
      console.log(`Voice session ${client.sessionId} ended for client ${clientId}`);
      ultraFastProcessor.clearClient(clientId);
    }

    this.clients.delete(clientId);
    this.connectionCount--;
    console.log(`WebSocket client disconnected: ${clientId}. Total connections: ${this.connectionCount}`);
  }

  private generateClientId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `client_${timestamp}_${random}`;
  }

  private startHealthCheck() {
    setInterval(() => {
      const now = new Date();
      for (const [clientId, client] of this.clients.entries()) {
        const timeSinceLastActivity = now.getTime() - client.lastActivity.getTime();
        if (timeSinceLastActivity > 300000) { // 5 minutes
          console.log(`Disconnecting inactive client: ${clientId}`);
          client.ws.close();
        }
      }

      this.updateSystemMetrics().catch(err => 
        console.warn('Failed to update system metrics:', err)
      );
    }, 60000); // Check every minute
  }

  private async updateSystemMetrics() {
    try {
      await storage.createSystemMetrics({
        connections: this.connectionCount,
        activeSessions: Array.from(this.clients.values()).filter(c => c.sessionId).length,
        uptime: Math.floor(process.uptime()),
        memoryUsage: JSON.stringify(process.memoryUsage()),
        timestamp: new Date(),
      });
    } catch (error) {
      console.warn('Failed to store system metrics:', error);
    }
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getActiveSessionCount(): number {
    return Array.from(this.clients.values()).filter(c => c.sessionId).length;
  }
}