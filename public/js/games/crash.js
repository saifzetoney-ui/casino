/**
 * Game: Crash (Aviator / Rocket Multiplier)
 * Features canvas rocket trajectory, particle thrust, provably fair crash generator,
 * live survival probability display, and educational Expected Value breakdown.
 */
class CrashGame {
  constructor() {
    this.canvas = document.getElementById('crashCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    this.state = 'idle'; // 'idle', 'running', 'crashed'
    this.multiplier = 1.00;
    this.crashPoint = 1.00;
    this.betAmount = 25;
    this.autoCashout = 2.00;
    this.hasBet = false;
    this.cashedOut = false;
    this.cashoutMultiplier = 0;
    this.startTime = null;
    this.particles = [];
    this.stars = [];
    this.history = [1.84, 1.12, 4.35, 1.02, 2.10, 14.50, 1.45];
    this.animId = null;

    this.init();
  }

  init() {
    this.setupResize();
    this.initStars();
    this.renderHistory();
    this.bindEvents();
    this.drawIdle();
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
      if (this.state === 'idle') this.drawIdle();
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 50);
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  bindEvents() {
    const startBtn = document.getElementById('crashActionBtn');
    const cashoutBtn = document.getElementById('crashCashoutBtn');
    const betInput = document.getElementById('crashBetInput');
    const autoInput = document.getElementById('crashAutoInput');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startRound());
    }
    if (cashoutBtn) {
      cashoutBtn.addEventListener('click', () => this.cashout());
    }
    if (betInput) {
      betInput.addEventListener('change', (e) => {
        this.betAmount = Math.max(1, parseFloat(e.target.value) || 10);
        this.updateMathOdds();
      });
    }
    if (autoInput) {
      autoInput.addEventListener('change', (e) => {
        this.autoCashout = Math.max(1.01, parseFloat(e.target.value) || 2.0);
        this.updateMathOdds();
      });
    }

    // Connect to global state chip clicks
    window.casinoState.subscribe(() => {
      if (this.state === 'idle' && !this.hasBet) {
        if (betInput) betInput.value = window.casinoState.selectedChip;
        this.betAmount = window.casinoState.selectedChip;
        this.updateMathOdds();
      }
    });
  }

  async calculateProvablyFairCrash() {
    // 3% house edge: Formula is: Multiplier = 0.97 / (1 - randomFloat)
    // If randomFloat < 0.03 -> instant crash at 1.00x!
    const provable = await window.casinoState.getNextProvableOutcome();
    const r = provable.float;
    const houseEdge = 0.03; // 3%
    
    if (r < houseEdge) {
      return 1.00;
    }

    const rawMultiplier = (1 - houseEdge) / (1 - r);
    // Round down to 2 decimal places
    const finalCrash = Math.max(1.00, Math.floor(rawMultiplier * 100) / 100);
    return Math.min(finalCrash, 500.00); // capped at 500x for simulator
  }

  async startRound() {
    if (this.state === 'running') return;

    if (!window.casinoState.canAfford(this.betAmount)) {
      window.casinoState.showToast('Insufficient bankroll! Use the Faucet to top up.', 'loss');
      return;
    }

    window.casinoState.deductBet(this.betAmount, 'crash');
    this.hasBet = true;
    this.cashedOut = false;
    this.state = 'running';
    this.multiplier = 1.00;
    this.particles = [];
    this.crashPoint = await this.calculateProvablyFairCrash();
    this.startTime = performance.now();

    window.soundFx.playCard();

    // UI Updates
    document.getElementById('crashActionBtn').style.display = 'none';
    const cashoutBtn = document.getElementById('crashCashoutBtn');
    cashoutBtn.style.display = 'flex';
    cashoutBtn.disabled = false;
    document.getElementById('crashLiveLabel').textContent = 'ROCKET IN FLIGHT';
    document.getElementById('crashLiveLabel').className = 'crash-state-label';
    document.getElementById('crashLiveMult').className = 'crash-live-multiplier';

    this.runLoop();
  }

  cashout() {
    if (this.state !== 'running' || this.cashedOut) return;

    this.cashedOut = true;
    this.cashoutMultiplier = this.multiplier;
    const winAmount = this.betAmount * this.cashoutMultiplier;
    const profit = winAmount - this.betAmount;

    window.casinoState.addPayout(winAmount, this.betAmount, 'crash');
    window.soundFx.playWin();
    window.casinoState.showToast(`Cashed out at ${this.cashoutMultiplier.toFixed(2)}x! Profit: +$${profit.toFixed(2)}`, 'win');

    const cashoutBtn = document.getElementById('crashCashoutBtn');
    cashoutBtn.disabled = true;
    cashoutBtn.textContent = `Cashed Out (${this.cashoutMultiplier.toFixed(2)}x)`;
  }

  runLoop() {
    if (this.state !== 'running') return;

    const elapsedSec = (performance.now() - this.startTime) / 1000;
    // Exponential growth curve: M(t) = 1.0 + 0.08 * t + 0.05 * t^2
    this.multiplier = 1.00 + (0.12 * elapsedSec) + (0.07 * Math.pow(elapsedSec, 2));

    // Check auto cashout
    if (this.hasBet && !this.cashedOut && this.autoCashout && this.multiplier >= this.autoCashout && this.autoCashout <= this.crashPoint) {
      this.multiplier = this.autoCashout;
      this.cashout();
    }

    // Check if crashed
    if (this.multiplier >= this.crashPoint) {
      this.multiplier = this.crashPoint;
      this.triggerCrash();
      return;
    }

    this.updateLiveUI();
    this.drawRunning();
    this.animId = requestAnimationFrame(() => this.runLoop());
  }

  triggerCrash() {
    this.state = 'crashed';
    window.soundFx.playCrash();

    // Spawn explosion particles
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const { x, y } = this.getRocketPos(w, h);

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: Math.random() > 0.5 ? '#f43f5e' : '#fbbf24',
        size: Math.random() * 4 + 2
      });
    }

    // Animate crash explosion
    this.drawCrashed();

    // UI Updates
    const multEl = document.getElementById('crashLiveMult');
    multEl.textContent = `${this.crashPoint.toFixed(2)}x`;
    multEl.className = 'crash-live-multiplier crashed';

    const labelEl = document.getElementById('crashLiveLabel');
    labelEl.textContent = 'CRASHED';
    labelEl.className = 'crash-state-label crashed';

    if (!this.cashedOut && this.hasBet) {
      window.casinoState.addPayout(0, this.betAmount, 'crash');
      window.casinoState.showToast(`Crashed at ${this.crashPoint.toFixed(2)}x! Lost $${this.betAmount.toFixed(2)}`, 'loss');
    }

    // Record history
    this.history.unshift(this.crashPoint);
    if (this.history.length > 10) this.history.pop();
    this.renderHistory();

    // Reset controls after 2.5s
    setTimeout(() => {
      this.state = 'idle';
      this.hasBet = false;
      this.cashedOut = false;
      document.getElementById('crashActionBtn').style.display = 'flex';
      document.getElementById('crashCashoutBtn').style.display = 'none';
      document.getElementById('crashCashoutBtn').textContent = 'CASHOUT';
      labelEl.textContent = 'READY FOR NEXT ROUND';
      labelEl.className = 'crash-state-label';
      this.drawIdle();
    }, 2500);
  }

  updateLiveUI() {
    const multEl = document.getElementById('crashLiveMult');
    multEl.textContent = `${this.multiplier.toFixed(2)}x`;

    const cashoutBtn = document.getElementById('crashCashoutBtn');
    if (this.hasBet && !this.cashedOut && cashoutBtn) {
      const liveWin = (this.betAmount * this.multiplier).toFixed(2);
      cashoutBtn.textContent = `CASHOUT $${liveWin}`;
    }

    this.updateMathOdds();
  }

  updateMathOdds() {
    const probSurvive = Math.min(100, Math.max(0, (0.97 / (this.state === 'running' ? this.multiplier : this.autoCashout)) * 100));
    const probEl = document.getElementById('crashSurvivalProb');
    if (probEl) probEl.textContent = `${probSurvive.toFixed(1)}%`;

    const evEl = document.getElementById('crashLiveEV');
    if (evEl) {
      // Expected Value of crash round = Bet * 0.97 - Bet = -3% EV
      const evVal = -1 * this.betAmount * 0.03;
      evEl.textContent = `-$${Math.abs(evVal).toFixed(2)} (-3.0% House Edge)`;
    }
  }

  getRocketPos(w, h) {
    const padX = 50;
    const padY = 50;
    const maxProg = 10; // 10s reach top right
    const elapsed = this.startTime ? (performance.now() - this.startTime) / 1000 : 0;
    const prog = Math.min(1, elapsed / maxProg);

    const x = padX + prog * (w - padX * 2);
    const y = (h - padY) - Math.pow(prog, 1.3) * (h - padY * 2);
    return { x, y };
  }

  drawGrid(w, h) {
    this.ctx.clearRect(0, 0, w, h);

    // Starfield background
    this.ctx.fillStyle = '#fff';
    for (const star of this.stars) {
      this.ctx.globalAlpha = star.alpha;
      this.ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
    }
    this.ctx.globalAlpha = 1.0;

    // Grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 60; x < w; x += 80) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 40; y < h - 40; y += 60) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }
  }

  drawIdle() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.drawGrid(w, h);
  }

  drawRunning() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.drawGrid(w, h);

    const rocket = this.getRocketPos(w, h);

    // Spawn engine particles
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: rocket.x - 12 + (Math.random() * 4 - 2),
        y: rocket.y + 12 + (Math.random() * 4 - 2),
        vx: -Math.random() * 3 - 1,
        vy: Math.random() * 3 + 1,
        life: 1.0,
        size: Math.random() * 3 + 2,
        color: Math.random() > 0.4 ? '#06b6d4' : '#fbbf24'
      });
    }

    // Draw trajectory curve
    this.ctx.save();
    this.ctx.strokeStyle = '#06b6d4';
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.moveTo(50, h - 50);
    this.ctx.quadraticCurveTo(50 + (rocket.x - 50) * 0.6, h - 50, rocket.x, rocket.y);
    this.ctx.stroke();
    this.ctx.restore();

    // Draw glowing area under curve
    this.ctx.save();
    const grad = this.ctx.createLinearGradient(0, rocket.y, 0, h - 50);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.moveTo(50, h - 50);
    this.ctx.quadraticCurveTo(50 + (rocket.x - 50) * 0.6, h - 50, rocket.x, rocket.y);
    this.ctx.lineTo(rocket.x, h - 50);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // Draw Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // Draw Rocket Icon
    this.ctx.save();
    this.ctx.translate(rocket.x, rocket.y);
    this.ctx.rotate(Math.PI / 4); // 45 degree angle

    // Rocket body
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rocket fin
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -7);
    this.ctx.lineTo(-18, -12);
    this.ctx.lineTo(-14, 0);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-10, 7);
    this.ctx.lineTo(-18, 12);
    this.ctx.lineTo(-14, 0);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawCrashed() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.drawGrid(w, h);

    // Animate remaining explosion particles
    let activeParticles = false;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      activeParticles = true;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    if (activeParticles && this.state === 'crashed') {
      requestAnimationFrame(() => this.drawCrashed());
    }
  }

  renderHistory() {
    const bar = document.getElementById('crashHistoryBar');
    if (!bar) return;
    bar.innerHTML = '';
    this.history.forEach(m => {
      const pill = document.createElement('div');
      let type = 'low';
      if (m >= 10.0) type = 'moon';
      else if (m >= 3.0) type = 'high';
      else if (m >= 1.8) type = 'mid';

      pill.className = `crash-pill ${type}`;
      pill.textContent = `${m.toFixed(2)}x`;
      bar.appendChild(pill);
    });
  }
}

window.crashGame = null;
