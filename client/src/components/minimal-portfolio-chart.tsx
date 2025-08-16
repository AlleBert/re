import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { User, Users, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Investment } from "@shared/schema";

interface MinimalPortfolioChartProps {
  investments: Investment[];
  currentUser?: "Ali" | "Alle";
}

export function MinimalPortfolioChart({ investments, currentUser = "Alle" }: MinimalPortfolioChartProps) {
  const [viewMode, setViewMode] = useState<"cumulative" | "separate">("cumulative");
  const [period, setPeriod] = useState<"1d" | "7d" | "30d" | "90d" | "1y" | "ytd" | "max">("30d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const generateChartData = () => {
    // Calcola i punti dati basandosi sul periodo selezionato
    let dataPoints, labelPoints;
    
    if (period === "1d") {
      dataPoints = 48; labelPoints = 8;
    } else if (period === "7d") {
      dataPoints = 7; labelPoints = 7;
    } else if (period === "30d") {
      dataPoints = 30; labelPoints = 10;
    } else if (period === "90d") {
      dataPoints = 90; labelPoints = 12;
    } else if (period === "1y") {
      dataPoints = 12; labelPoints = 15;
    } else if (period === "ytd") {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const daysSinceStart = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      dataPoints = Math.min(daysSinceStart, 365);
      labelPoints = Math.min(Math.ceil(dataPoints / 30), 12);
    } else if (period === "max") {
      dataPoints = 730; // 2 anni di dati
      labelPoints = 24;
    } else {
      dataPoints = 30; labelPoints = 10;
    }
    const data = [];
    
    const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
    const currentUserShare = currentUser === "Ali" ? 0.25 : 0.75;
    const userValue = totalValue * currentUserShare;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date();
      if (period === "1d") {
        // Per 1 giorno: punti ogni 30 minuti (48 punti)
        const minutesBack = i * 30;
        date.setMinutes(date.getMinutes() - minutesBack);
      } else if (period === "1y") {
        // Per 1 anno: punti ogni mese (12 punti)
        date.setMonth(date.getMonth() - i);
      } else if (period === "ytd") {
        // Per YTD: dall'inizio dell'anno ad oggi
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const totalDays = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
        const dayOffset = Math.floor((i * totalDays) / dataPoints);
        date.setTime(startOfYear.getTime() + (dayOffset * 24 * 60 * 60 * 1000));
      } else if (period === "max") {
        // Per MAX: ultimi 2 anni
        date.setDate(date.getDate() - i);
      } else {
        // Per altri periodi: punti ogni giorno
        date.setDate(date.getDate() - i);
      }
      
      const dataPoint: any = {
        // Per le etichette X mostra solo alcuni punti per evitare sovrapposizioni
        date: period === "1d" 
          ? (i % (dataPoints / labelPoints) === 0 || i === 0) 
            ? date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : ''
          : period === "7d"
            ? date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
            : period === "30d"
              ? (i % 3 === 0 || i === 0) // ogni 3 giorni
                ? date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                : ''
              : period === "90d"
                ? (i % 8 === 0 || i === 0) // ogni 8 giorni
                  ? date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                  : ''
                : period === "ytd"
                  ? (i % Math.max(1, Math.floor(dataPoints / labelPoints)) === 0 || i === 0)
                    ? date.toLocaleDateString('it-IT', { month: 'short' })
                    : ''
                  : period === "max"
                    ? (i % Math.max(1, Math.floor(dataPoints / labelPoints)) === 0 || i === 0)
                      ? date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
                      : ''
                    : date.toLocaleDateString('it-IT', { month: 'short' }), // ogni mese per 1y
        // Per il tooltip, sempre mostra la data completa
        fullDate: period === "1d" 
          ? date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          : period === "1y" || period === "ytd" || period === "max"
            ? date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
            : date.toLocaleDateString('it-IT', { 
                weekday: 'short', day: 'numeric', month: 'short'
              }),
        rawDate: date.toISOString(),
      };

      if (viewMode === "separate") {
        // SEPARATE VIEW: Generate only user-specific data
        // Usa un seed pseudo-casuale basato sull'indice per consistenza
        const seed = (i * 1234567) % 1000000;
        const pseudoRandom = (seed / 1000000) - 0.5; // tra -0.5 e 0.5
        
        const trend = Math.sin(i / dataPoints * Math.PI) * 0.12;
        const randomVariation = pseudoRandom * 0.08;
        const historicalValue = userValue * (1 + trend + randomVariation * (i / dataPoints));
        dataPoint.userPortfolio = Math.max(historicalValue, userValue * 0.88);
      } else {
        // CUMULATIVE VIEW: Generate individual investments + total portfolio
        // Usa seed pseudo-casuali per consistenza
        const baseSeed = (i * 1234567) % 1000000;
        
        investments.forEach((investment, index) => {
          const investmentValue = investment.quantity * investment.currentPrice;
          const trend = Math.sin((i / dataPoints + index * 0.5) * Math.PI) * 0.15;
          
          // Seed diverso per ogni investimento
          const invSeed = ((baseSeed + index * 999999) % 1000000);
          const pseudoRandom = (invSeed / 1000000) - 0.5;
          const randomVariation = pseudoRandom * 0.06;
          
          const historicalValue = investmentValue * (1 + trend + randomVariation * (i / dataPoints));
          dataPoint[investment.symbol] = Math.max(historicalValue, investmentValue * 0.85);
        });
        
        // Generate total portfolio data for cumulative view
        const trend = Math.sin(i / dataPoints * Math.PI) * 0.1;
        const portfolioSeed = ((baseSeed + 777777) % 1000000);
        const pseudoRandom = (portfolioSeed / 1000000) - 0.5;
        const randomVariation = pseudoRandom * 0.05;
        const historicalValue = totalValue * (1 + trend + randomVariation * (i / dataPoints));
        dataPoint.portfolio = Math.max(historicalValue, totalValue * 0.9);
      }
      
      data.push(dataPoint);
    }
    
    return data;
  };

  const chartData = generateChartData();
  
  // Calcola la performance percentuale del periodo
  const calculatePeriodPerformance = () => {
    if (chartData.length < 2) return 0;
    
    const firstValue = viewMode === "separate" 
      ? chartData[0].userPortfolio 
      : chartData[0].portfolio || 0;
    const lastValue = viewMode === "separate" 
      ? chartData[chartData.length - 1].userPortfolio 
      : chartData[chartData.length - 1].portfolio || 0;
    
    if (firstValue === 0) return 0;
    return ((lastValue - firstValue) / firstValue) * 100;
  };
  
  const periodPerformance = calculatePeriodPerformance();
  

  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getColorForInvestment = (index: number) => {
    const colors = [
      "#3b82f6", // blue
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#f97316", // orange
      "#06b6d4", // cyan
      "#84cc16", // lime
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* View Mode Icons */}
        <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "separate" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("separate")}
            className="h-8 w-8 p-0"
            title="Vista separata - Solo portfolio utente"
            data-testid="button-view-separate"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cumulative" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cumulative")}
            className="h-8 w-8 p-0"
            title="Vista cumulata - Tutti i titoli + totale"
            data-testid="button-view-cumulative"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Period Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
            {(["1d", "7d", "30d", "90d", "1y", "ytd", "max"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-8 px-2 text-xs font-medium"
                data-testid={`button-period-${p}`}
              >
                {p === "1d" ? "1G" : p === "7d" ? "7G" : p === "30d" ? "30G" : p === "90d" ? "90G" : p === "1y" ? "1A" : p === "ytd" ? "YTD" : "MAX"}
              </Button>
            ))}
          </div>
          
          {/* Custom Calendar Picker */}
          <Popover open={showCustomCalendar} onOpenChange={setShowCustomCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                title="Seleziona intervallo personalizzato"
                data-testid="button-custom-calendar"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-3">
                <div className="text-sm font-medium text-center text-slate-700 dark:text-slate-300">
                  Seleziona Intervallo
                </div>
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={(range) => {
                    setCustomDateRange(range || { from: undefined, to: undefined });
                    if (range?.from && range?.to) {
                      // Implement custom range logic here if needed
                      setShowCustomCalendar(false);
                    }
                  }}
                  numberOfMonths={2}
                  className="rounded-md border shadow-lg"
                  disabled={(date) => date > new Date()}
                />
                {customDateRange.from && customDateRange.to && (
                  <div className="text-xs text-center text-slate-600 dark:text-slate-400 pt-2 border-t">
                    {format(customDateRange.from, 'dd MMM yyyy')} - {format(customDateRange.to, 'dd MMM yyyy')}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Performance Badge */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Performance {period === "1d" ? "giornaliera" : period === "7d" ? "settimanale" : period === "30d" ? "mensile" : period === "90d" ? "trimestrale" : period === "1y" ? "annuale" : period === "ytd" ? "da inizio anno" : "totale"}:
        </div>
        <div className={`text-lg font-bold px-3 py-1 rounded-lg ${
          periodPerformance >= 0 
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
        }`}>
          {periodPerformance >= 0 ? '+' : ''}{periodPerformance.toFixed(2)}%
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full" style={{ padding: '8px 15px 8px 4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            margin={{ top: 8, right: 15, left: 2, bottom: 8 }}
          >
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => {
                if (period === '1d') return value;
                return value;
              }}
              interval={0}
              minTickGap={40}
              height={40}
              tickMargin={12}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatCurrency}
              domain={['dataMin * 0.992', 'dataMax * 1.008']}
              width={75}
              tickMargin={8}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                padding: '8px 12px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                opacity: '0.96',
                backdropFilter: 'blur(8px)'
              }}
              formatter={(value: any, name: any) => {
                if (name === 'portfolio') {
                  return [formatCurrency(value), 'Portfolio Totale'];
                } else if (name === 'userPortfolio') {
                  return [formatCurrency(value), `Portfolio ${currentUser}`];
                } else {
                  const investment = investments.find(inv => inv.symbol === name);
                  const displayName = investment ? `${investment.name} (${investment.symbol})` : name;
                  return [formatCurrency(value), displayName];
                }
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0 && payload[0].payload?.rawDate) {
                  const date = new Date(payload[0].payload.rawDate);
                  return period === '1d' 
                    ? `${date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} - ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
                    : date.toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                }
                return label;
              }}
              labelStyle={{ 
                color: 'hsl(var(--muted-foreground))', 
                fontWeight: '500',
                fontSize: '12px',
                marginBottom: '4px'
              }}
            />
            
            {viewMode === "separate" ? (
              <Line
                key="user-portfolio-line"
                type="monotone"
                dataKey="userPortfolio"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                connectNulls={false}
              />
            ) : (
              <>
                {/* Individual investments with opacity */}
                {investments.map((investment, index) => (
                  <Line
                    key={`individual-${investment.symbol}`}
                    type="monotone"
                    dataKey={investment.symbol}
                    stroke={getColorForInvestment(index)}
                    strokeWidth={1.5}
                    strokeOpacity={0.3}
                    dot={false}
                    activeDot={{ r: 3, fill: getColorForInvestment(index), stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    connectNulls={false}
                  />
                ))}
                {/* Main portfolio line - prominent */}
                <Line
                  key="total-portfolio-line"
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  connectNulls={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}