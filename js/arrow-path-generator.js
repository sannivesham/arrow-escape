/**
 * ARROUT - Bending Arrow Puzzle Generator
 * Handcrafted test levels (Levels 1-5, Level 36) + procedural generator
 */

class BendingPuzzleGenerator {
  static generateLevel(levelNum = 36, difficulty = 'normal') {
    const cols = 10;
    const rows = 14;

    switch (Number(levelNum)) {
      case 1:
        return this.getLevel1(cols, rows);
      case 2:
        return this.getLevel2(cols, rows);
      case 3:
        return this.getLevel3(cols, rows);
      case 4:
        return this.getLevel4(cols, rows);
      case 5:
        return this.getLevel5(cols, rows);
      case 36:
        return this.getLevel36(cols, rows, 36);
      default:
        if (levelNum % 10 === 6) {
          return this.getLevel36(cols, rows, levelNum);
        }
        return this.generateProcedural(cols, rows, levelNum, difficulty);
    }
  }

  /**
   * Level 1 — Starter Test (4 arrows, clean escapes)
   */
  static getLevel1(cols, rows) {
    return {
      cols,
      rows,
      levelNum: 1,
      difficulty: 'Easy',
      arrows: [
        { id: 1, dir: 'UP', points: [{ x: 2, y: 5 }, { x: 2, y: 2 }] },
        { id: 2, dir: 'RIGHT', points: [{ x: 4, y: 4 }, { x: 7, y: 4 }] },
        { id: 3, dir: 'DOWN', points: [{ x: 5, y: 8 }, { x: 5, y: 11 }] },
        { id: 4, dir: 'LEFT', points: [{ x: 6, y: 6 }, { x: 3, y: 6 }] }
      ]
    };
  }

  /**
   * Level 2 — Simple Obstacle Crossing (6 arrows)
   */
  static getLevel2(cols, rows) {
    return {
      cols,
      rows,
      levelNum: 2,
      difficulty: 'Easy',
      arrows: [
        { id: 1, dir: 'RIGHT', points: [{ x: 2, y: 3 }, { x: 7, y: 3 }] },
        { id: 2, dir: 'UP', points: [{ x: 4, y: 6 }, { x: 4, y: 4 }] }, // Blocked by arrow 1 until 1 escapes!
        { id: 3, dir: 'DOWN', points: [{ x: 7, y: 7 }, { x: 7, y: 11 }] },
        { id: 4, dir: 'LEFT', points: [{ x: 5, y: 9 }, { x: 2, y: 9 }] },
        { id: 5, dir: 'UP', points: [{ x: 8, y: 5 }, { x: 8, y: 2 }] },
        { id: 6, dir: 'LEFT', points: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 7, y: 6 }, { x: 6, y: 6 }] }
      ]
    };
  }

  /**
   * Level 3 — L-Bends & U-Turns (10 arrows)
   */
  static getLevel3(cols, rows) {
    return {
      cols,
      rows,
      levelNum: 3,
      difficulty: 'Normal',
      arrows: [
        { id: 1, dir: 'UP', points: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 1 }] },
        { id: 2, dir: 'RIGHT', points: [{ x: 3, y: 2 }, { x: 6, y: 2 }] },
        { id: 3, dir: 'DOWN', points: [{ x: 8, y: 2 }, { x: 8, y: 5 }] },
        { id: 4, dir: 'LEFT', points: [{ x: 7, y: 6 }, { x: 4, y: 6 }] },
        { id: 5, dir: 'DOWN', points: [{ x: 2, y: 7 }, { x: 2, y: 10 }] },
        { id: 6, dir: 'UP', points: [{ x: 5, y: 9 }, { x: 5, y: 7 }] },
        { id: 7, dir: 'RIGHT', points: [{ x: 4, y: 11 }, { x: 7, y: 11 }] },
        { id: 8, dir: 'UP', points: [{ x: 8, y: 12 }, { x: 8, y: 9 }] },
        { id: 9, dir: 'LEFT', points: [{ x: 8, y: 7 }, { x: 6, y: 7 }] },
        { id: 10, dir: 'DOWN', points: [{ x: 1, y: 1 }, { x: 1, y: 3 }] }
      ]
    };
  }

  /**
   * Level 4 — Maze Clusters (16 arrows)
   */
  static getLevel4(cols, rows) {
    return {
      cols,
      rows,
      levelNum: 4,
      difficulty: 'Normal',
      arrows: [
        { id: 1, dir: 'UP', points: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 1 }] },
        { id: 2, dir: 'RIGHT', points: [{ x: 3, y: 2 }, { x: 6, y: 2 }] },
        { id: 3, dir: 'DOWN', points: [{ x: 8, y: 1 }, { x: 8, y: 4 }] },
        { id: 4, dir: 'LEFT', points: [{ x: 7, y: 5 }, { x: 4, y: 5 }] },
        { id: 5, dir: 'UP', points: [{ x: 5, y: 4 }, { x: 5, y: 3 }] },
        { id: 6, dir: 'RIGHT', points: [{ x: 1, y: 6 }, { x: 3, y: 6 }] },
        { id: 7, dir: 'DOWN', points: [{ x: 2, y: 7 }, { x: 2, y: 10 }] },
        { id: 8, dir: 'LEFT', points: [{ x: 4, y: 8 }, { x: 1, y: 8 }] },
        { id: 9, dir: 'UP', points: [{ x: 6, y: 8 }, { x: 6, y: 6 }] },
        { id: 10, dir: 'RIGHT', points: [{ x: 6, y: 9 }, { x: 8, y: 9 }] },
        { id: 11, dir: 'DOWN', points: [{ x: 8, y: 10 }, { x: 8, y: 12 }] },
        { id: 12, dir: 'LEFT', points: [{ x: 7, y: 12 }, { x: 4, y: 12 }] },
        { id: 13, dir: 'UP', points: [{ x: 3, y: 12 }, { x: 3, y: 11 }] },
        { id: 14, dir: 'RIGHT', points: [{ x: 1, y: 11 }, { x: 2, y: 11 }] },
        { id: 15, dir: 'DOWN', points: [{ x: 5, y: 10 }, { x: 5, y: 13 }] },
        { id: 16, dir: 'UP', points: [{ x: 9, y: 7 }, { x: 9, y: 3 }] }
      ]
    };
  }

  /**
   * Level 5 — Advanced Bending (20 arrows)
   */
  static getLevel5(cols, rows) {
    const l4 = this.getLevel4(cols, rows);
    l4.levelNum = 5;
    l4.difficulty = 'Hard';
    l4.arrows.push(
      { id: 17, dir: 'DOWN', points: [{ x: 0, y: 2 }, { x: 0, y: 5 }] },
      { id: 18, dir: 'LEFT', points: [{ x: 9, y: 1 }, { x: 9, y: 2 }, { x: 7, y: 2 }] },
      { id: 19, dir: 'RIGHT', points: [{ x: 0, y: 9 }, { x: 1, y: 9 }] },
      { id: 20, dir: 'UP', points: [{ x: 7, y: 13 }, { x: 7, y: 10 }] }
    );
    return l4;
  }

  /**
   * Signature Level 36 (Exact match to screenshot 2 with 26 arrows)
   */
  static getLevel36(cols = 10, rows = 14, levelNum = 36) {
    const arrows = [
      // Top-Left Cluster
      { id: 1, dir: 'UP', points: [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }] },
      { id: 2, dir: 'UP', points: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 }] },
      { id: 3, dir: 'LEFT', points: [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 5 }] },

      // Top-Right Cluster
      { id: 4, dir: 'DOWN', points: [{ x: 5, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 2 }] },
      { id: 5, dir: 'LEFT', points: [{ x: 5, y: 3 }, { x: 5, y: 2 }, { x: 6, y: 2 }] },
      { id: 6, dir: 'DOWN', points: [{ x: 9, y: 1 }, { x: 9, y: 2 }] },
      { id: 7, dir: 'RIGHT', points: [{ x: 5, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 4 }, { x: 6, y: 4 }] },
      { id: 8, dir: 'UP', points: [{ x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }] },
      { id: 9, dir: 'RIGHT', points: [{ x: 5, y: 7 }, { x: 5, y: 6 }, { x: 6, y: 6 }] },
      { id: 10, dir: 'UP', points: [{ x: 9, y: 5 }, { x: 9, y: 4 }, { x: 8, y: 4 }] },

      // Mid/Bottom-Left Cluster
      { id: 11, dir: 'DOWN', points: [{ x: 0, y: 6 }, { x: 3, y: 6 }, { x: 3, y: 8 }] },
      { id: 12, dir: 'UP', points: [{ x: 1, y: 7 }, { x: 0, y: 7 }, { x: 0, y: 6 }] },
      { id: 13, dir: 'UP', points: [{ x: 2, y: 8 }, { x: 2, y: 6 }] },
      { id: 14, dir: 'DOWN', points: [{ x: 3, y: 8 }, { x: 3, y: 7 }, { x: 2, y: 7 }] },
      { id: 15, dir: 'UP', points: [{ x: 2, y: 11 }, { x: 2, y: 9 }, { x: 1, y: 9 }] },
      { id: 16, dir: 'DOWN', points: [{ x: 3, y: 9 }, { x: 3, y: 12 }] },
      { id: 17, dir: 'LEFT', points: [{ x: 2, y: 12 }, { x: 1, y: 12 }] },
      { id: 18, dir: 'RIGHT', points: [{ x: 1, y: 13 }, { x: 2, y: 13 }] },

      // Bottom-Right Coiled & L Cluster (Signature Red L-Path!)
      { id: 19, dir: 'DOWN', points: [{ x: 9, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 13 }] },
      { id: 20, dir: 'DOWN', points: [{ x: 6, y: 8 }, { x: 6, y: 11 }] },
      { id: 21, dir: 'DOWN', points: [{ x: 7, y: 9 }, { x: 7, y: 10 }] },
      { id: 22, dir: 'RIGHT', points: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 9, y: 10 }] },
      { id: 23, dir: 'DOWN', points: [{ x: 9, y: 8 }, { x: 9, y: 9 }] },
      { id: 24, dir: 'UP', points: [{ x: 4, y: 13 }, { x: 4, y: 12 }] },
      { id: 25, dir: 'UP', points: [{ x: 7, y: 13 }, { x: 7, y: 12 }] },
      { id: 26, dir: 'DOWN', points: [{ x: 8, y: 12 }, { x: 8, y: 13 }] }
    ];

    return {
      cols,
      rows,
      levelNum,
      difficulty: 'Normal',
      arrows
    };
  }

  /**
   * Procedural generator for infinite levels
   */
  static generateProcedural(cols, rows, levelNum, diff) {
    const arrows = [];
    let id = 1;

    let seed = levelNum * 7919 + 104729;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = diff === 'easy' ? 8 : diff === 'hard' ? 22 : 14;

    for (let i = 0; i < count; i++) {
      const type = Math.floor(rnd() * 3);
      const x = 1 + Math.floor(rnd() * (cols - 2));
      const y = 1 + Math.floor(rnd() * (rows - 2));

      if (type === 0) {
        const isVert = rnd() > 0.5;
        if (isVert) {
          const dir = rnd() > 0.5 ? 'UP' : 'DOWN';
          const len = 1 + Math.floor(rnd() * 3);
          const y2 = dir === 'UP' ? Math.max(0, y - len) : Math.min(rows - 1, y + len);
          arrows.push({ id: id++, dir, points: [{ x, y }, { x, y: y2 }] });
        } else {
          const dir = rnd() > 0.5 ? 'LEFT' : 'RIGHT';
          const len = 1 + Math.floor(rnd() * 3);
          const x2 = dir === 'LEFT' ? Math.max(0, x - len) : Math.min(cols - 1, x + len);
          arrows.push({ id: id++, dir, points: [{ x, y }, { x: x2, y }] });
        }
      } else if (type === 1) {
        const dir = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(rnd() * 4)];
        const midX = Math.min(cols - 1, Math.max(0, x + (rnd() > 0.5 ? 2 : -2)));
        const endY = dir === 'UP' ? Math.max(0, y - 2) : dir === 'DOWN' ? Math.min(rows - 1, y + 2) : y;
        arrows.push({ id: id++, dir, points: [{ x, y }, { x: midX, y }, { x: midX, y: endY }] });
      } else {
        const dir = rnd() > 0.5 ? 'UP' : 'DOWN';
        arrows.push({
          id: id++,
          dir,
          points: [
            { x, y },
            { x: Math.min(cols - 1, x + 2), y },
            { x: Math.min(cols - 1, x + 2), y: dir === 'UP' ? Math.max(0, y - 2) : Math.min(rows - 1, y + 2) }
          ]
        });
      }
    }

    return {
      cols,
      rows,
      levelNum,
      difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
      arrows
    };
  }
}

window.BendingPuzzleGenerator = BendingPuzzleGenerator;
