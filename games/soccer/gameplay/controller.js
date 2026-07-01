'use strict';

/**
 * Versus controller hooks — the SPORT-SPECIFIC bits of the phone controller.
 * The framework (FrameworkController) owns the shell, buttons, pause, connection,
 * resume and match-end; this only supplies what's football-specific: the round
 * label format and the full-time card (with draw handling). Loaded on the
 * controller page via game-config.json `controller.code`.
 */
window.Gameplay = window.Gameplay || {};
window.Gameplay.controller = {
  // First-pair / Play-Again payload sent to the TV's gameplay `start` handler.
  startPayload: (params) => ({
    rounds: parseInt(params.get('rounds') || '5', 10),
    difficulty: params.get('difficulty') || 'medium',
  }),

  // game_state → HUD. Round needs "n/total" formatting, so we map it ourselves.
  onState: (d, api) => {
    api.setHud('you', d.you);
    api.setHud('cpu', d.cpu);
    api.setHud('round', `${d.round || 0}/${d.rounds || 0}`);
  },

  // game_over → full-time card (Victory / Draw / Defeat).
  onOver: (d, api) => {
    const draw = d.you === d.cpu && !d.won;
    api.matchEnd({
      won: d.won,
      title: d.won ? 'Victory' : draw ? 'Draw' : 'Defeat',
      sub: `Full time ${d.you} – ${d.cpu}`,
      scoreboard: {
        user: { name: 'You', score: d.you, winner: d.won },
        opp: { name: 'CPU', score: d.cpu, winner: !d.won && !draw },
      },
      stats: [{ label: 'You', value: d.you }, { label: 'CPU', value: d.cpu }],
      quote: { text: d.won ? 'Clinical finish.' : draw ? 'Honours even.' : 'Go again.', by: 'Commentary' },
      primaryText: 'Play Again', secondaryText: 'Home',
      onPrimary: () => api.startMatch(window.Gameplay.controller.startPayload(api.params)),
      onSecondary: api.toHome,
    });
  },
};
