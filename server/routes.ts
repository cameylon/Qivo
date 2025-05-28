import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { VoiceWebSocketServer } from "./services/websocket";
import { voiceProcessor } from "./services/voiceProcessor";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wsServer = new VoiceWebSocketServer(httpServer);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const metrics = await storage.getLatestSystemMetrics();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: wsServer.getConnectionCount(),
        activeSessions: wsServer.getActiveSessionCount(),
        uptime: Math.floor(process.uptime()),
        metrics: metrics || null,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
      });
    }
  });

  // Get recent conversations
  app.get('/api/conversations', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const conversations = await storage.getRecentConversations(limit);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch conversations',
        error: error.message,
      });
    }
  });

  // Get conversations by session
  app.get('/api/conversations/session/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }

      const conversations = await storage.getConversationsBySession(sessionId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch session conversations',
        error: error.message,
      });
    }
  });

  // Get session metrics
  app.get('/api/sessions/:sessionId/metrics', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }

      const metrics = await voiceProcessor.getSessionMetrics(sessionId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch session metrics',
        error: error.message,
      });
    }
  });

  // Get speaker profiles
  app.get('/api/speakers', async (req, res) => {
    try {
      const speakers = await storage.getAllSpeakerProfiles();
      res.json(speakers);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch speaker profiles',
        error: error.message,
      });
    }
  });

  // Get specific speaker profile
  app.get('/api/speakers/:speakerId', async (req, res) => {
    try {
      const speakerId = req.params.speakerId;
      const speaker = await storage.getSpeakerProfile(speakerId);
      
      if (!speaker) {
        return res.status(404).json({ message: 'Speaker not found' });
      }

      res.json(speaker);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch speaker profile',
        error: error.message,
      });
    }
  });

  // Get system metrics
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = await storage.getLatestSystemMetrics();
      const connectionInfo = {
        wsConnections: wsServer.getConnectionCount(),
        activeSessions: wsServer.getActiveSessionCount(),
        uptime: Math.floor(process.uptime()),
      };

      res.json({
        ...metrics,
        ...connectionInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch system metrics',
        error: error.message,
      });
    }
  });

  // WebSocket endpoint info
  app.get('/api/ws/info', (req, res) => {
    res.json({
      websocketUrl: '/ws',
      protocol: req.protocol === 'https' ? 'wss' : 'ws',
      host: req.get('host'),
      fullUrl: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/ws`,
    });
  });

  return httpServer;
}
