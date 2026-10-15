/**
 * Arrow Escape - Core Game Engine
 * Manages active board state, precise raycast obstacle collision detection,
 * animations, move history, and power-ups.
 */

class ArrowEscapeEngine {
  constructor(options = {}) {
    this.container = options.container || null;
    this.size = 5;
    this.grid = [];
    this.arrows = new Map(); // id -> { id, r, c, dir, element }
    this.moveHistory = [];
    this.remainingCount = 0;
    this.totalCount = 0;
    this.isLocked = false;
    this.startTime = null;
    this.endTime = null;
    this.onEscape = options.onEscape || (() => {});
    this.onBlocked = options.onBlocked || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onCounterUpdate = options.onCounterUpdate || (() => {});
  }

  loadPuzzle(puzzleConfig) {
    this.size = puzzleConfig.size;
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    this.arrows.clear();
    this.moveHistory = [];
    this.isLocked = false;
    this.startTime = Date.now();
    this.endTime = null;

    puzzleConfig.arrows.forEach(a => {
      this.grid[a.r][a.c] = a.id;
      this.arrows.set(a.id, {
        id: a.id,
        r: a.r,
        c: a.c,
        dir: a.dir,
        element: null
      });
    });

    this.remainingCount = this.arrows.size;
    this.totalCount = this.arrows.size;
    this.onCounterUpdate(this.remainingCount, this.totalCount);

    if (this.container) {
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';
    this.container.style.setProperty('--grid-size', this.size);

    // Apply active theme class
    const theme = window.storageManager?.data?.equipped?.theme || 'classic';
    this.container.className = `arrow-board theme-${theme}`;

    // Render cells
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        this.container.appendChild(cell);
      }
    }

    // Render arrow elements
    const skin = window.storageManager?.data?.equipped?.skin || 'classic';
    this.arrows.forEach(arrow => {
      const arrowEl = this.createArrowElement(arrow, skin);
      arrow.element = arrowEl;
      this.container.appendChild(arrowEl);
    });
  }

  createArrowElement(arrow, skin) {
    const el = document.createElement('div');
    el.className = `arrow-item skin-${skin} dir-${arrow.dir.toLowerCase()}`;
    el.dataset.id = arrow.id;
    el.dataset.r = arrow.r;
    el.dataset.c = arrow.c;
    el.dataset.dir = arrow.dir;

    this.positionArrowElement(el, arrow.r, arrow.c);

    // Arrow SVG icon with styling
    el.innerHTML = this.getArrowSVG(arrow.dir, skin);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleArrowTap(arrow.id);
    });

    return el;
  }

  positionArrowElement(el, r, c) {
    const cellSizePct = 100 / this.size;
    el.style.width = `${cellSizePct}%`;
    el.style.height = `${cellSizePct}%`;
    el.style.top = `${r * cellSizePct}%`;
    el.style.left = `${c * cellSizePct}%`;
  }

  getArrowSVG(dir, skin) {
    // Dynamic arrow SVG with directional orientation
    const angle = window.DIRS[dir]?.angle || 0;
    return `
      <div class="arrow-inner" style="transform: rotate(${angle}deg);">
        <svg viewBox="0 0 44 44" class="arrow-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="22" cy="22" r="19" class="arrow-bg-disc" />
          <path d="M22 8L33 21H26V35H18V21H11L22 8Z" class="arrow-shape" />
          <path d="M22 13L28 20H24V31H20V20H16L22 13Z" class="arrow-glow-line" />
        </svg>
      </div>
    `;
  }

  checkBlocking(arrowId) {
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { unblocked: false };

    const { dr, dc } = window.DIRS[arrow.dir];
    let currR = arrow.r + dr;
    let currC = arrow.c + dc;

    while (currR >= 0 && currR < this.size && currC >= 0 && currC < this.size) {
      if (this.grid[currR][currC] !== null) {
        return {
          unblocked: false,
          blockerId: this.grid[currR][currC],
          blockerPos: { r: currR, c: currC }
        };
      }
      currR += dr;
      currC += dc;
    }

    return { unblocked: true };
  }

  handleArrowTap(arrowId) {
    if (this.isLocked) return;
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return;

    const check = this.checkBlocking(arrowId);

    if (check.unblocked) {
      // ESCAPE!
      this.executeEscape(arrow);
    } else {
      // BLOCKED!
      this.executeBlocked(arrow, check.blockerId);
    }
  }

  executeEscape(arrow) {
    // Update board state
    this.grid[arrow.r][arrow.c] = null;
    this.arrows.delete(arrow.id);
    this.remainingCount--;

    // Push to move history for undo
    this.moveHistory.push({
      id: arrow.id,
      r: arrow.r,
      c: arrow.c,
      dir: arrow.dir,
      element: arrow.element
    });

    // Sound
    if (window.soundEngine) window.soundEngine.playEscape();

    // Trigger visual flight animation in facing direction
    if (arrow.element) {
      const dirClass = `fly-${arrow.dir.toLowerCase()}`;
      arrow.element.classList.add('escaping', dirClass);
      setTimeout(() => {
        if (arrow.element && arrow.element.parentNode) {
          arrow.element.parentNode.removeChild(arrow.element);
        }
      }, 350);
    }

    this.onCounterUpdate(this.remainingCount, this.totalCount);
    this.onEscape(arrow, this.remainingCount);

    // Check level win
    if (this.remainingCount === 0) {
      this.isLocked = true;
      this.endTime = Date.now();
      const timeElapsedSec = Math.max(1, Math.round((this.endTime - this.startTime) / 1000));
      setTimeout(() => {
        if (window.soundEngine) window.soundEngine.playVictory();
        this.onComplete({
          totalTime: timeElapsedSec,
          moves: this.moveHistory.length
        });
      }, 400);
    }
  }

  executeBlocked(arrow, blockerId) {
    if (window.soundEngine) window.soundEngine.playBlocked();

    if (arrow.element) {
      arrow.element.classList.remove('blocked-shake');
      void arrow.element.offsetWidth; // trigger reflow
      arrow.element.classList.add('blocked-shake');
    }

    // Highlight the blocker briefly if found
    if (blockerId) {
      const blocker = this.arrows.get(blockerId);
      if (blocker && blocker.element) {
        blocker.element.classList.add('blocker-highlight');
        setTimeout(() => {
          blocker.element.classList.remove('blocker-highlight');
        }, 500);
      }
    }

    this.onBlocked(arrow);
  }

  // Powerup: Hint
  getUnblockedArrow() {
    for (const [id, arrow] of this.arrows.entries()) {
      if (this.checkBlocking(id).unblocked) {
        return arrow;
      }
    }
    return null;
  }

  useHint() {
    const hintArrow = this.getUnblockedArrow();
    if (hintArrow && hintArrow.element) {
      hintArrow.element.classList.remove('hint-pulse');
      void hintArrow.element.offsetWidth;
      hintArrow.element.classList.add('hint-pulse');
      if (window.soundEngine) window.soundEngine.playPowerup();
      return true;
    }
    return false;
  }

  // Powerup: Undo
  undoLastMove() {
    if (this.moveHistory.length === 0 || this.isLocked) return false;
    const lastMove = this.moveHistory.pop();

    this.grid[lastMove.r][lastMove.c] = lastMove.id;
    this.arrows.set(lastMove.id, lastMove);
    this.remainingCount++;

    // Re-render element
    const skin = window.storageManager?.data?.equipped?.skin || 'classic';
    const el = this.createArrowElement(lastMove, skin);
    lastMove.element = el;
    this.container.appendChild(el);

    this.onCounterUpdate(this.remainingCount, this.totalCount);
    if (window.soundEngine) window.soundEngine.playClick();
    return true;
  }
}

window.ArrowEscapeEngine = ArrowEscapeEngine;
