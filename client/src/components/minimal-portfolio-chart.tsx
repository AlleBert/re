import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Investment } from "@shared/schema";

interface MinimalPortfolioChartProps {
  investments: Investment[];
}

export function MinimalPortfolioChart({ investments }: MinimalPortfolioChartProps) {
  const [viewMode, setViewMode] = useState<"cumulative" | "separate">("cumulative");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const generateChartData = () => {
    const points = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const data = [];
    
    const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
    
    for (let i = points - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dataPoint: any = {
        date: date.toLocaleDateString('it-IT', { 
          month: 'short', 
          day: 'numeric',
          ...(period === "90d" && { year: '2-digit' })
        }),
      };

      if (viewMode === "cumulative") {
        // Simulate historical variation for total portfolio (±2%)
        const variation = (Math.random() - 0.5) * 0.04;
        const historicalValue = totalValue * (1 + variation * (i / points));
        dataPoint.portfolio = historicalValue;
      } else {
        // Show individual investments
        investments.forEach((investment) => {
          const investmentValue = investment.quantity * investment.currentPrice;
          const variation = (Math.random() - 0.5) * 0.04;
          const historicalValue = investmentValue * (1 + variation * (i / points));
          dataPoint[investment.symbol] = historicalValue;
        });
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
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
          <ToggleGroupItem value="cumulative" aria-label="Vista cumulata">
            Cumulata
          </ToggleGroupItem>
          <ToggleGroupItem value="separate" aria-label="Vista separata">
            Separata
          </ToggleGroupItem>
        </ToggleGroup>
        
        <ToggleGroup type="single" value={period} onValueChange={(value) => value && setPeriod(value as any)}>
          <ToggleGroupItem value="7d" aria-label="7 giorni">
            7G
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" aria-label="30 giorni">
            30G
          </ToggleGroupItem>
          <ToggleGroupItem value="90d" aria-label="90 giorni">
            90G
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              className="text-slate-600 dark:text-slate-400"
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
              domain={['dataMin - 1000', 'dataMax + 1000']}
              className="text-slate-600 dark:text-slate-400"
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                viewMode === "cumulative" ? "Valore Portfolio" : name
              ]}
              labelClassName="text-slate-600 dark:text-slate-300"
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            {viewMode === "separate" && <Legend />}
            
            {viewMode === "cumulative" ? (
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            ) : (
              investments.map((investment, index) => (
                <Line
                  key={investment.symbol}
                  type="monotone"
                  dataKey={investment.symbol}
                  stroke={getColorForInvestment(index)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: getColorForInvestment(index) }}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}