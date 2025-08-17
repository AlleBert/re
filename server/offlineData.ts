// Offline data service for running without internet connection
export interface OfflineQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

// Simulated market data for offline mode
const offlineQuotes: Record<string, OfflineQuote> = {
  // Major US Stocks
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 185.64,
    change: 2.15,
    changePercent: 1.17,
    lastUpdate: new Date().toISOString()
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: -1.23,
    changePercent: -0.32,
    lastUpdate: new Date().toISOString()
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 138.21,
    change: 0.87,
    changePercent: 0.63,
    lastUpdate: new Date().toISOString()
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.42,
    change: -3.18,
    changePercent: -1.26,
    lastUpdate: new Date().toISOString()
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 151.94,
    change: 1.45,
    changePercent: 0.96,
    lastUpdate: new Date().toISOString()
  },
  META: {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 484.20,
    change: 4.67,
    changePercent: 0.97,
    lastUpdate: new Date().toISOString()
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.30,
    change: 12.45,
    changePercent: 1.44,
    lastUpdate: new Date().toISOString()
  },
  
  // European Stocks
  "ASML.AS": {
    symbol: "ASML.AS",
    name: "ASML Holding N.V.",
    price: 685.40,
    change: -8.20,
    changePercent: -1.18,
    lastUpdate: new Date().toISOString()
  },
  "SAP.DE": {
    symbol: "SAP.DE",
    name: "SAP SE",
    price: 178.95,
    change: 2.35,
    changePercent: 1.33,
    lastUpdate: new Date().toISOString()
  },
  "NESN.SW": {
    symbol: "NESN.SW",
    name: "Nestlé S.A.",
    price: 108.74,
    change: -0.86,
    changePercent: -0.78,
    lastUpdate: new Date().toISOString()
  },
  
  // Italian Stocks
  "ENI.MI": {
    symbol: "ENI.MI",
    name: "Eni S.p.A.",
    price: 14.25,
    change: 0.15,
    changePercent: 1.06,
    lastUpdate: new Date().toISOString()
  },
  "ENEL.MI": {
    symbol: "ENEL.MI",
    name: "Enel S.p.A.",
    price: 6.84,
    change: -0.12,
    changePercent: -1.72,
    lastUpdate: new Date().toISOString()
  },
  "ISP.MI": {
    symbol: "ISP.MI",
    name: "Intesa Sanpaolo S.p.A.",
    price: 3.45,
    change: 0.02,
    changePercent: 0.58,
    lastUpdate: new Date().toISOString()
  },
  "UCG.MI": {
    symbol: "UCG.MI",
    name: "UniCredit S.p.A.",
    price: 35.82,
    change: 0.48,
    changePercent: 1.36,
    lastUpdate: new Date().toISOString()
  },
  
  // Cryptocurrencies
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    price: 58429.50,
    change: 1247.30,
    changePercent: 2.18,
    lastUpdate: new Date().toISOString()
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    price: 3142.85,
    change: -87.45,
    changePercent: -2.70,
    lastUpdate: new Date().toISOString()
  },
  
  // ETFs
  "SPY": {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    price: 512.43,
    change: 1.87,
    changePercent: 0.37,
    lastUpdate: new Date().toISOString()
  },
  "QQQ": {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    price: 423.76,
    change: 2.94,
    changePercent: 0.70,
    lastUpdate: new Date().toISOString()
  },
  "VTI": {
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    price: 245.89,
    change: 0.95,
    changePercent: 0.39,
    lastUpdate: new Date().toISOString()
  }
};

// Simulate some market movement for realism
function simulateMarketMovement(quote: OfflineQuote): OfflineQuote {
  // Generate small random price movements (±2%)
  const randomChange = (Math.random() - 0.5) * 0.04; // -2% to +2%
  const newPrice = quote.price * (1 + randomChange);
  const change = newPrice - quote.price;
  const changePercent = (change / quote.price) * 100;
  
  return {
    ...quote,
    price: Math.round(newPrice * 100) / 100, // Round to 2 decimals
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    lastUpdate: new Date().toISOString()
  };
}

// Search symbols offline
export function searchSymbolOffline(query: string): { symbol: string; description: string; type: string }[] {
  const results: { symbol: string; description: string; type: string }[] = [];
  
  const searchTerm = query.toUpperCase();
  
  for (const [symbol, quote] of Object.entries(offlineQuotes)) {
    if (symbol.includes(searchTerm) || quote.name.toUpperCase().includes(searchTerm)) {
      let type = "Common Stock";
      if (symbol.includes("ETF") || ["SPY", "QQQ", "VTI"].includes(symbol)) {
        type = "ETF";
      } else if (["BTC", "ETH"].includes(symbol)) {
        type = "Cryptocurrency";
      }
      
      results.push({
        symbol,
        description: quote.name,
        type
      });
    }
  }
  
  return results.slice(0, 10); // Limit to 10 results
}

// Get quote offline
export function getQuoteOffline(symbol: string): OfflineQuote | null {
  const quote = offlineQuotes[symbol.toUpperCase()];
  if (!quote) {
    return null;
  }
  
  // Simulate market movement for realism
  return simulateMarketMovement(quote);
}

// Check if we're in offline mode
export async function isOnline(): Promise<boolean> {
  try {
    // Try to make a quick request to a reliable service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch("https://api.finnhub.io/", { 
      signal: controller.signal,
      method: 'HEAD' // Just check if we can reach the server
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 401; // 401 means we reached the server but no API key
  } catch (error) {
    console.log("Offline mode detected:", error instanceof Error ? error.message : "Network unavailable");
    return false;
  }
}

export const offlineDataService = {
  searchSymbolOffline,
  getQuoteOffline,
  isOnline
};