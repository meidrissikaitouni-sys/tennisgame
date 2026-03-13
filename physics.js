// js/physics.js - Moteur physique Tennis Champions

const PHYSICS = {
  GRAVITY: 0.45,
  BALL_BOUNCE: 0.62,
  BALL_FRICTION: 0.985,
  COURT_FRICTION: 0.88,
  NET_HEIGHT: 90,
  NET_X: null, // Set dynamically
  COURT_Y: null, // Set dynamically
};

// =============================================
// BALL PHYSICS
// =============================================
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 10;
    this.spin = 0;          // Topspin/backspin
    this.trail = [];        // Motion trail
    this.maxTrail = 12;
    this.inPlay = false;
    this.lastHitBy = null;  // 'player1' or 'player2'
    this.bounceCount = 0;
    this.isOut = false;
    this.powerShot = false;  // Visuel coup puissant
    this.powerTimer = 0;
  }

  update(courtY, netX, netHeight, courtLeft, courtRight) {
    if (!this.inPlay) return;

    // Save trail
    this.trail.push({ x: this.x, y: this.y, power: this.powerShot });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    // Apply gravity
    this.vy += PHYSICS.GRAVITY;

    // Apply spin effect (topspin dips, backspin floats)
    this.vy += this.spin * 0.05;
    this.spin *= 0.98;

    // Apply air resistance
    this.vx *= PHYSICS.BALL_FRICTION;

    // Move
    this.x += this.vx;
    this.y += this.vy;

    // Power shot timer
    if (this.powerTimer > 0) {
      this.powerTimer--;
      if (this.powerTimer === 0) this.powerShot = false;
    }

    // --- BOUNCE ON COURT ---
    if (this.y + this.radius >= courtY) {
      this.y = courtY - this.radius;
      this.vy *= -PHYSICS.BALL_BOUNCE;
      this.vx *= PHYSICS.COURT_FRICTION;
      this.bounceCount++;

      if (Math.abs(this.vy) < 1.5) {
        this.vy = 0;
        this.y = courtY - this.radius;
      }
    }

    // --- NET COLLISION ---
    const netLeft = netX - 6;
    const netRight = netX + 6;
    const netTop = courtY - netHeight;

    if (this.x + this.radius > netLeft && this.x - this.radius < netRight) {
      if (this.y + this.radius > netTop) {
        // Hit net
        if (this.x < netX) {
          this.x = netLeft - this.radius;
        } else {
          this.x = netRight + this.radius;
        }
        this.vx *= -0.3;
        this.vy *= 0.5;
        return 'net';
      }
    }

    // --- OUT OF BOUNDS CHECK ---
    if (this.x < courtLeft - 20 || this.x > courtRight + 20) {
      return 'out';
    }
    if (this.y > courtY + 50) {
      return 'out';
    }

    return null;
  }

  hit(shooter, target, power, spin, isSpecial) {
    // Direction toward opponent
    const dx = target.x - this.x;
    const safeDir = dx === 0 ? (shooter.role === 'player1' ? 1 : -1) : dx / Math.abs(dx);

    // Slightly slower rallies for better readability and control.
    const baseSpeed = power * 0.13;
    const speedMultiplier = isSpecial ? 1.5 : 1.0;

    this.vx = safeDir * baseSpeed * speedMultiplier * shooter.powerBonus;
    this.vy = -baseSpeed * 0.72 * speedMultiplier;

    // Add some arc
    if (Math.abs(this.vx) > 4.2) {
      this.vy -= 1.2;
    }

    this.spin = spin * shooter.spinBonus;
    this.lastHitBy = shooter.role;
    this.bounceCount = 0;
    this.inPlay = true;

    if (isSpecial) {
      this.powerShot = true;
      this.powerTimer = 30;
    }
  }

  serve(direction, power) {
    // Keep serves dynamic but not overpowering.
    this.vx = direction * power * 0.14;
    this.vy = -power * 0.12;
    this.inPlay = true;
    this.bounceCount = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.spin = 0;
    this.trail = [];
    this.inPlay = false;
    this.bounceCount = 0;
    this.isOut = false;
    this.powerShot = false;
    this.powerTimer = 0;
    this.lastHitBy = null;
  }
}

// =============================================
// PLAYER PHYSICS
// =============================================
class Player {
  constructor(x, y, role, character) {
    this.x = x;
    this.y = y;
    this.role = role; // 'player1' or 'player2'
    this.character = character;

    // Stats from character
    this.powerBonus = character.powerBonus || 1.0;
    this.spinBonus = character.spinBonus || 1.0;
    this.speedBonus = character.speedBonus || 1.0;
    this.enduranceBonus = character.enduranceBonus || 1.0;

    // Movement
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 4.5 * this.speedBonus;
    this.speed = this.baseSpeed;
    this.isJumping = false;
    this.onGround = true;
    this.jumpForce = -12;

    // Swing
    this.isSwinging = false;
    this.swingTimer = 0;
    this.swingDuration = 20;
    this.swingType = 'normal'; // 'normal' or 'power'
    this.swingAngle = 0;

    // Court bounds
    this.minX = 0;
    this.maxX = 0;
    this.courtY = 0;

    // Player dimensions
    this.width = 36;
    this.height = 72;

    // Stamina (endurance)
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaRegen = 0.08 * this.enduranceBonus;

    // Animation
    this.frame = 0;
    this.frameTimer = 0;
    this.direction = role === 'player1' ? 1 : -1;

    // Special move cooldown
    this.specialCooldown = 0;
    this.maxSpecialCooldown = 300;

    // Hit detection
    this.hitBox = { x: 0, y: 0, w: 60, h: 60 };
  }

  update(keys, courtY, minX, maxX) {
    this.courtY = courtY;
    this.minX = minX;
    this.maxX = maxX;

    // Stamina regen
    if (this.stamina < this.maxStamina) {
      this.stamina += this.staminaRegen;
    }

    // Special cooldown
    if (this.specialCooldown > 0) this.specialCooldown--;

    // Movement speed (reduced when low stamina)
    const staminaFactor = 0.5 + 0.5 * (this.stamina / 100);
    this.speed = this.baseSpeed * staminaFactor;

    // --- INPUT HANDLING ---
    if (keys) {
      let moved = false;

      // Q = left, D = right
      if (keys['KeyQ'] || keys['ArrowLeft']) {
        this.vx = -this.speed;
        this.direction = -1;
        moved = true;
      } else if (keys['KeyD'] || keys['ArrowRight']) {
        this.vx = this.speed;
        this.direction = 1;
        moved = true;
      } else {
        this.vx *= 0.75; // Friction
      }

      // Z = forward (move toward net), S = backward
      if (keys['KeyZ']) {
        const frontDir = this.role === 'player1' ? 1 : -1;
        this.vx += frontDir * this.speed * 0.5;
        moved = true;
      } else if (keys['KeyS']) {
        const backDir = this.role === 'player1' ? -1 : 1;
        this.vx += backDir * this.speed * 0.5;
        moved = true;
      }

      // Space = Jump
      if (keys['Space'] && this.onGround) {
        this.vy = this.jumpForce;
        this.onGround = false;
        this.isJumping = true;
        this.stamina = Math.max(0, this.stamina - 8);
      }

      if (moved) {
        this.stamina = Math.max(0, this.stamina - 0.05);
        this.frameTimer++;
        if (this.frameTimer % 6 === 0) this.frame = (this.frame + 1) % 4;
      }
    }

    // Apply gravity
    this.vy += PHYSICS.GRAVITY;
    this.y += this.vy;
    this.x += this.vx;

    // Ground collision
    const groundY = courtY - this.height;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.onGround = true;
      this.isJumping = false;
    }

    // Court bounds
    this.x = Math.max(minX + this.width / 2, Math.min(maxX - this.width / 2, this.x));

    // Swing animation
    if (this.isSwinging) {
      this.swingTimer++;
      this.swingAngle = Math.sin((this.swingTimer / this.swingDuration) * Math.PI) * 120;
      if (this.swingTimer >= this.swingDuration) {
        this.isSwinging = false;
        this.swingTimer = 0;
        this.swingAngle = 0;
      }
    }
  }

  startSwing(type) {
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingTimer = 0;
      this.swingType = type;
      this.stamina = Math.max(0, this.stamina - (type === 'power' ? 15 : 5));
    }
  }

  canHitBall(ball) {
    const dist = Math.hypot(ball.x - this.x, ball.y - (this.y + this.height / 2));
    const hitRange = this.isSwinging ? 80 : 55;
    return dist < hitRange && this.isSwinging;
  }

  getSwingProgress() {
    return this.swingTimer / this.swingDuration;
  }
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { Ball, Player, PHYSICS };
}