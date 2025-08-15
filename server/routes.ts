import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getClientConfig, config } from "./config";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration endpoint for client environment variables
  app.get("/api/config", (req, res) => {
    res.json(getClientConfig());
  });

  // FMP API proxy routes to avoid CORS issues
  app.get("/api/fmp/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=10&apikey=${config.fmpApiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FMP search error:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  app.get("/api/fmp/quote/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
      }

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol.toUpperCase()}?apikey=${config.fmpApiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FMP quote error:", error);
      res.status(500).json({ error: "Failed to get quote" });
    }
  });

  app.get("/api/fmp/quotes", async (req, res) => {
    try {
      const { symbols } = req.query;
      if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: "Symbols parameter is required" });
      }

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbols.toUpperCase()}?apikey=${config.fmpApiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FMP quotes error:", error);
      res.status(500).json({ error: "Failed to get quotes" });
    }
  });

  app.get("/api/fmp/profile/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
      }

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${symbol.toUpperCase()}?apikey=${config.fmpApiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FMP profile error:", error);
      res.status(500).json({ error: "Failed to get company profile" });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
