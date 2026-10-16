const fs = require('fs');

/**
 * ARROUT - Master 100 Level Generator
 * Creates 100 dense, shape-based levels matching the reference game design:
 * - Clear silhouettes (Diamond, Heart, Circle, Triangle, Hexagon, Zigzag, Hourglass, Star, Shield, Crown, Cross, Ring, etc.)
 * - Zero bare 1-cell arrows (every arrow has a distinct body line >= 2 cells)
 * - Every arrowhead strictly aligned with the forward direction of its final segment
 * - Smooth 90-degree bends and straight arrows
 * - Verified 100% solvable with raycast collision and forward solution order
 */

const SHAPES = [
  { type: 'diamond', name: 'Diamond', icon: '💎' },
  { type: 'heart', name: 'Heart', icon: '💖' },
  { type: 'circle', name: 'Circle', icon: '🔵' },
  { type: 'triangle', name: 'Triangle', icon: '🔺' },
  { type: 'hexagon', name: 'Hexagon', icon: '⬡' },
  { type: 'zigzag', name: 'Zigzag', icon: '⚡' },
  { type: 'hourglass', name: 'Hourglass', icon: '⌛' },
  { type: 'star', name: 'Star', icon: '⭐' },
  { type: 'shield', name: 'Shield', icon: '🛡️' },
  { type: 'crown', name: 'Crown', icon: '👑' },
  { type: 'cross', name: 'Cross', icon: '➕' },
  { type: 'ring', name: 'Ring', icon: '💍' },
  { type: 'arrowhead', name: 'Arrow', icon: '🏹' },
  { type: 'clover', name: 'Clover', icon: '🍀' },
  { type: 'octagon', name: 'Octagon', icon: '🛑' }
];

function getShapeMask(type, cols, rows) {
  const midX = (cols - 1) / 2;
  const midY = (rows - 1) / 2;

  return (x, y) => {
    const nx = (x - midX) / (midX * 0.95);
    const ny = (y - midY) / (midY * 0.95);

    switch (type) {
      case 'diamond':
        return Math.abs(nx) + Math.abs(ny) <= 0.96;

      case 'circle':
        return (nx * nx + ny * ny) <= 0.92;

      case 'heart': {
        const hx = nx * 1.05;
        const hy = -ny * 1.05 + 0.15;
        const a = hx * hx + hy * hy - 0.55;
        return (a * a * a - hx * hx * hy * hy * hy) <= 0;
      }

      case 'triangle':
        return ny <= 0.88 && (Math.abs(nx) <= (ny + 0.92) * 0.62);

      case 'hexagon':
        return Math.abs(nx) <= 0.88 && (Math.abs(nx) * 0.5 + Math.abs(ny) * 0.866) <= 0.88;

      case 'zigzag': {
        const wave = Math.sin((ny + 1) * 3 * Math.PI) * 0.42;
        return Math.abs(nx - wave) <= 0.48;
      }

      case 'hourglass':
        return (Math.abs(nx) <= Math.abs(ny) * 0.85 + 0.18) && Math.abs(ny) <= 0.95;

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

function getLineCells(p1, p2) {
  const cells = [];
  const dx = Math.sign(p2.x - p1.x);
  const dy = Math.sign(p2.y - p1.y);
  let cx = p1.x;
  let cy = p1.y;

  cells.push({ x: cx, y: cy });
  while (cx !== p2.x || cy !== p2.y) {
    cx += dx;
    cy += dy;
    cells.push({ x: cx, y: cy });
  }
  return cells;
}

function checkRayBlocked(head, dir, otherArrows) {
  const dv = dir === 'UP' ? [0, -1] : dir === 'DOWN' ? [0, 1] : dir === 'LEFT' ? [-1, 0] : [1, 0];

  for (const other of otherArrows) {
    for (const pt of other.allCells) {
      if (dv[0] === 0 && dv[1] < 0 && pt.x === head.x && pt.y < head.y) return true;
      if (dv[0] === 0 && dv[1] > 0 && pt.x === head.x && pt.y > head.y) return true;
      if (dv[1] === 0 && dv[0] < 0 && pt.y === head.y && pt.x < head.x) return true;
      if (dv[1] === 0 && dv[0] > 0 && pt.y === head.y && pt.x > head.x) return true;
    }
  }
  return false;
}

function generateVerifiedLevel(levelNum) {
  const shapeInfo = SHAPES[(levelNum - 1) % SHAPES.length];
  const cols = 11;
  const rows = 15;

  let difficulty = 'Easy';
  let targetCount = 10;
  let bendChance = 0.35;
  let maxArrowLen = 3;

  if (levelNum <= 15) {
    difficulty = 'Easy';
    targetCount = 10 + Math.floor((levelNum - 1) * 0.5); // 10 to 17
    bendChance = 0.35;
    maxArrowLen = 3;
  } else if (levelNum <= 45) {
    difficulty = 'Normal';
    targetCount = 18 + Math.floor((levelNum - 16) * 0.35); // 18 to 28
    bendChance = 0.55;
    maxArrowLen = 4;
  } else if (levelNum <= 80) {
    difficulty = 'Hard';
    targetCount = 28 + Math.floor((levelNum - 46) * 0.28); // 28 to 37
    bendChance = 0.70;
    maxArrowLen = 5;
  } else {
    difficulty = 'Expert';
    targetCount = 36 + Math.floor((levelNum - 81) * 0.35); // 36 to 43
    bendChance = 0.80;
    maxArrowLen = 6;
  }

  const mask = getShapeMask(shapeInfo.type, cols, rows);
  const validCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask(c, r)) validCells.push({ x: c, y: r });
    }
  }

  let attemptLevel = 0;
  while (attemptLevel < 20) {
    attemptLevel++;
    let seed = levelNum * 99991 + attemptLevel * 77717;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const occupied = new Set();
    const placedArrows = [];
    let loopAttempts = 0;

    while (placedArrows.length < targetCount && loopAttempts < 2000) {
      loopAttempts++;
      const availableCells = validCells.filter(c => !occupied.has(`${c.x},${c.y}`));
      if (availableCells.length === 0) break;

      const start = availableCells[Math.floor(rnd() * availableCells.length)];
      const isBend = rnd() < bendChance;

      let points = [];
      let dir = 'UP';
      let arrowCells = [];

      if (!isBend) {
        // Straight Arrow (length between 2 and maxArrowLen)
        const testDirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'].sort(() => rnd() - 0.5);
        for (const d of testDirs) {
          const len = 1 + Math.floor(rnd() * (maxArrowLen - 1)); // 1 to (maxArrowLen-1) steps => 2 to maxArrowLen cells
          const endX = d === 'LEFT' ? start.x - len : d === 'RIGHT' ? start.x + len : start.x;
          const endY = d === 'UP' ? start.y - len : d === 'DOWN' ? start.y + len : start.y;

          if (endX >= 0 && endX < cols && endY >= 0 && endY < rows && mask(endX, endY)) {
            const cells = getLineCells(start, { x: endX, y: endY });
            const clash = cells.some(c => occupied.has(`${c.x},${c.y}`));
            if (!clash) {
              points = [start, { x: endX, y: endY }];
              dir = d;
              arrowCells = cells;
              break;
            }
          }
        }
      } else {
        // Folded Arrow: Start -> Mid -> End (90-degree turn)
        const isHFirst = rnd() > 0.5;
        const signsX = [1, -1].sort(() => rnd() - 0.5);
        const signsY = [1, -1].sort(() => rnd() - 0.5);

        for (const sx of signsX) {
          for (const sy of signsY) {
            const len1 = 1 + Math.floor(rnd() * 2);
            const len2 = 1 + Math.floor(rnd() * 2);

            const mid = isHFirst ? { x: start.x + sx * len1, y: start.y } : { x: start.x, y: start.y + sy * len1 };
            const end = isHFirst ? { x: mid.x, y: mid.y + sy * len2 } : { x: mid.x + sx * len2, y: mid.y };

            if (mid.x >= 0 && mid.x < cols && mid.y >= 0 && mid.y < rows && mask(mid.x, mid.y) &&
                end.x >= 0 && end.x < cols && end.y >= 0 && end.y < rows && mask(end.x, end.y)) {
              
              const seg1 = getLineCells(start, mid);
              const seg2 = getLineCells(mid, end).slice(1);
              const allC = [...seg1, ...seg2];

              const clash = allC.some(c => occupied.has(`${c.x},${c.y}`));
              if (!clash) {
                points = [start, mid, end];
                const pPrev = mid;
                const pLast = end;
                if (pLast.x > pPrev.x) dir = 'RIGHT';
                else if (pLast.x < pPrev.x) dir = 'LEFT';
                else if (pLast.y > pPrev.y) dir = 'DOWN';
                else if (pLast.y < pPrev.y) dir = 'UP';
                arrowCells = allC;
                break;
              }
            }
          }
          if (points.length > 0) break;
        }
      }

      if (points.length >= 2) {
        const arrowId = `L${String(levelNum).padStart(3, '0')}_A${String(placedArrows.length + 1).padStart(3, '0')}`;
        const head = points[points.length - 1];

        // Check if forward escape ray from head is blocked by previously placed arrows
        if (!checkRayBlocked(head, dir, placedArrows)) {
          const cand = {
            id: arrowId,
            points: points,
            dir: dir,
            length: arrowCells.length,
            folds: points.length - 2,
            allCells: arrowCells
          };
          placedArrows.push(cand);
          for (const c of arrowCells) {
            occupied.add(`${c.x},${c.y}`);
          }
        }
      }
    }

    // Verify forward solvability from scratch
    if (placedArrows.length >= Math.min(8, targetCount - 2)) {
      const solverOccupied = new Map();
      for (const a of placedArrows) {
        for (const c of a.allCells) {
          solverOccupied.set(`${c.x},${c.y}`, a.id);
        }
      }

      const remaining = new Map(placedArrows.map(a => [a.id, a]));
      const forwardOrder = [];
      let forwardProgress = true;

      while (remaining.size > 0 && forwardProgress) {
        forwardProgress = false;
        for (const [id, a] of remaining.entries()) {
          const head = a.points[a.points.length - 1];
          const dv = a.dir === 'UP' ? [0, -1] : a.dir === 'DOWN' ? [0, 1] : a.dir === 'LEFT' ? [-1, 0] : [1, 0];

          let blocked = false;
          let cx = head.x + dv[0];
          let cy = head.y + dv[1];

          while (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const occ = solverOccupied.get(`${cx},${cy}`);
            if (occ && occ !== a.id) {
              blocked = true;
              break;
            }
            cx += dv[0];
            cy += dv[1];
          }

          if (!blocked) {
            for (const c of a.allCells) solverOccupied.delete(`${c.x},${c.y}`);
            forwardOrder.push(id);
            remaining.delete(id);
            forwardProgress = true;
          }
        }
      }

      if (remaining.size === 0) {
        // Solved 100%!
        const finalArrows = placedArrows.map(a => ({
          id: a.id,
          points: a.points,
          dir: a.dir,
          length: a.length,
          folds: a.folds
        }));

        return {
          level: levelNum,
          difficulty: difficulty,
          shape: shapeInfo.type,
          shapeName: shapeInfo.name,
          icon: shapeInfo.icon,
          cols: cols,
          rows: rows,
          arrowCount: finalArrows.length,
          occupiedCellCount: occupied.size,
          arrows: finalArrows,
          solutionOrder: forwardOrder
        };
      }
    }
  }

  throw new Error(`Failed to generate level ${levelNum}`);
}

console.log('Generating 100 master levels with real arrow bodies and verified silhouettes...');
const all100 = [];
for (let lvl = 1; lvl <= 100; lvl++) {
  const levelData = generateVerifiedLevel(lvl);
  all100.push(levelData);
  if (lvl % 10 === 0 || lvl === 1) {
    console.log(`✓ Level ${lvl}: ${levelData.shapeName} ${levelData.icon} | ${levelData.arrowCount} arrows | ${levelData.occupiedCellCount} cells | Diff: ${levelData.difficulty}`);
  }
}

const outputCode = `/**
 * ARROUT - 100 Master Verified Shape-Based Levels
 * Rules:
 * 1. Clean, dense silhouettes (Diamond, Heart, Circle, Triangle, Hexagon, Star, Hourglass, Zigzag, etc.)
 * 2. Every arrow has a real body line (length >= 2, no solitary 1-cell triangles)
 * 3. Every arrowhead is strictly aligned with the forward direction of its final segment
 * 4. 100% verified solvable with real path following and collision raycasting
 */
window.ARROUT_LEVELS_100 = ${JSON.stringify(all100)};
`;

fs.writeFileSync('js/levels-data.js', outputCode, 'utf8');
console.log('Successfully wrote js/levels-data.js (' + Math.round(outputCode.length / 1024) + ' KB)!');
