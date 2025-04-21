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
// Use .js extension and type it as any to avoid TypeScript errors
import useWebSocketConnection from '@/hooks/useWebSocketConnection';

interface WebSocketDiagnosticsProps {
  startupId?: string;
  className?: string;
}

// Define types for diagnostic results
interface DiagnosticResults {
  walletFound: boolean;
  methodsAttempted?: string[];
  timeElapsed?: number;
}

/**
 * A component that uses WebSockets to perform real-time wallet diagnostics
 */
const WebSocketDiagnostics: React.FC<WebSocketDiagnosticsProps> = ({ 
  startupId,
  className 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Use the new WebSocket connection hook
  const { 
    connected, 
    send, 
    connectionId, 
    lastMessage, 
    error: contextError 
  } = useWebSocketConnection();
  
  // Store a reference to the current startup ID for message filtering
  const startupIdRef = useRef(startupId);
  
  // Combine errors from context and local state (convert Error to string if needed)
  const errorMessage = localError || (contextError ? contextError.message || contextError.toString() : null);
  
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
    if (!connected) {
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
    
    // Send diagnostic request
    send({
      type: 'wallet_diagnostics',
      startupId,
      timestamp: Date.now()
    });
  };
  
  return (
    <Card className={className} id="websocket-diagnostics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className={`h-5 w-5 ${connected ? 'text-green-500' : 'text-red-500'} ${isRunning ? 'animate-spin' : ''}`} />
          WebSocket Wallet Diagnostics
        </CardTitle>
        <CardDescription>
          Status: {' '}
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
          {connectionId && (
            <span className="ml-2 text-xs text-muted-foreground">ID: {connectionId}</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
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
          disabled={!connected || isRunning || !startupId}
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