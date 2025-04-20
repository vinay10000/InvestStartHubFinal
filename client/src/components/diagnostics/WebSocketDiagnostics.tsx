import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw,
  AlertTriangle
} from 'lucide-react';
import { useWebSocket } from '@/context/WebSocketContext';

interface WebSocketDiagnosticsProps {
  startupId?: string;
  className?: string;
}

/**
 * A component that uses WebSockets to perform real-time wallet diagnostics
 */
const WebSocketDiagnostics: React.FC<WebSocketDiagnosticsProps> = ({ 
  startupId,
  className 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Use the global WebSocket context
  // Use the global WebSocket context
  const { 
    isConnected, 
    sendMessage, 
    connectionId, 
    lastMessage, 
    error: contextError 
  } = useWebSocket();
  
  // Store a reference to the current startup ID for message filtering
  const startupIdRef = useRef(startupId);
  
  // Combine errors from context and local state
  const error = localError || contextError;
  
  // Process incoming messages from WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    
    console.log('[WebSocketDiagnostics] Processing message:', lastMessage);
    
    // Handle different message types that are relevant to this component
    switch (lastMessage.type) {
      case 'wallet_diagnostics_started':
        if (lastMessage.startupId === startupId) {
          setIsRunning(true);
        }
        break;
        
      case 'wallet_diagnostics_result':
        if (lastMessage.startupId === startupId) {
          setIsRunning(false);
          setResults(lastMessage.result);
        }
        break;
        
      case 'error':
        setIsRunning(false);
        setLocalError(lastMessage.message || 'An error occurred with WebSocket communication');
        break;
    }
  }, [lastMessage, startupId]);
  
  // Run diagnostics
  const runDiagnostics = () => {
    if (!isConnected) {
      setLocalError('WebSocket not connected');
      return;
    }
    
    if (!startupId) {
      setLocalError('No startup ID provided');
      return;
    }
    
    setIsRunning(true);
    setLocalError(null);
    setResults(null);
    
    // Use the global sendMessage function
    const success = sendMessage('wallet_diagnostics', { startupId });
  };
  
  return (
    <Card className={className} id="websocket-diagnostics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'} ${isRunning ? 'animate-spin' : ''}`} />
          WebSocket Wallet Diagnostics
        </CardTitle>
        <CardDescription>
          Status: {' '}
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {connectionId && (
            <span className="ml-2 text-xs text-muted-foreground">ID: {connectionId}</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {results && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Diagnostics Results</h3>
              {results.walletFound ? (
                <Badge className="bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Wallet Found
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Wallet Not Found
                </Badge>
              )}
            </div>
            
            <div className="text-sm space-y-2">
              <p><span className="font-medium">Methods Attempted:</span> {results.methodsAttempted?.join(', ')}</p>
              <p><span className="font-medium">Time:</span> {results.timeElapsed}ms</p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          onClick={runDiagnostics}
          disabled={!isConnected || isRunning || !startupId}
        >
          {isRunning ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Run WebSocket Diagnostics
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WebSocketDiagnostics;