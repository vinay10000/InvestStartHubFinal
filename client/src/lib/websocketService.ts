// websocketService.ts - A singleton WebSocket service
// This implementation keeps WebSocket connection outside React lifecycle
import type { WebSocketState, WebSocketMessage } from '../hooks/useWebSocketConnection.d';

/**
 * WebSocket service that manages the connection to the server
 * Implemented as a singleton to maintain a single connection across components
 */
class WebSocketService {
  socket: WebSocket | null;
  pingInterval: NodeJS.Timeout | null;
  connected: boolean;
  connectionId: string | null;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  listeners: Array<(state: WebSocketState) => void>;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  isIntentionalDisconnect: boolean;
  
  constructor() {
    this.socket = null;
    this.pingInterval = null;
    this.connected = false;
    this.connectionId = null;
    this.lastMessage = null;
    this.error = null;
    this.listeners = [];
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isIntentionalDisconnect = false;
    
    // Make send method bound to this instance
    this.send = this.send.bind(this);
  }

  connect(): void {
    // Check if already connected or connecting
    if (this.socket) {
      if (this.socket.readyState === WebSocket.CONNECTING) {
        console.log('[WebSocketService] WebSocket already connecting');
        return;
      }
      
      if (this.socket.readyState === WebSocket.OPEN) {
        console.log('[WebSocketService] WebSocket already connected');
        return;
      }
    }

    try {
      this._clearTimers();
      this.isIntentionalDisconnect = false;

      // Create WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('[WebSocketService] Connecting to:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('[WebSocketService] Connection established');
        this.connected = true;
        this.error = null;
        this.reconnectAttempts = 0;
        
        // Notify listeners
        this._notifyListeners();
        
        // Send ping to keep connection alive
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping', timestamp: Date.now() });
          }
        }, 30000);
      };
      
      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          console.log('[WebSocketService] Received message:', data);
          
          // Handle connection ID message
          if (data.type === 'connection_established' && data.connectionId) {
            this.connectionId = data.connectionId;
          }
          
          // Update last message
          this.lastMessage = data;
          
          // Notify listeners
          this._notifyListeners();
        } catch (err) {
          console.error('[WebSocketService] Error parsing message:', err);
        }
      };
      
      this.socket.onerror = (event: Event) => {
        console.error('[WebSocketService] Error:', event);
        this.error = new Error('WebSocket error occurred');
        this._notifyListeners();
      };
      
      this.socket.onclose = (event: CloseEvent) => {
        console.log('[WebSocketService] Connection closed:', event);
        this.connected = false;
        this._notifyListeners();
        
        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        // Only reconnect if this wasn't an intentional disconnect
        if (!this.isIntentionalDisconnect && this.reconnectAttempts < 10) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`[WebSocketService] Reconnecting in ${delay/1000} seconds...`);
          
          this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        } else if (this.isIntentionalDisconnect) {
          console.log('[WebSocketService] Intentional disconnect - not reconnecting');
        } else {
          console.log('[WebSocketService] Max reconnect attempts reached');
        }
      };
    } catch (err) {
      console.error('[WebSocketService] Setup error:', err);
      this.error = err instanceof Error ? err : new Error(String(err));
      this._notifyListeners();
    }
  }

  send(message: WebSocketMessage): boolean {
    if (!this.socket) {
      console.warn('[WebSocketService] No WebSocket connection available');
      this.connect(); // Try to connect
      return false;
    }
    
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketService] WebSocket not open (state:', this.socket.readyState, ')');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WebSocketService] Send error:', err);
      return false;
    }
  }

  addListener(callback: (state: WebSocketState) => void): () => void {
    // Add listener
    this.listeners.push(callback);
    
    // Call the callback immediately with current state
    try {
      callback({
        connected: this.connected,
        connectionId: this.connectionId,
        lastMessage: this.lastMessage,
        error: this.error
      });
    } catch (err) {
      console.error('[WebSocketService] Error in initial listener callback:', err);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners(): void {
    const state: WebSocketState = {
      connected: this.connected,
      connectionId: this.connectionId,
      lastMessage: this.lastMessage,
      error: this.error
    };
    
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (err) {
        console.error('[WebSocketService] Listener error:', err);
      }
    });
  }

  _clearTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(): void {
    this._clearTimers();
    this.isIntentionalDisconnect = true;
    
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        console.error('[WebSocketService] Error closing socket:', err);
      }
      this.socket = null;
    }
    
    this.connected = false;
    this._notifyListeners();
    console.log('[WebSocketService] Disconnected intentionally');
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Connect automatically when imported
websocketService.connect();

export default websocketService;