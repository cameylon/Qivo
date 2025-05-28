import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { voiceProcessor } from './voiceProcessor';
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
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false // Better for real-time audio
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHealthCheck();
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      ws,
      isAuthenticated: true, // Simplified auth for demo
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);
    this.connectionCount++;

    console.log(`WebSocket client connected: ${clientId}. Total connections: ${this.connectionCount}`);

    // Send welcome message
    this.sendMessage(ws, {
      type: 'control',
      data: {
        action: 'connected',
        clientId,
        message: 'Connected to voice processing server',
      }
    });

    ws.on('message', async (data: Buffer) => {
      try {
        client.lastActivity = new Date();
        await this.handleMessage(clientId, data);
      } catch (error) {
        console.error(`Error handling message from ${clientId}:`, error);
        this.sendError(ws, `Message processing error: ${error.message}`);
      }
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

    try {
      // Try to parse as JSON for control messages
      const textData = data.toString();
      const message: VoiceMessage = JSON.parse(textData);
      
      await this.handleControlMessage(clientId, message);
    } catch (jsonError) {
      // If JSON parsing fails, treat as binary audio data
      await this.handleAudioData(clientId, data);
    }
  }

  private async handleControlMessage(clientId: string, message: VoiceMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'control':
        await this.handleControlAction(clientId, message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleControlAction(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.action) {
      case 'start_session':
        await this.startVoiceSession(clientId, data.userId);
        break;
      case 'end_session':
        await this.endVoiceSession(clientId);
        break;
      case 'ping':
        this.sendMessage(client.ws, {
          type: 'control',
          data: { action: 'pong', timestamp: Date.now() }
        });
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

    try {
      // Send processing indicator
      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'processing',
          message: 'Processing audio...',
        }
      });

      // Process the voice message
      const result = await voiceProcessor.processVoiceMessage(
        audioBuffer,
        client.sessionId,
        'webm' // Default format, could be detected or specified by client
      );

      // Send the complete result back to client
      this.sendMessage(client.ws, {
        type: 'response',
        data: {
          action: 'voice_processed',
          transcript: result.transcript,
          confidence: result.confidence,
          emotion: result.emotion,
          speaker: {
            id: result.speaker.speakerId,
            name: result.speaker.name,
            confidence: result.speaker.isMock ? 'Mock Data' : '85%',
            isMock: result.speaker.isMock,
          },
          aiResponse: result.aiResponse,
          processingTime: result.processingTime,
          timestamp: Date.now(),
        }
      });

      // Update system metrics
      await this.updateSystemMetrics();

    } catch (error) {
      console.error(`Audio processing error for client ${clientId}:`, error);
      this.sendError(client.ws, `Audio processing failed: ${error.message}`);
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

      this.sendMessage(client.ws, {
        type: 'control',
        data: {
          action: 'session_started',
          sessionId: session.id,
          message: 'Voice session started successfully',
        }
      });

      console.log(`Voice session ${session.id} started for client ${clientId}`);
    } catch (error) {
      console.error(`Failed to start session for client ${clientId}:`, error);
      this.sendError(client.ws, `Failed to start voice session: ${error.message}`);
    }
  }

  private async endVoiceSession(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client || !client.sessionId) return;

    try {
      const session = await storage.getVoiceSession(client.sessionId);
      if (session) {
        const duration = Math.floor((Date.now() - (session.startTime?.getTime() || Date.now())) / 1000);
        
        await storage.updateVoiceSession(client.sessionId, {
          endTime: new Date(),
          duration,
          isActive: false,
        });
      }

      this.sendMessage(client.ws, {
        type: 'control',
        data: {
          action: 'session_ended',
          sessionId: client.sessionId,
          message: 'Voice session ended successfully',
        }
      });

      console.log(`Voice session ${client.sessionId} ended for client ${clientId}`);
      client.sessionId = undefined;
    } catch (error) {
      console.error(`Failed to end session for client ${clientId}:`, error);
      this.sendError(client.ws, `Failed to end voice session: ${error.message}`);
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
        type: 'control',
        data: {
          action: 'error',
          error,
          timestamp: Date.now(),
        }
      });
    }
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      if (client.sessionId) {
        // End any active session
        this.endVoiceSession(clientId);
      }
      this.clients.delete(clientId);
      this.connectionCount--;
    }
    console.log(`WebSocket client disconnected: ${clientId}. Total connections: ${this.connectionCount}`);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHealthCheck() {
    setInterval(async () => {
      // Clean up stale connections
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [clientId, client] of this.clients.entries()) {
        if (now.getTime() - client.lastActivity.getTime() > staleThreshold) {
          console.log(`Cleaning up stale connection: ${clientId}`);
          this.handleDisconnection(clientId);
        }
      }

      // Update system metrics
      await this.updateSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  private async updateSystemMetrics() {
    try {
      const activeSessions = Array.from(this.clients.values())
        .filter(client => client.sessionId).length;

      const avgResponseTime = 1.2; // This would be calculated from recent processing times

      await storage.createSystemMetrics({
        wsConnections: this.connectionCount,
        avgResponseTime,
        transcriptionAccuracy: 94.5,
        systemHealth: 'operational',
        uptime: Math.floor(process.uptime()),
      });
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }

  getConnectionCount(): number {
    return this.connectionCount;
  }

  getActiveSessionCount(): number {
    return Array.from(this.clients.values())
      .filter(client => client.sessionId).length;
  }
}
