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
      // Search across multiple exchanges to include stocks, ETFs, and crypto
      const promises = [
        // US markets (stocks, ETFs)
        this.makeRequest<FinnhubSymbolLookup>('/search', { q: query }),
        // Crypto search
        this.searchCrypto(query)
      ];

      const [stockResults, cryptoResults] = await Promise.allSettled(promises);
      
      let allResults: any[] = [];

      // Add stock/ETF results
      if (stockResults.status === 'fulfilled' && stockResults.value?.result) {
        const filtered = stockResults.value.result
          .filter((item: any) => item.symbol && item.description)
          .map((item: any) => ({
            symbol: item.displaySymbol || item.symbol,
            name: item.description,
            currency: 'USD',
            stockExchange: '',
            exchangeShortName: '',
            type: this.categorizeSymbol(item.symbol, item.description)
          }));
        allResults.push(...filtered);
      }

      // Add crypto results
      if (cryptoResults.status === 'fulfilled' && Array.isArray(cryptoResults.value)) {
        allResults.push(...cryptoResults.value);
      }

      // Remove duplicates and limit results
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.symbol === item.symbol)
      );

      return uniqueResults.slice(0, 15);
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  private async searchCrypto(query: string) {
    try {
      // Get crypto symbols - Finnhub provides crypto data
      const cryptoData = await this.makeRequest<any>('/crypto/symbol', { exchange: 'binance' });
      
      if (!Array.isArray(cryptoData)) return [];

      // Filter crypto symbols that match the query
      const matches = cryptoData
        .filter((crypto: any) => 
          crypto.symbol?.toLowerCase().includes(query.toLowerCase()) ||
          crypto.description?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
        .map((crypto: any) => ({
          symbol: crypto.symbol,
          name: crypto.description || crypto.symbol,
          currency: 'USD',
          stockExchange: 'Binance',
          exchangeShortName: 'BINANCE',
          type: 'Crypto'
        }));

      return matches;
    } catch (error) {
      console.error('Crypto search failed:', error);
      return [];
    }
  }

  private categorizeSymbol(symbol: string, description: string): string {
    const symbolUpper = symbol.toUpperCase();
    const descUpper = description.toUpperCase();
    
    // ETF detection
    if (descUpper.includes('ETF') || descUpper.includes('FUND') || 
        descUpper.includes('INDEX') || symbolUpper.includes('ETF')) {
      return 'ETF';
    }
    
    // Check if it's a crypto symbol pattern
    if (symbolUpper.includes('USD') || symbolUpper.includes('BTC') || 
        symbolUpper.includes('ETH') || symbolUpper.endsWith('USDT')) {
      return 'Crypto';
    }
    
    return 'Common Stock';
  }

  async lookupByISIN(isin: string) {
    try {
      // Basic ISIN format validation
      if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
        return { valid: false, error: 'Invalid ISIN format' };
      }

      // For now, we'll search using the ISIN as a query to see if we can find matching securities
      // In a real implementation, you'd need a service that provides ISIN-to-symbol mapping
      const searchResults = await this.searchSymbol(isin);
      
      if (searchResults.length > 0) {
        const match = searchResults[0];
        return {
          valid: true,
          symbol: match.symbol,
          name: match.name,
          currency: match.currency,
          exchange: match.stockExchange
        };
      }

      return { valid: false, error: 'ISIN not found in available databases' };
    } catch (error) {
      console.error('ISIN lookup failed:', error);
      return { valid: false, error: 'ISIN lookup service error' };
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