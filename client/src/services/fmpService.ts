interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

interface FMPSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

class FMPService {
  private apiKey: string = '';
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private initialized: boolean = false;

  constructor() {
    this.initializeApiKey();
  }

  private async initializeApiKey() {
    try {
      // First try environment variables
      this.apiKey = import.meta.env.VITE_FMP_API_KEY || import.meta.env.FMP_API_KEY || '';
      
      // If not found, fetch from server config
      if (!this.apiKey) {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          this.apiKey = config.fmpApiKey || '';
        }
      }
      
      this.initialized = true;
      
      if (!this.apiKey) {
        console.warn('FMP API key not found. Real-time data features will be disabled.');
      }
    } catch (error) {
      console.error('Failed to initialize FMP API key:', error);
      this.initialized = true;
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    if (!this.initialized) {
      await this.initializeApiKey();
    }
    
    if (!this.apiKey) {
      throw new Error('FMP API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`FMP API error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      console.error('FMP API request failed:', error);
      throw error;
    }
  }

  async searchSymbol(query: string): Promise<FMPSearchResult[]> {
    try {
      const results = await this.makeRequest<FMPSearchResult[]>(`/search?query=${encodeURIComponent(query)}&limit=10`);
      return results || [];
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  async getQuote(symbol: string): Promise<FMPQuote | null> {
    try {
      const quotes = await this.makeRequest<FMPQuote[]>(`/quote/${symbol.toUpperCase()}`);
      return quotes?.[0] || null;
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<FMPQuote[]> {
    if (symbols.length === 0) return [];
    
    try {
      const symbolsStr = symbols.map(s => s.toUpperCase()).join(',');
      const quotes = await this.makeRequest<FMPQuote[]>(`/quote/${symbolsStr}`);
      return quotes || [];
    } catch (error) {
      console.error('Failed to get multiple quotes:', error);
      return [];
    }
  }

  async validateSymbol(symbol: string): Promise<{ valid: boolean; name?: string; exchange?: string }> {
    try {
      const quote = await this.getQuote(symbol);
      if (quote) {
        return {
          valid: true,
          name: quote.name,
          exchange: quote.exchange
        };
      }
      return { valid: false };
    } catch (error) {
      console.error(`Symbol validation failed for ${symbol}:`, error);
      return { valid: false };
    }
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    try {
      const profiles = await this.makeRequest<any[]>(`/profile/${symbol.toUpperCase()}`);
      return profiles?.[0] || null;
    } catch (error) {
      console.error(`Failed to get company profile for ${symbol}:`, error);
      return null;
    }
  }

  async isConfigured(): Promise<boolean> {
    if (!this.initialized) {
      await this.initializeApiKey();
    }
    return !!this.apiKey;
  }

  isConfiguredSync(): boolean {
    return !!this.apiKey;
  }
}

export const fmpService = new FMPService();
export type { FMPQuote, FMPSearchResult };
