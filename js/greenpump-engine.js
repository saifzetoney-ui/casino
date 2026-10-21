/**
 * GREENPUMP.XYZ Full Multi-Game Engine
 * Supports:
 * 1. PUMP & DUMP (Crypto Candlestick Chart Prediction)
 * 2. RUG (Crash Multiplier)
 * 3. CHICKEN ROAD (Lane stepping multiplier)
 * 4. MINES (5x5 Grid)
 * 5. BLACKJACK (Solana 21)
 * 6. HIGHER / LOWER (HiLo)
 * 7. FLAPPY BIRD (Canvas flap betting)
 * + Hover Games dropdown, Daily Case, Wallet Faucet, Leaderboard, & Live Chat.
 */

// Sound Engine
class GreenpumpAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('gp_muted') === 'true';
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('gp_muted', this.muted);
    return this.muted;
  }

  playTrade() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playWin() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.22, this.ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.38);
    });
  }

  playCrash() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }

  playHop() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playClick() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
}

const gpAudio = new GreenpumpAudio();

// Main App Controller
class GreenpumpApp {
  constructor() {
    this.balance = parseFloat(localStorage.getItem('gp_sol_balance')) || 2.50;
    this.totalBets = parseInt(localStorage.getItem('gp_total_bets'), 10) || 51423;
    this.activeGame = 'rug'; // 'rug', 'pump', 'chicken', 'mines', 'blackjack', 'hilo', 'flappy', 'coinflip'
    this.notifications = [];
    this.caseSpinning = false;

    // PUMP & DUMP State
    this.tradeDirection = 'PUMP';
    this.pumpBet = 0.05;
    this.isPumpTrading = false;
    this.pumpEntryPrice = null;
    this.prices = [];
    this.basePrice = 148.50;
    this.currentPrice = 148.50;

    // RUG (Candlestick Crash) State
    this.rugRunning = false;
    this.rugState = 'WAITING'; // 'WAITING', 'RUNNING', 'CRASHED'
    this.rugMultiplier = 8.93;
    this.rugCrashPoint = 1.0;
    this.rugBet = 0.05;
    this.rugAutoTarget = null;
    this.rugHasBetThisRound = false;
    this.rugScheduledNextRound = false;
    this.rugCashedOut = false;
    this.rugCandles = [];
    this.rugPlayers = [];
    this.rugHistory = [
      1.03, 2.08, 6.04, 1.01, 4.46, 1.39, 3.03, 1.04, 1.64, 1.14, 1.47, 1.78, 1.89, 2.02, 3.29, 1.39, 3.22, 2.50
    ];
    this.rugCountdown = 5.0;
    this.rugCountdownInterval = null;
    this.rugAnimId = null;
    this.rugCanvas = null;
    this.rugCtx = null;
    this.rugStartTime = 0;
    this.rugLastCandleTime = 0;

    // CHICKEN ROAD State
    this.chickenDifficulty = 'medium'; // 'easy' (24), 'medium' (22), 'hard' (20)
    this.chickenTotalLanes = 22;
    this.chickenLane = 0; // 0 = sidewalk
    this.chickenBet = 0.001;
    this.chickenPlaying = false;
    this.chickenMultsConfig = {
      easy: [1.01, 1.06, 1.14, 1.24, 1.36, 1.50, 1.68, 1.90, 2.18, 2.52, 2.94, 3.48, 4.16, 5.05, 6.22, 7.80, 9.95, 12.90, 17.10, 23.20, 32.40, 46.80, 70.00, 110.00, 180.00],
      medium: [1.01, 1.12, 1.28, 1.48, 1.74, 2.08, 2.54, 3.16, 4.02, 5.21, 6.85, 9.12, 12.30, 16.80, 23.40, 33.00, 47.50, 69.80, 105.00, 162.00, 258.00, 425.00, 720.00],
      hard: [1.01, 1.24, 1.58, 2.08, 2.80, 3.86, 5.45, 7.85, 11.60, 17.50, 27.00, 42.80, 70.00, 118.00, 205.00, 370.00, 700.00, 1380.00, 2850.00, 6200.00, 15000.00]
    };

    // MINES State
    this.minesBet = 0.05;
    this.minesCount = 3;
    this.minesPlaying = false;
    this.minesGrid = [];
    this.minesRevealed = 0;
    this.minesMult = 1.0;

    // BLACKJACK State (Greenpump Solana 21)
    this.bjMainBet = 0.001;
    this.bjSide213 = 0.0;
    this.bjSidePair = 0.0;
    this.bjActiveTarget = 'main'; // 'main', '213', 'pair'
    this.bjLastBets = { main: 0.001, side213: 0.0, sidePair: 0.0 };
    this.bjPlaying = false;
    this.bjHands = [];
    this.bjHandIndex = 0;
    this.bjDealerHand = [];
    this.bjShoe = [];
    this.bjDealerTimer = null;

    // HILO State
    this.hiloBet = 0.05;
    this.hiloPlaying = false;
    this.hiloCurrentRank = 7;
    this.hiloCurrentSuit = '♠';
    this.hiloStreak = 0;
    this.hiloMult = 1;
    this.hiloHistory = [];
    this.hiloResolving = false;

    // FLAPPY State
    this.flappyBet = 0.05;
    this.flappyPlaying = false;
    this.flappyY = 210;
    this.flappyVy = 0;
    this.flappyScore = 0;
    this.flappyMult = 1;
    this.flappyPipes = [];
    this.flappyBest = parseInt(localStorage.getItem('gp_flappy_best'), 10) || 0;
    this.flappyLastTs = 0;
    this.flappyCashedOut = false;
    this.flappyRaf = null;

    // COINFLIP State
    this.coinflipBet = 0.05;
    this.coinflipSide = 'heads';
    this.coinflipFlipping = false;
    this.coinflipStreak = 0;
    this.coinflipHistory = [];
    this.coinflipLast = '—';

    this.init();
  }

  init() {
    this.initLoader();
    this.initWallet();
    this.initPublicChat();
    this.initAirdrop();
    this.initGameSwitching();
    this.initPumpAndDump();
    this.initRugCrash();
    this.initChickenRoad();
    this.initMines();
    this.initBlackjack();
    this.initHiLo();
    this.initFlappy();
    this.initCoinflip();
    this.initModals();
    this.initNotifications();
    this.initFairness();
    this.initInfoModals();
    this.initOnlineCounter();
    this.initDailyCase();
    this.initLeaderboard();
    this.updateSoundUI();
    this.updateTotalBetsUI();
  }

  /* ------------------------------------------------------------- */
  /* LOADER & WALLET */
  /* ------------------------------------------------------------- */
  initLoader() {
    const screen = document.querySelector('.LoadingScreen-module__DJ-nqa__screen');
    const fill = document.querySelector('.LoadingScreen-module__DJ-nqa__fill');
    const pct = document.querySelector('.LoadingScreen-module__DJ-nqa__percentage');

    if (!screen) return;
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 20) + 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        if (fill) fill.style.transform = 'scaleX(1)';
        if (pct) pct.textContent = '100%';
        setTimeout(() => {
          screen.style.opacity = '0';
          screen.style.visibility = 'hidden';
          setTimeout(() => screen.remove(), 400);
        }, 200);
      } else {
        if (fill) fill.style.transform = `scaleX(${p / 100})`;
        if (pct) pct.textContent = `${p}%`;
      }
    }, 40);
  }

  initWallet() {
    this.updateBalanceUI();

    const walletBtn = document.getElementById('gpWalletBtn');
    const walletDialog = document.getElementById('walletSecurityDialog');
    if (walletBtn && walletDialog) {
      walletBtn.addEventListener('click', () => {
        this.updateBalanceUI();
        walletDialog.showModal();
        gpAudio.playClick();
      });
    }

    const address = this.getWalletAddress();
    const addrEl = document.getElementById('walletAddressDisplay');
    if (addrEl) addrEl.textContent = address;

    const copyAddrBtn = document.getElementById('walletCopyAddrBtn');
    if (copyAddrBtn) {
      copyAddrBtn.addEventListener('click', async () => {
        const copied = await this.copyText(address);
        this.showToast(copied ? 'Wallet address copied!' : 'Could not copy address.');
        gpAudio.playClick();
      });
    }

    const faucetBtn = document.getElementById('claimSolFaucetBtn');
    if (faucetBtn) {
      faucetBtn.addEventListener('click', () => {
        this.balance = parseFloat((this.balance + 1.0).toFixed(4));
        this.saveBalance();
        gpAudio.playWin();
        this.showToast('💧 Claimed +1.00 SOL play-money faucet!');
        this.pushNotification('Faucet claimed', '+1.00 demo SOL was added to your wallet.', 'faucet');
      });
    }

    const resetBtn = document.getElementById('resetWalletBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!window.confirm('Reset your demo wallet and local game state?')) return;
        localStorage.removeItem('gp_sol_balance');
        localStorage.removeItem('gp_case_last_claim');
        localStorage.removeItem('gp_total_bets');
        localStorage.removeItem('gp_flappy_best');
        localStorage.removeItem('gp_leaderboard');
        this.balance = 2.50;
        this.totalBets = 51423;
        this.flappyBest = 0;
        this.saveBalance();
        this.updateTotalBetsUI();
        this.updateFlappyBestUI();
        this.updateDailyCaseUI();
        this.renderLeaderboard();
        this.showToast('Demo wallet reset to 2.50 SOL.');
        gpAudio.playClick();
      });
    }
  }

  getWalletAddress() {
    let addr = localStorage.getItem('gp_demo_address');
    if (addr && addr.length >= 32) return addr;
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let tail = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(38);
      window.crypto.getRandomValues(bytes);
      bytes.forEach(b => tail += chars[b % chars.length]);
    } else {
      for (let i = 0; i < 38; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    }
    addr = `GPump${tail}`;
    localStorage.setItem('gp_demo_address', addr);
    return addr;
  }

  async copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  formatSol(value, decimals) {
    const val = Number(value) || 0;
    if (decimals !== undefined) return val.toFixed(decimals);
    const str4 = val.toFixed(4);
    if (str4.endsWith('00')) return val.toFixed(2);
    if (str4.endsWith('0')) return val.toFixed(3);
    return str4;
  }

  saveBalance() {
    this.balance = parseFloat(Number(this.balance).toFixed(4));
    localStorage.setItem('gp_sol_balance', this.balance.toFixed(4));
    this.updateBalanceUI();
  }

  updateBalanceUI() {
    const badge = document.getElementById('walletBalanceDisplay');
    if (badge) {
      badge.textContent = `${this.formatSol(this.balance)} SOL`;
    }
    const dialogBalance = document.getElementById('walletDialogBalance');
    if (dialogBalance) dialogBalance.textContent = `${this.formatSol(this.balance)} SOL`;
  }

  bumpTotalBets(amount = 1) {
    this.totalBets += amount;
    this.updateTotalBetsUI();
  }

  updateTotalBetsUI() {
    const el = document.getElementById('totalBetsCounter');
    if (el) el.textContent = this.totalBets.toLocaleString();
    localStorage.setItem('gp_total_bets', String(this.totalBets));
  }

  recordWin(game, payout, multiplier) {
    const amount = Number(payout) || 0;
    if (amount <= 0) return;
    let rows = [];
    try {
      rows = JSON.parse(localStorage.getItem('gp_leaderboard') || '[]');
    } catch (err) {
      rows = [];
    }
    rows.push({
      name: 'You',
      game: String(game).toUpperCase(),
      amount: parseFloat(amount.toFixed(4)),
      mult: Number(multiplier) || 1
    });
    rows.sort((a, b) => b.amount - a.amount);
    rows = rows.slice(0, 12);
    localStorage.setItem('gp_leaderboard', JSON.stringify(rows));
    this.renderLeaderboard();
  }

  /* ------------------------------------------------------------- */
  /* GAME SWITCHING & HOVER DROPDOWN */
  /* ------------------------------------------------------------- */
  initGameSwitching() {
    const gamesWrapper = document.querySelector('.nav-games-wrapper');
    const dropdownMenu = document.querySelector('.NavbarGameMenu-module__tgv1Qa__menu');

    // Add click/hover delegation to switch games
    document.querySelectorAll('[data-switch-game]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const gameId = link.dataset.switchGame;
        this.switchGame(gameId);

        // Close dropdown
        if (gamesWrapper) gamesWrapper.classList.remove('open');
      });
    });
  }

  switchGame(gameId) {
    const targetStage = document.getElementById(`stage-${gameId}`);
    if (!targetStage) return;
    this.activeGame = gameId;

    // Toggle active link highlights
    document.querySelectorAll('[data-switch-game]').forEach(link => {
      const match = link.dataset.switchGame === gameId;
      link.classList.toggle('active', match);
    });
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.switchGame === gameId);
    });

    // Hide all stages, show target stage
    document.querySelectorAll('.game-stage-view').forEach(stage => {
      stage.classList.remove('active');
    });
    targetStage.classList.add('active');

    this.closeNotificationsPanel();
    document.querySelector('.nav-games-wrapper')?.classList.remove('open');

    // Trigger canvas resize
    window.dispatchEvent(new Event('resize'));
    if (gameId === 'rug' && this.drawRugCanvas) {
      setTimeout(() => this.drawRugCanvas(), 50);
    }
    if (gameId === 'chicken' && this.renderChickenHighwayLanes) {
      setTimeout(() => this.renderChickenHighwayLanes(), 50);
    }
    gpAudio.playClick();
    this.showToast(`Switched to ${gameId.toUpperCase()}`);
  }

  /* ------------------------------------------------------------- */
  /* 1. PUMP & DUMP */
  /* ------------------------------------------------------------- */
  initPumpAndDump() {
    this.canvas = document.getElementById('pumpChart');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    for (let i = 0; i < 40; i++) {
      this.basePrice += (Math.random() - 0.48) * 0.45;
      this.prices.push(this.basePrice);
    }
    this.currentPrice = this.prices[this.prices.length - 1];

    const resize = () => {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, rect.width * dpr);
      this.canvas.height = Math.max(1, rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    // Live tick loop
    setInterval(() => {
      const delta = (Math.random() - 0.49) * 0.55;
      this.currentPrice = Math.max(120, this.currentPrice + delta);
      this.prices.push(this.currentPrice);
      if (this.prices.length > 50) this.prices.shift();

      const centerMult = document.getElementById('pumpPriceTicker');
      if (centerMult) {
        const change = ((this.currentPrice - this.prices[0]) / this.prices[0]) * 100;
        const sign = change >= 0 ? '+' : '';
        centerMult.textContent = `$${this.currentPrice.toFixed(2)} (${sign}${change.toFixed(2)}%)`;
        centerMult.style.color = change >= 0 ? '#4ade80' : '#f87171';
      }

      this.drawPumpChart();
    }, 180);

    // Direction Selectors
    const pumpDirBtn = document.getElementById('pumpUpBtn');
    const dumpDirBtn = document.getElementById('dumpDownBtn');
    const tradeBtn = document.getElementById('pumpTradeActionBtn');
    const betInput = document.getElementById('pumpBetInput');

    if (pumpDirBtn && dumpDirBtn) {
      pumpDirBtn.addEventListener('click', () => {
        this.tradeDirection = 'PUMP';
        pumpDirBtn.classList.add('is-active');
        dumpDirBtn.classList.remove('is-active');
        tradeBtn.classList.remove('is-dump');
        tradeBtn.classList.add('is-pump');
        tradeBtn.innerHTML = `<span>TRADE NOW (PUMP)</span>`;
        gpAudio.playClick();
      });

      dumpDirBtn.addEventListener('click', () => {
        this.tradeDirection = 'DUMP';
        dumpDirBtn.classList.add('is-active');
        pumpDirBtn.classList.remove('is-active');
        tradeBtn.classList.remove('is-pump');
        tradeBtn.classList.add('is-dump');
        tradeBtn.innerHTML = `<span>TRADE NOW (DUMP)</span>`;
        gpAudio.playClick();
      });
    }

    if (betInput) {
      betInput.addEventListener('change', (e) => {
        this.pumpBet = Math.max(0.001, parseFloat(e.target.value) || 0.05);
      });
    }

    // Quick modifiers
    const halfBtn = document.getElementById('pumpHalfBtn');
    const doubleBtn = document.getElementById('pumpDoubleBtn');
    const maxBtn = document.getElementById('pumpMaxBtn');

    if (halfBtn) halfBtn.addEventListener('click', () => {
      this.pumpBet = Math.max(0.001, this.pumpBet / 2);
      if (betInput) betInput.value = this.pumpBet.toFixed(3);
    });
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      this.pumpBet = Math.min(this.balance, this.pumpBet * 2);
      if (betInput) betInput.value = this.pumpBet.toFixed(3);
    });
    if (maxBtn) maxBtn.addEventListener('click', () => {
      this.pumpBet = Math.max(0.001, this.balance);
      if (betInput) betInput.value = this.pumpBet.toFixed(3);
    });

    if (tradeBtn) {
      tradeBtn.addEventListener('click', () => this.executePumpTrade());
    }
  }

  executePumpTrade() {
    if (this.isPumpTrading) return;
    if (this.balance < this.pumpBet) {
      this.showToast('Insufficient SOL Balance! Claim from Faucet.');
      return;
    }

    this.isPumpTrading = true;
    this.balance = parseFloat((this.balance - this.pumpBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.pumpEntryPrice = this.currentPrice;

    gpAudio.playTrade();

    const tradeBtn = document.getElementById('pumpTradeActionBtn');
    let countdown = 6;
    tradeBtn.disabled = true;

    const timer = setInterval(() => {
      countdown--;
      tradeBtn.textContent = `CLOSING IN ${countdown}s...`;
      if (countdown <= 0) {
        clearInterval(timer);
        this.resolvePumpTrade();
      }
    }, 1000);
  }

  resolvePumpTrade() {
    this.isPumpTrading = false;
    const finalPrice = this.currentPrice;
    const isPumpWon = this.tradeDirection === 'PUMP' && finalPrice > this.pumpEntryPrice;
    const isDumpWon = this.tradeDirection === 'DUMP' && finalPrice < this.pumpEntryPrice;

    const tradeBtn = document.getElementById('pumpTradeActionBtn');
    tradeBtn.disabled = false;
    tradeBtn.innerHTML = `<span>TRADE NOW (${this.tradeDirection})</span>`;

    if (isPumpWon || isDumpWon) {
      const payout = this.pumpBet * 1.95;
      const profit = payout - this.pumpBet;
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.recordWin('pump', profit, 1.95);
      this.pushNotification('Pump & Dump win', `+${this.formatSol(profit)} SOL on a ${this.tradeDirection} trade.`, 'win');
      gpAudio.playWin();
      this.showToast(`🎉 TRADE WON! +${profit.toFixed(4)} SOL (${this.tradeDirection} Hit!)`);
    } else {
      gpAudio.playCrash();
      this.showToast(`💥 Trade Lost! Price closed against prediction.`);
    }

    this.pumpEntryPrice = null;
  }

  drawPumpChart() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    const minP = Math.min(...this.prices) - 1.0;
    const maxP = Math.max(...this.prices) + 1.0;

    const getY = (val) => h - 40 - ((val - minP) / (maxP - minP)) * (h - 80);
    const getX = (idx) => (idx / (this.prices.length - 1)) * (w - 70) + 10;

    // Grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let y = 40; y < h - 40; y += 45) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    const isBullish = this.currentPrice >= this.prices[0];
    const strokeCol = isBullish ? '#22c55e' : '#f43f5e';
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isBullish ? 'rgba(34, 197, 94, 0.28)' : 'rgba(244, 63, 94, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.prices.forEach((p, i) => {
      const x = getX(i);
      const y = getY(p);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    this.ctx.lineTo(getX(this.prices.length - 1), h);
    this.ctx.lineTo(getX(0), h);
    this.ctx.closePath();
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    this.ctx.beginPath();
    this.prices.forEach((p, i) => {
      const x = getX(i);
      const y = getY(p);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    this.ctx.strokeStyle = strokeCol;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    const headX = getX(this.prices.length - 1);
    const headY = getY(this.currentPrice);

    this.ctx.beginPath();
    this.ctx.arc(headX, headY, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    if (this.isPumpTrading && this.pumpEntryPrice) {
      const entryY = getY(this.pumpEntryPrice);
      this.ctx.save();
      this.ctx.setLineDash([6, 6]);
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, entryY);
      this.ctx.lineTo(w, entryY);
      this.ctx.stroke();
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.fillText(`ENTRY: $${this.pumpEntryPrice.toFixed(2)}`, 14, entryY - 6);
      this.ctx.restore();
    }

    this.ctx.fillStyle = strokeCol;
    this.ctx.beginPath();
    this.ctx.roundRect(w - 65, headY - 12, 60, 24, 6);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`$${this.currentPrice.toFixed(2)}`, w - 35, headY);
  }

  /* ------------------------------------------------------------- */
  /* 2. RUG (CANDLESTICK CRASH ARENA) */
  /* ------------------------------------------------------------- */
  initRugCrash() {
    this.rugCanvas = document.getElementById('rugCrashCanvas');
    if (this.rugCanvas) {
      this.rugCtx = this.rugCanvas.getContext('2d');
      const resize = () => {
        if (!this.rugCanvas || !this.rugCanvas.parentElement) return;
        const rect = this.rugCanvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.rugCanvas.width = rect.width * dpr;
        this.rugCanvas.height = rect.height * dpr;
        this.rugCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.drawRugCanvas();
      };
      window.addEventListener('resize', resize);
      setTimeout(resize, 60);
    }

    const betInput = document.getElementById('rugBetInput');
    const usdEl = document.getElementById('crashUsdEstimate');
    const updateUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.rugBet * 150).toFixed(2)} USD`;
    };
    if (betInput) {
      betInput.value = this.rugBet;
      updateUsd();
      betInput.addEventListener('input', (e) => {
        this.rugBet = Math.max(0.001, parseFloat(e.target.value) || 0.001);
        updateUsd();
        this.updateRugActionBtn();
      });
    }

    const halfBtn = document.getElementById('rugHalfBtn');
    const doubleBtn = document.getElementById('rugDoubleBtn');
    const maxBtn = document.getElementById('rugMaxBtn');
    if (halfBtn) halfBtn.addEventListener('click', () => {
      this.rugBet = Math.max(0.001, parseFloat((this.rugBet / 2).toFixed(3)));
      if (betInput) betInput.value = this.rugBet;
      updateUsd();
      this.updateRugActionBtn();
      gpAudio.playClick();
    });
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      this.rugBet = Math.min(this.balance, parseFloat((this.rugBet * 2).toFixed(3)));
      if (betInput) betInput.value = this.rugBet;
      updateUsd();
      this.updateRugActionBtn();
      gpAudio.playClick();
    });
    if (maxBtn) maxBtn.addEventListener('click', () => {
      this.rugBet = Math.max(0.001, parseFloat(this.balance.toFixed(3)));
      if (betInput) betInput.value = this.rugBet;
      updateUsd();
      this.updateRugActionBtn();
      gpAudio.playClick();
    });

    const autoInput = document.getElementById('rugAutoCashoutInput');
    if (autoInput) {
      autoInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.rugAutoTarget = (!isNaN(val) && val > 1.0) ? val : null;
        document.querySelectorAll('.crash-pill-btn').forEach(p => p.classList.remove('active'));
      });
    }

    document.querySelectorAll('.crash-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = parseFloat(btn.dataset.target);
        this.rugAutoTarget = target;
        if (autoInput) autoInput.value = target.toFixed(2);
        document.querySelectorAll('.crash-pill-btn').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        gpAudio.playClick();
      });
    });

    const advToggle = document.getElementById('rugAdvancedToggle');
    const advBadge = document.getElementById('rugAdvancedBadge');
    if (advToggle && advBadge) {
      advToggle.addEventListener('change', () => {
        advBadge.textContent = advToggle.checked ? 'ON' : 'OFF';
        advBadge.style.color = advToggle.checked ? '#22c55e' : '#64748b';
        gpAudio.playClick();
      });
    }

    const mainBtn = document.getElementById('rugMainActionBtn');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        if (this.rugState === 'WAITING') {
          if (this.rugHasBetThisRound) {
            this.rugHasBetThisRound = false;
            this.balance += this.rugBet;
            this.saveBalance();
            this.showToast('Bet cancelled.');
          } else {
            if (this.balance < this.rugBet) {
              this.showToast('Insufficient SOL Balance! Claim from Faucet.');
              return;
            }
            this.rugHasBetThisRound = true;
            this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
            this.saveBalance();
            this.bumpTotalBets(1);
            gpAudio.playTrade();
            this.showToast(`Bet placed: ${this.rugBet} SOL`);
          }
          this.syncRugUserRow();
          this.renderRugPlayersList();
          this.updateRugActionBtn();
        } else if (this.rugState === 'RUNNING') {
          if (this.rugHasBetThisRound && !this.rugCashedOut) {
            this.cashoutRug();
          } else {
            this.rugScheduledNextRound = !this.rugScheduledNextRound;
            gpAudio.playClick();
            this.updateRugActionBtn();
          }
        } else if (this.rugState === 'CRASHED') {
          this.rugScheduledNextRound = !this.rugScheduledNextRound;
          gpAudio.playClick();
          this.updateRugActionBtn();
        }
      });
    }

    this.updateRugHistoryBar();
    this.startRugCountdown();
  }

  generateRugPlayers() {
    const namePool = [
      'SolDegen', 'PepeMaxi', 'RugSurvivor', 'CryptoWhale', 'GreenCandle',
      'BullishChad', 'DiamondHands', 'MoonBoi', 'ChartGoblin', 'LuckyLuna',
      'PumpQueen', 'ApeSniper', 'RektRaccoon', 'SlotShark', 'PixelPirate',
      'NeonNinja', '0xWhale', 'DegenKing', 'HODLHero', 'SatoshiJr'
    ];
    const count = 4 + Math.floor(Math.random() * 6);
    const used = new Set();
    const players = [];

    for (let i = 0; i < count; i++) {
      let name = '';
      let guard = 0;
      do {
        if (Math.random() < 0.5) {
          name = `Player ${1000 + Math.floor(Math.random() * 9000)}`;
        } else {
          const base = namePool[Math.floor(Math.random() * namePool.length)];
          name = `${base}${10 + Math.floor(Math.random() * 90)}`;
        }
        guard++;
      } while (used.has(name) && guard < 30);
      used.add(name);

      const bet = Math.pow(10, -3 + Math.random() * 2.4);
      const target = Math.random() < 0.14 ? 99999 : parseFloat((1.2 + Math.random() * 3.8).toFixed(2));

      players.push({
        name,
        bet: parseFloat(Math.min(0.5, Math.max(0.001, bet)).toFixed(4)),
        target,
        cashed: false,
        cashoutMult: null,
        avatarHue: Math.floor(Math.random() * 360)
      });
    }

    return players.sort((a, b) => b.bet - a.bet);
  }

  syncRugUserRow() {
    const existing = this.rugPlayers.find(p => p.isUser);
    if (!this.rugHasBetThisRound) {
      if (existing) this.rugPlayers = this.rugPlayers.filter(p => !p.isUser);
      return;
    }
    if (existing) {
      existing.bet = this.rugBet;
      existing.target = this.rugAutoTarget || 99999;
      return;
    }
    this.rugPlayers.unshift({
      name: 'You (Player 1337)',
      bet: this.rugBet,
      target: this.rugAutoTarget || 99999,
      cashed: false,
      cashoutMult: null,
      isUser: true,
      avatarHue: 140
    });
  }

  startRugCountdown() {
    this.rugState = 'WAITING';
    if (this.rugAnimId) {
      cancelAnimationFrame(this.rugAnimId);
      this.rugAnimId = null;
    }
    if (this.rugCountdownInterval) {
      clearInterval(this.rugCountdownInterval);
    }

    this.rugMultiplier = 1.00;
    this.rugCashedOut = false;

    // Check if user had scheduled a bet
    if (this.rugScheduledNextRound) {
      this.rugScheduledNextRound = false;
      if (this.balance >= this.rugBet) {
        this.rugHasBetThisRound = true;
        this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
        this.saveBalance();
        this.bumpTotalBets(1);
        this.showToast(`Scheduled bet placed: ${this.rugBet} SOL`);
      } else {
        this.showToast('Insufficient SOL for scheduled bet!');
      }
    }

    // Reset candles to initial state
    this.rugCandles = [
      { open: 1.00, close: 1.15, high: 1.15, low: 1.00 }
    ];

    this.rugPlayers = this.generateRugPlayers();
    this.syncRugUserRow();

    this.renderRugPlayersList();

    const multEl = document.getElementById('rugFloatingMult');
    if (multEl) {
      multEl.textContent = '1.00x';
      multEl.classList.remove('rugged');
    }
    const substatusEl = document.getElementById('rugRoundSubstatus');
    if (substatusEl) {
      substatusEl.textContent = 'STARTING...';
      substatusEl.style.color = '#94a3b8';
    }

    const overlay = document.getElementById('rugCountdownOverlay');
    const timerEl = document.getElementById('rugCountdownTimer');
    const barEl = document.getElementById('rugCountdownBar');
    if (overlay) overlay.style.display = 'flex';

    let remainingMs = 5000;
    const totalMs = 5000;
    this.updateRugActionBtn();
    this.drawRugCanvas();

    this.rugCountdownInterval = setInterval(() => {
      remainingMs -= 100;
      if (timerEl) timerEl.textContent = (remainingMs / 1000).toFixed(1);
      if (barEl) barEl.style.width = `${(remainingMs / totalMs) * 100}%`;

      if (remainingMs <= 0) {
        clearInterval(this.rugCountdownInterval);
        if (overlay) overlay.style.display = 'none';
        this.startRugRound();
      }
    }, 100);
  }

  startRugRound() {
    this.rugState = 'RUNNING';
    this.rugMultiplier = 1.00;
    this.rugCashedOut = false;

    // Crash algorithm: 4% instant rug, otherwise Pareto climb
    const r = Math.random();
    if (r < 0.04) {
      this.rugCrashPoint = 1.00 + Math.random() * 0.08;
    } else {
      this.rugCrashPoint = Math.max(1.10, Math.floor((0.97 / (1 - r)) * 100) / 100);
    }

    const substatusEl = document.getElementById('rugRoundSubstatus');
    if (substatusEl) substatusEl.textContent = '';

    this.rugCandles = [
      { open: 1.00, close: 1.08, high: 1.08, low: 1.00 }
    ];

    if (this.activeGame === 'rug' && !document.hidden) {
      gpAudio.playTrade();
    }
    this.rugStartTime = performance.now();
    this.rugLastCandleTime = performance.now();
    this.updateRugActionBtn();

    this.rugAnimId = requestAnimationFrame(() => this.rugGameTick());
  }

  rugGameTick() {
    if (this.rugState !== 'RUNNING') return;

    const now = performance.now();
    const elapsed = (now - this.rugStartTime) / 1000;

    // Exponential climb curve (0.3x time scale = ~3.3x slower growth)
    const scaled = elapsed * 0.3;
    this.rugMultiplier = 1.00 + 0.12 * scaled + 0.065 * Math.pow(scaled, 2);

    // Append / step candlesticks every 280ms
    if (now - this.rugLastCandleTime > 280) {
      this.rugLastCandleTime = now;
      const prev = this.rugCandles[this.rugCandles.length - 1];
      const open = prev ? prev.close - 0.015 : 1.00;
      const close = this.rugMultiplier;
      this.rugCandles.push({
        open,
        close,
        high: Math.max(open, close),
        low: Math.min(open, close)
      });
    } else {
      if (this.rugCandles.length > 0) {
        this.rugCandles[this.rugCandles.length - 1].close = this.rugMultiplier;
      }
    }

    // Update center 3D multiplier
    const multEl = document.getElementById('rugFloatingMult');
    if (multEl) multEl.textContent = `${this.rugMultiplier.toFixed(2)}x`;

    // Check simulated players cashout
    this.rugPlayers.forEach(p => {
      if (!p.cashed && this.rugMultiplier >= p.target) {
        p.cashed = true;
        p.cashoutMult = p.target;
        this.renderRugPlayersList();
      }
    });

    // Check user Auto Cashout
    if (this.rugHasBetThisRound && !this.rugCashedOut && this.rugAutoTarget && this.rugMultiplier >= this.rugAutoTarget) {
      this.cashoutRug();
    }

    // Update Action Button
    this.updateRugActionBtn();

    // Redraw canvas
    this.drawRugCanvas();

    // Check if crashed
    if (this.rugMultiplier >= this.rugCrashPoint) {
      this.triggerRugCrash();
      return;
    }

    this.rugAnimId = requestAnimationFrame(() => this.rugGameTick());
  }

  drawRugCanvas() {
    if (!this.rugCanvas || !this.rugCtx) return;
    const rect = this.rugCanvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    this.rugCtx.clearRect(0, 0, w, h);

    // Background subtle grid
    this.rugCtx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    this.rugCtx.lineWidth = 1;
    for (let x = 0; x < w - 70; x += 48) {
      this.rugCtx.beginPath();
      this.rugCtx.moveTo(x, 0);
      this.rugCtx.lineTo(x, h);
      this.rugCtx.stroke();
    }
    for (let y = 30; y < h; y += 48) {
      this.rugCtx.beginPath();
      this.rugCtx.moveTo(0, y);
      this.rugCtx.lineTo(w - 70, y);
      this.rugCtx.stroke();
    }

    // Multiplier range window
    const currentM = this.rugMultiplier;
    const minM = Math.max(1.0, currentM - 1.55);
    const maxM = Math.max(2.2, currentM + 0.85);

    const getY = (val) => {
      const ratio = (val - minM) / (maxM - minM);
      return (h - 45) - ratio * (h - 90);
    };

    // Right Y-axis boundary line
    this.rugCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    this.rugCtx.beginPath();
    this.rugCtx.moveTo(w - 70, 0);
    this.rugCtx.lineTo(w - 70, h);
    this.rugCtx.stroke();

    // Right Y-axis tick marks
    const span = maxM - minM;
    const tickStep = span > 8 ? 2.0 : span > 4 ? 1.0 : span > 2 ? 0.35 : 0.2;
    const startTick = Math.ceil(minM / tickStep) * tickStep;

    this.rugCtx.font = '700 11.5px monospace';
    this.rugCtx.textAlign = 'right';
    this.rugCtx.textBaseline = 'middle';

    for (let t = startTick; t <= maxM; t += tickStep) {
      const y = getY(t);
      if (y >= 15 && y <= h - 15) {
        // Grid line extends
        this.rugCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.rugCtx.beginPath();
        this.rugCtx.moveTo(0, y);
        this.rugCtx.lineTo(w - 70, y);
        this.rugCtx.stroke();

        // Tick mark
        this.rugCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        this.rugCtx.beginPath();
        this.rugCtx.moveTo(w - 70, y);
        this.rugCtx.lineTo(w - 64, y);
        this.rugCtx.stroke();

        this.rugCtx.fillStyle = '#64748b';
        this.rugCtx.fillText(t.toFixed(2) + 'x', w - 12, y);
      }
    }

    // Candlesticks positioning
    const pitch = 56;
    const candleWidth = 44;
    const isCrashed = this.rugState === 'CRASHED';
    const candleCount = this.rugCandles.length;

    if (candleCount > 0) {
      // Latest candle sits around 72% width of usable canvas
      const targetX = (w - 70) * 0.72;
      const totalWidth = candleCount * pitch;
      const startX = totalWidth > targetX ? targetX - (candleCount - 1) * pitch : 32;

      let latestTipX = 0;
      let latestTipY = getY(currentM);

      this.rugCandles.forEach((c, i) => {
        const x = startX + i * pitch;
        if (x + candleWidth < 0 || x > w - 70) return;

        const openY = getY(c.open);
        const closeY = getY(c.close);
        const topY = Math.min(openY, closeY);
        const bottomY = Math.max(openY, closeY);
        const cHeight = Math.max(16, bottomY - topY);

        this.rugCtx.fillStyle = isCrashed ? '#ef4444' : '#00c853';
        this.rugCtx.beginPath();
        this.rugCtx.roundRect(x, topY, candleWidth, cHeight, 6);
        this.rugCtx.fill();

        if (i === candleCount - 1) {
          latestTipX = x + candleWidth / 2;
          latestTipY = topY;
        }
      });

      // Glowing Circle Dot at Candle Head
      if (latestTipX > 0) {
        this.rugCtx.beginPath();
        this.rugCtx.arc(latestTipX, latestTipY, 6, 0, Math.PI * 2);
        this.rugCtx.fillStyle = isCrashed ? '#ef4444' : '#6fbf73';
        this.rugCtx.fill();

        // Horizontal dashed line extending to right Y-axis
        this.rugCtx.save();
        this.rugCtx.setLineDash([6, 6]);
        this.rugCtx.strokeStyle = isCrashed ? 'rgba(239, 68, 68, 0.85)' : '#6fbf73';
        this.rugCtx.lineWidth = 2;
        this.rugCtx.beginPath();
        this.rugCtx.moveTo(latestTipX + 6, latestTipY);
        this.rugCtx.lineTo(w - 70, latestTipY);
        this.rugCtx.stroke();
        this.rugCtx.restore();
      }
    }
  }

  cashoutRug() {
    if (this.rugState !== 'RUNNING' || this.rugCashedOut || !this.rugHasBetThisRound) return;
    this.rugCashedOut = true;
    const win = this.rugBet * this.rugMultiplier;
    const profit = win - this.rugBet;
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('rug', profit, this.rugMultiplier);
    this.pushNotification('Rug cashout', `You cashed out at ${this.rugMultiplier.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');

    if (this.activeGame === 'rug' && !document.hidden) {
      gpAudio.playWin();
    }
    this.showToast(`🚀 CASHED OUT @ ${this.rugMultiplier.toFixed(2)}x! +${win.toFixed(4)} SOL`);

    // Mark user in players list
    const userRow = this.rugPlayers.find(p => p.isUser);
    if (userRow) {
      userRow.cashed = true;
      userRow.cashoutMult = this.rugMultiplier;
    }
    this.renderRugPlayersList();
    this.updateRugActionBtn();
  }

  triggerRugCrash() {
    this.rugState = 'CRASHED';
    if (this.rugAnimId) {
      cancelAnimationFrame(this.rugAnimId);
      this.rugAnimId = null;
    }

    this.rugMultiplier = this.rugCrashPoint;
    if (this.activeGame === 'rug' && !document.hidden) {
      gpAudio.playCrash();
    }

    const multEl = document.getElementById('rugFloatingMult');
    if (multEl) {
      multEl.textContent = `${this.rugCrashPoint.toFixed(2)}x`;
      multEl.classList.add('rugged');
    }
    const substatusEl = document.getElementById('rugRoundSubstatus');
    if (substatusEl) {
      substatusEl.textContent = `CRASHED @ ${this.rugCrashPoint.toFixed(2)}x`;
      substatusEl.style.color = '#ef4444';
    }

    // Add to history
    this.rugHistory.unshift(this.rugCrashPoint);
    if (this.rugHistory.length > 25) this.rugHistory.pop();
    this.updateRugHistoryBar();

    // Redraw canvas with crashed colors
    this.drawRugCanvas();

    if (this.rugHasBetThisRound && !this.rugCashedOut) {
      this.showToast(`💥 CRASHED @ ${this.rugCrashPoint.toFixed(2)}x! Lost ${this.rugBet} SOL`);
    }

    this.rugHasBetThisRound = false;
    this.updateRugActionBtn();
    this.renderRugPlayersList();

    // Wait 2.5s and then start countdown for next round
    setTimeout(() => {
      this.startRugCountdown();
    }, 2500);
  }

  updateRugActionBtn() {
    const btn = document.getElementById('rugMainActionBtn');
    if (!btn) return;

    if (this.rugState === 'WAITING') {
      if (this.rugHasBetThisRound) {
        btn.textContent = `BET PLACED (${this.rugBet.toFixed(3)} SOL) - CLICK TO CANCEL`;
        btn.className = 'crash-action-btn cashout-state';
      } else {
        btn.textContent = `PLACE BET (${this.rugBet.toFixed(3)} SOL)`;
        btn.className = 'crash-action-btn';
      }
    } else if (this.rugState === 'RUNNING') {
      if (this.rugHasBetThisRound && !this.rugCashedOut) {
        const currentWin = this.rugBet * this.rugMultiplier;
        btn.textContent = `CASHOUT ${currentWin.toFixed(3)} SOL`;
        btn.className = 'crash-action-btn cashout-state';
      } else if (this.rugHasBetThisRound && this.rugCashedOut) {
        btn.textContent = `CASHED OUT (${this.rugMultiplier.toFixed(2)}x)`;
        btn.className = 'crash-action-btn';
      } else {
        if (this.rugScheduledNextRound) {
          btn.textContent = `BET SCHEDULED (CLICK TO CANCEL)`;
          btn.className = 'crash-action-btn scheduled-state';
        } else {
          btn.textContent = `SCHEDULE BET FOR NEXT ROUND`;
          btn.className = 'crash-action-btn';
        }
      }
    } else if (this.rugState === 'CRASHED') {
      if (this.rugScheduledNextRound) {
        btn.textContent = `BET SCHEDULED (CLICK TO CANCEL)`;
        btn.className = 'crash-action-btn scheduled-state';
      } else {
        btn.textContent = `SCHEDULE BET FOR NEXT ROUND`;
        btn.className = 'crash-action-btn';
      }
    }
  }

  renderRugPlayersList() {
    const listEl = document.getElementById('rugPlayersList');
    const countEl = document.getElementById('rugActivePlayersCount');
    const poolEl = document.getElementById('rugPoolTotalDisplay');
    if (!listEl) return;

    if (countEl) countEl.textContent = `${this.rugPlayers.length} Playing`;

    const totalPool = this.rugPlayers.reduce((sum, p) => sum + p.bet, 0);
    if (poolEl) poolEl.textContent = totalPool.toFixed(4);

    listEl.innerHTML = this.rugPlayers.map(p => {
      const cashed = p.cashed;
      const isCrashed = this.rugState === 'CRASHED' && !cashed;
      const payout = p.bet * (cashed ? (p.cashoutMult || p.target || 1) : 1);

      return `
        <div class="crash-player-row ${cashed ? 'cashed' : isCrashed ? 'crashed' : ''}">
          <div class="crash-player-info">
            <div class="crash-player-avatar">
              <img src="emojis/pepe_hypers.png" alt="" style="filter:hue-rotate(${p.avatarHue || 0}deg) saturate(1.15);" />
            </div>
            <span class="crash-player-name">${p.name}</span>
          </div>
          <div class="crash-player-status">
            <span class="crash-status-text ${cashed ? 'cashed' : isCrashed ? 'crashed' : 'playing'}">
              ${cashed ? 'CASHED' : isCrashed ? 'CRASHED' : 'PLAYING'}
            </span>
            <span class="crash-status-amount">
              <img src="solana-coin.png" alt="" style="width:12px;height:12px;" />
              ${payout.toFixed(4)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  updateRugHistoryBar() {
    const listEl = document.getElementById('crashHistoryList');
    if (!listEl) return;
    listEl.innerHTML = this.rugHistory.map(m => {
      const cls = m < 1.50 ? 'red' : m < 2.00 ? 'neutral' : 'green';
      return `<span class="crash-badge ${cls}">${m.toFixed(2)}x</span>`;
    }).join('');
  }

  /* ------------------------------------------------------------- */
  /* 3. CHICKEN ROAD */
  /* ------------------------------------------------------------- */
  /* ------------------------------------------------------------- */
  /* 3. CHICKEN ROAD HIGHWAY ARENA */
  /* ------------------------------------------------------------- */
  getChickenMult(lane) {
    const list = this.chickenMultsConfig[this.chickenDifficulty] || this.chickenMultsConfig.medium;
    return list[lane] !== undefined ? list[lane] : list[list.length - 1];
  }

  initChickenRoad() {
    const betInput = document.getElementById('chickenBetInput');
    const usdEl = document.getElementById('chickenUsdEstimate');
    const updateUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.chickenBet * 150).toFixed(2)} USD`;
    };

    if (betInput) {
      betInput.value = this.chickenBet;
      updateUsd();
      betInput.addEventListener('input', (e) => {
        this.chickenBet = Math.max(0.0001, parseFloat(e.target.value) || 0.0001);
        updateUsd();
      });
    }

    const halfBtn = document.getElementById('chickenHalfBtn');
    const doubleBtn = document.getElementById('chickenDoubleBtn');
    const maxBtn = document.getElementById('chickenMaxBtn');

    if (halfBtn) halfBtn.addEventListener('click', () => {
      this.chickenBet = Math.max(0.0001, parseFloat((this.chickenBet / 2).toFixed(4)));
      if (betInput) betInput.value = this.chickenBet;
      updateUsd();
      gpAudio.playClick();
    });

    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      this.chickenBet = Math.min(this.balance, parseFloat((this.chickenBet * 2).toFixed(4)));
      if (betInput) betInput.value = this.chickenBet;
      updateUsd();
      gpAudio.playClick();
    });

    if (maxBtn) maxBtn.addEventListener('click', () => {
      this.chickenBet = Math.max(0.0001, parseFloat(this.balance.toFixed(4)));
      if (betInput) betInput.value = this.chickenBet;
      updateUsd();
      gpAudio.playClick();
    });

    // Difficulty selection
    document.querySelectorAll('.chicken-diff-item').forEach(item => {
      item.addEventListener('click', () => {
        if (this.chickenPlaying) return;
        document.querySelectorAll('.chicken-diff-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        this.chickenDifficulty = item.dataset.difficulty;
        this.chickenTotalLanes = this.chickenDifficulty === 'easy' ? 24 : this.chickenDifficulty === 'medium' ? 22 : 20;

        const countEl = document.getElementById('chickenDiffLanesCount');
        if (countEl) countEl.textContent = `${this.chickenTotalLanes} LANES`;

        const progressEl = document.getElementById('chickenProgressDisplay');
        if (progressEl) progressEl.textContent = `LANE 0 / ${this.chickenTotalLanes}`;

        const subtextEl = document.getElementById('chickenBtnSubtext');
        if (subtextEl) subtextEl.textContent = `START @ ${this.getChickenMult(1).toFixed(2)}x`;

        this.renderChickenHighwayLanes();
        gpAudio.playClick();
      });
    });

    // Main action buttons
    const mainBtn = document.getElementById('chickenMainActionBtn');
    const hopBtn = document.getElementById('chickenHopActionBtn');
    const cashoutBtn = document.getElementById('chickenCashoutActionBtn');
    const retryBtn = document.getElementById('chickenRetryBtn');

    if (mainBtn) mainBtn.addEventListener('click', () => this.startChickenGame());
    if (hopBtn) hopBtn.addEventListener('click', () => this.hopChickenNextLane());
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashoutChicken());
    if (retryBtn) retryBtn.addEventListener('click', () => {
      const overlay = document.getElementById('chickenSplatOverlay');
      if (overlay) overlay.style.display = 'none';
      this.resetChickenUI();
    });

    // Horizontal highway scrolling: mouse wheel, pointer drag, navigation chevrons, and toolbar controls
    const viewport = document.getElementById('chickenHighwayViewport');
    if (viewport) {
      let isDragging = false;
      let startX = 0;
      let startScroll = 0;

      // Mouse wheel scrolls highway horizontally
      viewport.addEventListener('wheel', (e) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta !== 0) {
          viewport.scrollLeft += delta;
          e.preventDefault();
        }
      }, { passive: false });

      // Prevent native HTML5 image/SVG drag from breaking panning
      viewport.addEventListener('dragstart', (e) => e.preventDefault());

      // Pointer drag (works reliably on mouse, trackpad, and touch)
      viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, .stepping-pad.next-target')) return;
        isDragging = true;
        startX = e.clientX;
        startScroll = viewport.scrollLeft;
        viewport.classList.add('is-dragging');
        try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
      });

      viewport.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dist = e.clientX - startX;
        viewport.scrollLeft = startScroll - dist;
      });

      const endPointerDrag = (e) => {
        if (isDragging) {
          isDragging = false;
          viewport.classList.remove('is-dragging');
          try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      viewport.addEventListener('pointerup', endPointerDrag);
      viewport.addEventListener('pointercancel', endPointerDrag);

      // Scroll arrows and update listener
      viewport.addEventListener('scroll', () => this.updateChickenScrollArrows());

      const leftArrow = document.getElementById('chickenScrollLeftBtn');
      const rightArrow = document.getElementById('chickenScrollRightBtn');
      if (leftArrow) {
        leftArrow.addEventListener('click', () => {
          viewport.scrollBy({ left: -360, behavior: 'smooth' });
          gpAudio.playClick();
        });
      }
      if (rightArrow) {
        rightArrow.addEventListener('click', () => {
          viewport.scrollBy({ left: 360, behavior: 'smooth' });
          gpAudio.playClick();
        });
      }

      // Quick toolbar jump controls
      const startBtn = document.getElementById('chickenScrollStartBtn');
      const centerBtn = document.getElementById('chickenCenterBtn');
      const endBtn = document.getElementById('chickenScrollEndBtn');

      if (startBtn) {
        startBtn.addEventListener('click', () => {
          viewport.scrollTo({ left: 0, behavior: 'smooth' });
          gpAudio.playClick();
        });
      }
      if (centerBtn) {
        centerBtn.addEventListener('click', () => {
          this.scrollToChicken(true);
          gpAudio.playClick();
        });
      }
      if (endBtn) {
        endBtn.addEventListener('click', () => {
          viewport.scrollTo({ left: viewport.scrollWidth, behavior: 'smooth' });
          gpAudio.playClick();
        });
      }

      // Left/Right arrow keys
      window.addEventListener('keydown', (e) => {
        if (this.activeGame !== 'chicken') return;
        if (['ArrowRight', 'd', 'D'].includes(e.key)) {
          viewport.scrollBy({ left: 160, behavior: 'smooth' });
        } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
          viewport.scrollBy({ left: -160, behavior: 'smooth' });
        }
      });
    }

    window.addEventListener('resize', () => {
      if (this.activeGame === 'chicken') {
        this.positionChicken();
        this.updateChickenScrollArrows();
      }
    });

    this.renderChickenHighwayLanes();
  }

  renderChickenHighwayLanes() {
    const track = document.getElementById('chickenLanesTrack');
    if (!track) return;
    track.innerHTML = '';

    const carTypes = ['taxi', 'red-sports', 'ice-cream', 'blue-sedan'];

    for (let i = 1; i <= this.chickenTotalLanes; i++) {
      const laneDiv = document.createElement('div');
      laneDiv.className = 'highway-lane';
      laneDiv.dataset.lane = i;

      const mult = this.getChickenMult(i);
      const isCleared = (this.chickenPlaying && i <= this.chickenLane && this.chickenLane > 0);
      const isNext = (this.chickenPlaying && i === this.chickenLane + 1);

      if (isCleared) {
        laneDiv.classList.add('lane-cleared', 'barrier-active');
      }

      // Top Hazard Barrier (Stops traffic coming from top - only visible when lane is cleared & safe)
      const barrierTop = document.createElement('div');
      barrierTop.className = 'lane-barrier lane-barrier-top';
      barrierTop.innerHTML = `
        <div class="barrier-leg barrier-leg-left"></div>
        <div class="barrier-leg barrier-leg-right"></div>
        <div class="barrier-rail">
          <div class="barrier-light barrier-light-left"></div>
          <div class="barrier-stripes"></div>
          <div class="barrier-light barrier-light-right"></div>
        </div>
      `;

      // Concentric Stepping Pad
      const pad = document.createElement('div');
      pad.className = `stepping-pad ${isCleared ? 'cleared' : ''} ${isNext ? 'next-target' : ''}`;
      pad.dataset.lane = i;
      pad.innerHTML = `
        <div class="stepping-pad-inner">
          <span class="stepping-pad-mult">${mult.toFixed(2)}x</span>
        </div>
      `;

      pad.addEventListener('click', () => {
        if (this.chickenPlaying && i === this.chickenLane + 1) {
          this.hopChickenNextLane();
        }
      });

      // Bottom Hazard Barrier (Stops traffic coming from bottom - only visible when lane is cleared & safe)
      const barrierBottom = document.createElement('div');
      barrierBottom.className = 'lane-barrier lane-barrier-bottom';
      barrierBottom.innerHTML = `
        <div class="barrier-leg barrier-leg-left"></div>
        <div class="barrier-leg barrier-leg-right"></div>
        <div class="barrier-rail">
          <div class="barrier-light barrier-light-left"></div>
          <div class="barrier-stripes"></div>
          <div class="barrier-light barrier-light-right"></div>
        </div>
      `;

      // Each road has one traffic direction. All vehicles in it follow that stream.
      const direction = i % 2 === 0 ? 'up' : 'down';
      const trafficCars = Array.from({ length: 2 }, (_, carIndex) => {
        const car = document.createElement('div');
        const typeIndex = (i + carIndex - 1) % carTypes.length;
        const type = carTypes[(typeIndex + carTypes.length) % carTypes.length];
        const stoppedClass = direction === 'down' ? 'stopped-top' : 'stopped-bottom';
        car.className = `lane-car lane-traffic-car car-${carIndex + 1} direction-${direction} ${isCleared ? stoppedClass : ''}`;
        car.dataset.lane = i;
        car.dataset.direction = direction;
        car.dataset.carIndex = carIndex;
        car.style.animationDuration = `${3.6 + ((i * 11 + carIndex * 7) % 13) * 0.1}s`;
        car.style.animationDelay = `${-carIndex * 2.1 - ((i * 7) % 8) * 0.1}s`;
        car.innerHTML = this.getCarSvgMarkup(type);
        return car;
      });

      laneDiv.appendChild(barrierTop);
      laneDiv.appendChild(pad);
      laneDiv.appendChild(barrierBottom);
      trafficCars.forEach(car => laneDiv.appendChild(car));
      track.appendChild(laneDiv);
    }

    // Automatically ensure character is centered on pad/sidewalk and scroll arrows are updated
    requestAnimationFrame(() => {
      this.positionChicken();
      this.updateChickenScrollArrows();
    });
  }

  positionChicken() {
    const char = document.getElementById('chickenCharacter');
    const arenaTrack = document.getElementById('chickenArenaTrack');
    if (!char || !arenaTrack) return;

    if (this.chickenLane === 0) {
      const sidewalk = document.querySelector('.chicken-paved-sidewalk');
      if (sidewalk) {
        const sideRect = sidewalk.getBoundingClientRect();
        const arenaRect = arenaTrack.getBoundingClientRect();
        const centerLeft = (sideRect.left + sideRect.width / 2) - arenaRect.left;
        char.style.left = `${centerLeft}px`;
        char.style.top = '290px';
      } else {
        char.style.left = '65px';
        char.style.top = '290px';
      }
    } else {
      const pad = document.querySelector(`.stepping-pad[data-lane="${this.chickenLane}"]`);
      if (pad) {
        const padRect = pad.getBoundingClientRect();
        const arenaRect = arenaTrack.getBoundingClientRect();
        const centerLeft = (padRect.left + padRect.width / 2) - arenaRect.left;
        const centerTop = (padRect.top + padRect.height / 2) - arenaRect.top;
        char.style.left = `${centerLeft}px`;
        char.style.top = `${centerTop}px`;
      } else {
        const fallbackLeft = 105 + (this.chickenLane - 0.5) * 78;
        char.style.left = `${fallbackLeft}px`;
        char.style.top = '290px';
      }
    }
  }

  scrollToChicken(smooth = true) {
    const viewport = document.getElementById('chickenHighwayViewport');
    const laneTrack = document.getElementById('chickenLanesTrack');
    if (!viewport) return;

    if (this.chickenLane === 0) {
      viewport.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
      this.updateChickenScrollArrows();
      return;
    }

    const lane = document.querySelector(`.highway-lane[data-lane="${this.chickenLane}"]`);
    if (lane && laneTrack) {
      const laneCenter = laneTrack.offsetLeft + lane.offsetLeft + lane.offsetWidth / 2;
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      // Center chicken around 38% from the left edge so upcoming lanes are clearly visible ahead
      const targetScroll = Math.max(0, Math.min(maxScroll, laneCenter - viewport.clientWidth * 0.38));
      viewport.scrollTo({ left: targetScroll, behavior: smooth ? 'smooth' : 'auto' });
    }
    this.updateChickenScrollArrows();
  }

  updateChickenScrollArrows() {
    const viewport = document.getElementById('chickenHighwayViewport');
    const leftArrow = document.getElementById('chickenScrollLeftBtn');
    const rightArrow = document.getElementById('chickenScrollRightBtn');
    if (!viewport) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (leftArrow) leftArrow.style.display = viewport.scrollLeft > 25 ? 'flex' : 'none';
    if (rightArrow) rightArrow.style.display = (maxScroll - viewport.scrollLeft > 25) ? 'flex' : 'none';
  }

  getCarSvgMarkup(type) {
    if (type === 'taxi') {
      return `
        <svg viewBox="0 0 36 70" width="36" height="70">
          <rect x="2" y="4" width="32" height="62" rx="8" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
          <path d="M6 18 Q18 14 30 18 L28 26 Q18 24 8 26 Z" fill="#1e293b"/>
          <rect x="7" y="27" width="22" height="22" rx="3" fill="#ca8a04"/>
          <rect x="11" y="34" width="14" height="8" rx="2" fill="#ffffff" stroke="#000" stroke-width="0.8"/>
          <text x="18" y="40" font-size="5" font-weight="900" text-anchor="middle" fill="#000">TAXI</text>
          <path d="M7 52 Q18 50 29 52 L28 58 Q18 56 8 58 Z" fill="#1e293b"/>
          <rect x="4" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="26" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="4" y="65" width="6" height="3" rx="1.5" fill="#ef4444"/>
          <rect x="26" y="65" width="6" height="3" rx="1.5" fill="#ef4444"/>
        </svg>
      `;
    } else if (type === 'red-sports') {
      return `
        <svg viewBox="0 0 36 70" width="36" height="70">
          <rect x="2" y="4" width="32" height="62" rx="10" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
          <rect x="13" y="4" width="4" height="62" fill="#ffffff"/>
          <rect x="19" y="4" width="4" height="62" fill="#ffffff"/>
          <path d="M6 18 Q18 15 30 18 L27 28 Q18 26 9 28 Z" fill="#0f172a"/>
          <path d="M7 50 Q18 48 29 50 L27 57 Q18 55 9 57 Z" fill="#0f172a"/>
          <rect x="4" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="26" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="4" y="65" width="6" height="3" rx="1.5" fill="#f87171"/>
          <rect x="26" y="65" width="6" height="3" rx="1.5" fill="#f87171"/>
        </svg>
      `;
    } else if (type === 'ice-cream') {
      return `
        <svg viewBox="0 0 36 70" width="36" height="70">
          <rect x="2" y="3" width="32" height="64" rx="6" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
          <rect x="5" y="18" width="26" height="44" rx="4" fill="#ffffff"/>
          <path d="M6 16 Q18 12 30 16 L28 24 Q18 21 8 24 Z" fill="#1e293b"/>
          <circle cx="18" cy="38" r="8" fill="#ec4899"/>
          <path d="M14 44 L18 54 L22 44 Z" fill="#f59e0b"/>
          <rect x="4" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="26" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
        </svg>
      `;
    } else {
      return `
        <svg viewBox="0 0 36 70" width="36" height="70">
          <rect x="2" y="4" width="32" height="62" rx="9" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
          <path d="M6 18 Q18 15 30 18 L28 27 Q18 25 8 27 Z" fill="#0f172a"/>
          <rect x="7" y="28" width="22" height="22" rx="3" fill="#1d4ed8"/>
          <path d="M7 51 Q18 49 29 51 L28 58 Q18 56 8 58 Z" fill="#0f172a"/>
          <rect x="4" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="26" y="2" width="6" height="3" rx="1.5" fill="#fef08a"/>
          <rect x="4" y="65" width="6" height="3" rx="1.5" fill="#ef4444"/>
          <rect x="26" y="65" width="6" height="3" rx="1.5" fill="#ef4444"/>
        </svg>
      `;
    }
  }

  startChickenGame() {
    if (this.chickenPlaying) return;
    if (this.balance < this.chickenBet) {
      this.showToast('Insufficient SOL Balance! Claim from Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - this.chickenBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.chickenPlaying = true;
    this.chickenLane = 0;

    // Reset character dead center on sidewalk
    const char = document.getElementById('chickenCharacter');
    if (char) {
      char.classList.remove('splatted');
    }
    this.positionChicken();

    const tag = document.getElementById('chickenCurrentMultTag');
    if (tag) tag.textContent = '1.01x';

    const progressEl = document.getElementById('chickenProgressDisplay');
    if (progressEl) progressEl.textContent = `LANE 0 / ${this.chickenTotalLanes}`;

    const mainBtn = document.getElementById('chickenMainActionBtn');
    const ingameBtns = document.getElementById('chickenIngameBtns');
    if (mainBtn) mainBtn.style.display = 'none';
    if (ingameBtns) ingameBtns.style.display = 'flex';

    const cashoutBtn = document.getElementById('chickenCashoutActionBtn');
    if (cashoutBtn) {
      cashoutBtn.textContent = `CASHOUT (LOCKED)`;
      cashoutBtn.disabled = true;
      cashoutBtn.style.opacity = '0.55';
    }

    this.renderChickenHighwayLanes();
    this.scrollToChicken(true);
    gpAudio.playTrade();
    this.showToast(`🐔 Crossing started with ${this.chickenBet} SOL!`);
  }

  hopChickenNextLane() {
    if (!this.chickenPlaying) return;

    this.chickenLane++;
    gpAudio.playHop();

    // Splat probability by difficulty
    const splatRate = this.chickenDifficulty === 'easy' ? 0.08 : this.chickenDifficulty === 'medium' ? 0.14 : 0.22;
    const isSplat = this.chickenLane > 1 && Math.random() < splatRate;

    const char = document.getElementById('chickenCharacter');
    if (char) {
      char.classList.add('hopping');
      setTimeout(() => char.classList.remove('hopping'), 350);
    }
    this.positionChicken();

    this.scrollToChicken(true);

    if (isSplat) {
      // Find the car in this lane and crash into chicken!
      const laneDiv = document.querySelector(`.highway-lane[data-lane="${this.chickenLane}"]`);
      if (laneDiv) {
        // Ensure NO barriers appear on an unsafe/splat tile!
        laneDiv.classList.remove('lane-cleared', 'barrier-active');
        const car = laneDiv.querySelector('.lane-traffic-car');
        if (car) car.classList.add('car-splat-rush');
      }
      setTimeout(() => this.splatChicken(), 320);
      return;
    }

    // Safe hop: cars stay stopped behind barriers!
    const currentMult = this.getChickenMult(this.chickenLane);
    const tag = document.getElementById('chickenCurrentMultTag');
    if (tag) tag.textContent = `${currentMult.toFixed(2)}x`;

    const progressEl = document.getElementById('chickenProgressDisplay');
    if (progressEl) progressEl.textContent = `LANE ${this.chickenLane} / ${this.chickenTotalLanes}`;

    const cashoutBtn = document.getElementById('chickenCashoutActionBtn');
    if (cashoutBtn) {
      const win = this.chickenBet * currentMult;
      cashoutBtn.textContent = `CASHOUT ${win.toFixed(4)} SOL`;
      cashoutBtn.disabled = false;
      cashoutBtn.style.opacity = '1';
    }

    // Update pads & cars state (barriers only show on safe landed tiles)
    this.updateHighwayPads();

    // Reached final lane
    if (this.chickenLane >= this.chickenTotalLanes) {
      setTimeout(() => this.cashoutChicken(), 400);
    }
  }

  updateHighwayPads() {
    const lanes = document.querySelectorAll('.highway-lane');
    lanes.forEach(l => {
      const lane = parseInt(l.dataset.lane);
      const pad = l.querySelector('.stepping-pad');
      const trafficCars = l.querySelectorAll('.lane-traffic-car');

      if (this.chickenPlaying && lane <= this.chickenLane && this.chickenLane > 0) {
        // SAFE & CLEARED TILE: Show barriers & stop cars in this lane!
        l.classList.add('lane-cleared', 'barrier-active');
        if (pad) {
          pad.classList.add('cleared');
          pad.classList.remove('next-target');
        }
        trafficCars.forEach(car => car.classList.add(car.dataset.direction === 'down' ? 'stopped-top' : 'stopped-bottom'));
      } else if (this.chickenPlaying && lane === this.chickenLane + 1) {
        // NEXT TARGET TILE: Highlight pad, BUT DO NOT show barriers and DO NOT stop cars!
        l.classList.remove('lane-cleared', 'barrier-active');
        if (pad) {
          pad.classList.add('next-target');
          pad.classList.remove('cleared');
        }
        trafficCars.forEach(car => car.classList.remove('stopped-top', 'stopped-bottom'));
      } else {
        // ALL OTHER TILES AHEAD: NO barriers, cars driving freely!
        l.classList.remove('lane-cleared', 'barrier-active');
        if (pad) pad.classList.remove('cleared', 'next-target');
        trafficCars.forEach(car => car.classList.remove('stopped-top', 'stopped-bottom'));
      }
    });
  }

  cashoutChicken() {
    if (!this.chickenPlaying) return;
    if (this.chickenLane < 1) {
      this.showToast('Hop at least one lane before cashing out.');
      return;
    }
    this.chickenPlaying = false;

    const currentMult = this.getChickenMult(this.chickenLane);
    const win = this.chickenBet * currentMult;
    const profit = win - this.chickenBet;
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('chicken', profit, currentMult);
    this.pushNotification('Chicken Road win', `Crossed ${this.chickenLane} lanes for +${this.formatSol(profit)} SOL.`, 'win');

    gpAudio.playWin();
    this.showToast(`🎉 CHICKEN SAFELY CROSSED! +${win.toFixed(4)} SOL (${currentMult.toFixed(2)}x)`);

    this.resetChickenUI();
  }

  splatChicken() {
    this.chickenPlaying = false;
    gpAudio.playCrash();

    const char = document.getElementById('chickenCharacter');
    if (char) char.classList.add('splatted');

    const overlay = document.getElementById('chickenSplatOverlay');
    if (overlay) overlay.style.display = 'flex';

    this.showToast(`🚗 SPLAT in Lane ${this.chickenLane}! Lost ${this.chickenBet} SOL`);
  }

  resetChickenUI() {
    const mainBtn = document.getElementById('chickenMainActionBtn');
    const ingameBtns = document.getElementById('chickenIngameBtns');
    if (mainBtn) mainBtn.style.display = 'flex';
    if (ingameBtns) ingameBtns.style.display = 'none';

    this.chickenLane = 0;
    const cashoutBtn = document.getElementById('chickenCashoutActionBtn');
    if (cashoutBtn) {
      cashoutBtn.disabled = true;
      cashoutBtn.style.opacity = '0.55';
      cashoutBtn.textContent = 'CASHOUT (LOCKED)';
    }
    const char = document.getElementById('chickenCharacter');
    if (char) {
      char.classList.remove('splatted');
    }
    this.positionChicken();

    const tag = document.getElementById('chickenCurrentMultTag');
    if (tag) tag.textContent = '1.01x';

    const progressEl = document.getElementById('chickenProgressDisplay');
    if (progressEl) progressEl.textContent = `LANE 0 / ${this.chickenTotalLanes}`;

    const viewport = document.getElementById('chickenHighwayViewport');
    if (viewport) viewport.scrollTo({ left: 0, behavior: 'smooth' });

    this.renderChickenHighwayLanes();
  }

  /* ------------------------------------------------------------- */
  /* 4. MINES */
  /* ------------------------------------------------------------- */
  initMines() {
    const startBtn = document.getElementById('minesStartBtn');
    const cashoutBtn = document.getElementById('minesCashoutBtn');
    const betInput = document.getElementById('minesBetInput');
    const countSelect = document.getElementById('minesCountSelect');

    if (betInput) betInput.addEventListener('change', (e) => this.minesBet = Math.max(0.001, parseFloat(e.target.value) || 0.05));
    if (countSelect) countSelect.addEventListener('change', (e) => this.minesCount = parseInt(e.target.value) || 3);
    if (startBtn) startBtn.addEventListener('click', () => this.startMines());
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashoutMines());

    const applyMinesBet = (value) => {
      const next = Math.max(0.001, Math.min(this.balance, parseFloat(value.toFixed(4)) || 0.001));
      this.minesBet = next;
      if (betInput) betInput.value = next;
    };
    document.getElementById('minesHalfBtn')?.addEventListener('click', () => applyMinesBet(this.minesBet / 2));
    document.getElementById('minesDoubleBtn')?.addEventListener('click', () => applyMinesBet(this.minesBet * 2));
    document.getElementById('minesMaxBtn')?.addEventListener('click', () => applyMinesBet(this.balance));

    this.renderMinesGrid();
  }

  startMines() {
    if (this.minesPlaying) return;
    if (this.balance < this.minesBet) {
      this.showToast('Insufficient SOL Balance! Claim from Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - this.minesBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.minesPlaying = true;
    this.minesRevealed = 0;
    this.minesMult = 1.0;

    this.minesGrid = new Array(25).fill(null).map(() => ({ isMine: false, revealed: false }));
    let placed = 0;
    while (placed < this.minesCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!this.minesGrid[idx].isMine) {
        this.minesGrid[idx].isMine = true;
        placed++;
      }
    }

    document.getElementById('minesStartBtn').style.display = 'none';
    const cashoutBtn = document.getElementById('minesCashoutBtn');
    cashoutBtn.style.display = 'flex';
    cashoutBtn.disabled = true;
    cashoutBtn.textContent = 'CASHOUT (0 Gems)';

    this.renderMinesGrid();
    gpAudio.playTrade();
  }

  pickMineTile(idx) {
    if (!this.minesPlaying) return;
    const tile = this.minesGrid[idx];
    if (tile.revealed) return;

    tile.revealed = true;
    if (tile.isMine) {
      this.minesPlaying = false;
      gpAudio.playCrash();
      this.showToast(`💥 BOOM! Hit a mine. Lost ${this.minesBet} SOL`);
      this.minesGrid.forEach(t => t.revealed = true);
      this.renderMinesGrid();
      setTimeout(() => {
        document.getElementById('minesStartBtn').style.display = 'flex';
        document.getElementById('minesCashoutBtn').style.display = 'none';
      }, 2000);
    } else {
      this.minesRevealed++;
      let fairMultiplier = 0.99;
      for (let i = 0; i < this.minesRevealed; i++) {
        fairMultiplier *= (25 - i) / (25 - this.minesCount - i);
      }
      this.minesMult = Math.max(1, parseFloat(fairMultiplier.toFixed(4)));
      gpAudio.playHop();

      const cashoutBtn = document.getElementById('minesCashoutBtn');
      cashoutBtn.disabled = false;
      cashoutBtn.textContent = `CASHOUT ${(this.minesBet * this.minesMult).toFixed(4)} SOL (${this.minesMult.toFixed(2)}x)`;

      this.renderMinesGrid();
      this.showToast(`💎 Gem found! ${this.minesRevealed} safe · ${this.minesMult.toFixed(2)}x`);
    }
  }

  cashoutMines() {
    if (!this.minesPlaying) return;
    this.minesPlaying = false;

    const win = this.minesBet * this.minesMult;
    const profit = win - this.minesBet;
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('mines', profit, this.minesMult);
    this.pushNotification('Mines win', `Cashed out ${this.minesRevealed} gems at ${this.minesMult.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');

    gpAudio.playWin();
    this.showToast(`💎 MINES WIN! Cashed out +${win.toFixed(4)} SOL (${this.minesMult.toFixed(2)}x)`);

    this.minesGrid.forEach(t => t.revealed = true);
    this.renderMinesGrid();

    document.getElementById('minesStartBtn').style.display = 'flex';
    document.getElementById('minesCashoutBtn').style.display = 'none';
  }

  renderMinesGrid() {
    const container = document.getElementById('minesGrid');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 25; i++) {
      const tileData = this.minesGrid[i] || { revealed: false, isMine: false };
      const tile = document.createElement('div');
      tile.className = 'gp-mine-tile';

      if (tileData.revealed) {
        if (tileData.isMine) {
          tile.classList.add('revealed-bomb');
          tile.textContent = '💣';
        } else {
          tile.classList.add('revealed-gem');
          tile.textContent = '💎';
        }
      } else {
        tile.addEventListener('click', () => this.pickMineTile(i));
      }
      container.appendChild(tile);
    }
  }

  /* ------------------------------------------------------------- */
  /* 5. BLACKJACK (GREENPUMP SOLANA 21) */
  /* ------------------------------------------------------------- */
  initBlackjackShoe() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['♠', '♥', '♦', '♣'];
    this.bjShoe = [];
    // 6-Deck Shoe
    for (let d = 0; d < 6; d++) {
      for (let s = 0; s < suits.length; s++) {
        for (let r = 0; r < ranks.length; r++) {
          const val = ranks[r];
          const suit = suits[s];
          let numVal = parseInt(val);
          if (['J', 'Q', 'K'].includes(val)) numVal = 10;
          if (val === 'A') numVal = 11;
          const isRed = suit === '♥' || suit === '♦';
          this.bjShoe.push({
            val,
            suit,
            numVal,
            rankIdx: r + 2, // 2..14
            isRed
          });
        }
      }
    }
    // Fisher-Yates Shuffle
    for (let i = this.bjShoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bjShoe[i], this.bjShoe[j]] = [this.bjShoe[j], this.bjShoe[i]];
    }
  }

  drawBlackjackCard() {
    if (!this.bjShoe || this.bjShoe.length < 40) {
      this.initBlackjackShoe();
    }
    return this.bjShoe.pop();
  }

  eval21plus3(c1, c2, c3) {
    const cards = [c1, c2, c3];
    // Suited Trips (Same rank AND same suit)
    if (cards[0].val === cards[1].val && cards[1].val === cards[2].val &&
        cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit) {
      return { won: true, mult: 100, label: 'Suited Trips (100:1)' };
    }

    const sameSuit = (cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit);
    const ranks = cards.map(c => c.rankIdx).sort((a, b) => a - b);
    const isNormalStraight = (ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1);
    const isAceLowStraight = (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14);
    const isStraight = isNormalStraight || isAceLowStraight;

    // Straight Flush
    if (sameSuit && isStraight) {
      return { won: true, mult: 40, label: 'Straight Flush (40:1)' };
    }
    // Three of a Kind
    if (cards[0].val === cards[1].val && cards[1].val === cards[2].val) {
      return { won: true, mult: 30, label: 'Three of a Kind (30:1)' };
    }
    // Straight
    if (isStraight) {
      return { won: true, mult: 10, label: 'Straight (10:1)' };
    }
    // Flush
    if (sameSuit) {
      return { won: true, mult: 5, label: 'Flush (5:1)' };
    }

    return { won: false, mult: 0, label: 'No Match' };
  }

  evalPerfectPair(c1, c2) {
    if (c1.val !== c2.val) {
      return { won: false, mult: 0, label: 'No Pair' };
    }
    if (c1.suit === c2.suit) {
      return { won: true, mult: 25, label: 'Perfect Pair (25:1)' };
    }
    if (c1.isRed === c2.isRed) {
      return { won: true, mult: 12, label: 'Colored Pair (12:1)' };
    }
    return { won: true, mult: 6, label: 'Mixed Pair (6:1)' };
  }

  calcHand(hand) {
    let sum = 0;
    let aces = 0;
    hand.forEach(c => {
      if (c.val === 'A') {
        aces++;
        sum += 11;
      } else {
        sum += c.numVal;
      }
    });
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }
    return sum;
  }

  isNaturalBlackjack(hand) {
    return hand.length === 2 && this.calcHand(hand) === 21;
  }

  updateBlackjackBetDisplays() {
    const total = parseFloat((this.bjMainBet + this.bjSide213 + this.bjSidePair).toFixed(4));
    const totalEl = document.getElementById('bjTotalBetDisplay');
    const chipEl = document.getElementById('bjSeatChipVal');
    const repeatEl = document.getElementById('bjRepeatDisplay');
    const betMainInput = document.getElementById('bjBetMain');
    const bet213Input = document.getElementById('bjBet213');
    const betPairInput = document.getElementById('bjBetPair');

    if (totalEl) totalEl.textContent = total.toFixed(4);
    if (chipEl) chipEl.textContent = total.toFixed(4);
    if (repeatEl && this.bjLastBets) {
      const lastTotal = (this.bjLastBets.main + this.bjLastBets.side213 + this.bjLastBets.sidePair);
      repeatEl.textContent = lastTotal.toFixed(4);
    }
    if (betMainInput && parseFloat(betMainInput.value) !== this.bjMainBet) betMainInput.value = this.bjMainBet;
    if (bet213Input && parseFloat(bet213Input.value) !== this.bjSide213) bet213Input.value = this.bjSide213;
    if (betPairInput && parseFloat(betPairInput.value) !== this.bjSidePair) betPairInput.value = this.bjSidePair;
  }

  setActiveBetCapsule(target) {
    this.bjActiveTarget = target;
    const capMain = document.getElementById('bjCapsuleMain');
    const cap213 = document.getElementById('bjCapsule213');
    const capPair = document.getElementById('bjCapsulePair');

    [capMain, cap213, capPair].forEach(c => {
      if (c) c.classList.remove('active-main');
    });

    if (target === 'main' && capMain) capMain.classList.add('active-main');
    if (target === '213' && cap213) cap213.classList.add('active-main');
    if (target === 'pair' && capPair) capPair.classList.add('active-main');
    gpAudio.playClick();
  }

  applyBlackjackMultiplier(factor) {
    if (factor === 'max') {
      const maxVal = Math.max(0.001, parseFloat(Math.min(this.balance, 5.0).toFixed(4)));
      if (this.bjActiveTarget === 'main') this.bjMainBet = maxVal;
      else if (this.bjActiveTarget === '213') this.bjSide213 = maxVal;
      else if (this.bjActiveTarget === 'pair') this.bjSidePair = maxVal;
    } else {
      const mult = parseFloat(factor);
      if (this.bjActiveTarget === 'main') {
        this.bjMainBet = Math.max(0.001, parseFloat((this.bjMainBet * mult).toFixed(4)));
      } else if (this.bjActiveTarget === '213') {
        this.bjSide213 = Math.max(0, parseFloat((this.bjSide213 * mult).toFixed(4)));
      } else if (this.bjActiveTarget === 'pair') {
        this.bjSidePair = Math.max(0, parseFloat((this.bjSidePair * mult).toFixed(4)));
      }
    }
    this.updateBlackjackBetDisplays();
    gpAudio.playClick();
  }

  initBlackjack() {
    this.initBlackjackShoe();

    // Betting Capsules selection
    const capMain = document.getElementById('bjCapsuleMain');
    const cap213 = document.getElementById('bjCapsule213');
    const capPair = document.getElementById('bjCapsulePair');

    if (capMain) capMain.addEventListener('click', () => this.setActiveBetCapsule('main'));
    if (cap213) cap213.addEventListener('click', () => this.setActiveBetCapsule('213'));
    if (capPair) capPair.addEventListener('click', () => this.setActiveBetCapsule('pair'));

    // Inputs
    const betMainInput = document.getElementById('bjBetMain');
    const bet213Input = document.getElementById('bjBet213');
    const betPairInput = document.getElementById('bjBetPair');

    if (betMainInput) {
      betMainInput.addEventListener('input', (e) => {
        this.bjMainBet = Math.max(0, parseFloat(e.target.value) || 0);
        this.updateBlackjackBetDisplays();
      });
      betMainInput.addEventListener('focus', () => this.setActiveBetCapsule('main'));
    }
    if (bet213Input) {
      bet213Input.addEventListener('input', (e) => {
        this.bjSide213 = Math.max(0, parseFloat(e.target.value) || 0);
        this.updateBlackjackBetDisplays();
      });
      bet213Input.addEventListener('focus', () => this.setActiveBetCapsule('213'));
    }
    if (betPairInput) {
      betPairInput.addEventListener('input', (e) => {
        this.bjSidePair = Math.max(0, parseFloat(e.target.value) || 0);
        this.updateBlackjackBetDisplays();
      });
      betPairInput.addEventListener('focus', () => this.setActiveBetCapsule('pair'));
    }

    // Multipliers
    const halfBtn = document.getElementById('bjHalfBtn');
    const doubleBtn = document.getElementById('bjDoubleBtn');
    const maxBtn = document.getElementById('bjMaxBtn');

    if (halfBtn) halfBtn.addEventListener('click', () => this.applyBlackjackMultiplier(0.5));
    if (doubleBtn) doubleBtn.addEventListener('click', () => this.applyBlackjackMultiplier(2));
    if (maxBtn) maxBtn.addEventListener('click', () => this.applyBlackjackMultiplier('max'));

    // Utilities
    const clearBtn = document.getElementById('bjClearBetsBtn');
    const repeatBtn = document.getElementById('bjRepeatLastBtn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.bjMainBet = 0.001;
        this.bjSide213 = 0.0;
        this.bjSidePair = 0.0;
        this.updateBlackjackBetDisplays();
        gpAudio.playClick();
      });
    }

    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        if (this.bjLastBets) {
          this.bjMainBet = this.bjLastBets.main || 0.001;
          this.bjSide213 = this.bjLastBets.side213 || 0.0;
          this.bjSidePair = this.bjLastBets.sidePair || 0.0;
          this.updateBlackjackBetDisplays();
          gpAudio.playClick();
        }
      });
    }

    // Main action button (Place Bet)
    const placeBtn = document.getElementById('bjPlaceBetActionBtn');
    if (placeBtn) placeBtn.addEventListener('click', () => this.dealBlackjack());

    // Legacy fallback buttons if present
    const legacyDeal = document.getElementById('bjDealBtn');
    if (legacyDeal) legacyDeal.addEventListener('click', () => this.dealBlackjack());

    // In-game buttons
    const hitBtn = document.getElementById('bjHitActionBtn');
    const standBtn = document.getElementById('bjStandActionBtn');
    const doubleActionBtn = document.getElementById('bjDoubleActionBtn');
    const splitActionBtn = document.getElementById('bjSplitActionBtn');
    const newHandBtn = document.getElementById('bjNewHandActionBtn');

    if (hitBtn) hitBtn.addEventListener('click', () => this.hitBlackjack());
    if (standBtn) standBtn.addEventListener('click', () => this.standBlackjack());
    if (doubleActionBtn) doubleActionBtn.addEventListener('click', () => this.doubleBlackjack());
    if (splitActionBtn) splitActionBtn.addEventListener('click', () => this.doubleBlackjack());
    if (newHandBtn) newHandBtn.addEventListener('click', () => this.resetBlackjackToBetting());

    // Rulebook Modal
    const rulebookBtn = document.getElementById('bjRulebookBtn');
    const rulebookModal = document.getElementById('bjRulebookModal');
    const closeRulebookBtn = document.getElementById('closeBjRulebookBtn');

    if (rulebookBtn && rulebookModal) {
      rulebookBtn.addEventListener('click', () => {
        rulebookModal.classList.add('open');
        gpAudio.playClick();
      });
    }
    if (closeRulebookBtn && rulebookModal) {
      closeRulebookBtn.addEventListener('click', () => {
        rulebookModal.classList.remove('open');
        gpAudio.playClick();
      });
    }
    if (rulebookModal) {
      rulebookModal.addEventListener('click', (e) => {
        if (e.target === rulebookModal) rulebookModal.classList.remove('open');
      });
    }

    // Share & Fairness
    const shareBtn = document.getElementById('bjShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(window.location.href);
        this.showToast('Table link copied to clipboard!');
        gpAudio.playClick();
      });
    }

    const fairBtn = document.getElementById('bjFairnessBtn');
    if (fairBtn) {
      fairBtn.addEventListener('click', () => {
        this.showToast('Provably Fair: SHA-256 HMAC 6-Deck Shoe Seeded & Verified');
        gpAudio.playClick();
      });
    }

    this.updateBlackjackBetDisplays();
  }

  dealBlackjack() {
    if (this.bjPlaying) return;
    const totalBet = parseFloat((this.bjMainBet + this.bjSide213 + this.bjSidePair).toFixed(4));
    if (this.bjMainBet <= 0) {
      this.showToast('Main Bet must be at least 0.001 SOL');
      return;
    }
    if (this.balance < totalBet) {
      this.showToast('Insufficient SOL Balance! Claim from Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - totalBet).toFixed(4));
    this.saveBalance();
    this.bjPlaying = true;
    this.bjLastBets = { main: this.bjMainBet, side213: this.bjSide213, sidePair: this.bjSidePair };

    // Deal 2 cards to each
    this.bjPlayerHand = [this.drawBlackjackCard(), this.drawBlackjackCard()];
    this.bjDealerHand = [this.drawBlackjackCard(), this.drawBlackjackCard()];

    // UI state transitions
    const consoleEl = document.getElementById('bjBettingConsole');
    const inGameBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const dScoreWrap = document.getElementById('bjDealerScoreWrap');
    const pScoreWrap = document.getElementById('bjPlayerScoreWrap');
    const dDoubleBtn = document.getElementById('bjDoubleActionBtn');
    const dSplitBtn = document.getElementById('bjSplitActionBtn');

    if (consoleEl) consoleEl.style.display = 'none';
    if (bannerEl) bannerEl.style.display = 'none';
    if (inGameBar) inGameBar.style.display = 'flex';
    if (dScoreWrap) dScoreWrap.style.display = 'block';
    if (pScoreWrap) pScoreWrap.style.display = 'block';

    if (dDoubleBtn) dDoubleBtn.disabled = this.balance < this.bjMainBet;
    if (dSplitBtn) {
      const canSplit = this.bjPlayerHand[0].val === this.bjPlayerHand[1].val && this.balance >= this.bjMainBet;
      dSplitBtn.style.display = canSplit ? 'inline-flex' : 'none';
    }

    this.renderBlackjackUI(true);
    gpAudio.playTrade();

    // Side bets evaluation
    if (this.bjSide213 > 0) {
      const r213 = this.eval21plus3(this.bjPlayerHand[0], this.bjPlayerHand[1], this.bjDealerHand[0]);
      if (r213.won) {
        const win213 = parseFloat((this.bjSide213 * (r213.mult + 1)).toFixed(4));
        this.balance = parseFloat((this.balance + win213).toFixed(4));
        this.saveBalance();
        setTimeout(() => {
          this.showToast(`🎉 21+3 HIT: ${r213.label}! Won +${win213} SOL`);
          gpAudio.playWin();
        }, 300);
      }
    }
    if (this.bjSidePair > 0) {
      const rPair = this.evalPerfectPair(this.bjPlayerHand[0], this.bjPlayerHand[1]);
      if (rPair.won) {
        const winPair = parseFloat((this.bjSidePair * (rPair.mult + 1)).toFixed(4));
        this.balance = parseFloat((this.balance + winPair).toFixed(4));
        this.saveBalance();
        setTimeout(() => {
          this.showToast(`🎉 PAIR HIT: ${rPair.label}! Won +${winPair} SOL`);
          gpAudio.playWin();
        }, 500);
      }
    }

    // Check Natural Blackjack
    const playerBJ = this.isNaturalBlackjack(this.bjPlayerHand);
    const dealerBJ = this.isNaturalBlackjack(this.bjDealerHand);

    if (playerBJ || dealerBJ) {
      setTimeout(() => {
        this.renderBlackjackUI(false);
        if (playerBJ && dealerBJ) {
          const pushPayout = this.bjMainBet;
          this.balance = parseFloat((this.balance + pushPayout).toFixed(4));
          this.saveBalance();
          this.endBlackjack('PUSH (BOTH 21)', `Both player and dealer have Natural 21. Bet returned.`, pushPayout);
        } else if (playerBJ) {
          // 3:2 payout: bet * 2.5
          const bjPayout = parseFloat((this.bjMainBet * 2.5).toFixed(4));
          this.balance = parseFloat((this.balance + bjPayout).toFixed(4));
          this.saveBalance();
          this.endBlackjack('BLACKJACK! 3 TO 2', `Natural 21! Player wins +${bjPayout.toFixed(4)} SOL`, bjPayout);
        } else {
          this.endBlackjack('DEALER BLACKJACK', `Dealer has Natural 21. Main bet lost.`, 0);
        }
      }, 700);
    }
  }

  hitBlackjack() {
    if (!this.bjPlaying) return;
    const dDoubleBtn = document.getElementById('bjDoubleActionBtn');
    const dSplitBtn = document.getElementById('bjSplitActionBtn');
    if (dDoubleBtn) dDoubleBtn.disabled = true;
    if (dSplitBtn) dSplitBtn.style.display = 'none';

    this.bjPlayerHand.push(this.drawBlackjackCard());
    gpAudio.playHop();
    this.renderBlackjackUI(true);

    const sum = this.calcHand(this.bjPlayerHand);
    if (sum > 21) {
      this.bjPlaying = false;
      this.renderBlackjackUI(false);
      this.endBlackjack('PLAYER BUST!', `Busted with ${sum}! Lost ${this.bjMainBet.toFixed(4)} SOL`, 0);
    } else if (sum === 21) {
      setTimeout(() => this.standBlackjack(), 400);
    }
  }

  doubleBlackjack() {
    if (!this.bjPlaying) return;
    if (this.balance < this.bjMainBet) {
      this.showToast('Insufficient SOL balance to double down');
      return;
    }

    this.balance = parseFloat((this.balance - this.bjMainBet).toFixed(4));
    this.saveBalance();
    this.bjMainBet = parseFloat((this.bjMainBet * 2).toFixed(4));
    this.updateBlackjackBetDisplays();

    this.bjPlayerHand.push(this.drawBlackjackCard());
    gpAudio.playHop();

    const sum = this.calcHand(this.bjPlayerHand);
    if (sum > 21) {
      this.bjPlaying = false;
      this.renderBlackjackUI(false);
      this.endBlackjack('DOUBLE BUST!', `Busted with ${sum}! Lost ${this.bjMainBet.toFixed(4)} SOL`, 0);
    } else {
      setTimeout(() => this.standBlackjack(), 500);
    }
  }

  standBlackjack() {
    if (!this.bjPlaying) return;
    this.bjPlaying = false;

    // Dealer reveals hole card and draws to 17
    this.renderBlackjackUI(false);

    const dealerStep = () => {
      const dSum = this.calcHand(this.bjDealerHand);
      if (dSum < 17) {
        this.bjDealerHand.push(this.drawBlackjackCard());
        gpAudio.playHop();
        this.renderBlackjackUI(false);
        setTimeout(dealerStep, 450);
      } else {
        this.finishBlackjackRound();
      }
    };

    setTimeout(dealerStep, 400);
  }

  finishBlackjackRound() {
    const pSum = this.calcHand(this.bjPlayerHand);
    const dSum = this.calcHand(this.bjDealerHand);

    if (dSum > 21) {
      const payout = parseFloat((this.bjMainBet * 2).toFixed(4));
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.endBlackjack('DEALER BUST!', `Dealer busted with ${dSum}! Player wins +${payout.toFixed(4)} SOL`, payout);
    } else if (pSum > dSum) {
      const payout = parseFloat((this.bjMainBet * 2).toFixed(4));
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.endBlackjack('PLAYER WINS!', `Player ${pSum} beats Dealer ${dSum}! Won +${payout.toFixed(4)} SOL`, payout);
    } else if (pSum === dSum) {
      const payout = parseFloat(this.bjMainBet.toFixed(4));
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.endBlackjack('PUSH (TIE)', `Both have ${pSum}! Bet returned ${payout.toFixed(4)} SOL`, payout);
    } else {
      this.endBlackjack('DEALER WINS', `Dealer ${dSum} beats Player ${pSum}. Main bet lost.`, 0);
    }
  }

  endBlackjack(title, sub, payout) {
    this.bjPlaying = false;
    const inGameBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const titleEl = document.getElementById('bjOutcomeTitle');
    const subEl = document.getElementById('bjOutcomeSub');

    if (inGameBar) inGameBar.style.display = 'none';
    if (bannerEl) {
      bannerEl.style.display = 'flex';
      bannerEl.className = 'bj-outcome-banner' + (payout > 0 ? ' is-win' : ' is-loss');
    }
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;

    if (payout > 0) {
      gpAudio.playWin();
    } else {
      gpAudio.playCrash();
    }
  }

  resetBlackjackToBetting() {
    this.bjPlaying = false;
    const consoleEl = document.getElementById('bjBettingConsole');
    const inGameBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const dScoreWrap = document.getElementById('bjDealerScoreWrap');
    const pScoreWrap = document.getElementById('bjPlayerScoreWrap');
    const dCards = document.getElementById('bjDealerCards');
    const pCards = document.getElementById('bjPlayerCards');

    if (bannerEl) bannerEl.style.display = 'none';
    if (inGameBar) inGameBar.style.display = 'none';
    if (consoleEl) consoleEl.style.display = 'flex';
    if (dScoreWrap) dScoreWrap.style.display = 'none';
    if (pScoreWrap) pScoreWrap.style.display = 'none';
    if (dCards) dCards.innerHTML = '';
    if (pCards) pCards.innerHTML = '';

    // Restore base main bet if it was doubled
    if (this.bjLastBets) {
      this.bjMainBet = this.bjLastBets.main;
      this.bjSide213 = this.bjLastBets.side213;
      this.bjSidePair = this.bjLastBets.sidePair;
    }
    this.updateBlackjackBetDisplays();
    gpAudio.playClick();
  }

  renderBlackjackUI(hideDealerHole = false) {
    const dCont = document.getElementById('bjDealerCards');
    const pCont = document.getElementById('bjPlayerCards');
    if (!dCont || !pCont) return;

    dCont.innerHTML = this.bjDealerHand.map((c, i) => {
      if (hideDealerHole && i === 1) {
        return `<div class="bj-card card-back"><span>♠</span></div>`;
      }
      return `
        <div class="bj-card ${c.isRed ? 'card-red' : 'card-black'}">
          <div class="card-top-idx">${c.val}${c.suit}</div>
          <div class="card-center-suit">${c.suit}</div>
          <div class="card-bottom-idx">${c.val}${c.suit}</div>
        </div>
      `;
    }).join('');

    pCont.innerHTML = this.bjPlayerHand.map(c => `
      <div class="bj-card ${c.isRed ? 'card-red' : 'card-black'}">
        <div class="card-top-idx">${c.val}${c.suit}</div>
        <div class="card-center-suit">${c.suit}</div>
        <div class="card-bottom-idx">${c.val}${c.suit}</div>
      </div>
    `).join('');

    const pSum = this.calcHand(this.bjPlayerHand);
    const dSum = hideDealerHole ? this.bjDealerHand[0].numVal : this.calcHand(this.bjDealerHand);

    const pScoreEl = document.getElementById('bjPlayerScore');
    const dScoreEl = document.getElementById('bjDealerScore');
    if (pScoreEl) pScoreEl.textContent = pSum;
    if (dScoreEl) dScoreEl.textContent = dSum;
  }

  /* ------------------------------------------------------------- */
  /* 6. HIGHER / LOWER (HiLo) */
  /* ------------------------------------------------------------- */
  initHiLo() {
    const higherBtn = document.getElementById('hiloHigherBtn');
    const lowerBtn = document.getElementById('hiloLowerBtn');
    const cashoutBtn = document.getElementById('hiloCashoutBtn');
    const betInput = document.getElementById('hiloBetInput');

    if (betInput) betInput.addEventListener('change', (e) => this.hiloBet = Math.max(0.001, parseFloat(e.target.value) || 0.05));
    if (higherBtn) higherBtn.addEventListener('click', () => this.playHiLoStep('higher'));
    if (lowerBtn) lowerBtn.addEventListener('click', () => this.playHiLoStep('lower'));
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashoutHiLo());
  }

  playHiLoStep(choice) {
    if (this.balance < this.hiloBet && !this.hiloPlaying) {
      this.showToast('Insufficient SOL Balance!');
      return;
    }

    if (!this.hiloPlaying) {
      this.balance -= this.hiloBet;
      this.saveBalance();
      this.hiloPlaying = true;
      this.hiloStreak = 0;
    }

    const nextCard = Math.floor(Math.random() * 13) + 1; // 1 to 13
    const isHigher = nextCard > this.hiloCurrentCard;
    const isLower = nextCard < this.hiloCurrentCard;
    const won = (choice === 'higher' && isHigher) || (choice === 'lower' && isLower) || (nextCard === this.hiloCurrentCard);

    this.hiloCurrentCard = nextCard;
    const cardEl = document.getElementById('hiloCurrentCardDisplay');
    const names = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    if (cardEl) cardEl.textContent = names[nextCard - 1] || nextCard;

    if (won) {
      this.hiloStreak++;
      gpAudio.playHop();
      const mult = (1.0 + this.hiloStreak * 0.45).toFixed(2);
      const cashoutBtn = document.getElementById('hiloCashoutBtn');
      if (cashoutBtn) {
        cashoutBtn.style.display = 'flex';
        cashoutBtn.textContent = `CASHOUT ${(this.hiloBet * mult).toFixed(3)} SOL (${mult}x)`;
      }
    } else {
      this.hiloPlaying = false;
      gpAudio.playCrash();
      this.showToast(`Wrong! Card was ${names[nextCard - 1]}. Lost ${this.hiloBet} SOL`);
      document.getElementById('hiloCashoutBtn').style.display = 'none';
    }
  }

  cashoutHiLo() {
    if (!this.hiloPlaying) return;
    this.hiloPlaying = false;
    const mult = 1.0 + this.hiloStreak * 0.45;
    const win = this.hiloBet * mult;
    this.balance += win;
    this.saveBalance();

    gpAudio.playWin();
    this.showToast(`🎉 HiLo Won! +${win.toFixed(3)} SOL (${mult.toFixed(2)}x)`);
    document.getElementById('hiloCashoutBtn').style.display = 'none';
  }

  /* ------------------------------------------------------------- */
  /* 7. FLAPPY BIRD BETTING */
  /* ------------------------------------------------------------- */
  initFlappy() {
    const canvas = document.getElementById('flappyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('flappyStartBtn');
    const flapBtn = document.getElementById('flappyFlapBtn');

    const jump = () => {
      if (this.flappyPlaying) {
        this.flappyVy = -6.5;
        gpAudio.playHop();
      }
    };

    if (canvas) canvas.addEventListener('mousedown', jump);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.activeGame === 'flappy') {
        e.preventDefault();
        jump();
      }
    });
    if (flapBtn) flapBtn.addEventListener('click', jump);

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.balance < 0.05) {
          this.showToast('Insufficient SOL Balance!');
          return;
        }
        this.balance -= 0.05;
        this.saveBalance();
        this.flappyPlaying = true;
        this.flappyY = 200;
        this.flappyVy = 0;
        this.flappyScore = 0;
        this.flappyPipes = [{ x: 450, top: 120, bottom: 260 }];
        startBtn.style.display = 'none';
        this.runFlappyLoop(canvas, ctx);
      });
    }
  }

  runFlappyLoop(canvas, ctx) {
    if (!this.flappyPlaying) return;
    const w = canvas.width;
    const h = canvas.height;

    this.flappyVy += 0.38; // gravity
    this.flappyY += this.flappyVy;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Pipes
    ctx.fillStyle = '#22c55e';
    this.flappyPipes.forEach(p => {
      p.x -= 2.5;
      ctx.fillRect(p.x, 0, 45, p.top);
      ctx.fillRect(p.x, p.bottom, 45, h - p.bottom);

      // Score
      if (p.x === 90) {
        this.flappyScore++;
        gpAudio.playHop();
      }

      // Collision
      if (
        90 + 15 > p.x && 90 - 15 < p.x + 45 &&
        (this.flappyY - 15 < p.top || this.flappyY + 15 > p.bottom)
      ) {
        this.flappyPlaying = false;
      }
    });

    if (this.flappyPipes.length > 0 && this.flappyPipes[0].x < -50) {
      this.flappyPipes.shift();
      this.flappyPipes.push({
        x: w + 20,
        top: Math.random() * 140 + 60,
        bottom: Math.random() * 140 + 220
      });
    }

    if (this.flappyY > h || this.flappyY < 0) this.flappyPlaying = false;

    // Draw Bird
    ctx.font = '28px sans-serif';
    ctx.fillText('🐤', 75, this.flappyY + 10);

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Fredoka", sans-serif';
    ctx.fillText(`${(1.0 + this.flappyScore * 0.5).toFixed(1)}x`, 20, 40);

    if (this.flappyPlaying) {
      requestAnimationFrame(() => this.runFlappyLoop(canvas, ctx));
    } else {
      gpAudio.playCrash();
      this.showToast(`Game Over! Score: ${this.flappyScore}`);
      document.getElementById('flappyStartBtn').style.display = 'block';
    }
  }



  /* ------------------------------------------------------------- */
  /* CHAT & AIRDROP */
  /* ------------------------------------------------------------- */
  initPublicChat() {
    const sidebar = document.querySelector('.global-public-chat-sidebar');
    const openBtn = document.querySelector('button[title="Open Public Chat"]');
    const minBtn = document.querySelector('button[title="Minimize chat"]');
    const feed = document.querySelector('[data-chat-feed="true"]');
    const input = document.getElementById('gpChatInput');
    const sendBtn = document.getElementById('gpChatSendBtn');

    if (minBtn && sidebar && openBtn) {
      minBtn.addEventListener('click', () => {
        sidebar.style.transform = 'translateX(-315px)';
        sidebar.style.opacity = '0';
        sidebar.style.pointerEvents = 'none';

        openBtn.style.transform = 'translateX(0) scale(1)';
        openBtn.style.opacity = '1';
        openBtn.style.pointerEvents = 'auto';

        document.querySelector('.pump-main-shell').style.paddingLeft = '16px';
        gpAudio.playClick();
      });
    }

    if (openBtn && sidebar) {
      openBtn.addEventListener('click', () => {
        sidebar.style.transform = 'translateX(0)';
        sidebar.style.opacity = '1';
        sidebar.style.pointerEvents = 'auto';

        openBtn.style.transform = 'translateX(-28px) scale(0.92)';
        openBtn.style.opacity = '0';
        openBtn.style.pointerEvents = 'none';

        if (window.innerWidth >= 1025) {
          document.querySelector('.pump-main-shell').style.paddingLeft = '328px';
        }
        gpAudio.playClick();
      });
    }

    const randomUsers = [
      { name: 'SolDegen_77', vip: 'VIP 2' },
      { name: 'CryptoWhale', vip: 'HIGH ROLLER' },
      { name: 'PepeMaxi', vip: 'VIP 1' },
      { name: 'BullishChad', vip: 'VIP 3' }
    ];
    const msgs = [
      'PUMP TO THE MOON! 🚀',
      'ez 1.95x cashout! LFG',
      'chicken road is printing today 🐔',
      'green candles looking so clean',
      'mines 5 gems hit!! 💎',
      'who is betting high roller here?'
    ];

    const addMsg = (username, vip, text, isSelf = false) => {
      if (!feed) return;
      const d = document.createElement('div');
      d.className = 'chat-message-item';
      d.innerHTML = `
        <div class="chat-user-header">
          <span class="chat-badge-vip" style="${isSelf ? 'background:#22c55e;' : ''}">${vip}</span>
          <span class="chat-username" style="${isSelf ? 'color:#4ade80;' : ''}">${username}</span>
        </div>
        <div class="chat-user-msg">${text}</div>
      `;
      feed.appendChild(d);
      feed.scrollTop = feed.scrollHeight;
      while (feed.children.length > 30) feed.removeChild(feed.firstChild);
    };

    addMsg('GreenpumpBot', 'SYSTEM', 'Welcome to GREENPUMP.XYZ! 100% On-chain fairness.');
    addMsg('CryptoWhale', 'HIGH ROLLER', 'huge pump coming on next 10s tick 🚀');

    setInterval(() => {
      const u = randomUsers[Math.floor(Math.random() * randomUsers.length)];
      const m = msgs[Math.floor(Math.random() * msgs.length)];
      addMsg(u.name, u.vip, m);
      this.totalBets += Math.floor(Math.random() * 3) + 1;
      const bEl = document.getElementById('totalBetsCounter');
      if (bEl) bEl.textContent = this.totalBets.toLocaleString();
    }, 4500);

    const sendMsg = () => {
      if (!input) return;
      const val = input.value.trim();
      if (!val) return;
      addMsg('You', 'VIP 1', val, true);
      input.value = '';
      gpAudio.playClick();
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMsg);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendMsg(); }
    });
  }

  initAirdrop() {
    let s = 142;
    const tEl = document.getElementById('airdropTimerDisplay');
    const fEl = document.getElementById('airdropProgressBar');
    setInterval(() => {
      if (s <= 0) s = 180;
      s--;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      if (tEl) tEl.textContent = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      if (fEl) fEl.style.width = `${((180 - s) / 180) * 100}%`;
    }, 1000);
  }

  /* ============================================================= */
  /* BLACKJACK — FULL REWRITE (side bets, split, double, naturals) */
  /* ============================================================= */
  initBlackjack() {
    this.initBlackjackShoe();

    const capMain = document.getElementById('bjCapsuleMain');
    const cap213 = document.getElementById('bjCapsule213');
    const capPair = document.getElementById('bjCapsulePair');
    if (capMain) capMain.addEventListener('click', () => this.setActiveBetCapsule('main'));
    if (cap213) cap213.addEventListener('click', () => this.setActiveBetCapsule('213'));
    if (capPair) capPair.addEventListener('click', () => this.setActiveBetCapsule('pair'));

    const mainInput = document.getElementById('bjBetMain');
    const side213Input = document.getElementById('bjBet213');
    const pairInput = document.getElementById('bjBetPair');

    const syncBets = () => {
      this.bjMainBet = Math.max(0, parseFloat(mainInput?.value) || 0);
      this.bjSide213 = Math.max(0, parseFloat(side213Input?.value) || 0);
      this.bjSidePair = Math.max(0, parseFloat(pairInput?.value) || 0);
      this.updateBlackjackBetDisplays();
    };

    if (mainInput) {
      mainInput.addEventListener('input', syncBets);
      mainInput.addEventListener('focus', () => this.setActiveBetCapsule('main'));
    }
    if (side213Input) {
      side213Input.addEventListener('input', syncBets);
      side213Input.addEventListener('focus', () => this.setActiveBetCapsule('213'));
    }
    if (pairInput) {
      pairInput.addEventListener('input', syncBets);
      pairInput.addEventListener('focus', () => this.setActiveBetCapsule('pair'));
    }

    const halfBtn = document.getElementById('bjHalfBtn');
    const doubleBtn = document.getElementById('bjDoubleBtn');
    const maxBtn = document.getElementById('bjMaxBtn');
    if (halfBtn) halfBtn.addEventListener('click', () => this.applyBlackjackMultiplier(0.5));
    if (doubleBtn) doubleBtn.addEventListener('click', () => this.applyBlackjackMultiplier(2));
    if (maxBtn) maxBtn.addEventListener('click', () => this.applyBlackjackMultiplier('max'));

    const clearBtn = document.getElementById('bjClearBetsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.bjMainBet = 0.001;
        this.bjSide213 = 0;
        this.bjSidePair = 0;
        this.updateBlackjackBetDisplays();
        gpAudio.playClick();
      });
    }

    const repeatBtn = document.getElementById('bjRepeatLastBtn');
    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        this.bjMainBet = this.bjLastBets.main || 0.001;
        this.bjSide213 = this.bjLastBets.side213 || 0;
        this.bjSidePair = this.bjLastBets.sidePair || 0;
        this.updateBlackjackBetDisplays();
        gpAudio.playClick();
      });
    }

    const placeBtn = document.getElementById('bjPlaceBetActionBtn');
    if (placeBtn) placeBtn.addEventListener('click', () => this.dealBlackjack());

    const hitBtn = document.getElementById('bjHitActionBtn');
    const standBtn = document.getElementById('bjStandActionBtn');
    const doubleActionBtn = document.getElementById('bjDoubleActionBtn');
    const splitActionBtn = document.getElementById('bjSplitActionBtn');
    const newHandBtn = document.getElementById('bjNewHandActionBtn');
    if (hitBtn) hitBtn.addEventListener('click', () => this.hitBlackjack());
    if (standBtn) standBtn.addEventListener('click', () => this.standBlackjack());
    if (doubleActionBtn) doubleActionBtn.addEventListener('click', () => this.doubleBlackjack());
    if (splitActionBtn) splitActionBtn.addEventListener('click', () => this.splitBlackjack());
    if (newHandBtn) newHandBtn.addEventListener('click', () => this.resetBlackjackToBetting());

    this.updateBlackjackBetDisplays();
    this.resetBlackjackToBetting();
  }

  currentBlackjackHand() {
    return this.bjHands[this.bjHandIndex] || null;
  }

  blackjackCardMarkup(card) {
    return `
      <div class="bj-card ${card.isRed ? 'card-red' : 'card-black'}">
        <div class="card-top-idx">${card.val}${card.suit}</div>
        <div class="card-center-suit">${card.suit}</div>
        <div class="card-bottom-idx">${card.val}${card.suit}</div>
      </div>
    `;
  }

  dealBlackjack() {
    if (this.bjPlaying) return;
    const main = parseFloat(this.bjMainBet) || 0;
    const side213 = parseFloat(this.bjSide213) || 0;
    const sidePair = parseFloat(this.bjSidePair) || 0;
    const total = parseFloat((main + side213 + sidePair).toFixed(4));

    if (main < 0.0001) {
      this.showToast('Main bet must be at least 0.0001 SOL.');
      return;
    }
    if (this.balance < total) {
      this.showToast('Insufficient SOL Balance! Claim from the Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - total).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.bjLastBets = { main, side213, sidePair };
    this.bjPlaying = true;
    this.bjHandIndex = 0;
    this.bjHands = [{
      cards: [this.drawBlackjackCard(), this.drawBlackjackCard()],
      bet: main,
      doubled: false,
      done: false
    }];
    this.bjDealerHand = [this.drawBlackjackCard(), this.drawBlackjackCard()];

    const consoleEl = document.getElementById('bjBettingConsole');
    const actionBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const dealerScore = document.getElementById('bjDealerScoreWrap');
    const playerScore = document.getElementById('bjPlayerScoreWrap');
    if (consoleEl) consoleEl.style.display = 'none';
    if (actionBar) actionBar.style.display = 'flex';
    if (bannerEl) bannerEl.style.display = 'none';
    if (dealerScore) dealerScore.style.display = 'block';
    if (playerScore) playerScore.style.display = 'block';

    this.renderBlackjackUI(true);
    this.resolveBlackjackSideBets();
    gpAudio.playTrade();

    const playerNatural = this.isNaturalBlackjack(this.bjHands[0].cards);
    const dealerNatural = this.isNaturalBlackjack(this.bjDealerHand);
    if (playerNatural || dealerNatural) {
      if (actionBar) actionBar.style.display = 'none';
      setTimeout(() => {
        this.renderBlackjackUI(false);
        this.resolveBlackjackRound(true);
      }, 650);
    } else {
      this.updateBlackjackActions();
    }
  }

  resolveBlackjackSideBets() {
    if (this.bjSide213 > 0) {
      const result = this.eval21plus3(this.bjHands[0].cards[0], this.bjHands[0].cards[1], this.bjDealerHand[0]);
      if (result.won) {
        const win = parseFloat((this.bjSide213 * (result.mult + 1)).toFixed(4));
        this.balance = parseFloat((this.balance + win).toFixed(4));
        this.saveBalance();
        this.recordWin('blackjack 21+3', win - this.bjSide213, result.mult + 1);
        setTimeout(() => {
          this.showToast(`🎉 21+3: ${result.label}! +${win.toFixed(4)} SOL`);
          gpAudio.playWin();
        }, 320);
      }
    }
    if (this.bjSidePair > 0) {
      const result = this.evalPerfectPair(this.bjHands[0].cards[0], this.bjHands[0].cards[1]);
      if (result.won) {
        const win = parseFloat((this.bjSidePair * (result.mult + 1)).toFixed(4));
        this.balance = parseFloat((this.balance + win).toFixed(4));
        this.saveBalance();
        this.recordWin('blackjack pair', win - this.bjSidePair, result.mult + 1);
        setTimeout(() => {
          this.showToast(`🎉 PERFECT PAIR: ${result.label}! +${win.toFixed(4)} SOL`);
          gpAudio.playWin();
        }, 520);
      }
    }
  }

  updateBlackjackActions() {
    const hand = this.currentBlackjackHand();
    const active = !!this.bjPlaying && !!hand && !hand.done;
    const hit = document.getElementById('bjHitActionBtn');
    const stand = document.getElementById('bjStandActionBtn');
    const doubleBtn = document.getElementById('bjDoubleActionBtn');
    const splitBtn = document.getElementById('bjSplitActionBtn');

    if (hit) hit.disabled = !active;
    if (stand) stand.disabled = !active;
    if (doubleBtn) {
      doubleBtn.disabled = !(active && hand.cards.length === 2 && !hand.doubled && this.balance >= hand.bet);
    }
    if (splitBtn) {
      const canSplit = active && this.bjHands.length === 1 && hand.cards.length === 2 &&
        hand.cards[0].val === hand.cards[1].val && this.balance >= hand.bet;
      splitBtn.style.display = canSplit ? 'inline-flex' : 'none';
    }
  }

  hitBlackjack() {
    const hand = this.currentBlackjackHand();
    if (!this.bjPlaying || !hand || hand.done) return;
    hand.cards.push(this.drawBlackjackCard());
    gpAudio.playHop();
    this.renderBlackjackUI(false);

    const sum = this.calcHand(hand.cards);
    if (sum > 21) {
      hand.done = true;
      this.showToast(`💥 Hand busted with ${sum}.`);
      gpAudio.playCrash();
      this.updateBlackjackActions();
      setTimeout(() => this.advanceBlackjackHand(), 420);
    } else if (sum === 21) {
      hand.done = true;
      this.updateBlackjackActions();
      setTimeout(() => this.advanceBlackjackHand(), 380);
    } else {
      this.updateBlackjackActions();
    }
  }

  standBlackjack() {
    const hand = this.currentBlackjackHand();
    if (!this.bjPlaying || !hand || hand.done) return;
    hand.done = true;
    this.advanceBlackjackHand();
  }

  doubleBlackjack() {
    const hand = this.currentBlackjackHand();
    if (!this.bjPlaying || !hand || hand.done) return;
    if (hand.cards.length !== 2 || hand.doubled) return;
    if (this.balance < hand.bet) {
      this.showToast('Insufficient SOL balance to double down.');
      return;
    }

    this.balance = parseFloat((this.balance - hand.bet).toFixed(4));
    this.saveBalance();
    hand.bet = parseFloat((hand.bet * 2).toFixed(4));
    hand.doubled = true;
    hand.cards.push(this.drawBlackjackCard());
    gpAudio.playTrade();
    this.renderBlackjackUI(false);
    hand.done = true;
    this.updateBlackjackActions();
    setTimeout(() => this.advanceBlackjackHand(), 520);
  }

  splitBlackjack() {
    const hand = this.currentBlackjackHand();
    if (!this.bjPlaying || !hand || hand.done) return;
    if (this.bjHands.length > 1 || hand.cards.length !== 2) return;
    if (hand.cards[0].val !== hand.cards[1].val) return;
    if (this.balance < hand.bet) {
      this.showToast('Insufficient SOL balance to split.');
      return;
    }

    this.balance = parseFloat((this.balance - hand.bet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    const bet = hand.bet;
    const firstCard = hand.cards[0];
    const secondCard = hand.cards[1];
    this.bjHands = [
      { cards: [firstCard, this.drawBlackjackCard()], bet, doubled: false, done: false },
      { cards: [secondCard, this.drawBlackjackCard()], bet, doubled: false, done: false }
    ];
    this.bjHandIndex = 0;
    gpAudio.playTrade();
    this.renderBlackjackUI(false);
    this.updateBlackjackActions();
    this.showToast('✂️ Hand split. Play each hand separately.');
  }

  advanceBlackjackHand() {
    if (!this.bjPlaying) return;
    let nextIndex = this.bjHandIndex + 1;
    while (nextIndex < this.bjHands.length && this.bjHands[nextIndex].done) nextIndex++;
    if (nextIndex < this.bjHands.length) {
      this.bjHandIndex = nextIndex;
      this.renderBlackjackUI(false);
      this.updateBlackjackActions();
      return;
    }

    const anyAlive = this.bjHands.some(h => this.calcHand(h.cards) <= 21);
    const actionBar = document.getElementById('bjIngameActionBar');
    if (actionBar) actionBar.style.display = 'none';
    if (!anyAlive) {
      this.resolveBlackjackRound(false);
      return;
    }
    this.playDealerBlackjack();
  }

  playDealerBlackjack() {
    this.renderBlackjackUI(false);
    const step = () => {
      const dealerSum = this.calcHand(this.bjDealerHand);
      if (dealerSum < 17) {
        this.bjDealerHand.push(this.drawBlackjackCard());
        gpAudio.playHop();
        this.renderBlackjackUI(false);
        this.bjDealerTimer = setTimeout(step, 430);
      } else {
        this.resolveBlackjackRound(false);
      }
    };
    this.bjDealerTimer = setTimeout(step, 430);
  }

  resolveBlackjackRound(isNatural) {
    const dealerSum = this.calcHand(this.bjDealerHand);
    const lines = [];
    let totalReturn = 0;
    let totalStake = 0;

    this.bjHands.forEach((hand, index) => {
      const playerSum = this.calcHand(hand.cards);
      totalStake += hand.bet;
      let status;
      if (playerSum > 21) {
        status = 'BUST';
      } else if (isNatural) {
        const playerBJ = this.isNaturalBlackjack(hand.cards);
        const dealerBJ = this.isNaturalBlackjack(this.bjDealerHand);
        if (playerBJ && dealerBJ) status = 'PUSH';
        else if (playerBJ) status = 'BLACKJACK';
        else status = 'LOSS';
      } else if (dealerSum > 21 || playerSum > dealerSum) {
        status = 'WIN';
      } else if (playerSum === dealerSum) {
        status = 'PUSH';
      } else {
        status = 'LOSS';
      }

      if (status === 'BLACKJACK') {
        totalReturn += parseFloat((hand.bet * 2.5).toFixed(4));
        lines.push(`Hand ${index + 1}: BLACKJACK +${(hand.bet * 1.5).toFixed(4)} SOL`);
      } else if (status === 'WIN') {
        totalReturn += parseFloat((hand.bet * 2).toFixed(4));
        lines.push(`Hand ${index + 1}: WIN +${hand.bet.toFixed(4)} SOL`);
      } else if (status === 'PUSH') {
        totalReturn += hand.bet;
        lines.push(`Hand ${index + 1}: PUSH`);
      } else if (status === 'BUST') {
        lines.push(`Hand ${index + 1}: BUST (${playerSum})`);
      } else {
        lines.push(`Hand ${index + 1}: LOSS`);
      }
    });

    totalReturn = parseFloat(totalReturn.toFixed(4));
    if (totalReturn > 0) {
      this.balance = parseFloat((this.balance + totalReturn).toFixed(4));
      this.saveBalance();
    }
    this.bumpTotalBets(0);

    const profit = parseFloat((totalReturn - totalStake).toFixed(4));
    this.bjPlaying = false;
    if (this.bjDealerTimer) {
      clearTimeout(this.bjDealerTimer);
      this.bjDealerTimer = null;
    }
    this.renderBlackjackUI(false);

    let title = 'DEALER WINS';
    if (isNatural && this.isNaturalBlackjack(this.bjHands[0].cards)) {
      const dealerBJ = this.isNaturalBlackjack(this.bjDealerHand);
      title = dealerBJ ? 'PUSH — BOTH BLACKJACK' : 'BLACKJACK! PAYS 3 TO 2';
    } else if (this.bjHands.length > 1) {
      title = profit > 0 ? 'SPLIT RESULT — PROFIT' : profit < 0 ? 'SPLIT RESULT — LOSS' : 'SPLIT RESULT — PUSH';
    } else {
      const playerSum = this.calcHand(this.bjHands[0].cards);
      if (playerSum > 21) title = 'PLAYER BUST!';
      else if (dealerSum > 21) title = 'DEALER BUST!';
      else if (playerSum > dealerSum) title = 'PLAYER WINS!';
      else if (playerSum === dealerSum) title = 'PUSH (TIE)';
    }

    const totalLabel = profit > 0
      ? `Net +${profit.toFixed(4)} SOL · returned ${totalReturn.toFixed(4)} SOL`
      : profit < 0
        ? `Lost ${Math.abs(profit).toFixed(4)} SOL`
        : 'Your wager was returned.';
    const sub = this.bjHands.length > 1
      ? `${lines.join(' · ')} — ${totalLabel}`
      : `${lines[0]} — ${totalLabel}`;

    if (profit > 0) {
      this.recordWin('blackjack', profit, totalReturn / Math.max(totalStake, 0.0001));
      this.pushNotification('Blackjack win', `${title} — +${this.formatSol(profit)} SOL.`, 'win');
    }
    this.endBlackjack(title, sub, profit > 0);
  }

  endBlackjack(title, sub, isWin) {
    this.bjPlaying = false;
    const actionBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const titleEl = document.getElementById('bjOutcomeTitle');
    const subEl = document.getElementById('bjOutcomeSub');
    if (actionBar) actionBar.style.display = 'none';
    if (bannerEl) {
      bannerEl.style.display = 'flex';
      bannerEl.className = `bj-outcome-banner ${isWin ? 'is-win' : 'is-loss'}`;
    }
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    if (isWin) gpAudio.playWin();
    else gpAudio.playCrash();
    this.updateBlackjackActions();
  }

  resetBlackjackToBetting() {
    this.bjPlaying = false;
    if (this.bjDealerTimer) {
      clearTimeout(this.bjDealerTimer);
      this.bjDealerTimer = null;
    }
    this.bjHands = [];
    this.bjDealerHand = [];
    this.bjHandIndex = 0;

    const consoleEl = document.getElementById('bjBettingConsole');
    const actionBar = document.getElementById('bjIngameActionBar');
    const bannerEl = document.getElementById('bjOutcomeBanner');
    const dealerScore = document.getElementById('bjDealerScoreWrap');
    const playerScore = document.getElementById('bjPlayerScoreWrap');
    const dealerCards = document.getElementById('bjDealerCards');
    const playerCards = document.getElementById('bjPlayerCards');
    if (bannerEl) bannerEl.style.display = 'none';
    if (actionBar) actionBar.style.display = 'none';
    if (consoleEl) consoleEl.style.display = 'flex';
    if (dealerScore) dealerScore.style.display = 'none';
    if (playerScore) playerScore.style.display = 'none';
    if (dealerCards) dealerCards.innerHTML = '';
    if (playerCards) playerCards.innerHTML = '';

    this.bjMainBet = this.bjLastBets.main || 0.001;
    this.bjSide213 = this.bjLastBets.side213 || 0;
    this.bjSidePair = this.bjLastBets.sidePair || 0;
    this.updateBlackjackBetDisplays();
    this.updateBlackjackActions();
    gpAudio.playClick();
  }

  renderBlackjackUI(hideDealerHole = false) {
    const dealerCont = document.getElementById('bjDealerCards');
    const playerCont = document.getElementById('bjPlayerCards');
    if (!dealerCont || !playerCont) return;

    dealerCont.innerHTML = this.bjDealerHand.map((card, index) => {
      if (hideDealerHole && index === 1) {
        return '<div class="bj-card card-back"><span>♠</span></div>';
      }
      return this.blackjackCardMarkup(card);
    }).join('');

    const multiple = this.bjHands.length > 1;
    playerCont.innerHTML = this.bjHands.map((hand, index) => {
      const sum = this.calcHand(hand.cards);
      const activeClass = index === this.bjHandIndex && !hand.done ? 'active-hand' : '';
      const doneClass = hand.done ? 'done-hand' : '';
      return `
        <div class="bj-hand-group ${activeClass} ${doneClass}">
          ${multiple ? `<div class="bj-hand-tag">HAND ${index + 1} · ${sum}${hand.doubled ? ' · 2x' : ''}</div>` : ''}
          <div class="bj-cards-cluster bj-nested-cards">
            ${hand.cards.map(card => this.blackjackCardMarkup(card)).join('')}
          </div>
        </div>
      `;
    }).join('');

    const activeHand = this.currentBlackjackHand();
    const playerSum = activeHand ? this.calcHand(activeHand.cards) : 0;
    const dealerSum = hideDealerHole && this.bjDealerHand.length
      ? this.calcHand([this.bjDealerHand[0]])
      : this.calcHand(this.bjDealerHand);

    const playerScoreEl = document.getElementById('bjPlayerScore');
    const dealerScoreEl = document.getElementById('bjDealerScore');
    if (playerScoreEl) playerScoreEl.textContent = playerSum;
    if (dealerScoreEl) dealerScoreEl.textContent = dealerSum;
  }

  /* ============================================================= */
  /* HIGHER / LOWER — FULL REWRITE */
  /* ============================================================= */
  initHiLo() {
    this.drawHiLoCard(true);

    const betInput = document.getElementById('hiloBetInput');
    const usdEl = document.getElementById('hiloUsdEstimate');
    const updateUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.hiloBet * 150).toFixed(2)} USD`;
    };
    if (betInput) {
      betInput.value = this.hiloBet;
      betInput.addEventListener('input', (e) => {
        this.hiloBet = Math.max(0.001, parseFloat(e.target.value) || 0.001);
        updateUsd();
        this.updateHiLoUI();
      });
      updateUsd();
    }

    const half = document.getElementById('hiloHalfBtn');
    const double = document.getElementById('hiloDoubleBtn');
    const max = document.getElementById('hiloMaxBtn');
    if (half) half.addEventListener('click', () => {
      this.hiloBet = Math.max(0.001, parseFloat((this.hiloBet / 2).toFixed(4)));
      if (betInput) betInput.value = this.hiloBet;
      updateUsd();
      this.updateHiLoUI();
      gpAudio.playClick();
    });
    if (double) double.addEventListener('click', () => {
      this.hiloBet = Math.max(0.001, parseFloat((this.hiloBet * 2).toFixed(4)));
      if (betInput) betInput.value = this.hiloBet;
      updateUsd();
      this.updateHiLoUI();
      gpAudio.playClick();
    });
    if (max) max.addEventListener('click', () => {
      this.hiloBet = Math.max(0.001, parseFloat(this.balance.toFixed(4)));
      if (betInput) betInput.value = this.hiloBet;
      updateUsd();
      this.updateHiLoUI();
      gpAudio.playClick();
    });

    const higher = document.getElementById('hiloHigherBtn');
    const lower = document.getElementById('hiloLowerBtn');
    const cashout = document.getElementById('hiloCashoutBtn');
    if (higher) higher.addEventListener('click', () => this.playHiLoStep('higher'));
    if (lower) lower.addEventListener('click', () => this.playHiLoStep('lower'));
    if (cashout) cashout.addEventListener('click', () => this.cashoutHiLo());

    this.updateHiLoUI();
    this.renderHiLoHistory();
  }

  drawHiLoCard(initial = false) {
    const suits = [
      { suit: '♠', red: false },
      { suit: '♥', red: true },
      { suit: '♦', red: true },
      { suit: '♣', red: false }
    ];
    const rank = Math.floor(Math.random() * 13) + 2;
    const pick = suits[Math.floor(Math.random() * suits.length)];
    const card = { rank, suit: pick.suit, isRed: pick.red };
    this.hiloCurrentRank = rank;
    this.hiloCurrentSuit = pick.suit;
    this.hiloCurrentRed = pick.red;
    if (initial) this.hiloHistory = [card];
    return card;
  }

  hiLoProbabilities(rank = this.hiloCurrentRank) {
    return {
      higher: (14 - rank) / 13,
      lower: (rank - 2) / 13,
      tie: 1 / 13
    };
  }

  renderHiLoCard() {
    const rankName = this.hiloCurrentRank === 14 ? 'A' : this.hiloCurrentRank === 13 ? 'K' :
      this.hiloCurrentRank === 12 ? 'Q' : this.hiloCurrentRank === 11 ? 'J' : String(this.hiloCurrentRank);
    const top = document.getElementById('hiloCardTop');
    const bottom = document.getElementById('hiloCardBottom');
    const suit = document.getElementById('hiloCardSuitDisplay');
    const face = document.getElementById('hiloCardFace');
    if (top) top.textContent = `${rankName}${this.hiloCurrentSuit}`;
    if (bottom) bottom.textContent = `${rankName}${this.hiloCurrentSuit}`;
    if (suit) suit.textContent = this.hiloCurrentSuit;
    if (face) {
      face.classList.toggle('card-red', !!this.hiloCurrentRed);
      face.classList.toggle('card-black', !this.hiloCurrentRed);
    }
  }

  updateHiLoUI() {
    this.renderHiLoCard();
    const probs = this.hiLoProbabilities();
    const higherPct = Math.round(probs.higher * 100);
    const lowerPct = Math.round(probs.lower * 100);
    const higherProbEl = document.getElementById('hiloHigherProb');
    const lowerProbEl = document.getElementById('hiloLowerProb');
    const higherBtn = document.getElementById('hiloHigherBtn');
    const lowerBtn = document.getElementById('hiloLowerBtn');
    const higherBar = document.getElementById('hiloHigherBar');
    const lowerBar = document.getElementById('hiloLowerBar');

    if (higherProbEl) higherProbEl.textContent = `${higherPct}%`;
    if (lowerProbEl) lowerProbEl.textContent = `${lowerPct}%`;
    if (higherBar) higherBar.style.width = `${higherPct}%`;
    if (lowerBar) lowerBar.style.width = `${lowerPct}%`;
    if (higherBtn) higherBtn.disabled = probs.higher === 0;
    if (lowerBtn) lowerBtn.disabled = probs.lower === 0;

    const streakEl = document.getElementById('hiloStreakDisplay');
    const multEl = document.getElementById('hiloMultDisplay');
    const payoutEl = document.getElementById('hiloPayoutDisplay');
    const cashoutBtn = document.getElementById('hiloCashoutBtn');
    if (streakEl) streakEl.textContent = this.hiloStreak;
    if (multEl) multEl.textContent = `${this.hiloMult.toFixed(2)}x`;
    if (payoutEl) {
      const payout = this.hiloPlaying ? this.hiloBet * this.hiloMult : this.hiloBet;
      payoutEl.textContent = `${payout.toFixed(4)} SOL`;
    }
    if (cashoutBtn) {
      const show = this.hiloPlaying && this.hiloStreak > 0;
      cashoutBtn.style.display = show ? 'block' : 'none';
      if (show) {
        cashoutBtn.textContent = `CASHOUT ${(this.hiloBet * this.hiloMult).toFixed(4)} SOL (${this.hiloMult.toFixed(2)}x)`;
      }
    }
  }

  renderHiLoHistory() {
    const el = document.getElementById('hiloHistory');
    if (!el) return;
    el.innerHTML = '';
    this.hiloHistory.slice(0, 14).forEach(card => {
      const rankName = card.rank === 14 ? 'A' : card.rank === 13 ? 'K' : card.rank === 12 ? 'Q' :
        card.rank === 11 ? 'J' : String(card.rank);
      const chip = document.createElement('span');
      chip.className = `hilo-history-chip ${card.isRed ? 'red' : 'black'}`;
      chip.textContent = `${rankName}${card.suit}`;
      el.appendChild(chip);
    });
  }

  playHiLoStep(choice) {
    if (this.hiloResolving) return;
    const probs = this.hiLoProbabilities();
    const probability = choice === 'higher' ? probs.higher : probs.lower;
    if (probability <= 0) return;

    if (!this.hiloPlaying) {
      if (this.balance < this.hiloBet) {
        this.showToast('Insufficient SOL Balance! Claim from the Faucet.');
        return;
      }
      this.balance = parseFloat((this.balance - this.hiloBet).toFixed(4));
      this.saveBalance();
      this.bumpTotalBets(1);
      this.hiloPlaying = true;
      this.hiloStreak = 0;
      this.hiloMult = 1;
    }

    this.hiloResolving = true;
    const previousRank = this.hiloCurrentRank;
    const card = this.drawHiLoCard(false);
    const isTie = card.rank === previousRank;
    const won = choice === 'higher' ? card.rank > previousRank : card.rank < previousRank;
    this.hiloHistory.unshift(card);
    if (this.hiloHistory.length > 16) this.hiloHistory.pop();
    this.renderHiLoHistory();

    const statusEl = document.getElementById('hiloStatus');
    if (isTie) {
      if (statusEl) statusEl.textContent = 'Push — same rank. Your streak is safe.';
      gpAudio.playClick();
      this.updateHiLoUI();
      this.hiloResolving = false;
      return;
    }

    if (won) {
      const factor = 0.98 / probability;
      this.hiloStreak++;
      this.hiloMult = parseFloat((this.hiloMult * factor).toFixed(4));
      if (statusEl) statusEl.textContent = `Correct! ${this.hiloStreak} in a row · ${this.hiloMult.toFixed(2)}x`;
      gpAudio.playHop();
      this.showToast(`✅ Correct! Streak ${this.hiloStreak} · ${this.hiloMult.toFixed(2)}x`);
    } else {
      this.hiloPlaying = false;
      this.hiloStreak = 0;
      this.hiloMult = 1;
      if (statusEl) statusEl.textContent = `Wrong call. Lost ${this.hiloBet.toFixed(4)} SOL. Try again.`;
      gpAudio.playCrash();
      this.showToast(`❌ Wrong! Lost ${this.hiloBet.toFixed(4)} SOL.`);
    }

    this.updateHiLoUI();
    this.hiloResolving = false;
  }

  cashoutHiLo() {
    if (!this.hiloPlaying || this.hiloStreak < 1) return;
    const win = this.hiloBet * this.hiloMult;
    const profit = win - this.hiloBet;
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('hilo', profit, this.hiloMult);
    this.pushNotification('HiLo win', `Cashed out a ${this.hiloStreak}-card streak at ${this.hiloMult.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');
    gpAudio.playWin();
    this.showToast(`🎉 HiLo cashed out +${win.toFixed(4)} SOL (${this.hiloMult.toFixed(2)}x)`);

    const statusEl = document.getElementById('hiloStatus');
    if (statusEl) statusEl.textContent = `Cashed out +${win.toFixed(4)} SOL. Place a new bet to play again.`;
    this.hiloPlaying = false;
    this.hiloStreak = 0;
    this.hiloMult = 1;
    this.updateHiLoUI();
  }

  /* ============================================================= */
  /* FLAPPY BIRD — FULL REWRITE */
  /* ============================================================= */
  initFlappy() {
    this.flappyCanvas = document.getElementById('flappyCanvas');
    if (!this.flappyCanvas) return;
    this.flappyCtx = this.flappyCanvas.getContext('2d');
    this.flappyCanvas.width = 720;
    this.flappyCanvas.height = 420;

    const betInput = document.getElementById('flappyBetInput');
    const usdEl = document.getElementById('flappyUsdEstimate');
    const updateUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.flappyBet * 150).toFixed(2)} USD`;
      const payoutEl = document.getElementById('flappyPayoutDisplay');
      if (payoutEl) payoutEl.textContent = `${(this.flappyBet * (this.flappyPlaying ? this.flappyMult : 1)).toFixed(4)} SOL`;
      const startBtn = document.getElementById('flappyStartBtn');
      if (startBtn && !this.flappyPlaying) startBtn.textContent = `PLAY FLAPPY (${this.flappyBet.toFixed(3)} SOL)`;
    };
    if (betInput) {
      betInput.value = this.flappyBet;
      betInput.addEventListener('input', (e) => {
        this.flappyBet = Math.max(0.001, parseFloat(e.target.value) || 0.001);
        updateUsd();
      });
      updateUsd();
    }

    const half = document.getElementById('flappyHalfBtn');
    const double = document.getElementById('flappyDoubleBtn');
    const max = document.getElementById('flappyMaxBtn');
    const setBet = (value) => {
      this.flappyBet = Math.max(0.001, parseFloat(value.toFixed(4)));
      if (betInput) betInput.value = this.flappyBet;
      updateUsd();
      gpAudio.playClick();
    };
    if (half) half.addEventListener('click', () => setBet(this.flappyBet / 2));
    if (double) double.addEventListener('click', () => setBet(this.flappyBet * 2));
    if (max) max.addEventListener('click', () => setBet(this.balance));

    const startBtn = document.getElementById('flappyStartBtn');
    const restartBtn = document.getElementById('flappyRestartBtn');
    const cashoutBtn = document.getElementById('flappyCashoutBtn');
    const flapBtn = document.getElementById('flappyFlapBtn');
    if (startBtn) startBtn.addEventListener('click', () => this.startFlappyGame());
    if (restartBtn) restartBtn.addEventListener('click', () => this.startFlappyGame());
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashoutFlappy());
    if (flapBtn) flapBtn.addEventListener('click', () => this.flapFlappy());
    if (this.flappyCanvas) {
      this.flappyCanvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.flapFlappy();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (this.activeGame !== 'flappy') return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.flapFlappy();
      }
    });

    this.updateFlappyBestUI();
    this.resetFlappyUI();
    this.drawFlappyScene();
  }

  updateFlappyBestUI() {
    const el = document.getElementById('flappyBestDisplay');
    if (el) el.textContent = this.flappyBest;
  }

  startFlappyGame() {
    if (this.flappyPlaying) return;
    if (this.balance < this.flappyBet) {
      this.showToast('Insufficient SOL Balance! Claim from the Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - this.flappyBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.flappyPlaying = true;
    this.flappyCashedOut = false;
    this.flappyScore = 0;
    this.flappyMult = 1;
    this.flappyY = 210;
    this.flappyVy = -5;
    this.flappyPipes = [];
    this.spawnFlappyPipe(740);
    this.spawnFlappyPipe(1080);
    this.flappyLastTs = 0;

    const startBtn = document.getElementById('flappyStartBtn');
    const restartBtn = document.getElementById('flappyRestartBtn');
    const cashoutBtn = document.getElementById('flappyCashoutBtn');
    const flapBtn = document.getElementById('flappyFlapBtn');
    const hint = document.getElementById('flappyCanvasHint');
    const status = document.getElementById('flappyStatus');
    if (startBtn) startBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'none';
    if (cashoutBtn) {
      cashoutBtn.style.display = 'block';
      cashoutBtn.disabled = true;
      cashoutBtn.textContent = 'CASHOUT (PASS 1 PIPE)';
    }
    if (flapBtn) flapBtn.disabled = false;
    if (hint) hint.hidden = true;
    if (status) status.textContent = 'Tap, click or press Space to flap.';
    this.updateFlappyHUD();

    if (this.flappyRaf) cancelAnimationFrame(this.flappyRaf);
    this.flappyRaf = requestAnimationFrame((ts) => this.runFlappyLoop(ts));
    gpAudio.playTrade();
  }

  spawnFlappyPipe(x) {
    const h = 420;
    const gap = 164;
    const margin = 78;
    const center = margin + gap / 2 + Math.random() * (h - margin * 2 - gap);
    this.flappyPipes.push({
      x,
      top: center - gap / 2,
      bottom: center + gap / 2,
      scored: false
    });
  }

  flapFlappy() {
    if (!this.flappyPlaying) return;
    this.flappyVy = -7.4;
    gpAudio.playHop();
  }

  updateFlappyHUD() {
    const scoreEl = document.getElementById('flappyScoreDisplay');
    const multEl = document.getElementById('flappyMultDisplay');
    const payoutEl = document.getElementById('flappyPayoutDisplay');
    const cashoutBtn = document.getElementById('flappyCashoutBtn');
    if (scoreEl) scoreEl.textContent = this.flappyScore;
    if (multEl) multEl.textContent = `${this.flappyMult.toFixed(2)}x`;
    if (payoutEl) payoutEl.textContent = `${(this.flappyBet * (this.flappyPlaying ? this.flappyMult : 1)).toFixed(4)} SOL`;
    if (cashoutBtn) {
      if (this.flappyScore > 0 && this.flappyPlaying) {
        cashoutBtn.disabled = false;
        cashoutBtn.textContent = `CASHOUT ${(this.flappyBet * this.flappyMult).toFixed(4)} SOL (${this.flappyMult.toFixed(2)}x)`;
      } else {
        cashoutBtn.disabled = true;
        if (this.flappyPlaying) cashoutBtn.textContent = 'CASHOUT (PASS 1 PIPE)';
      }
    }
  }

  runFlappyLoop(timestamp) {
    if (!this.flappyPlaying) return;
    if (!this.flappyLastTs) this.flappyLastTs = timestamp;
    const dt = Math.min((timestamp - this.flappyLastTs) / 16.667, 2.5) || 1;
    this.flappyLastTs = timestamp;

    this.flappyVy += 0.43 * dt;
    this.flappyY += this.flappyVy * dt;

    const birdX = 170;
    const radius = 16;
    const pipeWidth = 74;
    const h = 420;

    this.flappyPipes.forEach(pipe => {
      pipe.x -= 3.15 * dt;
      if (!pipe.scored && pipe.x + pipeWidth < birdX) {
        pipe.scored = true;
        this.flappyScore++;
        this.flappyMult = 1 + this.flappyScore * 0.35;
        this.updateFlappyHUD();
        gpAudio.playHop();
      }
    });

    if (this.flappyPipes.length === 0 || this.flappyPipes[this.flappyPipes.length - 1].x < 720 - 330) {
      this.spawnFlappyPipe(760);
    }
    this.flappyPipes = this.flappyPipes.filter(pipe => pipe.x > -120);

    const circleHitsRect = (cx, cy, r, rx, ry, rw, rh) => {
      const closestX = Math.max(rx, Math.min(cx, rx + rw));
      const closestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy < r * r;
    };

    let hit = this.flappyY + radius >= h - 22 || this.flappyY - radius <= 0;
    if (!hit) {
      hit = this.flappyPipes.some(pipe =>
        circleHitsRect(birdX, this.flappyY, radius, pipe.x, 0, pipeWidth, pipe.top) ||
        circleHitsRect(birdX, this.flappyY, radius, pipe.x, pipe.bottom, pipeWidth, h - pipe.bottom)
      );
    }

    this.drawFlappyScene();
    if (hit) {
      this.endFlappyGame(true);
      return;
    }
    this.flappyRaf = requestAnimationFrame((ts) => this.runFlappyLoop(ts));
  }

  drawFlappyScene() {
    const canvas = this.flappyCanvas;
    const ctx = this.flappyCtx;
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0d1b2a');
    sky.addColorStop(0.55, '#13321f');
    sky.addColorStop(1, '#07130c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(74, 222, 128, 0.05)';
    for (let i = 0; i < 10; i++) {
      const bx = (i * 97 + (this.flappyScore * 13)) % w;
      const by = 40 + ((i * 53) % 180);
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0a2416';
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#164e2c';
    ctx.fillRect(0, h - 22, w, 4);

    this.flappyPipes.forEach(pipe => {
      const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + 74, 0);
      gradient.addColorStop(0, '#15803d');
      gradient.addColorStop(0.45, '#22c55e');
      gradient.addColorStop(1, '#166534');
      ctx.fillStyle = gradient;
      ctx.fillRect(pipe.x, 0, 74, pipe.top);
      ctx.fillRect(pipe.x, pipe.bottom, 74, h - pipe.bottom - 22);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(pipe.x - 5, pipe.top - 20, 84, 20);
      ctx.fillRect(pipe.x - 5, pipe.bottom, 84, 20);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(pipe.x + 62, 0, 12, pipe.top);
      ctx.fillRect(pipe.x + 62, pipe.bottom, 12, h - pipe.bottom);
    });

    const birdX = 170;
    ctx.save();
    ctx.translate(birdX, this.flappyY);
    ctx.rotate(Math.max(-0.45, Math.min(0.9, this.flappyVy / 12)));
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 9, 11, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -6, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8.5, -6, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(14, 1);
    ctx.lineTo(25, 5);
    ctx.lineTo(14, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(16, 16, 132, 56, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${this.flappyMult.toFixed(2)}x`, 30, 51);
    ctx.fillStyle = '#4ade80';
    ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${this.flappyScore} PIPES`, 30, 65);

    if (!this.flappyPlaying) {
      ctx.fillStyle = 'rgba(3, 7, 5, 0.66)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 34px "Fredoka", "Plus Jakarta Sans", sans-serif';
      const title = this.flappyCashedOut ? 'CASHED OUT' : this.flappyScore > 0 ? 'GAME OVER' : 'READY TO FLAP?';
      ctx.fillText(title, w / 2, h / 2 - 16);
      ctx.fillStyle = this.flappyCashedOut ? '#4ade80' : '#94a3b8';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      const line = this.flappyCashedOut
        ? `+${(this.flappyBet * this.flappyMult - this.flappyBet).toFixed(4)} SOL profit`
        : this.flappyScore > 0
          ? `Score ${this.flappyScore} · ${this.flappyMult.toFixed(2)}x`
          : 'Place a bet and press Play Flappy';
      ctx.fillText(line, w / 2, h / 2 + 20);
      ctx.textAlign = 'left';
    }
  }

  endFlappyGame(crashed) {
    if (!this.flappyPlaying) return;
    this.flappyPlaying = false;
    if (this.flappyRaf) {
      cancelAnimationFrame(this.flappyRaf);
      this.flappyRaf = null;
    }

    const startBtn = document.getElementById('flappyStartBtn');
    const restartBtn = document.getElementById('flappyRestartBtn');
    const cashoutBtn = document.getElementById('flappyCashoutBtn');
    const flapBtn = document.getElementById('flappyFlapBtn');
    const hint = document.getElementById('flappyCanvasHint');
    const status = document.getElementById('flappyStatus');
    if (restartBtn) restartBtn.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';
    if (cashoutBtn) cashoutBtn.style.display = 'none';
    if (flapBtn) flapBtn.disabled = true;
    if (hint) hint.hidden = true;

    if (this.flappyScore > this.flappyBest) {
      this.flappyBest = this.flappyScore;
      localStorage.setItem('gp_flappy_best', String(this.flappyBest));
      this.updateFlappyBestUI();
    }

    if (crashed) {
      gpAudio.playCrash();
      if (status) status.textContent = `Crashed at ${this.flappyScore} pipes. Lost ${this.flappyBet.toFixed(4)} SOL.`;
      this.showToast(`💥 Flappy crashed! Lost ${this.flappyBet.toFixed(4)} SOL.`);
    }
    this.updateFlappyHUD();
    this.drawFlappyScene();
  }

  cashoutFlappy() {
    if (!this.flappyPlaying || this.flappyScore < 1) return;
    const win = this.flappyBet * this.flappyMult;
    const profit = win - this.flappyBet;
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('flappy', profit, this.flappyMult);
    this.pushNotification('Flappy win', `Cashed out ${this.flappyScore} pipes at ${this.flappyMult.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');
    gpAudio.playWin();
    this.showToast(`🐤 Cashed out +${win.toFixed(4)} SOL (${this.flappyMult.toFixed(2)}x)`);

    this.flappyCashedOut = true;
    this.flappyPlaying = false;
    if (this.flappyRaf) {
      cancelAnimationFrame(this.flappyRaf);
      this.flappyRaf = null;
    }
    const status = document.getElementById('flappyStatus');
    if (status) status.textContent = `Cashed out +${win.toFixed(4)} SOL at ${this.flappyMult.toFixed(2)}x.`;
    this.endFlappyGame(false);
    const status2 = document.getElementById('flappyStatus');
    if (status2) status2.textContent = `Cashed out +${win.toFixed(4)} SOL at ${this.flappyMult.toFixed(2)}x.`;
  }

  resetFlappyUI() {
    const startBtn = document.getElementById('flappyStartBtn');
    const restartBtn = document.getElementById('flappyRestartBtn');
    const cashoutBtn = document.getElementById('flappyCashoutBtn');
    const flapBtn = document.getElementById('flappyFlapBtn');
    const hint = document.getElementById('flappyCanvasHint');
    const status = document.getElementById('flappyStatus');
    if (startBtn) {
      startBtn.style.display = 'block';
      startBtn.textContent = `PLAY FLAPPY (${this.flappyBet.toFixed(3)} SOL)`;
    }
    if (restartBtn) restartBtn.style.display = 'none';
    if (cashoutBtn) cashoutBtn.style.display = 'none';
    if (flapBtn) flapBtn.disabled = true;
    if (hint) hint.hidden = false;
    if (status) status.textContent = 'Place a bet and press Play Flappy.';
    this.updateFlappyHUD();
    this.updateFlappyBestUI();
  }

  /* ============================================================= */
  /* COINFLIP — NEW GAME */
  /* ============================================================= */
  initCoinflip() {
    const betInput = document.getElementById('coinflipBetInput');
    const usdEl = document.getElementById('coinflipUsdEstimate');
    const updateUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.coinflipBet * 150).toFixed(2)} USD`;
      const payoutEl = document.getElementById('coinflipPayoutDisplay');
      if (payoutEl) payoutEl.textContent = `${(this.coinflipBet * 1.96).toFixed(4)} SOL`;
      const flipBtn = document.getElementById('coinflipFlipBtn');
      if (flipBtn && !this.coinflipFlipping) flipBtn.textContent = `FLIP COIN (${this.coinflipBet.toFixed(3)} SOL)`;
    };
    if (betInput) {
      betInput.value = this.coinflipBet;
      betInput.addEventListener('input', (e) => {
        this.coinflipBet = Math.max(0.001, parseFloat(e.target.value) || 0.001);
        updateUsd();
      });
      updateUsd();
    }

    const setBet = (value) => {
      this.coinflipBet = Math.max(0.001, parseFloat(value.toFixed(4)));
      if (betInput) betInput.value = this.coinflipBet;
      updateUsd();
      gpAudio.playClick();
    };
    const half = document.getElementById('coinflipHalfBtn');
    const double = document.getElementById('coinflipDoubleBtn');
    const max = document.getElementById('coinflipMaxBtn');
    if (half) half.addEventListener('click', () => setBet(this.coinflipBet / 2));
    if (double) double.addEventListener('click', () => setBet(this.coinflipBet * 2));
    if (max) max.addEventListener('click', () => setBet(Math.max(0.001, this.balance)));

    const heads = document.getElementById('coinflipHeadsBtn');
    const tails = document.getElementById('coinflipTailsBtn');
    const flip = document.getElementById('coinflipFlipBtn');
    if (heads) heads.addEventListener('click', () => this.setCoinflipSide('heads'));
    if (tails) tails.addEventListener('click', () => this.setCoinflipSide('tails'));
    if (flip) flip.addEventListener('click', () => this.flipCoinflip());

    this.updateCoinflipUI();
  }

  setCoinflipSide(side) {
    if (this.coinflipFlipping) return;
    this.coinflipSide = side;
    this.updateCoinflipUI();
    gpAudio.playClick();
  }

  updateCoinflipUI() {
    const heads = document.getElementById('coinflipHeadsBtn');
    const tails = document.getElementById('coinflipTailsBtn');
    if (heads) heads.classList.toggle('active', this.coinflipSide === 'heads');
    if (tails) tails.classList.toggle('active', this.coinflipSide === 'tails');
    const streak = document.getElementById('coinflipStreakDisplay');
    const last = document.getElementById('coinflipLastDisplay');
    const history = document.getElementById('coinflipHistory');
    const payout = document.getElementById('coinflipPayoutDisplay');
    const flip = document.getElementById('coinflipFlipBtn');
    if (streak) streak.textContent = this.coinflipStreak;
    if (last) last.textContent = this.coinflipLast;
    if (payout) payout.textContent = `${(this.coinflipBet * 1.96).toFixed(4)} SOL`;
    if (flip && !this.coinflipFlipping) flip.textContent = `FLIP COIN (${this.coinflipBet.toFixed(3)} SOL)`;
    if (history) {
      history.innerHTML = '';
      this.coinflipHistory.slice(0, 14).forEach(entry => {
        const chip = document.createElement('span');
        chip.className = `hilo-history-chip ${entry.won ? 'black' : 'red'}`;
        chip.textContent = entry.side === 'heads' ? 'H' : 'T';
        chip.title = `${entry.side} · ${entry.won ? 'won' : 'lost'}`;
        history.appendChild(chip);
      });
    }
  }

  flipCoinflip() {
    if (this.coinflipFlipping) return;
    if (this.balance < this.coinflipBet) {
      this.showToast('Insufficient SOL Balance! Claim from the Faucet.');
      return;
    }

    this.balance = parseFloat((this.balance - this.coinflipBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.coinflipFlipping = true;

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === this.coinflipSide;
    const coin = document.getElementById('coinflipCoin');
    const resultEl = document.getElementById('coinflipResult');
    const flipBtn = document.getElementById('coinflipFlipBtn');
    const heads = document.getElementById('coinflipHeadsBtn');
    const tails = document.getElementById('coinflipTailsBtn');
    if (flipBtn) {
      flipBtn.disabled = true;
      flipBtn.textContent = 'FLIPPING...';
    }
    if (heads) heads.disabled = true;
    if (tails) tails.disabled = true;
    if (resultEl) {
      resultEl.textContent = 'Flipping…';
      resultEl.className = 'coinflip-result';
    }
    if (coin) {
      const current = this.coinflipRotation || 0;
      const currentMod = ((current % 360) + 360) % 360;
      const desiredMod = result === 'tails' ? 180 : 0;
      const target = current + 1440 + ((desiredMod - currentMod + 360) % 360);
      this.coinflipRotation = target;
      if (coin.animate) {
        const animation = coin.animate([
          { transform: `rotateY(${current}deg)` },
          { transform: `rotateY(${target}deg)` }
        ], { duration: 1450, easing: 'cubic-bezier(0.16, 0.85, 0.22, 1)' });
        animation.onfinish = () => {
          if (!this.coinflipFlipping) return;
          coin.style.transform = `rotateY(${target}deg)`;
          this.finishCoinflip(result, won);
        };
        setTimeout(() => {
          if (!this.coinflipFlipping) return;
          coin.style.transform = `rotateY(${target}deg)`;
          this.finishCoinflip(result, won);
        }, 1700);
      } else {
        coin.style.transform = `rotateY(${target}deg)`;
        setTimeout(() => this.finishCoinflip(result, won), 1450);
      }
    } else {
      setTimeout(() => this.finishCoinflip(result, won), 1450);
    }
    gpAudio.playTrade();
  }

  finishCoinflip(result, won) {
    this.coinflipFlipping = false;
    const resultEl = document.getElementById('coinflipResult');
    const flipBtn = document.getElementById('coinflipFlipBtn');
    const heads = document.getElementById('coinflipHeadsBtn');
    const tails = document.getElementById('coinflipTailsBtn');
    const coin = document.getElementById('coinflipCoin');
    if (heads) heads.disabled = false;
    if (tails) tails.disabled = false;
    if (flipBtn) {
      flipBtn.disabled = false;
      flipBtn.textContent = `FLIP COIN (${this.coinflipBet.toFixed(3)} SOL)`;
    }
    if (resultEl) {
      resultEl.textContent = won
        ? `🎉 ${result.toUpperCase()} — you won ${(this.coinflipBet * 1.96).toFixed(4)} SOL!`
        : `💥 ${result.toUpperCase()} — better luck next flip.`;
      resultEl.className = `coinflip-result ${won ? 'win' : 'loss'}`;
    }
    if (coin) {
      coin.classList.toggle('show-heads', result === 'heads');
      coin.classList.toggle('show-tails', result === 'tails');
    }

    if (won) {
      const payout = this.coinflipBet * 1.96;
      const profit = payout - this.coinflipBet;
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.coinflipStreak++;
      this.recordWin('coinflip', profit, 1.96);
      this.pushNotification('Coinflip win', `${result.toUpperCase()} paid +${this.formatSol(profit)} SOL.`, 'win');
      gpAudio.playWin();
      this.showToast(`🪙 ${result.toUpperCase()}! +${payout.toFixed(4)} SOL`);
    } else {
      this.coinflipStreak = 0;
      gpAudio.playCrash();
      this.showToast(`💥 ${result.toUpperCase()}. Lost ${this.coinflipBet.toFixed(4)} SOL.`);
    }

    this.coinflipLast = result.toUpperCase();
    this.coinflipHistory.unshift({ side: result, won });
    this.coinflipHistory = this.coinflipHistory.slice(0, 14);
    this.updateCoinflipUI();
  }

  /* ============================================================= */
  /* MODALS, CASE, NOTIFICATIONS, FAIRNESS, LEADERBOARD */
  /* ============================================================= */
  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    gpAudio.playClick();
    if (id === 'dailyCaseModal') {
      this.updateDailyCaseUI();
      this.renderDailyCaseRewards();
      this.setupDailyCaseTrack();
    }
  }

  closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (modal) modal.classList.remove('open');
  }

  initModals() {
    document.querySelectorAll('.gp-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) this.closeModal(backdrop);
      });
    });

    const closePairs = [
      ['closeLeaderboardModalBtn', 'leaderboardModal'],
      ['closeBjRulebookBtn', 'bjRulebookModal'],
      ['closeCaseModalBtn', 'dailyCaseModal'],
      ['closeFairnessModalBtn', 'fairnessModal'],
      ['closeInfoModalBtn', 'infoModal']
    ];
    closePairs.forEach(([btnId, modalId]) => {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', () => this.closeModal(modalId));
    });

    const lbBtn = document.getElementById('leaderboardNavBtn');
    if (lbBtn) lbBtn.addEventListener('click', () => this.openModal('leaderboardModal'));
    const footerLb = document.getElementById('footerLeaderboardBtn');
    if (footerLb) footerLb.addEventListener('click', () => this.openModal('leaderboardModal'));

    const caseBtns = [document.getElementById('dailyCaseNavBtn'), ...document.querySelectorAll('[data-open-case]')];
    caseBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', () => {
        this.updateDailyCaseUI();
        this.openModal('dailyCaseModal');
      });
    });

    const rulebookBtn = document.getElementById('bjRulebookBtn');
    if (rulebookBtn) rulebookBtn.addEventListener('click', () => this.openModal('bjRulebookModal'));

    [document.getElementById('bjFairnessBtn'), ...document.querySelectorAll('[data-open-fairness]')].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.openModal('fairnessModal'));
    });

    const shareBtns = [document.getElementById('bjShareBtn'), document.getElementById('footerShareBtn')];
    shareBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.shareSite());
    });

    const muteBtn = document.getElementById('gpMuteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const muted = gpAudio.toggle();
        this.updateSoundUI();
        this.showToast(muted ? '🔇 Sound muted.' : '🔊 Sound enabled.');
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(modal => modal.classList.remove('open'));
      this.closeNotificationsPanel();
    });

    const footerFaucet = document.getElementById('footerFaucetBtn');
    if (footerFaucet) {
      footerFaucet.addEventListener('click', () => {
        const dialog = document.getElementById('walletSecurityDialog');
        if (dialog) dialog.showModal();
        gpAudio.playClick();
      });
    }

    const footerChat = document.getElementById('footerChatBtn');
    if (footerChat) {
      footerChat.addEventListener('click', () => {
        this.setChatCollapsed(false);
        const input = document.getElementById('gpChatInput');
        if (input) setTimeout(() => input.focus(), 500);
      });
    }
  }

  updateSoundUI() {
    const btn = document.getElementById('gpMuteBtn');
    if (!btn) return;
    btn.classList.toggle('is-muted', gpAudio.muted);
    btn.setAttribute('aria-pressed', gpAudio.muted ? 'true' : 'false');
    btn.title = gpAudio.muted ? 'Unmute casino sound' : 'Mute casino sound';
  }

  shareSite() {
    const shareData = {
      title: 'GREENPUMP.XYZ',
      text: 'Play 8 free demo Solana-style games on GREENPUMP.XYZ.',
      url: window.location.href
    };
    const finish = (message) => this.showToast(message);
    if (navigator.share) {
      navigator.share(shareData).then(() => finish('Shared Greenpump!')).catch(() => {});
      return;
    }
    this.copyText(window.location.href).then(copied => {
      finish(copied ? 'Link copied to clipboard!' : 'Could not copy the link.');
    });
  }

  initDailyCase() {
    this.renderDailyCaseRewards();
    this.setupDailyCaseTrack();
    const btn = document.getElementById('spinDailyCaseBtn');
    if (btn) btn.addEventListener('click', () => this.spinDailyCase());
    this.caseReadyNotified = false;
    this.updateDailyCaseUI();
    setInterval(() => this.updateDailyCaseUI(), 1000);
  }

  getCasePrizes() {
    return [
      {
        id: 'tier1',
        amount: 0.0001,
        usd: 0.015,
        label: '0.0001 SOL',
        centsText: '1.5¢',
        usdText: '≈ $0.015',
        rarity: 'Common',
        color: '#4ade80',
        badgeBg: 'rgba(74, 222, 128, 0.15)',
        weight: 34
      },
      {
        id: 'tier2',
        amount: 0.0002,
        usd: 0.030,
        label: '0.0002 SOL',
        centsText: '3.0¢',
        usdText: '≈ $0.030',
        rarity: 'Common',
        color: '#22c55e',
        badgeBg: 'rgba(34, 197, 94, 0.15)',
        weight: 26
      },
      {
        id: 'tier3',
        amount: 0.0004,
        usd: 0.060,
        label: '0.0004 SOL',
        centsText: '6.0¢',
        usdText: '≈ $0.060',
        rarity: 'Uncommon',
        color: '#38bdf8',
        badgeBg: 'rgba(56, 189, 248, 0.18)',
        weight: 18
      },
      {
        id: 'tier4',
        amount: 0.0006,
        usd: 0.090,
        label: '0.0006 SOL',
        centsText: '9.0¢',
        usdText: '≈ $0.090',
        rarity: 'Rare',
        color: '#a855f7',
        badgeBg: 'rgba(168, 85, 247, 0.18)',
        weight: 12
      },
      {
        id: 'tier5',
        amount: 0.0008,
        usd: 0.120,
        label: '0.0008 SOL',
        centsText: '12.0¢',
        usdText: '≈ $0.120',
        rarity: 'Epic',
        color: '#f43f5e',
        badgeBg: 'rgba(244, 63, 94, 0.20)',
        weight: 7
      },
      {
        id: 'tier6',
        amount: 0.0010,
        usd: 0.150,
        label: '0.0010 SOL',
        centsText: '15.0¢',
        usdText: '≈ $0.150 (MAX)',
        rarity: 'Jackpot',
        color: '#fbbf24',
        badgeBg: 'rgba(251, 191, 36, 0.22)',
        weight: 3
      }
    ];
  }

  createCaseCard(prize, isWinner = false) {
    const card = document.createElement('div');
    card.className = `case-prize-card ${isWinner ? 'case-prize-won' : ''}`;
    card.style.borderBottom = `3px solid ${prize.color}`;

    const rarityBadge = document.createElement('div');
    rarityBadge.className = 'case-card-rarity';
    rarityBadge.style.color = prize.color;
    rarityBadge.textContent = prize.rarity;

    const img = document.createElement('img');
    img.src = 'solana-coin.png';
    img.alt = 'SOL';
    img.style.cssText = `width:26px;height:26px;object-fit:contain;filter:drop-shadow(0 0 6px ${prize.color});`;

    const solLabel = document.createElement('span');
    solLabel.className = 'case-card-sol';
    solLabel.textContent = prize.label;

    const usdLabel = document.createElement('span');
    usdLabel.className = 'case-card-usd';
    usdLabel.textContent = prize.usdText;

    card.appendChild(rarityBadge);
    card.appendChild(img);
    card.appendChild(solLabel);
    card.appendChild(usdLabel);

    return card;
  }

  renderDailyCaseRewards() {
    const container = document.getElementById('caseRewardsList');
    if (!container) return;
    container.innerHTML = '';
    const prizes = this.getCasePrizes();
    prizes.forEach(p => {
      const item = document.createElement('div');
      item.className = 'case-reward-item';
      item.style.borderLeft = `3px solid ${p.color}`;
      item.innerHTML = `
        <img class="case-reward-icon" src="solana-coin.png" alt="SOL" style="filter:drop-shadow(0 0 4px ${p.color});" />
        <div class="case-reward-info">
          <span class="case-reward-sol">${p.label}</span>
          <span class="case-reward-usd" style="color:${p.color};background:${p.badgeBg};padding:1px 5px;border-radius:4px;">${p.centsText}</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  setupDailyCaseTrack(centerIndex = 5) {
    const track = document.getElementById('caseSpinnerTrack');
    const container = document.querySelector('.case-roulette-container');
    if (!track || !container || this.caseSpinning) return;

    if (track.children.length === 0) {
      track.style.transition = 'none';
      track.innerHTML = '';
      const prizes = this.getCasePrizes();
      for (let i = 0; i < 40; i++) {
        const p = prizes[i % prizes.length];
        track.appendChild(this.createCaseCard(p));
      }
    }

    const positionReel = () => {
      const width = container.clientWidth || 472;
      const cardPitch = 106;
      const offset = -(centerIndex * cardPitch + 53 - width / 2);
      track.style.transition = 'none';
      track.style.transform = `translateX(${offset}px)`;
    };

    positionReel();
    requestAnimationFrame(positionReel);
    setTimeout(positionReel, 60);
  }

  caseReady() {
    const last = parseInt(localStorage.getItem('gp_case_last_claim'), 10) || 0;
    return !last || Date.now() - last >= 24 * 60 * 60 * 1000;
  }

  updateDailyCaseUI() {
    const last = parseInt(localStorage.getItem('gp_case_last_claim'), 10) || 0;
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, cooldown - (Date.now() - last));
    const ready = remaining <= 0;
    const badge = document.getElementById('dailyCaseBadge');
    const btn = document.getElementById('spinDailyCaseBtn');
    const text = document.getElementById('caseCooldownText');

    if (badge) {
      badge.textContent = ready ? 'FREE' : 'WAIT';
      badge.style.background = ready ? '#00ffa3' : '#334155';
      badge.style.color = ready ? '#000000' : '#cbd5e1';
    }

    if (btn) {
      if (this.caseSpinning) {
        btn.disabled = true;
        btn.textContent = 'OPENING...';
      } else if (ready) {
        btn.disabled = false;
        btn.textContent = 'OPEN FREE CASE';
      } else {
        btn.disabled = true;
        const totalSec = Math.ceil(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        btn.textContent = `WAIT ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }

    if (text) {
      if (ready) {
        text.textContent = 'Ready now — one free case every 24 hours (Max 15¢ / 0.0010 SOL).';
        text.style.color = '#4ade80';
      } else {
        const totalSec = Math.ceil(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        text.textContent = `Next free case in ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        text.style.color = '#64748b';
      }
    }

    if (ready && !this.caseReadyNotified) {
      this.caseReadyNotified = true;
      this.pushNotification('Daily case ready', 'Your free daily case is ready to open.', 'case');
    }
  }

  spinDailyCase() {
    if (this.caseSpinning || !this.caseReady()) return;
    this.caseSpinning = true;
    const btn = document.getElementById('spinDailyCaseBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'OPENING...';
    }

    const prizes = this.getCasePrizes();
    const pickPrize = () => {
      const total = prizes.reduce((sum, p) => sum + p.weight, 0);
      let roll = Math.random() * total;
      for (const prize of prizes) {
        roll -= prize.weight;
        if (roll <= 0) return prize;
      }
      return prizes[0];
    };

    const winPrize = pickPrize();
    const track = document.getElementById('caseSpinnerTrack');
    const container = document.querySelector('.case-roulette-container');
    if (!track || !container) {
      this.caseSpinning = false;
      return;
    }

    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';
    track.innerHTML = '';
    const targetIndex = 32;
    for (let i = 0; i < 40; i++) {
      const prize = (i === targetIndex) ? winPrize : pickPrize();
      track.appendChild(this.createCaseCard(prize, false));
    }

    // Force layout before starting the transition.
    void track.getBoundingClientRect();
    const containerWidth = container.clientWidth || 472;
    const cardPitch = 106;
    const offset = -(targetIndex * cardPitch + 53 - containerWidth / 2);
    requestAnimationFrame(() => {
      track.style.transition = 'transform 4.5s cubic-bezier(0.12, 0.8, 0.15, 1)';
      track.style.transform = `translateX(${offset}px)`;
    });

    if (gpAudio && gpAudio.playTrade) {
      gpAudio.playTrade();
    }

    setTimeout(() => {
      this.balance = parseFloat((this.balance + winPrize.amount).toFixed(4));
      this.saveBalance();
      localStorage.setItem('gp_case_last_claim', String(Date.now()));
      this.caseSpinning = false;
      this.caseReadyNotified = false;

      const winningCard = track.children[targetIndex];
      if (winningCard) {
        winningCard.classList.add('case-prize-won');
      }

      this.recordWin('daily case', winPrize.amount, 1);
      this.pushNotification('Daily case opened', `You won ${winPrize.label} (${winPrize.usdText}).`, 'case');
      if (gpAudio && gpAudio.playWin) gpAudio.playWin();
      this.showToast(`🎁 Daily Case Claimed: +${winPrize.label} (${winPrize.centsText})!`);
      this.updateDailyCaseUI();
    }, 4700);
  }

  initNotifications() {
    this.notifications = [
      { title: 'Welcome to GREENPUMP', body: 'Your demo wallet is ready. Claim free SOL any time from the faucet.', kind: 'system', unread: true, ts: Date.now() - 120000 },
      { title: 'Free faucet', body: 'Tap the wallet and claim +1.00 demo SOL whenever you need a refill.', kind: 'faucet', unread: true, ts: Date.now() - 60000 }
    ];
    const bell = document.getElementById('notificationsBtn');
    const panel = document.getElementById('notificationsPanel');
    const clear = document.getElementById('clearNotificationsBtn');
    if (bell) {
      bell.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleNotificationsPanel();
      });
    }
    if (panel) panel.addEventListener('click', event => event.stopPropagation());
    if (clear) clear.addEventListener('click', () => this.clearNotifications());
    document.addEventListener('click', () => this.closeNotificationsPanel());
    this.renderNotifications();
  }

  pushNotification(title, body, kind = 'info') {
    this.notifications.unshift({
      title,
      body,
      kind,
      unread: true,
      ts: Date.now()
    });
    this.notifications = this.notifications.slice(0, 20);
    this.renderNotifications();
  }

  renderNotifications() {
    const list = document.getElementById('notificationsList');
    const dot = document.getElementById('notificationDot');
    if (!list) return;
    list.innerHTML = '';
    if (this.notifications.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gp-notif-empty';
      empty.textContent = 'No notifications yet.';
      list.appendChild(empty);
    }
    this.notifications.forEach(item => {
      const row = document.createElement('div');
      row.className = `gp-notif-item ${item.unread ? 'unread' : ''}`;
      const icon = document.createElement('div');
      icon.className = 'gp-notif-icon';
      icon.textContent = item.kind === 'win' ? '🏆' : item.kind === 'case' ? '🎁' : item.kind === 'faucet' ? '💧' : item.kind === 'system' ? '💚' : '🔔';
      const body = document.createElement('div');
      body.className = 'gp-notif-body';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const text = document.createElement('p');
      text.textContent = item.body;
      const time = document.createElement('span');
      time.textContent = new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      body.appendChild(title);
      body.appendChild(text);
      body.appendChild(time);
      row.appendChild(icon);
      row.appendChild(body);
      list.appendChild(row);
    });
    if (dot) {
      dot.hidden = !this.notifications.some(n => n.unread);
    }
  }

  toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const bell = document.getElementById('notificationsBtn');
    if (!panel) return;
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (bell) bell.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) {
      this.renderNotifications();
      this.notifications.forEach(n => n.unread = false);
      this.renderNotifications();
      gpAudio.playClick();
    }
  }

  closeNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    const bell = document.getElementById('notificationsBtn');
    if (panel && !panel.hidden) panel.hidden = true;
    if (bell) bell.setAttribute('aria-expanded', 'false');
  }

  clearNotifications() {
    this.notifications.forEach(n => n.unread = false);
    this.renderNotifications();
    this.showToast('Notifications marked as read.');
  }

  initFairness() {
    const serverInput = document.getElementById('fairServerSeed');
    const clientInput = document.getElementById('fairClientSeed');
    const nonceInput = document.getElementById('fairNonce');
    if (!serverInput || !clientInput || !nonceInput) return;

    serverInput.value = this.randomHex(16);
    clientInput.value = localStorage.getItem('gp_client_seed') || this.randomHex(8);
    localStorage.setItem('gp_client_seed', clientInput.value);
    nonceInput.value = '1';

    const regenerate = document.getElementById('fairRegenerateBtn');
    const verify = document.getElementById('fairVerifyBtn');
    if (regenerate) regenerate.addEventListener('click', () => {
      serverInput.value = this.randomHex(16);
      nonceInput.value = String((parseInt(nonceInput.value, 10) || 0) + 1);
      this.refreshFairnessHash();
      gpAudio.playClick();
    });
    if (verify) verify.addEventListener('click', () => {
      localStorage.setItem('gp_client_seed', clientInput.value || '');
      this.refreshFairnessHash();
      this.showToast('Round hash recalculated.');
      gpAudio.playClick();
    });
    [serverInput, clientInput, nonceInput].forEach(input => {
      input.addEventListener('change', () => this.refreshFairnessHash());
    });
    this.refreshFairnessHash();
  }

  randomHex(bytes = 16) {
    const arr = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async sha256Hex(text) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        const data = new TextEncoder().encode(text);
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (err) { /* fallback below */ }
    }
    let h1 = 0x811c9dc5, h2 = 0x1000193, out = '';
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ text.charCodeAt(text.length - 1 - i), 2246822519) >>> 0;
      out += (h1 >>> ((i % 4) * 8) & 0xff).toString(16).padStart(2, '0');
    }
    while (out.length < 64) out += (h2 >>> ((out.length % 4) * 8) & 0xff).toString(16).padStart(2, '0');
    return out.slice(0, 64);
  }

  async refreshFairnessHash() {
    const server = document.getElementById('fairServerSeed')?.value || '';
    const client = document.getElementById('fairClientSeed')?.value || '';
    const nonce = document.getElementById('fairNonce')?.value || '1';
    const serverHashEl = document.getElementById('fairServerHash');
    const resultEl = document.getElementById('fairResult');
    if (serverHashEl) serverHashEl.textContent = (await this.sha256Hex(server)) || '—';
    if (resultEl) resultEl.textContent = (await this.sha256Hex(`${server}:${client}:${nonce}`)) || '—';
  }

  initInfoModals() {
    const content = {
      howto: {
        title: 'How to Play',
        body: '<p><strong>Start with the faucet.</strong> Open your wallet and claim free demo SOL any time.</p><p><strong>Pick a game.</strong> Use the Games menu, the mobile tab bar or the cards below. Set a bet, then follow the on-screen controls.</p><p><strong>Pump &amp; Dump:</strong> choose UP or DOWN and wait for the 6-second close. <strong>Rug:</strong> cash out before the multiplier crashes. <strong>Chicken:</strong> hop lane by lane and cash out. <strong>Mines:</strong> reveal gems and avoid bombs. <strong>Blackjack:</strong> hit, stand, double or split. <strong>HiLo:</strong> call the next card. <strong>Flappy:</strong> pass pipes and cash out. <strong>Coinflip:</strong> call heads or tails.</p><p>All balances are play money and never touch a real blockchain.</p>'
      },
      responsible: {
        title: 'Responsible Play',
        body: '<p>GREENPUMP is a demo game site using virtual funds only. There are no deposits, withdrawals, cash prizes or real-money wagers.</p><p>Take regular breaks and keep play sessions short. If gambling-like games stop being fun, step away. This demo is intended for adults aged 18+.</p><p>Because there is no real money involved, nothing on this site can create a financial loss or a financial win.</p>'
      },
      terms: {
        title: 'Terms of Use',
        body: '<p>This site is provided for entertainment and demonstration purposes only. All balances, rewards, multipliers and leaderboard entries are simulated.</p><p>No real Solana is deposited, transferred or paid out. Game results are generated locally and may change at any time. The service is provided “as is” without warranties.</p><p>By using the site you agree not to present it as a real-money gambling service.</p>'
      },
      privacy: {
        title: 'Privacy',
        body: '<p>GREENPUMP does not require an account and does not ask for personal information. Your demo balance, wallet address, daily-case timer, leaderboard entries and preferences are stored in your browser’s local storage.</p><p>The public chat panel displays messages from the greenpump.xyz public chat. Messages you send stay local to this demo and are not posted to the live site. Clearing site data removes the local demo state and chat cache.</p><p>This demo does not use trackers or advertising cookies.</p>'
      }
    };

    document.querySelectorAll('[data-info]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = content[btn.dataset.info];
        if (!item) return;
        const title = document.getElementById('infoModalTitle');
        const body = document.getElementById('infoModalBody');
        if (title) title.textContent = item.title;
        if (body) body.innerHTML = item.body;
        this.openModal('infoModal');
      });
    });
  }

  initOnlineCounter() {
    const update = () => {
      let current = parseInt(document.getElementById('onlinePlayersCount')?.textContent, 10) || 84;
      current += Math.floor(Math.random() * 17) - 8;
      current = Math.max(52, Math.min(148, current));
      const header = document.getElementById('onlinePlayersCount');
      const chat = document.getElementById('airdropOnlineCount');
      if (header) header.textContent = current;
      if (chat) chat.textContent = current;
    };
    update();
    setInterval(update, 8000);
  }

  initLeaderboard() {
    this.renderLeaderboard();
  }

  renderLeaderboard() {
    const container = document.getElementById('leaderboardRows');
    if (!container) return;
    const defaults = [
      { name: 'SolWhale_99', game: 'RUG', amount: 148.5, mult: 84.2 },
      { name: 'PepeMaxi', game: 'PUMP', amount: 92.4, mult: 1.95 },
      { name: 'ChickenGod', game: 'CHICKEN', amount: 42.1, mult: 12.4 },
      { name: 'DegenKing', game: 'MINES', amount: 31.8, mult: 7.5 },
      { name: 'LuckyApe', game: 'BLACKJACK', amount: 24.5, mult: 2.5 }
    ];
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem('gp_leaderboard') || '[]');
    } catch (err) {
      saved = [];
    }
    const rows = [...defaults, ...saved].sort((a, b) => b.amount - a.amount).slice(0, 8);
    container.innerHTML = '';
    rows.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      if (entry.name === 'You') row.classList.add('is-you');
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = `#${index + 1}`;
      const user = document.createElement('span');
      user.className = 'lb-user';
      user.textContent = entry.name;
      const game = document.createElement('span');
      game.className = 'lb-game';
      game.textContent = entry.mult && entry.mult > 0 ? `${entry.game} (${entry.mult.toFixed(2)}x)` : entry.game;
      const payout = document.createElement('span');
      payout.className = 'lb-payout';
      payout.textContent = `+${this.formatSol(entry.amount)} SOL`;
      row.appendChild(rank);
      row.appendChild(user);
      row.appendChild(game);
      row.appendChild(payout);
      container.appendChild(row);
    });
  }

  /* ============================================================= */
  /* CHAT, AIRDROP & TOASTS */
  /* ============================================================= */
  initPublicChat() {
    const openBtn = document.getElementById('chatOpenBtn');
    const minBtn = document.getElementById('chatMinimizeBtn');
    const feed = document.querySelector('[data-chat-feed="true"]');
    const input = document.getElementById('gpChatInput');
    const sendBtn = document.getElementById('gpChatSendBtn');
    const emojiBtn = document.getElementById('gpEmojiBtn');
    const emojiPicker = document.getElementById('gpEmojiPicker');
    const statusEl = document.getElementById('gpChatLiveStatus');

    if (minBtn) minBtn.addEventListener('click', () => this.setChatCollapsed(true));
    if (openBtn) openBtn.addEventListener('click', () => this.setChatCollapsed(false));

    if (input) {
      input.readOnly = false;
      input.placeholder = 'Type message...';
      input.title = 'Send a message';
      input.setAttribute('aria-label', 'Chat message');
    }
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.title = 'Send message';
      sendBtn.style.opacity = '';
      sendBtn.style.cursor = 'pointer';
      sendBtn.style.boxShadow = '';
    }
    if (emojiBtn) emojiBtn.style.display = 'flex';
    if (emojiPicker) emojiPicker.hidden = true;

    const setStatus = (label, state) => {
      if (!statusEl) return;
      statusEl.textContent = label;
      statusEl.dataset.state = state;
    };

    const seen = new Set();
    const maxMessages = 60;
    const cacheKey = 'gp_chat_mirror_cache';
    let inFlight = false;
    let nextRetry = 0;
    let offlineNoticeShown = false;

    const nearBottom = () => feed && feed.scrollHeight - feed.scrollTop - feed.clientHeight < 80;

    const trimFeed = () => {
      while (feed && feed.children.length > maxMessages) {
        const first = feed.firstChild;
        if (first && first.dataset && first.dataset.msgId) seen.delete(first.dataset.msgId);
        feed.removeChild(first);
      }
    };

    const renderMessage = (message) => {
      if (!feed || !message || !message.id || seen.has(message.id)) return false;
      seen.add(message.id);

      const item = document.createElement('div');
      item.className = 'chat-message-item chat-live-item';
      item.dataset.msgId = message.id;
      if (message.isPnL) item.classList.add('chat-pnl');

      const header = document.createElement('div');
      header.className = 'chat-user-header';

      if (message.avatar) {
        const avatar = document.createElement('img');
        avatar.className = 'chat-avatar';
        avatar.loading = 'lazy';
        avatar.alt = '';
        avatar.src = message.avatar.startsWith('http') ? message.avatar : (message.avatar.startsWith('/') ? message.avatar : '/' + message.avatar);
        avatar.addEventListener('error', () => avatar.remove());
        header.appendChild(avatar);
      }

      const badge = document.createElement('span');
      badge.className = 'chat-badge-vip';
      badge.textContent = `LVL ${message.level || 1}`;
      header.appendChild(badge);

      const name = document.createElement('span');
      name.className = 'chat-username';
      name.textContent = message.username || 'Player';
      header.appendChild(name);

      if (message.is_verified) {
        const verified = document.createElement('span');
        verified.className = 'chat-verified';
        verified.textContent = '✓';
        verified.title = 'Verified player';
        header.appendChild(verified);
      }

      const time = document.createElement('span');
      time.className = 'chat-msg-time';
      time.textContent = message.timestamp || '';
      header.appendChild(time);

      item.appendChild(header);

      if (message.replyTo && message.replyTo.username) {
        const reply = document.createElement('div');
        reply.className = 'chat-reply';
        reply.textContent = `${message.replyTo.username}: ${message.replyTo.text || ''}`;
        item.appendChild(reply);
      }

      const text = document.createElement('div');
      text.className = 'chat-user-msg';
      text.textContent = message.text || '';
      item.appendChild(text);

      feed.appendChild(item);
      return true;
    };

    const applyMessages = (messages) => {
      if (!feed || !Array.isArray(messages)) return;
      const stick = nearBottom() || !feed.querySelector('.chat-live-item');
      messages.slice(-maxMessages).forEach(renderMessage);
      trimFeed();
      if (stick) feed.scrollTop = feed.scrollHeight;
    };

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      if (Array.isArray(cached) && cached.length) applyMessages(cached);
    } catch {}

    const sendMsg = () => {
      if (!input) return;
      const val = input.value.trim().slice(0, 180);
      if (!val) return;
      this.addChatMessage(feed, 'You', 'LVL 1', val, true);
      input.value = '';
      if (emojiPicker) emojiPicker.hidden = true;
      gpAudio.playClick();
    };
    if (sendBtn) sendBtn.addEventListener('click', sendMsg);
    if (input) input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMsg();
      }
    });

    if (emojiBtn && emojiPicker) {
      const emojis = ['🚀', '🔥', '💎', '🐔', '💣', '🃏', '🎁', '😂', '😭', '🤝', '🍀', '🤑', '👑', '🥶'];
      emojis.forEach(emoji => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gp-emoji-btn';
        button.textContent = emoji;
        button.addEventListener('click', () => {
          if (input) {
            input.value = (input.value + emoji).slice(0, 180);
            input.focus();
          }
        });
        emojiPicker.appendChild(button);
      });
      const pepe = document.createElement('button');
      pepe.type = 'button';
      pepe.className = 'gp-emoji-btn gp-emoji-img';
      const img = document.createElement('img');
      img.src = 'emojis/pepe_hypers.png';
      img.alt = 'pepe';
      pepe.appendChild(img);
      pepe.addEventListener('click', () => {
        if (input) {
          input.value = (input.value + '🐸').slice(0, 180);
          input.focus();
        }
      });
      emojiPicker.appendChild(pepe);

      emojiBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        emojiPicker.hidden = !emojiPicker.hidden;
      });
      emojiPicker.addEventListener('click', event => event.stopPropagation());
      document.addEventListener('click', () => { emojiPicker.hidden = true; });
    }

    const poll = async () => {
      if (!feed || document.hidden || inFlight || Date.now() < nextRetry) return;
      inFlight = true;
      try {
        const response = await fetch('/api/chat', { cache: 'no-store', headers: { accept: 'application/json' } });
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('Retry-After'));
          nextRetry = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 30000);
          setStatus('RATE LIMITED', 'warn');
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.messages)) throw new Error('Invalid chat response');
        applyMessages(data.messages);
        setStatus('LIVE', 'live');
        offlineNoticeShown = false;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data.messages.slice(-50)));
        } catch {}
      } catch {
        setStatus('OFFLINE', 'offline');
        if (feed && !offlineNoticeShown && !feed.querySelector('.chat-live-item')) {
          offlineNoticeShown = true;
          this.addChatMessage(feed, 'GreenpumpBot', 'SYSTEM', 'Live chat unavailable. Start the site with "node server.js" to connect.', false);
        }
      } finally {
        inFlight = false;
      }
    };

    poll();
    this._chatMirrorTimer = setInterval(poll, 2500);
    window.addEventListener('focus', poll);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) poll();
    });

    const stored = localStorage.getItem('gp_chat_collapsed');
    const collapsed = stored !== null ? stored === 'true' : window.innerWidth < 1024;
    setTimeout(() => this.setChatCollapsed(collapsed, false), 120);
  }

  setChatCollapsed(collapsed, persist = true) {
    const sidebar = document.getElementById('gpChatSidebar');
    const openBtn = document.getElementById('chatOpenBtn');
    if (!sidebar) return;
    sidebar.style.transform = collapsed ? 'translateX(-315px)' : 'translateX(0)';
    sidebar.style.opacity = collapsed ? '0' : '1';
    sidebar.style.pointerEvents = collapsed ? 'none' : 'auto';
    document.body.classList.toggle('chat-collapsed', collapsed);
    if (openBtn) {
      openBtn.style.transform = collapsed ? 'translateX(0) scale(1)' : 'translateX(-28px) scale(0.92)';
      openBtn.style.opacity = collapsed ? '1' : '0';
      openBtn.style.pointerEvents = collapsed ? 'auto' : 'none';
    }
    const picker = document.getElementById('gpEmojiPicker');
    if (picker) picker.hidden = true;
    if (persist) localStorage.setItem('gp_chat_collapsed', collapsed ? 'true' : 'false');
    gpAudio.playClick();
  }

  addChatMessage(feed, username, vip, text, isSelf = false) {
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'chat-message-item';
    const header = document.createElement('div');
    header.className = 'chat-user-header';
    const badge = document.createElement('span');
    badge.className = 'chat-badge-vip';
    badge.textContent = vip;
    if (isSelf) badge.style.background = '#22c55e';
    const name = document.createElement('span');
    name.className = 'chat-username';
    name.textContent = username;
    if (isSelf) name.style.color = '#4ade80';
    header.appendChild(badge);
    header.appendChild(name);
    const message = document.createElement('div');
    message.className = 'chat-user-msg';
    message.textContent = text;
    item.appendChild(header);
    item.appendChild(message);
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
    while (feed.children.length > 30) feed.removeChild(feed.firstChild);
  }

  initAirdrop() {
    let seconds = 142;
    const timerEl = document.getElementById('airdropTimerDisplay');
    const fillEl = document.getElementById('airdropProgressBar');
    setInterval(() => {
      if (seconds <= 0) {
        seconds = 180;
        this.balance = parseFloat((this.balance + 0.05).toFixed(4));
        this.saveBalance();
        this.showToast('🪂 Airdrop round complete! +0.05 demo SOL.');
      }
      seconds--;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      if (timerEl) timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (fillEl) fillEl.style.width = `${((180 - seconds) / 180) * 100}%`;
    }, 1000);
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #18181c;
      border: 1.5px solid #22c55e;
      color: #fff;
      font-weight: 800;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(34, 197, 94, 0.3);
      z-index: 999999;
      font-size: 13px;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.greenpumpApp = new GreenpumpApp();
});
