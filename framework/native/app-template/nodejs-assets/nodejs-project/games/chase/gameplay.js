'use strict';

/**
 * Chase — sample gameplay (THE FILE A DEVELOPER EDITS).
 *
 * This is the "core gameplay + game screen" the framework leaves to you. Every-
 * thing else (pairing, the whole lobby flow, reconnect, the stadium gallery, the
 * scorebar) is handled by the framework. Here we implement a simple button game:
 * the phone sends an `action` with a direction; we roll an outcome, fly a ball
 * across the reused FrameworkArena, add runs, and chase a target. Swap the roll
 * for real rules (or later, a swing/ML input) without touching anything else.
 *
 * Reuses: ShotVisuals (ball math), FrameworkArena (stadium + particles +
 * trophy), FrameworkTemplates (scorebar + banner + result). window.Gameplay.
 */
window.Gameplay = (function () {
  const MAX_WICKETS = 10;
  const T = () => window.FrameworkTemplates;
  const A = () => window.FrameworkArena;

  let game = null;            // FrameworkGame api (set by attach)
  let paired = false;
  let difficulty = 'medium';
  const score = { runs: 0, balls: 0, wickets: 0 };
  let target = 0, overs = 0;
  let ball = null;            // active ball animation
  let title = 'Chase';

  // ── outcome roll (EDIT: your real rules go here) ──────────────────────────
  const DIR = { left: 'leg', center: 'str', right: 'off' };
  function rollOutcome(choice) {
    const dir = DIR[choice] || 'str';
    const r = Math.random();
    // difficulty nudges the dot/wicket vs boundary balance
    const aggr = difficulty === 'hard' ? 0.16 : difficulty === 'easy' ? 0.05 : 0.10;
    if (r < aggr) return mk(0, dir, true);                 // wicket
    if (r < aggr + 0.20) return mk(0, dir, false);         // dot
    if (r < aggr + 0.45) return mk(1, dir, false);
    if (r < aggr + 0.60) return mk(2, dir, false);
    if (r < aggr + 0.68) return mk(3, dir, false);
    if (r < aggr + 0.86) return mk(4, choice === 'center' ? 'str' : dir, false);
    return mk(6, choice === 'center' ? 'lofted' : dir, false);
  }
  function mk(runs, dir, dismissed) {
    const name = dismissed ? 'OUT!' : runs === 6 ? 'SIX!' : runs === 4 ? 'FOUR!'
      : runs === 3 ? 'THREE' : runs === 2 ? 'TWO' : runs === 1 ? 'ONE' : 'DOT BALL';
    return { runs, dir, dismissed, name };
  }

  // ── controller input ──────────────────────────────────────────────────────
  function onAction(d) {
    if (!paired || ball || finished()) return;
    const out = rollOutcome((d && d.choice) || 'center');
    fireBall(out);
  }

  function fireBall(out) {
    const W = window.FrameworkRenderer.W, H = window.FrameworkRenderer.H;
    const vis = window.ShotVisuals.buildVisual(
      { runs: out.runs, dir: out.dir, dismissed: out.dismissed, name: out.name,
        score: { runs: score.runs, balls: score.balls, wickets: score.wickets } },
      { W, H, tvTarget: target, tvOvers: overs, roomCode: game.getCode() }
    );
    const o = vis.origin;
    const land = vis.landing || { landX: W / 2, landGroundY: H * 0.32 };
    ball = {
      t: 0, dur: (vis.ball && vis.ball.dur) || 48,
      x0: o.bx, y0: o.by, x1: land.landX, y1: land.landGroundY,
      arcH: (vis.ball && vis.ball.arcH) || H * 0.1,
      out, color: (vis.fx && vis.fx.bannerColor) || '#fff',
      done: false,
    };
  }

  function landBall() {
    const out = ball.out;
    score.balls++;
    if (out.dismissed) { score.wickets++; }
    else { score.runs += out.runs; }
    // effects
    A().burst(ball.x1, ball.y1, ball.color, out.runs >= 6 ? 55 : out.runs >= 4 ? 32 : 14);
    if (out.runs >= 4) A().cheer(160);
    T().showTVBanner(out.name, ball.color);
    T().updateTVScorebar({ runs: score.runs, balls: score.balls, overs, target });
    game.send('game_state', { runs: score.runs, balls: score.balls, wickets: score.wickets, target, overs });
    ball = null;
    if (finished()) setTimeout(endGame, 1100);
  }

  function finished() {
    if (!overs) return false;
    if (target && score.runs >= target) return true;
    if (score.wickets >= MAX_WICKETS) return true;
    return score.balls >= overs * 6;
  }

  function endGame() {
    const won = target ? score.runs >= target : false;
    A().celebrate(won);
    game.send('game_over', { runs: score.runs, wickets: score.wickets, won });
    T().showTVBanner(won ? 'YOU WON!' : 'CHASE OVER', won ? '#ffd700' : '#ff6688');
    setTimeout(() => {
      game.showResult({
        bannerText: won ? 'Victory' : 'Chase Fell Short',
        winner: `${score.runs}/${score.wickets}`,
        stats: [
          { label: 'Runs', value: score.runs },
          { label: 'Target', value: target || '—' },
          { label: 'Overs', value: `${Math.floor(score.balls / 6)}.${score.balls % 6}` },
        ],
        primaryText: 'PLAY AGAIN',
        onPrimary: () => { game.hideResult(); start({ target, overs, difficulty }); },
      });
    }, won ? 1800 : 1100);
  }

  // ── new innings ────────────────────────────────────────────────────────────
  function start(opts = {}) {
    target = opts.target || 0;
    overs = opts.overs || 0;
    difficulty = opts.difficulty || 'medium';
    score.runs = 0; score.balls = 0; score.wickets = 0;
    ball = null;
    A().reset();
    T().hideTVResult();
    T().renderTVScorebar({ title, chasingLabel: target ? `Target ${target}` : 'Free Play' });
    T().updateTVScorebar({ runs: 0, balls: 0, overs, target });
  }

  // ── object-layer draw (ball + trail only; arena draws everything else) ──────
  function draw(ctx, W, H) {
    if (!ball) return;
    ball.t = Math.min(1, ball.t + 1 / ball.dur);
    const e = ball.t;
    const x = ball.x0 + (ball.x1 - ball.x0) * e;
    const yBase = ball.y0 + (ball.y1 - ball.y0) * e;
    const y = yBase - Math.sin(e * Math.PI) * ball.arcH;
    // shadow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, yBase, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // ball
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (ball.t >= 1) landBall();
  }

  // ── wiring ──────────────────────────────────────────────────────────────────
  function attach(g) {
    game = g;
    try { title = g.text('APP_TITLE') || 'Chase'; } catch (_) {}
  }

  return {
    attach,
    draw,
    setPaired: (v) => { paired = v; },
    start,
    handlers: {
      action: onAction,
      // flow/lobby sends `start` with the chosen target/overs/difficulty
      start: (d) => { paired = true; start(d || {}); },
    },
  };
})();
