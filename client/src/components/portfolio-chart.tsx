import { useEffect, useRef } from "react";
import { Investment } from "@shared/schema";

interface PortfolioChartProps {
  investments: Investment[];
  className?: string;
}

export function PortfolioChart({ investments, className }: PortfolioChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    // Simple mock chart data for demonstration
    const mockData = [
      45000, 46200, 44800, 47300, 49100, 48700, 50200, 49800, 51300, 52100, 51800
    ];
    
    // Calculate current total value
    const currentValue = investments.reduce((total, inv) => 
      total + (inv.quantity * inv.currentPrice), 0
    );
    
    if (currentValue > 0) {
      mockData.push(currentValue);
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Chart styling
    const isDark = document.documentElement.classList.contains('dark');
    const lineColor = '#2563EB';
    const fillColor = 'rgba(37, 99, 235, 0.1)';
    const gridColor = isDark ? '#374151' : '#E5E7EB';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - 2 * padding;
    const chartHeight = rect.height - 2 * padding;

    // Data processing
    const maxValue = Math.max(...mockData);
    const minValue = Math.min(...mockData);
    const valueRange = maxValue - minValue;

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight / 4);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw chart line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    mockData.forEach((value, index) => {
      const x = padding + (index * chartWidth / (mockData.length - 1));
      const y = padding + chartHeight - ((value - minValue) / valueRange * chartHeight);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under curve
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    
    mockData.forEach((value, index) => {
      const x = padding + (index * chartWidth / (mockData.length - 1));
      const y = padding + chartHeight - ((value - minValue) / valueRange * chartHeight);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw Y-axis labels
    ctx.fillStyle = textColor;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (i * valueRange / 4);
      const y = padding + chartHeight - (i * chartHeight / 4) + 4;
      ctx.fillText(`€${Math.round(value).toLocaleString()}`, padding - 10, y);
    }

  }, [investments]);

  return (
    <div className={className}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
