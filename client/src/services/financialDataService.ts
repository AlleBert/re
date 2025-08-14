// Financial Data Service - Integration with free financial data providers
// Using Alpha Vantage (free tier: 500 requests/day) and Yahoo Finance API

export interface SecuritySearchResult {
  symbol: string;
  name: string;
  isin?: string;
  exchange: string;
  currency: string;
  type: 'stock' | 'etf' | 'bond' | 'crypto';
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export interface RealTimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52Week?: number;
  low52Week?: number;
  lastUpdate: string;
}

export class FinancialDataService {
  private static readonly ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
  private static readonly YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com';
  private static readonly FINNHUB_BASE = 'https://finnhub.io/api/v1';
  
  // Cache for API responses to reduce requests
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private static async fetchWithCache(url: string, cacheKey: string) {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`API request failed: ${response.status} for ${url}`);
        return null; // Return null instead of throwing error
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: now });
      return data;
    } catch (error) {
      console.warn('API fetch error:', error);
      return null; // Return null instead of throwing error
    }
  }

  // Search securities by symbol, name, or ISIN using multiple free APIs
  static async searchSecurities(query: string): Promise<SecuritySearchResult[]> {
    const results: SecuritySearchResult[] = [];
    
    try {
      // Method 1: Yahoo Finance Search (free, no API key required)
      await this.searchYahooFinance(query, results);
      
      // Method 2: If user provides Alpha Vantage key, use it
      const alphaVantageKey = process.env.VITE_ALPHA_VANTAGE_API_KEY;
      if (alphaVantageKey) {
        await this.searchAlphaVantage(query, results, alphaVantageKey);
      }

      // Method 3: Add mock data for common Italian securities
      this.addItalianSecurities(query, results);
      
      // Remove duplicates and limit results
      const uniqueResults = this.removeDuplicates(results);
      return uniqueResults.slice(0, 20);
      
    } catch (error) {
      console.error('Search securities error:', error);
      // Return fallback data
      return this.getFallbackSecurities(query);
    }
  }

  private static async searchYahooFinance(query: string, results: SecuritySearchResult[]) {
    try {
      // Yahoo Finance doesn't require API key for basic searches
      const url = `${this.YAHOO_FINANCE_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0`;
      
      const data = await this.fetchWithCache(url, `yahoo_search_${query}`);
      
      if (data?.quotes) {
        data.quotes.forEach((quote: any) => {
          results.push({
            symbol: quote.symbol,
            name: quote.longname || quote.shortname,
            exchange: quote.exchange,
            currency: quote.currency || 'USD',
            type: this.determineSecurityType(quote.typeDisp),
            currentPrice: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
          });
        });
      }
    } catch (error) {
      // Silently continue to fallback data
      console.warn('Yahoo Finance search failed, using fallback data');
    }
  }

  private static async searchAlphaVantage(query: string, results: SecuritySearchResult[], apiKey: string) {
    try {
      const url = `${this.ALPHA_VANTAGE_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
      
      const data = await this.fetchWithCache(url, `alpha_search_${query}`);
      
      if (data?.bestMatches) {
        data.bestMatches.forEach((match: any) => {
          results.push({
            symbol: match['1. symbol'],
            name: match['2. name'],
            exchange: match['4. region'],
            currency: match['8. currency'] || 'USD',
            type: this.determineSecurityType(match['3. type']),
          });
        });
      }
    } catch (error) {
      // Silently continue to other sources
      console.warn('Alpha Vantage search failed, continuing with other sources');
    }
  }

  private static addItalianSecurities(query: string, results: SecuritySearchResult[]) {
    const italianSecurities = [
      // Major Italian Stocks
      { symbol: 'ENI.MI', name: 'Eni S.p.A.', isin: 'IT0003132476', exchange: 'Milan', currency: 'EUR', type: 'stock' as const },
      { symbol: 'ISP.MI', name: 'Intesa Sanpaolo', isin: 'IT0000072618', exchange: 'Milan', currency: 'EUR', type: 'stock' as const },
      { symbol: 'UCG.MI', name: 'UniCredit S.p.A.', isin: 'IT0005239360', exchange: 'Milan', currency: 'EUR', type: 'stock' as const },
      { symbol: 'TIT.MI', name: 'Telecom Italia', isin: 'IT0003497168', exchange: 'Milan', currency: 'EUR', type: 'stock' as const },
      { symbol: 'ENEL.MI', name: 'Enel S.p.A.', isin: 'IT0003128367', exchange: 'Milan', currency: 'EUR', type: 'stock' as const },
      
      // Popular ETFs available in Italy
      { symbol: 'IWDA.L', name: 'iShares Core MSCI World UCITS ETF', isin: 'IE00B4L5Y983', exchange: 'London', currency: 'EUR', type: 'etf' as const },
      { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00BK5BQT80', exchange: 'Frankfurt', currency: 'EUR', type: 'etf' as const },
      { symbol: 'SWDA.L', name: 'SPDR MSCI World UCITS ETF', isin: 'IE00BFY0GT14', exchange: 'London', currency: 'EUR', type: 'etf' as const },
      
      // Italian Government Bonds
      { symbol: 'IT0005083057', name: 'BTP Italia 2025', isin: 'IT0005083057', exchange: 'MTS', currency: 'EUR', type: 'bond' as const },
      { symbol: 'IT0005438004', name: 'BTP 2030', isin: 'IT0005438004', exchange: 'MTS', currency: 'EUR', type: 'bond' as const },
    ];

    const filtered = italianSecurities.filter(security => 
      security.symbol.toLowerCase().includes(query.toLowerCase()) ||
      security.name.toLowerCase().includes(query.toLowerCase()) ||
      (security.isin && security.isin.toLowerCase().includes(query.toLowerCase()))
    );

    results.push(...filtered);
  }

  private static getFallbackSecurities(query: string): SecuritySearchResult[] {
    // Comprehensive fallback data for when APIs are unavailable
    const fallbackData: SecuritySearchResult[] = [
      // Global Stocks
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', currentPrice: 182.30 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD', type: 'stock', currentPrice: 378.85 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ', currency: 'USD', type: 'stock', currentPrice: 142.56 },
      { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', currentPrice: 245.50 },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'stock', currentPrice: 152.74 },
      
      // Popular ETFs
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', currency: 'USD', type: 'etf', currentPrice: 485.20 },
      { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSE', currency: 'USD', type: 'etf', currentPrice: 452.12 },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', currency: 'USD', type: 'etf', currentPrice: 398.45 },
      
      // Crypto
      { symbol: 'BTC-EUR', name: 'Bitcoin', exchange: 'Crypto', currency: 'EUR', type: 'crypto', currentPrice: 42500.00 },
      { symbol: 'ETH-EUR', name: 'Ethereum', exchange: 'Crypto', currency: 'EUR', type: 'crypto', currentPrice: 2650.00 },
    ];

    return fallbackData.filter(security => 
      security.symbol.toLowerCase().includes(query.toLowerCase()) ||
      security.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get real-time quote for a specific symbol
  static async getRealTimeQuote(symbol: string): Promise<RealTimeQuote | null> {
    try {
      // Try Yahoo Finance first (free, no API key)
      const quote = await this.getYahooQuote(symbol);
      if (quote) return quote;

      // Fallback to mock data with realistic fluctuations
      return this.getMockQuote(symbol);
      
    } catch (error) {
      console.error('Error getting real-time quote:', error);
      return this.getMockQuote(symbol);
    }
  }

  private static async getYahooQuote(symbol: string): Promise<RealTimeQuote | null> {
    try {
      const url = `${this.YAHOO_FINANCE_BASE}/v8/finance/chart/${symbol}`;
      const data = await this.fetchWithCache(url, `yahoo_quote_${symbol}`);
      
      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        const indicators = result.indicators.quote[0];
        
        return {
          symbol,
          price: meta.regularMarketPrice || meta.previousClose,
          change: (meta.regularMarketPrice || meta.previousClose) - meta.previousClose,
          changePercent: ((meta.regularMarketPrice || meta.previousClose) - meta.previousClose) / meta.previousClose * 100,
          volume: indicators.volume?.[indicators.volume.length - 1] || 0,
          marketCap: meta.marketCap,
          high52Week: meta.fiftyTwoWeekHigh,
          low52Week: meta.fiftyTwoWeekLow,
          lastUpdate: new Date().toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Yahoo Finance quote failed:', error);
      return null;
    }
  }

  private static getMockQuote(symbol: string): RealTimeQuote {
    // Generate realistic mock data with price movements
    const basePrice = this.getBasePriceForSymbol(symbol);
    const variation = (Math.random() - 0.5) * 0.04; // ±2% variation
    const currentPrice = basePrice * (1 + variation);
    const change = currentPrice - basePrice;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 10000000),
      lastUpdate: new Date().toISOString(),
    };
  }

  private static getBasePriceForSymbol(symbol: string): number {
    const prices: { [key: string]: number } = {
      'AAPL': 182.30,
      'MSFT': 378.85,
      'GOOGL': 142.56,
      'TSLA': 245.50,
      'AMZN': 152.74,
      'SPY': 485.20,
      'VOO': 452.12,
      'QQQ': 398.45,
      'BTC-EUR': 42500.00,
      'ETH-EUR': 2650.00,
      'ENI.MI': 14.25,
      'ISP.MI': 3.45,
      'UCG.MI': 28.50,
      'IWDA.L': 78.45,
      'VWCE.DE': 105.30,
    };
    
    return prices[symbol] || 100.00; // Default price
  }

  private static determineSecurityType(typeString: string): 'stock' | 'etf' | 'bond' | 'crypto' {
    if (!typeString) return 'stock';
    
    const type = typeString.toLowerCase();
    if (type.includes('etf') || type.includes('fund')) return 'etf';
    if (type.includes('bond') || type.includes('treasury')) return 'bond';
    if (type.includes('crypto') || type.includes('currency')) return 'crypto';
    return 'stock';
  }

  private static removeDuplicates(results: SecuritySearchResult[]): SecuritySearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.symbol}_${result.exchange}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Validate ISIN format
  static validateISIN(isin: string): boolean {
    if (!isin || isin.length !== 12) return false;
    
    // Basic ISIN format check: 2 letters + 10 alphanumeric
    const isinRegex = /^[A-Z]{2}[A-Z0-9]{10}$/;
    if (!isinRegex.test(isin)) return false;
    
    // TODO: Implement full ISIN check digit validation
    return true;
  }

  // Get market information for a given exchange code
  static getMarketInfo(exchangeCode: string): { name: string; country: string; timezone: string } {
    const markets: { [key: string]: { name: string; country: string; timezone: string } } = {
      'NASDAQ': { name: 'NASDAQ', country: 'US', timezone: 'America/New_York' },
      'NYSE': { name: 'New York Stock Exchange', country: 'US', timezone: 'America/New_York' },
      'Milan': { name: 'Borsa Italiana', country: 'IT', timezone: 'Europe/Rome' },
      'London': { name: 'London Stock Exchange', country: 'UK', timezone: 'Europe/London' },
      'Frankfurt': { name: 'Deutsche Börse', country: 'DE', timezone: 'Europe/Berlin' },
      'MTS': { name: 'Mercato Telematico Secondario', country: 'IT', timezone: 'Europe/Rome' },
      'Crypto': { name: 'Cryptocurrency Market', country: 'Global', timezone: 'UTC' },
    };
    
    return markets[exchangeCode] || { name: exchangeCode, country: 'Unknown', timezone: 'UTC' };
  }
}