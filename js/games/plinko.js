/**
 * Game: Plinko (The Galton Board & Normal Distribution)
 * Features 2D canvas physics (gravity, peg collisions, elasticity),
 * risk profile presets (Low, Medium, High), multi-ball dropping,
 * and an educational live histogram proving the Central Limit Theorem.
 */
class PlinkoGame {
  constructor() {
    this.canvas = document.getElementById('plinkoCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.rows = 12; // 8, 12, or 16
    this.risk = 'medium'; // 'low', 'medium', 'high'
    this.betAmount = 25;

    this.balls = [];
    this.pins = [];
    this.buckets = [];
    this.bucketHits = []; // Track count per bucket for histogram

    this.multipliers = {
      8: {
        low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
        medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
        high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
      },
      12: {
        low: [8.9, 3, 1.4, 1.1, 1.0, 0.5, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
        medium: [25, 8, 3, 1.6, 0.7, 0.4, 0.4, 0.7, 1.6, 3, 8, 25],
        high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
      },
      16: {
        low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
        medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
        high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
      }
    };

    this.animating = false;
    this.init();
  }

  init() {
    this.setupResize();
    this.setupBoard();
    this.bindEvents();
    this.startLoop();
  }

  setupResize() {
    if (!this.canvas) return;
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      if (this.ctx) {
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      this.setupBoard();
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 50);
  }

  setupBoard() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.pins = [];
    const topY = 40;
    const bottomY = h - 65;
    const rowSpacing = (bottomY - topY) / (this.rows + 1);

    for (let r = 0; r < this.rows; r++) {
      const pinCount = r + 3;
      const rowWidth = (pinCount - 1) * (rowSpacing * 1.15);
      const startX = (w - rowWidth) / 2;
      const y = topY + r * rowSpacing;

      for (let p = 0; p < pinCount; p++) {
        this.pins.push({
          x: startX + p * (rowSpacing * 1.15),
          y: y,
          radius: 3.5
        });
      }
    }

    // Buckets at bottom
    this.buckets = [];
    const bucketCount = this.rows + 1;
    const multipliers = this.getCurrentMultipliers();
    const bucketWidth = ((bucketCount + 1) * (rowSpacing * 1.15)) / bucketCount;
    const startBX = (w - bucketWidth * bucketCount) / 2;

    for (let b = 0; b < bucketCount; b++) {
      this.buckets.push({
        x: startBX + b * bucketWidth,
        y: bottomY + 12,
        width: bucketWidth - 4,
        height: 28,
        multiplier: multipliers[b] || 1.0,
        index: b
      });
    }

    if (this.bucketHits.length !== bucketCount) {
      this.bucketHits = new Array(bucketCount).fill(0);
    }
  }

  getCurrentMultipliers() {
    const rowConfig = this.multipliers[this.rows] || this.multipliers[12];
    return rowConfig[this.risk] || rowConfig.medium;
  }

  bindEvents() {
    const drop1Btn = document.getElementById('plinkoDrop1Btn');
    const drop10Btn = document.getElementById('plinkoDrop10Btn');
    const betInput = document.getElementById('plinkoBetInput');

    if (drop1Btn) drop1Btn.addEventListener('click', () => this.dropBall());
    if (drop10Btn) drop10Btn.addEventListener('click', () => this.dropMultiple(10));

    // Risk buttons
    document.querySelectorAll('.plinko-risk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.plinko-risk-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.risk = e.target.dataset.risk;
        this.setupBoard();
        window.soundFx.playClick();
      });
    });

    if (betInput) {
      betInput.addEventListener('change', (e) => {
        this.betAmount = Math.max(1, parseFloat(e.target.value) || 10);
      });
    }

    window.casinoState.subscribe(() => {
      if (betInput) betInput.value = window.casinoState.selectedChip;
      this.betAmount = window.casinoState.selectedChip;
    });
  }

  dropMultiple(count = 10) {
    let dropped = 0;
    const interval = setInterval(() => {
      if (dropped < count) {
        this.dropBall();
        dropped++;
      } else {
        clearInterval(interval);
      }
    }, 180);
  }

  dropBall() {
    if (!window.casinoState.canAfford(this.betAmount)) {
      window.casinoState.showToast('Insufficient bankroll! Use Faucet.', 'loss');
      return;
    }

    window.casinoState.deductBet(this.betAmount, 'plinko');

    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const startX = w / 2 + (Math.random() * 6 - 3);

    this.balls.push({
      x: startX,
      y: 15,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.0,
      radius: 6,
      bet: this.betAmount,
      bounces: 0
    });
  }

  startLoop() {
    if (this.animating) return;
    this.animating = true;

    const loop = () => {
      this.updatePhysics();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updatePhysics() {
    const gravity = 0.22;
    const bounceLoss = 0.58;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.vy += gravity;
      b.x += b.vx;
      b.y += b.vy;

      // Peg collisions
      for (const pin of this.pins) {
        const dx = b.x - pin.x;
        const dy = b.y - pin.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b.radius + pin.radius) {
          // Normalize
          const nx = dx / dist;
          const ny = dy / dist;

          // Elastic bounce
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * bounceLoss + (Math.random() - 0.5) * 0.4;
          b.vy = (b.vy - 2 * dot * ny) * bounceLoss;

          // Push out of pin
          b.x = pin.x + nx * (b.radius + pin.radius + 0.5);
          b.y = pin.y + ny * (b.radius + pin.radius + 0.5);

          b.bounces++;
          if (Math.random() > 0.4) {
            window.soundFx.playPlinkoBounce(b.bounces);
          }
        }
      }

      // Check Bucket Collision at bottom
      for (const bucket of this.buckets) {
        if (
          b.y + b.radius >= bucket.y &&
          b.x >= bucket.x &&
          b.x <= bucket.x + bucket.width
        ) {
          // Landed!
          this.handleBucketHit(b, bucket);
          this.balls.splice(i, 1);
          break;
        }
      }

      // Offscreen cleanup
      if (b.y > this.canvas.parentElement.getBoundingClientRect().height + 40) {
        this.balls.splice(i, 1);
      }
    }
  }

  handleBucketHit(ball, bucket) {
    const mult = bucket.multiplier;
    const payout = ball.bet * mult;

    this.bucketHits[bucket.index] = (this.bucketHits[bucket.index] || 0) + 1;

    if (mult >= 1.0) {
      window.casinoState.addPayout(payout, ball.bet, 'plinko');
      window.soundFx.playWin();
      window.casinoState.showToast(`Plinko Hit ${mult}x! Payout: +$${payout.toFixed(2)}`, 'win');
    } else {
      window.casinoState.addPayout(payout, ball.bet, 'plinko');
      window.soundFx.playCrash();
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    // Draw Pins
    for (const pin of this.pins) {
      this.ctx.beginPath();
      this.ctx.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;

    // Draw Buckets with Multipliers
    for (const b of this.buckets) {
      let bucketColor = '#10b981'; // green for 1x-2x
      if (b.multiplier >= 10) bucketColor = '#ef4444'; // high red
      else if (b.multiplier > 2) bucketColor = '#f59e0b'; // mid gold
      else if (b.multiplier < 1) bucketColor = '#64748b'; // low grey

      this.ctx.fillStyle = bucketColor;
      this.ctx.beginPath();
      this.ctx.roundRect(b.x, b.y, b.width, b.height, 4);
      this.ctx.fill();

      // Multiplier Text
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${b.multiplier}x`, b.x + b.width / 2, b.y + b.height / 2);

      // Hit count indicator
      const hits = this.bucketHits[b.index] || 0;
      if (hits > 0) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.font = '8px "Plus Jakarta Sans", sans-serif';
        this.ctx.fillText(`${hits}`, b.x + b.width / 2, b.y + b.height + 10);
      }
    }

    // Draw Balls
    for (const b of this.balls) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#06b6d4';
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 12;
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
  }
}

window.plinkoGame = null;
