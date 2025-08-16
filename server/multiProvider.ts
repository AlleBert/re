import { serverFinnhubService } from './finnhub';

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  open: number;
  previousClose: number;
  currency: string;
  exchange: string;
  marketCap?: number;
  error?: string;
  provider?: string;
}

interface AlphaVantageQuote {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
    "03. high": string;
    "04. low": string;
    "02. open": string;
    "08. previous close": string;
  }
}

class MultiProviderService {
  private cache = new Map<string, { data: QuoteData; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  async getQuote(symbol: string): Promise<QuoteData | null> {
    // Check cache first
    const cached = this.getCachedQuote(symbol);
    if (cached) {
      return cached;
    }

    // Try Finnhub first
    try {
      const finnhubQuote = await serverFinnhubService.getQuote(symbol);
      if (finnhubQuote && finnhubQuote.price > 0) {
        const enhancedQuote = { ...finnhubQuote, provider: 'Finnhub' };
        this.setCachedQuote(symbol, enhancedQuote);
        return enhancedQuote;
      }
    } catch (error) {
      console.log('Finnhub failed, trying Alpha Vantage...');
    }

    // Try Alpha Vantage as fallback
    try {
      const alphaQuote = await this.getAlphaVantageQuote(symbol);
      if (alphaQuote) {
        alphaQuote.provider = 'Alpha Vantage';
        this.setCachedQuote(symbol, alphaQuote);
        return alphaQuote;
      }
    } catch (error) {
      console.log('Alpha Vantage failed, trying Yahoo Finance fallback...');
    }

    // Try Yahoo Finance API (unofficial but works well for European markets)
    try {
      const yahooQuote = await this.getYahooFinanceQuote(symbol);
      if (yahooQuote) {
        yahooQuote.provider = 'Yahoo Finance';
        this.setCachedQuote(symbol, yahooQuote);
        return yahooQuote;
      }
    } catch (error) {
      console.log('All providers failed for', symbol);
    }

    // Final fallback: return basic info for European symbols
    return this.getBasicEuropeanFallback(symbol);
  }

  private getCachedQuote(symbol: string): QuoteData | null {
    const cached = this.cache.get(symbol.toUpperCase());
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Cache hit for ${symbol}`);
      return cached.data;
    }
    return null;
  }

  private setCachedQuote(symbol: string, data: QuoteData): void {
    this.cache.set(symbol.toUpperCase(), { data, timestamp: Date.now() });
  }

  private async getAlphaVantageQuote(symbol: string): Promise<QuoteData | null> {
    // Free Alpha Vantage API - 5 calls per minute, 100 per day
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data: AlphaVantageQuote = await response.json();
      
      if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
        const quote = data["Global Quote"];
        return {
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          price: parseFloat(quote["05. price"]),
          changesPercentage: parseFloat(quote["10. change percent"].replace('%', '')),
          change: parseFloat(quote["09. change"]),
          dayHigh: parseFloat(quote["03. high"]),
          dayLow: parseFloat(quote["04. low"]),
          open: parseFloat(quote["02. open"]),
          previousClose: parseFloat(quote["08. previous close"]),
          currency: this.getCurrencyFromSymbol(symbol),
          exchange: this.getExchangeFromSymbol(symbol)
        };
      }
    } catch (error) {
      console.error('Alpha Vantage error:', error);
    }
    return null;
  }

  private async getYahooFinanceQuote(symbol: string): Promise<QuoteData | null> {
    // Free Yahoo Finance API (unofficial)
    const yahooSymbol = this.convertToYahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.chart?.result?.[0]?.meta) {
        const meta = data.chart.result[0].meta;
        const currentPrice = meta.regularMarketPrice || meta.previousClose;
        
        return {
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          price: currentPrice,
          changesPercentage: ((currentPrice - meta.previousClose) / meta.previousClose) * 100,
          change: currentPrice - meta.previousClose,
          dayHigh: meta.regularMarketDayHigh || 0,
          dayLow: meta.regularMarketDayLow || 0,
          open: meta.regularMarketOpen || 0,
          previousClose: meta.previousClose,
          currency: meta.currency || this.getCurrencyFromSymbol(symbol),
          exchange: meta.exchangeName || this.getExchangeFromSymbol(symbol)
        };
      }
    } catch (error) {
      console.error('Yahoo Finance error:', error);
    }
    return null;
  }

  private convertToYahooSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    // Convert common European suffixes to Yahoo format
    if (upperSymbol.endsWith('.L')) {
      return upperSymbol; // Yahoo uses .L for London
    }
    if (upperSymbol.endsWith('.PA')) {
      return upperSymbol.replace('.PA', '.PA'); // Yahoo uses .PA for Paris
    }
    if (upperSymbol.endsWith('.MI')) {
      return upperSymbol.replace('.MI', '.MI'); // Yahoo uses .MI for Milan
    }
    if (upperSymbol.endsWith('.DE')) {
      return upperSymbol.replace('.DE', '.DE'); // Yahoo uses .DE for Frankfurt
    }
    
    return upperSymbol;
  }

  private getBasicEuropeanFallback(symbol: string): QuoteData {
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: 0,
      changesPercentage: 0,
      change: 0,
      dayLow: 0,
      dayHigh: 0,
      open: 0,
      previousClose: 0,
      currency: this.getCurrencyFromSymbol(symbol),
      exchange: this.getExchangeFromSymbol(symbol),
      error: 'Prezzo in tempo reale non disponibile. Puoi aggiungere il prezzo manualmente.',
      provider: 'Fallback'
    };
  }

  private getCurrencyFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.endsWith('.L') || upperSymbol.endsWith('.LON')) return 'GBP';
    if (upperSymbol.endsWith('.PA') || upperSymbol.endsWith('.PAR')) return 'EUR';
    if (upperSymbol.endsWith('.MI') || upperSymbol.endsWith('.MIL')) return 'EUR';
    if (upperSymbol.endsWith('.DE') || upperSymbol.endsWith('.ETR')) return 'EUR';
    if (upperSymbol.endsWith('.AS') || upperSymbol.endsWith('.AMS')) return 'EUR';
    
    return 'USD';
  }

  private getExchangeFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.endsWith('.L')) return 'London Stock Exchange';
    if (upperSymbol.endsWith('.PA')) return 'Euronext Paris';
    if (upperSymbol.endsWith('.MI')) return 'Borsa Italiana';
    if (upperSymbol.endsWith('.DE')) return 'XETRA';
    if (upperSymbol.endsWith('.AS')) return 'Euronext Amsterdam';
    
    return 'NASDAQ';
  }
}

export const multiProviderService = new MultiProviderService();
export type { QuoteData };