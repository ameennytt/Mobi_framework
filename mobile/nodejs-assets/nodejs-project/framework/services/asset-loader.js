'use strict';

/**
 * Purpose-based Asset Loader for V1 Framework.
 * Resolves logical slots (e.g., APP_LOGO) to dynamic directories with generic fallbacks.
 */
class AssetLoader {
  constructor() {
    this.gameId = null;
    this.slots = {};
    
    // Default asset fallbacks so a game is playable with zero custom assets
    this.fallbacks = {
      APP_LOGO: '/framework/ui/assets/logo-fallback.svg',
      SCREEN_BACKGROUND: 'radial-gradient(ellipse at 30% 0%, #1a2a3a 0%, #0a101f 100%)',
      SCREEN_HERO: '/framework/ui/assets/hero-fallback.svg',
      PRIMARY_ICON: '⭐',
      SECONDARY_ICON: '🏆',
      SUCCESS_ICON: '✅',
      ERROR_ICON: '❌',
      LOADING_ICON: '⏳',
      
      // Default text slots
      APP_TITLE: 'Interactive Game',
      PRIMARY_SCORE: 'Score',
      SECONDARY_SCORE: 'Fouls',
      PROGRESS_METRIC: 'Time',
      ACTIVITY_FEED: 'Match Events',
      RESULT_PANEL: 'Match Summary',
      PARTICIPANT_A: 'Player A',
      PARTICIPANT_B: 'Player B',
      START_ACTION: 'PLAY NOW',
      EXIT_ACTION: 'EXIT'
    };
  }

  async loadConfig(gameId) {
    this.gameId = gameId;
    try {
      const response = await fetch(`/games/${gameId}/game-config.json`);
      if (!response.ok) throw new Error('Failed to load game config');
      const j = await response.json();
      this.slots = j.assets || {};
      this.textSlots = j.text || {};
      this.manifest = {
        gameId: j.gameId || gameId,
        version: j.version || '1.0.0',
        supportsTv: j.supportsTv !== false,
        supportsMobile: j.supportsMobile !== false,
        supportsMotion: j.supportsMotion === true,
        enableEnrichment: j.enableEnrichment === true
      };
    } catch (e) {
      console.warn('[AssetLoader] Failed loading configs. Fallbacks active.', e.message);
      this.slots = {};
      this.textSlots = {};
      this.manifest = {};
    }
  }

  /**
   * Resolves an asset slot to a usable URL or CSS value.
   */
  resolve(slot) {
    if (this.slots[slot]) {
      // If starts with http or is absolute path, return it. Otherwise map to game assets
      const path = this.slots[slot];
      if (path.startsWith('/') || path.startsWith('http') || path.startsWith('linear-gradient') || path.startsWith('radial-gradient')) {
        return path;
      }
      return `/games/${this.gameId}/assets/${path}`;
    }
    return this.fallbacks[slot] || '';
  }

  /**
   * Resolves text slot label.
   */
  text(slot) {
    if (this.textSlots[slot]) {
      return this.textSlots[slot];
    }
    return this.fallbacks[slot] || '';
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkAssets = new AssetLoader();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkAssets;
}
