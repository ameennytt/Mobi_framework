'use strict';

/**
 * Storage Service to persist and mirror game and session state.
 * Survives Android OS process culls.
 */
class StorageService {
  constructor() {
    this.monitoredKeys = new Set(['framework_session', 'framework_game_state', 'framework_config']);
  }

  /**
   * Registers custom keys to be automatically mirrored between sessionStorage and localStorage.
   */
  monitor(keys) {
    if (Array.isArray(keys)) {
      keys.forEach(k => this.monitoredKeys.add(k));
    } else if (typeof keys === 'string') {
      this.monitoredKeys.add(keys);
    }
  }

  save(key, val) {
    const raw = typeof val === 'object' ? JSON.stringify(val) : String(val);
    try { sessionStorage.setItem(key, raw); } catch (_) {}
    if (this.monitoredKeys.has(key)) {
      try { localStorage.setItem(key, raw); } catch (_) {}
    }
  }

  load(key) {
    let raw = null;
    try { raw = sessionStorage.getItem(key); } catch (_) {}
    if (raw === null && this.monitoredKeys.has(key)) {
      try {
        raw = localStorage.getItem(key);
        // Sync back to session storage
        if (raw !== null) {
          sessionStorage.setItem(key, raw);
        }
      } catch (_) {}
    }

    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw;
    }
  }

  remove(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
    try { localStorage.removeItem(key); } catch (_) {}
  }

  /**
   * Mirror all monitored session storage values into local storage.
   * Call on background, pagehide, or suspend events.
   */
  mirrorToLocal() {
    this.monitoredKeys.forEach(key => {
      try {
        const val = sessionStorage.getItem(key);
        if (val === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, val);
        }
      } catch (_) {}
    });
  }

  /**
   * Hydrate session storage from local storage fallbacks.
   * Call on boot/load.
   */
  hydrateFromLocal() {
    this.monitoredKeys.forEach(key => {
      try {
        if (sessionStorage.getItem(key) === null) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            sessionStorage.setItem(key, val);
          }
        }
      } catch (_) {}
    });
  }
}

// Bind automatically on page transitions
const storage = new StorageService();

if (typeof window !== 'undefined') {
  window.FrameworkStorage = storage;

  window.addEventListener('DOMContentLoaded', () => storage.hydrateFromLocal());
  window.addEventListener('pagehide', () => storage.mirrorToLocal());
  window.addEventListener('__appBackground', () => storage.mirrorToLocal());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      storage.mirrorToLocal();
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = storage;
}
