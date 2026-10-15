/**
 * ARROUT - Bending Path Arrow Engine
 * Fully responsive SVG coordinate system with integrated dotted grid
 */

class BendingArrowEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.cols = options.cols || 10;
    this.rows = options.rows || 14;
    this.arrows = new Map();
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
        points: a.points.map(p => ({ x: p.x, y: p.y })),
        dir: a.dir,
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

    const viewW = 400;
    const viewH = 560;
    const padX = 28;
    const padY = 28;

    this.cellW = (viewW - padX * 2) / (this.cols - 1);
    this.cellH = (viewH - padY * 2) / (this.rows - 1);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'board-svg-canvas');
    svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg = svg;

    // Draw integrated vector dots for 100% sharp alignment on all screens
    const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotsGroup.setAttribute('class', 'svg-grid-dots');
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', padX + c * this.cellW);
        circle.setAttribute('cy', padY + r * this.cellH);
        circle.setAttribute('r', '2.2');
        circle.setAttribute('fill', '#CBD5E1');
        dotsGroup.appendChild(circle);
      }
    }
    svg.appendChild(dotsGroup);

    // Draw Arrow Groups
    this.arrows.forEach(arrow => {
      const g = this.createArrowSVGGroup(arrow, padX, padY, this.cellW, this.cellH);
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

    // Polyline Path string
    let pathD = '';
    arrow.points.forEach((pt, idx) => {
      const px = this.getPixelPos(pt.x, pt.y, padX, padY, stepX, stepY);
      if (idx === 0) {
        pathD += `M ${px.x} ${px.y}`;
      } else {
        pathD += ` L ${px.x} ${px.y}`;
      }
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'arrow-path');
    g.appendChild(path);

    // Arrowhead Polygon
    const headPt = arrow.points[arrow.points.length - 1];
    const headPx = this.getPixelPos(headPt.x, headPt.y, padX, padY, stepX, stepY);

    const headPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    headPolygon.setAttribute('class', 'arrow-head');

    const size = 11;
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

    // Click/Touch Listener
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleArrowTap(arrow.id);
    });

    return g;
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

  checkArrowCollision(arrowId) {
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return { blocked: true };

    const head = arrow.points[arrow.points.length - 1];
    const { dx, dy } = this.getDirVector(arrow.dir);

    for (const [otherId, otherArrow] of this.arrows.entries()) {
      if (otherId === arrowId) continue;

      for (let i = 0; i < otherArrow.points.length - 1; i++) {
        const p1 = otherArrow.points[i];
        const p2 = otherArrow.points[i + 1];

        if (this.rayIntersectsSegment(head, dx, dy, p1, p2)) {
          return { blocked: true, blockerId: otherId };
        }
      }
    }

    return { blocked: false };
  }

  rayIntersectsSegment(head, dx, dy, p1, p2) {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    const isHoriz = p1.y === p2.y;
    const isVert = p1.x === p2.x;

    if (dx === 0 && dy < 0) { // UP
      if (isHoriz && head.x >= minX && head.x <= maxX && head.y > p1.y) return true;
      if (isVert && head.x === p1.x && head.y > minY) return true;
    } else if (dx === 0 && dy > 0) { // DOWN
      if (isHoriz && head.x >= minX && head.x <= maxX && head.y < p1.y) return true;
      if (isVert && head.x === p1.x && head.y < maxY) return true;
    } else if (dx < 0 && dy === 0) { // LEFT
      if (isVert && head.y >= minY && head.y <= maxY && head.x > p1.x) return true;
      if (isHoriz && head.y === p1.y && head.x > minX) return true;
    } else if (dx > 0 && dy === 0) { // RIGHT
      if (isVert && head.y >= minY && head.y <= maxY && head.x < p1.x) return true;
      if (isHoriz && head.y === p1.y && head.x < maxX) return true;
    }

    return false;
  }

  handleArrowTap(arrowId) {
    if (this.isLocked) return;
    const arrow = this.arrows.get(arrowId);
    if (!arrow) return;

    const collision = this.checkArrowCollision(arrowId);

    if (collision.blocked) {
      this.executeBlocked(arrow);
    } else {
      this.executeEscape(arrow);
    }
  }

  executeBlocked(arrow) {
    if (window.soundEngine) window.soundEngine.playBlocked();

    if (this.hearts > 1) {
      this.hearts--;
      this.onHeartsChange(this.hearts, this.maxHearts);
    } else if (this.hearts === 1) {
      this.hearts = 0;
      this.onHeartsChange(this.hearts, this.maxHearts);
      if (window.showToast) window.showToast('💔 Out of Hearts! Tap Ruler to undo or restart.');
    }

    if (arrow.element) {
      arrow.element.classList.remove('blocked');
      void arrow.element.offsetWidth;
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
      const { dx, dy } = this.getDirVector(arrow.dir);
      const dist = 700;
      arrow.element.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s ease-out';
      arrow.element.style.transform = `translate(${dx * dist}px, ${dy * dist}px)`;
      arrow.element.style.opacity = '0';

      setTimeout(() => {
        if (arrow.element && arrow.element.parentNode) {
          arrow.element.parentNode.removeChild(arrow.element);
        }
      }, 420);
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

  undo() {
    if (this.moveHistory.length === 0 || this.isLocked) return false;
    const last = this.moveHistory.pop();
    this.arrows.set(last.id, last);
    this.hearts = Math.min(this.maxHearts, this.hearts + 1);
    this.onHeartsChange(this.hearts, this.maxHearts);
    this.render();
    this.onCountChange(this.arrows.size);
    if (window.soundEngine) window.soundEngine.playClick();
    return true;
  }
}

window.BendingArrowEngine = BendingArrowEngine;
