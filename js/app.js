/**
 * ARROUT - Main Application Controller
 * Handles exact navigation, bending arrow puzzle engine, and pastel theme orchestration.
 */

class ArroutApp {
  constructor() {
    this.currentScreen = 'home';
    this.currentLevelNum = 36; // Default to signature Level 36 from reference image
    this.bendingEngine = null;
    this.multiplayer = null;
    this.activeMode = 'campaign';
    this.activeDifficulty = 'normal';

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
    coinEls.forEach(el => el.textContent = data.coins || 2450);

    const usernameEls = document.querySelectorAll('.user-name-display');
    usernameEls.forEach(el => el.textContent = data.username);
  }

  switchScreen(screenName) {
    if (window.soundEngine) window.soundEngine.playClick();
    this.currentScreen = screenName;

    // Manage header visibility: Home has brand block; Level screen has level title banner
    const mainHeader = document.getElementById('main-app-header');
    if (mainHeader) {
      mainHeader.style.display = screenName === 'puzzle' ? 'none' : 'flex';
    }

    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`screen-${screenName}`);
    if (target) target.classList.add('active');

    // Update floating nav active tab
    document.querySelectorAll('.floating-bottom-nav .nav-pill-btn').forEach(btn => {
      if (btn.dataset.nav === screenName || (screenName === 'levels' && btn.dataset.nav === 'puzzle')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (screenName === 'puzzle') this.launchBendingLevel(this.currentLevelNum, this.activeDifficulty);
    if (screenName === 'levels') this.renderLevelGrid();
    if (screenName === 'shop') this.renderShop();
    if (screenName === 'profile') this.renderProfile();
    if (screenName === 'tournament') this.renderWeeklyTournament();
    if (screenName === 'daily') this.renderDailyChallenge();

    this.updateHUD();
  }

  setupNavigation() {
    // Nav elements
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
          this.switchScreen('home');
        } else {
          this.switchScreen('home');
        }
      });
    });
  }

  setupScreens() {
    // Difficulty filters in Levels
    document.querySelectorAll('.diff-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.diff-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeDifficulty = pill.dataset.diff;
        this.renderLevelGrid();
      });
    });

    // Powerup buttons (Lightbulb & Ruler)
    const hintBtn = document.getElementById('btn-powerup-hint');
    const undoBtn = document.getElementById('btn-powerup-undo');

    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        if (this.bendingEngine) {
          const success = this.bendingEngine.useHint();
          if (success) {
            this.showToast('Highlighted clear arrow!');
          } else {
            this.showToast('No clear arrow found!');
          }
        }
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.bendingEngine) {
          const success = this.bendingEngine.undo();
          if (success) this.showToast('Recovered last arrow!');
        }
      });
    }

    // 1v1 controls
    const start1v1Btn = document.getElementById('btn-start-matchmaking');
    const cancel1v1Btn = document.getElementById('btn-cancel-matchmaking');
    if (start1v1Btn) start1v1Btn.addEventListener('click', () => this.start1v1Matchmaking());
    if (cancel1v1Btn) cancel1v1Btn.addEventListener('click', () => this.cancel1v1Matchmaking());
  }

  setupAudioAndSettings() {
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        window.soundEngine.setMuted(!e.target.checked);
      });
    }
    const volSlider = document.getElementById('setting-volume-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        window.soundEngine.setVolume(e.target.value / 100);
      });
    }
  }

  // --- Bending Level Launcher (Matches media_1792055946735.jpg) ---
  launchBendingLevel(levelNum, difficulty = 'normal') {
    this.currentLevelNum = levelNum;
    this.activeMode = 'campaign';

    // Update Header and Badges
    const titleEl = document.getElementById('puzzle-level-title');
    if (titleEl) titleEl.textContent = `Level ${levelNum}`;

    const diffBadge = document.getElementById('level-diff-badge');
    if (diffBadge) diffBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    const boardContainer = document.getElementById('game-bending-board');
    if (!boardContainer) return;

    // Generate Bending Puzzle Data
    const puzzleData = window.BendingPuzzleGenerator.generateLevel(levelNum, difficulty);

    // Initialize Engine
    this.bendingEngine = new BendingArrowEngine({
      container: boardContainer,
      cols: puzzleData.cols,
      rows: puzzleData.rows,
      onCountChange: (remaining) => {
        const remEl = document.getElementById('level-arrows-remaining');
        if (remEl) remEl.textContent = remaining;
      },
      onHeartsChange: (hearts, max) => {
        const heartsRow = document.getElementById('level-hearts-row');
        if (!heartsRow) return;
        heartsRow.innerHTML = '';
        for (let i = 0; i < max; i++) {
          const heart = document.createElement('span');
          heart.className = i < hearts ? 'heart-full' : 'heart-empty';
          heart.textContent = i < hearts ? '❤️' : '🤍';
          heartsRow.appendChild(heart);
        }
      },
      onBlocked: (arrow) => {
        this.showToast('Obstacle in front! Path is blocked.');
      },
      onComplete: (stats) => {
        const res = window.storageManager.recordLevelCompletion(`LVL-${levelNum}`, difficulty, stats.totalTime);
        this.showVictoryModal({
          title: `Level ${levelNum} Cleared!`,
          time: `${stats.totalTime}s`,
          moves: stats.moves,
          earnedCoins: res.earnedCoins || 10,
          nextAction: () => {
            this.launchBendingLevel(levelNum + 1, difficulty);
          }
        });
      }
    });

    this.bendingEngine.loadPuzzle(puzzleData);
  }

  showVictoryModal({ title, time, moves, earnedCoins, nextAction }) {
    const modal = document.getElementById('modal-victory');
    if (!modal) return;

    document.getElementById('victory-title').textContent = title;
    document.getElementById('victory-stat-time').textContent = time;
    document.getElementById('victory-stat-moves').textContent = moves;
    document.getElementById('victory-stat-coins').textContent = `+${earnedCoins} Coins`;

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

  // --- Campaign Grid ---
  renderLevelGrid() {
    const grid = document.getElementById('levels-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    const completed = window.storageManager.data.completedLevels || {};
    let offset = this.activeDifficulty === 'easy' ? 1 : this.activeDifficulty === 'hard' ? 40 : 25;

    for (let i = 0; i < 16; i++) {
      const num = offset + i;
      const isCleared = !!completed[`LVL-${num}`] || num < 36;
      const card = document.createElement('div');
      card.className = `level-clay-card ${isCleared ? 'cleared' : ''}`;
      card.innerHTML = `
        <div class="lvl-card-num">${num}</div>
        <div class="lvl-card-stars">${isCleared ? '⭐⭐⭐' : '⭐'}</div>
      `;
      card.onclick = () => {
        this.currentLevelNum = num;
        this.switchScreen('puzzle');
      };
      grid.appendChild(card);
    }
  }

  // --- 1v1 Battle ---
  start1v1Matchmaking() {
    const statusText = document.getElementById('matchmaking-status-text');
    const radar = document.getElementById('matchmaking-radar');
    if (statusText) statusText.textContent = 'Searching for opponent...';
    if (radar) radar.classList.add('searching');

    setTimeout(() => {
      if (statusText) statusText.textContent = 'Opponent Found: Vortex_Pilot!';
      if (radar) radar.classList.remove('searching');
      setTimeout(() => {
        this.switchScreen('puzzle');
        this.launchBendingLevel(36, 'normal');
      }, 800);
    }, 1500);
  }

  cancel1v1Matchmaking() {
    const statusText = document.getElementById('matchmaking-status-text');
    const radar = document.getElementById('matchmaking-radar');
    if (statusText) statusText.textContent = 'Ready to Duel';
    if (radar) radar.classList.remove('searching');
  }

  // --- Weekly Tournament ---
  renderWeeklyTournament() {
    const info = window.tournamentManager.getWeeklyInfo();
    const meter = document.getElementById('tournament-eligibility-fill');
    const countText = document.getElementById('tournament-eligibility-count');
    const playBtn = document.getElementById('btn-enter-tournament');
    const lockedMsg = document.getElementById('tournament-locked-msg');

    const pct = Math.min(100, (info.qualifyingCount / info.targetCount) * 100);
    if (meter) meter.style.width = `${pct}%`;
    if (countText) countText.textContent = `${info.qualifyingCount} / ${info.targetCount} Qualifying Levels`;

    if (info.isEligible) {
      if (playBtn) playBtn.disabled = false;
      if (lockedMsg) lockedMsg.style.display = 'none';
    } else {
      if (playBtn) playBtn.disabled = true;
      if (lockedMsg) lockedMsg.style.display = 'block';
    }

    const rowsContainer = document.getElementById('tournament-leaderboard-rows');
    if (rowsContainer) {
      rowsContainer.innerHTML = '';
      window.tournamentManager.mockLeaderboard.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'background: #FFF; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--clay-shadow); font-size: 0.88rem;';
        row.innerHTML = `
          <div style="font-weight: 800; color: var(--accent-gold);">#${item.rank}</div>
          <div style="font-weight: 700; color: var(--text-navy);">${item.username}</div>
          <div style="font-weight: 800;">${item.time}</div>
        `;
        rowsContainer.appendChild(row);
      });
    }

    if (playBtn) {
      playBtn.onclick = () => {
        this.switchScreen('puzzle');
        this.launchBendingLevel(50, 'hard');
      };
    }
  }

  // --- Daily Challenge ---
  renderDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('daily-challenge-date');
    if (dateEl) dateEl.textContent = today;

    const streakEl = document.getElementById('daily-streak-count');
    if (streakEl) streakEl.textContent = window.storageManager.data.stats.streakDays || 1;

    const playBtn = document.getElementById('btn-play-daily');
    if (playBtn) {
      playBtn.onclick = () => {
        this.switchScreen('puzzle');
        this.launchBendingLevel(42, 'normal');
      };
    }
  }

  // --- Shop ---
  renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';

    const items = SHOP_CATALOGUE.themes || [];
    items.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = 'background: #FFF; border-radius: 20px; padding: 16px; box-shadow: var(--clay-shadow); text-align: center;';
      card.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 6px;">🎨</div>
        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-navy); margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">${item.desc}</div>
        <button class="btn-primary-clay" style="padding: 8px 16px; font-size: 0.8rem;">${item.price === 0 ? 'EQUIPPED' : `🪙 ${item.price}`}</button>
      `;
      container.appendChild(card);
    });
  }

  // --- Profile ---
  renderProfile() {
    const data = window.storageManager.data;
    const statClears = document.getElementById('profile-stat-clears');
    const statWins = document.getElementById('profile-stat-wins');
    const statWinrate = document.getElementById('profile-stat-winrate');
    const statRating = document.getElementById('profile-stat-rating');

    if (statClears) statClears.textContent = data.stats.levelsCompleted || 36;
    if (statWins) statWins.textContent = `${data.stats.matchesWon || 12}W-${data.stats.matchesLost || 4}L`;
    if (statWinrate) statWinrate.textContent = '75%';
    if (statRating) statRating.textContent = data.rating || 1350;

    const achContainer = document.getElementById('profile-achievements-list');
    if (achContainer) {
      achContainer.innerHTML = '';
      data.achievements.forEach(ach => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #FFF; border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; box-shadow: var(--clay-shadow);';
        item.innerHTML = `
          <div style="font-size: 1.6rem; margin-right: 12px;">${ach.unlocked ? '🏆' : '🔒'}</div>
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-navy);">${ach.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${ach.desc}</div>
          </div>
          <div style="font-size: 0.82rem; font-weight: 800; color: var(--accent-gold);">+${ach.reward} 🪙</div>
        `;
        achContainer.appendChild(item);
      });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new ArroutApp();
});
