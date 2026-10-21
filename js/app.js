/**
 * Main Application Orchestrator for OddsLab
 * Manages routing tabs, chip stack interactions, audio toggles, and state bindings.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Global Audio Icon
  const muteBtn = document.getElementById('soundToggleBtn');
  const updateMuteUI = () => {
    if (muteBtn) {
      const isMuted = window.soundFx.isMuted();
      muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
      muteBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    }
  };
  updateMuteUI();

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      window.soundFx.toggleMute();
      updateMuteUI();
    });
  }

  // Bankroll Faucet button
  const faucetBtn = document.getElementById('claimFaucetBtn');
  if (faucetBtn) {
    faucetBtn.addEventListener('click', () => {
      window.casinoState.claimFaucet(500);
    });
  }

  // Update bankroll in UI on state changes
  const updateBankrollUI = (state) => {
    const bankrollEl = document.getElementById('headerBankroll');
    if (bankrollEl) {
      bankrollEl.textContent = `$${state.bankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Update global realized stats in footer or modal
    const wageredEl = document.getElementById('statTotalWagered');
    const returnedEl = document.getElementById('statTotalPayout');
    const rtpEl = document.getElementById('statRealizedRTP');

    if (wageredEl) wageredEl.textContent = `$${state.stats.totalWagered.toFixed(2)}`;
    if (returnedEl) returnedEl.textContent = `$${state.stats.totalPayout.toFixed(2)}`;
    if (rtpEl) {
      const rtp = state.stats.totalWagered > 0
        ? ((state.stats.totalPayout / state.stats.totalWagered) * 100).toFixed(1)
        : '100.0';
      rtpEl.textContent = `${rtp}%`;
    }
  };

  window.casinoState.subscribe(updateBankrollUI);
  updateBankrollUI(window.casinoState);

  // Chip Selector Tray
  document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.casino-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = parseFloat(chip.dataset.chipVal) || 25;
      window.casinoState.setChip(val);
    });
  });

  // Quick Bet Modifiers (Half, Double, Max)
  const halfBtn = document.getElementById('quickBetHalf');
  const doubleBtn = document.getElementById('quickBetDouble');
  const maxBtn = document.getElementById('quickBetMax');

  if (halfBtn) {
    halfBtn.addEventListener('click', () => {
      const newVal = Math.max(1, Math.floor(window.casinoState.selectedChip / 2));
      window.casinoState.setChip(newVal);
    });
  }
  if (doubleBtn) {
    doubleBtn.addEventListener('click', () => {
      const newVal = Math.min(window.casinoState.bankroll, window.casinoState.selectedChip * 2);
      window.casinoState.setChip(newVal);
    });
  }
  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      window.casinoState.setChip(Math.floor(window.casinoState.bankroll));
    });
  }

  // Tab Navigation Switching
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const gameViews = document.querySelectorAll('.game-view-panel');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.dataset.targetView;
      gameViews.forEach(view => {
        view.classList.toggle('active', view.id === targetId);
      });

      window.soundFx.playClick();

      // Trigger resize for newly visible canvas
      window.dispatchEvent(new Event('resize'));
    });
  });

  // Initialize Games
  window.crashGame = new CrashGame();
  window.rouletteGame = new RouletteGame();
  window.blackjackGame = new BlackjackGame();
  window.plinkoGame = new PlinkoGame();
  window.minesGame = new MinesGame();
  window.educationalLab = new EducationalLab();

  // Reset Bankroll Modal / Quick Reset
  const resetBtn = document.getElementById('resetBankrollBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset bankroll to $1,000 and clear history?')) {
        window.casinoState.resetAllStats();
      }
    });
  }
});
