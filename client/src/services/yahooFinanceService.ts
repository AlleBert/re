interface YahooQuote {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayLow: number;
  regularMarketDayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  marketCap: number;
  regularMarketVolume: number;
  averageVolume: number;
  exchange: string;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  trailingPE: number;
  currency: string;
}

interface YahooSearchResult {
  symbol: string;
  shortname: string;
  longname: string;
  exchDisp: string;
  typeDisp: string;
}

interface FormattedQuote {
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
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  pe: number;
  currency: string;
}

interface FormattedSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com/v1';
  private corsProxy = 'https://api.allorigins.win/raw?url=';

  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await fetch(`${this.corsProxy}${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Yahoo Finance API request failed:', error);
      throw error;
    }
  }

  async searchSymbol(query: string): Promise<FormattedSearchResult[]> {
    try {
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
      const data = await this.makeRequest<any>(searchUrl);
      
      if (!data?.quotes) return [];

      return data.quotes
        .filter((quote: any) => quote.isYahooFinance && quote.symbol)
        .map((quote: any): FormattedSearchResult => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          currency: quote.currency || 'USD',
          stockExchange: quote.exchDisp || quote.exchange || '',
          exchangeShortName: quote.exchDisp || quote.exchange || ''
        }))
        .slice(0, 10);
    } catch (error) {
      console.error('Symbol search failed:', error);
      return [];
    }
  }

  async getQuote(symbol: string): Promise<FormattedQuote | null> {
    try {
      const quoteUrl = `${this.baseUrl}/finance/quote?symbols=${symbol.toUpperCase()}`;
      const data = await this.makeRequest<any>(quoteUrl);
      
      if (!data?.quoteResponse?.result?.[0]) return null;

      const quote: YahooQuote = data.quoteResponse.result[0];
      return this.formatQuote(quote);
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<FormattedQuote[]> {
    if (symbols.length === 0) return [];
    
    try {
      const symbolsStr = symbols.map(s => s.toUpperCase()).join(',');
      const quoteUrl = `${this.baseUrl}/finance/quote?symbols=${symbolsStr}`;
      const data = await this.makeRequest<any>(quoteUrl);
      
      if (!data?.quoteResponse?.result) return [];

      return data.quoteResponse.result
        .map((quote: YahooQuote) => this.formatQuote(quote))
        .filter((quote: FormattedQuote | null): quote is FormattedQuote => quote !== null);
    } catch (error) {
      console.error('Failed to get multiple quotes:', error);
      return [];
    }
  }

  private formatQuote(quote: YahooQuote): FormattedQuote {
    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      price: quote.regularMarketPrice || 0,
      changesPercentage: (quote.regularMarketChangePercent || 0) * 100,
      change: quote.regularMarketChange || 0,
      dayLow: quote.regularMarketDayLow || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      yearHigh: quote.fiftyTwoWeekHigh || 0,
      yearLow: quote.fiftyTwoWeekLow || 0,
      marketCap: quote.marketCap || 0,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageVolume || 0,
      exchange: quote.exchange || '',
      open: quote.regularMarketOpen || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      pe: quote.trailingPE || 0,
      currency: quote.currency || 'USD'
    };
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

  // Always returns true since no API key is required
  async isConfigured(): Promise<boolean> {
    return true;
  }

  isConfiguredSync(): boolean {
    return true;
  }
}

export const yahooFinanceService = new YahooFinanceService();
export type { FormattedQuote, FormattedSearchResult };