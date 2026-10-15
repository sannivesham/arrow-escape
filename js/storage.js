/**
 * Arrow Escape - Persistent Storage & Account System
 * Manages player state, anti-farming coin wallet, weekly tournament eligibility,
 * owned cosmetics, and achievements.
 */

const STORAGE_KEY = 'arrow_escape_player_data_v1';

const DEFAULT_ACHIEVEMENTS = [
  { id: 'first_escape', name: 'First Freedom', desc: 'Clear your first arrow puzzle.', reward: 50, unlocked: false },
  { id: 'novice_solver', name: 'Novice Solver', desc: 'Complete 5 different single-player levels.', reward: 100, unlocked: false },
  { id: 'arrow_master', name: 'Arrow Maestro', desc: 'Complete 25 different levels.', reward: 250, unlocked: false },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Clear any puzzle in under 15 seconds.', reward: 150, unlocked: false },
  { id: 'pvp_first_win', name: 'First Blood', desc: 'Win your first online 1v1 match.', reward: 100, unlocked: false },
  { id: 'pvp_champion', name: 'Duelist Veteran', desc: 'Win 10 online 1v1 matches.', reward: 300, unlocked: false },
  { id: 'tournament_qualifier', name: 'Contender', desc: 'Qualify for the Weekly Tournament by completing 10 distinct levels.', reward: 200, unlocked: false },
  { id: 'fashionista', name: 'Stylist', desc: 'Unlock your first custom arrow skin or board theme.', reward: 100, unlocked: false },
  { id: 'royal_collector', name: 'Royal Collector', desc: 'Own the Royal Arrows, Royal Prince avatar, and Royal Gold frame.', reward: 500, unlocked: false }
];

class StorageManager {
  constructor() {
    this.data = this.loadData();
    this.checkWeeklyReset();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults in case of new fields
        return this.mergeDefaults(parsed);
      }
    } catch (e) {
      console.warn('Failed to load storage, using defaults:', e);
    }
    return this.getDefaultData();
  }

  getDefaultData() {
    const randomId = 'AE-' + Math.floor(100000 + Math.random() * 900000);
    return {
      playerId: randomId,
      username: 'ArrowPilot_' + randomId.slice(-4),
      coins: 250, // Starting bonus
      rating: 1200,
      stats: {
        levelsCompleted: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        streakDays: 0,
        lastDailyDate: null,
        fastestTime: 9999
      },
      // Anti-farming level ledger: records levelId -> { timestamp, rewarded }
      completedLevels: {},
      // Weekly tournament eligibility: distinct levels completed in current calendar week
      tournamentWeekId: this.getCurrentWeekId(),
      tournamentQualifyingLevels: [],
      tournamentScore: null,
      inventory: {
        themes: ['classic'],
        skins: ['classic'],
        avatars: ['default'],
        frames: ['none'],
        effects: ['confetti'],
        powerups: {
          hints: 3,
          undos: 3,
          safes: 2
        }
      },
      equipped: {
        theme: 'classic',
        skin: 'classic',
        avatar: 'default',
        frame: 'none',
        effect: 'confetti'
      },
      achievements: DEFAULT_ACHIEVEMENTS,
      settings: {
        sound: true,
        volume: 0.7,
        reducedMotion: false,
        vibration: true
      }
    };
  }

  mergeDefaults(saved) {
    const defaults = this.getDefaultData();
    const merged = { ...defaults, ...saved };
    merged.stats = { ...defaults.stats, ...(saved.stats || {}) };
    merged.inventory = { ...defaults.inventory, ...(saved.inventory || {}) };
    merged.inventory.powerups = { ...defaults.inventory.powerups, ...(saved.inventory?.powerups || {}) };
    merged.equipped = { ...defaults.equipped, ...(saved.equipped || {}) };
    merged.settings = { ...defaults.settings, ...(saved.settings || {}) };

    // Merge achievements ensuring all default items exist
    const savedAchMap = new Map((saved.achievements || []).map(a => [a.id, a]));
    merged.achievements = DEFAULT_ACHIEVEMENTS.map(def => {
      const match = savedAchMap.get(def.id);
      return match ? { ...def, unlocked: match.unlocked } : { ...def };
    });

    return merged;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getCurrentWeekId() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  checkWeeklyReset() {
    const curWeek = this.getCurrentWeekId();
    if (this.data.tournamentWeekId !== curWeek) {
      this.data.tournamentWeekId = curWeek;
      this.data.tournamentQualifyingLevels = [];
      this.data.tournamentScore = null;
      this.save();
    }
  }

  // Record a level clear with strict anti-farming reward checks
  recordLevelCompletion(levelId, difficulty = 'easy', completionTimeSec = 0) {
    this.checkWeeklyReset();
    let earnedCoins = 0;
    const isFirstTime = !this.data.completedLevels[levelId];

    if (isFirstTime) {
      // Award first-completion coins
      switch (difficulty.toLowerCase()) {
        case 'easy': earnedCoins = 10; break;
        case 'medium': earnedCoins = 20; break;
        case 'hard': earnedCoins = 35; break;
        case 'expert': earnedCoins = 50; break;
        default: earnedCoins = 10;
      }

      this.data.completedLevels[levelId] = {
        clearedAt: Date.now(),
        difficulty,
        bestTime: completionTimeSec
      };

      this.data.coins += earnedCoins;
      this.data.stats.levelsCompleted = Object.keys(this.data.completedLevels).length;
    } else {
      // Already completed previously; update best time if improved, but no farming exploit!
      const rec = this.data.completedLevels[levelId];
      if (!rec.bestTime || completionTimeSec < rec.bestTime) {
        rec.bestTime = completionTimeSec;
      }
    }

    // Weekly Tournament qualification: count distinct level IDs completed this week
    if (!this.data.tournamentQualifyingLevels.includes(levelId)) {
      this.data.tournamentQualifyingLevels.push(levelId);
      if (this.data.tournamentQualifyingLevels.length >= 10) {
        this.unlockAchievement('tournament_qualifier');
      }
    }

    // Achievements check
    this.unlockAchievement('first_escape');
    if (this.data.stats.levelsCompleted >= 5) this.unlockAchievement('novice_solver');
    if (this.data.stats.levelsCompleted >= 25) this.unlockAchievement('arrow_master');
    if (completionTimeSec > 0 && completionTimeSec <= 15) this.unlockAchievement('speed_demon');

    this.save();
    return { isFirstTime, earnedCoins };
  }

  // Record 1v1 match outcome
  recordMatch(won, opponentRating = 1200) {
    this.data.stats.matchesPlayed++;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - this.data.rating) / 400));
    const score = won ? 1 : 0;
    const ratingChange = Math.round(K * (score - expected));
    this.data.rating = Math.max(800, this.data.rating + ratingChange);

    let earnedCoins = 0;
    if (won) {
      this.data.stats.matchesWon++;
      earnedCoins = 30; // 30 coins per 1v1 win
      this.data.coins += earnedCoins;
      this.unlockAchievement('pvp_first_win');
      if (this.data.stats.matchesWon >= 10) {
        this.unlockAchievement('pvp_champion');
      }
    } else {
      this.data.stats.matchesLost++;
      earnedCoins = 5; // Consolation 5 coins
      this.data.coins += earnedCoins;
    }

    this.save();
    return { ratingChange, earnedCoins };
  }

  unlockAchievement(achId) {
    const ach = this.data.achievements.find(a => a.id === achId);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.data.coins += ach.reward;
      this.save();
      if (window.soundEngine) window.soundEngine.playCoin();
      if (window.showToast) window.showToast(`🏆 Achievement Unlocked: ${ach.name} (+${ach.reward} Coins)!`);
      return true;
    }
    return false;
  }

  // Cosmetics purchase
  buyItem(category, itemId, price) {
    if (this.data.coins < price) return { success: false, reason: 'insufficient_coins' };
    if (!this.data.inventory[category]) this.data.inventory[category] = [];
    if (this.data.inventory[category].includes(itemId)) return { success: false, reason: 'already_owned' };

    this.data.coins -= price;
    this.data.inventory[category].push(itemId);

    // Auto-equip item
    const singleCat = category.endsWith('s') ? category.slice(0, -1) : category;
    if (this.data.equipped[singleCat] !== undefined) {
      this.data.equipped[singleCat] = itemId;
    }

    this.unlockAchievement('fashionista');
    this.checkRoyalCollector();
    this.save();
    return { success: true };
  }

  equipItem(category, itemId) {
    const singleCat = category.endsWith('s') ? category.slice(0, -1) : category;
    if (this.data.inventory[category]?.includes(itemId)) {
      this.data.equipped[singleCat] = itemId;
      this.save();
      return true;
    }
    return false;
  }

  checkRoyalCollector() {
    const hasSkins = this.data.inventory.skins?.includes('royal');
    const hasAvatar = this.data.inventory.avatars?.includes('prince');
    const hasFrame = this.data.inventory.frames?.includes('royal_gold');
    if (hasSkins && hasAvatar && hasFrame) {
      this.unlockAchievement('royal_collector');
    }
  }

  consumePowerup(type) {
    if ((this.data.inventory.powerups[type] || 0) > 0) {
      this.data.inventory.powerups[type]--;
      this.save();
      return true;
    }
    return false;
  }

  buyPowerup(type, price) {
    if (this.data.coins < price) return false;
    this.data.coins -= price;
    this.data.inventory.powerups[type] = (this.data.inventory.powerups[type] || 0) + 1;
    this.save();
    return true;
  }
}

window.storageManager = new StorageManager();
