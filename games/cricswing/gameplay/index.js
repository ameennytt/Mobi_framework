'use strict';

/**
 * Gameplay (entry) — orchestrates the chase by composing GameRules (decisions),
 * GameScoring (state), GameVisuals (ball draw via ChaseShot). Single entry point
 * the framework expects (window.Gameplay). Load order in game-config.json `code:[]`
 * (chase-shot.js + the modules; index.js last).
 *
 * Demo rolls a random outcome; swap GameRules.roll for real rules / swing input
 * without touching scoring, visuals, or the framework.
 */
window.Gameplay = (function () {
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;
  const R = () => window.GameRules;
  const V = () => window.GameVisuals;

  let game = null, paired = false, difficulty = 'medium', ball = null, title = 'Chase';
  let lastMilestone = 0, overStartRuns = 0;   // broadcast extras (milestone / over summary)
  let live = false;                            // board ready (false during pre-match intro)
  let seriesInfo = null;                       // optional series standings (from the start payload)
  let broadcast = false;                       // opt-in broadcast HUD (tv.broadcast:'full')
  let lastChoice = 'center';                   // last shot direction (for the wagon wheel)
  let manhattanOvers = [];                     // runs/wickets per over (manhattan chart)
  let wagonShots = [];                         // shot rays (wagon wheel)
  const score = window.GameScoring.create();

  // Map a shot direction → wagon-wheel angle (batsman hits upward; 270°=straight).
  const CHOICE_ANGLE = { left: 214, center: 270, right: 326 };

  function onAction(d) {
    if (!paired || !live || ball || R().isFinished(score)) return;   // ignore taps during intro
    lastChoice = (d && d.choice) || 'center';
    const out = R().roll(lastChoice, difficulty);
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    ball = V().buildBall(out, { W, H, target: score.target, overs: score.overs, roomCode: game.getCode(), score: score.snapshot() });
  }

  function land() {
    const out = ball.out;
    score.apply(out);
    A().burst(ball.x1, ball.y1, ball.color, out.runs >= 6 ? 55 : out.runs >= 4 ? 32 : 14);
    if (out.runs >= 4) A().cheer(160);
    // Wicket → dramatic red takeover; otherwise the normal outcome banner.
    if (out.dismissed && T().showTVWicket) {
      T().showTVWicket({ pill: 'Wicket', type: 'OUT', sub: out.name || '', tip: `${score.wickets} down`, seconds: 2 });
    } else {
      T().showTVBanner(out.name, ball.color);
    }
    const snap = score.snapshot();
    T().updateTVScorebar(snap);
    game.send('game_state', snap);

    // Broadcast HUD (opt-in) — feed wagon wheel, manhattan, last-ball card each ball.
    if (broadcast) {
      // wagon: a ray per scoring shot (dismissals skipped), power scaled by runs.
      if (!out.dismissed) {
        wagonShots.push({ angle: CHOICE_ANGLE[lastChoice] || 270, power: Math.max(0.35, Math.min(1, (out.runs || 0) / 6)), color: ball.color });
        T().tvWagon(wagonShots);
      }
      // manhattan: accumulate into the current over bucket.
      const ov = Math.floor((score.balls - 1) / 6);
      if (!manhattanOvers[ov]) manhattanOvers[ov] = { runs: 0, wkt: false };
      if (out.dismissed) manhattanOvers[ov].wkt = true; else manhattanOvers[ov].runs += (out.runs || 0);
      T().tvManhattan(manhattanOvers);
      // last-ball commentary card.
      T().tvLastBall({ result: out.dismissed ? 'Wicket' : (out.runs ? `${out.runs} run${out.runs !== 1 ? 's' : ''}` : 'Dot ball'), text: out.name || '', color: ball.color });
    }

    ball = null;
    const finished = R().isFinished(score);

    // OPTIONAL broadcast extras (chase is the rich demo; guarded so they're harmless).
    // Milestone flash every 50 runs.
    if (T().showTVMilestone) {
      const m = Math.floor(score.runs / 50) * 50;
      if (m >= 50 && m > lastMilestone) { lastMilestone = m; T().showTVMilestone({ kicker: 'Milestone', big: m, sub: 'runs', color: '#ffd700' }); }
    }
    // Over summary at each completed over (never at the final ball).
    if (!finished && score.balls > 0 && score.balls % 6 === 0 && T().renderTVOverSummary) {
      const overRuns = score.runs - overStartRuns; overStartRuns = score.runs;
      T().renderTVOverSummary({
        title: `End of Over ${score.balls / 6}`,
        score: `${score.runs}/${score.wickets}`,
        stats: [
          { label: 'This over', value: overRuns },
          { label: 'Wickets', value: score.wickets },
          { label: 'Need', value: score.target ? Math.max(0, score.target - score.runs) : '—' },
        ],
        seconds: 3,
      });
    }

    if (finished) setTimeout(end, 1100);
  }

  function end() {
    const won = R().won(score);
    A().celebrate(won);
    game.send('game_over', {
      won, runs: score.runs, wickets: score.wickets, balls: score.balls,
      boundaries: score.boundaries, strikeRate: score.strikeRate, target: score.target, overs: score.overs,
    });
    T().showTVBanner(won ? 'YOU WON!' : 'CHASE OVER', won ? '#ffd700' : '#ff6688');
    setTimeout(() => {
      game.showResult({
        won,
        bannerText: won ? 'Victory' : 'Chase Fell Short',
        winner: `${score.runs}/${score.wickets}`,
        // Optional dual scoreboard + quote (template renders these only when present).
        scoreboard: {
          user: { name: 'You', score: `${score.runs}/${score.wickets}`, winner: won },
          opp: { name: 'Opponent', score: score.target ? score.target - 1 : '—', winner: !won },
        },
        quote: { text: won ? 'Chased it down with class.' : 'So close — go again.', by: 'Commentary' },
        series: seriesInfo || undefined,   // full standings → renders series dots on the TV result
        stats: [
          { label: 'Runs', value: score.runs },
          { label: 'Target', value: score.target || '—' },
          { label: 'Overs', value: `${Math.floor(score.balls / 6)}.${score.balls % 6}` },
        ],
        // TV result is display-only — the phone drives Next Match / Play Again (no dead TV button).
        sub: 'Continue on your phone',
      });
    }, won ? 1800 : 1100);
  }

  // Set up the live scorebar (shared by fresh start + post-intro + resume).
  function setupBoard() {
    ball = null;
    live = true;
    A().reset();
    T().hideTVResult();
    T().renderTVScorebar({ title, chasingLabel: score.target ? `Target ${score.target}` : 'Free Play' });
    T().updateTVScorebar(score.snapshot());
    // Broadcast HUD is opt-in (game-config `tv.broadcast:'full'`); off → clean minimal TV.
    broadcast = !!(window.FrameworkAssets && window.FrameworkAssets.tv && window.FrameworkAssets.tv.broadcast === 'full');
    T().renderTVBroadcast(broadcast);
    if (broadcast) { T().tvConn(true, 'Bat phone connected'); T().tvManhattan(manhattanOvers); T().tvWagon(wagonShots); }
  }

  function start(opts = {}) {
    difficulty = opts.difficulty || 'medium';
    score.reset({ target: opts.target || 0, overs: opts.overs || 0 });
    lastMilestone = 0; overStartRuns = 0; live = false;
    manhattanOvers = []; wagonShots = [];   // reset broadcast HUD data for a fresh innings
    // Optional broadcast open: team-vs-team intro + 3-2-1 countdown, then the board.
    if (T().runTVPreMatch) {
      T().runTVPreMatch({ titleA: 'You', titleB: 'CPU', sub: score.target ? `Chasing ${score.target}` : '', countdownFrom: 3 }, setupBoard);
    } else { setupBoard(); }
  }

  // Restore an in-progress chase from the saved snapshot (reconnect/reload), no reset.
  // No intro on resume — go straight back to the live board.
  function resume() {
    const s = game.loadSavedState();
    if (!s) { start({}); return; }
    score.restore(s);
    lastMilestone = Math.floor(score.runs / 50) * 50;   // don't re-flash a passed milestone
    overStartRuns = score.runs;
    setupBoard();
  }

  function draw(ctx, W, H) {
    if (!ball) return;
    if (V().drawBall(ctx, ball)) land();
  }

  function attach(g) { game = g; try { title = g.text('APP_TITLE') || 'Chase'; } catch (_) {} }

  return {
    attach, draw, start,
    setPaired: (v) => { paired = v; },
    handlers: {
      action: onAction,
      start: (d) => { paired = true; if (d && 'series' in d) seriesInfo = d.series || null; start(d || {}); },
      resume: () => { paired = true; resume(); },
    },
  };
})();
