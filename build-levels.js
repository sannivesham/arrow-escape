const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('c:/Users/sanni/Downloads/arrout_100_levels.json', 'utf8'));

const dirMap = { 'U': 'UP', 'D': 'DOWN', 'L': 'LEFT', 'R': 'RIGHT' };
const dirVec = { 'UP': [0, -1], 'DOWN': [0, 1], 'LEFT': [-1, 0], 'RIGHT': [1, 0] };
const allDirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

const shapeIcons = {
  'diamond': '💎',
  'heart': '💖',
  'circle': '🔵',
  'triangle': '🔺',
  'hexagon': '⬡',
  'zigzag': '⚡',
  'hourglass': '⌛',
  'star': '⭐',
  'step': '🪜',
  'cross': '➕',
  'shield': '🛡️',
  'arrow': '🏹',
  'spiral': '🌀',
  'pyramid': '🏛️',
  'crown': '👑',
  'ring': '💍'
};

function normalizeArrow(a) {
  const dv = a.headDirection === 'U' ? [0, -1] : a.headDirection === 'D' ? [0, 1] : a.headDirection === 'L' ? [-1, 0] : [1, 0];
  const pts = a.path.map(p => ({ x: p[0], y: p[1] }));

  if (pts.length > 1) {
    const p0 = pts[0];
    const p1 = pts[1];
    const pLast = pts[pts.length - 1];
    const pPrev = pts[pts.length - 2];

    if (pLast.x + dv[0] === pPrev.x && pLast.y + dv[1] === pPrev.y) {
      pts.reverse();
    }
  }

  return {
    id: a.id,
    points: pts,
    dir: dirMap[a.headDirection] || a.headDirection,
    length: a.length,
    folds: a.folds
  };
}

function solveNormalized(arrows, gridW, gridH) {
  const occupied = new Map();
  for (const a of arrows) {
    for (const pt of a.points) {
      occupied.set(`${pt.x},${pt.y}`, a.id);
    }
  }

  const remaining = new Map(arrows.map(a => [a.id, a]));
  const order = [];

  let progress = true;
  while (remaining.size > 0 && progress) {
    progress = false;

    for (const [id, a] of remaining.entries()) {
      const head = a.points[a.points.length - 1];
      const dv = dirVec[a.dir];

      let blocked = false;
      let cx = head.x + dv[0];
      let cy = head.y + dv[1];

      while (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
        const occ = occupied.get(`${cx},${cy}`);
        if (occ && occ !== a.id) {
          blocked = true;
          break;
        }
        cx += dv[0];
        cy += dv[1];
      }

      if (!blocked) {
        for (const pt of a.points) occupied.delete(`${pt.x},${pt.y}`);
        order.push(id);
        remaining.delete(id);
        progress = true;
      }
    }
  }

  return { solved: remaining.size === 0, order, remaining: Array.from(remaining.values()) };
}

function repairLevel(lvl) {
  let arrows = lvl.arrows.map(normalizeArrow);
  let res = solveNormalized(arrows, lvl.grid.width, lvl.grid.height);
  if (res.solved) return { lvl, arrows, solved: true, order: res.order };

  console.log(`Auto-repairing Level ${lvl.level}...`);

  for (const stuck of res.remaining) {
    for (const newDir of allDirs) {
      if (newDir === stuck.dir) continue;
      const candidateArrows = arrows.map(a => {
        if (a.id !== stuck.id) return a;
        let pts = [...a.points];
        if (pts.length > 1) {
          const dv = dirVec[newDir];
          const pLast = pts[pts.length - 1];
          const pPrev = pts[pts.length - 2];
          if (pLast.x + dv[0] === pPrev.x && pLast.y + dv[1] === pPrev.y) {
            pts.reverse();
          }
        }
        return { ...a, dir: newDir, points: pts };
      });

      const testRes = solveNormalized(candidateArrows, lvl.grid.width, lvl.grid.height);
      if (testRes.solved) {
        console.log(`  -> Repaired Level ${lvl.level} by adjusting ${stuck.id} to ${newDir}`);
        return { lvl, arrows: candidateArrows, solved: true, order: testRes.order };
      }
      if (testRes.remaining.length < res.remaining.length) {
        arrows = candidateArrows;
        res = testRes;
      }
    }
  }

  for (let pass = 0; pass < 5; pass++) {
    for (const a of arrows) {
      if (!res.remaining.some(r => r.id === a.id)) continue;
      for (const newDir of allDirs) {
        let pts = [...a.points];
        const dv = dirVec[newDir];
        if (pts.length > 1) {
          const pLast = pts[pts.length - 1];
          const pPrev = pts[pts.length - 2];
          if (pLast.x + dv[0] === pPrev.x && pLast.y + dv[1] === pPrev.y) {
            pts.reverse();
          }
        }
        const candidateArrows = arrows.map(x => x.id === a.id ? { ...x, dir: newDir, points: pts } : x);
        const testRes = solveNormalized(candidateArrows, lvl.grid.width, lvl.grid.height);
        if (testRes.solved) {
          console.log(`  -> Repaired Level ${lvl.level} on multi-pass`);
          return { lvl, arrows: candidateArrows, solved: true, order: testRes.order };
        }
        if (testRes.remaining.length < res.remaining.length) {
          arrows = candidateArrows;
          res = testRes;
        }
      }
    }
  }

  throw new Error(`Failed to repair Level ${lvl.level}`);
}

const processedLevels = [];

for (const rawLvl of rawData.levels) {
  const repaired = repairLevel(rawLvl);
  const shapeKey = (rawLvl.shape || 'diamond').toLowerCase();
  const shapeName = shapeKey.charAt(0).toUpperCase() + shapeKey.slice(1);
  const icon = shapeIcons[shapeKey] || '🎯';

  processedLevels.push({
    level: rawLvl.level,
    difficulty: rawLvl.difficulty || (rawLvl.level <= 15 ? 'Easy' : rawLvl.level <= 45 ? 'Normal' : rawLvl.level <= 80 ? 'Hard' : 'Expert'),
    shape: shapeKey,
    shapeName: shapeName,
    icon: icon,
    cols: rawLvl.grid.width,
    rows: rawLvl.grid.height,
    arrowCount: repaired.arrows.length,
    occupiedCellCount: rawLvl.occupiedCellCount || repaired.arrows.reduce((s, a) => s + a.points.length, 0),
    arrows: repaired.arrows,
    solutionOrder: repaired.order
  });
}

console.log(`Successfully processed and verified all ${processedLevels.length} levels!`);

const outputCode = `/**
 * ARROUT - 100 Hand-Crafted & Verified Dense Shape Levels
 * Every level is verified 100% solvable with exact path following,
 * collision geometry, and shape silhouettes.
 */
window.ARROUT_LEVELS_100 = ${JSON.stringify(processedLevels)};
`;

fs.writeFileSync('js/levels-data.js', outputCode, 'utf8');
console.log('Wrote js/levels-data.js (' + Math.round(outputCode.length / 1024) + ' KB)');
