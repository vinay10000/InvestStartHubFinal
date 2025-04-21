// useWebSocketConnection.js - React hook to use the WebSocket service in components
import { useState, useEffect } from 'react';
import websocketService from '../lib/websocketService';

function useWebSocketConnection() {
  const [connected, setConnected] = useState(websocketService.connected);
  const [lastMessage, setLastMessage] = useState(websocketService.lastMessage);
  const [connectionId, setConnectionId] = useState(websocketService.connectionId);
  const [error, setError] = useState(websocketService.error);

  useEffect(() => {
    // Add listener to the WebSocket service
    const unsubscribe = websocketService.addListener((state) => {
      setConnected(state.connected);
      setLastMessage(state.lastMessage);
      setConnectionId(state.connectionId);
      setError(state.error);
    });
    
    // Initialize connection if needed
    if (!websocketService.socket) {
      websocketService.connect();
    }
    
    // Clean up by removing listener
    return unsubscribe;
  }, []);

  // Return WebSocket state and send function
  return {
    connected,
    send: websocketService.send.bind(websocketService),
    lastMessage,
    connectionId,
    error
  };
}

export default useWebSocketConnection;