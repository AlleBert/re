import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { finnhubService, FormattedSearchResult, FormattedQuote } from "@/services/finnhubService";

interface SecuritySearchResult {
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

interface InvestmentSearchProps {
  onSelect: (investment: SecuritySearchResult & { category: "stocks" | "etf" | "crypto" | "bonds" }) => void;
}

export function InvestmentSearch({ onSelect }: InvestmentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SecuritySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIsinValid, setIsIsinValid] = useState<boolean | null>(null);

  const searchInvestments = async (searchQuery: string): Promise<SecuritySearchResult[]> => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    setError(null);
    
    try {
      // Use Finnhub service to search symbols
      const finnhubResults = await finnhubService.searchSymbol(searchQuery);
      
      // Convert Finnhub results to expected format and get quotes for prices
      const securityResults: SecuritySearchResult[] = [];
      
      for (const result of finnhubResults.slice(0, 10)) {
        try {
          // Get current price for each symbol
          const quote = await finnhubService.getQuote(result.symbol);
          
          securityResults.push({
            symbol: result.symbol,
            name: result.name,
            exchange: result.exchangeShortName,
            currency: result.currency || 'USD',
            type: determineSecurityType(result.exchangeShortName, result.symbol),
            currentPrice: quote?.price,
            change: quote?.change,
            changePercent: quote?.changesPercentage
          });
        } catch (quoteError) {
          // If quote fails, still add the basic info
          securityResults.push({
            symbol: result.symbol,
            name: result.name,
            exchange: result.exchangeShortName,
            currency: result.currency || 'USD',
            type: determineSecurityType(result.exchangeShortName, result.symbol),
          });
        }
      }
      
      return securityResults;
    } catch (error) {
      console.error("Search error:", error);
      setError("Errore durante la ricerca degli investimenti. Riprova più tardi.");
      return [];
    }
  };

  const determineSecurityType = (exchange: string, symbol: string): 'stock' | 'etf' | 'bond' | 'crypto' => {
    const exchangeUpper = exchange.toUpperCase();
    const symbolUpper = symbol.toUpperCase();
    
    // ETF detection
    if (symbolUpper.includes('ETF') || symbolUpper.endsWith('.L') || 
        symbolUpper.includes('SPY') || symbolUpper.includes('VOO') || 
        symbolUpper.includes('QQQ') || symbolUpper.includes('IWDA') || 
        symbolUpper.includes('VWCE')) {
      return 'etf';
    }
    
    // Bond detection
    if (exchangeUpper.includes('BOND') || symbolUpper.includes('BTP') || 
        symbolUpper.includes('TREASURY') || /^IT\d{10}$/.test(symbolUpper)) {
      return 'bond';
    }
    
    // Crypto detection  
    if (symbolUpper.includes('-EUR') || symbolUpper.includes('-USD') || 
        symbolUpper.includes('BTC') || symbolUpper.includes('ETH') ||
        exchangeUpper.includes('CRYPTO')) {
      return 'crypto';
    }
    
    return 'stock';
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        setIsIsinValid(null);
        return;
      }

      // Validate ISIN format if query looks like an ISIN
      if (query.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(query.toUpperCase())) {
        const isValid = validateISIN(query.toUpperCase());
        setIsIsinValid(isValid);
      } else {
        setIsIsinValid(null);
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
      stock: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      etf: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      crypto: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      bond: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    };
    return colorMap[category] || 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400';
  };

  const mapCategoryToSchema = (apiCategory: string): "stocks" | "etf" | "crypto" | "bonds" => {
    switch (apiCategory) {
      case 'stock': return 'stocks';
      case 'etf': return 'etf';
      case 'crypto': return 'crypto';
      case 'bond': return 'bonds';
      default: return 'stocks';
    }
  };

  const handleSelectInvestment = (investment: SecuritySearchResult) => {
    const mappedInvestment = {
      ...investment,
      category: mapCategoryToSchema(investment.type),
      market: investment.exchange,
      currentPrice: investment.currentPrice || 0,
    };
    onSelect(mappedInvestment);
  };

  const validateISIN = (isin: string): boolean => {
    if (!isin || isin.length !== 12) return false;
    
    // Basic ISIN format check: 2 letters + 10 alphanumeric
    const isinRegex = /^[A-Z]{2}[A-Z0-9]{10}$/;
    return isinRegex.test(isin);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Cerca per nome, simbolo o ISIN (es: AAPL, Apple, US0378331005)..."
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 animate-spin" />
          )}
          {isIsinValid !== null && query.length === 12 && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              {isIsinValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isIsinValid === false && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Formato ISIN non valido. Deve essere di 12 caratteri (2 lettere + 10 alfanumerici).
            </AlertDescription>
          </Alert>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {results.map((investment, index) => (
            <Card
              key={`${investment.symbol}_${investment.exchange}_${index}`}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => handleSelectInvestment(investment)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {investment.name}
                      </h3>
                      <Badge className={getCategoryColor(investment.type)}>
                        {investment.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <p><strong>Simbolo:</strong> {investment.symbol}</p>
                      {investment.isin && <p><strong>ISIN:</strong> {investment.isin}</p>}
                      <p><strong>Mercato:</strong> {investment.exchange}</p>
                      <p><strong>Valuta:</strong> {investment.currency}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {investment.currentPrice ? (
                      <>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {investment.currentPrice.toFixed(2)} {investment.currency}
                        </p>
                        {investment.changePercent && (
                          <p className={`text-sm ${investment.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {investment.changePercent >= 0 ? '+' : ''}{investment.changePercent.toFixed(2)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Prezzo non disponibile</p>
                    )}
                    <Button size="sm" className="mt-2">
                      Seleziona
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query.length >= 2 && !isSearching && results.length === 0 && !error && (
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nessun investimento trovato per "{query}"</p>
          <p className="text-sm mt-1">Prova con un simbolo, nome o ISIN diverso</p>
        </div>
      )}
    </div>
  );
}