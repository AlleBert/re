import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getClientConfig, config } from "./config";
import { serverFinnhubService } from "./finnhub";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration endpoint for client environment variables
  app.get("/api/config", (req, res) => {
    res.json(getClientConfig());
  });

  // Finnhub API proxy routes with enhanced ETF search
  app.get("/api/finnhub/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter required" });
      }
      
      const results = await serverFinnhubService.searchSymbol(query);
      console.log(`Search for "${query}" returned ${results.length} results:`, results.map(r => `${r.symbol} (${r.type})`));
      
      res.json(results);
    } catch (error) {
      console.error("Finnhub search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/finnhub/quote/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter required" });
      }
      const quote = await serverFinnhubService.getQuote(symbol);
      if (!quote) {
        // For European symbols, return a placeholder response instead of 404
        if (symbol.toUpperCase().includes('.L') || symbol.toUpperCase().includes('.PA') || symbol.toUpperCase().includes('.MI')) {
          return res.json({
            symbol: symbol.toUpperCase(),
            name: symbol.toUpperCase(),
            price: 0,
            changesPercentage: 0,
            change: 0,
            dayLow: 0,
            dayHigh: 0,
            open: 0,
            previousClose: 0,
            currency: symbol.toUpperCase().endsWith('.L') ? 'GBP' : 'EUR',
            exchange: symbol.toUpperCase().endsWith('.L') ? 'London Stock Exchange' : 'European Exchange',
            error: 'Real-time price data not available for this market in the free tier. You can still track this investment with manual price updates.'
          });
        }
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Finnhub quote error:", error);
      res.status(500).json({ error: "Quote fetch failed" });
    }
  });

  app.get("/api/finnhub/validate/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter required" });
      }
      const validation = await serverFinnhubService.validateSymbol(symbol);
      res.json(validation);
    } catch (error) {
      console.error("Finnhub validation error:", error);
      res.status(500).json({ error: "Validation failed" });
    }
  });

  app.get("/api/finnhub/status", (req, res) => {
    res.json({ configured: serverFinnhubService.isConfigured() });
  });

  // ISIN lookup endpoint
  app.get("/api/finnhub/isin/:isin", async (req, res) => {
    try {
      const isin = req.params.isin;
      if (!isin) {
        return res.status(400).json({ error: "ISIN parameter required" });
      }
      const result = await serverFinnhubService.lookupByISIN(isin);
      res.json(result);
    } catch (error) {
      console.error("ISIN lookup error:", error);
      res.status(500).json({ error: "ISIN lookup failed" });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
