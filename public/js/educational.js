/**
 * Educational Probability Labs & Fallacy Simulators
 * 1. Martingale Strategy Crash Tester (Automated Bot with Chart)
 * 2. Gambler's Fallacy & Independence Lab
 * 3. Interactive Expected Value (EV) & RTP Calculator
 * 4. Provably Fair SHA-256 Verifier Tool
 */
class EducationalLab {
  constructor() {
    this.martingaleCanvas = document.getElementById('martingaleChartCanvas');
    this.martingaleCtx = this.martingaleCanvas ? this.martingaleCanvas.getContext('2d') : null;
    this.historyData = [];
    this.init();
  }

  init() {
    this.setupResize();
    this.bindEvents();
    this.initEVCalculator();
    this.initProvablyFairInspector();
  }

  setupResize() {
    if (!this.martingaleCanvas) return;
    const resize = () => {
      const rect = this.martingaleCanvas.parentElement.getBoundingClientRect();
      this.martingaleCanvas.width = rect.width * window.devicePixelRatio;
      this.martingaleCanvas.height = rect.height * window.devicePixelRatio;
      if (this.martingaleCtx) {
        this.martingaleCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      this.drawMartingaleChart();
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 50);
  }

  bindEvents() {
    // Martingale Run Button
    const runMartingaleBtn = document.getElementById('runMartingaleBtn');
    if (runMartingaleBtn) {
      runMartingaleBtn.addEventListener('click', () => this.runMartingaleSimulation());
    }

    // Gambler's Fallacy Coin / Roulette Streak Test
    const runStreakBtn = document.getElementById('runStreakBtn');
    if (runStreakBtn) {
      runStreakBtn.addEventListener('click', () => this.runStreakSimulation());
    }

    // Modal triggers for Provably Fair & Help
    const pfBtn = document.getElementById('openProvablyFairBtn');
    const pfModal = document.getElementById('provablyFairModal');
    const pfClose = document.getElementById('closePfModal');

    if (pfBtn && pfModal) {
      pfBtn.addEventListener('click', () => {
        this.updateProvablyFairModal();
        pfModal.classList.add('open');
      });
    }
    if (pfClose && pfModal) {
      pfClose.addEventListener('click', () => pfModal.classList.remove('open'));
    }

    // Close on backdrop click
    if (pfModal) {
      pfModal.addEventListener('click', (e) => {
        if (e.target === pfModal) pfModal.classList.remove('open');
      });
    }
  }

  /* ------------------------------------------------------------- */
  /* 1. MARTINGALE STRATEGY TESTER */
  /* ------------------------------------------------------------- */
  runMartingaleSimulation() {
    const startBankroll = parseFloat(document.getElementById('martingaleBankroll').value) || 1000;
    const baseBet = parseFloat(document.getElementById('martingaleBaseBet').value) || 10;
    const maxSpins = parseInt(document.getElementById('martingaleSpins').value) || 500;
    const winRate = 18 / 37; // European Roulette Red/Black (48.65%)

    let bankroll = startBankroll;
    let currentBet = baseBet;
    this.historyData = [bankroll];

    let busts = 0;
    let maxDrawdown = 0;
    let peakBankroll = startBankroll;
    let spinsPlayed = 0;

    for (let i = 0; i < maxSpins; i++) {
      spinsPlayed++;

      // If cannot afford current bet, player busts!
      if (currentBet > bankroll) {
        busts++;
        bankroll = 0;
        this.historyData.push(bankroll);
        break;
      }

      bankroll -= currentBet;

      // Simulate spin
      const won = Math.random() < winRate;

      if (won) {
        bankroll += currentBet * 2;
        currentBet = baseBet; // Reset back to base bet
      } else {
        currentBet *= 2; // Double on loss!
      }

      if (bankroll > peakBankroll) peakBankroll = bankroll;
      const drawdown = peakBankroll - bankroll;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      this.historyData.push(bankroll);

      if (bankroll <= 0) {
        busts++;
        break;
      }
    }

    this.drawMartingaleChart();

    // Summary output
    const summaryEl = document.getElementById('martingaleSummary');
    if (summaryEl) {
      const net = bankroll - startBankroll;
      const color = net >= 0 ? '#10b981' : '#f43f5e';
      summaryEl.innerHTML = `
        <div style="margin-top: 0.5rem; font-size: 0.85rem; line-height: 1.6;">
          Outcome after ${spinsPlayed} bets: <strong style="color: ${color}">$${bankroll.toFixed(2)} (${net >= 0 ? '+' : ''}$${net.toFixed(2)})</strong><br>
          Status: <strong>${busts > 0 ? '💥 TOTAL BUST (Bankroll Exhausted)' : '⚠️ Survived session, but at high risk'}</strong><br>
          Peak Drawdown: <strong>$${maxDrawdown.toFixed(2)}</strong><br>
          <span style="color: var(--text-muted); font-size: 0.8rem;">
            <em>Mathematical Truth:</em> Even with a 99% short-term win probability, the Martingale system guarantees a 100% chance of eventual total bankruptcy over infinite time because consecutive losses grow geometrically ($2^k$).
          </span>
        </div>
      `;
    }

    window.soundFx.playCard();
  }

  drawMartingaleChart() {
    if (!this.martingaleCtx || !this.martingaleCanvas) return;
    const rect = this.martingaleCanvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.martingaleCtx.clearRect(0, 0, w, h);

    if (this.historyData.length < 2) {
      this.martingaleCtx.fillStyle = '#64748b';
      this.martingaleCtx.font = '12px "Plus Jakarta Sans", sans-serif';
      this.martingaleCtx.textAlign = 'center';
      this.martingaleCtx.fillText('Click "Simulate Martingale" to generate bankroll trajectory', w / 2, h / 2);
      return;
    }

    const minVal = 0;
    const maxVal = Math.max(...this.historyData, 1200);

    // Draw zero line
    this.martingaleCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.martingaleCtx.lineWidth = 1;
    this.martingaleCtx.beginPath();
    this.martingaleCtx.moveTo(0, h - 20);
    this.martingaleCtx.lineTo(w, h - 20);
    this.martingaleCtx.stroke();

    // Draw Trajectory
    this.martingaleCtx.beginPath();
    const stepX = w / (this.historyData.length - 1);

    this.historyData.forEach((val, i) => {
      const x = i * stepX;
      const y = h - 20 - ((val - minVal) / (maxVal - minVal)) * (h - 40);
      if (i === 0) this.martingaleCtx.moveTo(x, y);
      else this.martingaleCtx.lineTo(x, y);
    });

    const isBusted = this.historyData[this.historyData.length - 1] === 0;
    this.martingaleCtx.strokeStyle = isBusted ? '#f43f5e' : '#10b981';
    this.martingaleCtx.lineWidth = 2.5;
    this.martingaleCtx.shadowColor = isBusted ? 'rgba(244, 63, 94, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    this.martingaleCtx.shadowBlur = 8;
    this.martingaleCtx.stroke();
    this.martingaleCtx.shadowBlur = 0;
  }

  /* ------------------------------------------------------------- */
  /* 2. GAMBLER'S FALLACY SIMULATOR */
  /* ------------------------------------------------------------- */
  runStreakSimulation() {
    const trials = 50000;
    let redStreakCount = 0;
    let afterStreakRed = 0;
    let afterStreakBlack = 0;

    let currentStreak = 0;
    const targetStreak = 5; // Looking for 5 Reds in a row

    for (let i = 0; i < trials; i++) {
      // European Roulette: 18/37 Red (~48.65%)
      const isRed = Math.random() < (18 / 37);

      if (currentStreak >= targetStreak) {
        redStreakCount++;
        if (isRed) afterStreakRed++;
        else afterStreakBlack++;
      }

      if (isRed) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
    }

    const totalObserved = afterStreakRed + afterStreakBlack;
    const pctBlack = totalObserved > 0 ? ((afterStreakBlack / totalObserved) * 100).toFixed(2) : '51.35';
    const pctRed = totalObserved > 0 ? ((afterStreakRed / totalObserved) * 100).toFixed(2) : '48.65';

    const outputEl = document.getElementById('fallacyOutput');
    if (outputEl) {
      outputEl.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 0.85rem; line-height: 1.6;">
          <strong>Simulated ${trials.toLocaleString()} Roulette Spins:</strong><br>
          Occurrences where Red hit 5+ times in a row: <strong>${redStreakCount} times</strong>.<br><br>
          <div style="display: flex; gap: 1rem; margin: 0.5rem 0;">
            <div style="flex: 1; background: #b91c1c; padding: 0.5rem; border-radius: 6px; text-align: center; color: #fff; font-weight: bold;">
              Next Spin RED: ${pctRed}%
            </div>
            <div style="flex: 1; background: #1f2937; padding: 0.5rem; border-radius: 6px; text-align: center; color: #fff; font-weight: bold;">
              Next Spin BLACK/GREEN: ${pctBlack}%
            </div>
          </div>
          <p style="color: var(--accent-cyan); font-weight: 600; margin-top: 0.5rem;">
            Notice: Even after 5 Reds in a row, the probability of the next spin remains completely unchanged! The wheel has no memory.
          </p>
        </div>
      `;
    }

    window.soundFx.playCard();
  }

  /* ------------------------------------------------------------- */
  /* 3. EXPECTED VALUE (EV) CALCULATOR */
  /* ------------------------------------------------------------- */
  initEVCalculator() {
    const betInput = document.getElementById('evWager');
    const multInput = document.getElementById('evMultiplier');
    const probInput = document.getElementById('evProbability');

    const updateEV = () => {
      const W = parseFloat(betInput?.value) || 100;
      const M = parseFloat(multInput?.value) || 2.0;
      const P = (parseFloat(probInput?.value) || 48.65) / 100;

      // EV = (P * (M - 1) * W) - ((1 - P) * W)
      const ev = (P * (M - 1) * W) - ((1 - P) * W);
      const edgePct = (-ev / W) * 100;

      const evValEl = document.getElementById('evResultValue');
      const edgeValEl = document.getElementById('evEdgeValue');

      if (evValEl) {
        evValEl.textContent = `${ev >= 0 ? '+' : ''}$${ev.toFixed(2)}`;
        evValEl.className = ev >= 0 ? 'math-metric-val positive' : 'math-metric-val negative';
      }
      if (edgeValEl) {
        edgeValEl.textContent = `${edgePct.toFixed(2)}%`;
      }
    };

    [betInput, multInput, probInput].forEach(el => {
      if (el) el.addEventListener('input', updateEV);
    });
    updateEV();
  }

  /* ------------------------------------------------------------- */
  /* 4. PROVABLY FAIR VERIFIER MODAL */
  /* ------------------------------------------------------------- */
  updateProvablyFairModal() {
    const sSeed = document.getElementById('modalServerSeed');
    const sHash = document.getElementById('modalServerHash');
    const cSeed = document.getElementById('modalClientSeed');
    const nonce = document.getElementById('modalNonce');

    if (sSeed) sSeed.value = window.casinoState.serverSeed;
    if (sHash) sHash.textContent = window.casinoState.serverSeedHash;
    if (cSeed) cSeed.value = window.casinoState.clientSeed;
    if (nonce) nonce.textContent = window.casinoState.nonce;

    const saveClientBtn = document.getElementById('saveClientSeedBtn');
    if (saveClientBtn) {
      saveClientBtn.onclick = () => {
        window.casinoState.setClientSeed(cSeed.value);
      };
    }
  }
}

window.educationalLab = null;
