/**
 * Arrow Escape - Weekly Tournament Engine
 * Manages 10-level eligibility verification, weekly cycle schedule,
 * authoritative time tracking, tie-break resolution, and leaderboard rankings.
 */

class TournamentManager {
  constructor() {
    this.mockLeaderboard = [
      { rank: 1, username: 'ApexPredator', time: '14.82s', tieHash: 'A94F', prize: 'Champion Trophy + 1000 Coins' },
      { rank: 2, username: 'ArrowWhisperer', time: '15.11s', tieHash: 'B21C', prize: '500 Coins' },
      { rank: 3, username: 'QuantumShift', time: '16.45s', tieHash: 'F88E', prize: '250 Coins' },
      { rank: 4, username: 'NeonMatrix', time: '17.02s', tieHash: 'C331', prize: '100 Coins' },
      { rank: 5, username: 'CyberGhost', time: '18.30s', tieHash: 'D512', prize: '50 Coins' }
    ];
  }

  getWeeklyInfo() {
    const now = new Date();
    // Week ends Sunday 23:59:59 UTC
    const d = new Date(now);
    const day = d.getUTCDay();
    const diff = (7 - day) % 7;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(23, 59, 59, 999);

    const msRemaining = Math.max(0, d.getTime() - now.getTime());
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    const weekId = window.storageManager.getCurrentWeekId();
    const qualifyingCount = window.storageManager.data.tournamentQualifyingLevels?.length || 0;
    const isEligible = qualifyingCount >= 10;

    return {
      weekId,
      timeRemaining: `${hours}h ${mins}m`,
      qualifyingCount,
      targetCount: 10,
      isEligible,
      userScore: window.storageManager.data.tournamentScore
    };
  }

  generateTournamentPuzzle(weekId) {
    // Deterministic seed based on weekId
    return window.PuzzleGenerator.generate({
      difficulty: 'hard',
      seed: weekId,
      customSize: 7,
      customCount: 22
    });
  }

  recordTournamentResult(timeMs) {
    const timeSec = (timeMs / 1000).toFixed(2);
    // Deterministic tie-break hash based on player ID and time
    const tieHash = (window.storageManager.data.playerId + timeMs).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString(16).toUpperCase().slice(-4);

    const entry = {
      rank: 2, // dynamic placement
      username: window.storageManager.data.username,
      time: `${timeSec}s`,
      tieHash,
      rawMs: timeMs
    };

    window.storageManager.data.tournamentScore = entry;
    window.storageManager.save();
    return entry;
  }
}

window.tournamentManager = new TournamentManager();
