import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BarChart3, TrendingUp } from "lucide-react";
import { Investment } from "@shared/schema";

interface MinimalPortfolioChartProps {
  investments: Investment[];
  currentUser?: "Ali" | "Alle";
}

export function MinimalPortfolioChart({ investments, currentUser = "Alle" }: MinimalPortfolioChartProps) {
  const [viewMode, setViewMode] = useState<"cumulative" | "separate">("cumulative");
  const [period, setPeriod] = useState<"1d" | "7d" | "30d" | "90d">("30d");

  const generateChartData = () => {
    // Punti per i dati: molti più punti per dettaglio della linea
    const dataPoints = period === "1d" ? 48 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    // Punti per le etichette X: pochi per evitare sovrapposizioni
    const labelPoints = period === "1d" ? 8 : period === "7d" ? 7 : period === "30d" ? 10 : 12;
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
              : (i % 8 === 0 || i === 0) // ogni 8 giorni
                ? date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
                : '',
        // Per il tooltip, sempre mostra la data completa
        fullDate: period === "1d" 
          ? date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString('it-IT', { 
              weekday: 'short', day: 'numeric', month: 'short'
            }),
        rawDate: date.toISOString(),
      };

      if (viewMode === "separate") {
        // SEPARATE VIEW: Generate only user-specific data
        const trend = Math.sin(i / dataPoints * Math.PI) * 0.12;
        const randomVariation = (Math.random() - 0.5) * 0.08;
        const historicalValue = userValue * (1 + trend + randomVariation * (i / dataPoints));
        dataPoint.userPortfolio = Math.max(historicalValue, userValue * 0.88);
      } else {
        // CUMULATIVE VIEW: Generate individual investments + total portfolio
        investments.forEach((investment, index) => {
          const investmentValue = investment.quantity * investment.currentPrice;
          const trend = Math.sin((i / dataPoints + index * 0.5) * Math.PI) * 0.15;
          const randomVariation = (Math.random() - 0.5) * 0.06;
          const historicalValue = investmentValue * (1 + trend + randomVariation * (i / dataPoints));
          dataPoint[investment.symbol] = Math.max(historicalValue, investmentValue * 0.85);
        });
        
        // Generate total portfolio data for cumulative view
        const trend = Math.sin(i / dataPoints * Math.PI) * 0.1;
        const randomVariation = (Math.random() - 0.5) * 0.05;
        const historicalValue = totalValue * (1 + trend + randomVariation * (i / dataPoints));
        dataPoint.portfolio = Math.max(historicalValue, totalValue * 0.9);
      }
      
      data.push(dataPoint);
    }
    
    return data;
  };

  const chartData = generateChartData();
  

  
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
            <TrendingUp className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cumulative" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cumulative")}
            className="h-8 w-8 p-0"
            title="Vista cumulata - Tutti i titoli + totale"
            data-testid="button-view-cumulative"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Period Buttons */}
        <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
          {(["1d", "7d", "30d", "90d"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-8 px-3 text-xs"
              data-testid={`button-period-${p}`}
            >
              {p === "1d" ? "1G" : p === "7d" ? "7G" : p === "30d" ? "30G" : "90G"}
            </Button>
          ))}
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