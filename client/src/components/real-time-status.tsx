import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { realTimePriceService } from "@/services/realTimePriceService";
import { finnhubService } from "@/services/finnhubService";

interface RealTimeStatusProps {
  lastUpdate: number;
  onManualRefresh?: () => Promise<void>;
}

export function RealTimeStatus({ lastUpdate, onManualRefresh }: RealTimeStatusProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isConfigured, setIsConfigured] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [mode, setMode] = useState<string>("online");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await fetch('/api/finnhub/status');
        const status = await response.json();
        setIsConfigured(status.configured);
        setIsOnline(status.online);
        setMode(status.mode);
      } catch (error) {
        console.error('Error checking status:', error);
        setIsConfigured(false);
        setIsOnline(false);
        setMode("offline");
      }
    };
    
    checkConfiguration();
    
    // Check status periodically
    const interval = setInterval(checkConfiguration, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isActive = realTimePriceService.isActive();
  const timeSinceUpdate = lastUpdate ? Math.floor((currentTime - lastUpdate) / 1000) : 0;

  const formatTimeSince = (seconds: number) => {
    if (seconds < 60) return `${seconds}s fa`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
    return `${Math.floor(seconds / 3600)}h fa`;
  };

  const getStatusColor = () => {
    if (!isOnline) return "destructive";
    if (!isConfigured) return "secondary";
    if (!isActive) return "secondary";
    if (timeSinceUpdate > 60) return "secondary";
    return "default";
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (!isConfigured) return "Dati simulati";
    if (!isActive) return "Aggiornamenti inattivi";
    if (timeSinceUpdate > 60) return "Disconnesso";
    return "Live";
  };

  const getStatusIcon = () => {
    if (!isOnline || !isConfigured || !isActive || timeSinceUpdate > 60) {
      return <WifiOff className="h-3 w-3" />;
    }
    return <Wifi className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Badge 
                variant={getStatusColor() as any} 
                className="h-6 w-6 p-0 rounded-full flex items-center justify-center"
              >
                {getStatusIcon()}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <div>Modalità: {mode === "offline" ? "Offline" : "Online"}</div>
              <div>API Finnhub: {isConfigured ? "Configurata" : "Non configurata"}</div>
              <div>Aggiornamenti: {isActive ? "Attivi" : "Inattivi"}</div>
              {mode === "offline" && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Uso dati simulati localmente
                </div>
              )}
              {!isOnline && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Connessione internet non disponibile
                </div>
              )}
              {lastUpdate > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Ultimo: {formatTimeSince(timeSinceUpdate)}</span>
                </div>
              )}
              {isConfigured && isOnline && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Aggiornamenti in tempo reale
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