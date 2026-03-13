// js/game.js - Moteur principal du jeu Tennis Champions

class TennisGame {
  constructor(canvas, player1Char, player2Char, mode, difficulty) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.mode = mode; // 'cpu', 'local', 'online'
    this.running = false;
    this.paused = false;

    // Court dimensions
    this.courtY = this.height - 140;
    this.courtLeft = 40;
    this.courtRight = this.width - 40;
    this.netX = this.width / 2;
    this.netHeight = 85;

    // Game objects
    this.renderer = new Renderer(canvas);
    this.renderer.courtType = 'hard';

    this.ball = new Ball(this.netX, this.courtY - 80);

    this.player1 = new Player(
      this.courtLeft + 120, this.courtY - 72,
      'player1', player1Char
    );
    this.player2 = new Player(
      this.courtRight - 120, this.courtY - 72,
      'player2', player2Char
    );

    // Bounds
    this.player1.minX = this.courtLeft;
    this.player1.maxX = this.netX - 20;
    this.player2.minX = this.netX + 20;
    this.player2.maxX = this.courtRight;

    // AI
    this.ai = mode === 'cpu' ? new TennisAI(difficulty || 'medium') : null;

    // Input
    this.keys = {};
    this.mouseButtons = { left: false, right: false };

    // Score
    this.score = {
      p1: 0, p2: 0,
      sets1: 0, sets2: 0,
      points: ['0', '15', '30', '40'],
      gamePoint1: 0, gamePoint2: 0
    };

    // Game state
    this.gamePhase = 'serving'; // 'serving', 'rally', 'point_over', 'set_over', 'game_over'
    this.server = 'player1';
    this.serveBounce = 0;
    this.announcement = null;
    this.announcementTimer = 0;
    this.lastPointWinner = null;
    this.pointDelay = 0;
    this.winTarget = 7; // First to 7 points wins the game

    // Network (for online mode)
    this.network = null;
    this.opponentState = null;
    this.syncTimer = 0;

    // Callbacks
    this.onPointScored = null;
    this.onGameOver = null;

    this.setupInput();
    this.setupMouse();
  }

  // =============================================
  // INPUT SETUP
  // =============================================
  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  setupMouse() {
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) {
        // Left click = Power shot
        this.mouseButtons.left = true;
        this.player1.startSwing('power');
      } else if (e.button === 2) {
        // Right click = Normal shot
        this.mouseButtons.right = true;
        this.player1.startSwing('normal');
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseButtons.left = false;
      if (e.button === 2) this.mouseButtons.right = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // =============================================
  // SERVE
  // =============================================
  startServe() {
    const server = this.server === 'player1' ? this.player1 : this.player2;
    const dir = this.server === 'player1' ? 1 : -1;

    if (this.server === 'player1') {
      this.ball.reset(server.x + 20, server.y - 30);
    } else {
      this.ball.reset(server.x - 20, server.y - 30);
    }

    this.gamePhase = 'serving';
    this.serveBounce = 0;
  }

  executeServe() {
    const server = this.server === 'player1' ? this.player1 : this.player2;
    const dir = this.server === 'player1' ? 1 : -1;
    // Adapt serve speed to screen/court width so it can cross large courts reliably.
    const distanceToNet = Math.abs(this.netX - server.x);
    const baseVx = Math.max(14, Math.min(24, distanceToNet / 30));
    const vxJitter = (Math.random() - 0.5) * 2.2;

    this.ball.vx = dir * (baseVx + vxJitter) * server.powerBonus;
    this.ball.vy = -(6.4 + Math.random() * 1.2);
    this.ball.inPlay = true;
    this.ball.lastHitBy = this.server;
    this.gamePhase = 'rally';
    this.serveBounce = 0;

    this.renderer.spawnHitParticles(this.ball.x, this.ball.y, false, '#FFD700');
  }

  // =============================================
  // MAIN GAME LOOP
  // =============================================
  start() {
    this.running = true;
    this.startServe();
    setTimeout(() => this.executeServe(), 1000);
    this.loop();
  }

  loop() {
    if (!this.running) return;

    if (!this.paused) {
      this.update();
    }

    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.pointDelay > 0) {
      this.pointDelay--;
      if (this.pointDelay === 0) {
        this.startServe();
        setTimeout(() => this.executeServe(), 800);
        this.announcement = null;
      }
      return;
    }

    // Update players
    this.player1.update(this.keys, this.courtY, this.courtLeft, this.netX - 20);

    // Player 2: AI or human or online opponent
    if (this.mode === 'cpu') {
      const aiKeys = this.ai.update(
        this.player2, this.ball,
        this.courtY, this.netX + 20, this.courtRight, this.netX
      );
      this.handleAISwing(aiKeys);
      this.player2.update(aiKeys, this.courtY, this.netX + 20, this.courtRight);

    } else if (this.mode === 'local') {
      const p2keys = this.getPlayer2Keys();
      this.player2.update(p2keys, this.courtY, this.netX + 20, this.courtRight);
      this.handleLocalP2Swing(p2keys);

    } else if (this.mode === 'online') {
      if (this.opponentState) {
        this.player2.x = this.opponentState.x;
        this.player2.y = this.opponentState.y;
        this.player2.isSwinging = this.opponentState.isSwinging;
      }
    }

    // Player 1 serves via Space
    if (this.gamePhase === 'serving' && this.server === 'player1' && this.keys['Space']) {
      this.executeServe();
    }

    // Ball update
    if (this.ball.inPlay || this.gamePhase === 'rally') {
      const result = this.ball.update(
        this.courtY, this.netX, this.netHeight,
        this.courtLeft, this.courtRight
      );

      if (result === 'net') {
        this.showAnnouncement('FILET!', 'Point perdu', '#FF6B35');
        this.awardPoint(this.ball.lastHitBy === 'player1' ? 'player2' : 'player1');
        return;
      }

      if (result === 'out') {
        this.showAnnouncement('FAUTE!', 'Balle out', '#FF4444');
        this.awardPoint(this.ball.lastHitBy === 'player1' ? 'player2' : 'player1');
        return;
      }

      // Bounce tracking
      if (this.ball.y + this.ball.radius >= this.courtY && Math.abs(this.ball.vy) > 2) {
        this.serveBounce++;
        this.renderer.spawnBounceParticles(this.ball.x, this.courtY, this.renderer.courtType);

        // Second bounce = point to last non-hitter
        if (this.gamePhase === 'rally' && this.serveBounce >= 2) {
          const courtSide = this.ball.x < this.netX ? 'player1' : 'player2';
          this.awardPoint(this.ball.lastHitBy);
          return;
        }
      }

      // Hit detection - Player 1
      if (this.player1.isSwinging && this.player1.canHitBall(this.ball)) {
        if (this.ball.lastHitBy !== 'player1') {
          this.hitBall(this.player1, this.player2, this.player1.swingType === 'power');
        }
      }

      // Hit detection - Player 2
      if (this.player2.isSwinging && this.player2.canHitBall(this.ball)) {
        if (this.ball.lastHitBy !== 'player2') {
          this.hitBall(this.player2, this.player1, this.player2.swingType === 'power');
        }
      }
    }

    // Sync network
    if (this.mode === 'online' && this.network) {
      this.syncTimer++;
      if (this.syncTimer % 2 === 0) {
        this.network.sendPlayerState({
          x: this.player1.x,
          y: this.player1.y,
          isSwinging: this.player1.isSwinging
        });
        if (this.network.role === 'host') {
          this.network.sendBallState(this.ball);
        }
      }
    }
  }

  // =============================================
  // HIT LOGIC
  // =============================================
  hitBall(hitter, opponent, isPower) {
    const spinValues = { nadal: 3, swiatek: 2.8, alcaraz: 2.2, default: 1.5 };
    const charSpin = spinValues[hitter.character.id] || spinValues.default;
    const spin = isPower ? -charSpin : charSpin * 0.5;

    const power = isPower
      ? 58 + hitter.character.stats.power * 0.32
      : 38 + hitter.character.stats.power * 0.2;

    this.ball.hit(hitter, opponent, power, spin, isPower);
    this.serveBounce = 0;

    // Particles
    this.renderer.spawnHitParticles(this.ball.x, this.ball.y, isPower, hitter.character.color);

    // Special announcement
    if (isPower) {
      this.showAnnouncement(hitter.character.specialName, hitter.character.special, '#FFD700');
      setTimeout(() => {
        if (this.announcement === hitter.character.specialName) this.announcement = null;
      }, 1500);
      hitter.specialCooldown = hitter.maxSpecialCooldown;
    }
  }

  // =============================================
  // SCORING
  // =============================================
  awardPoint(winner) {
    if (winner === 'player1') {
      this.score.p1++;
    } else {
      this.score.p2++;
    }

    // Check game win
    if (this.score.p1 >= this.winTarget || this.score.p2 >= this.winTarget) {
      const setWinner = this.score.p1 >= this.winTarget ? 'player1' : 'player2';
      this.score.sets1 += setWinner === 'player1' ? 1 : 0;
      this.score.sets2 += setWinner === 'player2' ? 1 : 0;

      const winChar = setWinner === 'player1' ? this.player1.character : this.player2.character;

      if (this.score.sets1 >= 2 || this.score.sets2 >= 2) {
        // Match over
        this.showAnnouncement(`${winChar.name.split(' ')[1]} GAGNE!`, 'VICTOIRE 🏆', '#FFD700');
        this.running = false;
        setTimeout(() => {
          if (this.onGameOver) this.onGameOver(setWinner, this.score);
        }, 3000);
        return;
      } else {
        // New set
        this.score.p1 = 0;
        this.score.p2 = 0;
        this.showAnnouncement(`SET ${winChar.country}`, `${winChar.name} remporte le set!`, winChar.color);
      }
    }

    this.lastPointWinner = winner;
    this.pointDelay = 120;
    this.ball.inPlay = false;
    this.server = winner; // Winner serves next
  }

  // =============================================
  // ANNOUNCEMENTS
  // =============================================
  showAnnouncement(text, subtext, color) {
    this.announcement = { text, subtext, color };
    this.announcementTimer = 90;
  }

  // =============================================
  // PLAYER 2 LOCAL CONTROLS (Arrow keys)
  // =============================================
  getPlayer2Keys() {
    return {
      KeyQ: this.keys['ArrowLeft'],
      KeyD: this.keys['ArrowRight'],
      KeyZ: this.keys['ArrowUp'],
      KeyS: this.keys['ArrowDown'],
      Space: this.keys['Numpad0'] || this.keys['End']
    };
  }

  handleLocalP2Swing(keys) {
    if (keys['Numpad1'] || keys['PageDown']) {
      this.player2.startSwing('power');
    } else if (keys['Numpad2'] || keys['Delete']) {
      this.player2.startSwing('normal');
    }
  }

  handleAISwing(aiKeys) {
    if (aiKeys['powerSwing']) {
      this.player2.startSwing('power');
    } else if (aiKeys['normalSwing']) {
      this.player2.startSwing('normal');
    }
  }

  // =============================================
  // RENDER
  // =============================================
  render() {
    this.renderer.render({
      ball: this.ball,
      player1: this.player1,
      player2: this.player2,
      score: this.score,
      courtY: this.courtY,
      netX: this.netX,
      netHeight: this.netHeight,
      courtLeft: this.courtLeft,
      courtRight: this.courtRight
    });

    // Draw announcement
    if (this.announcement) {
      this.renderer.drawAnnouncement(
        this.announcement.text,
        this.announcement.subtext,
        this.announcement.color
      );
      if (this.announcementTimer > 0) this.announcementTimer--;
    }

    // Controls help (bottom)
    this.drawControls();

    // Online latency
    if (this.mode === 'online' && this.network) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(this.width - 100, this.height - 28, 90, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(this.network.getLatencyText(), this.width - 14, this.height - 14);
    }
  }

  drawControls() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(4, this.height - 26, 320, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#AAA';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Z/S/Q/D:Bouger  ESPACE:Saut  CLIC-G:Coup puissant  CLIC-D:Frappe normale', 10, this.height - 11);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  stop() { this.running = false; }

  setCourtType(type) {
    this.renderer.courtType = type;
  }
}

if (typeof module !== 'undefined') module.exports = { TennisGame };