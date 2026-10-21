/**
 * Game: Blackjack 21 & Basic Strategy Coach
 * Features standard casino blackjack rules, 6-deck shoe, realistic card rendering,
 * real-time Basic Strategy mentor engine, and Hi-Lo card counting tracker.
 */
class BlackjackGame {
  constructor() {
    this.deck = [];
    this.playerHands = [[]]; // Supports splitting
    this.dealerHand = [];
    this.currentHandIndex = 0;
    this.betAmount = 25;
    this.handBets = [25];
    this.gameState = 'betting'; // 'betting', 'player_turn', 'dealer_turn', 'complete'

    // Hi-Lo Card Counting metrics
    this.runningCount = 0;
    this.decksRemaining = 6;

    this.suits = ['♠', '♥', '♦', '♣'];
    this.values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    this.init();
  }

  init() {
    this.buildShoe(6);
    this.bindEvents();
    this.updateUI();
  }

  buildShoe(deckCount = 6) {
    this.deck = [];
    for (let d = 0; d < deckCount; d++) {
      for (const suit of this.suits) {
        for (const val of this.values) {
          let numVal = parseInt(val);
          if (['J', 'Q', 'K'].includes(val)) numVal = 10;
          if (val === 'A') numVal = 11;
          this.deck.push({ suit, val, numVal });
        }
      }
    }
    this.shuffle();
    this.runningCount = 0;
    this.decksRemaining = deckCount;
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCard() {
    if (this.deck.length < 20) {
      this.buildShoe(6);
      window.casinoState.showToast('Shoe reshuffled!', 'info');
    }
    const card = this.deck.pop();

    // Hi-Lo update
    if (['2', '3', '4', '5', '6'].includes(card.val)) {
      this.runningCount += 1;
    } else if (['10', 'J', 'Q', 'K', 'A'].includes(card.val)) {
      this.runningCount -= 1;
    }
    this.decksRemaining = Math.max(1, Math.round(this.deck.length / 52));

    window.soundFx.playCard();
    return card;
  }

  getHandValue(hand) {
    let sum = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.val === 'A') {
        aces += 1;
        sum += 11;
      } else {
        sum += card.numVal;
      }
    }
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces -= 1;
    }
    const isSoft = aces > 0 && sum <= 21;
    return { total: sum, isSoft, isBust: sum > 21, isBlackjack: hand.length === 2 && sum === 21 };
  }

  /**
   * The Mathematically Solved Basic Strategy Matrix
   * Returns: 'H' (Hit), 'S' (Stand), 'D' (Double if allowed, else Hit), 'P' (Split)
   */
  getBasicStrategyRecommendation() {
    if (this.gameState !== 'player_turn') return null;

    const currentHand = this.playerHands[this.currentHandIndex];
    if (!currentHand || currentHand.length === 0 || !this.dealerHand[0]) return null;

    const dealerUp = this.dealerHand[0].numVal; // 2 to 11
    const { total, isSoft } = this.getHandValue(currentHand);

    // Pair splitting
    if (currentHand.length === 2 && currentHand[0].val === currentHand[1].val) {
      const v = currentHand[0].val;
      if (v === 'A' || v === '8') return { action: 'Split', code: 'P', why: 'Always split Aces and 8s for maximum EV.' };
      if (['2', '3', '7'].includes(v) && dealerUp >= 2 && dealerUp <= 7) return { action: 'Split', code: 'P', why: `Split ${v}s against weak dealer upcard (${dealerUp}).` };
      if (v === '4' && (dealerUp === 5 || dealerUp === 6)) return { action: 'Split', code: 'P', why: 'Split 4s only against dealer 5 or 6.' };
      if (v === '6' && dealerUp >= 2 && dealerUp <= 6) return { action: 'Split', code: 'P', why: 'Split 6s when dealer has bust card.' };
      if (v === '9' && dealerUp !== 7 && dealerUp !== 10 && dealerUp !== 11) return { action: 'Split', code: 'P', why: 'Split 9s against dealer 2-6, 8, 9.' };
    }

    // Soft Hands (Contains Ace counted as 11)
    if (isSoft && currentHand.length === 2) {
      if (total >= 20) return { action: 'Stand', code: 'S', why: 'Soft 20 is already an elite winning hand.' };
      if (total === 19) {
        if (dealerUp === 6) return { action: 'Double', code: 'D', why: 'Double soft 19 vs dealer 6 to punish bust card.' };
        return { action: 'Stand', code: 'S', why: 'Stand on soft 19.' };
      }
      if (total === 18) {
        if (dealerUp >= 2 && dealerUp <= 6) return { action: 'Double', code: 'D', why: 'Double soft 18 against dealer 2 through 6.' };
        if (dealerUp >= 7 && dealerUp <= 8) return { action: 'Stand', code: 'S', why: 'Stand soft 18 vs dealer 7 or 8.' };
        return { action: 'Hit', code: 'H', why: 'Hit soft 18 vs dealer 9, 10, Ace because 18 is an underdog.' };
      }
      if (total === 17) {
        if (dealerUp >= 3 && dealerUp <= 6) return { action: 'Double', code: 'D', why: 'Double soft 17 vs dealer 3-6.' };
        return { action: 'Hit', code: 'H', why: 'Never stand on soft 17 (a free hit with zero bust risk).' };
      }
      if (total >= 15 && total <= 16) {
        if (dealerUp >= 4 && dealerUp <= 6) return { action: 'Double', code: 'D', why: 'Double soft 15-16 vs dealer 4-6.' };
        return { action: 'Hit', code: 'H', why: 'Hit soft hands with zero bust risk.' };
      }
      if (total >= 13 && total <= 14) {
        if (dealerUp >= 5 && dealerUp <= 6) return { action: 'Double', code: 'D', why: 'Double soft 13-14 vs dealer 5-6.' };
        return { action: 'Hit', code: 'H', why: 'Hit soft hands.' };
      }
    }

    // Hard Hands
    if (total >= 17) return { action: 'Stand', code: 'S', why: 'Hard 17+ has excessive bust probability (~70-85%). Always stand.' };
    if (total >= 13 && total <= 16) {
      if (dealerUp >= 2 && dealerUp <= 6) {
        return { action: 'Stand', code: 'S', why: `Dealer is showing ${dealerUp} (high bust chance ~35-42%). Do not risk busting!` };
      }
      return { action: 'Hit', code: 'H', why: `Dealer showing ${dealerUp} will likely make 17-21. You must hit hard ${total} despite risk.` };
    }
    if (total === 12) {
      if (dealerUp >= 4 && dealerUp <= 6) return { action: 'Stand', code: 'S', why: 'Stand 12 vs dealer 4-6.' };
      return { action: 'Hit', code: 'H', why: 'Hit 12 against dealer 2, 3 or 7+.' };
    }
    if (total === 11) return { action: 'Double', code: 'D', why: '11 is the most profitable double-down in blackjack.' };
    if (total === 10) {
      if (dealerUp >= 2 && dealerUp <= 9) return { action: 'Double', code: 'D', why: 'Double 10 against dealer 2-9.' };
      return { action: 'Hit', code: 'H', why: 'Hit 10 vs dealer 10 or Ace.' };
    }
    if (total === 9) {
      if (dealerUp >= 3 && dealerUp <= 6) return { action: 'Double', code: 'D', why: 'Double 9 vs dealer 3-6.' };
      return { action: 'Hit', code: 'H', why: 'Hit 9 against other upcards.' };
    }

    return { action: 'Hit', code: 'H', why: 'Total 8 or less: always hit.' };
  }

  bindEvents() {
    const dealBtn = document.getElementById('bjDealBtn');
    const hitBtn = document.getElementById('bjHitBtn');
    const standBtn = document.getElementById('bjStandBtn');
    const doubleBtn = document.getElementById('bjDoubleBtn');
    const splitBtn = document.getElementById('bjSplitBtn');
    const betInput = document.getElementById('bjBetInput');

    if (dealBtn) dealBtn.addEventListener('click', () => this.deal());
    if (hitBtn) hitBtn.addEventListener('click', () => this.hit());
    if (standBtn) standBtn.addEventListener('click', () => this.stand());
    if (doubleBtn) doubleBtn.addEventListener('click', () => this.double());
    if (splitBtn) splitBtn.addEventListener('click', () => this.split());

    if (betInput) {
      betInput.addEventListener('change', (e) => {
        this.betAmount = Math.max(5, parseFloat(e.target.value) || 25);
      });
    }

    window.casinoState.subscribe(() => {
      if (this.gameState === 'betting') {
        if (betInput) betInput.value = window.casinoState.selectedChip;
        this.betAmount = window.casinoState.selectedChip;
      }
    });
  }

  deal() {
    if (this.gameState !== 'betting') return;

    if (!window.casinoState.canAfford(this.betAmount)) {
      window.casinoState.showToast('Insufficient bankroll! Top up via Faucet.', 'loss');
      return;
    }

    window.casinoState.deductBet(this.betAmount, 'blackjack');

    this.playerHands = [[]];
    this.handBets = [this.betAmount];
    this.dealerHand = [];
    this.currentHandIndex = 0;
    this.gameState = 'player_turn';

    // Deal 2 cards to player, 2 to dealer
    this.playerHands[0].push(this.drawCard());
    this.dealerHand.push(this.drawCard());
    this.playerHands[0].push(this.drawCard());
    this.dealerHand.push(this.drawCard());

    const playerVal = this.getHandValue(this.playerHands[0]);
    const dealerVal = this.getHandValue(this.dealerHand);

    // Natural Blackjack check
    if (playerVal.isBlackjack) {
      if (dealerVal.isBlackjack) {
        this.gameState = 'complete';
        this.resolvePush();
      } else {
        this.gameState = 'complete';
        this.resolvePlayerBlackjack();
      }
    }

    this.updateUI();
  }

  hit() {
    if (this.gameState !== 'player_turn') return;

    const coach = this.getBasicStrategyRecommendation();
    if (coach && coach.action === 'Stand') {
      window.casinoState.showToast(`Strategy Alert: Basic strategy advises to STAND here!`, 'loss');
    }

    const hand = this.playerHands[this.currentHandIndex];
    hand.push(this.drawCard());

    const val = this.getHandValue(hand);
    if (val.isBust) {
      window.casinoState.showToast(`Busted with ${val.total}!`, 'loss');
      this.nextHandOrDealer();
    } else if (val.total === 21) {
      this.nextHandOrDealer();
    }

    this.updateUI();
  }

  stand() {
    if (this.gameState !== 'player_turn') return;

    const coach = this.getBasicStrategyRecommendation();
    if (coach && coach.action === 'Hit') {
      window.casinoState.showToast(`Strategy Alert: Basic strategy advises to HIT here!`, 'loss');
    }

    this.nextHandOrDealer();
    this.updateUI();
  }

  double() {
    if (this.gameState !== 'player_turn') return;
    const hand = this.playerHands[this.currentHandIndex];
    if (hand.length !== 2) return;

    const currentBet = this.handBets[this.currentHandIndex];
    if (!window.casinoState.canAfford(currentBet)) {
      window.casinoState.showToast('Insufficient bankroll to double down!', 'loss');
      return;
    }

    window.casinoState.deductBet(currentBet, 'blackjack');
    this.handBets[this.currentHandIndex] *= 2;

    hand.push(this.drawCard());
    this.nextHandOrDealer();
    this.updateUI();
  }

  split() {
    if (this.gameState !== 'player_turn') return;
    const hand = this.playerHands[this.currentHandIndex];
    if (hand.length !== 2 || hand[0].val !== hand[1].val) return;

    const currentBet = this.handBets[this.currentHandIndex];
    if (!window.casinoState.canAfford(currentBet)) {
      window.casinoState.showToast('Insufficient bankroll to split!', 'loss');
      return;
    }

    window.casinoState.deductBet(currentBet, 'blackjack');

    // Split into two hands
    const secondCard = hand.pop();
    const newHand = [secondCard];
    this.playerHands.push(newHand);
    this.handBets.push(currentBet);

    hand.push(this.drawCard());
    newHand.push(this.drawCard());

    this.updateUI();
  }

  nextHandOrDealer() {
    if (this.currentHandIndex < this.playerHands.length - 1) {
      this.currentHandIndex += 1;
    } else {
      this.playDealerTurn();
    }
  }

  playDealerTurn() {
    this.gameState = 'dealer_turn';

    // Check if all player hands busted
    const allBusted = this.playerHands.every(h => this.getHandValue(h).isBust);

    if (!allBusted) {
      // Dealer hits until soft 17 or hard 17+
      while (this.getHandValue(this.dealerHand).total < 17) {
        this.dealerHand.push(this.drawCard());
      }
    }

    this.gameState = 'complete';
    this.resolveAllHands();
    this.updateUI();
  }

  resolvePlayerBlackjack() {
    const bet = this.handBets[0];
    const payout = bet * 2.5; // 3:2 payout (returns 2.5x original bet)
    window.casinoState.addPayout(payout, bet, 'blackjack');
    window.soundFx.playWin();
    window.casinoState.showToast(`BLACKJACK! Paid 3 to 2 (+${payout.toFixed(2)})`, 'win');
  }

  resolvePush() {
    const bet = this.handBets[0];
    window.casinoState.addPayout(bet, bet, 'blackjack');
    window.casinoState.showToast('Push! Both hold Blackjack.', 'info');
  }

  resolveAllHands() {
    const dealerVal = this.getHandValue(this.dealerHand);

    this.playerHands.forEach((hand, idx) => {
      const bet = this.handBets[idx];
      const pVal = this.getHandValue(hand);

      if (pVal.isBust) {
        window.casinoState.addPayout(0, bet, 'blackjack');
      } else if (dealerVal.isBust) {
        window.casinoState.addPayout(bet * 2, bet, 'blackjack');
        window.soundFx.playWin();
        window.casinoState.showToast(`Dealer Busted with ${dealerVal.total}! Won +$${(bet * 2).toFixed(2)}`, 'win');
      } else if (pVal.total > dealerVal.total) {
        window.casinoState.addPayout(bet * 2, bet, 'blackjack');
        window.soundFx.playWin();
        window.casinoState.showToast(`Player ${pVal.total} beats Dealer ${dealerVal.total}! Won +$${(bet * 2).toFixed(2)}`, 'win');
      } else if (pVal.total < dealerVal.total) {
        window.casinoState.addPayout(0, bet, 'blackjack');
        window.soundFx.playCrash();
        window.casinoState.showToast(`Dealer ${dealerVal.total} beats Player ${pVal.total}.`, 'loss');
      } else {
        window.casinoState.addPayout(bet, bet, 'blackjack');
        window.casinoState.showToast(`Push on Hand ${idx + 1} (${pVal.total} each).`, 'info');
      }
    });

    setTimeout(() => {
      this.gameState = 'betting';
      this.updateUI();
    }, 2500);
  }

  renderCard(card, isHidden = false) {
    if (isHidden) {
      return `<div class="playing-card card-back"><span>🂠</span></div>`;
    }

    const isRed = card.suit === '♥' || card.suit === '♦';
    const colorClass = isRed ? 'card-red' : 'card-black';

    return `
      <div class="playing-card ${colorClass}">
        <div class="card-corner-top">
          <span class="card-val">${card.val}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
        <div class="card-center-symbol">${card.suit}</div>
        <div class="card-corner-bottom">
          <span class="card-val">${card.val}</span>
          <span class="card-suit">${card.suit}</span>
        </div>
      </div>
    `;
  }

  updateUI() {
    // Dealer Cards
    const dealerContainer = document.getElementById('bjDealerCards');
    const dealerScore = document.getElementById('bjDealerScore');
    if (dealerContainer) {
      if (this.dealerHand.length === 0) {
        dealerContainer.innerHTML = '';
        dealerScore.textContent = '0';
      } else if (this.gameState === 'player_turn') {
        dealerContainer.innerHTML = this.renderCard(this.dealerHand[0]) + this.renderCard(null, true);
        dealerScore.textContent = this.dealerHand[0].numVal;
      } else {
        dealerContainer.innerHTML = this.dealerHand.map(c => this.renderCard(c)).join('');
        dealerScore.textContent = this.getHandValue(this.dealerHand).total;
      }
    }

    // Player Cards
    const playerContainer = document.getElementById('bjPlayerCards');
    const playerScore = document.getElementById('bjPlayerScore');
    if (playerContainer) {
      const activeHand = this.playerHands[this.currentHandIndex] || [];
      playerContainer.innerHTML = activeHand.map(c => this.renderCard(c)).join('');
      const pVal = this.getHandValue(activeHand);
      playerScore.textContent = pVal.total > 0 ? (pVal.isSoft ? `Soft ${pVal.total}` : pVal.total) : '0';
    }

    // Buttons
    const isTurn = this.gameState === 'player_turn';
    const dealBtn = document.getElementById('bjDealBtn');
    const hitBtn = document.getElementById('bjHitBtn');
    const standBtn = document.getElementById('bjStandBtn');
    const doubleBtn = document.getElementById('bjDoubleBtn');
    const splitBtn = document.getElementById('bjSplitBtn');

    if (dealBtn) dealBtn.disabled = isTurn || this.gameState === 'dealer_turn';
    if (hitBtn) hitBtn.disabled = !isTurn;
    if (standBtn) standBtn.disabled = !isTurn;

    const currentHand = this.playerHands[this.currentHandIndex] || [];
    if (doubleBtn) doubleBtn.disabled = !isTurn || currentHand.length !== 2;
    if (splitBtn) splitBtn.disabled = !isTurn || currentHand.length !== 2 || currentHand[0].val !== currentHand[1].val;

    // Strategy Coach
    const coachBox = document.getElementById('bjCoachAction');
    const coachWhy = document.getElementById('bjCoachWhy');
    const rec = this.getBasicStrategyRecommendation();

    if (rec && isTurn) {
      coachBox.className = `coach-action-badge coach-${rec.action.toLowerCase()}`;
      coachBox.textContent = `OPTIMAL: ${rec.action}`;
      coachWhy.textContent = rec.why;
    } else {
      if (coachBox) coachBox.textContent = 'Awaiting Deal...';
      if (coachBox) coachBox.className = 'coach-action-badge';
      if (coachWhy) coachWhy.textContent = 'Follow mathematically optimal Basic Strategy to reduce house edge to ~0.5%.';
    }

    // Hi-Lo Counting HUD
    const trueCount = (this.runningCount / this.decksRemaining).toFixed(1);
    const countEl = document.getElementById('bjCountMetrics');
    if (countEl) {
      countEl.innerHTML = `Running: <strong>${this.runningCount > 0 ? '+' : ''}${this.runningCount}</strong> | True Count: <strong>${trueCount > 0 ? '+' : ''}${trueCount}</strong> (${this.decksRemaining} decks left)`;
    }
  }
}

window.blackjackGame = null;
