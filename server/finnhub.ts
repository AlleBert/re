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
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private minRequestInterval = 100; // Minimum 100ms between requests

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      
      if (response.status === 429) {
        // Rate limited - wait and retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResponse = await fetch(url.toString());
        if (!retryResponse.ok) {
          throw new Error(`Finnhub API error: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        return await retryResponse.json();
      }
      
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
      // Search for stocks and ETFs
      const data = await this.makeRequest<FinnhubSymbolLookup>('/search', { q: query });
      
      if (!data?.result) return [];

      const results = data.result
        .filter((item: any) => item.symbol && item.description)
        .map((item: any) => {
          const type = this.categorizeSymbol(item.symbol, item.description);
          return {
            symbol: item.displaySymbol || item.symbol,
            name: item.description,
            currency: 'USD',
            stockExchange: item.exchange || '',
            exchangeShortName: item.exchange || '',
            type: type
          };
        })
        .slice(0, 15);

      // Sort to prioritize ETFs if the query looks like an ETF search
      const queryLower = query.toLowerCase();
      if (queryLower.includes('etf') || queryLower.includes('vanguard') || queryLower.includes('ishares')) {
        results.sort((a, b) => {
          if (a.type === 'ETF' && b.type !== 'ETF') return -1;
          if (a.type !== 'ETF' && b.type === 'ETF') return 1;
          return 0;
        });
      }

      return results;
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }



  private categorizeSymbol(symbol: string, description: string): string {
    const symbolUpper = symbol.toUpperCase();
    const descUpper = description.toUpperCase();
    
    // Enhanced ETF detection
    if (descUpper.includes('ETF') || 
        descUpper.includes('FUND') || 
        descUpper.includes('INDEX') || 
        descUpper.includes('EXCHANGE TRADED') ||
        descUpper.includes('VANGUARD') ||
        descUpper.includes('ISHARES') ||
        descUpper.includes('SPDR') ||
        descUpper.includes('XTRACKERS') ||
        descUpper.includes('AMUNDI') ||
        symbolUpper.includes('ETF') ||
        symbolUpper.startsWith('VWC') ||
        symbolUpper.startsWith('VWCE') ||
        symbolUpper.startsWith('SWDA') ||
        symbolUpper.startsWith('EUNL')) {
      return 'ETF';
    }
    
    // Check if it's a crypto symbol pattern
    if (symbolUpper.includes('-USD') || 
        symbolUpper.includes('BTC') || 
        symbolUpper.includes('ETH') || 
        symbolUpper.endsWith('USDT') ||
        symbolUpper.includes('CRYPTO')) {
      return 'Crypto';
    }
    
    return 'Stock';
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
      // Try multiple symbol formats for better compatibility
      const symbolVariants = this.getSymbolVariants(symbol);
      
      for (const variant of symbolVariants) {
        try {
          const quote = await this.makeRequest<FinnhubQuote>('/quote', { symbol: variant });
          
          if (quote && quote.c !== undefined && quote.c !== 0) {
            return {
              symbol: symbol.toUpperCase(),
              name: symbol.toUpperCase(),
              price: quote.c,
              changesPercentage: quote.dp || 0,
              change: quote.d || 0,
              dayLow: quote.l || 0,
              dayHigh: quote.h || 0,
              open: quote.o || 0,
              previousClose: quote.pc || 0,
              currency: this.getCurrencyFromSymbol(symbol),
              exchange: this.getExchangeFromSymbol(symbol),
              marketCap: undefined
            };
          }
        } catch (variantError) {
          // Continue to next variant if this one fails
          console.log(`Variant ${variant} failed, trying next...`);
          continue;
        }
      }
      
      // If all variants fail, return a helpful message instead of null
      console.log(`All symbol variants failed for ${symbol}. This might be due to API limitations on European markets.`);
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
        marketCap: undefined,
        error: 'Price data temporarily unavailable - this may be due to API limitations on European markets'
      };
      
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  private getSymbolVariants(symbol: string): string[] {
    const upperSymbol = symbol.toUpperCase();
    const variants = [upperSymbol];
    
    // For European symbols, try without exchange suffix
    if (upperSymbol.includes('.')) {
      const baseSymbol = upperSymbol.split('.')[0];
      variants.push(baseSymbol);
    }
    
    // For London Stock Exchange, try alternative formats
    if (upperSymbol.endsWith('.L')) {
      const baseSymbol = upperSymbol.replace('.L', '');
      variants.push(`${baseSymbol}.LON`);
      variants.push(`${baseSymbol}:LN`);
    }
    
    return variants;
  }

  private getCurrencyFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.endsWith('.L') || upperSymbol.endsWith('.LON')) return 'GBP';
    if (upperSymbol.endsWith('.PA') || upperSymbol.endsWith('.PAR')) return 'EUR';
    if (upperSymbol.endsWith('.MI') || upperSymbol.endsWith('.MIL')) return 'EUR';
    if (upperSymbol.endsWith('.DE') || upperSymbol.endsWith('.ETR')) return 'EUR';
    if (upperSymbol.endsWith('.AS') || upperSymbol.endsWith('.AMS')) return 'EUR';
    
    return 'USD'; // Default
  }

  private getExchangeFromSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.endsWith('.L')) return 'London Stock Exchange';
    if (upperSymbol.endsWith('.PA')) return 'Euronext Paris';
    if (upperSymbol.endsWith('.MI')) return 'Borsa Italiana';
    if (upperSymbol.endsWith('.DE')) return 'XETRA';
    if (upperSymbol.endsWith('.AS')) return 'Euronext Amsterdam';
    
    return 'NASDAQ'; // Default
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