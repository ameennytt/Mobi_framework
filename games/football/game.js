'use strict';

/**
 * Football (FootyShoot) Rules and Math Helpers.
 */
const FootballGameRules = {
  maxKicks: 5,
  difficultySpeeds: {
    slow: 0.05,
    medium: 0.1,
    fast: 0.15
  },
  
  /**
   * Determine if goalkeeper successfully saved the ball
   * @param {string} shotAim - 'left' | 'center' | 'right'
   * @param {string} goalieDive - 'left' | 'center' | 'right'
   * @returns {boolean} True if save, false if goal
   */
  evaluateShot(shotAim, goalieDive) {
    return shotAim === goalieDive;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FootballGameRules;
}
