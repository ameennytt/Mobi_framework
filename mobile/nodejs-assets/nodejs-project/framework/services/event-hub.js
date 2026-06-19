'use strict';

/**
 * Client-side Event Hub and WebSocket Supervisor.
 * Handles pairing connection, auto-reconnects, and relays.
 */
class EventHub {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.roomCode = null;
    this.role = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.wsUrl = null;
    this.pendingQueue = [];
  }

  /**
   * Initializes the socket channel.
   * @param {string} roomCode 6-character room ID
   * @param {string} role 'bat' or 'screen'
   * @param {boolean} ephemeral true if short-lived lobby check
   */
  connect(roomCode, role, ephemeral = false) {
    this.roomCode = roomCode.toUpperCase();
    this.role = role;

    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host; // e.g. 192.168.1.15:3000

    // Automatically resolve gameId from URL pathname (e.g. /games/football/screen.html -> football)
    const pathParts = window.location.pathname.split('/');
    const gamesIndex = pathParts.indexOf('games');
    const gameId = gamesIndex !== -1 && pathParts[gamesIndex + 1] ? pathParts[gamesIndex + 1] : null;
    const gameQuery = gameId ? `&game=${encodeURIComponent(gameId)}` : '';

    this.wsUrl = `${scheme}://${host}/ws/${role}?room=${encodeURIComponent(this.roomCode)}${ephemeral ? '&ephemeral=1' : ''}${gameQuery}`;

    this._establishConnection();
  }

  _establishConnection() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return; // already connected or connecting
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      this._wireEvents();
    } catch (e) {
      this._handleDisconnect();
    }
  }

  _wireEvents() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Flush any queued messages (already-built msg objects — send raw)
      while (this.pendingQueue.length > 0) {
        const m = this.pendingQueue.shift();
        try {
          this.ws.send(JSON.stringify(m));
        } catch (_) {
          this.pendingQueue.unshift(m);
          break;
        }
      }
      this._fire('sys:connected', { role: this.role, code: this.roomCode });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type) {
          this._fire(data.type, data);
        }
      } catch (e) {
        console.warn('[EventHub] Non-JSON payload received:', event.data);
      }
    };

    this.ws.onerror = () => {
      // close event will trigger reconnect
    };

    this.ws.onclose = () => {
      this._handleDisconnect();
    };
  }

  _handleDisconnect() {
    this._fire('sys:disconnected', { role: this.role, code: this.roomCode });

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
      setTimeout(() => {
        this._establishConnection();
      }, delay);
    } else {
      // Re-pair threshold reached
      this._fire('sys:re-pair-required', { code: this.roomCode });
    }
  }

  /**
   * Registers a callback for a specific event type.
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  /**
   * Removes a callback.
   */
  off(type, callback) {
    if (!this.listeners.has(type)) return;
    const list = this.listeners.get(type);
    const idx = list.indexOf(callback);
    if (idx >= 0) list.splice(idx, 1);
  }

  /**
   * Relays a generic message across the bridge.
   * Payload fields are merged onto the top-level message so the receiver reads
   * them directly (e.g. send('KICK', {aim}) → listener gets data.aim). Matches
   * the raw-object protocol used by the production game.
   * @param {string} type - Event identifier (e.g. 'ACTION_COMMIT', 'PHASE_UPDATE')
   * @param {object} payload - Body of the event (its keys become top-level fields)
   */
  send(type, payload = {}) {
    const msg = Object.assign({ type, _sender: this.role, _ts: Date.now() }, payload);

    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (_) {
        this.pendingQueue.push(msg);
      }
    } else {
      this.pendingQueue.push(msg);
    }
  }

  _fire(type, data) {
    const list = this.listeners.get(type) || [];
    list.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });

    // Also fire a CustomEvent in the document context for modular listeners
    if (typeof document !== 'undefined') {
      const ev = new CustomEvent(`framework:${type}`, { detail: data });
      window.dispatchEvent(ev);
    }
  }
}

// Bind to window
if (typeof window !== 'undefined') {
  window.FrameworkEvents = new EventHub();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkEvents;
}
