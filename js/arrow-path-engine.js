/**
 * ARROUT - Bending Path Arrow Engine
 * Supports:
 * - Dotted grid with optional silhouette shape clipping/outline
 * - True multi-segment path-following escape animation (arrows glide along their exact bends to exit the board!)
 * - Precise raycast obstacle collision detection
 * - Powerups (Hint pulse, Ruler undo)
 */

class BendingArrowEngine {
  constructor(options = {}) {
    this.container = options.container;
    this.cols = options.cols || 11;
    this.rows = options.rows || 15;
    this.arrows = new Map();
    this.shapeType = 'diamond';
    this.shapeMask = null;
    this.hearts = 3;
    this.maxHearts = 3;
    this.isLocked = false;
    this.moveHistory = [];
    this.activeAnimations = new Set();
    
    this.onEscape = options.onEscape || (() => {});
    this.onBlocked = options.onBlocked || (() => {});
    this.onHeartsChange = options.onHeartsChange || (() => {});
    this.onCountChange = options.onCountChange || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  loadPuzzle(puzzleData) {
    // Cancel any active animation frame
    this.activeAnimations.forEach(anim => cancelAnimationFrame(anim));
    this.activeAnimations.clear();

    this.cols = puzzleData.cols || 11;
    this.rows = puzzleData.rows || 15;
    this.shapeType = puzzleData.shapeType || puzzleData.shape || 'diamond';
    this.shapeName = puzzleData.shapeName || 'Shape';
    this.shapeMask = puzzleData.shapeMask || (window.BendingPuzzleGenerator?.getShapeMask ? window.BendingPuzzleGenerator.getShapeMask(this.shapeType, this.cols, this.rows) : null);
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
    const padMinX = 22;
    const padMinY = 22;

    const maxSpanX = viewW - padMinX * 2;
    const maxSpanY = viewH - padMinY * 2;

    const cellStep = Math.min(
      maxSpanX / Math.max(1, this.cols - 1),
      maxSpanY / Math.max(1, this.rows - 1)
    );

    this.cellW = cellStep;
    this.cellH = cellStep;
    this.padX = (viewW - cellStep * (this.cols - 1)) / 2;
    this.padY = (viewH - cellStep * (this.rows - 1)) / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'board-svg-canvas');
    svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg = svg;

    // Optional: Draw faint shape boundary or subtle ambient silhouette
    if (this.shapeMask && typeof this.shapeMask === 'function') {
      const shapeBgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      shapeBgGroup.setAttribute('class', 'shape-silhouette-bg');
      svg.appendChild(shapeBgGroup);
    }

    // Draw vector grid dots matching reference
    const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotsGroup.setAttribute('class', 'svg-grid-dots');
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const inShape = !this.shapeMask || this.shapeMask(c, r);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', this.padX + c * this.cellW);
        circle.setAttribute('cy', this.padY + r * this.cellH);
        circle.setAttribute('r', inShape ? '2.2' : '1.2');
        circle.setAttribute('fill', inShape ? '#CBD5E1' : '#E2E8F0');
        circle.setAttribute('opacity', inShape ? '0.9' : '0.25');
        dotsGroup.appendChild(circle);
      }
    }
    svg.appendChild(dotsGroup);

    // Dynamic stroke and head size proportional to grid density
    this.strokeWidth = Math.max(3.8, Math.min(5.5, this.cellW * 0.18));
    this.arrowHeadSize = Math.max(6.5, Math.min(10, this.cellW * 0.38));

    // Draw Arrow Groups
    this.arrows.forEach(arrow => {
      const g = this.createArrowSVGGroup(arrow, this.padX, this.padY, this.cellW, this.cellH);
      arrow.element = g;
      svg.appendChild(g);
    });

    this.container.appendChild(svg);
  }

  getPixelPos(gridX, gridY, padX = this.padX, padY = this.padY, stepX = this.cellW, stepY = this.cellH) {
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
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#152642');
    path.setAttribute('stroke-width', (this.strokeWidth || 5).toFixed(1));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    g.appendChild(path);

    // Arrowhead Polygon
    const headPt = arrow.points[arrow.points.length - 1];
    const headPx = this.getPixelPos(headPt.x, headPt.y, padX, padY, stepX, stepY);

    const headPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    headPolygon.setAttribute('class', 'arrow-head');
    headPolygon.setAttribute('fill', '#152642');

    // Direction vector of the arrowhead directly corresponds to exit arrow.dir
    const { dx, dy } = this.getDirVector(arrow.dir);
    headPolygon.setAttribute('points', this.computeArrowheadPoints(headPx, { dx, dy }, this.arrowHeadSize || 9));
    g.appendChild(headPolygon);

    // Click/Touch Listener
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleArrowTap(arrow.id);
    });

    return g;
  }

  computeArrowheadPoints(headPx, dirVec, size = 9) {
    const nx = -dirVec.dy;
    const ny = dirVec.dx;

    // Tip vertex extends slightly beyond the line end
    const tip = {
      x: headPx.x + dirVec.dx * (size * 0.45),
      y: headPx.y + dirVec.dy * (size * 0.45)
    };
    // Base center covers the line end
    const bc = {
      x: headPx.x - dirVec.dx * (size * 0.55),
      y: headPx.y - dirVec.dy * (size * 0.55)
    };
    // Base wings
    const b1 = { x: bc.x + nx * size * 0.65, y: bc.y + ny * size * 0.65 };
    const b2 = { x: bc.x - nx * size * 0.65, y: bc.y - ny * size * 0.65 };

    return `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)}`;
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

      // 1. Check all vertices
      for (const pt of otherArrow.points) {
        if (dx === 0 && dy < 0 && pt.x === head.x && pt.y < head.y) return { blocked: true, blockerId: otherId };
        if (dx === 0 && dy > 0 && pt.x === head.x && pt.y > head.y) return { blocked: true, blockerId: otherId };
        if (dx < 0 && dy === 0 && pt.y === head.y && pt.x < head.x) return { blocked: true, blockerId: otherId };
        if (dx > 0 && dy === 0 && pt.y === head.y && pt.x > head.x) return { blocked: true, blockerId: otherId };
      }

      // 2. Check all segments
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
      const p = arrow.element.querySelector('.arrow-path');
      const h = arrow.element.querySelector('.arrow-head');
      if (p) p.setAttribute('stroke', '#F87171');
      if (h) h.setAttribute('fill', '#F87171');

      setTimeout(() => {
        if (arrow.element) {
          arrow.element.classList.remove('blocked');
          if (p) p.setAttribute('stroke', '#152642');
          if (h) h.setAttribute('fill', '#152642');
        }
      }, 700);
    }

    this.onBlocked(arrow);
  }

  /**
   * Real Arrow Movement:
   * The arrow follows its exact drawn path including all bends, then continues
   * smoothly off the edge of the board in its forward direction!
   */
  executeEscape(arrow) {
    if (window.soundEngine) window.soundEngine.playEscape();

    this.arrows.delete(arrow.id);
    this.moveHistory.push(arrow);

    if (arrow.element) {
      this.animateArrowAlongPath(arrow);
    }

    this.onCountChange(this.arrows.size);
    this.onEscape(arrow, this.arrows.size);

    if (this.arrows.size === 0) {
      this.isLocked = true;
      const elapsed = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
      setTimeout(() => {
        if (window.soundEngine) window.soundEngine.playVictory();
        this.onComplete({ totalTime: elapsed, moves: this.moveHistory.length });
      }, 650);
    }
  }

  animateArrowAlongPath(arrow) {
    const el = arrow.element;
    const pathEl = el.querySelector('.arrow-path');
    const headEl = el.querySelector('.arrow-head');
    if (!pathEl || !headEl) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }

    // 1. Calculate extended forward path exiting the board
    const headGrid = arrow.points[arrow.points.length - 1];
    let exitGrid = { x: headGrid.x, y: headGrid.y };
    if (arrow.dir === 'UP') exitGrid.y = -4;
    else if (arrow.dir === 'DOWN') exitGrid.y = this.rows + 3;
    else if (arrow.dir === 'LEFT') exitGrid.x = -4;
    else if (arrow.dir === 'RIGHT') exitGrid.x = this.cols + 3;

    const fullPolyGrid = [...arrow.points, exitGrid];
    const fullPolyPx = fullPolyGrid.map(p => this.getPixelPos(p.x, p.y));

    // Cumulative pixel distances
    const cumDists = [0];
    let totalLen = 0;
    for (let i = 0; i < fullPolyPx.length - 1; i++) {
      const d = Math.hypot(fullPolyPx[i+1].x - fullPolyPx[i].x, fullPolyPx[i+1].y - fullPolyPx[i].y);
      totalLen += d;
      cumDists.push(totalLen);
    }

    // Initial arrow length
    let arrowLen = 0;
    for (let i = 0; i < arrow.points.length - 1; i++) {
      const p1 = this.getPixelPos(arrow.points[i].x, arrow.points[i].y);
      const p2 = this.getPixelPos(arrow.points[i+1].x, arrow.points[i+1].y);
      arrowLen += Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
    if (arrowLen === 0) {
      arrowLen = Math.max(12, (this.cellW || 24) * 0.45);
    }

    const duration = 460; // ms
    const startTime = performance.now();

    const sampleAtDist = (dist) => {
      if (dist <= 0) {
        const p1 = fullPolyPx[0], p2 = fullPolyPx[1] || p1;
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        return { pt: p1, dir: { dx: (p2.x - p1.x) / segLen, dy: (p2.y - p1.y) / segLen } };
      }
      for (let i = 0; i < fullPolyPx.length - 1; i++) {
        if (cumDists[i+1] >= dist || i === fullPolyPx.length - 2) {
          const segLen = cumDists[i+1] - cumDists[i];
          const r = segLen === 0 ? 0 : Math.min(1, Math.max(0, (dist - cumDists[i]) / segLen));
          const p1 = fullPolyPx[i], p2 = fullPolyPx[i+1];
          const dirLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
          return {
            pt: { x: p1.x + (p2.x - p1.x) * r, y: p1.y + (p2.y - p1.y) * r },
            dir: { dx: (p2.x - p1.x) / dirLen, dy: (p2.y - p1.y) / dirLen }
          };
        }
      }
      const last = fullPolyPx[fullPolyPx.length - 1];
      const prev = fullPolyPx[fullPolyPx.length - 2] || last;
      const dL = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
      return { pt: last, dir: { dx: (last.x - prev.x) / dL, dy: (last.y - prev.y) / dL } };
    };

    const slicePoly = (dStart, dEnd) => {
      const res = [];
      const startInfo = sampleAtDist(dStart);
      res.push(startInfo.pt);

      for (let i = 0; i < fullPolyPx.length - 1; i++) {
        const segEnd = cumDists[i+1];
        if (segEnd > dStart && segEnd < dEnd && i + 1 < fullPolyPx.length) {
          res.push(fullPolyPx[i+1]);
        }
      }

      const endInfo = sampleAtDist(dEnd);
      res.push(endInfo.pt);
      return { points: res, headPt: endInfo.pt, headDir: endInfo.dir };
    };

    const animStep = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic
      const progress = 1 - Math.pow(1 - t, 3);

      const dHead = arrowLen + (totalLen - arrowLen) * progress;
      const dTail = (totalLen) * progress;

      if (t >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        this.activeAnimations.delete(animId);
        return;
      }

      const slice = slicePoly(Math.min(dTail, dHead), dHead);

      // Re-draw path d attribute
      let dStr = '';
      slice.points.forEach((p, idx) => {
        dStr += (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
      });
      pathEl.setAttribute('d', dStr);

      // Update arrowhead at current moving head point
      headEl.setAttribute('points', this.computeArrowheadPoints(slice.headPt, slice.headDir));

      const animId = requestAnimationFrame(animStep);
      this.activeAnimations.add(animId);
    };

    const animId = requestAnimationFrame(animStep);
    this.activeAnimations.add(animId);
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
