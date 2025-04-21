// websocketService.js - A singleton WebSocket service
// This implementation keeps WebSocket connection outside React lifecycle

class WebSocketService {
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
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      this._clearTimers();

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
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping', timestamp: Date.now() });
          }
        }, 30000);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
      
      this.socket.onerror = (event) => {
        console.error('[WebSocketService] Error:', event);
        this.error = new Error('WebSocket error occurred');
        this._notifyListeners();
      };
      
      this.socket.onclose = (event) => {
        console.log('[WebSocketService] Connection closed:', event);
        this.connected = false;
        this._notifyListeners();
        
        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        // Reconnect with exponential backoff
        if (this.reconnectAttempts < 10) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
          console.log(`[WebSocketService] Reconnecting in ${delay/1000} seconds...`);
          
          this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        } else {
          console.log('[WebSocketService] Max reconnect attempts reached');
        }
      };
    } catch (err) {
      console.error('[WebSocketService] Setup error:', err);
      this.error = err;
      this._notifyListeners();
    }
  }

  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketService] Cannot send - socket not open');
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

  addListener(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners() {
    const state = {
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

  _clearTimers() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect() {
    this._clearTimers();
    
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
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Connect automatically when imported
websocketService.connect();

export default websocketService;