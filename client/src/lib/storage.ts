import { Investment, Transaction, PortfolioSummary } from "@shared/schema";

const STORAGE_KEYS = {
  INVESTMENTS: 'investment-tracker-investments',
  TRANSACTIONS: 'investment-tracker-transactions',
  THEME: 'investment-tracker-theme',
} as const;

export class LocalStorageService {
  static getInvestments(): Investment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static setInvestments(investments: Investment[]): void {
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
  }

  static getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static setTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static getTheme(): string {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  }

  static setTheme(theme: string): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  static calculatePortfolioSummary(investments: Investment[]): PortfolioSummary {
    let totalValue = 0;
    let totalCost = 0;

    investments.forEach(investment => {
      const currentValue = investment.quantity * investment.currentPrice;
      const costBasis = investment.quantity * investment.avgPrice;
      totalValue += currentValue;
      totalCost += costBasis;
    });

    const totalGainLoss = totalValue - totalCost;
    const gainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const alleShare = totalValue * 0.75;
    const aliShare = totalValue * 0.25;

    return {
      totalValue,
      totalGainLoss,
      alleShare,
      aliShare,
      gainLossPercentage,
    };
  }

  static addInvestment(investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>): Investment {
    const investments = this.getInvestments();
    const newInvestment: Investment = {
      ...investment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quantity: Math.max(0, investment.quantity), // Ensure non-negative quantity
    };
    
    investments.push(newInvestment);
    this.setInvestments(investments);
    
    // Add transaction record
    this.addTransaction({
      type: 'buy',
      assetSymbol: newInvestment.symbol,
      assetName: newInvestment.name,
      quantity: newInvestment.quantity,
      price: newInvestment.avgPrice,
      total: newInvestment.quantity * newInvestment.avgPrice,
      user: 'Alle',
    });
    
    return newInvestment;
  }

  static updateInvestment(id: string, updates: Partial<Investment>): Investment | null {
    const investments = this.getInvestments();
    const index = investments.findIndex(inv => inv.id === id);
    
    if (index === -1) return null;
    
    investments[index] = {
      ...investments[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.setInvestments(investments);
    return investments[index];
  }

  static deleteInvestment(id: string): boolean {
    const investments = this.getInvestments();
    const filteredInvestments = investments.filter(inv => inv.id !== id);
    
    if (filteredInvestments.length === investments.length) return false;
    
    this.setInvestments(filteredInvestments);
    return true;
  }

  static updateInvestmentPrice(id: string, newPrice: number, user: string): Investment | null {
    const investment = this.updateInvestment(id, { currentPrice: newPrice });
    
    if (investment) {
      this.addTransaction({
        type: 'price_update',
        assetSymbol: investment.symbol,
        assetName: investment.name,
        price: newPrice,
        user: user as 'Ali' | 'Alle',
      });
    }
    
    return investment;
  }

  static addTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    transactions.unshift(newTransaction);
    this.setTransactions(transactions);
    
    return newTransaction;
  }
}
