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
          const starR = 0.5 + 0.35 * Math.cos(5 * angle);
          return r <= starR;
        }

        default:
          return true;
      }
    };
  }

  static generateLevel(levelNum = 1, difficulty = 'normal') {
    const cols = 11;
    const rows = 15;
    const shapeType = this.getShapeTypeForLevel(Number(levelNum));
    const shapeName = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);

    // Target arrow count scales progressively with level number
    let targetCount = 10;
    if (levelNum === 1) targetCount = 10; // Diamond Starter
    else if (levelNum === 2) targetCount = 12; // Heart
    else if (levelNum === 3) targetCount = 14; // Circle
    else if (levelNum === 4) targetCount = 16; // Triangle
    else if (levelNum === 5) targetCount = 20; // Hexagon
    else if (levelNum === 6) targetCount = 22; // Zigzag
    else {
      targetCount = Math.min(32, 14 + Math.floor(levelNum * 1.2));
    }

    const mask = this.getShapeMask(shapeType, cols, rows);
    const puzzle = this.buildGuaranteedShapePuzzle(shapeType, mask, levelNum, targetCount, cols, rows, difficulty);
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
