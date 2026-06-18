'use strict';

/**
 * Generic TV canvas layers orchestrator.
 * Caches background layers to off-screen canvases to minimize draw operations on low-end TVs.
 */
class LayerManager {
  constructor() {
    this.layers = {
      background: null,
      ground: null,
      object: null,
      particle: null,
      ui: null
    };
    this.bgCanvas = null;
    this.bgDirty = true;
  }

  /**
   * Registers a draw callback for a specific rendering layer.
   * @param {string} layer - 'background'|'ground'|'object'|'particle'|'ui'
   * @param {function} callback - draw function (ctx, W, H) => void
   */
  register(layer, callback) {
    if (this.layers.hasOwnProperty(layer)) {
      this.layers[layer] = callback;
      if (layer === 'background') {
        this.invalidateBackground();
      }
    }
  }

  invalidateBackground() {
    this.bgDirty = true;
  }

  /**
   * Draws the background layer. Caches it to an offscreen canvas if dirty.
   */
  drawBackground(ctx, W, H) {
    const drawFn = this.layers.background;
    if (!drawFn) return;

    if (this.bgDirty || !this.bgCanvas || this.bgCanvas.width !== W || this.bgCanvas.height !== H) {
      if (!this.bgCanvas) this.bgCanvas = document.createElement('canvas');
      this.bgCanvas.width = W;
      this.bgCanvas.height = H;
      
      const bgCtx = this.bgCanvas.getContext('2d');
      drawFn(bgCtx, W, H);
      this.bgDirty = false;
    }

    ctx.drawImage(this.bgCanvas, 0, 0);
  }

  drawLayer(layerName, ctx, W, H) {
    if (layerName === 'background') {
      this.drawBackground(ctx, W, H);
      return;
    }
    const drawFn = this.layers[layerName];
    if (drawFn) {
      drawFn(ctx, W, H);
    }
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkLayers = new LayerManager();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkLayers;
}
