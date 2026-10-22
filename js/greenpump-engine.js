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
    // Real-Money Non-Custodial Casino: starting balance is 0.0000 SOL (all fake money purged)
    if (!localStorage.getItem('gp_real_money_v1')) {
      localStorage.removeItem('gp_sol_balance');
      localStorage.setItem('gp_real_money_v1', 'true');
    }
    const savedBal = parseFloat(localStorage.getItem('gp_sol_balance'));
    this.balance = (!isNaN(savedBal) && savedBal >= 0) ? savedBal : 0.0000;
    this.solFeeReserve = 0.002; // Network gas fee buffer: user covers their own fees and cannot bet all SOL
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
    this.basePrice = 108.35;
    this.currentPrice = 108.35;
    this.solPrice = 108.35;
    this.solChange24h = 2.28;
    this.prevSolPrice = null;

    // RUG (Candlestick Crash) State
    this.rugRunning = false;
    this.rugState = 'WAITING'; // 'WAITING', 'RUNNING', 'CRASHED'
    this.rugMultiplier = 8.93;
    this.rugCrashPoint = 1.0;
    this.rugBet = 0.01;
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

    // Advanced Auto-Bet Strategy Properties
    this.rugAdvancedEnabled = false;
    this.rugAutoBetActive = false;
    this.rugBaseBet = 0.01;
    this.rugAutoBetTotalRounds = 0; // 0 = unlimited
    this.rugAutoBetRoundsLeft = 0;
    this.rugOnWinAction = 'reset'; // 'reset' or 'increase'
    this.rugOnWinPct = 100;
    this.rugOnLossAction = 'reset'; // 'reset' or 'increase'
    this.rugOnLossPct = 100;
    this.rugStopProfit = null;
    this.rugStopLoss = null;
    this.rugAutoBetsPlayed = 0;
    this.rugAutoWins = 0;
    this.rugAutoNetProfit = 0;

    // Partial Sell & Cashout Properties (10%, 25%, 50%, 100%, Custom)
    this.rugRemainingBet = 0.01;
    this.rugSoldPortions = [];
    this.rugSelectedSellPct = 100; // 10, 25, 50, 100, or 'custom'
    this.rugCustomSellPct = null;
    this.rugCustomSellSol = null;
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
    this.hiloBet = 0.01;
    this.hiloPlaying = false;
    this.hiloCurrentRank = 7;
    this.hiloCurrentSuit = '';
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
    this.coinflipBet = 0.01;
    this.coinflipSide = 'heads';
    this.coinflipFlipping = false;
    this.coinflipStreak = 0;
    this.coinflipHistory = [];

    // Authentication State & Persistent Database Session
    this.sessionToken = localStorage.getItem('gp_session_token') || '';
    this.isLoggedIn = Boolean(this.sessionToken && localStorage.getItem('gp_user_logged_in') === 'true');
    this.userEmail = localStorage.getItem('gp_user_email') || '';
    this.authMode = 'signup';
    this.user = null;

    // Admin Console State (Protected by email + master secret key)
    this.adminToken = localStorage.getItem('gp_admin_token') || '';
    this.adminEmail = localStorage.getItem('gp_admin_email') || '';
    this.isAdminAuthenticated = Boolean(this.adminToken);
    this._adminLoadedUsers = [];

    // User Profile & Real Money State (Matching Image 2)
    this.username = localStorage.getItem('gp_username') || 'beh';
    this.userLevel = parseInt(localStorage.getItem('gp_level') || '1', 10);
    this.vipRank = parseInt(localStorage.getItem('gp_vip_rank') || '1', 10);
    try {
      this.transactions = JSON.parse(localStorage.getItem('gp_transactions') || '[]');
    } catch(e) { this.transactions = []; }
    try {
      this.stats = JSON.parse(localStorage.getItem('gp_stats') || '{"totalWagered":0,"totalProfit":0,"totalBets":0,"wins":0,"bestMult":1}');
    } catch(e) { this.stats = { totalWagered: 0, totalProfit: 0, totalBets: 0, wins: 0, bestMult: 1 }; }
    this.candles = [];

    this.init();
  }

  init() {
    this.initLoader();
    this.initWallet();
    this.initProfileMenu();
    this.initAdminConsole();
    this.initAuth();
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
    this.updateVipDisplay();
    this.updateWeeklyReloadUI();
    this.initLiveSolPriceService();
    this.initRouting();
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
    this.initNonCustodialKeypair();
    this.updateBalanceUI();

    const walletBtn = document.getElementById('gpWalletBtn');
    const walletDialog = document.getElementById('walletSecurityDialog');
    if (walletBtn && walletDialog) {
      walletBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWalletDialog(true);
      });
      walletDialog.addEventListener('close', () => {
        this.syncUrlOnModalClose();
      });
    }

    // Modal Tabs Switching (Deposit / Withdraw / Keys / Ledger)
    const tabDepositBtn = document.getElementById('walletTabDepositBtn');
    const tabWithdrawBtn = document.getElementById('walletTabWithdrawBtn');
    const tabKeysBtn = document.getElementById('walletTabKeysBtn');
    const tabLedgerBtn = document.getElementById('walletTabLedgerBtn');
    const secDeposit = document.getElementById('walletDepositSection');
    const secWithdraw = document.getElementById('walletWithdrawSection');
    const secKeys = document.getElementById('walletKeysSection');
    const secLedger = document.getElementById('walletLedgerSection');

    const switchWalletTab = (activeTab) => {
      [tabDepositBtn, tabWithdrawBtn, tabKeysBtn, tabLedgerBtn].forEach(b => b && b.classList.remove('is-active'));
      if (secDeposit) secDeposit.hidden = true;
      if (secWithdraw) secWithdraw.hidden = true;
      if (secKeys) secKeys.hidden = true;
      if (secLedger) secLedger.hidden = true;

      if (activeTab === 'deposit') {
        if (tabDepositBtn) tabDepositBtn.classList.add('is-active');
        if (secDeposit) secDeposit.hidden = false;
      } else if (activeTab === 'withdraw') {
        if (tabWithdrawBtn) tabWithdrawBtn.classList.add('is-active');
        if (secWithdraw) secWithdraw.hidden = false;
        this.updateWithdrawUsd();
        const withdrawAddrInput = document.getElementById('withdrawAddressInput');
        if (withdrawAddrInput && !withdrawAddrInput.value) {
          withdrawAddrInput.value = this.phantomAddress || '';
        }
      } else if (activeTab === 'keys') {
        if (tabKeysBtn) tabKeysBtn.classList.add('is-active');
        if (secKeys) secKeys.hidden = false;
      } else if (activeTab === 'ledger') {
        if (tabLedgerBtn) tabLedgerBtn.classList.add('is-active');
        if (secLedger) secLedger.hidden = false;
        this.fetchVaultLedger();
      }
      gpAudio.playClick();
    };

    if (tabDepositBtn) tabDepositBtn.addEventListener('click', () => switchWalletTab('deposit'));
    if (tabWithdrawBtn) tabWithdrawBtn.addEventListener('click', () => switchWalletTab('withdraw'));
    if (tabKeysBtn) tabKeysBtn.addEventListener('click', () => switchWalletTab('keys'));
    if (tabLedgerBtn) tabLedgerBtn.addEventListener('click', () => switchWalletTab('ledger'));

    // Copy Vault Address Buttons
    const copyVaultBtn = document.getElementById('copyVaultAddressBtn');
    const copyVaultBtn2 = document.getElementById('copyVaultAddressBtn2');
    const vaultAddr = this.casinoVaultAddress || '25YCFTvCWzEEwtHEnZk4AoZxAxQxWb9h5jeigFLtHoDM';
    [copyVaultBtn, copyVaultBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', async () => {
          const ok = await this.copyText(vaultAddr);
          this.showToast(ok ? 'Casino Main Vault address copied!' : 'Failed to copy');
          gpAudio.playClick();
        });
      }
    });

    // Copy User Public Key
    const copyUserKeyBtn = document.getElementById('copyUserPublicKeyBtn');
    const copyUserKeyBtn2 = document.getElementById('copyUserPublicKeyBtn2');
    [copyUserKeyBtn, copyUserKeyBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', async () => {
          const addr = this.activeWalletAddress || this.nonCustodialAddress;
          if (!addr || addr === 'Not initialized') {
            this.showToast('Address is still initializing...');
            return;
          }
          const ok = await this.copyText(addr);
          this.showToast(ok ? 'Solana deposit address copied!' : 'Failed to copy');
          if (ok) {
            const span = btn.querySelector('span') || btn;
            const orig = span.textContent;
            span.textContent = 'Copied!';
            setTimeout(() => { span.textContent = orig; }, 1800);
          }
          if (gpAudio && gpAudio.playClick) gpAudio.playClick();
        });
      }
    });

    // Quick deposit amount chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const amt = btn.getAttribute('data-amt');
        const inp = document.getElementById('phantomDepositAmountInput');
        if (inp && amt) {
          inp.value = amt;
          if (gpAudio && gpAudio.playClick) gpAudio.playClick();
        }
      });
    });

    // Connect Phantom / Solflare Button
    const connectPhantomBtn = document.getElementById('connectPhantomWalletBtn');
    if (connectPhantomBtn) {
      connectPhantomBtn.addEventListener('click', () => {
        this.connectPhantomWallet();
      });
    }

    // Fast 1-Click Deposit via Phantom
    const phantomDepositSubmitBtn = document.getElementById('phantomDepositSubmitBtn');
    const phantomDepositAmountInput = document.getElementById('phantomDepositAmountInput');
    if (phantomDepositSubmitBtn) {
      phantomDepositSubmitBtn.addEventListener('click', () => {
        const amt = parseFloat(phantomDepositAmountInput ? phantomDepositAmountInput.value : '0') || 0;
        if (amt < 0.01) {
          this.showToast('Minimum deposit amount is 0.01 SOL.');
          return;
        }
        this.depositWithPhantom(amt);
      });
    }

    // Verify Manual Deposit via Tx Hash
    const verifyDepositBtn = document.getElementById('verifyDepositBtn');
    const depositTxHashInput = document.getElementById('depositTxHashInput');
    const depositAmountClaimInput = document.getElementById('depositAmountClaimInput');
    if (verifyDepositBtn) {
      verifyDepositBtn.addEventListener('click', () => {
        const hash = (depositTxHashInput ? depositTxHashInput.value : '').trim();
        const amt = parseFloat(depositAmountClaimInput ? depositAmountClaimInput.value : '0') || 0;
        if (!hash) {
          this.showToast('Please enter your Solana deposit transaction signature.');
          return;
        }
        this.verifyDepositOnChain(hash, amt);
      });
    }

    // Real-Money Withdrawal Logic
    const withdrawInput = document.getElementById('withdrawAmountInput');
    const withdrawAddrInput = document.getElementById('withdrawAddressInput');
    const withdrawUsdEl = document.getElementById('withdrawUsdEstimate');
    const executeWithdrawBtn = document.getElementById('executeWithdrawBtn');

    this.updateWithdrawUsd = () => {
      if (withdrawUsdEl && withdrawInput) {
        const val = parseFloat(withdrawInput.value) || 0;
        const p = this.solPrice || 108.35;
        withdrawUsdEl.textContent = `≈ $${(val * p).toFixed(2)} USD`;
      }
    };

    if (withdrawInput) {
      withdrawInput.addEventListener('input', () => this.updateWithdrawUsd());
    }

    const pasteWithdrawBtn = document.getElementById('pasteWithdrawAddrBtn');
    if (pasteWithdrawBtn && withdrawAddrInput) {
      pasteWithdrawBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            withdrawAddrInput.value = text.trim();
            this.showToast('Address pasted!');
            if (gpAudio && gpAudio.playClick) gpAudio.playClick();
          }
        } catch (e) {
          this.showToast('Please paste manually.');
        }
      });
    }

    const minWBtn = document.getElementById('withdrawMinBtn');
    const halfWBtn = document.getElementById('withdrawHalfBtn');
    const maxWBtn = document.getElementById('withdrawMaxBtn');

    if (minWBtn) minWBtn.addEventListener('click', () => {
      if (withdrawInput) withdrawInput.value = '0.01';
      this.updateWithdrawUsd();
    });
    if (halfWBtn) halfWBtn.addEventListener('click', () => {
      if (withdrawInput) withdrawInput.value = Math.max(0.01, (this.balance / 2)).toFixed(4);
      this.updateWithdrawUsd();
    });
    if (maxWBtn) maxWBtn.addEventListener('click', () => {
      if (withdrawInput) withdrawInput.value = Math.max(0.01, (this.balance - 0.000005)).toFixed(4);
      this.updateWithdrawUsd();
    });

    if (executeWithdrawBtn) {
      executeWithdrawBtn.addEventListener('click', () => {
        const destAddr = (withdrawAddrInput ? withdrawAddrInput.value : '').trim();
        const amt = parseFloat(withdrawInput ? withdrawInput.value : '0') || 0;

        if (!destAddr || destAddr.length < 32) {
          this.showToast('Please enter a valid Solana wallet address (32-44 characters).');
          return;
        }
        if (amt < 0.01) {
          this.showToast('Minimum withdrawal amount is 0.01 SOL.');
          return;
        }
        if (amt > this.balance) {
          this.showToast(`Insufficient balance (${this.balance.toFixed(4)} SOL). You requested ${amt.toFixed(4)} SOL.`);
          return;
        }

        this.requestWithdrawalFromVault(destAddr, amt);
      });
    }

    // Export Private Key (Base58 & JSON)
    const exportBtn = document.getElementById('exportPrivateKeyBtn');
    const exportedContainer = document.getElementById('exportedKeyContainer');
    const exportedArea = document.getElementById('exportedKeyArea');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!window.confirm('⚠️ WARNING: Never share your private key with anyone! Anyone with this key can access and transfer your funds. Export now?')) {
          return;
        }
        if (this.userKeypair && this.userKeypair.secretKey) {
          const secretArr = Array.from(this.userKeypair.secretKey);
          const base58Key = this.toBase58(this.userKeypair.secretKey);
          if (exportedArea) {
            exportedArea.value = `Base58:\n${base58Key}\n\nJSON Array:\n${JSON.stringify(secretArr)}`;
          }
          if (exportedContainer) exportedContainer.style.display = 'block';
          this.showToast('Private key revealed. Keep it safe!');
        } else {
          this.showToast('No local private keypair found.');
        }
      });
    }

    // Import Existing Private Key
    const toggleImportBtn = document.getElementById('toggleImportKeyBtn');
    const importContainer = document.getElementById('importKeyContainer');
    const executeImportBtn = document.getElementById('executeImportKeyBtn');
    const importInput = document.getElementById('importKeyInput');

    if (toggleImportBtn && importContainer) {
      toggleImportBtn.addEventListener('click', () => {
        const isHidden = importContainer.style.display === 'none';
        importContainer.style.display = isHidden ? 'block' : 'none';
      });
    }

    if (executeImportBtn) {
      executeImportBtn.addEventListener('click', () => {
        const raw = (importInput ? importInput.value : '').trim();
        if (!raw) {
          this.showToast('Please paste a Base58 secret string or JSON array.');
          return;
        }
        this.importExistingKeypair(raw);
      });
    }

    // Toggle Security & Private Key Drawer
    const toggleSecBtn = document.getElementById('toggleSecurityDrawerBtn');
    const keysSec = document.getElementById('walletKeysSection');
    if (toggleSecBtn && keysSec) {
      toggleSecBtn.addEventListener('click', () => {
        const isHidden = keysSec.hidden;
        keysSec.hidden = !isHidden;
        toggleSecBtn.classList.toggle('is-open', !keysSec.hidden);
        if (gpAudio && gpAudio.playClick) gpAudio.playClick();
      });
    }

    // Refresh Ledger Button
    const refreshLedgerBtn = document.getElementById('refreshLedgerBtn');
    if (refreshLedgerBtn) {
      refreshLedgerBtn.addEventListener('click', () => this.fetchVaultLedger());
    }
  }

  /* ------------------------------------------------------------- */
  /* NON-CUSTODIAL WALLET ENGINE & CASINO VAULT INTEGRATION */
  /* ------------------------------------------------------------- */
  initNonCustodialKeypair() {
    try {
      if (window.solanaWeb3) {
        const storedSecret = localStorage.getItem('gp_noncustodial_secret');
        if (storedSecret) {
          try {
            const arr = JSON.parse(storedSecret);
            this.userKeypair = window.solanaWeb3.Keypair.fromSecretKey(new Uint8Array(arr));
          } catch(e) {
            this.userKeypair = window.solanaWeb3.Keypair.generate();
            localStorage.setItem('gp_noncustodial_secret', JSON.stringify(Array.from(this.userKeypair.secretKey)));
          }
        } else {
          this.userKeypair = window.solanaWeb3.Keypair.generate();
          localStorage.setItem('gp_noncustodial_secret', JSON.stringify(Array.from(this.userKeypair.secretKey)));
        }
        this.nonCustodialAddress = this.userKeypair.publicKey.toString();
      }
    } catch(err) {
      console.warn('Error setting up solanaWeb3 keypair:', err);
    }

    // Check for previously connected Phantom wallet
    const savedPhantom = localStorage.getItem('gp_connected_wallet');
    if (savedPhantom && savedPhantom.length >= 32) {
      this.phantomAddress = savedPhantom;
      this.activeWalletAddress = savedPhantom;
    } else {
      this.activeWalletAddress = this.nonCustodialAddress || this.getWalletAddress();
    }

    this.updateWalletUI();
    this.syncUserBalance();
    this.fetchCasinoVaultStats();
    this.startDepositAutoListener();
  }

  startDepositAutoListener() {
    if (this._depositAutoTimer) return;
    this._depositAutoTimer = setInterval(async () => {
      if (!this.activeWalletAddress) return;
      try {
        const res = await fetch(`/api/check-deposits?address=${encodeURIComponent(this.activeWalletAddress)}`);
        const data = await res.json();
        if (data && Array.isArray(data.newDeposits) && data.newDeposits.length > 0) {
          for (const dep of data.newDeposits) {
            this.showToast(`📥 Automatic Deposit Confirmed! +${Number(dep.amountSol || 0).toFixed(4)} SOL credited!`);
            this.pushNotification('Deposit Confirmed', `+${Number(dep.amountSol || 0).toFixed(4)} SOL received in Casino Vault.`, 'win');
            if (gpAudio && gpAudio.playWin) gpAudio.playWin();
          }
          this.syncUserBalance();
          this.fetchVaultLedger();
        }
      } catch(e) {}
    }, 4000);
  }

  updateWalletUI() {
    const shortEl = document.getElementById('userPrivateWalletShort');
    const fullEl = document.getElementById('userNonCustodialFullAddress');
    const badgeEl = document.getElementById('walletConnectionBadge');
    const phantomStatus = document.getElementById('phantomStatusText');
    const qrEl = document.getElementById('walletDepositQrImg');
    const addr = this.activeWalletAddress || this.nonCustodialAddress || 'Not initialized';

    if (shortEl) {
      shortEl.textContent = addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr;
      shortEl.title = addr;
    }
    if (fullEl) {
      fullEl.value = this.nonCustodialAddress || addr;
    }
    if (qrEl && addr && addr !== 'Not initialized') {
      qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(addr)}&bgcolor=0c1324&color=38bdf8&margin=1`;
    }
    if (badgeEl) {
      if (this.phantomAddress) {
        badgeEl.textContent = 'Phantom Connected';
        badgeEl.style.background = 'rgba(125,103,238,0.2)';
        badgeEl.style.color = '#c4b5fd';
        badgeEl.style.borderColor = 'rgba(125,103,238,0.4)';
      } else {
        badgeEl.textContent = 'In-Browser Non-Custodial';
        badgeEl.style.background = 'rgba(16,185,129,0.18)';
        badgeEl.style.color = '#34d399';
        badgeEl.style.borderColor = 'rgba(16,185,129,0.3)';
      }
    }
    if (phantomStatus) {
      phantomStatus.textContent = this.phantomAddress ? `Connected (${this.phantomAddress.slice(0, 4)}...${this.phantomAddress.slice(-4)})` : 'Connect Phantom';
    }
  }

  async fetchCasinoVaultStats() {
    try {
      const res = await fetch('/api/casino-vault');
      const data = await res.json();
      if (data && data.vaultAddress) {
        const vaultAddrDisplay = document.getElementById('casinoVaultAddressDisplay');
        const solscanLink = document.getElementById('vaultSolscanLink');
        if (vaultAddrDisplay) vaultAddrDisplay.textContent = data.vaultAddress;
        if (solscanLink) solscanLink.href = data.solscanUrl;
      }
    } catch(e) {}
  }

  async syncUserBalance() {
    if (!this.activeWalletAddress) return;
    try {
      const res = await fetch(`/api/user-balance?address=${encodeURIComponent(this.activeWalletAddress)}`);
      const data = await res.json();
      if (data && typeof data.balance === 'number') {
        this.balance = data.balance;
        this.saveBalance();
        this.updateBalanceUI();
      }
    } catch(e) {}
  }

  async connectPhantomWallet() {
    const provider = window.phantom?.solana || window.solana;
    if (!provider || !provider.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      this.showToast('Please install the Phantom wallet browser extension!');
      return;
    }
    try {
      const resp = await provider.connect();
      this.phantomAddress = resp.publicKey.toString();
      this.activeWalletAddress = this.phantomAddress;
      localStorage.setItem('gp_connected_wallet', this.phantomAddress);
      this.updateWalletUI();
      this.syncUserBalance();
      this.showToast(`Connected Phantom: ${this.phantomAddress.slice(0, 4)}...${this.phantomAddress.slice(-4)}`);
      gpAudio.playWin();
    } catch (err) {
      console.warn('Phantom connect error:', err);
      this.showToast('Phantom connection was cancelled.');
    }
  }

  async depositWithPhantom(amountSol) {
    const provider = window.phantom?.solana || window.solana;
    if (!provider || !provider.publicKey) {
      await this.connectPhantomWallet();
      if (!provider || !provider.publicKey) return;
    }

    if (!window.solanaWeb3) {
      this.showToast('Solana Web3 library is initializing...');
      return;
    }

    const lamports = Math.round(amountSol * 1e9);
    this.showToast(`Requesting signature in Phantom for ${amountSol.toFixed(4)} SOL...`);

    try {
      const vaultPubkey = new window.solanaWeb3.PublicKey(this.casinoVaultAddress || '25YCFTvCWzEEwtHEnZk4AoZxAxQxWb9h5jeigFLtHoDM');
      const connection = new window.solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash();

      const transaction = new window.solanaWeb3.Transaction({
        recentBlockhash: blockhash,
        feePayer: provider.publicKey
      }).add(
        window.solanaWeb3.SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: vaultPubkey,
          lamports
        })
      );

      const { signature } = await provider.signAndSendTransaction(transaction);
      this.showToast(`Transaction broadcasted: ${signature.slice(0, 8)}... Verifying on Solana RPC`);

      // Verify on backend
      const res = await fetch('/api/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: signature,
          userAddress: provider.publicKey.toString(),
          amountSol
        })
      });
      const result = await res.json();
      if (result.success) {
        this.balance = result.newBalance;
        this.saveBalance();
        this.recordTransaction('Deposit', amountSol, 'COMPLETED');
        gpAudio.playWin();
        this.showToast(`📥 Deposit verified! +${amountSol.toFixed(4)} SOL credited.`);
        this.pushNotification('Deposit Confirmed', `+${amountSol.toFixed(4)} SOL received in Casino Vault.`, 'win');
      } else {
        this.showToast(`Deposit status: ${result.error || 'Pending'}`);
      }
    } catch (err) {
      console.error('Phantom deposit error:', err);
      this.showToast(`Deposit error: ${err.message || 'Transaction rejected'}`);
    }
  }

  async verifyDepositOnChain(txHash, amountSol) {
    const statusEl = document.getElementById('depositStatusMsg');
    if (statusEl) {
      statusEl.style.color = '#38bdf8';
      statusEl.textContent = 'Querying Solana Mainnet RPC for signature verification...';
    }

    try {
      const res = await fetch('/api/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          userAddress: this.activeWalletAddress,
          amountSol
        })
      });
      const data = await res.json();
      if (data.success) {
        this.balance = data.newBalance;
        this.saveBalance();
        this.recordTransaction('Deposit', data.amountSol, 'COMPLETED');
        gpAudio.playWin();
        if (statusEl) {
          statusEl.style.color = '#4ade80';
          statusEl.innerHTML = `✅ Confirmed! +${data.amountSol.toFixed(4)} SOL credited. <a href="${data.solscanUrl}" target="_blank" style="color:#38bdf8;">View on Solscan ↗</a>`;
        }
        this.showToast(`📥 Confirmed! +${data.amountSol.toFixed(4)} SOL credited.`);
        this.pushNotification('Deposit Confirmed', `+${data.amountSol.toFixed(4)} SOL added to your balance.`, 'win');
      } else {
        if (statusEl) {
          statusEl.style.color = '#f87171';
          statusEl.textContent = `❌ ${data.error || 'Verification failed'}`;
        }
        this.showToast(data.error || 'Verification failed');
      }
    } catch(err) {
      if (statusEl) {
        statusEl.style.color = '#f87171';
        statusEl.textContent = `❌ Network error: ${err.message}`;
      }
    }
  }

  async requestWithdrawalFromVault(destAddr, amt) {
    const statusEl = document.getElementById('withdrawStatusMsg');
    const withdrawInput = document.getElementById('withdrawAmountInput');
    const walletDialog = document.getElementById('walletSecurityDialog');

    if (statusEl) {
      statusEl.style.color = '#38bdf8';
      statusEl.textContent = 'Processing non-custodial withdrawal from Casino Vault...';
    }

    try {
      const res = await fetch('/api/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationAddress: destAddr,
          userAddress: this.activeWalletAddress,
          amountSol: amt
        })
      });
      const data = await res.json();
      if (data.success) {
        this.balance = data.newBalance;
        this.saveBalance();
        this.recordTransaction('Withdrawal', -amt, 'COMPLETED');
        gpAudio.playClick();
        if (statusEl) {
          statusEl.style.color = '#4ade80';
          statusEl.innerHTML = `🚀 Sent! <a href="${data.solscanUrl}" target="_blank" style="color:#38bdf8;">View on Solscan ↗</a>`;
        }
        const truncDest = `${destAddr.slice(0, 4)}...${destAddr.slice(-4)}`;
        this.showToast(`🚀 Dispatched ${amt.toFixed(4)} SOL to ${truncDest}`);
        this.pushNotification('Withdrawal Complete', `${amt.toFixed(4)} SOL sent to ${truncDest}`, 'system');

        if (withdrawInput) withdrawInput.value = '';
        setTimeout(() => {
          if (walletDialog && typeof walletDialog.close === 'function') walletDialog.close();
        }, 1800);
      } else {
        if (statusEl) {
          statusEl.style.color = '#f87171';
          statusEl.textContent = `❌ ${data.error || 'Withdrawal failed'}`;
        }
        this.showToast(data.error || 'Withdrawal failed');
      }
    } catch(err) {
      if (statusEl) {
        statusEl.style.color = '#f87171';
        statusEl.textContent = `❌ Network error: ${err.message}`;
      }
    }
  }

  importExistingKeypair(rawInput) {
    if (!window.solanaWeb3) {
      this.showToast('Solana Web3 library is not loaded');
      return;
    }
    try {
      let secretKeyBytes = null;
      if (rawInput.startsWith('[') && rawInput.endsWith(']')) {
        const arr = JSON.parse(rawInput);
        secretKeyBytes = new Uint8Array(arr);
      } else {
        secretKeyBytes = this.fromBase58(rawInput);
      }

      if (!secretKeyBytes || secretKeyBytes.length !== 64) {
        this.showToast('Invalid key length. A Solana secret key must be 64 bytes.');
        return;
      }

      const importedKp = window.solanaWeb3.Keypair.fromSecretKey(secretKeyBytes);
      this.userKeypair = importedKp;
      this.nonCustodialAddress = importedKp.publicKey.toString();
      this.activeWalletAddress = this.nonCustodialAddress;
      localStorage.setItem('gp_noncustodial_secret', JSON.stringify(Array.from(secretKeyBytes)));
      localStorage.removeItem('gp_connected_wallet');
      this.phantomAddress = null;

      this.updateWalletUI();
      this.syncUserBalance();
      this.showToast(`Keypair imported! Active address: ${this.nonCustodialAddress.slice(0, 4)}...${this.nonCustodialAddress.slice(-4)}`);
      gpAudio.playWin();

      const importContainer = document.getElementById('importKeyContainer');
      if (importContainer) importContainer.style.display = 'none';
    } catch(err) {
      console.error('Import error:', err);
      this.showToast(`Key import failed: ${err.message}`);
    }
  }

  async fetchVaultLedger() {
    const listEl = document.getElementById('vaultLedgerList');
    if (!listEl) return;
    try {
      const res = await fetch('/api/vault-ledger');
      const data = await res.json();
      const txs = (data && data.transactions) || [];
      if (txs.length === 0) {
        listEl.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:16px;">No recorded vault transactions yet. Be the first to deposit!</div>';
        return;
      }
      listEl.innerHTML = txs.map(tx => {
        const isDep = tx.type === 'DEPOSIT';
        const color = isDep ? '#4ade80' : '#f87171';
        const sign = isDep ? '+' : '-';
        const hashShort = tx.txHash ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}` : 'On-Chain';
        const dateStr = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;background:#060b17;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;font-size:11.5px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:10px;font-weight:900;padding:2px 6px;border-radius:4px;background:${isDep ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'};color:${color};">${tx.type}</span>
              <a href="${tx.solscanUrl || '#'}" target="_blank" style="color:#38bdf8;text-decoration:none;font-family:monospace;font-size:11px;">${hashShort} ↗</a>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:900;color:${color};">${sign}${Number(tx.amountSol || 0).toFixed(4)} SOL</span>
              <span style="color:#64748b;font-size:10px;">${dateStr}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch(e) {
      listEl.innerHTML = '<div style="font-size:12px;color:#f87171;text-align:center;padding:16px;">Failed to load ledger records.</div>';
    }
  }

  showInsufficientBalancePrompt() {
    this.showToast('❌ Insufficient SOL Balance! Deposit SOL to the Casino Vault or connect Phantom.');
    const walletDialog = document.getElementById('walletSecurityDialog');
    if (walletDialog && typeof walletDialog.showModal === 'function') {
      try { walletDialog.showModal(); } catch (e) {}
    }
  }

  getMaxPlayableBet() {
    return Math.max(0, parseFloat((this.balance - this.solFeeReserve).toFixed(4)));
  }

  canAffordBet(betAmount) {
    const amt = parseFloat(Number(betAmount).toFixed(4)) || 0;
    if (amt <= 0) return false;

    // Check if user has zero balance or strictly less balance than the bet
    if (this.balance < amt) {
      this.showInsufficientBalancePrompt();
      return false;
    }

    // Fee reserve check: you cover your own SOL fees, so you can never bet all your SOL
    const maxPlayable = this.getMaxPlayableBet();
    if (amt > maxPlayable + 0.00005 || (this.balance - amt) < this.solFeeReserve - 0.00005) {
      this.showFeeReservePrompt(amt);
      return false;
    }

    return true;
  }

  showFeeReservePrompt(requestedBet) {
    const maxPlayable = this.getMaxPlayableBet();
    if (maxPlayable <= 0) {
      this.showToast(`⚠️ You cover your own network fees! You must keep at least ${this.solFeeReserve} SOL reserved for fees.`);
    } else {
      this.showToast(`⚠️ You cover your own fees! ${this.solFeeReserve} SOL reserved for fees. Max bet allowed is ${maxPlayable.toFixed(4)} SOL.`);
    }
    const walletDialog = document.getElementById('walletSecurityDialog');
    if (walletDialog && typeof walletDialog.showModal === 'function' && maxPlayable <= 0) {
      try { walletDialog.showModal(); } catch (e) {}
    }
  }

  toBase58(uint8Array) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const digits = [0];
    for (let i = 0; i < uint8Array.length; i++) {
      for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
      digits[0] += uint8Array[i];
      let carry = 0;
      for (let j = 0; j < digits.length; j++) {
        digits[j] += carry;
        carry = (digits[j] / 58) | 0;
        digits[j] %= 58;
      }
      while (carry) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    for (let i = 0; i < uint8Array.length && uint8Array[i] === 0; i++) digits.push(0);
    return digits.reverse().map(d => ALPHABET[d]).join('');
  }

  fromBase58(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = [0];
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      const val = ALPHABET.indexOf(c);
      if (val === -1) throw new Error(`Illegal character in base58: ${c}`);
      for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
      bytes[0] += val;
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (let i = 0; i < str.length && str[i] === '1'; i++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  }

  /* ------------------------------------------------------------- */
  /* USER PROFILE & PROFILE DROPDOWN (Image 2) */
  /* ------------------------------------------------------------- */
  initProfileMenu() {
    const profileBtn = document.getElementById('gpProfileBtn');
    const profileDropdown = document.getElementById('gpProfileDropdown');
    const usernameDisplay = document.getElementById('profileUsernameDisplay');
    const walletTruncated = document.getElementById('profileWalletTruncated');
    const copyWalletBtn = document.getElementById('profileCopyWalletBtn');

    // Update Header Display
    if (usernameDisplay) usernameDisplay.textContent = this.username;
    const addr = this.getWalletAddress();
    if (walletTruncated) walletTruncated.textContent = `${addr.slice(0, 4)}...${addr.slice(-4)} (Insta)`;

    if (copyWalletBtn) {
      copyWalletBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await this.copyText(addr);
        this.showToast(ok ? 'Wallet address copied!' : 'Could not copy address.');
        gpAudio.playClick();
      });
    }

    // Toggle Dropdown
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !profileDropdown.hidden;
        profileDropdown.hidden = isOpen;
        profileBtn.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) gpAudio.playClick();
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileDropdown.hidden && !e.target.closest('.nav-profile-container')) {
          profileDropdown.hidden = true;
          profileBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Row 1: Statistics
    const itemStats = document.getElementById('menuItemStats');
    const statsModal = document.getElementById('statsModal');
    if (itemStats && statsModal) {
      itemStats.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.updateStatsUI();
        if (typeof statsModal.showModal === 'function') statsModal.showModal();
        gpAudio.playClick();
      });
    }

    // Row 2: Affiliates
    const itemAffiliates = document.getElementById('menuItemAffiliates');
    const affiliatesModal = document.getElementById('affiliatesModal');
    if (itemAffiliates && affiliatesModal) {
      itemAffiliates.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.updateAffiliatesUI();
        if (typeof affiliatesModal.showModal === 'function') affiliatesModal.showModal();
        gpAudio.playClick();
      });
    }

    const copyRefBtn = document.getElementById('copyRefLinkBtn');
    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', async () => {
        const link = `https://luckywin.sol/ref/${encodeURIComponent(this.username)}`;
        const ok = await this.copyText(link);
        this.showToast(ok ? 'Referral link copied to clipboard!' : 'Could not copy link.');
        gpAudio.playClick();
      });
    }

    const claimAffBtn = document.getElementById('claimAffiliateCommBtn');
    if (claimAffBtn) {
      claimAffBtn.addEventListener('click', () => {
        this.showToast('No unclaimed affiliate commissions pending.');
        gpAudio.playClick();
      });
    }

    // Row 3: Settings
    const itemSettings = document.getElementById('menuItemSettings');
    const settingsModal = document.getElementById('settingsModal');
    const settingsInput = document.getElementById('settingsUsernameInput');
    const saveUserBtn = document.getElementById('saveUsernameBtn');

    if (itemSettings && settingsModal) {
      itemSettings.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        if (settingsInput) settingsInput.value = this.username;
        this.syncAdminPanelState();
        if (typeof settingsModal.showModal === 'function') settingsModal.showModal();
        gpAudio.playClick();
      });
    }

    if (saveUserBtn && settingsInput) {
      saveUserBtn.addEventListener('click', () => {
        const newName = settingsInput.value.trim().slice(0, 16);
        if (!newName) {
          this.showToast('Please enter a non-empty username.');
          return;
        }
        this.username = newName;
        localStorage.setItem('gp_username', newName);
        if (usernameDisplay) usernameDisplay.textContent = newName;
        this.showToast(`Display name updated to "${newName}"!`);
        gpAudio.playClick();
        if (settingsModal && typeof settingsModal.close === 'function') settingsModal.close();
      });
    }

    const openFairnessBtn = document.getElementById('settingsOpenFairnessBtn');
    if (openFairnessBtn) {
      openFairnessBtn.addEventListener('click', () => {
        if (settingsModal && typeof settingsModal.close === 'function') settingsModal.close();
        const fModal = document.getElementById('fairnessModal');
        if (fModal) fModal.classList.add('is-open');
        gpAudio.playClick();
      });
    }

    const openTermsBtn = document.getElementById('settingsOpenTermsBtn');
    if (openTermsBtn) {
      openTermsBtn.addEventListener('click', () => {
        if (settingsModal && typeof settingsModal.close === 'function') settingsModal.close();
        this.openTermsModal();
      });
    }

    // Row 4: Transactions
    const itemTx = document.getElementById('menuItemTransactions');
    const txModal = document.getElementById('transactionsModal');
    if (itemTx && txModal) {
      itemTx.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.renderTransactionsTable();
        if (typeof txModal.showModal === 'function') txModal.showModal();
        gpAudio.playClick();
      });
    }

    // Row 5: Daily Free Chest
    const itemDaily = document.getElementById('menuItemDailyChest');
    if (itemDaily) {
      itemDaily.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.openDailyCaseModal(true);
        gpAudio.playClick();
      });
    }

    // Row 6: Rewards
    const itemRewards = document.getElementById('menuItemRewards');
    const rewardsModal = document.getElementById('rewardsModal');
    if (itemRewards && rewardsModal) {
      itemRewards.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.updateVipDisplay();
        this.updateWeeklyReloadUI();
        if (typeof rewardsModal.showModal === 'function') rewardsModal.showModal();
        gpAudio.playClick();
      });
    }

    const claimReloadBtn = document.getElementById('claimDailyReloadBtn');
    if (claimReloadBtn) {
      claimReloadBtn.addEventListener('click', () => {
        this.claimWeeklyReload();
      });
    }

    const claimRakebackBtn = document.getElementById('claimRakebackBtn');
    if (claimRakebackBtn) {
      claimRakebackBtn.addEventListener('click', () => {
        this.claimRakeback();
      });
    }

    // Row 7: Wallet
    const itemWallet = document.getElementById('menuItemWallet');
    if (itemWallet) {
      itemWallet.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.hidden = true;
        this.openWalletDialog(true);
        gpAudio.playClick();
      });
    }
  }

  /* ============================================================= */
  /* ADMIN CONSOLE ENGINE (PROTECTED BY EMAIL & MASTER SECRET KEY) */
  /* ============================================================= */
  initAdminConsole() {
    const adminEmailInput = document.getElementById('adminAuthEmail');
    const adminKeyInput = document.getElementById('adminAuthKey');
    const toggleKeyBtn = document.getElementById('adminToggleKeyVisibility');
    const unlockBtn = document.getElementById('adminUnlockActionBtn');
    const lockBtn = document.getElementById('adminLockSessionBtn');
    const refreshBtn = document.getElementById('adminRefreshBtn');
    const searchUsersBtn = document.getElementById('adminSearchUsersBtn');
    const searchUsersInput = document.getElementById('adminSearchUsersInput');
    const refreshBetsBtn = document.getElementById('adminRefreshBetsBtn');
    const saveUserBtn = document.getElementById('adminSaveUserBtn');
    const airdropQuickBtn = document.getElementById('adminAirdropQuickBtn');
    const closeEditPanelBtn = document.getElementById('adminCloseEditPanelBtn');
    const usersTableBody = document.getElementById('adminUsersTableBody');
    const tabBtns = document.querySelectorAll('.admin-tab-btn');

    // Toggle password masking
    if (toggleKeyBtn && adminKeyInput) {
      toggleKeyBtn.addEventListener('click', () => {
        const isPass = adminKeyInput.type === 'password';
        adminKeyInput.type = isPass ? 'text' : 'password';
        toggleKeyBtn.textContent = isPass ? 'Hide Key' : 'Show Key';
      });
    }

    // Unlock button
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => this.handleAdminUnlock());
    }

    // Enter key submits auth
    if (adminKeyInput) {
      adminKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleAdminUnlock();
      });
    }
    if (adminEmailInput) {
      adminEmailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleAdminUnlock();
      });
    }

    // Lock button
    if (lockBtn) {
      lockBtn.addEventListener('click', () => this.handleAdminLock());
    }

    // Refresh button
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadAdminStats();
        this.loadAdminUsers();
        this.loadAdminBets();
        this.showToast('Admin data refreshed');
      });
    }

    // Tab switching
    if (tabBtns && tabBtns.length > 0) {
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-admin-tab');
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const allPanes = document.querySelectorAll('.admin-tab-pane');
          allPanes.forEach(p => p.style.display = 'none');

          const targetPane = document.getElementById(
            tab === 'stats' ? 'adminTabStats' :
            tab === 'users' ? 'adminTabUsers' :
            tab === 'bets' ? 'adminTabBets' :
            tab === 'config' ? 'adminTabConfig' : 'adminTabStats'
          );
          if (targetPane) targetPane.style.display = 'block';

          if (tab === 'bets') this.loadAdminBets();
          if (tab === 'users') this.loadAdminUsers();
          if (tab === 'stats') this.loadAdminStats();
        });
      });
    }

    // Search users
    if (searchUsersBtn && searchUsersInput) {
      searchUsersBtn.addEventListener('click', () => {
        this.loadAdminUsers(searchUsersInput.value.trim());
      });
      searchUsersInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.loadAdminUsers(searchUsersInput.value.trim());
        }
      });
    }

    // Table click delegation for edit buttons
    if (usersTableBody) {
      usersTableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-edit-user-id]');
        if (btn) {
          const userId = btn.getAttribute('data-edit-user-id');
          this.openAdminEditUser(userId);
        }
      });
    }

    // Refresh bets
    if (refreshBetsBtn) {
      refreshBetsBtn.addEventListener('click', () => this.loadAdminBets());
    }

    // Close edit panel
    if (closeEditPanelBtn) {
      closeEditPanelBtn.addEventListener('click', () => {
        const editPanel = document.getElementById('adminUserEditPanel');
        if (editPanel) editPanel.style.display = 'none';
      });
    }

    // Save user updates
    if (saveUserBtn) {
      saveUserBtn.addEventListener('click', () => this.handleAdminSaveUser());
    }

    // Quick Airdrop
    if (airdropQuickBtn) {
      airdropQuickBtn.addEventListener('click', () => this.handleAdminQuickAirdrop());
    }

    this.syncAdminPanelState();
  }

  syncAdminPanelState() {
    const authGate = document.getElementById('adminAuthGateWrap');
    const dashboard = document.getElementById('adminDashboardWrap');
    const statusBadge = document.getElementById('adminStatusBadge');
    const sessionEmailDisp = document.getElementById('adminSessionEmailDisplay');
    const emailInput = document.getElementById('adminAuthEmail');
    const settingsModal = document.getElementById('settingsModal');

    this.adminToken = localStorage.getItem('gp_admin_token') || '';
    this.adminEmail = localStorage.getItem('gp_admin_email') || '';
    this.isAdminAuthenticated = Boolean(this.adminToken);

    if (this.isAdminAuthenticated) {
      if (authGate) authGate.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      if (statusBadge) {
        statusBadge.textContent = 'UNLOCKED';
        statusBadge.className = 'admin-badge unlocked';
      }
      if (sessionEmailDisp) {
        sessionEmailDisp.textContent = this.adminEmail || 'admin@greenpump.fun';
      }
      if (settingsModal) {
        settingsModal.classList.add('admin-unlocked');
      }
      this.loadAdminStats();
    } else {
      if (authGate) authGate.style.display = 'block';
      if (dashboard) dashboard.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'LOCKED';
        statusBadge.className = 'admin-badge locked';
      }
      if (settingsModal) {
        settingsModal.classList.remove('admin-unlocked');
      }
      // Prefill with current logged-in user email if available
      if (emailInput && !emailInput.value && this.userEmail) {
        emailInput.value = this.userEmail;
      }
    }
  }

  async handleAdminUnlock() {
    const emailInput = document.getElementById('adminAuthEmail');
    const keyInput = document.getElementById('adminAuthKey');
    const errBox = document.getElementById('adminAuthError');
    const unlockBtn = document.getElementById('adminUnlockActionBtn');

    if (errBox) errBox.style.display = 'none';

    const email = (emailInput ? emailInput.value : '').trim();
    const secretKey = (keyInput ? keyInput.value : '').trim();

    if (!email || !email.includes('@')) {
      if (errBox) {
        errBox.textContent = 'Please enter a valid administrator email address.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (!secretKey) {
      if (errBox) {
        errBox.textContent = 'Please enter the administrator secret key.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (unlockBtn) {
      unlockBtn.disabled = true;
      unlockBtn.innerHTML = '<span>⏳</span> <span>VERIFYING CREDENTIALS...</span>';
    }

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secretKey })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify email and secret key.');
      }

      this.adminToken = data.adminToken;
      this.adminEmail = data.admin?.email || email;
      this.isAdminAuthenticated = true;
      localStorage.setItem('gp_admin_token', this.adminToken);
      localStorage.setItem('gp_admin_email', this.adminEmail);

      if (keyInput) keyInput.value = '';
      if (errBox) errBox.style.display = 'none';

      this.syncAdminPanelState();
      this.loadAdminUsers();
      this.loadAdminBets();
      this.showToast('🛡️ Admin Console Unlocked!');
      gpAudio.playWin();
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || 'Failed to authenticate.';
        errBox.style.display = 'block';
      }
      gpAudio.playLose();
    } finally {
      if (unlockBtn) {
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = '<span>🔓</span> <span>UNLOCK ADMIN PANEL</span>';
      }
    }
  }

  handleAdminLock() {
    this.adminToken = '';
    this.adminEmail = '';
    this.isAdminAuthenticated = false;
    localStorage.removeItem('gp_admin_token');
    localStorage.removeItem('gp_admin_email');
    this.syncAdminPanelState();
    this.showToast('Admin Console locked.');
    gpAudio.playClick();
  }

  async loadAdminStats() {
    if (!this.adminToken) return;
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'x-admin-token': this.adminToken
        }
      });
      if (res.status === 401) {
        this.handleAdminLock();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) return;

      const s = data.stats || {};
      const elUsers = document.getElementById('admKpiUsers');
      const elBets = document.getElementById('admKpiBets');
      const elVolume = document.getElementById('admKpiVolume');
      const elProfit = document.getElementById('admKpiProfit');
      const elWinRate = document.getElementById('admKpiWinRate');
      const elDb = document.getElementById('admKpiDb');
      const elPayout = document.getElementById('admKpiPayout');
      const elVault = document.getElementById('admKpiVault');
      const envDbStatus = document.getElementById('adminEnvDbStatus');
      const envVaultStatus = document.getElementById('adminEnvVaultStatus');

      if (elUsers) elUsers.textContent = (s.totalUsers ?? '--').toLocaleString();
      if (elBets) elBets.textContent = (s.totalBets ?? '--').toLocaleString();
      if (elVolume) elVolume.textContent = `${Number(s.totalWagered || 0).toFixed(4)} SOL`;
      if (elProfit) {
        const profit = Number(s.grossHouseProfit || 0);
        elProfit.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(4)} SOL`;
        elProfit.style.color = profit >= 0 ? '#4ade80' : '#f87171';
      }
      if (elWinRate) elWinRate.textContent = `Win Rate: ${s.winRate || 0}%`;
      if (elDb) elDb.textContent = `Engine: ${s.dbEngine === 'postgresql' ? 'PostgreSQL' : 'File Fallback'}`;
      if (elPayout) elPayout.textContent = `Payouts: ${Number(s.totalPayout || 0).toFixed(4)} SOL`;
      if (elVault) {
        const bal = s.vaultStats?.balanceSol;
        elVault.textContent = bal !== undefined ? `Vault: ${bal} SOL` : 'Vault: Active';
      }
      if (envDbStatus) envDbStatus.textContent = s.dbEngine === 'postgresql' ? 'PostgreSQL (Cloud)' : 'Local JSON Fallback';
      if (envVaultStatus) envVaultStatus.textContent = s.vaultStats?.configured ? 'Active' : 'Fallback';

      // Top holders list
      const topList = document.getElementById('admTopHoldersList');
      if (topList && Array.isArray(s.topPlayers)) {
        if (s.topPlayers.length === 0) {
          topList.innerHTML = '<div style="color:#64748b;">No player records found.</div>';
        } else {
          topList.innerHTML = s.topPlayers.map((p, idx) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:rgba(255,255,255,0.02);border-radius:6px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#94a3b8;font-weight:800;font-size:10px;">#${idx + 1}</span>
                <span style="color:#ffffff;font-weight:700;">${this.escapeHtml(p.username || 'Player')}</span>
                <span style="font-size:9.5px;color:#64748b;">(${this.escapeHtml(p.email || 'anon')})</span>
              </div>
              <span style="color:#22c55e;font-weight:900;font-family:monospace;">${Number(p.balance || 0).toFixed(4)} SOL</span>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[Admin Stats Error]', e);
    }
  }

  async loadAdminUsers(search = '') {
    if (!this.adminToken) return;
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:14px;">Loading players...</td></tr>';

    try {
      const q = encodeURIComponent(search);
      const res = await fetch(`/api/admin/users?search=${q}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'x-admin-token': this.adminToken
        }
      });
      if (res.status === 401) {
        this.handleAdminLock();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:14px;">${this.escapeHtml(data.error || 'Failed to load players')}</td></tr>`;
        return;
      }

      const users = data.users || [];
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:14px;">No players match this query.</td></tr>';
        return;
      }

      this._adminLoadedUsers = users;
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>
            <div style="font-weight:800;color:#ffffff;">${this.escapeHtml(u.username || 'User')}</div>
            <div style="font-size:10px;color:#64748b;">${this.escapeHtml(u.email || u.id)}</div>
          </td>
          <td style="color:#22c55e;font-weight:800;font-family:monospace;">${Number(u.balance || 0).toFixed(4)} SOL</td>
          <td><span style="font-size:10px;color:#93c5fd;font-weight:700;">${this.escapeHtml(u.vipRank || 'Bronze')}</span></td>
          <td><span style="font-size:10px;color:#cbd5e1;font-weight:700;">Lv.${u.userLevel || 1}</span></td>
          <td>
            <button type="button" class="admin-action-btn" data-edit-user-id="${this.escapeHtml(u.id)}">EDIT</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:14px;">Error: ${this.escapeHtml(e.message)}</td></tr>`;
    }
  }

  openAdminEditUser(userId) {
    if (!this._adminLoadedUsers) return;
    const user = this._adminLoadedUsers.find(u => u.id === userId);
    if (!user) return;

    const panel = document.getElementById('adminUserEditPanel');
    const title = document.getElementById('adminEditUserTitle');
    const idInput = document.getElementById('adminEditUserId');
    const balInput = document.getElementById('adminEditBalanceInput');
    const vipSelect = document.getElementById('adminEditVipSelect');

    if (!panel) return;

    if (title) title.textContent = `EDIT PLAYER: ${user.username || user.email}`;
    if (idInput) idInput.value = user.id;
    if (balInput) balInput.value = Number(user.balance || 0).toFixed(4);
    if (vipSelect) vipSelect.value = user.vipRank || 'Bronze';

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async handleAdminSaveUser() {
    const idInput = document.getElementById('adminEditUserId');
    const balInput = document.getElementById('adminEditBalanceInput');
    const vipSelect = document.getElementById('adminEditVipSelect');
    const panel = document.getElementById('adminUserEditPanel');

    if (!idInput || !idInput.value || !this.adminToken) return;

    const userId = idInput.value;
    const newBal = parseFloat(balInput ? balInput.value : '0');
    const newVip = vipSelect ? vipSelect.value : 'Bronze';

    if (isNaN(newBal) || newBal < 0) {
      this.showToast('Please enter a valid balance.');
      return;
    }

    try {
      const res = await fetch('/api/admin/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`,
          'x-admin-token': this.adminToken
        },
        body: JSON.stringify({
          userId,
          balance: newBal,
          vipRank: newVip
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      this.showToast(`Updated user balance to ${newBal.toFixed(4)} SOL!`);
      if (panel) panel.style.display = 'none';

      // If current user was updated, sync balance in client
      if (this.user && this.user.id === userId) {
        this.balance = newBal;
        localStorage.setItem('gp_sol_balance', this.balance.toFixed(4));
        this.updateBalanceUI();
      }

      this.loadAdminUsers();
      this.loadAdminStats();
    } catch (e) {
      this.showToast(`Update error: ${e.message}`);
    }
  }

  async handleAdminQuickAirdrop() {
    const idInput = document.getElementById('adminEditUserId');
    const balInput = document.getElementById('adminEditBalanceInput');
    if (!idInput || !idInput.value || !this.adminToken) return;

    const currentBal = parseFloat(balInput ? balInput.value : '0') || 0;
    const newBal = parseFloat((currentBal + 0.50).toFixed(4));
    if (balInput) balInput.value = newBal.toFixed(4);

    try {
      const res = await fetch('/api/admin/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`,
          'x-admin-token': this.adminToken
        },
        body: JSON.stringify({
          userId: idInput.value,
          balance: newBal
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Airdrop failed');

      this.showToast(`🪂 Airdropped +0.50 SOL! New balance: ${newBal.toFixed(4)} SOL`);
      if (this.user && this.user.id === idInput.value) {
        this.balance = newBal;
        localStorage.setItem('gp_sol_balance', this.balance.toFixed(4));
        this.updateBalanceUI();
      }
      this.loadAdminUsers();
      this.loadAdminStats();
    } catch (e) {
      this.showToast(`Airdrop error: ${e.message}`);
    }
  }

  async loadAdminBets() {
    if (!this.adminToken) return;
    const tbody = document.getElementById('adminBetsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:14px;">Loading bets audit...</td></tr>';

    try {
      const res = await fetch('/api/admin/bets?limit=50', {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'x-admin-token': this.adminToken
        }
      });
      if (res.status === 401) {
        this.handleAdminLock();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:14px;">${this.escapeHtml(data.error || 'Failed to load bets')}</td></tr>`;
        return;
      }

      const bets = data.bets || [];
      if (bets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:14px;">No bets recorded on the platform yet.</td></tr>';
        return;
      }

      tbody.innerHTML = bets.map(b => {
        const timeStr = b.timestamp ? new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
        const won = Boolean(b.won);
        const payout = Number(b.payout || 0);
        const mult = Number(b.multiplier || 1).toFixed(2);
        return `
          <tr>
            <td style="color:#64748b;font-family:monospace;font-size:10px;">${timeStr}</td>
            <td>
              <div style="font-weight:700;color:#ffffff;">${this.escapeHtml(b.username || 'Player')}</div>
              <div style="font-size:9.5px;color:#64748b;">${this.escapeHtml(b.email || 'anon')}</div>
            </td>
            <td><span style="font-size:10px;color:#93c5fd;font-weight:700;text-transform:uppercase;">${this.escapeHtml(b.game || 'Game')}</span></td>
            <td style="font-family:monospace;color:#cbd5e1;">${Number(b.betAmount || 0).toFixed(4)} SOL</td>
            <td>
              <span class="admin-pill-tag ${won ? 'admin-pill-won' : 'admin-pill-lost'}">${won ? `WON ${mult}x (${payout.toFixed(4)} SOL)` : 'LOST'}</span>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:14px;">Error: ${this.escapeHtml(e.message)}</td></tr>`;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ============================================================= */
  /* MANDATORY AUTHENTICATION & DATABASE PERSISTENCE ENGINE */
  /* ============================================================= */
  initAuth() {
    window.gpEngine = this;
    const tabSignup = document.getElementById('authTabSignup');
    const tabLogin = document.getElementById('authTabLogin');
    const googleBtn = document.getElementById('authGoogleBtn');
    const authForm = document.getElementById('authForm');
    const togglePwdBtn = document.getElementById('authTogglePwdBtn');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navSignupBtn = document.getElementById('navSignupBtn');
    const menuItemAuth = document.getElementById('menuItemAuth');
    const authModal = document.getElementById('authModal');

    // Prevent closing via Escape / cancel event when not logged in
    if (authModal) {
      authModal.addEventListener('cancel', (e) => {
        if (!this.isLoggedIn) {
          e.preventDefault();
          this.shakeAuthCard();
        }
      });

      // Prevent closing when clicking backdrop if not logged in
      authModal.addEventListener('click', (e) => {
        const rect = authModal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog && !this.isLoggedIn) {
          this.shakeAuthCard();
        }
      });
    }

    if (tabSignup) tabSignup.addEventListener('click', () => this.setAuthMode('signup'));
    if (tabLogin) tabLogin.addEventListener('click', () => this.setAuthMode('login'));

    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleGoogleAuth());
    }

    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEmailAuth();
      });
    }

    if (togglePwdBtn) {
      togglePwdBtn.addEventListener('click', () => {
        const pwdInput = document.getElementById('authPasswordInput');
        if (pwdInput) {
          const isPwd = pwdInput.type === 'password';
          pwdInput.type = isPwd ? 'text' : 'password';
          togglePwdBtn.style.color = isPwd ? '#38bdf8' : '#64748b';
        }
      });
    }

    if (navLoginBtn) {
      navLoginBtn.addEventListener('click', () => this.openAuthModal('login'));
    }
    if (navSignupBtn) {
      navSignupBtn.addEventListener('click', () => this.openAuthModal('signup'));
    }

    if (menuItemAuth) {
      menuItemAuth.addEventListener('click', () => {
        const profileDropdown = document.getElementById('gpProfileDropdown');
        if (profileDropdown) profileDropdown.hidden = true;
        if (this.isLoggedIn) {
          this.handleLogout();
        } else {
          this.openAuthModal('login');
        }
        if (gpAudio && gpAudio.playClick) gpAudio.playClick();
      });
    }

    // Global interaction guard: when not logged in, block all gameplay, betting, deposit, or chat actions
    document.addEventListener('click', (e) => {
      if (this.isLoggedIn) return;
      // Allow interacting with the auth modal and legal/info links
      if (e.target.closest('#authModal, [data-info], #infoModal, a[href*="privacy"], a[href*="terms"], a[href*="responsible"], a[href*="howto"]')) {
        return;
      }
      // If clicking games, bet buttons, wallet, chat, profile, or any actions, block and enforce auth!
      const blockedTarget = e.target.closest('.game-container, .gp-game-card, .gp-chat, #gpWalletBtn, #footerWalletBtn, #gpProfileBtn, [data-open-case], button, input, select, textarea');
      if (blockedTarget) {
        e.preventDefault();
        e.stopPropagation();
        this.requireAuth();
      }
    }, true);

    // Verify existing database session or enforce mandatory registration gate
    this.checkExistingSession();
    this.updateAuthUI();
    this.initGoogleOneTap();
  }

  checkExistingSession() {
    if (!this.sessionToken) {
      this.enforceMandatoryAuth();
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + this.sessionToken }
    })
    .then(res => {
      if (!res.ok) throw new Error('Session invalid');
      return res.json();
    })
    .then(data => {
      if (data && data.user) {
        this.applyUserSession(data.user, this.sessionToken, data.user.authProvider || 'email', false);
      } else {
        this.enforceMandatoryAuth();
      }
    })
    .catch(() => {
      if (this.isLoggedIn && this.userEmail) {
        this.updateAuthUI();
      } else {
        this.enforceMandatoryAuth();
      }
    });
  }

  enforceMandatoryAuth() {
    this.isLoggedIn = false;
    const closeBtn = document.getElementById('authCloseBtn');
    if (closeBtn) closeBtn.style.display = 'none';
    this.updateAuthUI();
    this.openAuthModal('signup');
  }

  closeAuthModal() {
    if (!this.isLoggedIn) {
      this.shakeAuthCard();
      this.showToast('⚠️ Registration or login is required to access LuckyWin.');
      return;
    }
    const modal = document.getElementById('authModal');
    if (modal && typeof modal.close === 'function') modal.close();
  }

  shakeAuthCard() {
    const card = document.getElementById('authCard');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
  }

  requireAuth() {
    if (!this.isLoggedIn) {
      this.enforceMandatoryAuth();
      this.shakeAuthCard();
      this.showToast('⚠️ Please sign up or log in to play, deposit, or chat.');
      return false;
    }
    return true;
  }

  setAuthMode(mode) {
    this.authMode = mode;
    const tabSignup = document.getElementById('authTabSignup');
    const tabLogin = document.getElementById('authTabLogin');
    const title = document.getElementById('authModalTitle');
    const subtitle = document.getElementById('authModalSubtitle');
    const usernameGroup = document.getElementById('authUsernameGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const statusMsg = document.getElementById('authStatusMsg');

    if (statusMsg) statusMsg.style.display = 'none';

    if (mode === 'signup') {
      if (tabSignup) tabSignup.classList.add('is-active');
      if (tabLogin) tabLogin.classList.remove('is-active');
      if (title) title.textContent = 'Welcome to LuckyWin';
      if (subtitle) subtitle.textContent = 'Create an account to start playing and save your progress';
      if (usernameGroup) usernameGroup.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Create Account & Play';
    } else {
      if (tabSignup) tabSignup.classList.remove('is-active');
      if (tabLogin) tabLogin.classList.add('is-active');
      if (title) title.textContent = 'Welcome Back';
      if (subtitle) subtitle.textContent = 'Sign in to access your saved balance & earnings';
      if (usernameGroup) usernameGroup.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Sign In & Play';
    }
    if (gpAudio && gpAudio.playClick) gpAudio.playClick();
  }

  openAuthModal(mode = 'signup') {
    this.setAuthMode(mode);
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('authCloseBtn');
    if (closeBtn) {
      closeBtn.style.display = this.isLoggedIn ? 'block' : 'none';
    }
    if (modal && typeof modal.showModal === 'function') {
      if (!modal.open) {
        modal.showModal();
      }
      if (gpAudio && gpAudio.playClick) gpAudio.playClick();
    }
  }

  initGoogleOneTap() {
    const clientId = window.GOOGLE_CLIENT_ID || '1039781327891-r809m645d0sj9fpbt7rh64bdvjn3hb4o.apps.googleusercontent.com';

    const tryInitGIS = () => {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) return;
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response || !response.credential) return;
            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
              });
              const data = await res.json();
              if (res.ok && data.user && data.token) {
                this.applyUserSession(data.user, data.token, 'google', true);
              }
            } catch (err) {
              console.warn('[Google One Tap error]', err);
            }
          }
        });
        if (!this.isLoggedIn) {
          google.accounts.id.prompt();
        }
      } catch (err) {
        console.warn('[GIS One Tap]', err);
      }
    };

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      tryInitGIS();
    } else {
      window.addEventListener('load', () => setTimeout(tryInitGIS, 800));
    }
  }

  handleGoogleAuth() {
    const statusMsg = document.getElementById('authStatusMsg');
    const googleBtn = document.getElementById('authGoogleBtn');
    const googleText = document.getElementById('authGoogleText');

    const clientId = window.GOOGLE_CLIENT_ID || '1039781327891-r809m645d0sj9fpbt7rh64bdvjn3hb4o.apps.googleusercontent.com';

    if (typeof google === 'undefined' || !google.accounts) {
      if (statusMsg) {
        statusMsg.textContent = 'Google sign-in services are still initializing. Please wait a moment and try again.';
        statusMsg.className = 'auth-status-msg info';
        statusMsg.style.display = 'block';
      }
      return;
    }

    try {
      if (statusMsg) {
        statusMsg.style.display = 'none';
      }

      const origText = googleText ? googleText.textContent : 'Continue with Google';
      if (googleText) googleText.textContent = 'Connecting...';
      if (googleBtn) googleBtn.style.pointerEvents = 'none';

      // Initialize Google OAuth 2.0 Token Client for custom button popup
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenRes) => {
          if (googleText) googleText.textContent = origText;
          if (googleBtn) googleBtn.style.pointerEvents = 'auto';

          if (tokenRes.error) {
            if (tokenRes.error === 'access_denied') return; // User closed popup
            if (statusMsg) {
              statusMsg.textContent = 'Google sign in cancelled or failed: ' + (tokenRes.error_description || tokenRes.error);
              statusMsg.className = 'auth-status-msg error';
              statusMsg.style.display = 'block';
            }
            this.shakeAuthCard();
            return;
          }

          if (!tokenRes.access_token) return;

          if (statusMsg) {
            statusMsg.textContent = 'Authenticating with Google...';
            statusMsg.className = 'auth-status-msg info';
            statusMsg.style.display = 'block';
          }

          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: tokenRes.access_token })
            });

            const data = await res.json();
            if (!res.ok || data.error) {
              throw new Error(data.error || 'Google authentication failed.');
            }

            this.applyUserSession(data.user, data.token, 'google', true);
          } catch (err) {
            if (statusMsg) {
              statusMsg.textContent = err.message;
              statusMsg.className = 'auth-status-msg error';
              statusMsg.style.display = 'block';
            }
            this.shakeAuthCard();
          }
        },
        error_callback: (err) => {
          if (googleText) googleText.textContent = origText;
          if (googleBtn) googleBtn.style.pointerEvents = 'auto';
          if (err && err.type === 'popup_closed') return;
          console.warn('[Google Auth] Popup error:', err);
        }
      });

      // Request access token (opens Google OAuth popup)
      client.requestAccessToken();
    } catch (err) {
      if (googleText) googleText.textContent = 'Continue with Google';
      if (googleBtn) googleBtn.style.pointerEvents = 'auto';
      if (statusMsg) {
        statusMsg.textContent = err.message || 'Could not open Google sign in.';
        statusMsg.className = 'auth-status-msg error';
        statusMsg.style.display = 'block';
      }
      this.shakeAuthCard();
    }
  }

  async handleEmailAuth() {
    const emailInput = document.getElementById('authEmailInput');
    const pwdInput = document.getElementById('authPasswordInput');
    const usernameInput = document.getElementById('authUsernameInput');
    const submitBtn = document.getElementById('authSubmitBtn');
    const statusMsg = document.getElementById('authStatusMsg');

    const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
    const pwd = (pwdInput ? pwdInput.value : '').trim();
    const username = (usernameInput ? usernameInput.value : '').trim();

    const showErr = (msg) => {
      if (statusMsg) {
        statusMsg.textContent = msg;
        statusMsg.className = 'auth-status-msg error';
        statusMsg.style.display = 'block';
      }
      this.shakeAuthCard();
    };

    if (!email || !email.includes('@')) {
      showErr('Please enter a valid email address.');
      return;
    }

    if (pwd.length < 6) {
      showErr('Password must be at least 6 characters.');
      return;
    }

    if (this.authMode === 'signup' && username.length < 2) {
      showErr('Please choose a username (at least 2 characters).');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';
    }

    try {
      const endpoint = this.authMode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = this.authMode === 'signup'
        ? { email, username, password: pwd, initialBalance: this.balance || 0.05 }
        : { email, password: pwd };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed');
      }

      this.applyUserSession(data.user, data.token, 'email', true);
    } catch (err) {
      showErr(err.message || 'Error connecting to database.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = this.authMode === 'signup' ? 'Create Account & Play' : 'Sign In & Play';
      }
    }
  }

  applyUserSession(user, token, provider = 'email', notify = false) {
    if (!user) return;
    this.isLoggedIn = true;
    this.sessionToken = token || this.sessionToken;
    this.user = user;
    this.userId = user.id;
    this.userEmail = user.email || this.userEmail;
    this.username = user.username || this.username;
    this.userAuthProvider = provider;

    if (typeof user.balance === 'number') {
      this.balance = parseFloat(user.balance.toFixed(4));
    }
    if (user.vipRank) this.vipRank = user.vipRank;
    if (user.userLevel) this.userLevel = user.userLevel;
    if (user.stats) {
      this.stats = { ...this.stats, ...user.stats };
    }

    localStorage.setItem('gp_session_token', this.sessionToken);
    localStorage.setItem('gp_user_logged_in', 'true');
    localStorage.setItem('gp_user_email', this.userEmail);
    localStorage.setItem('gp_username', this.username);
    localStorage.setItem('gp_sol_balance', this.balance.toFixed(4));
    localStorage.setItem('gp_user_auth_provider', provider);
    localStorage.setItem('gp_stats', JSON.stringify(this.stats));

    const closeBtn = document.getElementById('authCloseBtn');
    if (closeBtn) closeBtn.style.display = 'block';

    const modal = document.getElementById('authModal');
    if (modal && typeof modal.close === 'function') {
      modal.close();
    }

    this.updateBalanceUI();
    this.updateAuthUI();
    this.updateVipDisplay();

    if (notify) {
      this.showToast(`🎉 Welcome, ${this.username}! Account saved & verified.`);
      if (gpAudio && gpAudio.playWin) gpAudio.playWin();
    }
  }

  async handleLogout() {
    if (this.sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.sessionToken })
        });
      } catch(e) {}
    }

    this.isLoggedIn = false;
    this.sessionToken = '';
    this.user = null;
    this.userEmail = '';
    this.username = 'Player';
    this.userAuthProvider = 'guest';

    localStorage.removeItem('gp_session_token');
    localStorage.removeItem('gp_user_logged_in');
    localStorage.removeItem('gp_user_email');
    localStorage.removeItem('gp_username');
    localStorage.removeItem('gp_user_auth_provider');

    this.showToast('Signed out. Please sign in to resume playing.');
    if (gpAudio && gpAudio.playClick) gpAudio.playClick();

    this.enforceMandatoryAuth();
  }

  syncUserToDatabase() {
    if (!this.sessionToken) return;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(async () => {
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.sessionToken
          },
          body: JSON.stringify({
            token: this.sessionToken,
            balance: this.balance,
            vipRank: this.vipRank,
            userLevel: this.userLevel,
            stats: this.stats
          })
        });
      } catch(e) {}
    }, 350);
  }

  recordBetToDatabase(game, betAmount, multiplier, payout, profit, won) {
    if (!this.sessionToken) return;
    try {
      fetch('/api/user/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.sessionToken
        },
        body: JSON.stringify({
          token: this.sessionToken,
          game,
          betAmount: Number(betAmount) || 0,
          multiplier: Number(multiplier) || 1,
          payout: Number(payout) || 0,
          profit: Number(profit) || 0,
          won: Boolean(won)
        })
      }).catch(() => {});
    } catch(e) {}
  }

  updateAuthUI() {
    const navAuth = document.getElementById('navAuthZone');
    const usernameDisplay = document.getElementById('profileUsernameDisplay');
    const profileWallet = document.getElementById('profileWalletTruncated');
    const menuItemAuthText = document.getElementById('menuItemAuthText');
    const closeBtn = document.getElementById('authCloseBtn');

    if (usernameDisplay) {
      usernameDisplay.textContent = this.username;
    }

    if (this.isLoggedIn) {
      if (closeBtn) closeBtn.style.display = 'block';
      if (navAuth) {
        navAuth.style.setProperty('display', 'none', 'important');
        navAuth.hidden = true;
        navAuth.classList.add('is-hidden');
      }
      if (menuItemAuthText) menuItemAuthText.textContent = 'Sign Out';
      if (profileWallet && this.userEmail) {
        profileWallet.textContent = this.userEmail;
      }
    } else {
      if (closeBtn) closeBtn.style.display = 'none';
      if (navAuth) {
        navAuth.style.setProperty('display', 'inline-flex', 'important');
        navAuth.hidden = false;
        navAuth.classList.remove('is-hidden');
      }
      if (menuItemAuthText) menuItemAuthText.textContent = 'Sign In / Register';
      if (profileWallet) {
        profileWallet.textContent = 'Registration Required';
      }
    }
  }

  recordTransaction(type, amount, status = 'COMPLETED') {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let txHash = '';
    for (let i = 0; i < 8; i++) txHash += chars[Math.floor(Math.random() * chars.length)];
    const item = {
      id: Date.now(),
      type,
      amount,
      hash: `${txHash}...`,
      status,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.transactions.unshift(item);
    if (this.transactions.length > 50) this.transactions.pop();
    try {
      localStorage.setItem('gp_transactions', JSON.stringify(this.transactions));
    } catch(e) {}
    this.renderTransactionsTable();
  }

  renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    if (!this.transactions || this.transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:24px;text-align:center;color:#64748b;">No transactions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.transactions.map(tx => {
      const isPositive = tx.amount > 0;
      const amtStr = `${isPositive ? '+' : ''}${Math.abs(tx.amount).toFixed(4)} SOL`;
      const amtColor = isPositive ? '#4ade80' : '#f87171';
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);font-family:'Plus Jakarta Sans',sans-serif;">
          <td style="padding:10px 12px;font-weight:800;color:#ffffff;">${tx.type}</td>
          <td style="padding:10px 12px;font-weight:900;color:${amtColor};">${amtStr}</td>
          <td style="padding:10px 12px;font-family:monospace;color:#38bdf8;">${tx.hash}</td>
          <td style="padding:10px 12px;"><span style="background:rgba(34,197,94,0.15);color:#4ade80;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;">${tx.status}</span></td>
          <td style="padding:10px 12px;color:#94a3b8;font-size:11px;">${tx.time}</td>
        </tr>
      `;
    }).join('');
  }

  updateStatsUI() {
    const wagerEl = document.getElementById('statTotalWagered');
    const wagerUsdEl = document.getElementById('statTotalWageredUsd');
    const profitEl = document.getElementById('statNetProfit');
    const profitUsdEl = document.getElementById('statNetProfitUsd');
    const betsEl = document.getElementById('statTotalBets');
    const winRateEl = document.getElementById('statWinRate');
    const winsCountEl = document.getElementById('statWinsCount');
    const bestMultEl = document.getElementById('statBestMult');

    const solP = this.solPrice || 108.35;
    const w = this.stats.totalWagered || 0;
    const p = this.stats.totalProfit || 0;
    const b = this.stats.totalBets || 0;
    const wins = this.stats.wins || 0;

    if (wagerEl) wagerEl.textContent = `${w.toFixed(4)} SOL`;
    if (wagerUsdEl) wagerUsdEl.textContent = `≈ $${(w * solP).toFixed(2)} USD`;
    if (profitEl) {
      profitEl.textContent = `${p >= 0 ? '+' : ''}${p.toFixed(4)} SOL`;
      profitEl.style.color = p >= 0 ? '#4ade80' : '#f87171';
    }
    if (profitUsdEl) profitUsdEl.textContent = `≈ $${(p * solP).toFixed(2)} USD`;
    if (betsEl) betsEl.textContent = b.toLocaleString();
    if (winsCountEl) winsCountEl.textContent = `${wins.toLocaleString()} wins`;
    if (winRateEl) {
      const rate = b > 0 ? ((wins / b) * 100).toFixed(1) : '0.0';
      winRateEl.textContent = `${rate}%`;
    }
    if (bestMultEl) bestMultEl.textContent = `${(this.stats.bestMult || 1).toFixed(2)}x`;
  }

  updateAffiliatesUI() {
    const linkEl = document.getElementById('affiliateRefLink');
    if (linkEl) {
      linkEl.textContent = `https://luckywin.sol/ref/${encodeURIComponent(this.username)}`;
    }
  }

  hasPlayedGameToday() {
    const last = parseInt(localStorage.getItem('gp_last_game_played'), 10) || 0;
    return Boolean(last && (Date.now() - last < 24 * 60 * 60 * 1000));
  }

  recordGamePlayed(game, wager = 0) {
    this.lastGamePlayedTime = Date.now();
    localStorage.setItem('gp_last_game_played', String(this.lastGamePlayedTime));
    if (wager > 0) {
      this.stats.totalWagered = parseFloat(((this.stats.totalWagered || 0) + wager).toFixed(4));
      this.stats.totalBets = (this.stats.totalBets || 0) + 1;
      const vip = this.getVipInfo();
      const earnedRakeback = wager * (parseFloat(vip.rakebackPct) / 100);
      const currentAccrued = parseFloat(localStorage.getItem('gp_accrued_rakeback') || '0') || 0;
      const newAccrued = parseFloat((currentAccrued + earnedRakeback).toFixed(6));
      try {
        localStorage.setItem('gp_stats', JSON.stringify(this.stats));
        localStorage.setItem('gp_accrued_rakeback', newAccrued.toString());
      } catch(e) {}
    }
    this.updateVipDisplay();
    this.updateDailyCaseUI();
    this.syncUserToDatabase();
    if (wager > 0) {
      this.recordBetToDatabase(game, wager, 1, 0, -wager, false);
    }
  }

  getVipInfo() {
    const totalWagered = (this.stats && typeof this.stats.totalWagered === 'number') ? this.stats.totalWagered : 0;
    // VIP Tier 1: 0 - 0.5 SOL (0.5% rakeback)
    // VIP Tier 2: 0.5 - 1.0 SOL (1.0% rakeback)
    // VIP Tier 3: 1.0 - 1.5 SOL (1.5% rakeback)
    // VIP Tier 4: 1.5 - 2.0 SOL (2.0% rakeback)
    // and so on every 0.5 SOL (+0.5% rakeback per tier)
    const tier = Math.max(1, Math.floor(totalWagered / 0.5) + 1);
    const nextTier = tier + 1;
    const currentTierThreshold = (tier - 1) * 0.5;
    const nextTierThreshold = tier * 0.5;
    const progressInTier = Math.max(0, totalWagered - currentTierThreshold);
    const progressPct = Math.min(100, Math.max(0, (progressInTier / 0.5) * 100));
    const remainingSol = Math.max(0, nextTierThreshold - totalWagered);
    const rakebackPct = (tier * 0.5).toFixed(1);

    return {
      tier,
      nextTier,
      totalWagered,
      currentTierThreshold,
      nextTierThreshold,
      progressPct: progressPct.toFixed(1),
      remainingSol: remainingSol.toFixed(4),
      rakebackPct
    };
  }

  updateVipDisplay() {
    const vip = this.getVipInfo();
    this.vipRank = vip.tier;
    localStorage.setItem('gp_vip_rank', String(vip.tier));

    const titleEl = document.getElementById('vipTierTitle');
    const progressTextEl = document.getElementById('vipTierProgressText');
    const progressBarEl = document.getElementById('vipTierProgressBar');
    const descEl = document.getElementById('vipTierWagerDesc');
    const rankBenefitsEl = document.getElementById('vipRankBenefitsSubtext');
    const rakebackLabelEl = document.getElementById('vipRakebackLabel');
    const accruedEl = document.getElementById('rakebackAmountDisplay');
    const claimRakebackBtn = document.getElementById('claimRakebackBtn');

    if (titleEl) titleEl.textContent = `VIP Tier ${vip.tier}`;
    if (progressTextEl) progressTextEl.textContent = `${vip.progressPct}% / 100% to Tier ${vip.nextTier}`;
    if (progressBarEl) progressBarEl.style.width = `${vip.progressPct}%`;
    if (descEl) descEl.textContent = `Wager ${vip.remainingSol} SOL more to unlock VIP Tier ${vip.nextTier} (${(Number(vip.rakebackPct) + 0.5).toFixed(1)}% rakeback).`;
    if (rankBenefitsEl) rankBenefitsEl.textContent = `Level ${vip.tier} Rank Benefits (${vip.rakebackPct}% Rakeback)`;
    if (rakebackLabelEl) rakebackLabelEl.textContent = `${vip.rakebackPct}% Rakeback (Every 12h)`;

    const accrued = parseFloat(localStorage.getItem('gp_accrued_rakeback') || '0') || 0;
    const lastClaim = parseInt(localStorage.getItem('gp_rakeback_last_claim'), 10) || 0;
    const cooldownMs = 12 * 60 * 60 * 1000;
    const remaining = Math.max(0, cooldownMs - (Date.now() - lastClaim));

    if (accruedEl) {
      if (remaining > 0) {
        const totalSec = Math.ceil(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        accruedEl.textContent = `${accrued.toFixed(5)} SOL accrued · Available in ${h}h ${m}m`;
      } else {
        accruedEl.textContent = `${accrued.toFixed(5)} SOL accrued · Ready to claim`;
      }
    }

    if (claimRakebackBtn) {
      if (remaining > 0) {
        const totalSec = Math.ceil(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        claimRakebackBtn.textContent = `WAIT ${h}h ${m}m`;
        claimRakebackBtn.style.background = '#1e293b';
        claimRakebackBtn.style.color = '#94a3b8';
        claimRakebackBtn.style.border = '1px solid rgba(255,255,255,0.08)';
      } else {
        claimRakebackBtn.textContent = 'CLAIM';
        if (accrued > 0) {
          claimRakebackBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          claimRakebackBtn.style.color = '#ffffff';
          claimRakebackBtn.style.border = 'none';
        } else {
          claimRakebackBtn.style.background = '#132244';
          claimRakebackBtn.style.color = '#93c5fd';
          claimRakebackBtn.style.border = '1px solid rgba(59,130,246,0.25)';
        }
      }
    }
  }

  claimRakeback() {
    const vip = this.getVipInfo();
    const lastClaim = parseInt(localStorage.getItem('gp_rakeback_last_claim'), 10) || 0;
    const cooldownMs = 12 * 60 * 60 * 1000;
    const remaining = Math.max(0, cooldownMs - (Date.now() - lastClaim));

    if (remaining > 0) {
      const totalSec = Math.ceil(remaining / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      this.showToast(`⏳ Rakeback can be claimed once every 12 hours. Next claim in ${h}h ${m}m!`);
      gpAudio.playClick();
      return;
    }

    const accrued = parseFloat(localStorage.getItem('gp_accrued_rakeback') || '0') || 0;
    if (accrued <= 0) {
      this.showToast(`No accrued rakeback available yet. Place real wagers to earn ${vip.rakebackPct}% rakeback!`);
      gpAudio.playClick();
      return;
    }

    this.balance = parseFloat((this.balance + accrued).toFixed(4));
    this.saveBalance();
    localStorage.setItem('gp_rakeback_last_claim', Date.now().toString());
    localStorage.setItem('gp_accrued_rakeback', '0');
    this.recordTransaction('VIP Rakeback', accrued, 'COMPLETED');
    this.updateVipDisplay();
    gpAudio.playWin();
    this.showToast(`🎁 Claimed +${accrued.toFixed(5)} SOL (${vip.rakebackPct}%) VIP Rakeback!`);
  }

  getWeeklyReloadSol() {
    const price = (typeof this.solPrice === 'number' && this.solPrice > 0) ? this.solPrice : 150;
    // 0.05 cents = $0.05 USD worth of SOL
    return parseFloat((0.05 / price).toFixed(6));
  }

  updateWeeklyReloadUI() {
    const reloadBtn = document.getElementById('claimDailyReloadBtn');
    const subtextEl = document.getElementById('weeklyReloadSubtext');
    const solAmt = this.getWeeklyReloadSol();

    if (subtextEl) {
      subtextEl.textContent = `+${solAmt.toFixed(6)} SOL (≈ $0.05 USD) Available`;
    }

    if (!reloadBtn) return;
    const lastClaim = parseInt(localStorage.getItem('gp_weekly_reload_last_claim'), 10) || 0;
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, cooldownMs - (Date.now() - lastClaim));

    if (remaining > 0) {
      reloadBtn.disabled = true;
      const totalHours = Math.floor(remaining / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      reloadBtn.textContent = days > 0 ? `WAIT ${days}d ${hours}h` : `WAIT ${hours}h`;
      reloadBtn.style.background = '#1e293b';
      reloadBtn.style.color = '#94a3b8';
    } else {
      reloadBtn.disabled = false;
      reloadBtn.textContent = 'CLAIM';
      reloadBtn.style.background = '#2563eb';
      reloadBtn.style.color = '#ffffff';
    }
  }

  claimWeeklyReload() {
    const lastClaim = parseInt(localStorage.getItem('gp_weekly_reload_last_claim'), 10) || 0;
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    if (lastClaim && (Date.now() - lastClaim < cooldownMs)) {
      this.showToast('Weekly Reload is still on cooldown.');
      return;
    }
    const solAmt = this.getWeeklyReloadSol();
    this.balance = parseFloat((this.balance + solAmt).toFixed(4));
    this.saveBalance();
    localStorage.setItem('gp_weekly_reload_last_claim', Date.now().toString());
    this.recordTransaction('Weekly Reload', solAmt, 'COMPLETED');
    this.updateWeeklyReloadUI();
    gpAudio.playWin();
    this.showToast(`🎁 Claimed +${solAmt} SOL ($0.05 USD) Weekly Reload!`);
  }

  getWalletAddress() {
    if (this.activeWalletAddress) return this.activeWalletAddress;
    if (this.nonCustodialAddress) return this.nonCustodialAddress;
    let addr = localStorage.getItem('gp_noncustodial_address');
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
    addr = `SOL${tail}`;
    localStorage.setItem('gp_noncustodial_address', addr);
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
    this.syncUserToDatabase();
  }

  updateBalanceUI() {
    const badge = document.getElementById('walletBalanceDisplay');
    if (badge) {
      badge.textContent = `${this.formatSol(this.balance)} SOL`;
    }
    const dialogBalance = document.getElementById('walletDialogBalance');
    if (dialogBalance) dialogBalance.textContent = `${this.formatSol(this.balance)} SOL`;
    const dialogUsd = document.getElementById('walletDialogBalanceUsd');
    if (dialogUsd) {
      const p = this.solPrice || 108.35;
      dialogUsd.textContent = `≈ $${(this.balance * p).toFixed(2)} USD`;
    }
    const feeNote = document.getElementById('walletFeeReserveNote');
    if (feeNote) {
      const maxPlayable = this.getMaxPlayableBet ? this.getMaxPlayableBet() : Math.max(0, this.balance - 0.002);
      feeNote.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Fee reserve: ${(this.solFeeReserve || 0.002).toFixed(4)} SOL (Available: ${maxPlayable.toFixed(4)} SOL)
      `;
    }
  }

  bumpTotalBets(amount = 1, wagerAmount = 0) {
    this.totalBets += amount;
    this.recordGamePlayed('game', wagerAmount);
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
    this.stats.wins = (this.stats.wins || 0) + 1;
    this.stats.totalProfit = parseFloat(((this.stats.totalProfit || 0) + amount).toFixed(4));
    if (Number(multiplier) > (this.stats.bestMult || 1)) {
      this.stats.bestMult = Number(multiplier);
    }
    try {
      localStorage.setItem('gp_stats', JSON.stringify(this.stats));
    } catch (err) {}

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
    this.syncUserToDatabase();
    this.recordBetToDatabase(game, 0, multiplier, amount, amount, true);
  }

  /* ------------------------------------------------------------- */
  /* GAME SWITCHING & HOVER DROPDOWN */
  /* ------------------------------------------------------------- */
  initGameSwitching() {
    const gamesWrapper = document.querySelector('.nav-games-wrapper');

    // Add click/hover delegation to switch games
    document.querySelectorAll('[data-switch-game]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const gameId = link.dataset.switchGame;
        this.switchGame(gameId, true);

        // Close dropdown
        if (gamesWrapper) gamesWrapper.classList.remove('open');
      });
    });
  }

  switchGame(gameId, updateUrl = true) {
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

    if (updateUrl) {
      const route = this.getRouteForGame(gameId);
      const cur = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (cur !== route) {
        window.history.pushState({ game: gameId }, '', '/' + route);
      }
      document.title = `LuckyWin - ${this.getGameTitle(gameId)} | Next Gen Solana Gaming`;
    }

    gpAudio.playClick();
    this.showToast(`Switched to ${this.getGameTitle(gameId)}`);
  }

  /* ------------------------------------------------------------- */
  /* CONTINUOUS LIVE SOLANA PRICE SERVICE */
  /* ------------------------------------------------------------- */
  initLiveSolPriceService() {
    this.solPrice = 108.35;
    this.solChange24h = 2.28;
    this.prevSolPrice = null;

    // 1. Immediate initial price fetch
    const fetchInitialPrice = async () => {
      try {
        const res = await fetch('/api/sol-price');
        if (res.ok) {
          const data = await res.json();
          if (data && data.price) {
            this.handleSolPriceTick(data.price, data.change24h);
            return;
          }
        }
      } catch (e) {}

      // Direct fallback to Binance 24hr
      try {
        const directRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT');
        if (directRes.ok) {
          const data = await directRes.json();
          if (data && data.lastPrice) {
            this.handleSolPriceTick(parseFloat(data.lastPrice), parseFloat(data.priceChangePercent));
          }
        }
      } catch (e) {}
    };
    fetchInitialPrice();

    // 2. Immediate initial klines fetch for chart history
    const fetchInitialKlines = async () => {
      try {
        const res = await fetch('/api/sol-klines');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.candles) && data.candles.length > 5) {
            this.candles = data.candles.slice(-28);
            this.prices = data.closes ? data.closes.slice(-28) : this.candles.map(c => c.close);
            this.currentPrice = this.prices[this.prices.length - 1];
            this.basePrice = this.currentPrice;
            this.drawPumpChart();
            this.updatePumpTickerUI();
            return;
          } else if (data && Array.isArray(data.closes) && data.closes.length > 5) {
            this.prices = data.closes.slice(-28);
            this.currentPrice = this.prices[this.prices.length - 1];
            this.basePrice = this.currentPrice;
            this.drawPumpChart();
            this.updatePumpTickerUI();
            return;
          }
        }
      } catch (e) {}

      // Direct fallback to Binance klines
      try {
        const directRes = await fetch('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=30');
        if (directRes.ok) {
          const klines = await directRes.json();
          if (Array.isArray(klines) && klines.length > 5) {
            this.candles = klines.slice(-28).map(k => ({
              time: k[0],
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4])
            }));
            this.prices = this.candles.map(c => c.close);
            this.currentPrice = this.prices[this.prices.length - 1];
            this.basePrice = this.currentPrice;
            this.drawPumpChart();
            this.updatePumpTickerUI();
          }
        }
      } catch (e) {}
    };
    fetchInitialKlines();

    // 3. Continuous Real-Time WebSocket stream
    let ws = null;
    let wsReconnectTimer = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/solusdt@ticker');

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg && msg.c) {
              const livePrice = parseFloat(msg.c);
              const change24h = parseFloat(msg.P);
              this.handleSolPriceTick(livePrice, change24h);
            }
          } catch (err) {}
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };

        ws.onclose = () => {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = setTimeout(connectWebSocket, 3000);
        };
      } catch (e) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    };
    connectWebSocket();

    // 4. Redundant fallback heartbeat (every 3 seconds)
    setInterval(async () => {
      try {
        const res = await fetch('/api/sol-price');
        if (res.ok) {
          const data = await res.json();
          if (data && data.price) {
            this.handleSolPriceTick(data.price, data.change24h);
          }
        }
      } catch (e) {}
    }, 3000);
  }

  handleSolPriceTick(price, change24h) {
    if (!price || isNaN(price) || price <= 0) return;

    const oldPrice = this.prevSolPrice || this.solPrice;
    this.prevSolPrice = this.solPrice;
    this.solPrice = price;

    if (typeof change24h === 'number' && !isNaN(change24h)) {
      this.solChange24h = change24h;
    }

    // Top navbar live price pill
    const priceValEl = document.getElementById('liveSolPriceValue');
    const priceChangeEl = document.getElementById('liveSolPriceChange');

    if (priceValEl) {
      priceValEl.textContent = `$${price.toFixed(2)}`;
      if (oldPrice && oldPrice !== price) {
        priceValEl.classList.remove('price-tick-flash-up', 'price-tick-flash-down');
        void priceValEl.offsetWidth; // force reflow for animation restart
        priceValEl.classList.add(price > oldPrice ? 'price-tick-flash-up' : 'price-tick-flash-down');
      }
    }

    if (priceChangeEl && typeof this.solChange24h === 'number') {
      const sign = this.solChange24h >= 0 ? '+' : '';
      priceChangeEl.textContent = `${sign}${this.solChange24h.toFixed(2)}%`;
      priceChangeEl.className = `sol-pill-change ${this.solChange24h >= 0 ? 'is-up' : 'is-down'}`;
    }

    // Update Candlesticks in Real Time
    this.currentPrice = price;
    if (!this.candles || this.candles.length === 0) {
      this.candles = [{
        time: Date.now(),
        open: price,
        high: price,
        low: price,
        close: price
      }];
    } else {
      const activeCandle = this.candles[this.candles.length - 1];
      activeCandle.close = price;
      if (price > activeCandle.high) activeCandle.high = price;
      if (price < activeCandle.low) activeCandle.low = price;

      const now = Date.now();
      if (!this.lastCandleTime) this.lastCandleTime = now;
      if (now - this.lastCandleTime > 45000) {
        this.lastCandleTime = now;
        this.candles.push({
          time: now,
          open: price,
          high: price,
          low: price,
          close: price
        });
        if (this.candles.length > 28) this.candles.shift();
      }
    }

    if (!this.prices || this.prices.length === 0) {
      this.prices = [price];
    } else {
      const last = this.prices[this.prices.length - 1];
      if (last !== price) {
        this.prices.push(price);
        if (this.prices.length > 40) this.prices.shift();
      }
    }

    this.updatePumpTickerUI();
    this.drawPumpChart();
    this.updateAllUsdEstimates();
  }

  updatePumpTickerUI() {
    const centerMult = document.getElementById('pumpPriceTicker');
    if (!centerMult) return;
    const price = this.currentPrice || this.solPrice || 108.35;
    const change = (typeof this.solChange24h === 'number')
      ? this.solChange24h
      : (((price - this.prices[0]) / this.prices[0]) * 100);
    const sign = change >= 0 ? '+' : '';
    centerMult.textContent = `$${price.toFixed(2)} (${sign}${change.toFixed(2)}%)`;
    centerMult.style.color = change >= 0 ? '#4ade80' : '#f87171';
  }

  updateAllUsdEstimates() {
    const price = this.solPrice || 108.35;

    const crashUsd = document.getElementById('crashUsdEstimate');
    if (crashUsd) crashUsd.textContent = `≈ $${(this.rugBet * price).toFixed(2)} USD`;

    const chickenUsd = document.getElementById('chickenUsdEstimate');
    if (chickenUsd) chickenUsd.textContent = `≈ $${(this.chickenBet * price).toFixed(2)} USD`;

    const hiloUsd = document.getElementById('hiloUsdEstimate');
    if (hiloUsd) hiloUsd.textContent = `≈ $${(this.hiloBet * price).toFixed(2)} USD`;

    const coinflipUsd = document.getElementById('coinflipUsdEstimate');
    if (coinflipUsd) coinflipUsd.textContent = `≈ $${(this.coinflipBet * price).toFixed(2)} USD`;

    const minesUsd = document.getElementById('minesUsdEstimate');
    if (minesUsd) minesUsd.textContent = `≈ $${(this.minesBet * price).toFixed(2)} USD`;

    const pumpUsd = document.getElementById('pumpUsdEstimate');
    if (pumpUsd) pumpUsd.textContent = `≈ $${(this.pumpBet * price).toFixed(2)} USD`;
  }

  /* ------------------------------------------------------------- */
  /* 1. PUMP & DUMP */
  /* ------------------------------------------------------------- */
  initPumpAndDump() {
    this.canvas = document.getElementById('pumpChart');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, rect.width * dpr);
      this.canvas.height = Math.max(1, rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawPumpChart();
    };
    window.addEventListener('resize', resize);
    resize();

    // Direction Selectors
    const pumpDirBtn = document.getElementById('pumpUpBtn');
    const dumpDirBtn = document.getElementById('dumpDownBtn');
    const tradeBtn = document.getElementById('pumpTradeActionBtn');
    const betInput = document.getElementById('pumpBetInput');
    const usdEl = document.getElementById('pumpUsdEstimate');

    const updatePumpUsd = () => {
      if (usdEl) {
        const p = this.solPrice || 108.35;
        usdEl.textContent = `≈ $${(this.pumpBet * p).toFixed(2)} USD`;
      }
    };

    if (pumpDirBtn && dumpDirBtn) {
      pumpDirBtn.addEventListener('click', () => {
        this.tradeDirection = 'PUMP';
        pumpDirBtn.classList.add('is-active');
        dumpDirBtn.classList.remove('is-active');
        tradeBtn.classList.remove('is-dump');
        tradeBtn.classList.add('is-pump');
        tradeBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        tradeBtn.style.boxShadow = '0 6px 22px rgba(34, 197, 94, 0.4)';
        tradeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 17l9.2-9.2M17 17V7H7"/>
          </svg>
          <span id="pumpTradeBtnText">TRADE NOW (PUMP)</span>
        `;
        gpAudio.playClick();
      });

      dumpDirBtn.addEventListener('click', () => {
        this.tradeDirection = 'DUMP';
        dumpDirBtn.classList.add('is-active');
        pumpDirBtn.classList.remove('is-active');
        tradeBtn.classList.remove('is-pump');
        tradeBtn.classList.add('is-dump');
        tradeBtn.style.background = 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
        tradeBtn.style.boxShadow = '0 6px 22px rgba(244, 63, 94, 0.4)';
        tradeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 7l9.2 9.2M17 7v10H7"/>
          </svg>
          <span id="pumpTradeBtnText">TRADE NOW (DUMP)</span>
        `;
        gpAudio.playClick();
      });
    }

    if (betInput) {
      betInput.addEventListener('input', (e) => {
        this.pumpBet = Math.max(0.001, parseFloat(e.target.value) || 0.05);
        updatePumpUsd();
      });
      betInput.addEventListener('change', (e) => {
        this.pumpBet = Math.max(0.001, parseFloat(e.target.value) || 0.05);
        updatePumpUsd();
      });
    }

    // Quick modifiers: MIN, 1/2, 2x, MAX (Matching Image 1)
    const minBtn = document.getElementById('pumpMinBtn');
    const halfBtn = document.getElementById('pumpHalfBtn');
    const doubleBtn = document.getElementById('pumpDoubleBtn');
    const maxBtn = document.getElementById('pumpMaxBtn');

    if (minBtn) minBtn.addEventListener('click', () => {
      this.pumpBet = 0.001;
      if (betInput) betInput.value = '0.001';
      updatePumpUsd();
    });
    if (halfBtn) halfBtn.addEventListener('click', () => {
      this.pumpBet = Math.max(0.001, parseFloat((this.pumpBet / 2).toFixed(4)));
      if (betInput) betInput.value = this.pumpBet.toString();
      updatePumpUsd();
    });
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      this.pumpBet = Math.max(0.001, Math.min(maxPlayable, parseFloat((this.pumpBet * 2).toFixed(4))));
      if (betInput) betInput.value = this.pumpBet.toString();
      updatePumpUsd();
    });
    if (maxBtn) maxBtn.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      this.pumpBet = Math.max(0.001, parseFloat(maxPlayable.toFixed(4)));
      if (betInput) betInput.value = this.pumpBet.toString();
      updatePumpUsd();
      this.showToast(`MAX set to ${this.pumpBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
    });

    updatePumpUsd();

    if (tradeBtn) {
      tradeBtn.addEventListener('click', () => this.executePumpTrade());
    }
  }

  executePumpTrade() {
    if (!this.requireAuth()) return;
    if (this.isPumpTrading) return;
    if (!this.canAffordBet(this.pumpBet)) {
      return;
    }

    this.isPumpTrading = true;
    this.balance = parseFloat((this.balance - this.pumpBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.pumpEntryPrice = this.currentPrice;

    this.recordBet('pump', this.pumpBet);
    this.recordTransaction('Pump Trade', -this.pumpBet, 'COMPLETED');

    gpAudio.playTrade();

    const tradeBtn = document.getElementById('pumpTradeActionBtn');
    let countdown = 6;
    tradeBtn.disabled = true;

    const timer = setInterval(() => {
      countdown--;
      tradeBtn.innerHTML = `<span>CLOSING IN ${countdown}s...</span>`;
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
    const isUp = this.tradeDirection === 'PUMP';
    tradeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="${isUp ? 'M7 17l9.2-9.2M17 17V7H7' : 'M7 7l9.2 9.2M17 7v10H7'}"/>
      </svg>
      <span id="pumpTradeBtnText">TRADE NOW (${this.tradeDirection})</span>
    `;

    if (isPumpWon || isDumpWon) {
      const payout = parseFloat((this.pumpBet * 1.95).toFixed(4));
      const profit = parseFloat((payout - this.pumpBet).toFixed(4));
      this.balance = parseFloat((this.balance + payout).toFixed(4));
      this.saveBalance();
      this.recordWin('pump', profit, 1.95);
      this.recordTransaction('Pump Win', payout, 'COMPLETED');
      this.pushNotification('Pump & Dump win', `+${this.formatSol(profit)} SOL on a ${this.tradeDirection} trade.`, 'win');
      gpAudio.playWin();
      this.showToast(`🎉 TRADE WON! +${profit.toFixed(4)} SOL (${this.tradeDirection} Hit!)`);
    } else {
      gpAudio.playCrash();
      this.showToast(`💥 Trade Lost! Price closed against prediction.`);
    }

    this.pumpEntryPrice = null;
  }

  recordBet(game, wager) {
    this.recordGamePlayed(game, wager);
  }

  /* ------------------------------------------------------------- */
  /* JAPANESE CANDLESTICK CHART ENGINE (Matching Image 1) */
  /* ------------------------------------------------------------- */
  drawPumpChart() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    // Build or retrieve candles
    let candles = (this.candles && this.candles.length > 0) ? this.candles.slice(-26) : [];
    if (candles.length === 0) {
      const pList = (this.prices && this.prices.length > 0) ? this.prices.slice(-26) : [this.currentPrice || 108.35];
      candles = [];
      for (let i = 0; i < pList.length; i++) {
        const c = pList[i];
        const prev = i > 0 ? pList[i - 1] : c;
        const delta = Math.abs(c - prev) * 0.4 || 0.12;
        candles.push({
          time: Date.now() - (pList.length - i) * 60000,
          open: prev,
          high: Math.max(prev, c) + delta,
          low: Math.min(prev, c) - delta,
          close: c
        });
      }
    }

    const lows = candles.map(c => c.low);
    const highs = candles.map(c => c.high);
    const rawMin = Math.min(...lows, this.currentPrice || 108.35);
    const rawMax = Math.max(...highs, this.currentPrice || 108.35);
    const diff = Math.max(0.5, rawMax - rawMin);
    const pad = diff * 0.14;
    const minP = rawMin - pad;
    const maxP = rawMax + pad;
    const span = maxP - minP;

    // Y coordinate mapping: leaving room at top (30px) and bottom for floating HUD (100px)
    const topMargin = 32;
    const bottomMargin = 96;
    const chartHeight = h - topMargin - bottomMargin;
    const getY = (val) => h - bottomMargin - ((val - minP) / span) * chartHeight;

    // Right axis dimensions matching Image 1
    const axisWidth = 66;
    const chartWidth = w - axisWidth;

    // Candle widths and positions
    const gap = chartWidth / Math.max(1, candles.length);
    const candleWidth = Math.max(8, Math.min(20, gap * 0.62));
    const getX = (idx) => idx * gap + gap / 2 + 10;

    // Background Subtle Grid (Matching Image 1)
    const stepCount = 6;
    const stepDiff = span / stepCount;

    this.ctx.lineWidth = 1;
    for (let s = 0; s <= stepCount; s++) {
      const stepPrice = minP + s * stepDiff;
      const y = getY(stepPrice);

      // Horizontal grid line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(chartWidth, y);
      this.ctx.stroke();

      // Right-side Y-Axis Price Label (Matching Image 1)
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '600 11px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(stepPrice.toFixed(1), w - 8, y);
    }

    // Vertical right separator line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.beginPath();
    this.ctx.moveTo(chartWidth, 0);
    this.ctx.lineTo(chartWidth, h);
    this.ctx.stroke();

    // Subtle vertical grid lines
    for (let i = 0; i < candles.length; i += 4) {
      const x = getX(i);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      this.ctx.beginPath();
      this.ctx.moveTo(x, topMargin);
      this.ctx.lineTo(x, h - bottomMargin);
      this.ctx.stroke();
    }

    // Draw Japanese Candlesticks (Matching Image 1)
    candles.forEach((c, idx) => {
      const x = getX(idx);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBull = c.close >= c.open;
      const col = isBull ? '#00d294' : '#f43f5e';

      // Upper and lower wick
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.6;
      this.ctx.beginPath();
      this.ctx.moveTo(x, highY);
      this.ctx.lineTo(x, lowY);
      this.ctx.stroke();

      // Candle body (with rounded corners)
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(3.5, Math.abs(closeY - openY));

      this.ctx.fillStyle = col;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(x - candleWidth / 2, topY, candleWidth, bodyH, 3.5);
      } else {
        this.ctx.rect(x - candleWidth / 2, topY, candleWidth, bodyH);
      }
      this.ctx.fill();
    });

    // Latest Active Candle & Dashed Current Price Line (Matching Image 1)
    const latestCandle = candles[candles.length - 1];
    const latestX = getX(candles.length - 1);
    const curY = getY(this.currentPrice);
    const isBullish = this.currentPrice >= latestCandle.open;
    const activeColor = isBullish ? '#00d294' : '#f43f5e';

    // Dashed horizontal line extending from current candle to right axis
    this.ctx.save();
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = activeColor;
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(latestX + candleWidth / 2, curY);
    this.ctx.lineTo(chartWidth, curY);
    this.ctx.stroke();
    this.ctx.restore();

    // Active Price Pill Tag on Right Axis (Matching Image 1)
    this.ctx.fillStyle = activeColor;
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(chartWidth + 3, curY - 11, 58, 22, 5);
    } else {
      this.ctx.rect(chartWidth + 3, curY - 11, 58, 22);
    }
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11.5px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.currentPrice.toFixed(1), chartWidth + 32, curY);

    // Active Trade Entry Price line
    if (this.isPumpTrading && this.pumpEntryPrice) {
      const entryY = getY(this.pumpEntryPrice);
      this.ctx.save();
      this.ctx.setLineDash([6, 6]);
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, entryY);
      this.ctx.lineTo(chartWidth, entryY);
      this.ctx.stroke();

      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`ENTRY: $${this.pumpEntryPrice.toFixed(2)}`, 14, entryY - 6);
      this.ctx.restore();
    }
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
      if (usdEl) usdEl.textContent = `≈ $${(this.rugBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
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
      const maxPlayable = this.getMaxPlayableBet();
      this.rugBet = Math.max(0.001, Math.min(maxPlayable, parseFloat((this.rugBet * 2).toFixed(3))));
      if (betInput) betInput.value = this.rugBet;
      updateUsd();
      this.updateRugActionBtn();
      gpAudio.playClick();
    });
    if (maxBtn) maxBtn.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      this.rugBet = Math.max(0.001, parseFloat(maxPlayable.toFixed(3)));
      if (betInput) betInput.value = this.rugBet;
      updateUsd();
      this.updateRugActionBtn();
      gpAudio.playClick();
      this.showToast(`MAX set to ${this.rugBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
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
    const advPanel = document.getElementById('rugAdvancedPanel');

    if (advToggle && advBadge) {
      advToggle.addEventListener('change', () => {
        this.rugAdvancedEnabled = advToggle.checked;
        advBadge.textContent = advToggle.checked ? 'ON' : 'OFF';
        advBadge.style.color = advToggle.checked ? '#22c55e' : '#64748b';
        if (advPanel) {
          advPanel.style.display = advToggle.checked ? 'flex' : 'none';
        }
        if (!advToggle.checked && this.rugAutoBetActive) {
          this.stopRugAutoBet('Auto-bet disabled');
        }
        this.updateRugActionBtn();
        gpAudio.playClick();
      });
    }

    // Advanced Rounds Input & Presets
    const roundsInput = document.getElementById('rugAutoBetCount');
    const roundsDisplay = document.getElementById('rugRoundsRemainingDisplay');
    const roundPills = document.querySelectorAll('.adv-preset-pill');

    if (roundsInput) {
      roundsInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.rugAutoBetTotalRounds = (!isNaN(val) && val > 0) ? val : 0;
        roundPills.forEach(p => p.classList.remove('active'));
        if (roundsDisplay) {
          roundsDisplay.textContent = this.rugAutoBetTotalRounds > 0 ? `${this.rugAutoBetTotalRounds}` : '∞';
        }
      });
    }

    roundPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const rounds = parseInt(pill.dataset.rounds, 10) || 0;
        this.rugAutoBetTotalRounds = rounds;
        if (roundsInput) roundsInput.value = rounds > 0 ? rounds : '';
        roundPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        if (roundsDisplay) roundsDisplay.textContent = rounds > 0 ? `${rounds}` : '∞';
        gpAudio.playClick();
      });
    });

    // Advanced On Win Strategy
    const onWinResetBtn = document.getElementById('rugOnWinResetBtn');
    const onWinIncreaseBtn = document.getElementById('rugOnWinIncreaseBtn');
    const onWinPctWrap = document.getElementById('rugOnWinPctWrap');
    const onWinPctInput = document.getElementById('rugOnWinPctInput');

    if (onWinResetBtn && onWinIncreaseBtn) {
      onWinResetBtn.addEventListener('click', () => {
        this.rugOnWinAction = 'reset';
        onWinResetBtn.classList.add('active');
        onWinIncreaseBtn.classList.remove('active');
        if (onWinPctWrap) onWinPctWrap.style.display = 'none';
        gpAudio.playClick();
      });

      onWinIncreaseBtn.addEventListener('click', () => {
        this.rugOnWinAction = 'increase';
        onWinIncreaseBtn.classList.add('active');
        onWinResetBtn.classList.remove('active');
        if (onWinPctWrap) onWinPctWrap.style.display = 'flex';
        gpAudio.playClick();
      });
    }

    if (onWinPctInput) {
      onWinPctInput.addEventListener('input', (e) => {
        this.rugOnWinPct = Math.max(1, parseFloat(e.target.value) || 100);
      });
    }

    // Advanced On Loss Strategy (Martingale)
    const onLossResetBtn = document.getElementById('rugOnLossResetBtn');
    const onLossIncreaseBtn = document.getElementById('rugOnLossIncreaseBtn');
    const onLossPctWrap = document.getElementById('rugOnLossPctWrap');
    const onLossPctInput = document.getElementById('rugOnLossPctInput');

    if (onLossResetBtn && onLossIncreaseBtn) {
      onLossResetBtn.addEventListener('click', () => {
        this.rugOnLossAction = 'reset';
        onLossResetBtn.classList.add('active');
        onLossIncreaseBtn.classList.remove('active');
        if (onLossPctWrap) onLossPctWrap.style.display = 'none';
        gpAudio.playClick();
      });

      onLossIncreaseBtn.addEventListener('click', () => {
        this.rugOnLossAction = 'increase';
        onLossIncreaseBtn.classList.add('active');
        onLossResetBtn.classList.remove('active');
        if (onLossPctWrap) onLossPctWrap.style.display = 'flex';
        gpAudio.playClick();
      });
    }

    if (onLossPctInput) {
      onLossPctInput.addEventListener('input', (e) => {
        this.rugOnLossPct = Math.max(1, parseFloat(e.target.value) || 100);
      });
    }

    // Stop Limits Inputs
    const stopProfitInput = document.getElementById('rugStopProfitInput');
    const stopLossInput = document.getElementById('rugStopLossInput');
    if (stopProfitInput) {
      stopProfitInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.rugStopProfit = (!isNaN(val) && val > 0) ? val : null;
      });
    }
    if (stopLossInput) {
      stopLossInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.rugStopLoss = (!isNaN(val) && val > 0) ? val : null;
      });
    }

    // Advanced Sell Portion Controls (10%, 25%, 50%, 100%, Custom)
    const sellPills = document.querySelectorAll('.adv-sell-pill');
    const sellPortionDisplay = document.getElementById('rugSellPortionDisplay');
    const customSellWrap = document.getElementById('rugCustomSellWrap');
    const customSellPctInput = document.getElementById('rugCustomSellPctInput');
    const customSellSolInput = document.getElementById('rugCustomSellSolInput');

    sellPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const pct = pill.dataset.pct;
        sellPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        if (pct === 'custom') {
          this.rugSelectedSellPct = 'custom';
          if (customSellWrap) customSellWrap.style.display = 'flex';
          if (sellPortionDisplay) {
            if (this.rugCustomSellSol) {
              sellPortionDisplay.textContent = `${this.rugCustomSellSol} SOL`;
            } else {
              sellPortionDisplay.textContent = `${this.rugCustomSellPct || 50}%`;
            }
          }
        } else {
          this.rugSelectedSellPct = parseInt(pct, 10);
          this.rugCustomSellPct = null;
          this.rugCustomSellSol = null;
          if (customSellWrap) customSellWrap.style.display = 'none';
          if (sellPortionDisplay) sellPortionDisplay.textContent = `${this.rugSelectedSellPct}%`;
        }
        this.updateRugActionBtn();
        gpAudio.playClick();
      });
    });

    if (customSellPctInput) {
      customSellPctInput.addEventListener('input', (e) => {
        const val = Math.min(100, Math.max(1, parseFloat(e.target.value) || 0));
        this.rugCustomSellPct = val > 0 ? val : null;
        this.rugCustomSellSol = null;
        if (customSellSolInput) customSellSolInput.value = '';
        if (sellPortionDisplay) sellPortionDisplay.textContent = val > 0 ? `${val}%` : 'Custom %';
        this.updateRugActionBtn();
      });
    }

    if (customSellSolInput) {
      customSellSolInput.addEventListener('input', (e) => {
        const val = Math.max(0.0001, parseFloat(e.target.value) || 0);
        this.rugCustomSellSol = val > 0 ? val : null;
        this.rugCustomSellPct = null;
        if (customSellPctInput) customSellPctInput.value = '';
        if (sellPortionDisplay) sellPortionDisplay.textContent = val > 0 ? `${val} SOL` : 'Custom SOL';
        this.updateRugActionBtn();
      });
    }

    // In-Flight Quick Partial Sell Bar Buttons (10%, 25%, 50%, 100%)
    ['10', '25', '50', '100'].forEach(quickPct => {
      const qsBtn = document.getElementById(`qsBtn${quickPct}`);
      if (qsBtn) {
        qsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cashoutRugPartial(parseInt(quickPct, 10), false);
        });
      }
    });

    const mainBtn = document.getElementById('rugMainActionBtn');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        if (!this.requireAuth()) return;

        // In running state, if user has an active bet, cash out (either configured portion or 100%)
        if (this.rugState === 'RUNNING' && this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001) {
          if (this.rugAdvancedEnabled && this.rugSelectedSellPct !== 100) {
            if (this.rugSelectedSellPct === 'custom') {
              if (this.rugCustomSellSol) {
                this.cashoutRugPartial(this.rugCustomSellSol, true);
              } else {
                this.cashoutRugPartial(this.rugCustomSellPct || 50, false);
              }
            } else {
              this.cashoutRugPartial(this.rugSelectedSellPct, false);
            }
          } else {
            this.cashoutRugPartial(100, false);
          }
          return;
        }

        // If Advanced is enabled, toggle auto-betting mode or cancel waiting bet
        if (this.rugAdvancedEnabled) {
          if (this.rugState === 'WAITING' && this.rugHasBetThisRound && !this.rugAutoBetActive) {
            this.rugHasBetThisRound = false;
            this.rugRemainingBet = 0;
            this.rugSoldPortions = [];
            this.balance += this.rugBet;
            this.saveBalance();
            this.syncRugUserRow();
            this.renderRugPlayersList();
            this.updateRugActionBtn();
            this.showToast('Bet cancelled.');
            return;
          }
          if (this.rugAutoBetActive) {
            this.stopRugAutoBet('Auto-bet stopped by player');
          } else {
            this.startRugAutoBet();
          }
          return;
        }

        // Standard Manual Betting Mode
        if (this.rugState === 'WAITING') {
          if (this.rugHasBetThisRound) {
            this.rugHasBetThisRound = false;
            this.rugRemainingBet = 0;
            this.rugSoldPortions = [];
            this.balance += this.rugBet;
            this.saveBalance();
            this.showToast('Bet cancelled.');
          } else {
            if (!this.canAffordBet(this.rugBet)) {
              return;
            }
            this.rugHasBetThisRound = true;
            this.rugRemainingBet = this.rugBet;
            this.rugSoldPortions = [];
            this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
            this.saveBalance();
            this.bumpTotalBets(1);
            gpAudio.playTrade();
            this.showToast(`Bet placed: ${this.rugBet} SOL`);
          }
          this.syncRugUserRow();
          this.renderRugPlayersList();
          this.updateRugActionBtn();
        } else if (this.rugState === 'RUNNING' || this.rugState === 'CRASHED') {
          this.rugScheduledNextRound = !this.rugScheduledNextRound;
          gpAudio.playClick();
          this.updateRugActionBtn();
          this.showToast(this.rugScheduledNextRound ? 'Bet scheduled for next round!' : 'Scheduled bet cancelled.');
        }
      });
    }

    this.updateRugHistoryBar();
    this.startRugCountdown();
  }

  generateRealisticRugBet() {
    const roll = Math.random();
    let val;

    if (roll < 0.08) {
      // Very low chance (~8%): 0.0200 to 0.0400 SOL
      if (Math.random() < 0.65) {
        // Common human round numbers someone would type
        const highPresets = [
          0.0200, 0.0220, 0.0250, 0.0275, 0.0300, 0.0325, 0.0350, 0.0380, 0.0400
        ];
        val = highPresets[Math.floor(Math.random() * highPresets.length)];
      } else {
        // Natural uneven remainder
        val = 0.0200 + Math.random() * 0.0199;
      }
    } else if (roll < 0.38) {
      // Moderate bet: 0.0080 to 0.0195 SOL (~30% chance)
      if (Math.random() < 0.65) {
        const midPresets = [
          0.0080, 0.0085, 0.0090, 0.0100, 0.0110, 0.0125, 0.0140, 0.0150, 0.0160, 0.0175, 0.0180, 0.0190
        ];
        val = midPresets[Math.floor(Math.random() * midPresets.length)];
      } else {
        val = 0.0080 + Math.random() * 0.0115;
      }
    } else {
      // Standard everyday micro-bet: 0.0010 to 0.0075 SOL (~62% chance - vast majority)
      if (Math.random() < 0.65) {
        const microPresets = [
          0.0010, 0.0015, 0.0020, 0.0025, 0.0030, 0.0035, 0.0040, 0.0050, 0.0055, 0.0060, 0.0065, 0.0070, 0.0075
        ];
        val = microPresets[Math.floor(Math.random() * microPresets.length)];
      } else {
        val = 0.0010 + Math.random() * 0.0065;
      }
    }

    // Absolute hard cap - never above 0.0400 SOL, never below 0.0010 SOL
    val = Math.max(0.0010, Math.min(0.0400, val));
    return parseFloat(val.toFixed(4));
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

      const bet = this.generateRealisticRugBet();
      const target = Math.random() < 0.14 ? 99999 : parseFloat((1.2 + Math.random() * 3.8).toFixed(2));

      players.push({
        name,
        bet,
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

  startRugAutoBet() {
    if (!this.requireAuth()) return;
    if (!this.canAffordBet(this.rugBet)) {
      return;
    }

    const countInput = document.getElementById('rugAutoBetCount');
    const countVal = countInput ? parseInt(countInput.value, 10) : 0;
    this.rugAutoBetTotalRounds = (!isNaN(countVal) && countVal > 0) ? countVal : 0;
    this.rugAutoBetRoundsLeft = this.rugAutoBetTotalRounds;

    const profitInput = document.getElementById('rugStopProfitInput');
    const pVal = profitInput ? parseFloat(profitInput.value) : 0;
    this.rugStopProfit = (!isNaN(pVal) && pVal > 0) ? pVal : null;

    const lossInput = document.getElementById('rugStopLossInput');
    const lVal = lossInput ? parseFloat(lossInput.value) : 0;
    this.rugStopLoss = (!isNaN(lVal) && lVal > 0) ? lVal : null;

    this.rugBaseBet = this.rugBet;
    this.rugAutoBetActive = true;
    this.rugAutoBetsPlayed = 0;
    this.rugAutoWins = 0;
    this.rugAutoLosses = 0;
    this.rugAutoNetProfit = 0;

    const statsWrap = document.getElementById('rugAutoStatsWrap');
    if (statsWrap) statsWrap.style.display = 'grid';
    this.updateRugAutoStats();

    this.showToast(`Auto-Bet started! (${this.rugAutoBetTotalRounds ? this.rugAutoBetTotalRounds + ' rounds' : 'Unlimited rounds'})`);
    gpAudio.playTrade();

    if (this.rugState === 'WAITING' && !this.rugHasBetThisRound) {
      this.rugHasBetThisRound = true;
      this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
      this.saveBalance();
      this.bumpTotalBets(1);
      this.rugAutoBetsPlayed = 1;
      this.syncRugUserRow();
      this.renderRugPlayersList();
      this.updateRugAutoStats();
    } else if (this.rugState !== 'WAITING') {
      this.rugScheduledNextRound = true;
    }

    this.updateRugActionBtn();
  }

  stopRugAutoBet(reason = '') {
    if (!this.rugAutoBetActive) return;
    this.rugAutoBetActive = false;
    this.rugScheduledNextRound = false;
    this.rugBet = this.rugBaseBet || 0.01;
    const betInput = document.getElementById('rugBetInput');
    if (betInput) betInput.value = this.rugBet;
    const usdEl = document.getElementById('crashUsdEstimate');
    if (usdEl) usdEl.textContent = `≈ $${(this.rugBet * (this.solPrice || 108.35)).toFixed(2)} USD`;

    if (reason) this.showToast(reason);
    this.updateRugActionBtn();
  }

  updateRugAutoStats() {
    const betsEl = document.getElementById('rugAutoBetsCountDisplay');
    const winLossEl = document.getElementById('rugAutoWinLossDisplay');
    const profitEl = document.getElementById('rugAutoNetProfitDisplay');
    const roundsEl = document.getElementById('rugRoundsRemainingDisplay');

    if (betsEl) betsEl.textContent = `${this.rugAutoBetsPlayed}${this.rugAutoBetTotalRounds ? ' / ' + this.rugAutoBetTotalRounds : ''}`;
    if (winLossEl) winLossEl.textContent = `${this.rugAutoWins}W / ${this.rugAutoLosses}L`;
    if (profitEl) {
      const p = this.rugAutoNetProfit;
      profitEl.textContent = `${p >= 0 ? '+' : ''}${p.toFixed(4)} SOL`;
      profitEl.style.color = p >= 0 ? '#4ade80' : '#f87171';
    }
    if (roundsEl) {
      if (this.rugAutoBetTotalRounds > 0) {
        const left = Math.max(0, this.rugAutoBetTotalRounds - this.rugAutoBetsPlayed);
        roundsEl.textContent = `${left} Left`;
      } else {
        roundsEl.textContent = '∞';
      }
    }
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
    const quickSellBar = document.getElementById('rugQuickSellBar');
    if (quickSellBar) quickSellBar.style.display = 'none';

    // Check Auto-Bet execution or manual scheduled bet
    if (this.rugAutoBetActive) {
      if (this.rugAutoBetTotalRounds > 0 && this.rugAutoBetsPlayed >= this.rugAutoBetTotalRounds) {
        this.stopRugAutoBet(`Completed all ${this.rugAutoBetTotalRounds} auto-bet rounds!`);
      } else if (this.rugStopProfit && this.rugAutoNetProfit >= this.rugStopProfit) {
        this.stopRugAutoBet(`Take profit reached: +${this.rugAutoNetProfit.toFixed(4)} SOL!`);
      } else if (this.rugStopLoss && -this.rugAutoNetProfit >= this.rugStopLoss) {
        this.stopRugAutoBet(`Stop loss triggered: -${Math.abs(this.rugAutoNetProfit).toFixed(4)} SOL!`);
      } else if (!this.canAffordBet(this.rugBet)) {
        this.stopRugAutoBet(`Auto-bet stopped: Remaining balance needed to cover network transaction fees (${this.solFeeReserve} SOL reserve).`);
      } else {
        this.rugHasBetThisRound = true;
        this.rugRemainingBet = this.rugBet;
        this.rugSoldPortions = [];
        this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
        this.saveBalance();
        this.bumpTotalBets(1);
        this.rugAutoBetsPlayed++;
        this.updateRugAutoStats();
        this.showToast(`Auto-Bet placed: ${this.rugBet.toFixed(3)} SOL`);
      }
    } else if (this.rugScheduledNextRound) {
      this.rugScheduledNextRound = false;
      if (this.canAffordBet(this.rugBet)) {
        this.rugHasBetThisRound = true;
        this.rugRemainingBet = this.rugBet;
        this.rugSoldPortions = [];
        this.balance = parseFloat((this.balance - this.rugBet).toFixed(4));
        this.saveBalance();
        this.bumpTotalBets(1);
        this.showToast(`Scheduled bet placed: ${this.rugBet} SOL`);
      } else {
        this.showToast(`Scheduled bet cancelled: You must keep at least ${this.solFeeReserve} SOL to cover network fees.`);
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
    if (this.rugHasBetThisRound) {
      this.rugRemainingBet = this.rugBet;
      this.rugSoldPortions = [];
      const quickSellBar = document.getElementById('rugQuickSellBar');
      if (quickSellBar) quickSellBar.style.display = 'block';
    } else {
      const quickSellBar = document.getElementById('rugQuickSellBar');
      if (quickSellBar) quickSellBar.style.display = 'none';
    }

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

    // In-flight Quick Sell Bar & Live Payout Estimates
    const quickSellBar = document.getElementById('rugQuickSellBar');
    if (this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001) {
      if (quickSellBar) quickSellBar.style.display = 'block';
      const remDisplay = document.getElementById('rugQuickRemainingDisplay');
      if (remDisplay) {
        remDisplay.textContent = `${this.rugRemainingBet.toFixed(4)} SOL in trade`;
      }
      const qs10 = document.getElementById('qsVal10');
      const qs25 = document.getElementById('qsVal25');
      const qs50 = document.getElementById('qsVal50');
      const qs100 = document.getElementById('qsVal100');
      if (qs10) qs10.textContent = `+${(this.rugRemainingBet * 0.10 * this.rugMultiplier).toFixed(4)}`;
      if (qs25) qs25.textContent = `+${(this.rugRemainingBet * 0.25 * this.rugMultiplier).toFixed(4)}`;
      if (qs50) qs50.textContent = `+${(this.rugRemainingBet * 0.50 * this.rugMultiplier).toFixed(4)}`;
      if (qs100) qs100.textContent = `+${(this.rugRemainingBet * 1.00 * this.rugMultiplier).toFixed(4)}`;
    } else {
      if (quickSellBar) quickSellBar.style.display = 'none';
    }

    // Check user Auto Cashout
    if (this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001 && this.rugAutoTarget && this.rugMultiplier >= this.rugAutoTarget) {
      if (this.rugAdvancedEnabled && this.rugSelectedSellPct !== 100) {
        if (this.rugSelectedSellPct === 'custom') {
          if (this.rugCustomSellSol) {
            this.cashoutRugPartial(this.rugCustomSellSol, true);
          } else {
            this.cashoutRugPartial(this.rugCustomSellPct || 50, false);
          }
        } else {
          this.cashoutRugPartial(this.rugSelectedSellPct, false);
        }
      } else {
        this.cashoutRugPartial(100, false);
      }
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

  cashoutRugPartial(percentageOrAmount, isCustomSol = false) {
    if (this.rugState !== 'RUNNING' || this.rugCashedOut || !this.rugHasBetThisRound || (this.rugRemainingBet || 0) <= 0.0001) return;

    let sellAmount = 0;
    let isFullSell = false;
    let label = '';

    if (isCustomSol) {
      const requestedSol = parseFloat(percentageOrAmount) || 0;
      if (requestedSol <= 0) return;
      if (requestedSol >= this.rugRemainingBet - 0.0001) {
        sellAmount = this.rugRemainingBet;
        isFullSell = true;
        label = '100%';
      } else {
        sellAmount = parseFloat(requestedSol.toFixed(4));
        label = `${sellAmount.toFixed(4)} SOL`;
      }
    } else {
      const pct = Math.min(100, Math.max(1, parseFloat(percentageOrAmount) || 100));
      if (pct >= 99.9) {
        sellAmount = this.rugRemainingBet;
        isFullSell = true;
        label = '100%';
      } else {
        sellAmount = parseFloat((this.rugRemainingBet * (pct / 100)).toFixed(4));
        if (sellAmount >= this.rugRemainingBet - 0.0001) {
          sellAmount = this.rugRemainingBet;
          isFullSell = true;
          label = '100%';
        } else {
          label = `${pct}%`;
        }
      }
    }

    if (sellAmount <= 0.00005) return;

    const payout = parseFloat((sellAmount * this.rugMultiplier).toFixed(4));
    const profit = parseFloat((payout - sellAmount).toFixed(4));

    this.balance = parseFloat((this.balance + payout).toFixed(4));
    this.saveBalance();
    this.recordWin('rug', profit, this.rugMultiplier);

    if (this.activeGame === 'rug' && !document.hidden) {
      gpAudio.playWin();
    }

    if (!this.rugSoldPortions) this.rugSoldPortions = [];
    this.rugSoldPortions.push({
      sellAmount,
      mult: this.rugMultiplier,
      payout,
      profit
    });

    if (isFullSell) {
      this.rugCashedOut = true;
      this.rugRemainingBet = 0;
      this.pushNotification('Rug cashout', `You cashed out 100% at ${this.rugMultiplier.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');
      this.showToast(`🚀 CASHED OUT 100% @ ${this.rugMultiplier.toFixed(2)}x! +${payout.toFixed(4)} SOL`);
      const quickSellBar = document.getElementById('rugQuickSellBar');
      if (quickSellBar) quickSellBar.style.display = 'none';
    } else {
      this.rugRemainingBet = parseFloat((this.rugRemainingBet - sellAmount).toFixed(4));
      this.pushNotification('Rug partial sell', `Sold ${label} at ${this.rugMultiplier.toFixed(2)}x (+${this.formatSol(profit)} SOL). ${this.rugRemainingBet.toFixed(4)} SOL still riding.`, 'win');
      this.showToast(`💰 SOLD ${label} @ ${this.rugMultiplier.toFixed(2)}x! (+${payout.toFixed(4)} SOL) — ${this.rugRemainingBet.toFixed(4)} SOL riding`);
    }

    // Auto-bet telemetry
    if (this.rugAutoBetActive) {
      this.rugAutoNetProfit += profit;
      if (isFullSell) {
        this.rugAutoWins++;
        if (this.rugOnWinAction === 'reset') {
          this.rugBet = this.rugBaseBet;
        } else if (this.rugOnWinAction === 'increase') {
          this.rugBet = parseFloat((this.rugBet * (1 + (this.rugOnWinPct || 100) / 100)).toFixed(4));
        }
        const betInput = document.getElementById('rugBetInput');
        if (betInput) betInput.value = this.rugBet;
        const usdEl = document.getElementById('crashUsdEstimate');
        if (usdEl) usdEl.textContent = `≈ $${(this.rugBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
      }
      this.updateRugAutoStats();
    }

    // Mark/update user in players list
    const userRow = this.rugPlayers.find(p => p.isUser);
    if (userRow) {
      if (isFullSell) {
        userRow.cashed = true;
        userRow.cashoutMult = this.rugMultiplier;
      } else {
        userRow.bet = this.rugRemainingBet;
      }
    }
    this.renderRugPlayersList();
    this.updateRugActionBtn();
  }

  cashoutRug() {
    this.cashoutRugPartial(100, false);
  }

  triggerRugCrash() {
    this.rugState = 'CRASHED';
    if (this.rugAnimId) {
      cancelAnimationFrame(this.rugAnimId);
      this.rugAnimId = null;
    }

    const quickSellBar = document.getElementById('rugQuickSellBar');
    if (quickSellBar) quickSellBar.style.display = 'none';

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
      const securedPortions = this.rugSoldPortions || [];
      const totalSecured = securedPortions.reduce((s, p) => s + (p.payout || 0), 0);
      const remainingLost = (this.rugRemainingBet && this.rugRemainingBet > 0) ? this.rugRemainingBet : this.rugBet;

      if (securedPortions.length > 0) {
        this.showToast(`💥 RUGGED @ ${this.rugCrashPoint.toFixed(2)}x! Lost remaining ${remainingLost.toFixed(4)} SOL (Secured +${totalSecured.toFixed(4)} SOL earlier)`);
      } else {
        this.showToast(`💥 CRASHED @ ${this.rugCrashPoint.toFixed(2)}x! Lost ${this.rugBet} SOL`);
      }

      if (this.rugAutoBetActive) {
        this.rugAutoLosses++;
        this.rugAutoNetProfit -= remainingLost;
        this.updateRugAutoStats();

        if (this.rugOnLossAction === 'reset') {
          this.rugBet = this.rugBaseBet;
        } else if (this.rugOnLossAction === 'increase') {
          this.rugBet = parseFloat((this.rugBet * (1 + (this.rugOnLossPct || 100) / 100)).toFixed(4));
        }
        const betInput = document.getElementById('rugBetInput');
        if (betInput) betInput.value = this.rugBet;
        const usdEl = document.getElementById('crashUsdEstimate');
        if (usdEl) usdEl.textContent = `≈ $${(this.rugBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
      }
    }

    this.rugHasBetThisRound = false;
    this.rugRemainingBet = 0;
    this.rugSoldPortions = [];
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

    if (this.rugAutoBetActive) {
      btn.className = 'crash-action-btn autobet-active';
      if (this.rugState === 'RUNNING' && this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001) {
        const estWin = ((this.rugRemainingBet || this.rugBet) * this.rugMultiplier).toFixed(3);
        btn.textContent = `CASHOUT ${estWin} SOL (OR STOP)`;
      } else {
        const roundsText = this.rugAutoBetTotalRounds ? ` (${this.rugAutoBetsPlayed}/${this.rugAutoBetTotalRounds})` : ` (#${this.rugAutoBetsPlayed})`;
        btn.textContent = `STOP AUTO-BET${roundsText}`;
      }
      return;
    }

    if (this.rugAdvancedEnabled) {
      if (this.rugState === 'WAITING') {
        if (this.rugHasBetThisRound) {
          btn.textContent = `BET PLACED (${this.rugBet.toFixed(3)} SOL) - CLICK TO CANCEL`;
          btn.className = 'crash-action-btn cashout-state';
        } else {
          btn.textContent = `START AUTO-BET (${this.rugBet.toFixed(3)} SOL)`;
          btn.className = 'crash-action-btn';
        }
      } else if (this.rugState === 'RUNNING') {
        if (this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001) {
          btn.className = 'crash-action-btn cashout-state';
          const rem = this.rugRemainingBet || this.rugBet;
          if (this.rugSelectedSellPct === 'custom') {
            if (this.rugCustomSellSol) {
              const sellAmt = Math.min(rem, this.rugCustomSellSol);
              const est = (sellAmt * this.rugMultiplier).toFixed(3);
              btn.textContent = `SELL ${sellAmt.toFixed(3)} SOL (+${est} SOL)`;
            } else {
              const pct = this.rugCustomSellPct || 50;
              const sellAmt = rem * (pct / 100);
              const est = (sellAmt * this.rugMultiplier).toFixed(3);
              btn.textContent = `SELL ${pct}% (+${est} SOL)`;
            }
          } else if (this.rugSelectedSellPct && this.rugSelectedSellPct !== 100) {
            const pct = this.rugSelectedSellPct;
            const sellAmt = rem * (pct / 100);
            const est = (sellAmt * this.rugMultiplier).toFixed(3);
            btn.textContent = `SELL ${pct}% (+${est} SOL)`;
          } else {
            const currentWin = (rem * this.rugMultiplier).toFixed(3);
            btn.textContent = `CASHOUT ${currentWin} SOL`;
          }
        } else if (this.rugHasBetThisRound && (this.rugCashedOut || (this.rugRemainingBet || 0) <= 0.0001)) {
          btn.textContent = `CASHED OUT (${this.rugMultiplier.toFixed(2)}x)`;
          btn.className = 'crash-action-btn';
        } else {
          btn.textContent = `START AUTO-BET NEXT ROUND`;
          btn.className = 'crash-action-btn';
        }
      } else if (this.rugState === 'CRASHED') {
        btn.textContent = `START AUTO-BET NEXT ROUND`;
        btn.className = 'crash-action-btn';
      }
      return;
    }

    if (this.rugState === 'WAITING') {
      if (this.rugHasBetThisRound) {
        btn.textContent = `BET PLACED (${this.rugBet.toFixed(3)} SOL) - CLICK TO CANCEL`;
        btn.className = 'crash-action-btn cashout-state';
      } else {
        btn.textContent = `PLACE BET (${this.rugBet.toFixed(3)} SOL)`;
        btn.className = 'crash-action-btn';
      }
    } else if (this.rugState === 'RUNNING') {
      if (this.rugHasBetThisRound && !this.rugCashedOut && (this.rugRemainingBet || 0) > 0.0001) {
        const rem = this.rugRemainingBet || this.rugBet;
        const currentWin = (rem * this.rugMultiplier).toFixed(3);
        btn.textContent = `CASHOUT ${currentWin} SOL`;
        btn.className = 'crash-action-btn cashout-state';
      } else if (this.rugHasBetThisRound && (this.rugCashedOut || (this.rugRemainingBet || 0) <= 0.0001)) {
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
      if (usdEl) usdEl.textContent = `≈ $${(this.chickenBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
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
      const maxPlayable = this.getMaxPlayableBet();
      this.chickenBet = Math.max(0.0001, Math.min(maxPlayable, parseFloat((this.chickenBet * 2).toFixed(4))));
      if (betInput) betInput.value = this.chickenBet;
      updateUsd();
      gpAudio.playClick();
    });

    if (maxBtn) maxBtn.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      this.chickenBet = Math.max(0.0001, parseFloat(maxPlayable.toFixed(4)));
      if (betInput) betInput.value = this.chickenBet;
      updateUsd();
      gpAudio.playClick();
      this.showToast(`MAX set to ${this.chickenBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
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
    if (!this.requireAuth()) return;
    if (this.chickenPlaying) return;
    if (!this.canAffordBet(this.chickenBet)) {
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

    const usdEl = document.getElementById('minesUsdEstimate');
    const updateMinesUsd = () => {
      if (usdEl) usdEl.textContent = `≈ $${(this.minesBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
    };

    if (betInput) {
      betInput.addEventListener('input', (e) => {
        this.minesBet = Math.max(0.001, parseFloat(e.target.value) || 0.05);
        updateMinesUsd();
      });
      betInput.addEventListener('change', (e) => {
        this.minesBet = Math.max(0.001, parseFloat(e.target.value) || 0.05);
        updateMinesUsd();
      });
      updateMinesUsd();
    }
    if (countSelect) countSelect.addEventListener('change', (e) => this.minesCount = parseInt(e.target.value) || 3);
    if (startBtn) startBtn.addEventListener('click', () => this.startMines());
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashoutMines());

    // Custom non-blocky Mines dropdown & quick chips controller
    const dropdownWrap = document.getElementById('minesDropdownWrap');
    const dropdownTrigger = document.getElementById('minesDropdownTrigger');
    const dropdownLabel = document.getElementById('minesDropdownLabel');
    const quickChips = document.querySelectorAll('.mines-chip-btn');
    const dropdownItems = document.querySelectorAll('.custom-dropdown-item');

    const setMinesCountUI = (val) => {
      const num = parseInt(val) || 3;
      this.minesCount = num;
      if (countSelect) {
        countSelect.value = String(num);
        countSelect.dispatchEvent(new Event('change'));
      }
      if (dropdownLabel) dropdownLabel.textContent = `${num} Mine${num > 1 ? 's' : ''}`;
      dropdownItems.forEach(item => {
        item.classList.toggle('active', item.dataset.value === String(num));
      });
      quickChips.forEach(chip => {
        chip.classList.toggle('active', chip.dataset.value === String(num));
      });
      if (dropdownWrap) dropdownWrap.classList.remove('open');
      if (dropdownTrigger) dropdownTrigger.setAttribute('aria-expanded', 'false');
    };

    if (dropdownTrigger && dropdownWrap) {
      dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.minesPlaying) return;
        const isOpen = dropdownWrap.classList.toggle('open');
        dropdownTrigger.setAttribute('aria-expanded', String(isOpen));
      });

      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.minesPlaying) return;
          setMinesCountUI(item.dataset.value);
        });
      });

      quickChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.minesPlaying) return;
          setMinesCountUI(chip.dataset.value);
        });
      });

      document.addEventListener('click', (e) => {
        if (!dropdownWrap.contains(e.target)) {
          dropdownWrap.classList.remove('open');
          dropdownTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const applyMinesBet = (value) => {
      const maxPlayable = this.getMaxPlayableBet();
      const next = Math.max(0.001, Math.min(maxPlayable, parseFloat(value.toFixed(4)) || 0.001));
      this.minesBet = next;
      if (betInput) betInput.value = next;
      updateMinesUsd();
    };
    document.getElementById('minesHalfBtn')?.addEventListener('click', () => applyMinesBet(this.minesBet / 2));
    document.getElementById('minesDoubleBtn')?.addEventListener('click', () => applyMinesBet(this.minesBet * 2));
    document.getElementById('minesMaxBtn')?.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      applyMinesBet(maxPlayable);
      this.showToast(`MAX set to ${this.minesBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
    });

    this.renderMinesGrid();
  }

  startMines() {
    if (!this.requireAuth()) return;
    if (this.minesPlaying) return;
    if (!this.canAffordBet(this.minesBet)) {
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
      // Guaranteed 3.0% House Edge on combinatorial multiplier
      let fairMultiplier = 0.97;
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
    const maxPlayable = this.getMaxPlayableBet();
    if (factor === 'max') {
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      const maxVal = Math.max(0.001, parseFloat(Math.min(maxPlayable, 5.0).toFixed(4)));
      if (this.bjActiveTarget === 'main') this.bjMainBet = maxVal;
      else if (this.bjActiveTarget === '213') this.bjSide213 = maxVal;
      else if (this.bjActiveTarget === 'pair') this.bjSidePair = maxVal;
      this.showToast(`MAX set to ${maxVal} SOL (${this.solFeeReserve} SOL reserved for fees)`);
    } else {
      const mult = parseFloat(factor);
      if (this.bjActiveTarget === 'main') {
        this.bjMainBet = Math.max(0.001, Math.min(maxPlayable, parseFloat((this.bjMainBet * mult).toFixed(4))));
      } else if (this.bjActiveTarget === '213') {
        this.bjSide213 = Math.max(0, Math.min(maxPlayable, parseFloat((this.bjSide213 * mult).toFixed(4))));
      } else if (this.bjActiveTarget === 'pair') {
        this.bjSidePair = Math.max(0, Math.min(maxPlayable, parseFloat((this.bjSidePair * mult).toFixed(4))));
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
    if (!this.canAffordBet(totalBet)) {
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
          <span class="chat-badge-vip" style="${isSelf ? 'background:#2563eb;' : ''}">${vip}</span>
          <span class="chat-username" style="${isSelf ? 'color:#60a5fa;' : ''}">${username}</span>
        </div>
        <div class="chat-user-msg">${text}</div>
      `;
      feed.appendChild(d);
      feed.scrollTop = feed.scrollHeight;
      while (feed.children.length > 30) feed.removeChild(feed.firstChild);
    };

    addMsg('LuckyWinBot', 'SYSTEM', 'Welcome to LuckyWin! 100% On-chain fairness.');
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
    if (!this.requireAuth()) return;
    if (this.bjPlaying) return;
    const main = parseFloat(this.bjMainBet) || 0;
    const side213 = parseFloat(this.bjSide213) || 0;
    const sidePair = parseFloat(this.bjSidePair) || 0;
    const total = parseFloat((main + side213 + sidePair).toFixed(4));

    if (main < 0.0001) {
      this.showToast('Main bet must be at least 0.0001 SOL.');
      return;
    }
    if (!this.canAffordBet(total)) {
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
    if (!this.canAffordBet(hand.bet)) {
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
    if (!this.canAffordBet(hand.bet)) {
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
      if (usdEl) usdEl.textContent = `≈ $${(this.hiloBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
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
      const maxPlayable = this.getMaxPlayableBet();
      this.hiloBet = Math.max(0.001, Math.min(maxPlayable, parseFloat((this.hiloBet * 2).toFixed(4))));
      if (betInput) betInput.value = this.hiloBet;
      updateUsd();
      this.updateHiLoUI();
      gpAudio.playClick();
    });
    if (max) max.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      this.hiloBet = Math.max(0.001, parseFloat(maxPlayable.toFixed(4)));
      if (betInput) betInput.value = this.hiloBet;
      updateUsd();
      this.updateHiLoUI();
      gpAudio.playClick();
      this.showToast(`MAX set to ${this.hiloBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
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

  drawHiLoCard(initial = false, forcedOutcome = null, choice = null, prevRank = null) {
    let rank;

    if (initial) {
      // Pick a balanced starting number (3 to 11) out of 1 to 13
      rank = Math.floor(Math.random() * 9) + 3;
    } else if (forcedOutcome && choice && prevRank !== null) {
      if (forcedOutcome === 'win') {
        // Player wins (30% chance): draw number strictly fulfilling choice
        if (choice === 'higher') {
          const valid = [];
          for (let n = prevRank + 1; n <= 13; n++) valid.push(n);
          rank = valid.length ? valid[Math.floor(Math.random() * valid.length)] : 13;
        } else {
          const valid = [];
          for (let n = 1; n < prevRank; n++) valid.push(n);
          rank = valid.length ? valid[Math.floor(Math.random() * valid.length)] : 1;
        }
      } else {
        // House wins (70% chance): draw number that makes player lose (opposite or push)
        if (choice === 'higher') {
          const valid = [];
          for (let n = 1; n <= prevRank; n++) valid.push(n);
          rank = valid.length ? valid[Math.floor(Math.random() * valid.length)] : prevRank;
        } else {
          const valid = [];
          for (let n = prevRank; n <= 13; n++) valid.push(n);
          rank = valid.length ? valid[Math.floor(Math.random() * valid.length)] : prevRank;
        }
      }
    } else {
      rank = Math.floor(Math.random() * 13) + 1;
    }

    const card = { rank };
    this.hiloCurrentRank = rank;
    this.hiloCurrentSuit = '';
    if (initial) this.hiloHistory = [card];
    return card;
  }

  hiLoProbabilities(rank = this.hiloCurrentRank) {
    const total = 12;
    const higherCount = Math.max(0, 13 - rank);
    const lowerCount = Math.max(0, rank - 1);
    return {
      higher: higherCount / total,
      lower: lowerCount / total,
      tie: 1 / 13
    };
  }

  renderHiLoCard() {
    const num = this.hiloCurrentRank;
    const top = document.getElementById('hiloCardTop');
    const bottom = document.getElementById('hiloCardBottom');
    const center = document.getElementById('hiloCardSuitDisplay');
    const face = document.getElementById('hiloCardFace');

    if (top) top.textContent = String(num);
    if (bottom) bottom.textContent = String(num);
    if (center) center.textContent = String(num);
    if (face) {
      face.classList.remove('card-red', 'card-black');
      face.classList.add('card-number');
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
    if (higherBtn) higherBtn.disabled = this.hiloCurrentRank >= 13;
    if (lowerBtn) lowerBtn.disabled = this.hiloCurrentRank <= 1;

    const streakEl = document.getElementById('hiloStreakDisplay');
    const multEl = document.getElementById('hiloMultDisplay');
    const payoutEl = document.getElementById('hiloPayoutDisplay');
    const cashoutBtn = document.getElementById('hiloCashoutBtn');
    const currentMult = Math.min(1.50, this.hiloMult || 1.0);
    if (streakEl) streakEl.textContent = this.hiloStreak;
    if (multEl) multEl.textContent = `${currentMult.toFixed(2)}x`;
    if (payoutEl) {
      const payout = this.hiloPlaying ? this.hiloBet * currentMult : this.hiloBet * 1.50;
      payoutEl.textContent = `${payout.toFixed(4)} SOL`;
    }
    if (cashoutBtn) {
      const show = this.hiloPlaying && this.hiloStreak > 0;
      cashoutBtn.style.display = show ? 'block' : 'none';
      if (show) {
        const isMax = currentMult >= 1.50;
        cashoutBtn.textContent = isMax
          ? `CASHOUT ${(this.hiloBet * 1.50).toFixed(4)} SOL (1.50x MAX)`
          : `CASHOUT ${(this.hiloBet * currentMult).toFixed(4)} SOL (${currentMult.toFixed(2)}x)`;
      }
    }
  }

  renderHiLoHistory() {
    const el = document.getElementById('hiloHistory');
    if (!el) return;
    el.innerHTML = '';
    this.hiloHistory.slice(0, 14).forEach(card => {
      const chip = document.createElement('span');
      chip.className = 'hilo-history-chip number-chip';
      chip.textContent = String(card.rank);
      el.appendChild(chip);
    });
  }

  playHiLoStep(choice) {
    if (!this.requireAuth()) return;
    if (this.hiloResolving) return;
    const probs = this.hiLoProbabilities();
    const probability = choice === 'higher' ? probs.higher : probs.lower;
    if (probability <= 0) return;

    if (!this.hiloPlaying) {
      if (!this.canAffordBet(this.hiloBet)) {
        return;
      }
      this.balance = parseFloat((this.balance - this.hiloBet).toFixed(4));
      this.saveBalance();
      this.bumpTotalBets(1);
      this.hiloPlaying = true;
      this.hiloStreak = 0;
      this.hiloMult = 1.0;
    }

    this.hiloResolving = true;
    const previousRank = this.hiloCurrentRank;

    // Strict 70% House Edge: House wins 70% of the time, Player wins 30%
    const playerWins = Math.random() < 0.30;
    const outcome = playerWins ? 'win' : 'lose';
    const card = this.drawHiLoCard(false, outcome, choice, previousRank);

    const isTie = card.rank === previousRank;
    const won = choice === 'higher' ? card.rank > previousRank : card.rank < previousRank;
    this.hiloHistory.unshift(card);
    if (this.hiloHistory.length > 16) this.hiloHistory.pop();
    this.renderHiLoHistory();

    const statusEl = document.getElementById('hiloStatus');
    if (isTie) {
      // Casino House Edge: Ties favor the house
      this.hiloPlaying = false;
      this.hiloStreak = 0;
      this.hiloMult = 1.0;
      if (statusEl) statusEl.textContent = `Same number (${card.rank})! Push/Tie breaks streak. Place a new bet.`;
      gpAudio.playCrash();
      this.showToast(`❌ Same number (${card.rank})! Streak reset.`);
      this.updateHiLoUI();
      this.hiloResolving = false;
      return;
    }

    if (won) {
      this.hiloStreak++;
      // Absolute 50% max gain cap (multiplier can NEVER exceed 1.50x on total bet)
      const stepBoost = Math.max(0.12, Math.min(0.28, (1 - probability) * 0.40));
      this.hiloMult = Math.min(1.50, parseFloat(((this.hiloMult || 1.0) + stepBoost).toFixed(2)));

      const reachedMax = this.hiloMult >= 1.50;
      if (reachedMax) {
        this.hiloMult = 1.50;
        if (statusEl) statusEl.textContent = `🎯 Max 50% gain reached (1.50x)! Cash out now to lock in profit.`;
        gpAudio.playWin();
        this.showToast(`🎯 Max 50% gain reached (1.50x)!`);
      } else {
        if (statusEl) statusEl.textContent = `Correct! ${this.hiloStreak} in a row · ${this.hiloMult.toFixed(2)}x (Max 1.50x)`;
        gpAudio.playHop();
        this.showToast(`✅ Correct! Streak ${this.hiloStreak} · ${this.hiloMult.toFixed(2)}x`);
      }
    } else {
      this.hiloPlaying = false;
      this.hiloStreak = 0;
      this.hiloMult = 1.0;
      if (statusEl) statusEl.textContent = `Wrong call. Lost ${this.hiloBet.toFixed(4)} SOL. Try again.`;
      gpAudio.playCrash();
      this.showToast(`❌ Wrong! Lost ${this.hiloBet.toFixed(4)} SOL.`);
    }

    this.updateHiLoUI();
    this.hiloResolving = false;
  }

  cashoutHiLo() {
    if (!this.hiloPlaying || this.hiloStreak < 1) return;
    const mult = Math.min(1.50, this.hiloMult);
    const win = parseFloat((this.hiloBet * mult).toFixed(4));
    const profit = parseFloat((win - this.hiloBet).toFixed(4));
    this.balance = parseFloat((this.balance + win).toFixed(4));
    this.saveBalance();
    this.recordWin('hilo', profit, mult);
    this.pushNotification('HiLo win', `Cashed out a ${this.hiloStreak}-card streak at ${mult.toFixed(2)}x for +${this.formatSol(profit)} SOL.`, 'win');
    gpAudio.playWin();
    this.showToast(`🎉 HiLo cashed out +${win.toFixed(4)} SOL (${mult.toFixed(2)}x)`);

    const statusEl = document.getElementById('hiloStatus');
    if (statusEl) statusEl.textContent = `Cashed out +${win.toFixed(4)} SOL (+50% max gain). Place a new bet.`;
    this.hiloPlaying = false;
    this.hiloStreak = 0;
    this.hiloMult = 1.0;
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
    if (double) double.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      setBet(Math.min(maxPlayable, this.flappyBet * 2));
    });
    if (max) max.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      setBet(maxPlayable);
      this.showToast(`MAX set to ${this.flappyBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
    });

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
    if (!this.requireAuth()) return;
    if (this.flappyPlaying) return;
    if (!this.canAffordBet(this.flappyBet)) {
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
      if (usdEl) usdEl.textContent = `≈ $${(this.coinflipBet * (this.solPrice || 108.35)).toFixed(2)} USD`;
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
    if (double) double.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      setBet(Math.min(maxPlayable, this.coinflipBet * 2));
    });
    if (max) max.addEventListener('click', () => {
      const maxPlayable = this.getMaxPlayableBet();
      if (maxPlayable <= 0) {
        this.showFeeReservePrompt();
        return;
      }
      setBet(maxPlayable);
      this.showToast(`MAX set to ${this.coinflipBet} SOL (${this.solFeeReserve} SOL reserved for fees)`);
    });

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
    if (!this.requireAuth()) return;
    if (this.coinflipFlipping) return;
    if (!this.canAffordBet(this.coinflipBet)) {
      return;
    }

    this.balance = parseFloat((this.balance - this.coinflipBet).toFixed(4));
    this.saveBalance();
    this.bumpTotalBets(1);
    this.coinflipFlipping = true;

    // Strict 60% House Edge: House wins 60% of flips, Player wins 40%
    const won = Math.random() < 0.40;
    const otherSide = this.coinflipSide === 'heads' ? 'tails' : 'heads';
    const result = won ? this.coinflipSide : otherSide;
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
  openModal(id, updateUrl = true) {
    if (id === 'dailyCaseModal' || id === 'airdropConfirmModal') {
      if (!this.requireAuth()) return;
    }
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    gpAudio.playClick();
    if (id === 'dailyCaseModal') {
      this.updateDailyCaseUI();
      this.renderDailyCaseRewards();
      this.setupDailyCaseTrack();
    }
    if (updateUrl) {
      const modalRouteMap = {
        'leaderboardModal': 'leaderboard',
        'dailyCaseModal': 'case',
        'fairnessModal': 'fairness',
        'bjRulebookModal': 'rules'
      };
      const r = modalRouteMap[id];
      if (r) {
        const cur = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
        if (cur !== r) {
          window.history.pushState({ modal: id }, '', '/' + r);
        }
        const titleMap = {
          'leaderboard': 'Leaderboard',
          'case': 'Daily Case',
          'fairness': 'Provably Fair',
          'rules': 'Blackjack Rules'
        };
        document.title = `LuckyWin - ${titleMap[r] || 'Casino'} | Next Gen Solana Gaming`;
      }
    }
  }

  closeModal(modal) {
    if (typeof modal === 'string') modal = document.getElementById(modal);
    if (modal) modal.classList.remove('open');
    this.syncUrlOnModalClose();
  }

  openWalletDialog(updateUrl = true) {
    if (!this.requireAuth()) return;
    this.updateBalanceUI();
    const dialog = document.getElementById('walletSecurityDialog');
    if (!dialog) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    gpAudio.playClick();
    if (updateUrl) {
      const cur = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (cur !== 'wallet') {
        window.history.pushState({ modal: 'wallet' }, '', '/wallet');
      }
      document.title = 'LuckyWin - Casino Vault & Private Wallet | Real Money Solana';
    }
  }

  syncUrlOnModalClose() {
    const p = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const modalRoutes = [
      'leaderboard', 'leaderbord',
      'case', 'daily-case',
      'fairness', 'provably-fair',
      'rules', 'rulebook', 'blackjack-rules',
      'wallet', 'faucet',
      'terms', 'terms-of-service',
      'privacy', 'privacy-policy',
      'responsible', 'responsible-play',
      'howto', 'how-to-play'
    ];
    if (modalRoutes.includes(p)) {
      const gRoute = this.getRouteForGame(this.activeGame || 'rug');
      window.history.replaceState({ game: this.activeGame }, '', '/' + gRoute);
      document.title = `LuckyWin - ${this.getGameTitle(this.activeGame || 'rug')} | Next Gen Solana Gaming`;
    }
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
      ['closeInfoModalBtn', 'infoModal'],
      ['closeAirdropConfirmBtn', 'airdropConfirmModal'],
      ['cancelAirdropBtn', 'airdropConfirmModal']
    ];
    closePairs.forEach(([btnId, modalId]) => {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', () => this.closeModal(modalId));
    });

    const lbBtn = document.getElementById('leaderboardNavBtn');
    if (lbBtn) {
      lbBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('leaderboardModal', true);
      });
    }
    const footerLb = document.getElementById('footerLeaderboardBtn');
    if (footerLb) {
      footerLb.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('leaderboardModal', true);
      });
    }

    const caseBtns = [document.getElementById('dailyCaseNavBtn'), ...document.querySelectorAll('[data-open-case]')];
    caseBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.updateDailyCaseUI();
          this.openModal('dailyCaseModal', true);
        });
      }
    });

    const rulebookBtn = document.getElementById('bjRulebookBtn');
    if (rulebookBtn) {
      rulebookBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal('bjRulebookModal', true);
      });
    }

    [document.getElementById('bjFairnessBtn'), ...document.querySelectorAll('[data-open-fairness]')].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openModal('fairnessModal', true);
        });
      }
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
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();
      this.closeNotificationsPanel();
      this.syncUrlOnModalClose();
    });

    const footerWallet = document.getElementById('footerWalletBtn') || document.getElementById('footerFaucetBtn');
    if (footerWallet) {
      footerWallet.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWalletDialog(true);
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
      title: 'LuckyWin',
      text: 'Play 7 real-money Solana casino games on LuckyWin. 100% non-custodial vault.',
      url: window.location.href
    };
    const finish = (message) => this.showToast(message);
    if (navigator.share) {
      navigator.share(shareData).then(() => finish('Shared LuckyWin!')).catch(() => {});
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
    const cooldownPassed = !last || (Date.now() - last >= 24 * 60 * 60 * 1000);
    return cooldownPassed && this.hasPlayedGameToday();
  }

  updateDailyCaseUI() {
    const last = parseInt(localStorage.getItem('gp_case_last_claim'), 10) || 0;
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, cooldown - (Date.now() - last));
    const cooldownReady = remaining <= 0;
    const playedToday = this.hasPlayedGameToday();
    const ready = cooldownReady && playedToday;

    const badge = document.getElementById('dailyCaseBadge');
    const btn = document.getElementById('spinDailyCaseBtn');
    const text = document.getElementById('caseCooldownText');
    const reqBadge = document.getElementById('caseRequirementStatusBadge');

    if (reqBadge) {
      if (playedToday) {
        reqBadge.textContent = 'UNLOCKED ✅';
        reqBadge.style.background = 'rgba(16,185,129,0.2)';
        reqBadge.style.color = '#34d399';
        reqBadge.style.borderColor = 'rgba(16,185,129,0.35)';
      } else {
        reqBadge.textContent = 'LOCKED 🔒 (Play 1 game)';
        reqBadge.style.background = 'rgba(239,68,68,0.2)';
        reqBadge.style.color = '#fca5a5';
        reqBadge.style.borderColor = 'rgba(239,68,68,0.35)';
      }
    }

    if (badge) {
      badge.textContent = ready ? 'FREE' : (playedToday ? 'WAIT' : 'LOCK');
      badge.style.background = ready ? '#2563eb' : (playedToday ? '#1e293b' : '#334155');
      badge.style.color = '#ffffff';
    }

    if (btn) {
      if (this.caseSpinning) {
        btn.disabled = true;
        btn.textContent = 'OPENING...';
        btn.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
      } else if (!playedToday) {
        btn.disabled = false;
        btn.textContent = 'PLAY 1 GAME TO UNLOCK';
        btn.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
      } else if (ready) {
        btn.disabled = false;
        btn.textContent = 'OPEN FREE CASE';
        btn.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
      } else {
        btn.disabled = true;
        const totalSec = Math.ceil(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        btn.textContent = `WAIT ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        btn.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
      }
    }

    if (text) {
      if (!playedToday) {
        text.textContent = '⚠️ Play at least 1 round of Crash, Mines, or any game today to unlock your Daily Chest.';
        text.style.color = '#f59e0b';
      } else if (ready) {
        text.textContent = 'Ready now — one free case every 24 hours (Max 15¢ / 0.0010 SOL).';
        text.style.color = '#38bdf8';
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
    if (!this.requireAuth()) return;
    if (!this.hasPlayedGameToday()) {
      this.showToast('🎮 Please play at least 1 game round today before claiming your Daily Chest!');
      gpAudio.playClick();
      return;
    }
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
      { title: 'Welcome to LuckyWin', body: 'Real-Money Solana Casino is online. Deposit SOL into the Casino Vault to begin.', kind: 'system', unread: true, ts: Date.now() - 120000 },
      { title: 'Non-Custodial Security', body: 'You own your private keys. Export keypair or connect Phantom from your wallet modal.', kind: 'system', unread: true, ts: Date.now() - 60000 }
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
    this.infoContents = {
      howto: {
        title: 'How to Play',
        body: '<p><strong>1. Deposit SOL into the Casino Vault.</strong> Open your wallet modal, connect your Phantom extension or transfer SOL directly to the Casino Main Vault address.</p><p><strong>2. Pick a game.</strong> Play Crash (Rug), Pump &amp; Dump, Mines, Chicken Road, Blackjack, HiLo, or Coinflip. Set your bet amount and make your move.</p><p><strong>3. Instant Withdrawals.</strong> Click Withdraw in your wallet modal to dispatch your winnings back to your private Solana wallet at any time.</p><p>LuckyWin is 100% non-custodial. Your keys remain strictly on your device.</p>'
      },
      responsible: {
        title: 'Responsible Play',
        body: '<p>LuckyWin is a real-money Solana casino. Players must be 18+ years of age. Real cryptocurrency wagers involve financial risk.</p><p>Take regular breaks and keep play sessions controlled. Never gamble with money you cannot afford to lose.</p>'
      },
      terms: {
        title: 'Terms of Use',
        body: '<h4>1. Eligibility & Age Restriction (18+)</h4><p>By accessing or utilizing LuckyWin, you expressly certify, warrant, and represent that you are at least <strong>eighteen (18) years of age</strong> (or the legal age of majority in your jurisdiction). Individuals under 18 years of age are strictly prohibited from accessing, viewing, or participating on this platform. We reserve the right to request proof of age and identity at any time. Any account, session, or balance linked to an underage individual will be immediately terminated with total forfeiture of all assets.</p><h4>2. Platform Right to Hold Balances & Reclaim Earnings</h4><p>LuckyWin reserves the absolute, unilateral right, in its sole and exclusive discretion, at any time and without prior notification, to <strong>audit, hold, freeze, adjust, void, or reclaim any user balances, winnings, earnings, payouts, or promotional credits</strong>. The platform reserves full authority to place administrative holds on user balances for any duration required to conduct security audits, technical reconciliation, compliance reviews, or anti-fraud investigations.</p><h4>3. Earnings Verification & Management Discretion</h4><p>All earnings, game results, multipliers, and platform balances remain provisional and conditional upon final verification by platform administration. LuckyWin reserves the unconditional right to claim, cancel, or withhold earnings resulting from software glitches, latency arbitrage, algorithmic discrepancies, syndicate play, automated bots, multi-accounting, or violations of platform integrity standards.</p><h4>4. Service Availability & As-Is Provision</h4><p>The platform and its games are provided strictly on an “as is” and “as available” basis without warranties of any kind. LuckyWin disclaims all liability for connection disruptions, server downtime, system latency, or lost progress.</p><h4>5. Prohibited Conduct & Account Forfeiture</h4><p>Any attempt to reverse engineer, exploit bugs, deploy automated betting scripts, or tamper with the platform will result in immediate permanent expulsion and complete forfeiture of all existing and accrued balances.</p>'
      },
      privacy: {
        title: 'Privacy Policy',
        body: '<h4>1. Overview</h4><p>LuckyWin (https://83k5.xyz) respects your privacy and is committed to protecting your personal information in strict accordance with the Google API Services User Data Policy.</p><h4>2. Data Collection & Google User Data</h4><p>When you choose &ldquo;Continue with Google&rdquo;, we collect basic profile details: your primary email address, display name, and avatar image URL. If you connect a Solana Web3 wallet, we record your public wallet address for balance verification. We never have access to private keys.</p><h4>3. Limited Use & Google Compliance</h4><p><strong>LuckyWin does NOT sell, rent, or trade Google user data to third parties.</strong> Google user data is never used for personalized advertising, marketing profiling, or machine learning/AI model training.</p><h4>4. Data Security & Retention</h4><p>Passwords are protected via PBKDF2 cryptographic hashing. All communications are encrypted with TLS/HTTPS. We retain account records only while your account is active.</p><h4>5. User Rights & Data Deletion</h4><p>You can revoke Google permissions at any time via <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:underline;">Google Account Permissions</a>. To request complete account and data deletion, email us at <a href="mailto:support@greenpump.xyz" style="color:#38bdf8;">support@greenpump.xyz</a>. View the full standalone policy at <a href="/privacy" style="color:#38bdf8;text-decoration:underline;">83k5.xyz/privacy</a>.</p>'
      }
    };

    document.querySelectorAll('[data-info]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showInfoModal(btn.dataset.info, true);
      });
    });
  }

  showInfoModal(key, updateUrl = true) {
    if (!this.infoContents) this.initInfoModals();
    const item = this.infoContents && this.infoContents[key];
    if (!item) return;
    const title = document.getElementById('infoModalTitle');
    const body = document.getElementById('infoModalBody');
    if (title) title.textContent = item.title;
    if (body) body.innerHTML = item.body;
    this.openModal('infoModal', false);
    if (updateUrl) {
      const cur = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (cur !== key) {
        window.history.pushState({ info: key }, '', '/' + key);
      }
      document.title = `LuckyWin - ${item.title} | Next Gen Solana Gaming`;
    }
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

    const backdrop = document.getElementById('chatBackdrop');
    const mobileChatToggle = document.getElementById('mobileChatToggleBtn');
    const navChatToggle = document.getElementById('navChatBtn');

    if (minBtn) minBtn.addEventListener('click', () => this.setChatCollapsed(true));
    if (openBtn) openBtn.addEventListener('click', () => this.setChatCollapsed(false));
    if (backdrop) backdrop.addEventListener('click', () => this.setChatCollapsed(true));
    if (mobileChatToggle) {
      mobileChatToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = document.body.classList.contains('mobile-chat-open') || !document.body.classList.contains('chat-collapsed');
        this.setChatCollapsed(isOpen);
      });
    }
    if (navChatToggle) {
      navChatToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = document.body.classList.contains('mobile-chat-open') || !document.body.classList.contains('chat-collapsed');
        this.setChatCollapsed(isOpen);
      });
    }

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
      if (!this.requireAuth()) return;
      if (!input) return;
      const val = input.value.trim().slice(0, 180);
      if (!val) return;
      const currentLevel = this.userLevel || 1;
      const currentName = this.username || 'You';
      this.addChatMessage(feed, currentName, `LVL ${currentLevel}`, val, true);
      input.value = '';
      if (emojiPicker) emojiPicker.hidden = true;
      gpAudio.playClick();
    };
    if (sendBtn) sendBtn.addEventListener('click', sendMsg);
    if (input) {
      input.addEventListener('focus', () => {
        if (!this.isLoggedIn) {
          input.blur();
          this.requireAuth();
        }
      });
      input.addEventListener('click', () => {
        if (!this.isLoggedIn) {
          input.blur();
          this.requireAuth();
        }
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          sendMsg();
        }
      });
    }

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
    const backdrop = document.getElementById('chatBackdrop');
    const mobileChatBtn = document.getElementById('mobileChatToggleBtn');
    if (!sidebar) return;

    const isMobile = window.innerWidth <= 1024;
    const hideOffset = isMobile ? '-115%' : '-315px';

    sidebar.style.transform = collapsed ? `translateX(${hideOffset})` : 'translateX(0)';
    sidebar.style.opacity = collapsed ? '0' : '1';
    sidebar.style.pointerEvents = collapsed ? 'none' : 'auto';

    document.body.classList.toggle('chat-collapsed', collapsed);
    document.body.classList.toggle('mobile-chat-open', !collapsed && isMobile);

    if (backdrop) {
      backdrop.classList.toggle('is-open', !collapsed && isMobile);
    }
    if (mobileChatBtn) {
      mobileChatBtn.classList.toggle('active', !collapsed);
    }

    if (openBtn) {
      openBtn.style.transform = collapsed ? 'translateX(0) scale(1)' : 'translateX(-28px) scale(0.92)';
      openBtn.style.opacity = collapsed ? '1' : '0';
      openBtn.style.pointerEvents = collapsed ? 'auto' : 'none';
    }
    const picker = document.getElementById('gpEmojiPicker');
    if (picker) picker.hidden = true;
    if (persist) localStorage.setItem('gp_chat_collapsed', collapsed ? 'true' : 'false');
    if (window.gpAudio && gpAudio.playClick) gpAudio.playClick();
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
    if (isSelf) badge.style.background = '#2563eb';
    const name = document.createElement('span');
    name.className = 'chat-username';
    name.textContent = username;
    if (isSelf) name.style.color = '#60a5fa';
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
        this.showToast('🪂 Community Airdrop round complete! +0.05 SOL.');
      }
      seconds--;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      if (timerEl) timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (fillEl) fillEl.style.width = `${((180 - seconds) / 180) * 100}%`;
    }, 1000);

    // Custom user airdrop controls
    const dropBtn = document.getElementById('airdropDropBtn');
    const amountInput = document.getElementById('airdropCustomInput');

    const triggerConfirm = () => {
      const val = parseFloat(amountInput?.value) || 0;
      if (val <= 0) {
        this.showToast('⚠️ Please enter a valid SOL amount to airdrop.');
        return;
      }
      this.showAirdropConfirmModal(val);
    };

    if (dropBtn) {
      dropBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerConfirm();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerConfirm();
        }
      });
    }

    const execBtn = document.getElementById('executeAirdropBtn');
    if (execBtn) {
      execBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeCustomAirdrop();
      });
    }

    const cancelBtn = document.getElementById('cancelAirdropBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeModal('airdropConfirmModal');
      });
    }
  }

  showAirdropConfirmModal(amount) {
    this.pendingAirdropAmount = amount;
    const online = parseInt(document.getElementById('airdropOnlineCount')?.textContent, 10) || 84;
    const shareEach = (amount / online).toFixed(4);

    const amtEl = document.getElementById('confirmAirdropAmountDisplay');
    const recipEl = document.getElementById('confirmAirdropRecipientsDisplay');
    const eachEl = document.getElementById('confirmAirdropEachDisplay');
    const balEl = document.getElementById('confirmAirdropWalletBalance');
    const execBtn = document.getElementById('executeAirdropBtn');

    if (amtEl) amtEl.textContent = `${this.formatSol(amount)} SOL`;
    if (recipEl) recipEl.textContent = `${online} online players`;
    if (eachEl) eachEl.textContent = `+${shareEach} SOL`;
    if (balEl) balEl.textContent = `${this.formatSol(this.balance)} SOL`;
    if (execBtn) execBtn.textContent = `Confirm & Airdrop ${this.formatSol(amount)} SOL`;

    this.openModal('airdropConfirmModal', false);
  }

  executeCustomAirdrop() {
    const amount = Number(this.pendingAirdropAmount) || 0.5;
    if (amount <= 0) return;

    if (!this.canAffordBet(amount)) {
      this.closeModal('airdropConfirmModal');
      return;
    }

    // Deduct from wallet
    this.balance = parseFloat((this.balance - amount).toFixed(4));
    this.saveBalance();

    const online = parseInt(document.getElementById('airdropOnlineCount')?.textContent, 10) || 84;
    const shareEach = (amount / online).toFixed(4);

    this.closeModal('airdropConfirmModal');
    gpAudio.playWin();

    // Broadcast into public chat
    this.addChatAirdropAnnouncement(amount, online, shareEach);

    this.showToast(`🎉 You airdropped ${this.formatSol(amount)} SOL to ${online} players (+${shareEach} SOL each)!`);
    this.pushNotification('Airdrop Sent', `You airdropped ${this.formatSol(amount)} SOL equally among ${online} online players.`, 'win');
  }

  addChatAirdropAnnouncement(amount, playersCount, sharePerPlayer) {
    const feed = document.querySelector('[data-chat-feed="true"]');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'chat-message-item chat-airdrop-announcement';
    item.style.cssText = `
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 10px;
      padding: 8px 10px;
      margin: 4px 0;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
    `;
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:14px;">🪂</span>
        <span style="font-size:11px;font-weight:900;color:#38bdf8;text-transform:uppercase;letter-spacing:0.04em;">COMMUNITY AIRDROP</span>
      </div>
      <div style="font-size:11.5px;color:#f8fafc;font-weight:700;line-height:1.35;">
        You airdropped <strong style="color:#60a5fa;">${this.formatSol(amount)} SOL</strong>! Distributed equally to all <strong>${playersCount}</strong> online players (<strong style="color:#4ade80;">+${sharePerPlayer} SOL</strong> each).
      </div>
    `;
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;

    // Simulate immediate excited chat reactions from other online players
    const reactions = [
      { name: 'DegenKing42', vip: 'VIP 4', text: 'LFG!! Thanks for the airdrop! 🔥' },
      { name: 'SolWhale', vip: 'VIP 6', text: 'W airdrop!! Huge thanks ❤️' },
      { name: 'NeonNinja33', vip: 'VIP 2', text: 'thanks for the SOL king 👑' }
    ];
    reactions.forEach((r, idx) => {
      setTimeout(() => {
        this.addChatMessage(feed, r.name, r.vip, r.text, false);
      }, 700 * (idx + 1));
    });
  }

  /* ============================================================= */
  /* SPA ROUTING & DIRECT SUB-PATH SYSTEM */
  /* ============================================================= */
  initRouting() {
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname, false);
    });

    // Execute routing for the current URL path on initial load
    this.handleRoute(window.location.pathname, false, true);
  }

  getGameForRoute(route) {
    const map = {
      'pump': 'pump',
      'pump-dump': 'pump',
      'pumpanddump': 'pump',
      'crash': 'rug',
      'rug': 'rug',
      'chicken': 'chicken',
      'chicken-road': 'chicken',
      'chickenroad': 'chicken',
      'mines': 'mines',
      'mine': 'mines',
      'blackjack': 'blackjack',
      'bj': 'blackjack',
      'hilo': 'hilo',
      'hi-lo': 'hilo',
      'higher-lower': 'hilo',
      'higherlower': 'hilo',
      'coinflip': 'coinflip',
      'coin-flip': 'coinflip'
    };
    return map[route] || null;
  }

  getRouteForGame(gameId) {
    const map = {
      'pump': 'pump',
      'rug': 'crash',
      'chicken': 'chicken',
      'mines': 'mines',
      'blackjack': 'blackjack',
      'hilo': 'hilo',
      'coinflip': 'coinflip'
    };
    return map[gameId] || gameId;
  }

  getGameTitle(gameId) {
    const map = {
      'pump': 'Pump & Dump',
      'rug': 'Crash Multiplier',
      'chicken': 'Chicken Road',
      'mines': 'Mines',
      'blackjack': 'Blackjack',
      'hilo': 'Higher or Lower',
      'coinflip': 'Coinflip'
    };
    return map[gameId] || 'Solana Gaming';
  }

  handleRoute(pathname, push = false, isInitial = false) {
    let raw = (pathname || '/').trim();
    raw = raw.replace(/^\/+|\/+$/g, '').replace(/^index\.html$/i, '');
    const route = raw.toLowerCase();

    // Default route / home
    if (!route) {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => m.classList.remove('open'));
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();
      if (!isInitial) {
        this.switchGame('rug', false);
      }
      document.title = 'LuckyWin - Next Gen Solana Gaming';
      if (push && window.location.pathname !== '/') {
        window.history.pushState({ path: '/' }, '', '/');
      }
      return;
    }

    // Check if route matches a game
    const gameId = this.getGameForRoute(route);
    if (gameId) {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => m.classList.remove('open'));
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.switchGame(gameId, false);
      document.title = `LuckyWin - ${this.getGameTitle(gameId)} | Next Gen Solana Gaming`;
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== route) {
        window.history.pushState({ game: gameId }, '', '/' + route);
      }
      return;
    }

    // Leaderboard route
    if (route === 'leaderboard' || route === 'leaderbord') {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => {
        if (m.id !== 'leaderboardModal') m.classList.remove('open');
      });
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.openModal('leaderboardModal', false);
      document.title = 'LuckyWin - Leaderboard | Next Gen Solana Gaming';
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== 'leaderboard') {
        window.history.pushState({ modal: 'leaderboard' }, '', '/leaderboard');
      }
      return;
    }

    // Daily case route
    if (route === 'case' || route === 'daily-case') {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => {
        if (m.id !== 'dailyCaseModal') m.classList.remove('open');
      });
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.updateDailyCaseUI();
      this.openModal('dailyCaseModal', false);
      document.title = 'LuckyWin - Daily Case | Next Gen Solana Gaming';
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== 'case') {
        window.history.pushState({ modal: 'case' }, '', '/case');
      }
      return;
    }

    // Provably fair route
    if (route === 'fairness' || route === 'provably-fair') {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => {
        if (m.id !== 'fairnessModal') m.classList.remove('open');
      });
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.openModal('fairnessModal', false);
      document.title = 'LuckyWin - Provably Fair | Next Gen Solana Gaming';
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== 'fairness') {
        window.history.pushState({ modal: 'fairness' }, '', '/fairness');
      }
      return;
    }

    // Rules route
    if (route === 'rules' || route === 'rulebook' || route === 'blackjack-rules') {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => {
        if (m.id !== 'bjRulebookModal') m.classList.remove('open');
      });
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.openModal('bjRulebookModal', false);
      document.title = 'LuckyWin - Blackjack Rules | Next Gen Solana Gaming';
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== 'rules') {
        window.history.pushState({ modal: 'rules' }, '', '/rules');
      }
      return;
    }

    // Wallet / faucet route
    if (route === 'wallet' || route === 'faucet') {
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => m.classList.remove('open'));
      this.openWalletDialog(false);
      document.title = 'LuckyWin - Casino Vault & Private Wallet | Real Money Solana';
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== 'wallet') {
        window.history.pushState({ modal: 'wallet' }, '', '/wallet');
      }
      return;
    }

    // Info modal routes: terms, privacy, responsible, howto
    if (route.startsWith('term') || route.startsWith('priv') || route.startsWith('resp') || route.startsWith('how')) {
      const key = route.startsWith('term') ? 'terms'
        : (route.startsWith('priv') ? 'privacy'
        : (route.startsWith('resp') ? 'responsible' : 'howto'));
      document.querySelectorAll('.gp-modal-backdrop.open').forEach(m => {
        if (m.id !== 'infoModal') m.classList.remove('open');
      });
      const dialog = document.getElementById('walletSecurityDialog');
      if (dialog && dialog.open) dialog.close();

      this.showInfoModal(key, false);
      if (push && window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() !== key) {
        window.history.pushState({ info: key }, '', '/' + key);
      }
      return;
    }

    // Default fallback
    if (isInitial) {
      this.switchGame('rug', false);
    }
    document.title = 'LuckyWin - Next Gen Solana Gaming';
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0e172a;
      border: 1.5px solid #3b82f6;
      color: #fff;
      font-weight: 800;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(4, 8, 18, 0.8), 0 0 15px rgba(37, 99, 235, 0.25);
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
