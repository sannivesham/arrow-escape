/**
 * ARROUT - Main Application Controller
 * Features full browser history hash-routing (prevents exiting site on back button)
 * and bending arrow test levels.
 */

class ArroutApp {
  constructor() {
    this.currentScreen = 'home';
    this.currentLevelNum = 1;
    this.bendingEngine = null;
    this.activeDifficulty = 'all';

    this.init();
  }

  init() {
    this.setupHistoryRouting();
    this.setupNavigation();
    this.setupScreens();
    this.setupAudioAndSettings();
    this.updateHUD();
    this.renderShop();
    this.renderProfile();
    this.renderWeeklyTournament();
    this.renderDailyChallenge();

    window.showToast = (msg, duration = 2400) => this.showToast(msg, duration);

    // Initial route check
    this.handleRoute(window.location.hash || '#/');
  }

  setupHistoryRouting() {
    // Listen to hash changes and browser popstate (phone back button)
    window.addEventListener('hashchange', () => {
      this.handleRoute(window.location.hash);
    });

    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.hash);
    });
  }

  handleRoute(hash) {
    // Parse e.g. #/puzzle/36 or #/levels or #/
    const cleanHash = (hash || '').replace(/^#\/?/, '');
    const parts = cleanHash.split('/');
    const screen = parts[0] || 'home';
    const param = parts[1];

    if (screen === 'puzzle' || screen === 'play') {
      const lvl = param ? parseInt(param, 10) : this.currentLevelNum || 1;
      this.switchScreen('puzzle', lvl, false);
    } else {
      this.switchScreen(screen, null, false);
    }
  }

  navigate(screenName, levelParam = null) {
    const targetHash = levelParam 
      ? `#/${screenName}/${levelParam}` 
      : `#/${screenName}`;
    
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      this.handleRoute(targetHash);
    }
  }

  showToast(msg, duration = 2400) {
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
    const data = window.storageManager?.data || { coins: 2450, username: 'ArrowPilot' };
    const coinEls = document.querySelectorAll('.user-coin-count');
    coinEls.forEach(el => el.textContent = data.coins || 2450);

    const usernameEls = document.querySelectorAll('.user-name-display');
    usernameEls.forEach(el => el.textContent = data.username);
  }

  switchScreen(screenName, levelNum = null, updateHistory = true) {
    if (updateHistory) {
      this.navigate(screenName, levelNum);
      return;
    }

    if (window.soundEngine) window.soundEngine.playClick();
    this.currentScreen = screenName;

    // Header and Nav visibility toggle for puzzle gameplay
    const mainHeader = document.getElementById('main-app-header');
    if (mainHeader) {
      mainHeader.style.display = screenName === 'puzzle' ? 'none' : 'flex';
    }
    const bottomNav = document.querySelector('.floating-bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = screenName === 'puzzle' ? 'none' : 'flex';
    }

    // Toggle active screen
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenName}`);
    if (target) {
      target.classList.add('active');
    } else {
      // Fallback to home
      document.getElementById('screen-home')?.classList.add('active');
      this.currentScreen = 'home';
    }

    const appFrame = document.querySelector('.mobile-app-frame');
    if (appFrame) {
      appFrame.classList.toggle('screen-home-active', this.currentScreen === 'home');
    }
    document.body.classList.toggle('screen-home-active', this.currentScreen === 'home');

    // Update bottom navigation bar active state
    document.querySelectorAll('.floating-bottom-nav .nav-pill-btn').forEach(btn => {
      if (btn.dataset.nav === screenName || (screenName === 'levels' && btn.dataset.nav === 'puzzle')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Screen specific triggers
    if (screenName === 'puzzle') {
      const targetLvl = levelNum || this.currentLevelNum || 1;
      this.launchBendingLevel(targetLvl, this.activeDifficulty);
    } else if (screenName === 'levels') {
      this.renderLevelGrid();
    } else if (screenName === 'shop') {
      this.renderShop();
    } else if (screenName === 'profile') {
      this.renderProfile();
    } else if (screenName === 'tournament') {
      this.renderWeeklyTournament();
    } else if (screenName === 'daily') {
      this.renderDailyChallenge();
    }

    this.updateHUD();
  }

  setupNavigation() {
    // Navigate on any [data-nav] click
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.nav;
        this.navigate(target);
      });
    });

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.history.length > 1 && window.location.hash && window.location.hash !== '#/') {
          window.history.back();
        } else {
          this.navigate('home');
        }
      });
    });
  }

  setupScreens() {
    // Difficulty filters in Levels screen
    document.querySelectorAll('.diff-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.diff-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeDifficulty = pill.dataset.diff || 'easy';
        this.renderLevelGrid();
      });
    });

    // Powerup buttons (💡 Hint and 📏 Undo)
    const hintBtn = document.getElementById('btn-powerup-hint');
    const undoBtn = document.getElementById('btn-powerup-undo');

    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        if (this.bendingEngine) {
          const success = this.bendingEngine.useHint();
          if (success) {
            this.showToast('Highlighted clear arrow!');
          } else {
            this.showToast('No clear arrows found!');
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

  // --- Bending Arrow Level Launcher (Matches Screenshot 2) ---
  launchBendingLevel(levelNum, difficulty = 'normal') {
    this.currentLevelNum = Number(levelNum) || 1;

    // Header text
    const titleEl = document.getElementById('puzzle-level-title');
    const puzzleData = window.BendingPuzzleGenerator.generateLevel(this.currentLevelNum, difficulty);
    const shapeLabel = puzzleData.shapeName ? ` · ${puzzleData.shapeName}` : '';
    if (titleEl) titleEl.textContent = `Level ${this.currentLevelNum}${shapeLabel}`;

    const diffBadge = document.getElementById('level-diff-badge');
    if (diffBadge) diffBadge.textContent = (puzzleData.difficulty || difficulty).toUpperCase();

    const boardContainer = document.getElementById('game-bending-board');
    if (!boardContainer) return;

    // Initialize engine
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
      onBlocked: () => {
        this.showToast('Obstacle in front! Path is blocked.');
      },
      onComplete: (stats) => {
        const res = window.storageManager?.recordLevelCompletion(`LVL-${this.currentLevelNum}`, difficulty, stats.totalTime) || { earnedCoins: 10 };
        this.showVictoryModal({
          title: `Level ${this.currentLevelNum} (${puzzleData.shapeName}) Cleared!`,
          time: `${stats.totalTime}s`,
          moves: stats.moves,
          earnedCoins: res.earnedCoins || 10,
          nextAction: () => {
            const nextLvl = Number(this.currentLevelNum) + 1;
            if (nextLvl <= 100) {
              this.navigate('puzzle', nextLvl);
            } else {
              this.showToast('🏆 Master Champion! You cleared all 100 levels!');
              this.navigate('levels');
            }
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

  // --- Level Selection Screen (All 100 Verified Shape Levels) ---
  renderLevelGrid() {
    const grid = document.getElementById('levels-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    const allLevels = window.ARROUT_LEVELS_100 || [];
    const filter = (this.activeDifficulty || 'all').toLowerCase();

    const filtered = allLevels.filter(lvl => {
      if (filter === 'all') return true;
      const d = (lvl.difficulty || '').toLowerCase();
      if (filter === 'medium' || filter === 'normal') return d === 'normal' || d === 'medium';
      return d === filter;
    });

    const clearedLevels = window.storageManager?.data?.clearedLevels || {};

    filtered.forEach(lvl => {
      const isCleared = !!clearedLevels[`LVL-${lvl.level}`];
      const card = document.createElement('div');
      card.className = `level-clay-card ${isCleared ? 'cleared' : ''}`;
      card.style.aspectRatio = 'auto';
      card.style.padding = '14px 12px';
      card.style.cursor = 'pointer';

      const diffLower = (lvl.difficulty || 'Easy').toLowerCase();
      const tagColor = diffLower === 'easy' ? '#10B981'
        : (diffLower === 'normal' || diffLower === 'medium') ? '#6C5CE7'
        : diffLower === 'hard' ? '#F59E0B'
        : '#EF4444';

      const tagBg = diffLower === 'easy' ? '#D1FAE5'
        : (diffLower === 'normal' || diffLower === 'medium') ? '#ECE8FD'
        : diffLower === 'hard' ? '#FEF3C7'
        : '#FEE2E2';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 1.15rem;">${lvl.icon || '🎯'}</span>
            <div class="lvl-card-num">${lvl.level}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 800; background: ${tagBg}; color: ${tagColor}; padding: 2px 8px; border-radius: 8px;">${lvl.difficulty.toUpperCase()}</span>
        </div>
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-navy); text-align: left; width: 100%; margin-top: 2px;">${lvl.shapeName}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: left; width: 100%;">${lvl.arrowCount} Arrows · ${lvl.occupiedCellCount} Cells</div>
        <div class="lvl-card-stars" style="margin-top: 6px; width: 100%; text-align: left;">${isCleared ? '⭐⭐⭐' : '☆☆☆'}</div>
      `;
      card.onclick = () => {
        this.navigate('puzzle', lvl.level);
      };
      grid.appendChild(card);
    });
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
        this.navigate('puzzle', 3);
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
    const info = window.tournamentManager?.getWeeklyInfo() || { timeRemaining: '48h', qualifyingCount: 10, targetCount: 10, isEligible: true };
    const meter = document.getElementById('tournament-eligibility-fill');
    const countText = document.getElementById('tournament-eligibility-count');
    const playBtn = document.getElementById('btn-enter-tournament');
    const lockedMsg = document.getElementById('tournament-locked-msg');

    if (meter) meter.style.width = '100%';
    if (countText) countText.textContent = '10 / 10 Qualifying Levels';
    if (playBtn) playBtn.disabled = false;
    if (lockedMsg) lockedMsg.style.display = 'none';

    const rowsContainer = document.getElementById('tournament-leaderboard-rows');
    if (rowsContainer) {
      rowsContainer.innerHTML = '';
      const list = [
        { rank: 1, name: 'ApexMaster', time: '14.82s' },
        { rank: 2, name: 'ArrowFox', time: '15.11s' },
        { rank: 3, name: 'CyberNinja', time: '16.45s' },
        { rank: 4, name: 'NeonMatrix', time: '17.02s' }
      ];
      list.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'background: #FFF; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--clay-shadow); font-size: 0.88rem;';
        row.innerHTML = `
          <div style="font-weight: 800; color: var(--accent-gold);">#${item.rank}</div>
          <div style="font-weight: 700; color: var(--text-navy);">${item.name}</div>
          <div style="font-weight: 800;">${item.time}</div>
        `;
        rowsContainer.appendChild(row);
      });
    }

    if (playBtn) {
      playBtn.onclick = () => {
        this.navigate('puzzle', 5);
      };
    }
  }

  // --- Daily Challenge ---
  renderDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('daily-challenge-date');
    if (dateEl) dateEl.textContent = today;

    const streakEl = document.getElementById('daily-streak-count');
    if (streakEl) streakEl.textContent = window.storageManager?.data?.stats?.streakDays || 3;

    const playBtn = document.getElementById('btn-play-daily');
    if (playBtn) {
      playBtn.onclick = () => {
        this.navigate('puzzle', 4);
      };
    }
  }

  // --- Shop ---
  renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';

    const items = window.SHOP_CATALOGUE?.themes || [
      { name: 'Classic Slate', price: 0, desc: 'Soft pastel default theme' },
      { name: 'Neon Cyber', price: 500, desc: 'Glowing neon violet edges' },
      { name: 'Enchanted Forest', price: 800, desc: 'Lush emerald tones' },
      { name: 'Golden Royalty', price: 2000, desc: 'Imperial gold accents' }
    ];

    items.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = 'background: #FFF; border-radius: 20px; padding: 16px; box-shadow: var(--clay-shadow); text-align: center;';
      card.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 6px;">🎨</div>
        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-navy); margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 12px;">${item.desc}</div>
        <button class="btn-primary-clay" style="padding: 8px 16px; font-size: 0.8rem;">${item.price === 0 ? 'EQUIPPED' : `🪙 ${item.price}`}</button>
      `;
      container.appendChild(card);
    });
  }

  // --- Profile ---
  renderProfile() {
    const data = window.storageManager?.data || {
      stats: { levelsCompleted: 36, matchesWon: 12, matchesLost: 4 },
      rating: 1350,
      achievements: []
    };

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
      const list = [
        { name: 'First Freedom', desc: 'Clear your first arrow puzzle.', reward: 50, unlocked: true },
        { name: 'Novice Solver', desc: 'Complete 5 different single-player levels.', reward: 100, unlocked: true },
        { name: 'Speed Demon', desc: 'Clear any puzzle in under 15 seconds.', reward: 150, unlocked: true },
        { name: 'Duelist Veteran', desc: 'Win 10 online 1v1 matches.', reward: 300, unlocked: false }
      ];
      list.forEach(ach => {
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
