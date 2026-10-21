/**
 * Game: Mines (5x5 Probability & Risk/Reward Grid)
 * Teaches exponential decay of compound survival probability,
 * showing live odds for every successive tile pick and mathematical multiplier scaling.
 */
class MinesGame {
  constructor() {
    this.gridSize = 25; // 5x5
    this.mineCount = 3;
    this.betAmount = 25;
    this.grid = []; // Array of { isMine, revealed }
    this.revealedCount = 0;
    this.isPlaying = false;
    this.currentMultiplier = 1.0;

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderBoard();
    this.updateOddsDisplay();
  }

  bindEvents() {
    const startBtn = document.getElementById('minesStartBtn');
    const cashoutBtn = document.getElementById('minesCashoutBtn');
    const betInput = document.getElementById('minesBetInput');
    const mineSelect = document.getElementById('minesCountSelect');

    if (startBtn) startBtn.addEventListener('click', () => this.startGame());
    if (cashoutBtn) cashoutBtn.addEventListener('click', () => this.cashout());

    if (mineSelect) {
      mineSelect.addEventListener('change', (e) => {
        if (this.isPlaying) return;
        this.mineCount = parseInt(e.target.value) || 3;
        this.updateOddsDisplay();
      });
    }

    if (betInput) {
      betInput.addEventListener('change', (e) => {
        this.betAmount = Math.max(1, parseFloat(e.target.value) || 10);
      });
    }

    window.casinoState.subscribe(() => {
      if (!this.isPlaying && betInput) {
        betInput.value = window.casinoState.selectedChip;
        this.betAmount = window.casinoState.selectedChip;
      }
    });
  }

  /**
   * Calculates combinatorial fair multiplier with 1% house edge
   */
  calculateMultiplier(diamondsRevealed) {
    if (diamondsRevealed === 0) return 1.0;
    const houseEdge = 0.99; // 1% edge

    // Combinations: C(n, k) = n! / (k! * (n-k)!)
    const n = 25;
    const d = 25 - this.mineCount; // total diamonds available

    // Cumulative probability of surviving k picks:
    // P = (d / n) * ((d-1) / (n-1)) * ... * ((d - k + 1) / (n - k + 1))
    let prob = 1.0;
    for (let i = 0; i < diamondsRevealed; i++) {
      prob *= (d - i) / (n - i);
    }

    const fairMult = houseEdge / prob;
    return Math.floor(fairMult * 100) / 100;
  }

  getProbabilityNextTile() {
    const remainingTiles = 25 - this.revealedCount;
    const remainingGems = (25 - this.mineCount) - this.revealedCount;
    if (remainingTiles <= 0 || remainingGems <= 0) return 0;
    return (remainingGems / remainingTiles) * 100;
  }

  getCumulativeSurvivalProb() {
    let prob = 1.0;
    const n = 25;
    const d = 25 - this.mineCount;
    for (let i = 0; i < this.revealedCount; i++) {
      prob *= (d - i) / (n - i);
    }
    return prob * 100;
  }

  startGame() {
    if (this.isPlaying) return;

    if (!window.casinoState.canAfford(this.betAmount)) {
      window.casinoState.showToast('Insufficient bankroll! Use Faucet.', 'loss');
      return;
    }

    window.casinoState.deductBet(this.betAmount, 'mines');

    this.isPlaying = true;
    this.revealedCount = 0;
    this.currentMultiplier = 1.0;

    // Distribute Mines randomly
    this.grid = new Array(25).fill(null).map(() => ({ isMine: false, revealed: false }));
    let placedMines = 0;
    while (placedMines < this.mineCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!this.grid[idx].isMine) {
        this.grid[idx].isMine = true;
        placedMines++;
      }
    }

    // UI Buttons
    document.getElementById('minesStartBtn').style.display = 'none';
    const cashoutBtn = document.getElementById('minesCashoutBtn');
    cashoutBtn.style.display = 'flex';
    cashoutBtn.textContent = 'CASHOUT (0 Gems)';
    cashoutBtn.disabled = true;

    this.renderBoard();
    this.updateOddsDisplay();
    window.soundFx.playCard();
  }

  pickTile(index) {
    if (!this.isPlaying) return;
    const cell = this.grid[index];
    if (cell.revealed) return;

    cell.revealed = true;

    if (cell.isMine) {
      // Hit a mine!
      this.triggerMineBust(index);
    } else {
      // Safe Gem!
      this.revealedCount++;
      this.currentMultiplier = this.calculateMultiplier(this.revealedCount);

      window.soundFx.playGem();
      this.renderBoard();
      this.updateOddsDisplay();

      const cashoutBtn = document.getElementById('minesCashoutBtn');
      const liveWin = (this.betAmount * this.currentMultiplier).toFixed(2);
      cashoutBtn.disabled = false;
      cashoutBtn.textContent = `CASHOUT $${liveWin} (${this.currentMultiplier}x)`;

      // Check if all gems found
      if (this.revealedCount === (25 - this.mineCount)) {
        this.cashout();
      }
    }
  }

  cashout() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const winAmount = this.betAmount * this.currentMultiplier;
    const profit = winAmount - this.betAmount;

    window.casinoState.addPayout(winAmount, this.betAmount, 'mines');
    window.soundFx.playWin();
    window.casinoState.showToast(`Mines Win! Cashed out $${winAmount.toFixed(2)} (${this.currentMultiplier}x)`, 'win');

    this.revealAllTiles();
    this.resetControls();
  }

  triggerMineBust(hitIndex) {
    this.isPlaying = false;
    window.soundFx.playCrash();
    window.casinoState.addPayout(0, this.betAmount, 'mines');
    window.casinoState.showToast(`BOOM! Hit a mine. Lost $${this.betAmount.toFixed(2)}`, 'loss');

    this.revealAllTiles(hitIndex);
    this.resetControls();
  }

  revealAllTiles(explodedIndex = null) {
    this.grid.forEach((c, idx) => {
      c.revealed = true;
    });
    this.renderBoard(explodedIndex);
  }

  resetControls() {
    document.getElementById('minesStartBtn').style.display = 'flex';
    document.getElementById('minesCashoutBtn').style.display = 'none';
  }

  updateOddsDisplay() {
    const nextProbEl = document.getElementById('minesNextProb');
    const cumProbEl = document.getElementById('minesCumProb');
    const multEl = document.getElementById('minesCurrentMult');

    if (nextProbEl) nextProbEl.textContent = `${this.getProbabilityNextTile().toFixed(1)}%`;
    if (cumProbEl) cumProbEl.textContent = `${this.getCumulativeSurvivalProb().toFixed(2)}%`;
    if (multEl) multEl.textContent = `${this.currentMultiplier.toFixed(2)}x`;
  }

  renderBoard(explodedIndex = null) {
    const gridContainer = document.getElementById('minesGridContainer');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    this.grid.forEach((cell, idx) => {
      const tile = document.createElement('div');
      tile.className = 'mine-tile';

      if (cell.revealed) {
        if (cell.isMine) {
          tile.classList.add('revealed-bomb');
          tile.textContent = '💣';
          if (idx === explodedIndex) {
            tile.style.boxShadow = '0 0 20px #f43f5e';
          }
        } else {
          tile.classList.add('revealed-gem');
          tile.textContent = '💎';
        }
      } else {
        if (!this.isPlaying) {
          tile.classList.add('disabled');
        } else {
          tile.addEventListener('click', () => this.pickTile(idx));
        }
      }

      gridContainer.appendChild(tile);
    });
  }
}

window.minesGame = null;
