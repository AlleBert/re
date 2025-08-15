import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { realTimePriceService } from "@/services/realTimePriceService";
import { fmpService } from "@/services/fmpService";

interface RealTimeStatusProps {
  lastUpdate: number;
  onManualRefresh?: () => Promise<void>;
}

export function RealTimeStatus({ lastUpdate, onManualRefresh }: RealTimeStatusProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkConfiguration = async () => {
      const configured = await fmpService.isConfigured();
      setIsConfigured(configured);
    };
    checkConfiguration();
  }, []);

  const isActive = realTimePriceService.isActive();
  const timeSinceUpdate = lastUpdate ? Math.floor((currentTime - lastUpdate) / 1000) : 0;

  const formatTimeSince = (seconds: number) => {
    if (seconds < 60) return `${seconds}s fa`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
    return `${Math.floor(seconds / 3600)}h fa`;
  };

  const getStatusColor = () => {
    if (!isConfigured) return "destructive";
    if (!isActive) return "secondary";
    if (timeSinceUpdate > 60) return "warning";
    return "success";
  };

  const getStatusText = () => {
    if (!isConfigured) return "API non configurata";
    if (!isActive) return "Aggiornamenti inattivi";
    if (timeSinceUpdate > 60) return "Disconnesso";
    return "Attivo";
  };

  const getStatusIcon = () => {
    if (!isConfigured || !isActive || timeSinceUpdate > 60) {
      return <WifiOff className="h-3 w-3" />;
    }
    return <Wifi className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getStatusColor() as any} className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <div>API FMP: {isConfigured ? "Configurata" : "Non configurata"}</div>
              <div>Aggiornamenti: {isActive ? "Attivi" : "Inattivi"}</div>
              {lastUpdate > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Ultimo: {formatTimeSince(timeSinceUpdate)}</span>
                </div>
              )}
              {isConfigured && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiornamenti ogni 30 secondi
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {onManualRefresh && isConfigured && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onManualRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Aggiorna prezzi manualmente</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}