import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvestmentSchema, type InsertInvestment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle, Search } from "lucide-react";
import { LocalStorageService } from "@/lib/storage";
import { realTimePriceService } from "@/services/realTimePriceService";
import { fmpService } from "@/services/fmpService";

interface InvestmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvestmentForm({ open, onClose, onSuccess }: InvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<"quantity" | "total">("quantity");
  const [symbolValidation, setSymbolValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message?: string;
    data?: any;
  }>({ status: 'idle' });
  const [symbolSearch, setSymbolSearch] = useState<{
    query: string;
    results: any[];
    isSearching: boolean;
  }>({ query: '', results: [], isSearching: false });

  const form = useForm<InsertInvestment & { totalAmount?: number }>({
    resolver: zodResolver(insertInvestmentSchema.extend({
      totalAmount: insertInvestmentSchema.shape.quantity.optional()
    })),
    defaultValues: {
      name: "",
      symbol: "",
      category: "stocks",
      quantity: 0,
      avgPrice: 0,
      currentPrice: 0,
      totalAmount: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      aliShare: 25,
    },
  });

  // Validate symbol with FMP API
  const validateSymbol = async (symbol: string) => {
    if (!symbol || symbol.length < 1) {
      setSymbolValidation({ status: 'idle' });
      return;
    }

    setSymbolValidation({ status: 'validating' });
    
    try {
      const result = await realTimePriceService.validateAndGetPrice(symbol);
      
      if (result.valid && result.price && result.name) {
        setSymbolValidation({
          status: 'valid',
          message: `${result.name} - Current price: €${result.price.toFixed(2)}`,
          data: result
        });
        
        // Auto-fill form fields if validation is successful
        form.setValue('name', result.name);
        form.setValue('currentPrice', result.price);
        if (!form.getValues('avgPrice')) {
          form.setValue('avgPrice', result.price);
        }
      } else {
        setSymbolValidation({
          status: 'invalid',
          message: result.error || 'Symbol not found'
        });
      }
    } catch (error) {
      setSymbolValidation({
        status: 'invalid',
        message: 'Validation failed'
      });
    }
  };

  // Search symbols
  const searchSymbols = async (query: string) => {
    if (!query || query.length < 2) {
      setSymbolSearch(prev => ({ ...prev, results: [], isSearching: false }));
      return;
    }

    setSymbolSearch(prev => ({ ...prev, isSearching: true }));
    
    try {
      const results = await realTimePriceService.searchSymbols(query);
      setSymbolSearch(prev => ({ 
        ...prev, 
        results: results.slice(0, 5), 
        isSearching: false 
      }));
    } catch (error) {
      setSymbolSearch(prev => ({ ...prev, results: [], isSearching: false }));
    }
  };

  // Debounced symbol validation
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'symbol' && value.symbol) {
        const timer = setTimeout(() => {
          validateSymbol(value.symbol);
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: InsertInvestment & { totalAmount?: number }) => {
    setIsSubmitting(true);
    try {
      // Validate symbol before submitting if FMP is available - use sync version for better UX
      if (fmpService.isConfiguredSync() && symbolValidation.status === 'invalid') {
        throw new Error('Per favore usa un simbolo valido');
      }

      // Calculate quantity and price based on input mode
      let finalData: InsertInvestment = { ...data };
      delete (finalData as any).totalAmount;

      if (inputMode === "total" && data.totalAmount && data.avgPrice) {
        finalData.quantity = data.totalAmount / data.avgPrice;
      } else if (inputMode === "quantity" && data.quantity && data.avgPrice) {
        // Already set correctly
      }

      // Set current price to average price if not provided
      if (!finalData.currentPrice) {
        finalData.currentPrice = finalData.avgPrice;
      }
      
      LocalStorageService.addInvestment(finalData);
      form.reset();
      setSymbolValidation({ status: 'idle' });
      setSymbolSearch({ query: '', results: [], isSearching: false });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding investment:", error);
      alert(error instanceof Error ? error.message : "Errore nell'aggiungere l'investimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectSymbol = (selectedSymbol: any) => {
    form.setValue('symbol', selectedSymbol.symbol);
    form.setValue('name', selectedSymbol.name);
    setSymbolSearch({ query: '', results: [], isSearching: false });
    validateSymbol(selectedSymbol.symbol);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="investment-form-description">
        <DialogHeader>
          <DialogTitle>Aggiungi Nuovo Investimento</DialogTitle>
          <p id="investment-form-description" className="text-sm text-slate-600 dark:text-slate-400">
            Compila i dettagli del nuovo investimento da aggiungere al portfolio
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Asset</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Apple Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="e.g., AAPL" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const query = e.target.value;
                          setSymbolSearch(prev => ({ ...prev, query }));
                          if (query.length > 1) {
                            searchSymbols(query);
                          }
                        }}
                      />
                      {symbolValidation.status === 'validating' && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                      )}
                      {symbolValidation.status === 'valid' && (
                        <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                      )}
                      {symbolValidation.status === 'invalid' && (
                        <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                      )}
                      
                      {/* Symbol search results */}
                      {symbolSearch.results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {symbolSearch.results.map((result, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                              onClick={() => selectSymbol(result)}
                            >
                              <div className="font-medium text-slate-900 dark:text-white">
                                {result.symbol}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                {result.name}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">
                                {result.exchangeShortName}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {symbolValidation.message && (
                    <div className={`text-sm mt-1 ${
                      symbolValidation.status === 'valid' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {symbolValidation.message}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stocks">Azioni</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="bonds">Obbligazioni</SelectItem>
                      <SelectItem value="commodities">Materie Prime</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Input Mode Selection */}
            <div className="space-y-3">
              <Label>Modalità Inserimento</Label>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant={inputMode === "quantity" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("quantity")}
                >
                  Quantità + Prezzo
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "total" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("total")}
                >
                  Totale Acquistato
                </Button>
              </div>
            </div>

            {/* Dynamic Fields Based on Input Mode */}
            {inputMode === "quantity" ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001" 
                          placeholder="25"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avgPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="175.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Totale Acquistato (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="4387.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avgPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="175.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="currentPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo Corrente (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Lascia vuoto per usare il prezzo di acquisto"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Acquisto</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aliShare"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quota Ali (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 25)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Aggiungendo..." : "Aggiungi Investimento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
