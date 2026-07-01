'use strict';

/**
 * Chase controller hooks — the SPORT-SPECIFIC bits of the phone controller.
 * The framework (FrameworkController) owns the shell, aim buttons, pause,
 * connection, resume and the match-end card chrome; this supplies what's cricket/
 * chase-specific: the live "Need" calc, the per-match target re-deal for a series,
 * and the broadcast match-end branching (friendly / mid-series / series-end).
 * Loaded on the controller page via game-config.json `controller.code`.
 */
(function () {
  window.Gameplay = window.Gameplay || {};

  // Same toss maths the lobby uses — lets a series deal a fresh target per match.
  function computeTarget(overs, difficulty) {
    const rate = difficulty === 'hard' ? 11 : difficulty === 'easy' ? 6 : 8.5;
    const variance = (Math.random() * 2 - 1) * 1.5;
    const cpu = Math.max(8, Math.round(overs * (rate + variance)));
    return cpu + 1;
  }
  const seriesNow = () => (window.FrameworkSeries ? window.FrameworkSeries.standings() : null);
  let lastTarget = 0;

  function ctx(params) {
    return { overs: parseInt(params.get('overs') || '2', 10), difficulty: params.get('difficulty') || 'medium' };
  }

  window.Gameplay.controller = {
    startPayload: (params) => {
      const { overs, difficulty } = ctx(params);
      let target = parseInt(params.get('target') || '0', 10);
      if (!target) target = computeTarget(overs, difficulty);
      lastTarget = target;
      return { target, overs, difficulty, series: seriesNow() };
    },

    // game_state → HUD. "Need" is derived (target - runs over balls left).
    onState: (d, api) => {
      api.setHud('runs', d.runs);
      const need = d.target ? Math.max(0, d.target - d.runs) : 0;
      const ballsLeft = Math.max(0, (d.overs || 0) * 6 - (d.balls || 0));
      api.setHud('need', d.target ? `${need}/${ballsLeft}` : '—');
    },

    // game_over → broadcast match-end (friendly / mid-series / series finished).
    onOver: (d, api) => {
      if (window.FrameworkSeries) window.FrameworkSeries.recordResult(d.won);
      const stand = seriesNow();
      const { overs, difficulty } = ctx(api.params);
      const baseStats = [
        { label: 'Runs', value: d.runs },
        { label: 'Wkts', value: d.wickets || 0 },
        { label: 'Target', value: lastTarget || '—' },
      ];
      const dealNext = () => { lastTarget = computeTarget(overs, difficulty); api.startMatch({ target: lastTarget, overs, difficulty, series: seriesNow() }); };
      const quitSeries = () => { if (window.FrameworkSeries) window.FrameworkSeries.clear(); api.toLobby(); };

      if (stand && !stand.done) {
        api.matchEnd({
          won: d.won, title: d.won ? 'Match Won' : 'Match Lost',
          sub: `Series ${stand.userWins}–${stand.cpuWins}`, stats: baseStats, series: stand,
          primaryText: 'Next Match', secondaryText: 'Quit Series',
          onPrimary: dealNext, onSecondary: quitSeries,
        });
      } else if (stand) {
        api.matchEnd({
          won: stand.won, title: stand.won ? 'Series Won!' : 'Series Lost',
          sub: `Final ${d.runs}/${d.wickets || 0}`, stats: baseStats, series: stand,
          quote: { text: stand.won ? 'Champions.' : 'Regroup and go again.', by: 'Commentary' },
          primaryText: 'Back to Lobby', onPrimary: quitSeries,
        });
      } else {
        api.matchEnd({
          won: d.won, title: d.won ? 'Victory' : 'Chase Over',
          sub: `Final ${d.runs}/${d.wickets || 0}`, winner: `${d.runs}/${d.wickets || 0}`, stats: baseStats,
          quote: { text: d.won ? 'Chased with class.' : 'So close — go again.', by: 'Commentary' },
          primaryText: 'Play Again', secondaryText: 'Home',
          onPrimary: dealNext, onSecondary: api.toHome,
        });
      }
    },
  };
})();
