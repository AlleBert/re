import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
        rawDate: date.toISOString(),
      };

      if (viewMode === "cumulative") {
        // Simulate historical variation for total portfolio (±5%) with trend
        const trend = Math.sin(i / points * Math.PI) * 0.1; // Slight upward trend
        const randomVariation = (Math.random() - 0.5) * 0.05;
        const historicalValue = totalValue * (1 + trend + randomVariation * (i / points));
        dataPoint.portfolio = Math.max(historicalValue, totalValue * 0.9); // Minimum 90% of current value
      } else {
        // Show individual investments with more varied patterns
        investments.forEach((investment, index) => {
          const investmentValue = investment.quantity * investment.currentPrice;
          const trend = Math.sin((i / points + index * 0.5) * Math.PI) * 0.15; // Different trend per investment
          const randomVariation = (Math.random() - 0.5) * 0.06;
          const historicalValue = investmentValue * (1 + trend + randomVariation * (i / points));
          dataPoint[investment.symbol] = Math.max(historicalValue, investmentValue * 0.85); // Minimum 85% of current value
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
        {/* View Mode Switch */}
        <div className="flex items-center space-x-3">
          <Label htmlFor="view-mode" className="text-sm font-medium">
            Cumulata
          </Label>
          <Switch
            id="view-mode"
            checked={viewMode === "separate"}
            onCheckedChange={(checked) => setViewMode(checked ? "separate" : "cumulative")}
            data-testid="switch-view-mode"
          />
          <Label htmlFor="view-mode" className="text-sm font-medium">
            Separata
          </Label>
        </div>
        
        {/* Period Buttons */}
        <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-8 px-3 text-xs"
              data-testid={`button-period-${p}`}
            >
              {p === "7d" ? "7G" : p === "30d" ? "30G" : "90G"}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="date" 
              hide={true}
            />
            <YAxis 
              hide={true}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
                padding: '12px'
              }}
              formatter={(value: any, name: any) => {
                const investment = investments.find(inv => inv.symbol === name);
                const displayName = investment ? `${investment.name} (${investment.symbol})` : name === 'portfolio' ? 'Portfolio Totale' : name;
                return [formatCurrency(value), displayName];
              }}
              labelFormatter={(label) => {
                const dataPoint = chartData.find(d => d.date === label);
                if (dataPoint?.rawDate) {
                  const date = new Date(dataPoint.rawDate);
                  return date.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                }
                return label;
              }}
              labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
            />
            
            {viewMode === "cumulative" ? (
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#ffffff" }}
              />
            ) : (
              investments.map((investment, index) => (
                <Line
                  key={investment.symbol}
                  type="monotone"
                  dataKey={investment.symbol}
                  stroke={getColorForInvestment(index)}
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: getColorForInvestment(index) }}
                  activeDot={{ r: 5, fill: getColorForInvestment(index), stroke: "#ffffff", strokeWidth: 2 }}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}