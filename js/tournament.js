/* ---- js/tournament.js ---- */
/**
 * ARROUT - Weekly Tournament (offline).
 * One hard puzzle per ISO week (same for everyone, chosen from the week id).
 * Entry unlocks after clearing 10 different levels in the week. The best time is kept on this device.
 */
class TournamentManager {
  // Deterministic pick of one of the 200 hardest levels (801-1000) from the week id
  getWeeklyLevel(weekId) {
    let h = 2166136261;
    for (let i = 0; i < weekId.length; i++) { h ^= weekId.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 801 + (h % 200);
  }

  getWeeklyInfo() {
    const sm = window.storageManager;
    sm.checkWeeklyReset();
    const weekId = sm.data.tournamentWeekId;
    const qualifyingCount = sm.data.tournamentQualifyingLevels.length;

    // Week ends Sunday 23:59:59 UTC (ISO weeks run Monday-Sunday)
    const now = new Date();
    const daysLeft = (7 - now.getUTCDay()) % 7; // Sunday -> 0
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysLeft, 23, 59, 59);
    const ms = Math.max(0, end - now.getTime());
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    const timeRemaining = d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;

    return {
      weekId,
      level: this.getWeeklyLevel(weekId),
      qualifyingCount,
      isEligible: qualifyingCount >= 10,
      timeRemaining,
      score: sm.data.tournamentScore
    };
  }

  recordTournamentResult(timeSec) {
    return window.storageManager.recordTournamentResult(timeSec);
  }
}

window.tournamentManager = new TournamentManager();
