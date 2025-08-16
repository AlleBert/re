import { z } from "zod";

export const investmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  isin: z.string().optional(),
  category: z.enum(["stocks", "etf", "crypto", "bonds"]),
  quantity: z.number().positive(),
  avgPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  purchaseDate: z.string(),
  aliShare: z.number().min(0).max(100).default(25),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["buy", "sell", "price_update"]),
  assetSymbol: z.string(),
  assetName: z.string(),
  quantity: z.number().optional(),
  price: z.number().positive(),
  total: z.number().optional(),
  user: z.enum(["Ali", "Alle"]),
  timestamp: z.string(),
});

export const insertInvestmentSchema = investmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = transactionSchema.omit({
  id: true,
  timestamp: true,
});

export type Investment = z.infer<typeof investmentSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const portfolioSummarySchema = z.object({
  totalValue: z.number(),
  totalGainLoss: z.number(),
  alleShare: z.number(),
  aliShare: z.number(),
  gainLossPercentage: z.number(),
});

export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;
