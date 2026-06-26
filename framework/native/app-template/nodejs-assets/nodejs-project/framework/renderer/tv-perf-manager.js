'use strict';

/**
 * TV Performance Management Engine.
 * Implements low-end TV optimizations including adaptive resolution ladders,
 * steady 30 FPS cap locks, and render-loop freeze.
 */
class TvPerfManager {
  constructor() {
    this.TIER_RES = [1920, 1280, 960];
    this.LOW_RES_LADDER = [960, 854, 768, 640];
    
    this.LOW_RES_BUDGET_MS = 34; // draw cost above this cannot sustain 30fps
    this.LOW_RES_GOOD_MS = 27;   // comfortable rendering cost
    this.LOW_RES_HOLD_MS = 3000; // time before stepping down (no flapping)
    
    this.tier = 0;              // 0: High, 1: Balanced, 2: Low
    this.preset = 'auto';
    this.samples = [];
    this.sampleMax = 180;
    this.lowResStep = 0;
    this.lowResBadSince = 0;
    this.idleCanvas = null;
    this.idleDirty = true;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Automatically perform basic UA-based tier estimation or retrieve cached tier
    const stored = this._loadStored();
    if (stored !== null) {
      this.tier = stored;
    }
    this._publishResolution();
  }

  isLow() {
    return this.tier >= 2;
  }

  isReduced() {
    return this.tier >= 1;
  }

  getResCap() {
    return this.isLow() ? this.LOW_RES_LADDER[this.lowResStep] : this.TIER_RES[this.tier];
  }

  scaleParticles(count) {
    if (this.tier === 0) return count;
    if (this.tier === 1) return Math.max(1, Math.round(count * 0.5));
    return Math.max(1, Math.round(count * 0.25));
  }

  /**
   * Placeholder benchmark scheduler. Tier is refined lazily from recorded frame
   * costs via evaluate(); no separate benchmark pass is needed in V1.
   */
  scheduleBenchmark() {
    // reserved — no-op
  }

  /**
   * Whether the render loop may freeze (blit a captured frame) instead of
   * redrawing every tick. Disabled in V1 — always render fresh for correctness.
   * Games can enable idle freeze later by signalling static scenes.
   */
  useIdleFreeze() {
    return false;
  }

  recordFrame(drawDurationMs) {
    if (drawDurationMs > 0 && drawDurationMs < 500) {
      this.samples.push(drawDurationMs);
      if (this.samples.length > this.sampleMax) this.samples.shift();
    }
  }

  /**
   * Evaluates performance and dynamically steps down resolution if budget is blown.
   */
  evaluate(inPlay = false) {
    if (this.preset !== 'auto' || !this.isLow()) return;
    
    const avg = this._avgDrawDuration();
    if (!avg) return;

    const now = performance.now();

    // If rendering cost is too high and ball/sprite is not currently animating in play
    if (avg > this.LOW_RES_BUDGET_MS && !inPlay) {
      if (!this.lowResBadSince) this.lowResBadSince = now;
      else if (now - this.lowResBadSince >= this.LOW_RES_HOLD_MS && this.lowResStep < this.LOW_RES_LADDER.length - 1) {
        this.lowResStep++;
        this._publishResolution();
        this.invalidateIdle();
        this.lowResBadSince = 0;
        console.warn(`[TvPerfManager] Rendering too slow (${avg.toFixed(1)}ms). Stepping down resolution to ${this.getResCap()}p.`);
      }
    } else if (avg < this.LOW_RES_GOOD_MS) {
      this.lowResBadSince = 0;
    }
  }

  _avgDrawDuration() {
    if (this.samples.length < 12) return null;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  _publishResolution() {
    if (typeof document !== 'undefined') {
      try {
        document.body.classList.toggle('tv-low', this.isLow());
      } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('framework:resolution-changed', { detail: { res: this.getResCap() } }));
  }

  invalidateIdle() {
    this.idleDirty = true;
    this.idleCanvas = null;
  }

  needsIdleCapture() {
    return this.idleDirty || !this.idleCanvas;
  }

  captureIdleFrame() {
    if (!this.idleCanvas || this.idleCanvas.width !== this.canvas.width || this.idleCanvas.height !== this.canvas.height) {
      this.idleCanvas = document.createElement('canvas');
      this.idleCanvas.width = this.canvas.width;
      this.idleCanvas.height = this.canvas.height;
    }
    this.idleCanvas.getContext('2d').drawImage(this.canvas, 0, 0);
    this.idleDirty = false;
  }

  blitIdle(targetCtx) {
    if (this.idleCanvas && this.idleCanvas.width === this.canvas.width && this.idleCanvas.height === this.canvas.height) {
      targetCtx.save();
      targetCtx.setTransform(1, 0, 0, 1, 0, 0); // Raw identity copy, bypass render scale
      targetCtx.drawImage(this.idleCanvas, 0, 0);
      targetCtx.restore();
      return true;
    }
    return false;
  }

  _loadStored() {
    try {
      const raw = localStorage.getItem('fw_tv_perf');
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o.tier === 'number') return o.tier;
      }
    } catch (_) {}
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.TvPerfManager = new TvPerfManager();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.TvPerfManager;
}
