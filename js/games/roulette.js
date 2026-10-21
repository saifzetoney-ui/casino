/**
 * Game: European vs American Roulette
 * Features canvas physics wheel, ball deceleration, audio fret clicks,
 * interactive betting felt board, and direct European (2.7% edge) vs American (5.26% edge) comparison.
 */
class RouletteGame {
  constructor() {
    this.canvas = document.getElementById('rouletteCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.mode = 'european'; // 'european' (37 pockets) or 'american' (38 pockets)
    this.isSpinning = false;
    this.wheelAngle = 0;
    this.ballAngle = 0;
    this.ballRadius = 0;
    this.wheelSpeed = 0;
    this.ballSpeed = 0;
    this.winningNumber = null;

    // Bets: Map of betKey -> amount
    // Keys: 'num_0', 'num_00', 'num_1'..'num_36', 'red', 'black', 'even', 'odd', 'low', 'high', 'doc_1', 'doc_2', 'doc_3'
    this.activeBets = {};
    this.totalWagered = 0;

    // European sequence (Single zero)
    this.euNumbers = [
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
      5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // American sequence (0 and 00)
    this.usNumbers = [
      0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
      '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
    ];

    this.redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

    this.init();
  }

  init() {
    this.setupResize();
    this.bindEvents();
    this.drawWheel();
    this.updateStatsUI();
  }

  setupResize() {
    if (!this.canvas) return;
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      if (this.ctx) {
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      this.drawWheel();
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 50);
  }

  getPocketArray() {
    return this.mode === 'european' ? this.euNumbers : this.usNumbers;
  }

  getColor(num) {
    if (num === 0 || num === '00') return '#15803d'; // Green
    if (this.redNumbers.has(parseInt(num))) return '#b91c1c'; // Red
    return '#1f2937'; // Black
  }

  setMode(newMode) {
    if (this.isSpinning) return;
    this.mode = newMode;
    this.clearBets();

    // Toggle 00 visibility on felt
    const cell00 = document.getElementById('rouletteCell00');
    if (cell00) {
      cell00.style.display = newMode === 'american' ? 'grid' : 'none';
    }

    // Toggle mode buttons
    document.querySelectorAll('.roulette-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    this.drawWheel();
    this.updateStatsUI();
    window.soundFx.playClick();
  }

  bindEvents() {
    // Mode toggles
    document.querySelectorAll('.roulette-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setMode(e.target.dataset.mode));
    });

    // Spin Button
    const spinBtn = document.getElementById('rouletteSpinBtn');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => this.spin());
    }

    // Clear Bets Button
    const clearBtn = document.getElementById('rouletteClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearBets());
    }

    // Betting Table Clicks (delegation)
    const feltBoard = document.getElementById('rouletteFeltBoard');
    if (feltBoard) {
      feltBoard.addEventListener('click', (e) => {
        if (this.isSpinning) return;
        const target = e.target.closest('[data-bet-type]');
        if (!target) return;

        const betKey = target.dataset.betType;
        const chipVal = window.casinoState.selectedChip;

        if (!window.casinoState.canAfford(this.totalWagered + chipVal)) {
          window.casinoState.showToast('Insufficient bankroll for this bet!', 'loss');
          return;
        }

        this.activeBets[betKey] = (this.activeBets[betKey] || 0) + chipVal;
        this.totalWagered += chipVal;

        target.classList.add('has-bet');
        target.setAttribute('data-bet', `$${this.activeBets[betKey]}`);

        window.soundFx.playChip();
        this.updateStatsUI();
      });
    }
  }

  clearBets() {
    if (this.isSpinning) return;
    this.activeBets = {};
    this.totalWagered = 0;

    document.querySelectorAll('#rouletteFeltBoard [data-bet-type]').forEach(el => {
      el.classList.remove('has-bet');
      el.removeAttribute('data-bet');
    });

    this.updateStatsUI();
  }

  updateStatsUI() {
    const totalWageredEl = document.getElementById('rouletteTotalBet');
    if (totalWageredEl) totalWageredEl.textContent = `$${this.totalWagered.toFixed(2)}`;

    const edgeEl = document.getElementById('rouletteEdgeDisplay');
    const edge = this.mode === 'european' ? '2.70%' : '5.26%';
    if (edgeEl) edgeEl.textContent = edge;

    const evEl = document.getElementById('rouletteEVDisplay');
    if (evEl) {
      const edgePct = this.mode === 'european' ? 0.0270 : 0.0526;
      const evVal = -1 * this.totalWagered * edgePct;
      evEl.textContent = `-$${Math.abs(evVal).toFixed(2)} (-${edge})`;
    }
  }

  async spin() {
    if (this.isSpinning) return;

    if (this.totalWagered <= 0) {
      window.casinoState.showToast('Please place a bet on the felt table first!', 'info');
      return;
    }

    if (!window.casinoState.deductBet(this.totalWagered, 'roulette')) {
      window.casinoState.showToast('Insufficient funds to complete this spin!', 'loss');
      return;
    }

    this.isSpinning = true;
    document.getElementById('rouletteSpinBtn').disabled = true;
    document.getElementById('rouletteClearBtn').disabled = true;

    // Determine provably fair winning number
    const pockets = this.getPocketArray();
    const outcome = await window.casinoState.getNextProvableOutcome();
    const winningIndex = Math.floor(outcome.float * pockets.length);
    this.winningNumber = pockets[winningIndex];

    // Physics parameters for realistic spin
    const baseW = 140; // canvas half width
    this.ballRadius = baseW * 0.88;
    this.wheelSpeed = 0.18 + Math.random() * 0.04;
    this.ballSpeed = -(0.32 + Math.random() * 0.05); // Spins counter to wheel
    
    let lastTickAngle = this.ballAngle;
    const startTime = performance.now();
    const duration = 5500; // 5.5s spin

    const animate = (time) => {
      const elapsed = time - startTime;
      const prog = Math.min(1, elapsed / duration);

      // Decelerate wheel and ball smoothly
      this.wheelSpeed *= 0.992;
      this.ballSpeed *= 0.988;

      this.wheelAngle += this.wheelSpeed;
      this.ballAngle += this.ballSpeed;

      // Ball drops inward as it slows down
      if (prog > 0.6) {
        const dropProg = (prog - 0.6) / 0.4;
        this.ballRadius = baseW * 0.88 - dropProg * (baseW * 0.22);
      }

      // Play tick sound when ball crosses pockets
      if (Math.abs(this.ballAngle - lastTickAngle) > (Math.PI * 2 / pockets.length)) {
        if (Math.random() > 0.3) window.soundFx.playRouletteTick();
        lastTickAngle = this.ballAngle;
      }

      this.drawWheel();

      if (prog < 1) {
        requestAnimationFrame(animate);
      } else {
        this.finishSpin();
      }
    };

    requestAnimationFrame(animate);
  }

  finishSpin() {
    this.isSpinning = false;
    document.getElementById('rouletteSpinBtn').disabled = false;
    document.getElementById('rouletteClearBtn').disabled = false;

    const winNum = this.winningNumber;
    const color = this.getColor(winNum);
    const colorName = winNum === 0 || winNum === '00' ? 'Green' : (this.redNumbers.has(parseInt(winNum)) ? 'Red' : 'Black');

    // Calculate payouts
    let totalPayout = 0;
    const pocketsCount = this.mode === 'european' ? 37 : 38;

    for (const [key, bet] of Object.entries(this.activeBets)) {
      if (key === `num_${winNum}`) {
        // Straight up: 35 to 1 payout (returns 36x)
        totalPayout += bet * 36;
      } else if (key === 'red' && colorName === 'Red') {
        totalPayout += bet * 2;
      } else if (key === 'black' && colorName === 'Black') {
        totalPayout += bet * 2;
      } else if (key === 'even' && typeof winNum === 'number' && winNum > 0 && winNum % 2 === 0) {
        totalPayout += bet * 2;
      } else if (key === 'odd' && typeof winNum === 'number' && winNum % 2 !== 0) {
        totalPayout += bet * 2;
      } else if (key === 'low' && typeof winNum === 'number' && winNum >= 1 && winNum <= 18) {
        totalPayout += bet * 2;
      } else if (key === 'high' && typeof winNum === 'number' && winNum >= 19 && winNum <= 36) {
        totalPayout += bet * 2;
      } else if (key === 'doc_1' && typeof winNum === 'number' && winNum >= 1 && winNum <= 12) {
        totalPayout += bet * 3;
      } else if (key === 'doc_2' && typeof winNum === 'number' && winNum >= 13 && winNum <= 24) {
        totalPayout += bet * 3;
      } else if (key === 'doc_3' && typeof winNum === 'number' && winNum >= 25 && winNum <= 36) {
        totalPayout += bet * 3;
      }
    }

    const resultBanner = document.getElementById('rouletteResultBanner');
    if (resultBanner) {
      resultBanner.innerHTML = `Landed on <strong style="color: ${color}">${winNum} (${colorName})</strong>`;
    }

    if (totalPayout > 0) {
      window.casinoState.addPayout(totalPayout, this.totalWagered, 'roulette');
      window.soundFx.playWin();
      window.casinoState.showToast(`Roulette Win! Landed on ${winNum} (${colorName}). Won +$${totalPayout.toFixed(2)}`, 'win');
    } else {
      window.casinoState.addPayout(0, this.totalWagered, 'roulette');
      window.soundFx.playCrash();
      window.casinoState.showToast(`Landed on ${winNum} (${colorName}). No winning bets.`, 'loss');
    }
  }

  drawWheel() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 4;

    this.ctx.clearRect(0, 0, w, h);

    // Outer Mahogany & Brass rim
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#26170d';
    this.ctx.fill();
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = '#d97706'; // Gold edge
    this.ctx.stroke();

    // Inner track
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
    this.ctx.fillStyle = '#111827';
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.stroke();

    const pockets = this.getPocketArray();
    const sliceAngle = (Math.PI * 2) / pockets.length;

    // Draw pocket slices
    for (let i = 0; i < pockets.length; i++) {
      const startAngle = this.wheelAngle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const num = pockets[i];
      const color = this.getColor(num);

      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, radius * 0.88, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#e2e8f0';
      this.ctx.stroke();

      // Draw Pocket Number text
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(startAngle + sliceAngle / 2);
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
      this.ctx.fillText(num.toString(), radius * 0.82, 0);
      this.ctx.restore();
    }

    // Brass Center Hub
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
    const grad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * 0.35);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.6, '#d97706');
    grad.addColorStop(1, '#78350f');
    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.strokeStyle = '#b45309';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Wheel Turret Cross
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.wheelAngle * 2);
    this.ctx.fillStyle = '#fef3c7';
    for (let j = 0; j < 4; j++) {
      this.ctx.rotate(Math.PI / 2);
      this.ctx.fillRect(-2, 0, 4, radius * 0.28);
    }
    this.ctx.restore();

    // Draw Ivory Ball
    if (this.isSpinning) {
      const bx = cx + Math.cos(this.ballAngle) * (this.ballRadius || radius * 0.88);
      const by = cy + Math.sin(this.ballAngle) * (this.ballRadius || radius * 0.88);

      this.ctx.beginPath();
      this.ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.strokeStyle = '#cbd5e1';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}

window.rouletteGame = null;
