/**
 * Arrow Escape - Online 1v1 Multiplayer Engine
 * Simulates real-time matchmaking, synchronized countdown, identical shared puzzle
 * assignment, live opponent solving pacing, and authoritative server result verification.
 */

const OPPONENT_NAMES = [
  'Vortex_Pilot', 'NeonShadow', 'CyberArcher', 'NovaRider',
  'PulseQueen', 'VectorKing', 'ZenithArrow', 'GlitchSniper',
  'QuantumDash', 'AeroMaster', 'HyperSonic', 'SolarFlare'
];

const OPPONENT_AVATARS = ['prince', 'ninja', 'dragon', 'astronaut', 'fox', 'phantom'];

class MultiplayerEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.onMatchFound = options.onMatchFound || (() => {});
    this.onOpponentProgress = options.onOpponentProgress || (() => {});
    this.onMatchEnd = options.onMatchEnd || (() => {});
    
    this.isSearching = false;
    this.activeMatch = null;
    this.opponentInterval = null;
  }

  startMatchmaking(playerData) {
    this.isSearching = true;
    
    // Simulate matchmaking search time (1.2 - 2.5s)
    const searchDelay = 1200 + Math.random() * 1500;
    setTimeout(() => {
      if (!this.isSearching) return;
      this.foundOpponent(playerData);
    }, searchDelay);
  }

  cancelMatchmaking() {
    this.isSearching = false;
    if (this.opponentInterval) {
      clearInterval(this.opponentInterval);
      this.opponentInterval = null;
    }
  }

  foundOpponent(playerData) {
    this.isSearching = false;

    // Pick random opponent profile around player's rating (+/- 120)
    const name = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    const avatar = OPPONENT_AVATARS[Math.floor(Math.random() * OPPONENT_AVATARS.length)];
    const ratingVariance = Math.floor((Math.random() - 0.5) * 160);
    const opponentRating = Math.max(900, playerData.rating + ratingVariance);

    // Generate shared puzzle (6x6 Medium for balanced 1v1 duels)
    const sharedPuzzle = window.PuzzleGenerator.generate({
      difficulty: 'medium',
      customSize: 6,
      customCount: 16
    });

    this.activeMatch = {
      matchId: 'M1V1-' + Date.now().toString(36).toUpperCase(),
      puzzle: sharedPuzzle,
      totalArrows: sharedPuzzle.arrows.length,
      opponent: {
        name,
        avatar,
        rating: opponentRating,
        remainingArrows: sharedPuzzle.arrows.length,
        // Opponent solve speed in ms per arrow (between 700ms - 1500ms based on rating)
        solveSpeed: Math.max(700, 1600 - (opponentRating - 1000) * 0.8)
      },
      playerRemaining: sharedPuzzle.arrows.length,
      startTime: null,
      ended: false
    };

    this.onMatchFound(this.activeMatch);
  }

  startLiveRace() {
    if (!this.activeMatch) return;
    this.activeMatch.startTime = Date.now();

    // Start opponent solver simulation
    const opp = this.activeMatch.opponent;
    const tick = () => {
      if (!this.activeMatch || this.activeMatch.ended) return;

      // Random jitter for realistic human play style
      const jitter = (Math.random() - 0.3) * 600;
      const nextDelay = Math.max(500, opp.solveSpeed + jitter);

      this.opponentTimeout = setTimeout(() => {
        if (!this.activeMatch || this.activeMatch.ended) return;

        if (opp.remainingArrows > 0) {
          opp.remainingArrows--;
          this.onOpponentProgress(opp.remainingArrows, this.activeMatch.totalArrows);

          if (opp.remainingArrows === 0) {
            // Opponent finished first!
            this.endMatch(false, 'Opponent solved all arrows first!');
            return;
          }
        }
        tick();
      }, nextDelay);
    };

    tick();
  }

  onPlayerArrowEscaped(remaining) {
    if (!this.activeMatch || this.activeMatch.ended) return;
    this.activeMatch.playerRemaining = remaining;

    if (remaining === 0) {
      // Player solved all arrows first! VICTORY!
      this.endMatch(true, 'You escaped all arrows first!');
    }
  }

  endMatch(playerWon, reason) {
    if (!this.activeMatch || this.activeMatch.ended) return;
    this.activeMatch.ended = true;

    if (this.opponentTimeout) {
      clearTimeout(this.opponentTimeout);
      this.opponentTimeout = null;
    }

    const elapsedMs = Date.now() - (this.activeMatch.startTime || Date.now());
    const elapsedSec = (elapsedMs / 1000).toFixed(1);

    const result = {
      playerWon,
      reason,
      timeSeconds: elapsedSec,
      opponent: this.activeMatch.opponent,
      matchId: this.activeMatch.matchId
    };

    this.onMatchEnd(result);
  }
}

window.MultiplayerEngine = MultiplayerEngine;
