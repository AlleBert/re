import { useState, useEffect } from "react";
import { format } from "date-fns";
import { User, Edit, Trash2, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
    setInvestments(investmentsData);
    setTransactions(transactionsData);
    setPortfolio(LocalStorageService.calculatePortfolioSummary(investmentsData));
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
    
    if (confirm("Are you sure you want to delete this investment?")) {
      deleteInvestmentMutation.mutate(investmentId);
    }
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Investment Tracker</h1>
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
              <Button variant="outline" onClick={onLogout}>
                <i className="fas fa-sign-out-alt mr-2" />
                Logout
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
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Portfolio</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(portfolio.totalValue)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Gain/Loss</p>
                        <p className={`text-2xl font-bold ${getGainLossColor(portfolio.totalGainLoss)}`}>
                          {portfolio.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.totalGainLoss)}
                        </p>
                        <p className={`text-sm ${getGainLossColor(portfolio.gainLossPercentage)}`}>
                          {formatPercentage(portfolio.gainLossPercentage)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        {portfolio.totalGainLoss >= 0 ? (
                          <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                        ) : (
                          <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Alle's Share (75%)</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(portfolio.alleShare)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                        <i className="fas fa-user-crown text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Ali's Share (25%)</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(portfolio.aliShare)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <User className="text-blue-600 dark:text-blue-400" size={20} />
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
                <MinimalPortfolioChart investments={investments} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction, index) => (
                      <div key={`${transaction.id}-${transaction.timestamp}-${index}`} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'buy' ? 'bg-green-100 dark:bg-green-900' :
                            transaction.type === 'sell' ? 'bg-red-100 dark:bg-red-900' :
                            'bg-blue-100 dark:bg-blue-900'
                          }`}>
                            <i className={`text-xs ${
                              transaction.type === 'buy' ? 'fas fa-plus text-green-600 dark:text-green-400' :
                              transaction.type === 'sell' ? 'fas fa-minus text-red-600 dark:text-red-400' :
                              'fas fa-edit text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {transaction.type === 'buy' ? 'Added' : 
                               transaction.type === 'sell' ? 'Sold' : 'Updated'} {transaction.assetSymbol}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {format(new Date(transaction.timestamp), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {transaction.total ? formatCurrency(transaction.total) : formatCurrency(transaction.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['stocks', 'etf', 'crypto', 'bonds'].map((category) => {
                      const categoryInvestments = investments.filter(inv => inv.category === category);
                      const categoryValue = categoryInvestments.reduce((sum, inv) => 
                        sum + (inv.quantity * inv.currentPrice), 0
                      );
                      const percentage = portfolio ? (categoryValue / portfolio.totalValue) * 100 : 0;
                      
                      if (percentage === 0) return null;
                      
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                              {category}
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getCategoryColor(category)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
                            <div className="flex space-x-2">
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
                                onClick={() => handleDeleteInvestment(investment.id)}
                                title="Elimina investimento"
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
          loadData();
          setEditingInvestment(null);
        }}
      />
    </div>
  );
}
