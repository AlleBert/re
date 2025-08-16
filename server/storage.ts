import { type Investment, type Transaction, type InsertInvestment, type InsertTransaction } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Investment operations
  getInvestments(): Promise<Investment[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Investment operations (buy/sell)
  sellInvestment(id: string, quantity: number, price: number, user: string): Promise<{ investment: Investment | null; transaction: Transaction }>;
  
  // Price update
  updateInvestmentPrice(id: string, newPrice: number, user: string): Promise<Investment | undefined>;
}

export class MemStorage implements IStorage {
  private investments: Map<string, Investment>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.investments = new Map();
    this.transactions = new Map();
    
    // Initialize with some sample data for demonstration
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleInvestments: Investment[] = [
      {
        id: "1",
        name: "Apple Inc.",
        symbol: "AAPL",
        category: "stocks",
        quantity: 25,
        avgPrice: 175.50,
        currentPrice: 182.30,
        purchaseDate: "2023-12-15",
        aliShare: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Tesla Inc.",
        symbol: "TSLA",
        category: "stocks",
        quantity: 15,
        avgPrice: 250.00,
        currentPrice: 245.50,
        purchaseDate: "2023-11-20",
        aliShare: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Bitcoin",
        symbol: "BTC",
        category: "crypto",
        quantity: 0.5,
        avgPrice: 35000.00,
        currentPrice: 42500.00,
        purchaseDate: "2023-12-05",
        aliShare: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    sampleInvestments.forEach(investment => {
      this.investments.set(investment.id, investment);
    });

    const sampleTransactions: Transaction[] = [
      {
        id: "1",
        type: "buy",
        assetSymbol: "AAPL",
        assetName: "Apple Inc.",
        quantity: 25,
        price: 175.50,
        total: 4387.50,
        user: "Alle",
        timestamp: "2023-12-15T10:00:00Z",
      },
      {
        id: "2",
        type: "price_update",
        assetSymbol: "TSLA",
        assetName: "Tesla Inc.",
        price: 245.50,
        user: "Alle",
        timestamp: "2023-12-10T14:30:00Z",
      },
      {
        id: "3",
        type: "buy",
        assetSymbol: "BTC",
        assetName: "Bitcoin",
        quantity: 0.5,
        price: 35000.00,
        total: 17500.00,
        user: "Alle",
        timestamp: "2023-12-05T09:15:00Z",
      },
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });
  }

  async getInvestments(): Promise<Investment[]> {
    return Array.from(this.investments.values());
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const investment: Investment = {
      ...insertInvestment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.investments.set(id, investment);
    return investment;
  }

  async updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;
    
    const updated: Investment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    return this.investments.delete(id);
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      timestamp: new Date().toISOString(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async sellInvestment(id: string, sellQuantity: number, sellPrice: number, user: string): Promise<{ investment: Investment | null; transaction: Transaction }> {
    const existing = this.investments.get(id);
    if (!existing) {
      throw new Error('Investment not found');
    }
    
    if (sellQuantity > existing.quantity) {
      throw new Error('Cannot sell more than owned quantity');
    }
    
    // Create sell transaction
    const transaction = await this.createTransaction({
      type: "sell",
      assetSymbol: existing.symbol,
      assetName: existing.name,
      quantity: sellQuantity,
      price: sellPrice,
      total: sellQuantity * sellPrice,
      user: user as "Ali" | "Alle",
    });
    
    let updatedInvestment: Investment | null = null;
    
    if (sellQuantity === existing.quantity) {
      // Selling all - remove investment
      this.investments.delete(id);
    } else {
      // Partial sell - update quantity
      const newQuantity = existing.quantity - sellQuantity;
      updatedInvestment = await this.updateInvestment(id, { 
        quantity: newQuantity 
      }) || null;
    }
    
    return { investment: updatedInvestment, transaction };
  }
  
  async updateInvestmentPrice(id: string, newPrice: number, user: string): Promise<Investment | undefined> {
    const investment = await this.updateInvestment(id, { currentPrice: newPrice });
    if (investment) {
      await this.createTransaction({
        type: "price_update",
        assetSymbol: investment.symbol,
        assetName: investment.name,
        price: newPrice,
        user: user as "Ali" | "Alle",
      });
    }
    return investment;
  }
}

export const storage = new MemStorage();
