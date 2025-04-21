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
      // Check if we already have an active socket
      if (socket && 
         (socket.readyState === WebSocket.CONNECTING || 
          socket.readyState === WebSocket.OPEN)) {
        console.log('[WebSocketContext] WebSocket connection already exists, not creating a new one');
        return;
      }
      
      // Determine the WebSocket URL based on the current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // Don't append port when it's already in the host
      const wsUrl = `${protocol}//${host}/ws`;
      
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
        
        // Only attempt reconnection if the component is still mounted
        // and we haven't exceeded the maximum number of attempts
        if (reconnectAttempt < 3) {
          // Attempt to reconnect with exponential backoff
          const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempt), 30000);
          console.log(`[WebSocketContext] Connection lost, reconnecting in ${delay/1000} seconds...`);
          
          // Use a single timeout for reconnecting
          setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else {
          console.log('[WebSocketContext] Maximum reconnection attempts reached, not reconnecting automatically');
        }
      };
      
      setSocket(ws);
    } catch (err) {
      console.error('[WebSocketContext] Failed to create WebSocket connection:', err);
      setError(err instanceof Error ? err : new Error('Unknown WebSocket error'));
    }
  };
  
  // Initialize WebSocket connection only once at component mount
  // and when manually triggered by reconnect attempt changes
  useEffect(() => {
    // Only connect if no socket exists or socket is closed
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
    
    // Cleanup function
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('[WebSocketContext] Cleaning up WebSocket connection from effect');
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