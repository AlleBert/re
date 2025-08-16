import { useState, useEffect } from "react";
import { format } from "date-fns";
import { User, Edit, Trash2, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Sun, Moon, LogOut, ShoppingCart, Minus, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme-provider";
import { InvestmentForm } from "@/components/investment-form";
import { MinimalPortfolioChart } from "@/components/minimal-portfolio-chart";
import { RealTimeStatus } from "@/components/real-time-status";
import { LocalStorageService } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { realTimePriceService } from "@/services/realTimePriceService";
import { Investment, Transaction, PortfolioSummary } from "@shared/schema";
import { User as UserType } from "@/lib/types";

interface DashboardProps {
  user: UserType;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const { theme, setTheme } = useTheme();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("30days");
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [sellDialog, setSellDialog] = useState<{ open: boolean; investment: Investment | null }>({ open: false, investment: null });
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const queryClient = useQueryClient();

  // Fetch investments using React Query
  const { data: investmentsData = [], refetch: refetchInvestments } = useQuery({
    queryKey: ['/api/investments'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch transactions using React Query  
  const { data: transactionsData = [] } = useQuery({
    queryKey: ['/api/transactions'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update local state when API data changes
  useEffect(() => {
    setInvestments(investmentsData as Investment[]);
    setTransactions(transactionsData as Transaction[]);
    setPortfolio(LocalStorageService.calculatePortfolioSummary(investmentsData as Investment[]));
  }, [investmentsData, transactionsData]);

  useEffect(() => {
    // Start real-time price updates if user is admin
    if (user.isAdmin && investments.length > 0) {
      const handlePriceUpdates = (updates: any[]) => {
        // Trigger refetch of investments after price updates
        refetchInvestments();
        setLastPriceUpdate(Date.now());
      };

      const startUpdates = async () => {
        await realTimePriceService.startPriceUpdates(investments, handlePriceUpdates);
      };
      
      startUpdates();

      return () => {
        realTimePriceService.stopPriceUpdates(handlePriceUpdates);
      };
    }
  }, [user.isAdmin, investments.length, refetchInvestments]);



  const handleEditInvestment = (investment: Investment) => {
    if (!user.isAdmin) return;
    setEditingInvestment(investment);
    setShowInvestmentForm(true);
  };

  const handlePriceEdit = (investment: Investment) => {
    if (!user.isAdmin) return;
    setEditingPriceId(investment.id);
    setNewPrice(investment.currentPrice.toString());
  };

  const sellInvestmentMutation = useMutation({
    mutationFn: async ({ id, quantity, price }: { id: string; quantity: number; price: number }) => {
      const response = await apiRequest('POST', `/api/investments/${id}/sell`, { 
        quantity, 
        price, 
        user: user.name 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setSellDialog({ open: false, investment: null });
      setSellQuantity("");
      setSellPrice("");
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const response = await apiRequest('PUT', `/api/investments/${id}`, { currentPrice: price });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    }
  });

  const handlePriceUpdate = (investmentId: string) => {
    if (!user.isAdmin) return;
    
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;
    
    updatePriceMutation.mutate({ id: investmentId, price });
    setEditingPriceId(null);
    setNewPrice("");
  };

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/investments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    }
  });

  const handleDeleteInvestment = (investmentId: string) => {
    if (!user.isAdmin) return;
    
    if (confirm("Sei sicuro di voler eliminare questo investimento?")) {
      deleteInvestmentMutation.mutate(investmentId);
    }
  };

  const handleSellInvestment = () => {
    if (!sellDialog.investment || !sellQuantity || !sellPrice) return;
    
    const quantity = parseFloat(sellQuantity);
    const price = parseFloat(sellPrice);
    
    if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
      alert("Inserisci quantità e prezzo validi");
      return;
    }
    
    if (quantity > sellDialog.investment.quantity) {
      alert(`Non puoi vendere più di ${sellDialog.investment.quantity} unità possedute`);
      return;
    }
    
    sellInvestmentMutation.mutate({
      id: sellDialog.investment.id,
      quantity,
      price
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getGainLossColor = (value: number) => {
    return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      stocks: 'fas fa-chart-line',
      etf: 'fas fa-layer-group',
      crypto: 'fab fa-bitcoin',
      bonds: 'fas fa-certificate',
    };
    return iconMap[category] || 'fas fa-coins';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      stocks: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
      etf: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
      crypto: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
      bonds: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    };
    return colorMap[category] || 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400';
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (historyFilter !== 'all' && transaction.type !== historyFilter) return false;
    
    const transactionDate = new Date(transaction.timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (periodFilter) {
      case '30days':
        return daysDiff <= 30;
      case '3months':
        return daysDiff <= 90;
      case '1year':
        return daysDiff <= 365;
      default:
        return true;
    }
  });

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Investment Tracker
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                    PORTFOLIO MANAGER
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
              {user.isAdmin && (
                <RealTimeStatus 
                  lastUpdate={lastPriceUpdate}
                  onManualRefresh={async () => {
                    // Force immediate price update
                    if (investments.length > 0) {
                      refetchInvestments();
                      setLastPriceUpdate(Date.now());
                    }
                  }}
                />
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleTheme} 
                className="relative h-10 w-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                <span className="sr-only">Cambia tema</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onLogout}
                title="Logout"
                data-testid="button-logout"
                className="h-10 w-10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="investments">Investimenti</TabsTrigger>
            <TabsTrigger value="history">Storico</TabsTrigger>
          </TabsList>

          {/* Overview Section */}
          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Summary Cards */}
            {portfolio && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Portfolio Totale</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {formatCurrency(portfolio.totalValue)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Valore complessivo
                        </p>
                      </div>
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <TrendingUp className="text-white" size={22} strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 ${
                  portfolio.totalGainLoss >= 0 ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Guadagno/Perdita Totale</p>
                        <p className={`text-3xl font-bold ${getGainLossColor(portfolio.totalGainLoss)}`}>
                          {portfolio.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.totalGainLoss)}
                        </p>
                        <p className={`text-sm font-semibold ${getGainLossColor(portfolio.gainLossPercentage)}`}>
                          {formatPercentage(portfolio.gainLossPercentage)}
                        </p>
                      </div>
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                          portfolio.totalGainLoss >= 0 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-red-500 to-rose-600'
                        }`}>
                          {portfolio.totalGainLoss >= 0 ? (
                            <TrendingUp className="text-white" size={22} strokeWidth={2.5} />
                          ) : (
                            <TrendingDown className="text-white" size={22} strokeWidth={2.5} />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Quota Alle (75%)</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(portfolio.alleShare)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            portfolio.totalGainLoss >= 0 
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                          }`}>
                            {portfolio.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.alleShare * 0.75 * (portfolio.gainLossPercentage / 100))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <svg width="48" height="48" viewBox="0 0 48 48" className="transform hover:scale-110 transition-transform duration-200">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4"/>
                          <circle 
                            cx="24" 
                            cy="24" 
                            r="20" 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 20 * 0.75} ${2 * Math.PI * 20}`}
                            strokeDashoffset={`${-2 * Math.PI * 20 * 0.25}`}
                            className="rotate-[-90deg] origin-center"
                            strokeLinecap="round"
                          />
                          <text x="24" y="28" textAnchor="middle" className="text-xs font-bold fill-emerald-600 dark:fill-emerald-400">
                            75%
                          </text>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Quota Ali (25%)</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(portfolio.aliShare)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            portfolio.totalGainLoss >= 0 
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                          }`}>
                            {portfolio.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.aliShare * 0.25 * (portfolio.gainLossPercentage / 100))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <svg width="48" height="48" viewBox="0 0 48 48" className="transform hover:scale-110 transition-transform duration-200">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4"/>
                          <circle 
                            cx="24" 
                            cy="24" 
                            r="20" 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="4"
                            strokeDasharray={`${2 * Math.PI * 20 * 0.25} ${2 * Math.PI * 20}`}
                            strokeDashoffset={`0`}
                            className="rotate-[-90deg] origin-center"
                            strokeLinecap="round"
                          />
                          <text x="24" y="28" textAnchor="middle" className="text-xs font-bold fill-blue-600 dark:fill-blue-400">
                            25%
                          </text>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Minimal Portfolio Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Andamento Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <MinimalPortfolioChart investments={investments} currentUser={user.name as "Ali" | "Alle"} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity size={20} className="text-slate-600 dark:text-slate-400" />
                    Attività Recenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500 dark:text-slate-400">Nessuna attività recente</p>
                      </div>
                    ) : (
                      transactions.slice(0, 5).map((transaction, index) => {
                        const investment = investments.find(inv => inv.symbol === transaction.assetSymbol);
                        const getTransactionIcon = () => {
                          switch (transaction.type) {
                            case 'buy':
                              return <Plus size={14} className="text-green-600 dark:text-green-400" />;
                            case 'sell':
                              return <Minus size={14} className="text-red-600 dark:text-red-400" />;
                            case 'price_update':
                              return <RefreshCw size={14} className="text-blue-600 dark:text-blue-400" />;
                            default:
                              return <Activity size={14} className="text-slate-600 dark:text-slate-400" />;
                          }
                        };
                        
                        const getTransactionText = () => {
                          const baseText = transaction.type === 'buy' ? 'Acquistato' : 
                                         transaction.type === 'sell' ? 'Venduto' : 
                                         transaction.type === 'price_update' ? 'Aggiornato prezzo' : 'Modificato';
                          return `${baseText} ${transaction.assetSymbol}`;
                        };
                        
                        const getAmountDisplay = () => {
                          if (transaction.type === 'buy' || transaction.type === 'sell') {
                            const quantity = transaction.quantity || 0;
                            const total = transaction.total || (transaction.price * quantity);
                            return (
                              <div className="text-right">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                  {formatCurrency(total)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {quantity} × {formatCurrency(transaction.price)}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {formatCurrency(transaction.price)}
                            </div>
                          );
                        };
                        
                        return (
                          <div key={`${transaction.id}-${transaction.timestamp}-${index}`} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                transaction.type === 'buy' ? 'bg-green-100 dark:bg-green-900 shadow-sm' :
                                transaction.type === 'sell' ? 'bg-red-100 dark:bg-red-900 shadow-sm' :
                                'bg-blue-100 dark:bg-blue-900 shadow-sm'
                              }`}>
                                {getTransactionIcon()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {getTransactionText()}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {format(new Date(transaction.timestamp), 'dd MMM yyyy, HH:mm')}
                                  </p>
                                  {investment && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                      {investment.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {getAmountDisplay()}
                          </div>
                        );
                      })
                    )}
                    {transactions.length > 5 && (
                      <div className="text-center pt-2">
                        <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                          Vedi tutte le attività →
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-6">
                    {/* Category Details - Left Side */}
                    <div className="flex-1 space-y-3 max-w-[60%]">
                      {['stocks', 'etf', 'crypto', 'bonds'].map((category) => {
                        const categoryInvestments = investments.filter(inv => inv.category === category);
                        const categoryValue = categoryInvestments.reduce((sum, inv) => 
                          sum + (inv.quantity * inv.currentPrice), 0
                        );
                        const percentage = portfolio ? (categoryValue / portfolio.totalValue) * 100 : 0;
                        
                        if (percentage === 0) return null;
                        
                        const getCategoryInfo = (cat: string) => {
                          const infoMap: Record<string, { icon: string; name: string; color: string }> = {
                            stocks: { icon: '📈', name: 'Azioni', color: 'bg-blue-500' },
                            etf: { icon: '📊', name: 'ETF', color: 'bg-green-500' },
                            crypto: { icon: '₿', name: 'Crypto', color: 'bg-orange-500' },
                            bonds: { icon: '🏦', name: 'Obbligazioni', color: 'bg-purple-500' },
                          };
                          return infoMap[cat] || { icon: '💰', name: cat, color: 'bg-gray-500' };
                        };
                        
                        const info = getCategoryInfo(category);
                        const isHovered = hoveredCategory === category;
                        
                        return (
                          <div 
                            key={category}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                              isHovered 
                                ? 'bg-slate-100 dark:bg-slate-600 shadow-md scale-[1.02]' 
                                : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                            onMouseEnter={() => setHoveredCategory(category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 ${info.color} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ${
                                isHovered ? 'scale-110' : ''
                              } transition-transform duration-300`}>
                                {info.icon}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white text-sm">
                                  {info.name}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  {formatCurrency(categoryValue)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-lg font-bold transition-colors duration-300 ${
                              isHovered 
                                ? 'text-slate-900 dark:text-white' 
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Donut Chart - Right Side */}
                    <div className="flex-shrink-0 w-[40%] flex justify-center">
                      <div className="relative w-56 h-56">
                        <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
                          {(() => {
                            const data = ['stocks', 'etf', 'crypto', 'bonds'].map((category) => {
                              const categoryInvestments = investments.filter(inv => inv.category === category);
                              const categoryValue = categoryInvestments.reduce((sum, inv) => 
                                sum + (inv.quantity * inv.currentPrice), 0
                              );
                              const percentage = portfolio ? (categoryValue / portfolio.totalValue) * 100 : 0;
                              return { category, percentage };
                            }).filter(item => item.percentage > 0);
                            
                            const getChartColor = (cat: string) => {
                              const colorMap: Record<string, string> = {
                                stocks: '#3b82f6',    // blue-500
                                etf: '#10b981',       // green-500
                                crypto: '#f97316',    // orange-500
                                bonds: '#8b5cf6',     // purple-500
                              };
                              return colorMap[cat] || '#6b7280';
                            };
                            
                            let currentAngle = 0;
                            const radius = 40;
                            const strokeWidth = 12;
                            const center = 50;
                            const circumference = 2 * Math.PI * radius;
                            
                            return data.map((item, index) => {
                              const angle = (item.percentage / 100) * 360;
                              const strokeDasharray = (item.percentage / 100) * circumference;
                              const rotation = currentAngle;
                              currentAngle += angle;
                              const isHovered = hoveredCategory === item.category;
                              
                              // Calculate path coordinates for click area
                              const startAngle = (rotation * Math.PI) / 180;
                              const endAngle = ((rotation + angle) * Math.PI) / 180;
                              const innerRadius = radius - strokeWidth / 2;
                              const outerRadius = radius + strokeWidth / 2;
                              
                              const x1 = center + innerRadius * Math.cos(startAngle);
                              const y1 = center + innerRadius * Math.sin(startAngle);
                              const x2 = center + outerRadius * Math.cos(startAngle);
                              const y2 = center + outerRadius * Math.sin(startAngle);
                              const x3 = center + outerRadius * Math.cos(endAngle);
                              const y3 = center + outerRadius * Math.sin(endAngle);
                              const x4 = center + innerRadius * Math.cos(endAngle);
                              const y4 = center + innerRadius * Math.sin(endAngle);
                              
                              const largeArcFlag = angle > 180 ? 1 : 0;
                              
                              const pathData = [
                                `M ${x1} ${y1}`,
                                `L ${x2} ${y2}`,
                                `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
                                `L ${x4} ${y4}`,
                                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
                                'Z'
                              ].join(' ');
                              
                              return (
                                <g key={item.category}>
                                  <circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke={getChartColor(item.category)}
                                    strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                                    strokeDasharray={`${strokeDasharray} ${circumference}`}
                                    strokeDashoffset={0}
                                    strokeLinecap="round"
                                    opacity={hoveredCategory && !isHovered ? 0.3 : 1}
                                    style={{
                                      transform: `rotate(${rotation}deg)`,
                                      transformOrigin: `${center}px ${center}px`,
                                      transition: 'all 0.3s ease-in-out'
                                    }}
                                  />
                                  <path
                                    d={pathData}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoveredCategory(item.category)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                    onClick={() => {
                                      setHoveredCategory(hoveredCategory === item.category ? null : item.category);
                                    }}
                                  />
                                </g>
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <div className="text-sm text-slate-600 dark:text-slate-400">Portfolio</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                              {formatCurrency(portfolio?.totalValue || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* Investments Section */}
          <TabsContent value="investments" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Portfolio Investimenti</h2>
                <p className="text-slate-600 dark:text-slate-400">Gestisci e monitora i tuoi investimenti</p>
              </div>
              {user.isAdmin && (
                <Button onClick={() => setShowInvestmentForm(true)}>
                  <Plus className="mr-2" size={16} />
                  Aggiungi Investimento
                </Button>
              )}
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Gain/Loss</TableHead>
                    {user.isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => {
                    const totalValue = investment.quantity * investment.currentPrice;
                    const totalCost = investment.quantity * investment.avgPrice;
                    const gainLoss = totalValue - totalCost;
                    const gainLossPercentage = (gainLoss / totalCost) * 100;

                    return (
                      <TableRow key={investment.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(investment.category)}`}>
                              <span className="font-semibold text-sm">{investment.symbol}</span>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{investment.name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                                {investment.category}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{investment.quantity}</TableCell>
                        <TableCell>{formatCurrency(investment.avgPrice)}</TableCell>
                        <TableCell>
                          <span>{formatCurrency(investment.currentPrice)}</span>
                        </TableCell>
                        <TableCell>{formatCurrency(totalValue)}</TableCell>
                        <TableCell>
                          <div className={getGainLossColor(gainLoss)}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                            <div className="text-xs">
                              ({formatPercentage(gainLossPercentage)})
                            </div>
                          </div>
                        </TableCell>
                        {user.isAdmin && (
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditInvestment(investment)}
                                title="Modifica investimento"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSellDialog({ open: true, investment })}
                                title="Vendi investimento"
                                className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                              >
                                <Minus size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteInvestment(investment.id)}
                                title="Elimina investimento"
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* History Section */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Storico Transazioni</h2>
                <p className="text-slate-600 dark:text-slate-400">Visualizza tutte le transazioni di investimento</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Tipi</SelectItem>
                    <SelectItem value="buy">Acquisto</SelectItem>
                    <SelectItem value="sell">Vendita</SelectItem>
                    <SelectItem value="price_update">Aggiornamento Prezzo</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">Ultimi 30 giorni</SelectItem>
                    <SelectItem value="3months">Ultimi 3 mesi</SelectItem>
                    <SelectItem value="1year">Ultimo anno</SelectItem>
                    <SelectItem value="all">Tutto il periodo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => (
                    <TableRow key={`transaction-${transaction.id}-${transaction.timestamp}-${index}`}>
                      <TableCell>
                        {format(new Date(transaction.timestamp), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.type === 'buy' ? 'default' :
                            transaction.type === 'sell' ? 'destructive' : 'secondary'
                          }
                        >
                          {transaction.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.assetSymbol}</TableCell>
                      <TableCell>
                        {transaction.quantity !== undefined ? transaction.quantity : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.price)}</TableCell>
                      <TableCell>
                        {transaction.total !== undefined ? formatCurrency(transaction.total) : '-'}
                      </TableCell>
                      <TableCell>{transaction.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Investment Form Modal */}
      <InvestmentForm
        open={showInvestmentForm}
        editingInvestment={editingInvestment}
        onClose={() => {
          setShowInvestmentForm(false);
          setEditingInvestment(null);
        }}
        onSuccess={() => {
          // Refetch investments and transactions data
          queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
          setEditingInvestment(null);
        }}
      />

      {/* Sell Investment Dialog */}
      <Dialog open={sellDialog.open} onOpenChange={(open) => setSellDialog({ open, investment: sellDialog.investment })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-orange-600" />
              Vendi Investimento
            </DialogTitle>
          </DialogHeader>
          
          {sellDialog.investment && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {sellDialog.investment.name} ({sellDialog.investment.symbol})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Possedute: {sellDialog.investment.quantity} unità a {formatCurrency(sellDialog.investment.avgPrice)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sell-quantity">Quantità da vendere</Label>
                  <Input
                    id="sell-quantity"
                    type="number"
                    placeholder="0"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    max={sellDialog.investment.quantity}
                    step="0.01"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Max: {sellDialog.investment.quantity}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sell-price">Prezzo per unità</Label>
                  <Input
                    id="sell-price"
                    type="number"
                    placeholder="0.00"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    step="0.01"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Attuale: {formatCurrency(sellDialog.investment.currentPrice)}
                  </div>
                </div>
              </div>
              
              {sellQuantity && sellPrice && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm font-medium text-green-800 dark:text-green-300">
                    Totale vendita: {formatCurrency(parseFloat(sellQuantity) * parseFloat(sellPrice))}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {parseFloat(sellQuantity)} × {formatCurrency(parseFloat(sellPrice))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSellDialog({ open: false, investment: null });
                setSellQuantity("");
                setSellPrice("");
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSellInvestment}
              disabled={sellInvestmentMutation.isPending || !sellQuantity || !sellPrice}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {sellInvestmentMutation.isPending ? "Vendendo..." : "Conferma Vendita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
