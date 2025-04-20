import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (type: string, data: any) => void;
  connectionId: string | null;
  lastMessage: any | null;
  error: string | null;
}

// Default context value
const defaultContext: WebSocketContextType = {
  isConnected: false,
  sendMessage: () => {},
  connectionId: null,
  lastMessage: null,
  error: null
};

// Create the context
const WebSocketContext = createContext<WebSocketContextType>(defaultContext);

// Provider component
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Connect to the WebSocket server
    const connectWebSocket = () => {
      try {
        // Determine WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('[WebSocketContext] Connecting to WebSocket server:', wsUrl);
        
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        
        // Connection opened handler
        socket.addEventListener('open', () => {
          console.log('[WebSocketContext] WebSocket connection established');
          setIsConnected(true);
          setError(null);
          
          // Send a test ping to verify connection
          socket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        });
        
        // Message handler
        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WebSocketContext] Received message:', data);
            
            // Store the last message received
            setLastMessage(data);
            
            // Handle connection established message
            if (data.type === 'connection_established') {
              setConnectionId(data.connectionId);
            }
          } catch (err) {
            console.error('[WebSocketContext] Error parsing message:', err);
          }
        });
        
        // Connection closed handler
        socket.addEventListener('close', (event) => {
          console.log('[WebSocketContext] WebSocket connection closed:', event);
          setIsConnected(false);
          
          // Attempt to reconnect after a delay unless closing was intentional
          if (!event.wasClean) {
            console.log('[WebSocketContext] Connection lost, reconnecting in 3 seconds...');
            setTimeout(connectWebSocket, 3000);
          }
        });
        
        // Error handler
        socket.addEventListener('error', (event) => {
          console.error('[WebSocketContext] WebSocket error:', event);
          setError('WebSocket connection error');
        });
      } catch (err) {
        console.error('[WebSocketContext] Failed to create WebSocket connection:', err);
        setError('Failed to establish WebSocket connection');
        
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 5000);
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);
  
  // Function to send a message through the WebSocket
  const sendMessage = (type: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type,
        ...data,
        timestamp: Date.now()
      };
      
      socketRef.current.send(JSON.stringify(message));
      console.log('[WebSocketContext] Sent message:', message);
      return true;
    } else {
      console.error('[WebSocketContext] Cannot send message, socket not connected');
      setError('WebSocket not connected');
      return false;
    }
  };
  
  // Create the context value
  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    connectionId,
    lastMessage,
    error
  };
  
  // Provide the context to children
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketContext;