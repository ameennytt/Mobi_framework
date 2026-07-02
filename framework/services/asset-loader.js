'use strict';

/**
 * Purpose-based Asset Loader for the framework.
 * Resolves logical slots (e.g. APP_LOGO) to URLs/CSS/text with generic fallbacks.
 *
 * STANDARD SLOTS (the convention) — set any in game-config.json `assets`/`text`.
 * Every slot has a safe default, so a game runs with zero custom assets; optional
 * sprites/audio default to '' so code can branch on FrameworkAssets.has(slot).
 *
 *   image  — APP_LOGO · APP_ICON · SCREEN_HERO · SCREEN_BACKGROUND · FIELD_TEXTURE
 *            · PLAYER_SPRITE · BALL_SPRITE · BUTTON_PRIMARY · BUTTON_SECONDARY
 *   icon   — PRIMARY_ICON · SECONDARY_ICON · SUCCESS_ICON · ERROR_ICON · LOADING_ICON
 *   audio  — BACKGROUND_MUSIC · SFX_SCORE · SFX_FAIL
 *   text   — APP_TITLE · PRIMARY_SCORE · SECONDARY_SCORE · PROGRESS_METRIC
 *            · ACTIVITY_FEED · RESULT_PANEL · PARTICIPANT_A · PARTICIPANT_B
 *            · START_ACTION · EXIT_ACTION
 *
 * Read: FrameworkAssets.resolve(slot) (url/css) · text(slot) (label) · has(slot)
 * (true only when the game overrode it — for optional sprites/audio).
 * Enumerate: FrameworkAssets.STANDARD_SLOTS.{image,icon,audio,text}.
 */
class AssetLoader {
  constructor() {
    this.gameId = null;
    this.slots = {};
    this.textSlots = {};   // init so text() is safe before loadConfig() (returns fallbacks)

    // Slot registry — names grouped by kind, so framework tooling can enumerate
    // the convention (and games have a predictable list to fill).
    this.STANDARD_SLOTS = {
      image: ['APP_LOGO', 'APP_ICON', 'SCREEN_HERO', 'SCREEN_BACKGROUND', 'FIELD_TEXTURE',
              'PLAYER_SPRITE', 'BALL_SPRITE', 'BUTTON_PRIMARY', 'BUTTON_SECONDARY'],
      icon:  ['PRIMARY_ICON', 'SECONDARY_ICON', 'SUCCESS_ICON', 'ERROR_ICON', 'LOADING_ICON'],
      audio: ['BACKGROUND_MUSIC', 'SFX_SCORE', 'SFX_FAIL'],
      text:  ['APP_TITLE', 'PRIMARY_SCORE', 'SECONDARY_SCORE', 'PROGRESS_METRIC', 'ACTIVITY_FEED',
              'RESULT_PANEL', 'PARTICIPANT_A', 'PARTICIPANT_B', 'START_ACTION', 'EXIT_ACTION'],
    };

    // Default fallbacks so a game is playable with zero custom assets. Optional
    // sprites/textures/audio default to '' → has(slot) is false → use a code default.
    this.fallbacks = {
      APP_LOGO: '/framework/ui/assets/logo-fallback.svg',
      APP_ICON: '/framework/ui/assets/logo-fallback.svg',
      SCREEN_BACKGROUND: 'radial-gradient(ellipse at 30% 0%, #1a2a3a 0%, #0a101f 100%)',
      SCREEN_HERO: '/framework/ui/assets/hero-fallback.svg',
      FIELD_TEXTURE: '',
      PLAYER_SPRITE: '',
      BALL_SPRITE: '',
      BUTTON_PRIMARY: '',
      BUTTON_SECONDARY: '',

      PRIMARY_ICON: '⭐',
      SECONDARY_ICON: '🏆',
      SUCCESS_ICON: '✅',
      ERROR_ICON: '❌',
      LOADING_ICON: '⏳',

      BACKGROUND_MUSIC: '',
      SFX_SCORE: '',
      SFX_FAIL: '',

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
      this.tv = j.tv || {};
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
      this.tv = {};
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

  /**
   * True only when the GAME provides this slot (not just a fallback). Use for
   * optional assets: `if (FrameworkAssets.has('BALL_SPRITE')) drawSprite(); else drawDefault();`
   */
  has(slot) {
    return !!((this.slots && this.slots[slot]) || (this.textSlots && this.textSlots[slot]));
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkAssets = new AssetLoader();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkAssets;
}
