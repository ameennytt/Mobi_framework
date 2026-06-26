'use strict';

/**
 * GameAnalytics — example opt-in extension (no-op). Copy + extend for real games.
 * Implements the Analytics contract in framework/EXTENSIONS.md (track + flush).
 *
 * NOT loaded by default — enable by listing "extensions/analytics.js" in
 * game-config.json `code: [...]` before gameplay/index.js. index.js then guards on
 * presence: `if (window.GameAnalytics) window.GameAnalytics.track(...)`.
 */
window.GameAnalytics = {
  events: [],
  track(event, data) {
    this.events.push({ event, data, t: Date.now() });
  },
  flush() {
    // Replace with a real sink (POST to your endpoint, etc.), then clear.
    this.events = [];
  },
};
