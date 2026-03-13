// js/ai.js - Intelligence Artificielle adversaire CPU

class TennisAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;

    // Config selon difficulté
    const configs = {
      easy:   { reactionDelay: 40, accuracy: 0.5,  speed: 0.65, mistakeRate: 0.25, powerRate: 0.2  },
      medium: { reactionDelay: 18, accuracy: 0.78, speed: 0.85, mistakeRate: 0.12, powerRate: 0.4  },
      hard:   { reactionDelay: 6,  accuracy: 0.94, speed: 1.0,  mistakeRate: 0.04, powerRate: 0.65 },
      pro:    { reactionDelay: 2,  accuracy: 0.99, speed: 1.1,  mistakeRate: 0.01, powerRate: 0.8  }
    };

    this.config = configs[difficulty] || configs.medium;
    this.ballHistory = [];
    this.targetX = 0;
    this.targetY = 0;
    this.decided = false;
    this.decisionTimer = 0;
    this.strategy = 'baseline'; // 'baseline', 'net', 'defensive'
    this.strategyTimer = 0;
    this.lastX = null;
    this.stallFrames = 0;
  }

  update(player, ball, courtY, minX, maxX, netX) {
    const keys = {};
    const baselineAnchor = player.role === 'player2' ? maxX - 90 : minX + 90;

    if (!ball.inPlay) {
      // Between points, hold a baseline position instead of camping at the net.
      this.moveToTarget(player, baselineAnchor, courtY - player.height, keys, minX, maxX, 0.75);
      this.applyUnstuck(player, minX, maxX, keys);
      return keys;
    }

    const ballOnMySide = player.role === 'player2' ? ball.x > netX : ball.x < netX;
    const ballComingToMe = player.role === 'player2' ? ball.vx > 0 : ball.vx < 0;

    // If rally is happening on the opponent side and ball is moving away, reset position.
    if (!ballOnMySide && !ballComingToMe) {
      this.strategy = 'baseline';
      this.moveToTarget(player, baselineAnchor, courtY - player.height, keys, minX, maxX, 0.8);
      this.applyUnstuck(player, minX, maxX, keys);
      return keys;
    }

    // Track ball with delay
    this.ballHistory.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
    if (this.ballHistory.length > this.config.reactionDelay) {
      this.ballHistory.shift();
    }

    const trackedBall = this.ballHistory[0] || ball;

    // Predict where ball will land
    const predicted = this.predictBallPosition(trackedBall, courtY);

    // Add AI inaccuracy
    const inaccuracy = (1 - this.config.accuracy) * 120;
    const rawTargetX = predicted.x + (Math.random() - 0.5) * inaccuracy;
    const targetX = Math.max(minX + 24, Math.min(maxX - 24, rawTargetX));
    const targetY = courtY - player.height;

    // Strategy
    this.updateStrategy(ball, netX, player);

    // Move toward target
    const distX = targetX - player.x;
    const shouldHit = Math.abs(distX) < 90 && ball.y > courtY - 220 && (ballOnMySide || ballComingToMe);

    if (shouldHit) {
      this.moveToTarget(player, targetX, targetY, keys, minX, maxX, 0.8);
    } else {
      this.moveToTarget(player, targetX, targetY, keys, minX, maxX, this.config.speed);
    }

    // Decide to swing
    if (this.shouldSwing(player, ball)) {
      const usePower = Math.random() < this.config.powerRate && player.specialCooldown === 0;

      if (usePower) {
        keys['powerSwing'] = true;
      } else {
        keys['normalSwing'] = true;
      }
    }

    // Jump for overhead
    if (ball.y < courtY - 150 && Math.abs(ball.x - player.x) < 100 && player.onGround) {
      if (Math.random() < 0.3) {
        keys['Space'] = true;
      }
    }

    // Mistakes
    if (Math.random() < this.config.mistakeRate * 0.01) {
      Object.keys(keys).forEach(k => delete keys[k]);
    }

    this.applyUnstuck(player, minX, maxX, keys);

    return keys;
  }

  applyUnstuck(player, minX, maxX, keys) {
    const isTryingToMove = !!(keys['KeyQ'] || keys['KeyD'] || keys['KeyZ'] || keys['KeyS']);
    if (this.lastX === null) {
      this.lastX = player.x;
      return;
    }

    const movedDist = Math.abs(player.x - this.lastX);
    if (isTryingToMove && movedDist < 0.2) {
      this.stallFrames++;
    } else {
      this.stallFrames = 0;
    }

    if (this.stallFrames > 12) {
      const nearNet = player.x <= minX + 20;
      const nearBaseline = player.x >= maxX - 20;

      if (nearNet) {
        keys['KeyS'] = true;
        delete keys['KeyZ'];
      } else if (nearBaseline) {
        keys['KeyZ'] = true;
        delete keys['KeyS'];
      } else {
        // If stuck mid-court, nudge horizontally.
        keys['KeyD'] = Math.random() > 0.5;
        keys['KeyQ'] = !keys['KeyD'];
      }
    }

    this.lastX = player.x;
  }

  predictBallPosition(ball, courtY) {
    let x = ball.x;
    let y = ball.y;
    let vx = ball.vx;
    let vy = ball.vy;

    // Simulate forward
    for (let i = 0; i < 120; i++) {
      vy += 0.45; // gravity
      x += vx;
      y += vy;
      vx *= 0.985;

      if (y > courtY - 10) {
        // Bounce
        vy *= -0.62;
        vx *= 0.88;
        y = courtY - 10;

        // Return first bounce position
        if (Math.abs(vy) < 8) {
          return { x, y };
        }
      }
    }
    return { x, y: courtY - 10 };
  }

  moveToTarget(player, targetX, targetY, keys, minX, maxX, speedFactor = 1.0) {
    const distX = targetX - player.x;
    const threshold = 18 + (1 - speedFactor) * 12;

    if (distX > threshold) {
      keys['KeyD'] = true;
    } else if (distX < -threshold) {
      keys['KeyQ'] = true;
    }

    // Z/S strategy (forward/backward) with anti-stuck behavior near bounds.
    const nearNet = player.x <= minX + 18;
    const nearBaseline = player.x >= maxX - 18;

    if (nearNet) {
      keys['KeyS'] = true;
      delete keys['KeyZ'];
      return;
    }

    if (nearBaseline) {
      keys['KeyZ'] = true;
      delete keys['KeyS'];
      return;
    }

    if (this.strategy === 'net') {
      keys['KeyZ'] = true;
    } else if (this.strategy === 'defensive') {
      keys['KeyS'] = true;
    }
  }

  shouldSwing(player, ball) {
    if (player.isSwinging) return false;

    const dist = Math.hypot(ball.x - player.x, ball.y - (player.y + player.height / 2));
    const inRange = dist < 80;
    const ballApproaching = (player.role === 'player2' && ball.vx > 0) ||
                            (player.role === 'player1' && ball.vx < 0);
    const notTooHigh = ball.y > player.y - 20;

    return inRange && notTooHigh;
  }

  updateStrategy(ball, netX, player) {
    this.strategyTimer++;
    if (this.strategyTimer < 150) return;
    this.strategyTimer = 0;

    const rand = Math.random();
    if (rand < 0.72) this.strategy = 'baseline';
    else if (rand < 0.84 && this.difficulty !== 'easy') this.strategy = 'net';
    else this.strategy = 'defensive';

    // Do not keep charging the net if the ball is already deep behind the AI.
    if (this.strategy === 'net' && ball.x > player.x + 110) {
      this.strategy = 'baseline';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { TennisAI };