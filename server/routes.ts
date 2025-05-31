import type { Express } from "express";
import { createServer, type Server } from "http";
import { VoiceWebSocketServer } from "./services/websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server for all communication
  const wsServer = new VoiceWebSocketServer(httpServer);

  // All data access and real-time communication handled through WebSocket
  // No REST API endpoints needed

  return httpServer;
}