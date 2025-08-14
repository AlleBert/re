import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvestmentSearchResult {
  name: string;
  symbol: string;
  isin: string;
  market: string;
  category: "stocks" | "etf" | "crypto" | "bonds";
  currentPrice: number;
  currency: string;
}

interface InvestmentSearchProps {
  onSelect: (investment: InvestmentSearchResult) => void;
}

export function InvestmentSearch({ onSelect }: InvestmentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvestmentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock search function - in real implementation, this would call Fineco API
  const searchInvestments = async (searchQuery: string): Promise<InvestmentSearchResult[]> => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data representing Fineco available investments
    const mockData: InvestmentSearchResult[] = [
      {
        name: "Apple Inc.",
        symbol: "AAPL",
        isin: "US0378331005",
        market: "NASDAQ",
        category: "stocks",
        currentPrice: 182.30,
        currency: "USD"
      },
      {
        name: "Tesla Inc.",
        symbol: "TSLA", 
        isin: "US88160R1014",
        market: "NASDAQ",
        category: "stocks",
        currentPrice: 245.50,
        currency: "USD"
      },
      {
        name: "Microsoft Corporation",
        symbol: "MSFT",
        isin: "US5949181045", 
        market: "NASDAQ",
        category: "stocks",
        currentPrice: 378.85,
        currency: "USD"
      },
      {
        name: "Vanguard S&P 500 ETF",
        symbol: "VOO",
        isin: "US9229087690",
        market: "NYSE",
        category: "etf",
        currentPrice: 452.12,
        currency: "USD"
      },
      {
        name: "iShares Core MSCI World ETF",
        symbol: "IWDA",
        isin: "IE00B4L5Y983",
        market: "LSE",
        category: "etf", 
        currentPrice: 78.45,
        currency: "EUR"
      },
      {
        name: "Bitcoin",
        symbol: "BTC-EUR",
        isin: "CRYPTO001",
        market: "CRYPTO",
        category: "crypto",
        currentPrice: 42500.00,
        currency: "EUR"
      },
      {
        name: "Ethereum",
        symbol: "ETH-EUR", 
        isin: "CRYPTO002",
        market: "CRYPTO",
        category: "crypto",
        currentPrice: 2650.00,
        currency: "EUR"
      },
      {
        name: "BTP Italia 2025",
        symbol: "IT0005083057",
        isin: "IT0005083057",
        market: "MTS",
        category: "bonds",
        currentPrice: 102.45,
        currency: "EUR"
      }
    ];

    return mockData.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.isin.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await searchInvestments(query);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      stocks: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      etf: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      crypto: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      bonds: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    };
    return colorMap[category] || 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Search investments by name, symbol, or ISIN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {results.map((investment) => (
            <Card
              key={investment.isin}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => onSelect(investment)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {investment.name}
                      </h3>
                      <Badge className={getCategoryColor(investment.category)}>
                        {investment.category.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <p><strong>Symbol:</strong> {investment.symbol}</p>
                      <p><strong>ISIN:</strong> {investment.isin}</p>
                      <p><strong>Market:</strong> {investment.market}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {investment.currentPrice.toFixed(2)} {investment.currency}
                    </p>
                    <Button size="sm" className="mt-2">
                      Select
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          No investments found for "{query}"
        </div>
      )}
    </div>
  );
}