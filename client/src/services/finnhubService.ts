interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubSymbolLookup {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface FormattedQuote {
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
}

interface FormattedSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
  type: string;
}

class FinnhubService {
  private baseUrl = 'https://finnhub.io/api/v1';
  private apiKey: string;

  constructor() {
    // In the client, we can't access process.env directly, so we'll proxy through the server
    this.apiKey = import.meta.env.VITE_FINNHUB_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    // Use server-side proxy instead of direct API calls
    const url = new URL(`/api/finnhub${endpoint}`, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Finnhub API request failed:', error);
      throw error;
    }
  }

  async searchSymbol(query: string): Promise<FormattedSearchResult[]> {
    try {
      const data = await this.makeRequest<FormattedSearchResult[]>('/search', { q: query });
      return data || [];
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  async searchByISIN(isin: string): Promise<FormattedSearchResult[]> {
    try {
      // Finnhub doesn't have direct ISIN search, but we can try to search by the ISIN code
      // This is a fallback method - in a real implementation you might need a specialized service
      const data = await this.makeRequest<FinnhubSymbolLookup>('/search', { q: isin });
      
      if (!data?.result) return [];

      return data.result
        .filter(item => item.symbol && item.description)
        .map((item): FormattedSearchResult => ({
          symbol: item.displaySymbol || item.symbol,
          name: item.description,
          currency: 'USD',
          stockExchange: '',
          exchangeShortName: '',
          type: item.type || 'Common Stock'
        }))
        .slice(0, 10);
    } catch (error) {
      console.error('ISIN search failed:', error);
      return [];
    }
  }

  async getQuote(symbol: string): Promise<FormattedQuote | null> {
    try {
      const quote = await this.makeRequest<FormattedQuote>(`/quote/${symbol.toUpperCase()}`, {});
      return quote;
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<FormattedQuote[]> {
    if (symbols.length === 0) return [];
    
    try {
      // Finnhub requires individual requests for quotes
      const promises = symbols.map(symbol => this.getQuote(symbol));
      const results = await Promise.all(promises);
      
      return results.filter((quote): quote is FormattedQuote => quote !== null);
    } catch (error) {
      console.error('Failed to get multiple quotes:', error);
      return [];
    }
  }

  async validateSymbol(symbol: string): Promise<{ valid: boolean; name?: string; exchange?: string }> {
    try {
      const validation = await this.makeRequest<{ valid: boolean; name?: string; exchange?: string }>(`/validate/${symbol.toUpperCase()}`, {});
      return validation;
    } catch (error) {
      console.error(`Symbol validation failed for ${symbol}:`, error);
      return { valid: false };
    }
  }

  async validateISIN(isin: string): Promise<{ valid: boolean; symbol?: string; name?: string; error?: string }> {
    try {
      const validation = await this.makeRequest<{ valid: boolean; symbol?: string; name?: string; error?: string }>(`/isin/${isin.toUpperCase()}`, {});
      return validation;
    } catch (error) {
      console.error(`ISIN validation failed for ${isin}:`, error);
      return { valid: false, error: 'Validation service error' };
    }
  }



  async isConfigured(): Promise<boolean> {
    try {
      const status = await this.makeRequest<{ configured: boolean }>('/status', {});
      return status.configured;
    } catch (error) {
      return false;
    }
  }

  isConfiguredSync(): boolean {
    // For sync calls, we'll assume it's configured if we can reach the server
    return true;
  }
}

export const finnhubService = new FinnhubService();
export type { FormattedQuote, FormattedSearchResult };