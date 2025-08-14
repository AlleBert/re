import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarDays, TrendingUp, Users, User } from "lucide-react";
import { Investment, PortfolioSummary } from "@shared/schema";
import { LocalStorageService } from "@/lib/storage";

interface LiveChartProps {
  investments: Investment[];
  portfolio: PortfolioSummary | null;
  currentUser: { name: string; isAdmin: boolean };
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  totalValue: number;
  aliValue: number;
  alleValue: number;
  aliPercentage: number;
  allePercentage: number;
}

type TimePeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";
type ViewMode = "combined" | "separate";

export function LiveChart({ investments, portfolio, currentUser }: LiveChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1M");
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const [showUserSeparately, setShowUserSeparately] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const periods = [
    { value: "1D" as TimePeriod, label: "1 Giorno", days: 1 },
    { value: "1W" as TimePeriod, label: "1 Settimana", days: 7 },
    { value: "1M" as TimePeriod, label: "1 Mese", days: 30 },
    { value: "3M" as TimePeriod, label: "3 Mesi", days: 90 },
    { value: "6M" as TimePeriod, label: "6 Mesi", days: 180 },
    { value: "1Y" as TimePeriod, label: "1 Anno", days: 365 },
    { value: "ALL" as TimePeriod, label: "Tutto", days: 9999 }
  ];

  const generateHistoricalData = () => {
    const periodConfig = periods.find(p => p.value === selectedPeriod);
    if (!periodConfig || !portfolio) return [];

    const now = new Date();
    const startDate = new Date(now.getTime() - (periodConfig.days * 24 * 60 * 60 * 1000));
    const data: ChartDataPoint[] = [];

    // Generate data points based on period
    const pointsCount = selectedPeriod === "1D" ? 24 : 
                      selectedPeriod === "1W" ? 7 :
                      selectedPeriod === "1M" ? 30 : 
                      selectedPeriod === "3M" ? 90 :
                      selectedPeriod === "6M" ? 180 :
                      selectedPeriod === "1Y" ? 365 : 30;

    for (let i = 0; i <= pointsCount; i++) {
      const date = new Date(startDate.getTime() + (i * (periodConfig.days * 24 * 60 * 60 * 1000) / pointsCount));
      
      // Simulate historical price variations
      const baseValue = portfolio.totalValue;
      const variation = (Math.sin(i * 0.1) * 0.05 + Math.random() * 0.02 - 0.01);
      const totalValue = baseValue * (1 + variation);
      
      const aliValue = totalValue * 0.25; // 25% ownership
      const alleValue = totalValue * 0.75; // 75% ownership

      data.push({
        date: date.toLocaleDateString('it-IT'),
        timestamp: date.getTime(),
        totalValue,
        aliValue,
        alleValue,
        aliPercentage: 25,
        allePercentage: 75
      });
    }

    return data;
  };

  useEffect(() => {
    setChartData(generateHistoricalData());
  }, [selectedPeriod, investments, portfolio]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTooltipValue = (value: number, name: string) => {
    return [formatCurrency(value), name];
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600 dark:text-green-400";
    if (current < previous) return "text-red-600 dark:text-red-400";
    return "text-slate-600 dark:text-slate-400";
  };

  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].totalValue : 0;
  const previousValue = chartData.length > 1 ? chartData[chartData.length - 2].totalValue : currentValue;
  const changeAmount = currentValue - previousValue;
  const changePercentage = previousValue !== 0 ? ((changeAmount / previousValue) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Andamento Portfolio
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(currentValue)}
                </span>
                <span className={`text-sm font-medium ${getChangeColor(currentValue, previousValue)}`}>
                  {changeAmount >= 0 ? '+' : ''}{formatCurrency(changeAmount)} 
                  ({changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-slate-500" />
                <Switch
                  checked={showUserSeparately}
                  onCheckedChange={setShowUserSeparately}
                  id="user-view"
                />
                <User className="h-4 w-4 text-slate-500" />
                <Label htmlFor="user-view" className="text-sm">
                  Vista Separata
                </Label>
              </div>

              {/* Time Period Selector */}
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
                <SelectTrigger className="w-[140px]">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelClassName="text-slate-600 dark:text-slate-300"
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                
                {!showUserSeparately ? (
                  <Line
                    type="monotone"
                    dataKey="totalValue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Valore Totale"
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="alleValue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Alle (75%)"
                    />
                    <Line
                      type="monotone"
                      dataKey="aliValue"
                      stroke="hsl(var(--secondary-foreground))"
                      strokeWidth={2}
                      dot={false}
                      name="Ali (25%)"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Performance Comparison */}
      {showUserSeparately && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Ali (25%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Valore Attuale:</span>
                  <span className="font-semibold">
                    {portfolio ? formatCurrency(portfolio.totalValue * 0.25) : '€0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Quota:</span>
                  <span className="font-semibold">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Rendimento:</span>
                  <span className={`font-semibold ${getChangeColor(currentValue, previousValue)}`}>
                    {formatCurrency(changeAmount * 0.25)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Alle (75%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Valore Attuale:</span>
                  <span className="font-semibold">
                    {portfolio ? formatCurrency(portfolio.totalValue * 0.75) : '€0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Quota:</span>
                  <span className="font-semibold">75%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Rendimento:</span>
                  <span className={`font-semibold ${getChangeColor(currentValue, previousValue)}`}>
                    {formatCurrency(changeAmount * 0.75)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}