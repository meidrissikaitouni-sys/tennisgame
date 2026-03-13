// server.js - Tennis Champions Online Server
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname)));

// =============================================
// LOBBY MANAGEMENT
// =============================================
const lobbies = new Map();  // code -> { host, guest, gameState }
const players = new Map();  // ws -> { lobbyCode, role, playerId }

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return lobbies.has(code) ? generateLobbyCode() : code;
}

function broadcast(lobbyCode, message, excludeWs = null) {
  const lobby = lobbies.get(lobbyCode);
  if (!lobby) return;
  const msg = JSON.stringify(message);
  [lobby.host, lobby.guest].forEach(ws => {
    if (ws && ws !== excludeWs && ws.readyState === 1) {
      ws.send(msg);
    }
  });
}

// =============================================
// WEBSOCKET HANDLING
// =============================================
wss.on('connection', (ws) => {
  console.log('[Server] New connection');

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {

      // --- CREATE LOBBY ---
      case 'create_lobby': {
        const code = generateLobbyCode();
        lobbies.set(code, {
          code,
          host: ws,
          guest: null,
          hostCharacter: msg.character,
          guestCharacter: null,
          status: 'waiting'
        });
        players.set(ws, { lobbyCode: code, role: 'host', playerId: uuidv4() });
        ws.send(JSON.stringify({ type: 'lobby_created', code, role: 'host' }));
        console.log(`[Server] Lobby créé: ${code}`);
        break;
      }

      // --- JOIN LOBBY ---
      case 'join_lobby': {
        const lobby = lobbies.get(msg.code?.toUpperCase());
        if (!lobby) {
          ws.send(JSON.stringify({ type: 'error', message: 'Code invalide. Lobby introuvable.' }));
          return;
        }
        if (lobby.guest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Lobby déjà complet.' }));
          return;
        }
        lobby.guest = ws;
        lobby.guestCharacter = msg.character;
        players.set(ws, { lobbyCode: msg.code.toUpperCase(), role: 'guest', playerId: uuidv4() });

        ws.send(JSON.stringify({
          type: 'lobby_joined',
          code: lobby.code,
          role: 'guest',
          opponentCharacter: lobby.hostCharacter
        }));

        // Notify host
        lobby.host.send(JSON.stringify({
          type: 'opponent_joined',
          opponentCharacter: lobby.guestCharacter
        }));

        // Start countdown
        setTimeout(() => {
          broadcast(lobby.code, { type: 'game_start', hostCharacter: lobby.hostCharacter, guestCharacter: lobby.guestCharacter });
          lobby.status = 'playing';
        }, 1000);

        console.log(`[Server] ${msg.code} - 2 joueurs connectés, partie commence!`);
        break;
      }

      // --- GAME STATE SYNC ---
      case 'game_state': {
        const playerInfo = players.get(ws);
        if (!playerInfo) return;
        broadcast(playerInfo.lobbyCode, {
          type: 'opponent_state',
          state: msg.state,
          role: playerInfo.role
        }, ws);
        break;
      }

      // --- BALL STATE (host controls ball) ---
      case 'ball_state': {
        const playerInfo = players.get(ws);
        if (!playerInfo || playerInfo.role !== 'host') return;
        broadcast(playerInfo.lobbyCode, {
          type: 'ball_update',
          ball: msg.ball
        }, ws);
        break;
      }

      // --- SCORE UPDATE ---
      case 'score_update': {
        const playerInfo = players.get(ws);
        if (!playerInfo) return;
        broadcast(playerInfo.lobbyCode, {
          type: 'score_update',
          score: msg.score
        });
        break;
      }

      // --- CHAT MESSAGE ---
      case 'chat': {
        const playerInfo = players.get(ws);
        if (!playerInfo) return;
        broadcast(playerInfo.lobbyCode, {
          type: 'chat',
          message: msg.message.substring(0, 100),
          role: playerInfo.role
        }, ws);
        break;
      }

      // --- PING ---
      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', timestamp: msg.timestamp }));
        break;
      }
    }
  });

  ws.on('close', () => {
    const playerInfo = players.get(ws);
    if (playerInfo) {
      const lobby = lobbies.get(playerInfo.lobbyCode);
      if (lobby) {
        broadcast(playerInfo.lobbyCode, {
          type: 'opponent_disconnected',
          message: 'Votre adversaire s\'est déconnecté.'
        }, ws);
        lobbies.delete(playerInfo.lobbyCode);
      }
      players.delete(ws);
    }
    console.log('[Server] Connexion fermée');
  });

  ws.on('error', (err) => {
    console.error('[Server] WS Error:', err.message);
  });
});

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎾 Tennis Champions Server démarré!`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔌 WebSocket sur ws://localhost:${PORT}\n`);
});