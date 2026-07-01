'use strict';

/**
 * FrameworkMLProfile — OPTIONAL per-player ML / training extension (STUB / contract).
 *
 * NOT loaded by default. Opt in alongside motion input for games that learn a
 * player's swing (e.g. Baseball). Implements the GameML + GameTraining contracts
 * from framework/EXTENSIONS.md so gameplay code can call it the same way regardless
 * of who fills in the model.
 *
 * This is a SCAFFOLD — `classify` returns a neutral result and training is a no-op
 * progress counter, so a button game (or an un-trained motion game) still runs. The
 * other developer drops the real KNN/model + training-hub/net-practice screens here.
 *
 * window.FrameworkMLProfile.
 */
window.FrameworkMLProfile = (function () {
  let trained = 0, totalShots = 5, mode = null;

  return {
    // GameML
    init() { /* TODO(dev): load model/weights from storage */ return Promise.resolve(); },
    ready() { return false; },                       // scaffold: never claims ready
    classify(/* sample */) { return { label: 'center', confidence: 0 }; },

    // GameTraining
    start(m) { mode = m || 'all'; },
    feed(/* sample */) { /* TODO(dev): accumulate a training vector */ },
    progress() { return { pct: Math.round((trained / totalShots) * 100), label: `${trained}/${totalShots} trained` }; },
    stop() { const summary = { trained, totalShots, mode }; mode = null; return summary; },

    // Optional UI hooks — render the training-hub screen via the shared template.
    // opts:{ shots:[{name,trained}], onPick, onAll }. The real build supplies trained state.
    trainingHubUI(opts = {}) {
      const T = window.FrameworkTemplates;
      if (T && T.renderMobileTrainingHub) {
        T.renderMobileTrainingHub({
          title: opts.title || 'Train Your Shots',
          subtitle: opts.subtitle || this.progress().label,
          shots: opts.shots || [],
          onPick: opts.onPick, onAll: opts.onAll,
        });
      }
    },
    netPracticeUI() { /* TODO(dev): render the net-practice screen */ },

    _setTrained(n) { trained = Math.max(0, Math.min(totalShots, n | 0)); },  // test/helper
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = window.FrameworkMLProfile; }
