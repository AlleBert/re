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

class ServerFinnhubService {
  private baseUrl = 'https://finnhub.io/api/v1';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.apiKey);
    
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

  async searchSymbol(query: string) {
    try {
      const data = await this.makeRequest<FinnhubSymbolLookup>('/search', { q: query });
      
      if (!data?.result) return [];

      return data.result
        .filter(item => item.symbol && item.description)
        .map((item) => ({
          symbol: item.displaySymbol || item.symbol,
          name: item.description,
          currency: 'USD',
          stockExchange: '',
          exchangeShortName: '',
          type: item.type || 'Common Stock'
        }))
        .slice(0, 10);
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  async getQuote(symbol: string) {
    try {
      const [quote, profile] = await Promise.all([
        this.makeRequest<FinnhubQuote>('/quote', { symbol: symbol.toUpperCase() }),
        this.makeRequest<FinnhubCompanyProfile>('/stock/profile2', { symbol: symbol.toUpperCase() }).catch(() => null)
      ]);
      
      if (!quote || quote.c === undefined) return null;

      return {
        symbol: symbol.toUpperCase(),
        name: profile?.name || symbol,
        price: quote.c,
        changesPercentage: quote.dp || 0,
        change: quote.d || 0,
        dayLow: quote.l || 0,
        dayHigh: quote.h || 0,
        open: quote.o || 0,
        previousClose: quote.pc || 0,
        currency: profile?.currency || 'USD',
        exchange: profile?.exchange || '',
        marketCap: profile?.marketCapitalization || undefined
      };
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async validateSymbol(symbol: string) {
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

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const serverFinnhubService = new ServerFinnhubService();