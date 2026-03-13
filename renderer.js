// js/renderer.js - Moteur graphique Tennis Champions

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
    this.effects = [];
    this.time = 0;
    this.courtType = 'hard'; // 'hard', 'clay', 'grass'

    // Court colors
    this.courtColors = {
      hard:  { main: '#2563EB', lines: '#FFFFFF', bg: '#1E3A5F', shadow: '#1a3a8a' },
      clay:  { main: '#C25A2A', lines: '#F5DEB3', bg: '#8B2500', shadow: '#6B1A00' },
      grass: { main: '#2D7D32', lines: '#FFFFFF', bg: '#1B5E20', shadow: '#1a4a1a' }
    };
  }

  // =============================================
  // MAIN RENDER
  // =============================================
  render(gameState) {
    this.time++;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const { ball, player1, player2, score, courtY, netX, netHeight, courtLeft, courtRight } = gameState;

    // Background
    this.drawBackground(courtY);

    // Court
    this.drawCourt(courtY, courtLeft, courtRight, netX, netHeight);

    // Shadows
    this.drawShadow(player1, courtY);
    this.drawShadow(player2, courtY);
    if (ball.inPlay) this.drawBallShadow(ball, courtY);

    // Players
    this.drawPlayer(player1);
    this.drawPlayer(player2);

    // Ball trail + ball
    if (ball.inPlay || ball.y < courtY) {
      this.drawBallTrail(ball);
      this.drawBall(ball);
    }

    // Particles & effects
    this.updateParticles();
    this.drawParticles();
    this.drawEffects();

    // HUD
    this.drawHUD(score, player1, player2);
  }

  // =============================================
  // BACKGROUND
  // =============================================
  drawBackground(courtY) {
    const ctx = this.ctx;
    const colors = this.courtColors[this.courtType];

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, courtY);
    skyGrad.addColorStop(0, '#0a0a1a');
    skyGrad.addColorStop(0.4, '#111133');
    skyGrad.addColorStop(1, '#1a1a44');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, courtY);

    // Stars
    this.drawStars();

    // Stadium atmosphere
    this.drawStadium(courtY);

    // Ground below court
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, courtY, this.width, this.height - courtY);

    // Ground gradient
    const groundGrad = ctx.createLinearGradient(0, courtY, 0, this.height);
    groundGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    groundGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, courtY, this.width, this.height - courtY);
  }

  drawStars() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    // Deterministic stars
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137.5) % this.width);
      const sy = ((i * 89.3) % (this.height * 0.35));
      const flicker = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 0.02 + i));
      ctx.globalAlpha = flicker * 0.7;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  drawStadium(courtY) {
    const ctx = this.ctx;

    // Stadium lights (floodlights)
    const lightPositions = [
      { x: 80, y: courtY - 180 },
      { x: this.width - 80, y: courtY - 180 },
      { x: this.width / 2 - 200, y: courtY - 160 },
      { x: this.width / 2 + 200, y: courtY - 160 }
    ];

    lightPositions.forEach(light => {
      // Light beam
      const beamGrad = ctx.createRadialGradient(light.x, light.y, 5, light.x, light.y, 250);
      beamGrad.addColorStop(0, 'rgba(255,240,200,0.12)');
      beamGrad.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(light.x, light.y);
      ctx.lineTo(light.x - 120, courtY);
      ctx.lineTo(light.x + 120, courtY);
      ctx.closePath();
      ctx.fill();

      // Light source
      ctx.fillStyle = 'rgba(255,245,200,0.9)';
      ctx.beginPath();
      ctx.arc(light.x, light.y, 6, 0, Math.PI * 2);
      ctx.fill();

      const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 30);
      glow.addColorStop(0, 'rgba(255,245,200,0.6)');
      glow.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 30, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crowd silhouettes
    const colors = this.courtColors[this.courtType];
    ctx.fillStyle = 'rgba(20,20,40,0.9)';
    ctx.fillRect(0, courtY - 50, this.width, 55);

    // Random crowd heads
    for (let i = 0; i < 120; i++) {
      const cx = (i * 17) % this.width;
      const cy = courtY - 20 - ((i * 7) % 30);
      const bobble = Math.sin(this.time * 0.05 + i * 0.3) * 1.5;
      const hue = (i * 47) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, ${30 + (i % 20)}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy + bobble, 5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // =============================================
  // COURT
  // =============================================
  drawCourt(courtY, courtLeft, courtRight, netX, netHeight) {
    const ctx = this.ctx;
    const colors = this.courtColors[this.courtType];
    const courtWidth = courtRight - courtLeft;

    // Main court surface with perspective
    const courtGrad = ctx.createLinearGradient(0, courtY, 0, courtY + this.height * 0.3);
    courtGrad.addColorStop(0, colors.main);
    courtGrad.addColorStop(1, colors.shadow);
    ctx.fillStyle = courtGrad;
    ctx.fillRect(courtLeft, courtY, courtWidth, this.height - courtY);

    // Court texture lines
    if (this.courtType === 'clay') {
      ctx.strokeStyle = 'rgba(180,100,50,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(courtLeft, courtY + i * 12);
        ctx.lineTo(courtRight, courtY + i * 12);
        ctx.stroke();
      }
    } else if (this.courtType === 'grass') {
      for (let i = 0; i < courtWidth; i += 40) {
        const shade = i % 80 === 0 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)';
        ctx.fillStyle = shade;
        ctx.fillRect(courtLeft + i, courtY, 40, this.height - courtY);
      }
    }

    // Court lines
    ctx.strokeStyle = colors.lines;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = colors.lines;
    ctx.shadowBlur = 4;

    // Baseline (back)
    ctx.beginPath();
    ctx.moveTo(courtLeft + 20, courtY + 4);
    ctx.lineTo(courtRight - 20, courtY + 4);
    ctx.stroke();

    // Service boxes
    const serviceLeft = courtLeft + 20;
    const serviceRight = courtRight - 20;
    const centerY = courtY + 4;

    // Left service box
    ctx.beginPath();
    ctx.moveTo(serviceLeft, centerY);
    ctx.lineTo(serviceLeft, courtY + 80);
    ctx.moveTo(serviceLeft, courtY + 80);
    ctx.lineTo(netX, courtY + 80);
    ctx.stroke();

    // Right service box  
    ctx.beginPath();
    ctx.moveTo(serviceRight, centerY);
    ctx.lineTo(serviceRight, courtY + 80);
    ctx.moveTo(serviceRight, courtY + 80);
    ctx.lineTo(netX, courtY + 80);
    ctx.stroke();

    // Center service line
    ctx.beginPath();
    ctx.moveTo(netX, centerY);
    ctx.lineTo(netX, courtY + 80);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Player movement zones (visual guides)
    this.drawPlayerZones(courtY, courtLeft, courtRight, netX);

    // NET
    this.drawNet(netX, courtY, netHeight);

    // Court edge glow
    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(courtLeft + 20, courtY, courtWidth - 40, 4);
  }

  drawPlayerZones(courtY, courtLeft, courtRight, netX) {
    const ctx = this.ctx;
    const top = courtY + 8;
    const zoneHeight = 94;
    const margin = 24;

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.2;

    // Player 1 zone
    const p1x = courtLeft + margin;
    const p1w = (netX - 20) - p1x;
    ctx.fillStyle = 'rgba(0,191,255,0.06)';
    ctx.strokeStyle = 'rgba(0,191,255,0.5)';
    ctx.fillRect(p1x, top, p1w, zoneHeight);
    ctx.strokeRect(p1x, top, p1w, zoneHeight);

    // Player 2 zone
    const p2x = netX + 20;
    const p2w = (courtRight - margin) - p2x;
    ctx.fillStyle = 'rgba(255,107,53,0.06)';
    ctx.strokeStyle = 'rgba(255,107,53,0.5)';
    ctx.fillRect(p2x, top, p2w, zoneHeight);
    ctx.strokeRect(p2x, top, p2w, zoneHeight);

    ctx.setLineDash([]);
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('ZONE P1', p1x + p1w / 2, top + zoneHeight + 14);
    ctx.fillText('ZONE P2', p2x + p2w / 2, top + zoneHeight + 14);
    ctx.restore();
  }

  drawNet(netX, courtY, netHeight) {
    const ctx = this.ctx;
    const netTop = courtY - netHeight;

    // Net post left
    ctx.fillStyle = '#888';
    ctx.fillRect(netX - 25, netTop - 10, 8, netHeight + 10);
    ctx.fillRect(netX + 17, netTop - 10, 8, netHeight + 10);

    // Net mesh
    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 1;
    const cols = 16;
    const colW = 50 / cols;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(netX - 25 + i * colW * 50/16, netTop);
      ctx.lineTo(netX - 25 + i * colW * 50/16, courtY);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(netX - 25, netTop + i * (netHeight / 8));
      ctx.lineTo(netX + 25, netTop + i * (netHeight / 8));
      ctx.stroke();
    }

    // Net top band
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(netX - 26, netTop - 4, 52, 8);

    // Net glow
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(netX - 25, netTop);
    ctx.lineTo(netX + 25, netTop);
    ctx.stroke();

    // Center strap (sangle du filet)
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(netX - 2, netTop + 2, 4, netHeight - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(netX, netTop + 2);
    ctx.lineTo(netX, courtY - 1);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // =============================================
  // PLAYER RENDERING
  // =============================================
  drawShadow(player, courtY) {
    const ctx = this.ctx;
    const shadowY = courtY;
    const shadowX = player.x;
    const heightAbove = courtY - (player.y + player.height);
    const shadowScale = 1 - Math.min(0.6, heightAbove / 300);
    const shadowAlpha = 0.3 * shadowScale;

    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY, 25 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    const { x, y, height, width, character, isSwinging, swingAngle, direction, isJumping, frame, swingType } = player;

    ctx.save();
    ctx.translate(x, y + height / 2);
    if (direction < 0) ctx.scale(-1, 1);

    const mainColor = character.color;
    const secColor = character.secondary;

    // BODY SHADOW
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(-width / 2 + 3, -height / 2 + 3, width, height);
    ctx.globalAlpha = 1;

    // LEGS
    const legBob = isJumping ? 0 : Math.sin(frame * 1.5) * 6;
    // Left leg
    ctx.fillStyle = mainColor;
    ctx.fillRect(-14, 8, 12, 26 + legBob);
    // Right leg
    ctx.fillRect(2, 8, 12, 26 - legBob);
    // Shoes
    ctx.fillStyle = '#222';
    ctx.fillRect(-16, 32 + legBob, 15, 6);
    ctx.fillRect(0, 32 - legBob, 15, 6);

    // BODY
    const bodyGrad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    bodyGrad.addColorStop(0, mainColor);
    bodyGrad.addColorStop(1, secColor);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-14, -20, 28, 30, 4);
    ctx.fill();

    // Jersey stripes
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-8, -18, 4, 28);
    ctx.fillRect(4, -18, 4, 28);

    // HEAD
    const headY = -38;
    ctx.fillStyle = '#FDBCB4'; // Skin
    ctx.beginPath();
    ctx.arc(0, headY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.arc(0, headY - 4, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-12, headY - 8, 24, 6);

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-7, headY - 2, 5, 4);
    ctx.fillRect(2, headY - 2, 5, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(-6, headY - 1, 3, 3);
    ctx.fillRect(3, headY - 1, 3, 3);

    // Headband
    ctx.fillStyle = secColor;
    ctx.fillRect(-13, headY - 10, 26, 5);

    // RACKET ARM
    ctx.save();
    if (isSwinging) {
      ctx.rotate((swingAngle * Math.PI) / 180);
    } else {
      ctx.rotate(0.3);
    }

    // Arm
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(8, -18, 8, 22);

    // Racket handle
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(14, -4, 6, 20);

    // Racket head
    const racketGlow = swingType === 'power' && isSwinging;
    if (racketGlow) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(200,200,200,0.3)';
    ctx.beginPath();
    ctx.ellipse(22, -20, 12, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Racket strings
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 3.5, -36);
      ctx.lineTo(22 + i * 3.5, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -20 + i * 4);
      ctx.lineTo(34, -20 + i * 4);
      ctx.stroke();
    }

    if (racketGlow) ctx.shadowBlur = 0;
    ctx.restore();

    // Player name tag
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(-30, -height / 2 - 22, 60, 16, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = mainColor;
    ctx.font = 'bold 9px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(character.name.split(' ')[1] || character.name, 0, -height / 2 - 10);

    ctx.restore();
  }

  // =============================================
  // BALL
  // =============================================
  drawBallTrail(ball) {
    const ctx = this.ctx;
    ball.trail.forEach((pos, i) => {
      const alpha = (i / ball.trail.length) * 0.5;
      const size = (i / ball.trail.length) * ball.radius * 0.8;
      ctx.globalAlpha = alpha;
      if (pos.power) {
        ctx.fillStyle = '#FF4400';
        ctx.shadowColor = '#FF4400';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#FFFF88';
        ctx.shadowColor = '#FFFF88';
        ctx.shadowBlur = 5;
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawBallShadow(ball, courtY) {
    const ctx = this.ctx;
    const heightAbove = courtY - ball.y;
    const scale = Math.max(0.2, 1 - heightAbove / 400);
    ctx.globalAlpha = 0.25 * scale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(ball.x, courtY, 10 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawBall(ball) {
    const ctx = this.ctx;

    const isPower = ball.powerShot;

    if (isPower) {
      // Power aura
      ctx.shadowColor = '#FF3300';
      ctx.shadowBlur = 25;
      const auraGrad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 28);
      auraGrad.addColorStop(0, 'rgba(255,80,0,0.4)');
      auraGrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tennis ball
    const ballGrad = ctx.createRadialGradient(
      ball.x - 3, ball.y - 3, 1,
      ball.x, ball.y, ball.radius
    );
    ballGrad.addColorStop(0, isPower ? '#FFAA00' : '#CCFF00');
    ballGrad.addColorStop(0.6, isPower ? '#FF6600' : '#99CC00');
    ballGrad.addColorStop(1, isPower ? '#CC3300' : '#669900');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Seam
    ctx.strokeStyle = isPower ? 'rgba(255,255,200,0.7)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.7, -0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // =============================================
  // PARTICLES
  // =============================================
  spawnHitParticles(x, y, isPower, color) {
    const count = isPower ? 24 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = isPower ? 3 + Math.random() * 6 : 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1.0,
        decay: isPower ? 0.03 : 0.05,
        size: isPower ? 4 + Math.random() * 4 : 2 + Math.random() * 2,
        color: isPower ? `hsl(${30 + Math.random() * 30}, 100%, 60%)` : color
      });
    }

    if (isPower) {
      // Shockwave
      this.effects.push({ type: 'shockwave', x, y, radius: 0, maxRadius: 80, life: 1.0 });
    }
  }

  spawnBounceParticles(x, y, courtType) {
    const dustColors = { clay: '#C25A2A', hard: '#4A90D9', grass: '#4CAF50' };
    const color = dustColors[courtType] || '#888';
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3,
        life: 1.0,
        decay: 0.07,
        size: 3 + Math.random() * 3,
        color
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;
      return p.life > 0;
    });

    this.effects = this.effects.filter(e => {
      if (e.type === 'shockwave') {
        e.radius += 5;
        e.life -= 0.06;
      }
      return e.life > 0;
    });
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  drawEffects() {
    const ctx = this.ctx;
    this.effects.forEach(e => {
      if (e.type === 'shockwave') {
        ctx.globalAlpha = e.life * 0.6;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
    ctx.globalAlpha = 1;
  }

  // =============================================
  // HUD
  // =============================================
  drawHUD(score, player1, player2) {
    const ctx = this.ctx;
    const cx = this.width / 2;

    // Scoreboard background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.roundRect(cx - 160, 8, 320, 68, 10);
    ctx.fill();

    // Border glow
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 160, 8, 320, 68, 10);
    ctx.stroke();

    // Player 1 name
    ctx.fillStyle = player1.character.color;
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(player1.character.name, cx - 150, 26);
    ctx.fillStyle = '#888';
    ctx.font = '9px "Courier New"';
    ctx.fillText(player1.character.country, cx - 150, 38);

    // Player 2 name
    ctx.fillStyle = player2.character.color;
    ctx.font = 'bold 11px "Courier New"';
    ctx.textAlign = 'right';
    ctx.fillText(player2.character.name, cx + 150, 26);
    ctx.fillStyle = '#888';
    ctx.font = '9px "Courier New"';
    ctx.fillText(player2.character.country, cx + 150, 38);

    // Score
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(`${score.p1}`, cx - 50, 58);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px "Courier New"';
    ctx.fillText('VS', cx, 55);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Courier New"';
    ctx.fillText(`${score.p2}`, cx + 50, 58);

    // Sets
    ctx.fillStyle = '#AAA';
    ctx.font = '9px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText(`Sets: ${score.sets1}`, cx - 155, 70);
    ctx.textAlign = 'right';
    ctx.fillText(`Sets: ${score.sets2}`, cx + 155, 70);

    // Stamina bars
    this.drawStaminaBar(20, 10, player1);
    this.drawStaminaBar(this.width - 120, 10, player2);

    // Special meter
    this.drawSpecialMeter(20, 35, player1);
    this.drawSpecialMeter(this.width - 120, 35, player2);
  }

  drawStaminaBar(x, y, player) {
    const ctx = this.ctx;
    const w = 100, h = 10;
    const pct = player.stamina / 100;
    const color = pct > 0.6 ? '#00FF88' : pct > 0.3 ? '#FFD700' : '#FF4444';

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, (w - 2) * pct, h - 2, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '8px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText('ENDURANCE', x, y - 2);
  }

  drawSpecialMeter(x, y, player) {
    const ctx = this.ctx;
    const w = 100, h = 8;
    const pct = 1 - (player.specialCooldown / player.maxSpecialCooldown);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();

    const specGrad = ctx.createLinearGradient(x, y, x + w, y);
    specGrad.addColorStop(0, '#FFD700');
    specGrad.addColorStop(1, '#FF6600');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, (w - 2) * pct, h - 2, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,200,0,0.8)';
    ctx.font = '8px "Courier New"';
    ctx.textAlign = 'left';
    ctx.fillText('SPECIAL', x, y - 2);
  }

  // =============================================
  // ANNOUNCEMENTS
  // =============================================
  drawAnnouncement(text, subtext, color = '#FFD700') {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(cx - 250, cy - 60, 500, 120, 12);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 250, cy - 60, 500, 120, 12);
    ctx.stroke();

    // Main text
    ctx.fillStyle = color;
    ctx.font = 'bold 42px "Courier New"';
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(text, cx, cy + 10);
    ctx.shadowBlur = 0;

    // Sub text
    if (subtext) {
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '16px "Courier New"';
      ctx.fillText(subtext, cx, cy + 40);
    }
  }
}

// Export
if (typeof module !== 'undefined') module.exports = { Renderer };