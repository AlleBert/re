import { fmpService, FMPQuote } from './fmpService';
import { Investment } from '@shared/schema';

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercentage: number;
  timestamp: number;
}

type PriceUpdateCallback = (updates: PriceUpdate[]) => void;

class RealTimePriceService {
  private updateCallbacks: Set<PriceUpdateCallback> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private updateFrequency = 30000; // 30 seconds
  private lastUpdate: number = 0;

  async startPriceUpdates(investments: Investment[], callback: PriceUpdateCallback): Promise<void> {
    if (!(await fmpService.isConfigured())) {
      console.warn('FMP service not configured. Real-time updates disabled.');
      return;
    }

    this.updateCallbacks.add(callback);

    if (!this.isRunning && investments.length > 0) {
      this.isRunning = true;
      this.scheduleUpdate(investments);
    }
  }

  stopPriceUpdates(callback?: PriceUpdateCallback): void {
    if (callback) {
      this.updateCallbacks.delete(callback);
    } else {
      this.updateCallbacks.clear();
    }

    if (this.updateCallbacks.size === 0) {
      this.isRunning = false;
      if (this.updateInterval) {
        clearTimeout(this.updateInterval);
        this.updateInterval = null;
      }
    }
  }

  private scheduleUpdate(investments: Investment[]): void {
    if (!this.isRunning) return;

    this.updateInterval = setTimeout(async () => {
      await this.fetchAndBroadcastUpdates(investments);
      if (this.isRunning) {
        this.scheduleUpdate(investments);
      }
    }, this.updateFrequency);
  }

  private async fetchAndBroadcastUpdates(investments: Investment[]): Promise<void> {
    try {
      const symbols = investments.map(inv => inv.symbol);
      const quotes = await fmpService.getMultipleQuotes(symbols);
      
      const updates: PriceUpdate[] = quotes
        .filter((quote): quote is FMPQuote => quote !== null)
        .map(quote => ({
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercentage: quote.changesPercentage,
          timestamp: Date.now()
        }));

      if (updates.length > 0) {
        this.lastUpdate = Date.now();
        this.broadcastUpdates(updates);
      }
    } catch (error) {
      console.error('Failed to fetch price updates:', error);
    }
  }

  private broadcastUpdates(updates: PriceUpdate[]): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(updates);
      } catch (error) {
        console.error('Error in price update callback:', error);
      }
    });
  }

  async validateAndGetPrice(symbol: string): Promise<{ valid: boolean; price?: number; name?: string; error?: string }> {
    try {
      const quote = await fmpService.getQuote(symbol);
      
      if (quote) {
        return {
          valid: true,
          price: quote.price,
          name: quote.name
        };
      } else {
        return {
          valid: false,
          error: 'Symbol not found'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async searchSymbols(query: string) {
    try {
      return await fmpService.searchSymbol(query);
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  getLastUpdateTime(): number {
    return this.lastUpdate;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  setUpdateFrequency(seconds: number): void {
    this.updateFrequency = seconds * 1000;
  }
}

export const realTimePriceService = new RealTimePriceService();
export type { PriceUpdate };