'use strict';

/**
 * Main TV Canvas loop scheduler.
 * Enforces steady FPS caps, delta-time normalization, and benchmarks.
 */
class FrameworkRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.W = 1920;
    this.H = 1080;
    this.lastFrameAt = performance.now();
    this.frameScale = 1.0;
    this.running = false;
    this.isBallInPlay = false; // flag game modules set to block idle culls
  }

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`[Renderer] Canvas #${canvasId} not found.`);
      return;
    }
    this.ctx = this.canvas.getContext('2d');

    // Initialize TV Performance manager
    if (window.TvPerfManager) {
      window.TvPerfManager.init(this.canvas);
    }

    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Begin performance benchmark shortly after load
    if (window.TvPerfManager) {
      window.TvPerfManager.scheduleBenchmark();
    }
  }

  resize() {
    // Determine target dimensions based on resolution cap ladder
    const cap = window.TvPerfManager ? window.TvPerfManager.getResCap() : 1280;
    
    // Scale 16:9 ratio
    this.W = cap;
    this.H = Math.round(cap * (9 / 16));

    this.canvas.width = this.W;
    this.canvas.height = this.H;

    if (window.FrameworkLayers) {
      window.FrameworkLayers.invalidateBackground();
    }
    if (window.TvPerfManager) {
      window.TvPerfManager.invalidateIdle();
    }

    // Notify layouts
    window.dispatchEvent(new CustomEvent('framework:canvas-resized', { detail: { W: this.W, H: this.H } }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameAt = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastFrameAt;
    
    // Low-tier steady 30 FPS cap lock
    const isLow = window.TvPerfManager && window.TvPerfManager.isLow();
    const LOW_FRAME_MS = 33; // ~30fps
    if (isLow && dt < LOW_FRAME_MS) {
      requestAnimationFrame(() => this.loop());
      return;
    }

    this.lastFrameAt = now;

    // Normalise frame rate motion index to 60fps baseline
    this.frameScale = Math.min(4.0, Math.max(0.2, dt / 16.666));

    // Profile draw cost
    const startDraw = performance.now();

    const layerManager = window.FrameworkLayers;
    const perfManager = window.TvPerfManager;

    if (perfManager && perfManager.useIdleFreeze()) {
      // If scene is static, blit back-buffer instead of redrawing
      if (perfManager.needsIdleCapture()) {
        this._renderAll(layerManager);
        perfManager.captureIdleFrame();
      } else {
        perfManager.blitIdle(this.ctx);
      }
    } else {
      this._renderAll(layerManager);
      if (perfManager) perfManager.invalidateIdle();
    }

    const drawCost = performance.now() - startDraw;

    if (perfManager) {
      perfManager.recordFrame(drawCost);
      perfManager.evaluate(this.isBallInPlay);
    }

    requestAnimationFrame(() => this.loop());
  }

  _renderAll(layerManager) {
    if (!layerManager) return;
    
    this.ctx.clearRect(0, 0, this.W, this.H);

    // Coordinate space transformations
    this.ctx.save();
    
    layerManager.drawLayer('background', this.ctx, this.W, this.H);
    layerManager.drawLayer('ground', this.ctx, this.W, this.H);
    layerManager.drawLayer('object', this.ctx, this.W, this.H);
    layerManager.drawLayer('particle', this.ctx, this.W, this.H);
    layerManager.drawLayer('ui', this.ctx, this.W, this.H);

    this.ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkRenderer = new FrameworkRenderer();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkRenderer;
}
