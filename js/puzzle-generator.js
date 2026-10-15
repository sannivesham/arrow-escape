/**
 * Arrow Escape - Puzzle Generator & Solver
 * Guarantees 100% solvable puzzles across all difficulty tiers using
 * reverse construction + forward raycast solver validation.
 */

const DIRS = {
  UP: { dr: -1, dc: 0, name: 'UP', symbol: '↑', angle: 0 },
  RIGHT: { dr: 0, dc: 1, name: 'RIGHT', symbol: '→', angle: 90 },
  DOWN: { dr: 1, dc: 0, name: 'DOWN', symbol: '↓', angle: 180 },
  LEFT: { dr: 0, dc: -1, name: 'LEFT', symbol: '←', angle: 270 }
};

const DIR_KEYS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

class PuzzleGenerator {
  /**
   * Check if a specific arrow at (r, c) facing dir is blocked in grid.
   * Path is clear if all cells in that direction to the edge are empty.
   */
  static isArrowUnblocked(grid, r, c, dir, size) {
    const { dr, dc } = DIRS[dir];
    let currR = r + dr;
    let currC = c + dc;
    while (currR >= 0 && currR < size && currC >= 0 && currC < size) {
      if (grid[currR][currC] !== null) {
        return false; // Obstructed by another arrow!
      }
      currR += dr;
      currC += dc;
    }
    return true; // Path to edge is clear!
  }

  /**
   * Forward solver: returns true if the puzzle can be completely solved.
   */
  static solvePuzzle(size, arrowList) {
    // Clone grid
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    const activeArrows = new Map();

    arrowList.forEach(a => {
      grid[a.r][a.c] = a.dir;
      activeArrows.set(a.id, { ...a });
    });

    let progress = true;
    while (progress && activeArrows.size > 0) {
      progress = false;
      for (const [id, arrow] of activeArrows.entries()) {
        if (this.isArrowUnblocked(grid, arrow.r, arrow.c, arrow.dir, size)) {
          // Can escape!
          grid[arrow.r][arrow.c] = null;
          activeArrows.delete(id);
          progress = true;
          break; // restart check with updated board
        }
      }
    }

    return activeArrows.size === 0;
  }

  /**
   * Generates a guaranteed solvable puzzle for a given difficulty.
   */
  static generate({ difficulty = 'easy', seed = null, customSize = null, customCount = null }) {
    let size = 5;
    let targetCount = 10;

    switch (difficulty.toLowerCase()) {
      case 'easy':
        size = 5;
        targetCount = 10;
        break;
      case 'medium':
        size = 6;
        targetCount = 16;
        break;
      case 'hard':
        size = 7;
        targetCount = 24;
        break;
      case 'expert':
        size = 8;
        targetCount = 34;
        break;
    }

    if (customSize) size = customSize;
    if (customCount) targetCount = customCount;

    // Pseudo-random helper if seed provided
    let rng = Math.random;
    if (seed !== null) {
      let s = typeof seed === 'number' ? seed : seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 12345);
      rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    }

    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const grid = Array.from({ length: size }, () => Array(size).fill(null));
      const arrowList = [];
      let arrowId = 1;

      // Reverse placement
      let placed = 0;
      let placementRetries = 0;

      while (placed < targetCount && placementRetries < 200) {
        placementRetries++;
        const r = Math.floor(rng() * size);
        const c = Math.floor(rng() * size);

        if (grid[r][c] !== null) continue;

        // Try directions where path to boundary is currently clear in reverse
        const validDirs = [];
        for (const dir of DIR_KEYS) {
          if (this.isArrowUnblocked(grid, r, c, dir, size)) {
            validDirs.push(dir);
          }
        }

        if (validDirs.length > 0) {
          const chosenDir = validDirs[Math.floor(rng() * validDirs.length)];
          grid[r][c] = chosenDir;
          arrowList.push({
            id: arrowId++,
            r,
            c,
            dir: chosenDir
          });
          placed++;
        }
      }

      // Check if count achieved and forward solver confirms complete solvability
      if (placed >= Math.floor(targetCount * 0.85) && this.solvePuzzle(size, arrowList)) {
        return {
          size,
          difficulty,
          arrows: arrowList,
          arrowCount: arrowList.length
        };
      }
    }

    // Fallback: guaranteed simple perimeter pattern
    return this.generateFallback(size, targetCount);
  }

  static generateFallback(size, targetCount) {
    const arrows = [];
    let id = 1;
    // Edges facing outward are guaranteed unblocked
    for (let c = 0; c < size && arrows.length < targetCount; c++) {
      arrows.push({ id: id++, r: 0, c, dir: 'UP' });
      if (arrows.length < targetCount) arrows.push({ id: id++, r: size - 1, c, dir: 'DOWN' });
    }
    for (let r = 1; r < size - 1 && arrows.length < targetCount; r++) {
      arrows.push({ id: id++, r, c: 0, dir: 'LEFT' });
      if (arrows.length < targetCount) arrows.push({ id: id++, r, c: size - 1, dir: 'RIGHT' });
    }
    return { size, difficulty: 'easy', arrows, arrowCount: arrows.length };
  }
}

window.PuzzleGenerator = PuzzleGenerator;
window.DIRS = DIRS;
