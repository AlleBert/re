import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getClientConfig, config } from "./config";
import { serverFinnhubService } from "./finnhub";
import { multiProviderService } from "./multiProvider";
import { insertInvestmentSchema, insertTransactionSchema } from "@shared/schema";

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
      
      // Use multi-provider service for better European market coverage
      const quote = await multiProviderService.getQuote(symbol);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found from any provider" });
      }
      
      // Log which provider was used for debugging
      if (quote.provider) {
        console.log(`Quote for ${symbol} provided by: ${quote.provider}`);
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Multi-provider quote error:", error);
      res.status(500).json({ error: "Quote fetch failed from all providers" });
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

  // Investment CRUD operations
  app.get("/api/investments", async (req, res) => {
    try {
      const investments = await storage.getInvestments();
      res.json(investments);
    } catch (error) {
      console.error("Get investments error:", error);
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      console.log('🔍 Received investment data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertInvestmentSchema.parse(req.body);
      console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));
      const investment = await storage.createInvestment(validatedData);
      console.log('💾 Created investment:', JSON.stringify(investment, null, 2));
      
      // Also create a transaction for this purchase
      await storage.createTransaction({
        type: "buy",
        assetSymbol: investment.symbol,
        assetName: investment.name,
        quantity: investment.quantity,
        price: investment.avgPrice,
        total: investment.quantity * investment.avgPrice,
        user: "Alle" // Default to admin user for new investments
      });
      
      console.log(`New investment created: ${investment.name} (${investment.symbol})`);
      res.status(201).json(investment);
    } catch (error) {
      console.error("Create investment error:", error);
      res.status(400).json({ error: "Failed to create investment", details: error });
    }
  });

  app.put("/api/investments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const investment = await storage.updateInvestment(id, updates);
      
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      res.json(investment);
    } catch (error) {
      console.error("Update investment error:", error);
      res.status(500).json({ error: "Failed to update investment" });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteInvestment(id);
      
      if (!success) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete investment error:", error);
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Sell investment endpoint
  app.post("/api/investments/:id/sell", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, price, user } = req.body;
      
      if (!quantity || !price || !user) {
        return res.status(400).json({ error: "Quantity, price, and user are required" });
      }
      
      const result = await storage.sellInvestment(id, quantity, price, user);
      
      console.log(`Investment sold: ${quantity} units at ${price} each by ${user}`);
      res.json(result);
    } catch (error) {
      console.error("Sell investment error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to sell investment" });
    }
  });

  // Transaction operations
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(400).json({ error: "Failed to create transaction", details: error });
    }
  });

  // Price update endpoint
  app.patch("/api/investments/:id/price", async (req, res) => {
    try {
      const { id } = req.params;
      const { price, user } = req.body;
      
      if (!price || !user) {
        return res.status(400).json({ error: "Price and user are required" });
      }
      
      const investment = await storage.updateInvestmentPrice(id, price, user);
      
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      res.json(investment);
    } catch (error) {
      console.error("Update price error:", error);
      res.status(500).json({ error: "Failed to update price" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
