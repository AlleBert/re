import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getClientConfig, config } from "./config";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration endpoint for client environment variables
  app.get("/api/config", (req, res) => {
    res.json(getClientConfig());
  });

  // No proxy routes needed - Yahoo Finance service handles everything client-side

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
