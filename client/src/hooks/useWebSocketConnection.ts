// useWebSocketConnection.ts - React hook to use the WebSocket service in components
import { useState, useEffect, useCallback } from 'react';
import websocketService from '../lib/websocketService';
import type { WebSocketState, WebSocketMessage, UseWebSocketConnectionResult } from './useWebSocketConnection.d';

/**
 * React hook for WebSocket connections that leverages the WebSocketService singleton
 * This hook provides access to the WebSocket connection and state from any component
 */
function useWebSocketConnection(): UseWebSocketConnectionResult {
  const [connected, setConnected] = useState<boolean>(websocketService.connected);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(websocketService.lastMessage);
  const [connectionId, setConnectionId] = useState<string | null>(websocketService.connectionId);
  const [error, setError] = useState<Error | null>(websocketService.error);

  // Prepare a memoized send function to prevent unnecessary re-renders
  const send = useCallback((message: WebSocketMessage): boolean => {
    return websocketService.send(message);
  }, []);

  useEffect(() => {
    // Make sure WebSocketService connects if not already connected
    if (!websocketService.socket || 
        (websocketService.socket.readyState !== WebSocket.CONNECTING && 
         websocketService.socket.readyState !== WebSocket.OPEN)) {
      websocketService.connect();
    }
    
    // Add listener to the WebSocket service
    const unsubscribe = websocketService.addListener((state: WebSocketState) => {
      setConnected(state.connected);
      setLastMessage(state.lastMessage);
      setConnectionId(state.connectionId);
      setError(state.error);
    });
    
    // Only clean up the listener, DON'T close the WebSocket connection
    return () => {
      unsubscribe();
      // We intentionally do NOT call websocketService.disconnect() here
      // to prevent the connection from being closed between component unmounts
    };
  }, []);

  // Return WebSocket state and send function
  return {
    connected,
    send,
    lastMessage,
    connectionId,
    error
  };
}

export default useWebSocketConnection;