'use strict';

/**
 * Unified Input Bridge for Games.
 * Provides custom event dispatching for buttons, swipes, and motion events.
 */
class InputBridge {
  constructor() {
    this.listeners = {};
    this.sources = {};   // name → factory() returning { start(emit), stop() }
  }

  /**
   * Register an input SOURCE plugin. A source is the single thing that turns a
   * physical input (buttons / tilt / motion / ML gesture / future) into normalized
   * game actions — it implements { start(emit), stop() } and calls emit({ action,
   * payload }). The in-match controller (FrameworkController) owns the active source
   * and forwards every emit to game.send('action', payload), so GAMEPLAY NEVER KNOWS
   * WHERE THE INPUT CAME FROM. Buttons are the built-in default; motion/ml register
   * here and are selected by game-config.json `input`.
   * @param {string} name  e.g. 'motion', 'ml'
   * @param {function} factory  () => ({ start(emit), stop() })
   */
  registerSource(name, factory) { if (name && typeof factory === 'function') this.sources[name] = factory; }
  /** Get a registered source factory (or null). */
  getSource(name) { return this.sources[name] || null; }
  /** Is a non-default source available for this name? */
  hasSource(name) { return !!(name && name !== 'buttons' && this.sources[name]); }

  /**
   * Listen to a specific framework input event.
   * Event types: 'button', 'motion', 'orientation', 'action', 'calibrate'
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => {
      this.listeners[event].delete(callback);
    };
  }

  /**
   * Dispatch an event to listeners.
   */
  emit(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(payload); } catch (e) { console.error(`[InputBridge] Error in '${event}' listener:`, e); }
      });
    }
  }

  /**
   * Binds direct button triggers (e.g. from standard DOM elements)
   * to framework input actions.
   */
  bindButton(elementId, actionName, payloadGen = null) {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn(`[InputBridge] Element with id '${elementId}' not found for binding`);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      const payload = payloadGen ? payloadGen(e) : {};
      this.emit('button', { action: actionName, ...payload });
    };

    el.addEventListener('click', handler);
    el.addEventListener('touchstart', handler, { passive: false });

    return () => {
      el.removeEventListener('click', handler);
      el.removeEventListener('touchstart', handler);
    };
  }

  /**
   * Setup standard calibration trigger listener
   */
  bindCalibration(elementId, motionInputInstance) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const handler = (e) => {
      e.preventDefault();
      motionInputInstance.calibrate();
      this.emit('calibrate', {
        orient: motionInputInstance.calibOrient,
        timestamp: Date.now()
      });
    };

    el.addEventListener('click', handler);
    el.addEventListener('touchstart', handler, { passive: false });

    return () => {
      el.removeEventListener('click', handler);
      el.removeEventListener('touchstart', handler);
    };
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkInput = new InputBridge();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkInput;
}
