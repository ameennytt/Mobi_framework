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
      const target = d.target || lastTarget || 0;
      const oversFaced = d.balls != null ? `${Math.floor(d.balls / 6)}.${d.balls % 6}` : '—';
      // Six-stat grid (CricSwing result): RUNS · OVERS · WKTS · TARGET · SR · BNDRS.
      const baseStats = [
        { label: 'Runs', value: d.runs != null ? d.runs : 0 },
        { label: 'Overs', value: oversFaced },
        { label: 'Wkts', value: d.wickets || 0 },
        { label: 'Target', value: target || '—' },
        { label: 'SR', value: d.strikeRate != null ? d.strikeRate.toFixed(1) : '—' },
        { label: 'Bndrs', value: d.boundaries != null ? d.boundaries : 0 },
      ];
      // Chase-result subline: "Chased N · Lost by M runs" / "Chased N · Won with W wkts in hand".
      const margin = Math.max(1, target - (d.runs || 0));
      const sub = d.won
        ? `Chased ${target} · Won with ${Math.max(0, 5 - (d.wickets || 0))} wkts in hand`
        : `Chased ${d.runs || 0} · Lost by ${margin} run${margin !== 1 ? 's' : ''}`;
      const dealNext = () => { lastTarget = computeTarget(overs, difficulty); api.startMatch({ target: lastTarget, overs, difficulty, series: seriesNow() }); };
      const quitSeries = () => { if (window.FrameworkSeries) window.FrameworkSeries.clear(); api.toLobby(); };

      if (stand && !stand.done) {
        api.matchEnd({
          won: d.won, title: d.won ? 'Victory' : 'Defeat',
          sub, stats: baseStats, series: stand,
          quote: { text: d.won ? 'One hand on the trophy.' : 'Cricket teaches you to handle both the highs and the lows.', by: d.won ? 'Commentary' : 'Rahul Dravid' },
          primaryText: 'Next Match', secondaryText: 'New Tournament',
          onPrimary: dealNext, onSecondary: quitSeries,
        });
      } else if (stand) {
        api.matchEnd({
          won: stand.won, title: stand.won ? 'Series Won!' : 'Series Lost',
          sub, stats: baseStats, series: stand,
          quote: { text: stand.won ? 'Champions.' : 'Regroup and go again.', by: 'Commentary' },
          primaryText: 'Back to Lobby', onPrimary: quitSeries,
        });
      } else {
        api.matchEnd({
          won: d.won, title: d.won ? 'Victory' : 'Defeat',
          sub, stats: baseStats,
          quote: { text: d.won ? 'Chased with class.' : 'So close — go again.', by: 'Commentary' },
          primaryText: 'Play Again', secondaryText: 'Home',
          onPrimary: dealNext, onSecondary: api.toHome,
        });
      }
    },
  };
})();
