// js/network.js - Gestionnaire réseau online

class NetworkManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.role = null; // 'host' or 'guest'
    this.lobbyCode = null;
    this.latency = 0;
    this.pingInterval = null;
    this.onMessage = {};
    this.serverUrl = `ws://${window.location.host}`;
  }

  // =============================================
  // CONNECTION
  // =============================================
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.connected = true;
          this.startPing();
          console.log('[Network] Connecté au serveur');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
          } catch (e) {
            console.error('[Network] Parse error:', e);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.stopPing();
          console.log('[Network] Déconnecté');
          if (this.onMessage['disconnect']) {
            this.onMessage['disconnect']({});
          }
        };

        this.ws.onerror = (err) => {
          console.error('[Network] Erreur:', err);
          reject(err);
        };

      } catch (e) {
        reject(e);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopPing();
    this.connected = false;
  }

  // =============================================
  // LOBBY
  // =============================================
  createLobby(character) {
    this.send({ type: 'create_lobby', character: character.id });
  }

  joinLobby(code, character) {
    this.send({ type: 'join_lobby', code: code.toUpperCase(), character: character.id });
  }

  // =============================================
  // GAME SYNC
  // =============================================
  sendPlayerState(state) {
    if (!this.connected) return;
    this.send({ type: 'game_state', state });
  }

  sendBallState(ball) {
    if (!this.connected || this.role !== 'host') return;
    this.send({
      type: 'ball_state',
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, inPlay: ball.inPlay }
    });
  }

  sendScore(score) {
    this.send({ type: 'score_update', score });
  }

  // =============================================
  // MESSAGE HANDLING
  // =============================================
  handleMessage(msg) {
    console.log('[Network] Message:', msg.type);

    switch (msg.type) {
      case 'pong':
        this.latency = Date.now() - msg.timestamp;
        break;

      case 'lobby_created':
        this.role = 'host';
        this.lobbyCode = msg.code;
        break;

      case 'lobby_joined':
        this.role = 'guest';
        this.lobbyCode = msg.code;
        break;
    }

    // Forward to registered handlers
    if (this.onMessage[msg.type]) {
      this.onMessage[msg.type](msg);
    }
  }

  on(type, callback) {
    this.onMessage[type] = callback;
  }

  // =============================================
  // UTILS
  // =============================================
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, 3000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  getLatencyText() {
    if (!this.connected) return 'Hors ligne';
    if (this.latency < 50) return `🟢 ${this.latency}ms`;
    if (this.latency < 120) return `🟡 ${this.latency}ms`;
    return `🔴 ${this.latency}ms`;
  }
}

if (typeof module !== 'undefined') module.exports = { NetworkManager };