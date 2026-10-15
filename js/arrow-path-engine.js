/**
 * ARROUT - Bending Path Arrow Engine
 * Supports straight, L-shaped, U-shaped, and zigzag bending arrow paths
 * on a dotted grid, matching media_1792055946735.jpg exactly.
 */

class BendingArrowEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.cols = options.cols || 10;
    this.rows = options.rows || 14;
    this.arrows = new Map(); // id -> arrow
    this.hearts = 3;
    this.maxHearts = 3;
    this.isLocked = false;
    this.moveHistory = [];
    
    this.onEscape = options.onEscape || (() => {});
    this.onBlocked = options.onBlocked || (() => {});
    this.onHeartsChange = options.onHeartsChange || (() => {});
    this.onCountChange = options.onCountChange || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  loadPuzzle(puzzleData) {
    this.cols = puzzleData.cols || 10;
    this.rows = puzzleData.rows || 14;
    this.arrows.clear();
    this.hearts = 3;
    this.isLocked = false;
    this.moveHistory = [];
    this.startTime = Date.now();

    puzzleData.arrows.forEach(a => {
      this.arrows.set(a.id, {
        id: a.id,
        points: [...a.points],
        dir: a.dir,
        isBlocked: false,
        element: null
      });
    });

    this.onHeartsChange(this.hearts, this.maxHearts);
    this.onCountChange(this.arrows.size);

    if (this.container) {
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';

    // Create Dotted Grid Background
    const dotGrid = document.createElement('div');
    dotGrid.className = 'board-dots-grid';
    
    // Set CSS grid size variables
    const paddingX = 24;
    const paddingY = 24;
    const boardWidth = this.container.clientWidth || 340;
    const boardHeight = this.container.clientHeight || 480;

    this.cellW = (boardWidth - paddingX * 2) / (this.cols - 1);
    this.cellH = (boardHeight - paddingY * 2) / (this.rows - 1);

    this.container.style.setProperty('--dot-gap-x', `${this.cellW}px`);
    this.container.style.setProperty('--dot-gap-y', `${this.cellH}px`);
    this.container.style.setProperty('--dot-offset-x', `${paddingX}px`);
    this.container.style.setProperty('--dot-offset-y', `${paddingY}px`);

    this.container.appendChild(dotGrid);

    // Create SVG Canvas for Arrow Paths
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'board-svg-canvas');
    svg.setAttribute('viewBox', `0 0 ${boardWidth} ${boardHeight}`);
    this.svg = svg;

    this.arrows.forEach(arrow => {
      const g = this.createArrowSVGGroup(arrow, paddingX, paddingY, this.cellW, this.cellH);
      arrow.element = g;
      svg.appendChild(g);
    });

    this.container.appendChild(svg);
  }

  getPixelPos(gridX, gridY, padX, padY, stepX, stepY) {
    return {
      x: padX + gridX * stepX,
      y: padY + gridY * stepY
    };
  }

  createArrowSVGGroup(arrow, padX, padY, stepX, stepY) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'arrow-group');
    g.setAttribute('data-id', arrow.id);

    // Build polyline d attribute
    let pathD = '';
    arrow.points.forEach((pt, idx) => {
      const px = this.getPixelPos(pt.x, pt.y, padX, padY, stepX, stepY);
      if (idx === 0) {
        pathD += `M ${px.x} ${px.y}`;
      } else {
        pathD += ` L ${px.x} ${px.y}`;
      }
    });

    // Create Polyline Path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'arrow-path');
    g.appendChild(path);

    // Create Arrow Head at final point
    const headPt = arrow.points[arrow.points.length - 1];
    const prevPt = arrow.points[arrow.points.length - 2] || headPt;
    const headPx = this.getPixelPos(headPt.x, headPt.y, padX, padY, stepX, stepY);

    const headPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    headPolygon.setAttribute('class', 'arrow-head');

    // Direction vector
    const size = 10;
    let pointsStr = '';
    if (arrow.dir === 'UP') {
      pointsStr = `${headPx.x},${headPx.y - size} ${headPx.x - size * 0.75},${headPx.y + size * 0.4} ${headPx.x + size * 0.75},${headPx.y + size * 0.4}`;
    } else if (arrow.dir === 'DOWN') {
      pointsStr = `${headPx.x},${headPx.y + size} ${headPx.x - size * 0.75},${headPx.y - size * 0.4} ${headPx.x + size * 0.75},${headPx.y - size * 0.4}`;
    } else if (arrow.dir === 'LEFT') {
      pointsStr = `${headPx.x - size},${headPx.y} ${headPx.x + size * 0.4},${headPx.y - size * 0.75} ${headPx.x + size * 0.4},${headPx.y + size * 0.75}`;
    } else if (arrow.dir === 'RIGHT') {
      pointsStr = `${headPx.x + size},${headPx.y} ${headPx.x - size * 0.4},${headPx.y - size * 0.75} ${headPx.x - size * 0.4},${headPx.y + size * 0.75}`;
    }
    headPolygon.setAttribute('points', pointsStr);
    g.appendChild(headPolygon);

    // Tap Event
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleArrowTap(arrow.id);
    });

    return g;
  }

  /**
   * Raycast obstacle detection:
   * Checks if the arrowhead can travel forward to the edge of the board
   * without colliding with any segments of other arrows.
   */
  checkArrowCollision(arrowId) {
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { blocked: true };

    const head = arrow.points[arrow.points.length - 1];
    const { dx, dy } = this.getDirVector(arrow.dir);

    // Ray extends from head towards edge
    // Check against every other active arrow
    for (const [otherId, otherArrow] of this.arrows.entries()) {
      if (otherId === arrowId) continue;

      // Check each segment of otherArrow
      for (let i = 0; i < otherArrow.points.length - 1; i++) {
        const segA = otherArrow.points[i];
        const segB = otherArrow.points[i + 1];

        if (this.rayIntersectsSegment(head, dx, dy, segA, segB)) {
          return { blocked: true, blockerId: otherId };
        }
      }
    }

    return { blocked: false };
  }

  getDirVector(dir) {
    switch (dir) {
      case 'UP': return { dx: 0, dy: -1 };
      case 'DOWN': return { dx: 0, dy: 1 };
      case 'LEFT': return { dx: -1, dy: 0 };
      case 'RIGHT': return { dx: 1, dy: 0 };
      default: return { dx: 0, dy: -1 };
    }
  }

  rayIntersectsSegment(head, dx, dy, p1, p2) {
    const isSegHoriz = p1.y === p2.y;
    const isSegVert = p1.x === p2.x;

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (dx === 0 && dy < 0) { // Ray UP
      if (isSegHoriz) {
        if (head.x >= minX && head.x <= maxX && head.y > p1.y) return true;
      } else if (isSegVert && head.x === p1.x && head.y > minY) {
        return true;
      }
    } else if (dx === 0 && dy > 0) { // Ray DOWN
      if (isSegHoriz) {
        if (head.x >= minX && head.x <= maxX && head.y < p1.y) return true;
      } else if (isSegVert && head.x === p1.x && head.y < maxY) {
        return true;
      }
    } else if (dx < 0 && dy === 0) { // Ray LEFT
      if (isSegVert) {
        if (head.y >= minY && head.y <= maxY && head.x > p1.x) return true;
      } else if (isSegHoriz && head.y === p1.y && head.x > minX) {
        return true;
      }
    } else if (dx > 0 && dy === 0) { // Ray RIGHT
      if (isSegVert) {
        if (head.y >= minY && head.y <= maxY && head.x < p1.x) return true;
      } else if (isSegHoriz && head.y === p1.y && head.x < maxX) {
        return true;
      }
    }

    return false;
  }

  handleArrowTap(arrowId) {
    if (this.isLocked) return;
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return;

    const collision = this.checkArrowCollision(arrowId);

    if (collision.blocked) {
      // BLOCKED! Turn coral red like in Screenshot 2!
      this.executeBlocked(arrow);
    } else {
      // ESCAPE!
      this.executeEscape(arrow);
    }
  }

  executeBlocked(arrow) {
    if (window.soundEngine) window.soundEngine.playBlocked();

    // Deduct heart
    if (this.hearts > 1) {
      this.hearts--;
      this.onHeartsChange(this.hearts, this.maxHearts);
    }

    if (arrow.element) {
      arrow.element.classList.remove('blocked');
      void arrow.element.offsetWidth; // Reflow
      arrow.element.classList.add('blocked');

      setTimeout(() => {
        arrow.element.classList.remove('blocked');
      }, 700);
    }

    this.onBlocked(arrow);
  }

  executeEscape(arrow) {
    if (window.soundEngine) window.soundEngine.playEscape();

    this.arrows.delete(arrow.id);
    this.moveHistory.push(arrow);

    if (arrow.element) {
      // Smooth escape slide along its facing vector
      const { dx, dy } = this.getDirVector(arrow.dir);
      const dist = 600;
      arrow.element.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s ease-out';
      arrow.element.style.transform = `translate(${dx * dist}px, ${dy * dist}px)`;
      arrow.element.style.opacity = '0';

      setTimeout(() => {
        if (arrow.element && arrow.element.parentNode) {
          arrow.element.parentNode.removeChild(arrow.element);
        }
      }, 400);
    }

    this.onCountChange(this.arrows.size);
    this.onEscape(arrow, this.arrows.size);

    if (this.arrows.size === 0) {
      this.isLocked = true;
      const elapsed = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
      setTimeout(() => {
        if (window.soundEngine) window.soundEngine.playVictory();
        this.onComplete({ totalTime: elapsed, moves: this.moveHistory.length });
      }, 450);
    }
  }

  // Powerup: Hint
  useHint() {
    for (const [id, arrow] of this.arrows.entries()) {
      if (!this.checkArrowCollision(id).blocked) {
        if (arrow.element) {
          arrow.element.classList.remove('hint-pulse');
          void arrow.element.offsetWidth;
          arrow.element.classList.add('hint-pulse');
          if (window.soundEngine) window.soundEngine.playPowerup();
          return true;
        }
      }
    }
    return false;
  }

  // Powerup: Undo
  undo() {
    if (this.moveHistory.length === 0 || this.isLocked) return false;
    const last = this.moveHistory.pop();
    this.arrows.set(last.id, last);
    this.render();
    this.onCountChange(this.arrows.size);
    if (window.soundEngine) window.soundEngine.playClick();
    return true;
  }
}

window.BendingArrowEngine = BendingArrowEngine;
