import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvestmentSchema, type InsertInvestment, type Investment } from "@shared/schema";
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
import { yahooFinanceService } from "@/services/yahooFinanceService";

interface InvestmentFormProps {
  open: boolean;
  editingInvestment?: Investment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvestmentForm({ open, editingInvestment, onClose, onSuccess }: InvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<"quantity" | "total">("quantity");
  const [symbolValidation, setSymbolValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message?: string;
    data?: any;
  }>({ status: 'idle' });
  const [nameSearch, setNameSearch] = useState<{
    query: string;
    results: any[];
    isSearching: boolean;
  }>({ query: '', results: [], isSearching: false });
  const [symbolSearch, setSymbolSearch] = useState<{
    query: string;
    results: any[];
    isSearching: boolean;
  }>({ query: '', results: [], isSearching: false });

  const form = useForm<InsertInvestment & { totalAmount?: number }>({
    resolver: zodResolver(insertInvestmentSchema.extend({
      totalAmount: insertInvestmentSchema.shape.quantity.optional()
    })),
    defaultValues: editingInvestment ? {
      name: editingInvestment.name,
      symbol: editingInvestment.symbol,
      category: editingInvestment.category,
      quantity: editingInvestment.quantity,
      avgPrice: editingInvestment.avgPrice,
      currentPrice: editingInvestment.currentPrice,
      totalAmount: undefined,
      purchaseDate: editingInvestment.purchaseDate,
      aliShare: editingInvestment.aliShare,
    } : {
      name: "",
      symbol: "",
      category: "stocks",
      quantity: undefined,
      avgPrice: undefined,
      currentPrice: undefined,
      totalAmount: undefined,
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
        // Set the current price as avgPrice (user can modify if needed)
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

  // Search by company name
  const searchByName = async (query: string) => {
    if (!query || query.length < 3) {
      setNameSearch(prev => ({ ...prev, results: [], isSearching: false }));
      return;
    }

    setNameSearch(prev => ({ ...prev, isSearching: true }));
    
    try {
      const results = await realTimePriceService.searchSymbols(query);
      setNameSearch(prev => ({ 
        ...prev, 
        results: results.slice(0, 8), 
        isSearching: false 
      }));
    } catch (error) {
      setNameSearch(prev => ({ ...prev, results: [], isSearching: false }));
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
      if (name === 'symbol' && value.symbol && typeof value.symbol === 'string') {
        const timer = setTimeout(() => {
          validateSymbol(value.symbol!);
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const onSubmit = async (data: InsertInvestment & { totalAmount?: number }) => {
    setIsSubmitting(true);
    try {
      // Validate symbol before submitting if validation failed
      if (!editingInvestment && symbolValidation.status === 'invalid') {
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

      // Set current price to average price initially
      finalData.currentPrice = finalData.avgPrice;
      
      if (editingInvestment) {
        // Update existing investment
        LocalStorageService.updateInvestment(editingInvestment.id, finalData);
      } else {
        // Add new investment
        LocalStorageService.addInvestment(finalData);
      }
      form.reset();
      setSymbolValidation({ status: 'idle' });
      setSymbolSearch({ query: '', results: [], isSearching: false });
      setNameSearch({ query: '', results: [], isSearching: false });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding investment:", error);
      alert(error instanceof Error ? error.message : "Errore nell'aggiungere l'investimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectFromNameSearch = (selectedAsset: any) => {
    form.setValue('name', selectedAsset.name);
    form.setValue('symbol', selectedAsset.symbol);
    setNameSearch({ query: '', results: [], isSearching: false });
    validateSymbol(selectedAsset.symbol);
  };

  const selectSymbol = (selectedSymbol: any) => {
    form.setValue('symbol', selectedSymbol.symbol);
    form.setValue('name', selectedSymbol.name);
    setSymbolSearch({ query: '', results: [], isSearching: false });
    validateSymbol(selectedSymbol.symbol);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="investment-form-description">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {editingInvestment ? 'Modifica Investimento' : 'Aggiungi Nuovo Investimento'}
          </DialogTitle>
          <p id="investment-form-description" className="text-sm text-slate-600 dark:text-slate-400">
            {editingInvestment ? 'Modifica i dati dell\'investimento esistente' : 'Cerca e seleziona un asset per aggiungere un nuovo investimento al portfolio'}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Nome Asset</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Cerca azienda: es. Apple, Microsoft, Tesla..." 
                        {...field}
                        className="pr-10"
                        onChange={(e) => {
                          field.onChange(e);
                          const query = e.target.value;
                          setNameSearch(prev => ({ ...prev, query }));
                          if (query.length > 2) {
                            searchByName(query);
                          } else {
                            setNameSearch(prev => ({ ...prev, results: [] }));
                          }
                        }}
                      />
                      {nameSearch.isSearching ? (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                      )}
                      
                      {/* Name search results */}
                      {nameSearch.results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                          {nameSearch.results.map((result, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                              onClick={() => selectFromNameSearch(result)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {result.name}
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                                      {result.symbol}
                                    </span>
                                    <span>{result.exchangeShortName}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {result.price ? `€${result.price.toFixed(2)}` : ''}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {result.currency || 'USD'}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  <FormLabel className="text-base font-medium">Simbolo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="es. AAPL, MSFT, TSLA..." 
                        {...field}
                        className="pr-10 font-mono"
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          field.onChange(value);
                          const query = value;
                          setSymbolSearch(prev => ({ ...prev, query }));
                          if (query.length > 1) {
                            searchSymbols(query);
                          } else {
                            setSymbolSearch(prev => ({ ...prev, results: [] }));
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
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {symbolSearch.results.map((result, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                              onClick={() => selectSymbol(result)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white font-mono">
                                    {result.symbol}
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                    {result.name}
                                  </div>
                                  <div className="text-xs text-slate-400 dark:text-slate-500">
                                    {result.exchangeShortName}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {result.price ? `€${result.price.toFixed(2)}` : ''}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {symbolValidation.message && (
                    <div className={`text-sm mt-2 p-2 rounded-md ${
                      symbolValidation.status === 'valid' 
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
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
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <Label className="text-base font-medium">Modalità Inserimento</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={inputMode === "quantity" ? "default" : "outline"}
                  size="default"
                  onClick={() => setInputMode("quantity")}
                  className="h-12 text-sm"
                >
                  <div className="text-center">
                    <div className="font-medium">Quantità + Prezzo</div>
                    <div className="text-xs opacity-70">Inserisci numero azioni e prezzo</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "total" ? "default" : "outline"}
                  size="default"
                  onClick={() => setInputMode("total")}
                  className="h-12 text-sm"
                >
                  <div className="text-center">
                    <div className="font-medium">Totale Acquistato</div>
                    <div className="text-xs opacity-70">Inserisci importo totale speso</div>
                  </div>
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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
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

            <div className="grid grid-cols-2 gap-4">
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
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11">
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Aggiungendo...</span>
                  </div>
                ) : (
                  editingInvestment ? "Salva Modifiche" : "Aggiungi Investimento"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
