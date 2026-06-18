'use strict';

/**
 * Dynamic CSS Theme Injector.
 * Maps custom variables from game theme configurations.
 */
class ThemeLoader {
  constructor() {
    this.defaultTheme = {
      '--game-primary': '#050a16',
      '--game-accent': '#9ADF6B',
      '--game-text': '#e8f4e8',
      '--game-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    };
  }

  /**
   * Applies a theme object to the DOM root.
   * @param {object} theme - Key-value map of CSS custom property overrides.
   */
  apply(theme) {
    const merged = Object.assign({}, this.defaultTheme, theme || {});
    const root = document.documentElement;
    Object.keys(merged).forEach(key => {
      root.style.setProperty(key, merged[key]);
    });
  }

  /**
   * Loads a theme configuration from a game folder path.
   * @param {string} gameId - e.g. 'cricswing', 'football'
   */
  async load(gameId) {
    try {
      const response = await fetch(`/games/${gameId}/game-config.json`);
      if (!response.ok) throw new Error('Failed to load game config');
      const j = await response.json();
      if (j && j.theme) {
        this.apply(j.theme);
      } else {
        this.apply(null);
      }
    } catch (e) {
      console.warn('[ThemeLoader] Falling back to default theme. Details:', e.message);
      this.apply(null);
    }
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkTheme = new ThemeLoader();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkTheme;
}
