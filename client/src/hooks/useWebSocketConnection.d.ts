/**
 * Type declaration for useWebSocketConnection.js
 * Provides TypeScript type safety for the WebSocket hook
 */

/**
 * The current state of the WebSocket connection
 */
export interface WebSocketState {
  connected: boolean;
  connectionId: string | null;
  lastMessage: any | null;
  error: Error | null;
}

/**
 * WebSocket message interface for type safety
 */
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Return type of the useWebSocketConnection hook
 */
export interface UseWebSocketConnectionResult extends WebSocketState {
  /**
   * Send a message through the WebSocket connection
   * @param message The message to send
   * @returns boolean indicating success
   */
  send: (message: WebSocketMessage | any) => boolean;
}

/**
 * Custom hook for WebSocket connections that manages the connection lifecycle
 * @returns The current WebSocket state and methods
 */
declare function useWebSocketConnection(): UseWebSocketConnectionResult;

export default useWebSocketConnection;