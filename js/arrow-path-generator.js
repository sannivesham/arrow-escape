/**
 * ARROUT - Shape-Based Dense Arrow Puzzle Generator
 * Generates verified, 100% solvable puzzle boards where arrows densely pack into
 * distinct silhouettes (Diamond, Heart, Circle, Triangle, Hexagon, Zigzag, Hourglass, Star).
 */

class BendingPuzzleGenerator {
  static getShapeNames() {
    return [
      'Diamond',
      'Heart',
      'Circle',
      'Triangle',
      'Hexagon',
      'Zigzag',
      'Hourglass',
      'Star'
    ];
  }

  static getShapeTypeForLevel(levelNum) {
    const list = ['diamond', 'heart', 'circle', 'triangle', 'hexagon', 'zigzag', 'hourglass', 'star'];
    return list[(levelNum - 1) % list.length];
  }

  static getShapeMask(type, cols = 11, rows = 15) {
    const midX = (cols - 1) / 2;
    const midY = (rows - 1) / 2;

    return (x, y) => {
      const nx = (x - midX) / (midX * 0.95);
      const ny = (y - midY) / (midY * 0.95);

      switch (type) {
        case 'diamond':
          return Math.abs(nx) + Math.abs(ny) <= 0.98;

        case 'circle':
          return (nx * nx + ny * ny) <= 0.92;

        case 'heart': {
          const hx = nx * 1.05;
          const hy = -ny * 1.05 + 0.15;
          const a = hx * hx + hy * hy - 0.55;
          return (a * a * a - hx * hx * hy * hy * hy) <= 0;
        }

        case 'triangle':
          return ny <= 0.85 && (Math.abs(nx) <= (ny + 0.85) * 0.65);

        case 'hexagon':
          return Math.abs(nx) <= 0.88 && (Math.abs(nx) * 0.5 + Math.abs(ny) * 0.866) <= 0.88;

        case 'zigzag': {
          const wave = Math.sin((ny + 1) * 3 * Math.PI) * 0.45;
          return Math.abs(nx - wave) <= 0.45;
        }

        case 'hourglass':
          return (Math.abs(nx) <= Math.abs(ny) * 0.85 + 0.15) && Math.abs(ny) <= 0.95;

        case 'star': {
          const r = Math.hypot(nx, ny);
          const angle = Math.atan2(ny, nx);
          const starR = 0.52 + 0.36 * Math.cos(5 * angle);
          return r <= starR;
        }

        case 'shield':
          return Math.abs(nx) <= 0.85 && (ny <= 0 ? ny >= -0.85 : (Math.abs(nx) <= 0.85 * (1 - Math.pow(ny, 2) * 0.75)));

        case 'crown':
          return (ny >= -0.2 && ny <= 0.8 && Math.abs(nx) <= 0.88) || (ny < -0.2 && (Math.abs(nx) <= 0.25 || (Math.abs(nx) >= 0.65 && Math.abs(nx) <= 0.88)));

        case 'cross':
          return (Math.abs(nx) <= 0.35 && Math.abs(ny) <= 0.88) || (Math.abs(ny) <= 0.35 && Math.abs(nx) <= 0.88);

        case 'ring': {
          const r2 = nx * nx + ny * ny;
          return r2 <= 0.92 && r2 >= 0.18;
        }

        case 'arrow':
        case 'arrowhead':
          return (Math.abs(nx) <= (-ny + 0.2) * 0.8 && ny <= 0.2) || (Math.abs(nx) <= 0.32 && ny >= 0.2 && ny <= 0.88);

        case 'clover': {
          const r = Math.hypot(nx, ny);
          const angle = Math.atan2(ny, nx);
          return r <= 0.45 + 0.38 * Math.abs(Math.sin(2 * angle));
        }

        case 'octagon':
          return Math.abs(nx) <= 0.88 && Math.abs(ny) <= 0.88 && (Math.abs(nx) + Math.abs(ny) <= 1.25);

        default:
          return true;
      }
    };
  }

  static generateLevel(levelNum = 1, difficulty = 'normal') {
    const num = Math.max(1, Number(levelNum) || 1);

    // Prioritize 100 verified shape levels from arrout_100_levels.json
    if (window.ARROUT_LEVELS_100 && window.ARROUT_LEVELS_100[num - 1]) {
      const lvl = window.ARROUT_LEVELS_100[num - 1];
      return {
        level: lvl.level,
        difficulty: lvl.difficulty,
        shapeType: lvl.shape,
        shapeName: lvl.shapeName,
        icon: lvl.icon,
        cols: lvl.cols,
        rows: lvl.rows,
        arrowCount: lvl.arrowCount,
        occupiedCellCount: lvl.occupiedCellCount,
        solutionOrder: lvl.solutionOrder,
        arrows: lvl.arrows.map(a => ({
          id: a.id,
          points: a.points.map(p => ({ x: p.x, y: p.y })),
          dir: a.dir,
          length: a.length,
          folds: a.folds
        }))
      };
    }

    const cols = 11;
    const rows = 15;
    const shapeType = this.getShapeTypeForLevel(num);
    const shapeName = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);

    let targetCount = Math.min(32, 10 + Math.floor(num * 0.8));
    const mask = this.getShapeMask(shapeType, cols, rows);
    const puzzle = this.buildGuaranteedShapePuzzle(shapeType, mask, num, targetCount, cols, rows, difficulty);
    puzzle.shapeName = shapeName;
    return puzzle;
  }

  /**
   * Reverse-Simulation Puzzle Generator:
   * Builds dense puzzle layouts that are mathematically guaranteed 100% solvable.
   * Every arrow placed has a verified, unobstructed path out of the board.
   */
  static buildGuaranteedShapePuzzle(shapeType, mask, levelNum, targetCount, cols, rows, difficulty) {
    let s = Number(levelNum) * 8191 + 104729;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // Filter valid cells inside the silhouette
    const validCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mask(c, r)) validCells.push({ x: c, y: r });
      }
    }

    // Engine instance to test collisions during reverse building
    const eng = new window.BendingArrowEngine({ cols, rows });
    eng.loadPuzzle({ cols, rows, arrows: [] });
    const arrows = [];
    let id = 1;
    let attempts = 0;

    const bendProbability = difficulty === 'easy' ? 0.35 : (difficulty === 'hard' ? 0.75 : 0.55);

    while (arrows.length < targetCount && attempts < 1200) {
      attempts++;
      const start = validCells[Math.floor(rnd() * validCells.length)];
      const isBend = rnd() < bendProbability;

      let points = [];
      if (!isBend) {
        // Straight Arrow: length 1 to 3
        const dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(rnd() * 4)];
        const len = 1 + Math.floor(rnd() * 3);
        const endX = dir === 'LEFT' ? start.x - len : dir === 'RIGHT' ? start.x + len : start.x;
        const endY = dir === 'UP' ? start.y - len : dir === 'DOWN' ? start.y + len : start.y;

        if (mask(endX, endY) && endX >= 0 && endX < cols && endY >= 0 && endY < rows) {
          points = [{ x: start.x, y: start.y }, { x: endX, y: endY }];
        }
      } else {
        // Folded / Bending Arrow (90-degree bend)
        const isHFirst = rnd() > 0.5;
        const dx = (rnd() > 0.5 ? 1 : -1) * (1 + Math.floor(rnd() * 2));
        const dy = (rnd() > 0.5 ? 1 : -1) * (1 + Math.floor(rnd() * 2));
        const mid = isHFirst ? { x: start.x + dx, y: start.y } : { x: start.x, y: start.y + dy };
        const end = { x: start.x + dx, y: start.y + dy };

        if (mask(mid.x, mid.y) && mask(end.x, end.y) &&
            mid.x >= 0 && mid.x < cols && mid.y >= 0 && mid.y < rows &&
            end.x >= 0 && end.x < cols && end.y >= 0 && end.y < rows) {
          points = [{ x: start.x, y: start.y }, mid, end];
        }
      }

      if (points.length >= 2) {
        // Determine forward direction from the last segment
        const pLast = points[points.length - 1];
        const pPrev = points[points.length - 2];
        let segDir = 'UP';
        if (pLast.x > pPrev.x) segDir = 'RIGHT';
        else if (pLast.x < pPrev.x) segDir = 'LEFT';
        else if (pLast.y > pPrev.y) segDir = 'DOWN';
        else if (pLast.y < pPrev.y) segDir = 'UP';

        const cand = { id, dir: segDir, points };
        eng.arrows.set(id, cand);

        // Crucial reverse check: arrow must have an unobstructed escape path!
        if (!eng.checkArrowCollision(id).blocked) {
          arrows.push(cand);
          id++;
        } else {
          eng.arrows.delete(id);
        }
      }
    }

    return {
      cols,
      rows,
      levelNum,
      shapeType,
      shapeMask: mask,
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      arrows
    };
  }
}

window.BendingPuzzleGenerator = BendingPuzzleGenerator;
