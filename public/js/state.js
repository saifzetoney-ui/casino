/**
 * Global State & Provably Fair Cryptographic Engine
 */
class CasinoState {
  constructor() {
    this.bankroll = parseFloat(localStorage.getItem('oddslab_bankroll')) || 1000.00;
    this.selectedChip = 25;
    this.stats = JSON.parse(localStorage.getItem('oddslab_stats')) || {
      totalWagered: 0,
      totalPayout: 0,
      betsCount: 0,
      winsCount: 0,
      lossesCount: 0,
      gamesPlayed: {
        crash: 0,
        roulette: 0,
        blackjack: 0,
        plinko: 0,
        mines: 0
      }
    };

    // Provably fair seed engine
    this.serverSeed = this.generateRandomHex(64);
    this.clientSeed = localStorage.getItem('oddslab_client_seed') || 'oddslab_edu_seed_' + Math.floor(Math.random() * 99999);
    this.nonce = parseInt(localStorage.getItem('oddslab_nonce')) || 1;
    this.serverSeedHash = '';
    this.computeServerHash();

    this.listeners = [];
  }

  // Subscribe to state changes (bankroll, stats)
  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.save();
    this.listeners.forEach(fn => fn(this));
  }

  save() {
    localStorage.setItem('oddslab_bankroll', this.bankroll.toFixed(2));
    localStorage.setItem('oddslab_stats', JSON.stringify(this.stats));
    localStorage.setItem('oddslab_client_seed', this.clientSeed);
    localStorage.setItem('oddslab_nonce', this.nonce);
  }

  setChip(val) {
    this.selectedChip = val;
    window.soundFx.playChip();
    this.notify();
  }

  canAfford(amount) {
    return this.bankroll >= amount && amount > 0;
  }

  deductBet(amount, gameName = 'general') {
    if (!this.canAfford(amount)) return false;
    this.bankroll -= amount;
    this.stats.totalWagered += amount;
    this.stats.betsCount += 1;
    if (this.stats.gamesPlayed[gameName] !== undefined) {
      this.stats.gamesPlayed[gameName] += 1;
    }
    this.notify();
    return true;
  }

  addPayout(amount, betAmount, gameName = 'general') {
    this.bankroll += amount;
    this.stats.totalPayout += amount;
    if (amount > betAmount) {
      this.stats.winsCount += 1;
    } else {
      this.stats.lossesCount += 1;
    }
    this.notify();
  }

  claimFaucet(amount = 500) {
    this.bankroll += amount;
    this.notify();
    window.soundFx.playWin();
    this.showToast(`Claimed $${amount.toFixed(2)} educational test funds!`, 'win');
  }

  resetBankroll(amount = 1000) {
    this.bankroll = amount;
    this.notify();
    window.soundFx.playWin();
    this.showToast(`Bankroll reset to $${amount.toFixed(2)}`, 'info');
  }

  resetAllStats() {
    this.stats = {
      totalWagered: 0,
      totalPayout: 0,
      betsCount: 0,
      winsCount: 0,
      lossesCount: 0,
      gamesPlayed: { crash: 0, roulette: 0, blackjack: 0, plinko: 0, mines: 0 }
    };
    this.bankroll = 1000.00;
    this.notify();
    this.showToast('Stats and bankroll cleared!', 'info');
  }

  // Provably Fair Utilities
  generateRandomHex(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  async computeServerHash() {
    this.serverSeedHash = await this.sha256(this.serverSeed);
  }

  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Deterministically returns a float in [0, 1) using SHA-256(serverSeed:clientSeed:nonce)
   */
  async getNextProvableOutcome() {
    const rawString = `${this.serverSeed}:${this.clientSeed}:${this.nonce}`;
    const hash = await this.sha256(rawString);
    
    // Take first 8 characters (32 bits) of hex hash
    const subHex = hash.substring(0, 8);
    const intVal = parseInt(subHex, 16);
    const outcomeFloat = intVal / 0x100000000;

    const previousSeed = this.serverSeed;
    const previousHash = this.serverSeedHash;
    const currentNonce = this.nonce;

    // Advance nonce and generate new seed periodically for next game
    this.nonce += 1;
    this.save();

    return {
      float: outcomeFloat,
      hash,
      serverSeed: previousSeed,
      serverSeedHash: previousHash,
      clientSeed: this.clientSeed,
      nonce: currentNonce
    };
  }

  setClientSeed(seed) {
    this.clientSeed = seed.trim() || 'default_seed';
    this.save();
    this.showToast('Client seed updated!', 'info');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'win') icon = '🎉';
    if (type === 'loss') icon = '💥';
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.casinoState = new CasinoState();
