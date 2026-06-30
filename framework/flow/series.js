'use strict';

/**
 * FrameworkSeries — optional multi-match state machine (series + tournament).
 *
 * A single match needs none of this. Games that want CricSwing's "Best of 3" or a
 * knockout bracket opt in: the lobby calls FrameworkSeries.start(...) when a
 * series/tournament format is picked, the controller calls recordResult(won) on
 * game_over, and the TV match-end CTA reads standings() to show "Match 2 of 3" /
 * "Next Match" / "Champion" / "Eliminated".
 *
 * State is persisted (monitored key → mirrored to localStorage) so an app-kill
 * mid-series resumes. Sport-neutral: it only counts wins, never touches rules.
 *
 *   type:'series'      best-of-N, first to ceil(N/2) wins takes the series.
 *   type:'tournament'  knockout — one loss ends your run; survive `total` rounds = champion.
 *
 * window.FrameworkSeries.
 */
window.FrameworkSeries = (function () {
  let gid = 'fw';
  const KEY = () => `${gid}_series`;

  function load() {
    try {
      const raw = window.FrameworkStorage && window.FrameworkStorage.load(KEY());
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch (_) { return null; }
  }
  function save(s) {
    try {
      if (window.FrameworkStorage) {
        window.FrameworkStorage.monitor(KEY());
        window.FrameworkStorage.save(KEY(), JSON.stringify(s));
      }
    } catch (_) {}
  }

  return {
    /** Bind to the current game id (so two games don't share series state). */
    init(id) { if (id) gid = id; return this; },

    /**
     * Begin a fresh series/tournament. opts:
     *   { type:'series'|'tournament', bestOf?:3, total?:N }
     * `bestOf` applies to series (default 3); `total` rounds applies to tournament
     * (default 3). Returns the new state.
     */
    start({ type = 'series', bestOf = 3, total } = {}) {
      const s = {
        type: type === 'tournament' ? 'tournament' : 'series',
        bestOf: bestOf,
        total: type === 'tournament' ? (total || 3) : bestOf,
        matchNum: 1, userWins: 0, cpuWins: 0, knockedOut: false, done: false,
      };
      save(s);
      return s;
    },

    /** Current raw state, or null when no series is active. */
    current() { return load(); },

    /** True when no series is active or it has finished. */
    isOver() { const s = load(); return !s || s.done; },

    /**
     * Record one match outcome and advance. Returns the updated state (or null if
     * no series). Sets `done` when the series/tournament is decided.
     */
    recordResult(won) {
      const s = load();
      if (!s) return null;
      if (won) s.userWins++; else { s.cpuWins++; if (s.type === 'tournament') s.knockedOut = true; }

      if (s.type === 'series') {
        const need = Math.floor(s.bestOf / 2) + 1;             // first to majority
        if (s.userWins >= need || s.cpuWins >= need) s.done = true;
        else s.matchNum++;
      } else {                                                  // tournament knockout
        if (s.knockedOut) s.done = true;
        else if (s.matchNum >= s.total) s.done = true;          // survived the bracket
        else s.matchNum++;
      }
      save(s);
      return s;
    },

    /**
     * View-model for badges / match-end. Returns null when no series:
     *   { type, matchNum, total, userWins, cpuWins, done, won, knockedOut,
     *     label:'Match 2 of 3', cta:'Next Match'|'New Tournament'|'Play Again' }
     */
    standings() {
      const s = load();
      if (!s) return null;
      const won = s.done && (s.type === 'tournament' ? !s.knockedOut : s.userWins > s.cpuWins);
      const label = s.type === 'tournament'
        ? (s.done ? (won ? 'Champion!' : 'Eliminated') : `Round ${s.matchNum} of ${s.total}`)
        : (s.done ? (won ? 'Series won!' : 'Series lost') : `Match ${s.matchNum} of ${s.bestOf}`);
      const cta = s.done ? 'Play Again' : 'Next Match';
      return {
        type: s.type, matchNum: s.matchNum, total: s.total,
        userWins: s.userWins, cpuWins: s.cpuWins,
        done: s.done, won, knockedOut: s.knockedOut, label, cta,
      };
    },

    /** Forget the series (new single match, or series finished + acknowledged). */
    clear() { try { window.FrameworkStorage && window.FrameworkStorage.remove(KEY()); } catch (_) {} },
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = window.FrameworkSeries; }
