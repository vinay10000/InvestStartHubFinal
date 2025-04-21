import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define types for WebSocket messages
export interface WebSocketMessage {
  type: string;
  timestamp: number;
  [key: string]: any;
}

// Define the WebSocket context type
interface WebSocketContextType {
  connected: boolean;
  send: (message: any) => void;
  lastMessage: WebSocketMessage | null;
  connectionId: string | null;
  error: Error | null;
}

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  send: () => {},
  lastMessage: null,
  connectionId: null,
  error: null
});

// Custom hook to access WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Function to connect to WebSocket server
  const connectWebSocket = () => {
    try {
      // Determine the WebSocket URL based on the current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocketContext] Connecting to WebSocket server:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[WebSocketContext] WebSocket connection established');
        setConnected(true);
        setError(null);
        setReconnectAttempt(0);
        
        // Send a ping to verify connection
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocketContext] Received message:', data);
          
          // Set connection ID from the welcome message
          if (data.type === 'connection_established' && data.connectionId) {
            setConnectionId(data.connectionId);
          }
          
          // Update last message
          setLastMessage(data);
        } catch (err) {
          console.error('[WebSocketContext] Error parsing message:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('[WebSocketContext] WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      ws.onclose = (event) => {
        console.log('[WebSocketContext] WebSocket connection closed:', event);
        setConnected(false);
        setSocket(null);
        
        // Attempt to reconnect with exponential backoff
        const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempt), 30000);
        console.log(`[WebSocketContext] Connection lost, reconnecting in ${delay/1000} seconds...`);
        
        setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connectWebSocket();
        }, delay);
      };
      
      setSocket(ws);
    } catch (err) {
      console.error('[WebSocketContext] Failed to create WebSocket connection:', err);
      setError(err instanceof Error ? err : new Error('Unknown WebSocket error'));
    }
  };
  
  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup function
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [reconnectAttempt]);
  
  // Function to send messages
  const send = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocketContext] Cannot send message, socket not connected');
    }
  };
  
  // Set up ping interval to keep connection alive
  useEffect(() => {
    if (!socket || !connected) return;
    
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        send({ type: 'ping', timestamp: Date.now() });
      }
    }, 25000); // 25 seconds
    
    return () => clearInterval(pingInterval);
  }, [socket, connected]);
  
  // Context value
  const value = {
    connected,
    send,
    lastMessage,
    connectionId,
    error
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};