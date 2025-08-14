import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Investment } from "@shared/schema";

interface MinimalPortfolioChartProps {
  investments: Investment[];
}

export function MinimalPortfolioChart({ investments }: MinimalPortfolioChartProps) {
  // Generate simple historical data points
  const generateChartData = () => {
    const points = 30; // Last 30 days
    const data = [];
    
    const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
    
    for (let i = points - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate historical variation (±2%)
      const variation = (Math.random() - 0.5) * 0.04;
      const historicalValue = totalValue * (1 + variation * (i / points));
      
      data.push({
        date: date.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
        value: historicalValue,
      });
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

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis 
            dataKey="date" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
            domain={['dataMin - 1000', 'dataMax + 1000']}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Valore Portfolio']}
            labelClassName="text-slate-600 dark:text-slate-300"
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}