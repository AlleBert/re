import { FinancialDataService } from './financialDataService';

// Real-time price update service integrated with financial data providers
export class PriceService {
  private static updateInterval: NodeJS.Timeout | null = null;
  private static readonly UPDATE_INTERVAL = 60000; // Update every minute
  
  // Get real price updates from financial data service
  static async getRealPriceUpdate(symbol: string, currentPrice: number): Promise<number> {
    try {
      const quote = await FinancialDataService.getRealTimeQuote(symbol);
      if (quote && quote.price > 0) {
        return quote.price;
      }
    } catch (error) {
      console.warn(`Failed to get real price for ${symbol}, using simulated data:`, error);
    }
    
    // Fallback to realistic simulation if API fails
    return this.mockPriceUpdate(currentPrice, symbol);
  }

  // Mock price fluctuation for demonstration when APIs are unavailable
  static mockPriceUpdate(currentPrice: number, symbol: string): number {
    // Create realistic price movements
    const volatility = this.getVolatility(symbol);
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    const newPrice = currentPrice + change;
    
    // Ensure price doesn't go below 1% of original
    return Math.max(newPrice, currentPrice * 0.01);
  }

  private static getVolatility(symbol: string): number {
    // Different assets have different volatilities
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 0.05; // Crypto: high volatility
    if (symbol.includes('ETF') || symbol === 'VOO' || symbol === 'IWDA') return 0.01; // ETFs: low volatility
    if (symbol.includes('BOND') || symbol.startsWith('IT')) return 0.005; // Bonds: very low volatility
    return 0.02; // Stocks: medium volatility
  }

  static startPriceUpdates(onUpdate: (updates: Array<{id: string, price: number}>) => void) {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(async () => {
      try {
        // Get investments from localStorage
        const investments = JSON.parse(localStorage.getItem('investment-tracker-investments') || '[]');
        
        const updates = await Promise.all(
          investments.map(async (investment: any) => {
            const newPrice = await this.getRealPriceUpdate(investment.currentPrice, investment.symbol);
            return {
              id: investment.id,
              price: newPrice
            };
          })
        );

        onUpdate(updates);
      } catch (error) {
        console.error('Error in price updates:', error);
      }
    }, this.UPDATE_INTERVAL);
  }

  static stopPriceUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Real-time price monitoring for specific investments
  static async monitorInvestment(symbol: string, onPriceChange: (newPrice: number) => void) {
    const monitorInterval = setInterval(async () => {
      try {
        const quote = await FinancialDataService.getRealTimeQuote(symbol);
        if (quote && quote.price > 0) {
          onPriceChange(quote.price);
        }
      } catch (error) {
        console.warn(`Failed to monitor ${symbol}:`, error);
      }
    }, 30000); // Check every 30 seconds for more frequent updates

    return () => clearInterval(monitorInterval);
  }

  // Batch update prices for multiple investments
  static async batchUpdatePrices(symbols: string[]): Promise<Map<string, number>> {
    const priceUpdates = new Map<string, number>();
    
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await FinancialDataService.getRealTimeQuote(symbol);
          if (quote && quote.price > 0) {
            priceUpdates.set(symbol, quote.price);
          }
        } catch (error) {
          console.warn(`Failed to update price for ${symbol}:`, error);
        }
      })
    );

    return priceUpdates;
  }
}