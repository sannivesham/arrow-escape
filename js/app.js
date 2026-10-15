/**
 * Arrow Escape - Main Application Controller
 */

class ArrowEscapeApp {
  constructor() {
    this.currentScreen = 'home';
    this.currentLevel = null;
    this.engine = null;
    this.multiplayer = null;
    this.activeMode = 'campaign'; // 'campaign' | '1v1' | 'tournament' | 'daily'
    this.activeDifficulty = 'easy';

    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupScreens();
    this.setupAudioAndSettings();
    this.updateHUD();
    this.renderShop();
    this.renderProfile();
    this.renderWeeklyTournament();
    this.renderDailyChallenge();

    // Global toast helper
    window.showToast = (msg, duration = 2800) => this.showToast(msg, duration);
  }

  showToast(msg, duration = 2800) {
    const toast = document.getElementById('global-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  updateHUD() {
    const data = window.storageManager.data;
    const coinEls = document.querySelectorAll('.user-coin-count');
    coinEls.forEach(el => el.textContent = data.coins);

    const usernameEls = document.querySelectorAll('.user-name-display');
    usernameEls.forEach(el => el.textContent = data.username);

    const avatarEls = document.querySelectorAll('.user-avatar-display');
    const curAvatar = SHOP_CATALOGUE.avatars.find(a => a.id === data.equipped.avatar)?.icon || '🎯';
    avatarEls.forEach(el => el.textContent = curAvatar);
  }

  switchScreen(screenName) {
    if (window.soundEngine) window.soundEngine.playClick();
    this.currentScreen = screenName;

    document.querySelectorAll('.app-screen').forEach(s => {
      s.classList.remove('active');
    });

    const target = document.getElementById(`screen-${screenName}`);
    if (target) {
      target.classList.add('active');
    }

    if (screenName === 'levels') this.renderLevelGrid();
    if (screenName === 'shop') this.renderShop();
    if (screenName === 'profile') this.renderProfile();
    if (screenName === 'tournament') this.renderWeeklyTournament();
    if (screenName === 'daily') this.renderDailyChallenge();

    this.updateHUD();
  }

  setupNavigation() {
    // Nav buttons with data-target
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.dataset.nav;
        this.switchScreen(target);
      });
    });

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentScreen === 'puzzle') {
          this.switchScreen(this.activeMode === 'campaign' ? 'levels' : 'home');
        } else {
          this.switchScreen('home');
        }
      });
    });
  }

  setupScreens() {
    // Difficulty filters in Levels screen
    document.querySelectorAll('.diff-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.diff-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeDifficulty = pill.dataset.diff;
        this.renderLevelGrid();
      });
    });

    // Powerup buttons in puzzle screen
    const hintBtn = document.getElementById('btn-powerup-hint');
    const undoBtn = document.getElementById('btn-powerup-undo');
    const safeBtn = document.getElementById('btn-powerup-safe');

    if (hintBtn) {
      hintBtn.addEventListener('click', () => this.handleUsePowerup('hints', 100));
    }
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.handleUsePowerup('undos', 75));
    }
    if (safeBtn) {
      safeBtn.addEventListener('click', () => this.handleUsePowerup('safes', 150));
    }

    // 1v1 screen controls
    const start1v1Btn = document.getElementById('btn-start-matchmaking');
    const cancel1v1Btn = document.getElementById('btn-cancel-matchmaking');

    if (start1v1Btn) {
      start1v1Btn.addEventListener('click', () => this.start1v1Matchmaking());
    }
    if (cancel1v1Btn) {
      cancel1v1Btn.addEventListener('click', () => this.cancel1v1Matchmaking());
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('open'));
      });
    });
  }

  setupAudioAndSettings() {
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) {
      soundToggle.checked = window.storageManager.data.settings.sound;
      soundToggle.addEventListener('change', (e) => {
        window.storageManager.data.settings.sound = e.target.checked;
        window.soundEngine.setMuted(!e.target.checked);
        window.storageManager.save();
      });
    }

    const volumeSlider = document.getElementById('setting-volume-slider');
    if (volumeSlider) {
      volumeSlider.value = window.storageManager.data.settings.volume * 100;
      volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        window.storageManager.data.settings.volume = val;
        window.soundEngine.setVolume(val);
        window.storageManager.save();
      });
    }

    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your local progress, coins and inventory?')) {
          localStorage.removeItem('arrow_escape_player_data_v1');
          window.location.reload();
        }
      });
    }
  }

  // --- Campaign / Level Grid ---
  renderLevelGrid() {
    const grid = document.getElementById('levels-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    const completed = window.storageManager.data.completedLevels || {};
    const totalLevelsPerDiff = 15;
    let offset = 1;
    if (this.activeDifficulty === 'medium') offset = 16;
    if (this.activeDifficulty === 'hard') offset = 31;
    if (this.activeDifficulty === 'expert') offset = 46;

    for (let i = 0; i < totalLevelsPerDiff; i++) {
      const levelNum = offset + i;
      const levelId = `LVL-${levelNum}`;
      const isCleared = !!completed[levelId];
      // Level unlocked if first level of difficulty or previous level cleared
      const isUnlocked = i === 0 || !!completed[`LVL-${levelNum - 1}`];

      const card = document.createElement('div');
      card.className = `level-card ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="lvl-num">${levelNum}</div>
        <div class="lvl-stars">${isCleared ? '⭐⭐⭐' : isUnlocked ? '⭐' : '🔒'}</div>
        <div class="lvl-tag">${this.activeDifficulty.toUpperCase()}</div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.startCampaignLevel(levelNum, this.activeDifficulty);
        });
      }

      grid.appendChild(card);
    }
  }

  startCampaignLevel(levelNum, difficulty) {
    this.activeMode = 'campaign';
    this.currentLevel = {
      id: `LVL-${levelNum}`,
      num: levelNum,
      difficulty
    };

    document.getElementById('puzzle-mode-title').textContent = `Level ${levelNum}`;
    document.getElementById('puzzle-mode-badge').textContent = difficulty.toUpperCase();
    document.getElementById('powerups-bar').style.display = 'flex';

    // Generate puzzle seeded by level number
    const puzzle = window.PuzzleGenerator.generate({
      difficulty,
      seed: `arrow_lvl_${levelNum}`
    });

    this.launchPuzzle(puzzle, (stats) => {
      // Victory handler
      const res = window.storageManager.recordLevelCompletion(this.currentLevel.id, difficulty, stats.totalTime);
      this.showVictoryModal({
        title: `Level ${levelNum} Cleared!`,
        time: `${stats.totalTime}s`,
        moves: stats.moves,
        earnedCoins: res.earnedCoins,
        isFirstTime: res.isFirstTime,
        nextAction: () => {
          this.startCampaignLevel(levelNum + 1, difficulty);
        }
      });
    });
  }

  launchPuzzle(puzzleConfig, onComplete) {
    this.switchScreen('puzzle');
    const boardEl = document.getElementById('game-arrow-board');

    this.engine = new ArrowEscapeEngine({
      container: boardEl,
      onEscape: (arrow, remaining) => {
        if (this.activeMode === '1v1' && this.multiplayer) {
          this.multiplayer.onPlayerArrowEscaped(remaining);
        }
      },
      onCounterUpdate: (remaining, total) => {
        const counterEl = document.getElementById('hud-arrows-remaining');
        if (counterEl) counterEl.textContent = remaining;
      },
      onComplete
    });

    this.engine.loadPuzzle(puzzleConfig);
    this.updatePowerupCounts();
  }

  updatePowerupCounts() {
    const powerups = window.storageManager.data.inventory.powerups || {};
    const hintCount = document.getElementById('count-powerup-hint');
    const undoCount = document.getElementById('count-powerup-undo');
    const safeCount = document.getElementById('count-powerup-safe');

    if (hintCount) hintCount.textContent = powerups.hints || 0;
    if (undoCount) undoCount.textContent = powerups.undos || 0;
    if (safeCount) safeCount.textContent = powerups.safes || 0;
  }

  handleUsePowerup(type, coinPrice) {
    if (!this.engine) return;
    const count = window.storageManager.data.inventory.powerups[type] || 0;

    if (count > 0) {
      window.storageManager.consumePowerup(type);
      this.executePowerupEffect(type);
      this.updatePowerupCounts();
    } else {
      // Prompt buy
      if (window.storageManager.data.coins >= coinPrice) {
        if (confirm(`You have 0 left. Buy and use 1 for ${coinPrice} coins?`)) {
          window.storageManager.buyPowerup(type, coinPrice);
          window.storageManager.consumePowerup(type);
          this.executePowerupEffect(type);
          this.updatePowerupCounts();
          this.updateHUD();
        }
      } else {
        this.showToast(`Not enough coins! Need ${coinPrice} coins.`);
      }
    }
  }

  executePowerupEffect(type) {
    if (type === 'hints' || type === 'safes') {
      const ok = this.engine.useHint();
      if (!ok) this.showToast('No free arrows found!');
    } else if (type === 'undos') {
      const ok = this.engine.undoLastMove();
      if (!ok) this.showToast('No moves to undo!');
    }
  }

  showVictoryModal({ title, time, moves, earnedCoins, isFirstTime, nextAction }) {
    const modal = document.getElementById('modal-victory');
    if (!modal) return;

    document.getElementById('victory-title').textContent = title;
    document.getElementById('victory-stat-time').textContent = time;
    document.getElementById('victory-stat-moves').textContent = moves;

    const rewardEl = document.getElementById('victory-stat-coins');
    if (earnedCoins > 0) {
      rewardEl.textContent = `+${earnedCoins} Coins`;
      rewardEl.style.color = '#fbbf24';
    } else {
      rewardEl.textContent = 'Replay (No Coins)';
      rewardEl.style.color = '#94a3b8';
    }

    this.triggerConfetti();
    modal.classList.add('open');

    const nextBtn = document.getElementById('btn-victory-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        modal.classList.remove('open');
        if (nextAction) nextAction();
      };
    }
    this.updateHUD();
  }

  triggerConfetti() {
    const container = document.getElementById('confetti-canvas-wrapper');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#38bdf8', '#fbbf24', '#f43f5e', '#a855f7', '#10b981'];

    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 0.5}s`;
      p.style.animationDuration = `${1.2 + Math.random() * 1.5}s`;
      container.appendChild(p);
    }

    setTimeout(() => {
      container.innerHTML = '';
    }, 2500);
  }

  // --- Online 1v1 Multiplayer ---
  start1v1Matchmaking() {
    const statusEl = document.getElementById('matchmaking-status-text');
    const radar = document.getElementById('matchmaking-radar');
    const actionBtns = document.getElementById('matchmaking-actions');

    if (statusEl) statusEl.textContent = 'Searching for worthy opponent...';
    if (radar) radar.classList.add('searching');
    if (actionBtns) actionBtns.classList.add('active');

    this.multiplayer = new MultiplayerEngine({
      onMatchFound: (match) => {
        if (statusEl) statusEl.textContent = `Opponent Found: ${match.opponent.name}!`;
        if (radar) radar.classList.remove('searching');
        setTimeout(() => this.start1v1Countdown(match), 900);
      },
      onOpponentProgress: (remaining, total) => {
        const oppProgEl = document.getElementById('pvp-opp-progress-bar');
        const oppCountEl = document.getElementById('pvp-opp-count');
        if (oppProgEl) {
          const pct = ((total - remaining) / total) * 100;
          oppProgEl.style.width = `${pct}%`;
        }
        if (oppCountEl) oppCountEl.textContent = `${remaining} Left`;
      },
      onMatchEnd: (result) => {
        const record = window.storageManager.recordMatch(result.playerWon, result.opponent.rating);
        this.show1v1ResultModal(result, record);
      }
    });

    this.multiplayer.startMatchmaking(window.storageManager.data);
  }

  cancel1v1Matchmaking() {
    if (this.multiplayer) {
      this.multiplayer.cancelMatchmaking();
    }
    const statusEl = document.getElementById('matchmaking-status-text');
    const radar = document.getElementById('matchmaking-radar');
    if (statusEl) statusEl.textContent = 'Matchmaking cancelled.';
    if (radar) radar.classList.remove('searching');
  }

  start1v1Countdown(match) {
    this.switchScreen('puzzle');
    this.activeMode = '1v1';

    document.getElementById('puzzle-mode-title').textContent = `1v1 vs ${match.opponent.name}`;
    document.getElementById('puzzle-mode-badge').textContent = `MMR ${match.opponent.rating}`;
    document.getElementById('powerups-bar').style.display = 'none'; // Forbidden in 1v1

    // Setup PVP HUD banner
    let pvpHud = document.getElementById('pvp-live-hud');
    if (pvpHud) pvpHud.style.display = 'block';

    const oppName = document.getElementById('pvp-opp-name');
    if (oppName) oppName.textContent = match.opponent.name;

    // Countdown overlay
    const overlay = document.getElementById('countdown-overlay');
    const cdText = document.getElementById('countdown-text');
    if (overlay && cdText) {
      overlay.style.display = 'flex';
      let count = 3;
      cdText.textContent = count;
      if (window.soundEngine) window.soundEngine.playBeep(false);

      const intv = setInterval(() => {
        count--;
        if (count > 0) {
          cdText.textContent = count;
          if (window.soundEngine) window.soundEngine.playBeep(false);
        } else if (count === 0) {
          cdText.textContent = 'GO!';
          if (window.soundEngine) window.soundEngine.playBeep(true);
        } else {
          clearInterval(intv);
          overlay.style.display = 'none';
          this.multiplayer.startLiveRace();
        }
      }, 700);
    }

    this.launchPuzzle(match.puzzle, () => {
      // Handled by multiplayer.onPlayerArrowEscaped
    });
  }

  show1v1ResultModal(result, record) {
    const modal = document.getElementById('modal-1v1-result');
    if (!modal) return;

    const titleEl = document.getElementById('pvp-result-title');
    const subEl = document.getElementById('pvp-result-subtitle');
    const ratingEl = document.getElementById('pvp-rating-change');
    const coinsEl = document.getElementById('pvp-coins-earned');

    if (result.playerWon) {
      if (window.soundEngine) window.soundEngine.playVictory();
      this.triggerConfetti();
      titleEl.textContent = 'VICTORY!';
      titleEl.className = 'pvp-win';
      subEl.textContent = `You out-sped ${result.opponent.name} in ${result.timeSeconds}s!`;
      ratingEl.textContent = `+${record.ratingChange} MMR (Now ${window.storageManager.data.rating})`;
      ratingEl.style.color = '#10b981';
      coinsEl.textContent = `+${record.earnedCoins} Coins`;
    } else {
      if (window.soundEngine) window.soundEngine.playBlocked();
      titleEl.textContent = 'DEFEAT';
      titleEl.className = 'pvp-loss';
      subEl.textContent = `${result.opponent.name} cleared the board first!`;
      ratingEl.textContent = `${record.ratingChange} MMR (Now ${window.storageManager.data.rating})`;
      ratingEl.style.color = '#f43f5e';
      coinsEl.textContent = `+${record.earnedCoins} Coins (Consolation)`;
    }

    modal.classList.add('open');

    const rematchBtn = document.getElementById('btn-pvp-rematch');
    if (rematchBtn) {
      rematchBtn.onclick = () => {
        modal.classList.remove('open');
        this.switchScreen('1v1');
        this.start1v1Matchmaking();
      };
    }

    const homeBtn = document.getElementById('btn-pvp-home');
    if (homeBtn) {
      homeBtn.onclick = () => {
        modal.classList.remove('open');
        this.switchScreen('home');
      };
    }

    this.updateHUD();
  }

  // --- Weekly Tournament ---
  renderWeeklyTournament() {
    const info = window.tournamentManager.getWeeklyInfo();
    const meter = document.getElementById('tournament-eligibility-fill');
    const countText = document.getElementById('tournament-eligibility-count');
    const playBtn = document.getElementById('btn-enter-tournament');
    const lockedMsg = document.getElementById('tournament-locked-msg');
    const timeRemainingEl = document.getElementById('tournament-time-remaining');

    if (timeRemainingEl) timeRemainingEl.textContent = info.timeRemaining;

    const pct = Math.min(100, (info.qualifyingCount / info.targetCount) * 100);
    if (meter) meter.style.width = `${pct}%`;
    if (countText) countText.textContent = `${info.qualifyingCount} / ${info.targetCount} Qualifying Levels Cleared`;

    if (info.isEligible) {
      if (playBtn) playBtn.disabled = false;
      if (lockedMsg) lockedMsg.style.display = 'none';
    } else {
      if (playBtn) playBtn.disabled = true;
      if (lockedMsg) {
        lockedMsg.style.display = 'block';
        lockedMsg.textContent = `Complete ${info.targetCount - info.qualifyingCount} more distinct campaign levels to unlock entry!`;
      }
    }

    // Render tournament leaderboard
    const lbd = document.getElementById('tournament-leaderboard-rows');
    if (lbd) {
      lbd.innerHTML = '';
      window.tournamentManager.mockLeaderboard.forEach(item => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.innerHTML = `
          <div class="lb-rank">#${item.rank}</div>
          <div class="lb-name">${item.username} <span class="tie-hash">#${item.tieHash}</span></div>
          <div class="lb-time">${item.time}</div>
          <div class="lb-prize">${item.prize}</div>
        `;
        lbd.appendChild(row);
      });
    }

    if (playBtn) {
      playBtn.onclick = () => {
        this.startTournamentMatch();
      };
    }
  }

  startTournamentMatch() {
    this.activeMode = 'tournament';
    const weekId = window.storageManager.getCurrentWeekId();
    const puzzle = window.tournamentManager.generateTournamentPuzzle(weekId);

    document.getElementById('puzzle-mode-title').textContent = `Tournament: Week ${weekId}`;
    document.getElementById('puzzle-mode-badge').textContent = 'CHAMPIONSHIP';
    document.getElementById('powerups-bar').style.display = 'none'; // No powerups in tournament

    const startTime = Date.now();
    this.launchPuzzle(puzzle, () => {
      const elapsedMs = Date.now() - startTime;
      const entry = window.tournamentManager.recordTournamentResult(elapsedMs);
      this.showToast(`Tournament entry recorded: ${entry.time} (Tie Hash: ${entry.tieHash})!`);
      this.switchScreen('tournament');
      this.renderWeeklyTournament();
    });
  }

  // --- Daily Challenge ---
  renderDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('daily-challenge-date');
    if (dateEl) dateEl.textContent = today;

    const streakEl = document.getElementById('daily-streak-count');
    if (streakEl) streakEl.textContent = window.storageManager.data.stats.streakDays || 0;

    const playBtn = document.getElementById('btn-play-daily');
    if (playBtn) {
      playBtn.onclick = () => {
        this.startDailyChallenge(today);
      };
    }
  }

  startDailyChallenge(dateStr) {
    this.activeMode = 'daily';
    document.getElementById('puzzle-mode-title').textContent = `Daily Challenge: ${dateStr}`;
    document.getElementById('puzzle-mode-badge').textContent = 'DAILY PUZZLE';
    document.getElementById('powerups-bar').style.display = 'flex';

    const puzzle = window.PuzzleGenerator.generate({
      difficulty: 'medium',
      seed: `daily_${dateStr}`,
      customSize: 6,
      customCount: 18
    });

    this.launchPuzzle(puzzle, (stats) => {
      const data = window.storageManager.data;
      let earned = 0;
      if (data.stats.lastDailyDate !== dateStr) {
        data.stats.lastDailyDate = dateStr;
        data.stats.streakDays = (data.stats.streakDays || 0) + 1;
        earned = 50; // 50 coins daily reward
        data.coins += earned;
        window.storageManager.save();
      }

      this.showVictoryModal({
        title: 'Daily Challenge Complete!',
        time: `${stats.totalTime}s`,
        moves: stats.moves,
        earnedCoins: earned,
        isFirstTime: earned > 0,
        nextAction: () => {
          this.switchScreen('home');
        }
      });
    });
  }

  // --- Customization Shop ---
  renderShop() {
    this.setupShopTabs();
    this.renderShopCategory('themes');
  }

  setupShopTabs() {
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderShopCategory(tab.dataset.cat);
      };
    });
  }

  renderShopCategory(cat) {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';

    const items = SHOP_CATALOGUE[cat] || [];
    const owned = window.storageManager.data.inventory[cat] || [];
    const singleCat = cat.endsWith('s') ? cat.slice(0, -1) : cat;
    const equipped = window.storageManager.data.equipped[singleCat];

    items.forEach(item => {
      const isOwned = owned.includes(item.id) || item.price === 0;
      const isEquipped = equipped === item.id;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : isOwned ? 'owned' : ''}`;

      card.innerHTML = `
        <div class="shop-item-icon">${item.icon || (item.colors ? '🎨' : '🏷️')}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc || ''}</div>
        <div class="shop-item-footer">
          <div class="shop-item-price">${isOwned ? 'OWNED' : `🪙 ${item.price}`}</div>
          <button class="btn-shop-action ${isEquipped ? 'btn-equipped' : isOwned ? 'btn-equip' : 'btn-buy'}">
            ${isEquipped ? 'EQUIPPED' : isOwned ? 'EQUIP' : 'BUY'}
          </button>
        </div>
      `;

      const actionBtn = card.querySelector('.btn-shop-action');
      actionBtn.onclick = () => {
        if (isEquipped) return;
        if (isOwned) {
          window.storageManager.equipItem(cat, item.id);
          this.showToast(`Equipped ${item.name}!`);
          this.renderShopCategory(cat);
          this.updateHUD();
        } else {
          const res = window.storageManager.buyItem(cat, item.id, item.price);
          if (res.success) {
            if (window.soundEngine) window.soundEngine.playCoin();
            this.showToast(`Purchased & equipped ${item.name}!`);
            this.renderShopCategory(cat);
            this.updateHUD();
          } else {
            this.showToast('Not enough coins!');
          }
        }
      };

      container.appendChild(card);
    });
  }

  // --- Profile Screen ---
  renderProfile() {
    const data = window.storageManager.data;
    const avatarIcon = SHOP_CATALOGUE.avatars.find(a => a.id === data.equipped.avatar)?.icon || '🎯';
    
    const avatarEl = document.getElementById('profile-avatar-large');
    if (avatarEl) avatarEl.textContent = avatarIcon;

    const frame = SHOP_CATALOGUE.frames.find(f => f.id === data.equipped.frame);
    if (avatarEl && frame) {
      avatarEl.style.cssText = frame.style;
    }

    const nameInput = document.getElementById('profile-username-input');
    if (nameInput) {
      nameInput.value = data.username;
      nameInput.onchange = () => {
        const val = nameInput.value.trim();
        if (val.length >= 3 && val.length <= 16) {
          data.username = val;
          window.storageManager.save();
          this.showToast(`Username updated to ${val}!`);
          this.updateHUD();
        } else {
          this.showToast('Username must be 3-16 characters.');
          nameInput.value = data.username;
        }
      };
    }

    const playerIdEl = document.getElementById('profile-player-id');
    if (playerIdEl) playerIdEl.textContent = `ID: ${data.playerId}`;

    // Stats
    const winRate = data.stats.matchesPlayed > 0 
      ? Math.round((data.stats.matchesWon / data.stats.matchesPlayed) * 100) 
      : 0;

    const statClears = document.getElementById('profile-stat-clears');
    const stat1v1Wins = document.getElementById('profile-stat-wins');
    const stat1v1WinRate = document.getElementById('profile-stat-winrate');
    const statRating = document.getElementById('profile-stat-rating');

    if (statClears) statClears.textContent = data.stats.levelsCompleted;
    if (stat1v1Wins) stat1v1Wins.textContent = `${data.stats.matchesWon}W - ${data.stats.matchesLost}L`;
    if (stat1v1WinRate) stat1v1WinRate.textContent = `${winRate}%`;
    if (statRating) statRating.textContent = data.rating;

    // Achievements list
    const achContainer = document.getElementById('profile-achievements-list');
    if (achContainer) {
      achContainer.innerHTML = '';
      data.achievements.forEach(ach => {
        const item = document.createElement('div');
        item.className = `achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
          <div class="ach-icon">${ach.unlocked ? '🏆' : '🔒'}</div>
          <div class="ach-details">
            <div class="ach-title">${ach.name}</div>
            <div class="ach-desc">${ach.desc}</div>
          </div>
          <div class="ach-reward">+${ach.reward} 🪙</div>
        `;
        achContainer.appendChild(item);
      });
    }
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ArrowEscapeApp();
});
