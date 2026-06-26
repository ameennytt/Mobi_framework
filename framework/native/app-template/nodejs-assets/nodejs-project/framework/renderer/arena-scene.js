'use strict';

/**
 * FrameworkArena — the reusable TV "stadium" gallery.
 *
 * This is the generic visual layer extracted from CricSwing's screen.html, with
 * every cricket-specific thing removed (no batsman / bowler / fielders / pitch /
 * stumps). What remains is a sport-neutral arena a game can draw on top of:
 *   • a floodlit stadium (sky, stands, towers, crowd, grass, field mood)
 *   • a boundary rope + infield circle + swappable outfield ad boards
 *   • a particle system (burst on score) + fireworks + a victory trophy
 *
 * It plugs into the existing render pipeline by registering layers on
 * FrameworkLayers — the static stadium goes on the cached `background` layer (so
 * it costs zero per frame), the rope/ads on `ground`, and effects on `particle`.
 * The game draws its own action on the `object` layer (via the draw fn passed to
 * FrameworkGame.init / FrameworkRenderer.init).
 *
 * Perspective + ball math come from ShotVisuals so a ball fired with
 * ShotVisuals.computeShotLanding lands exactly on the rope drawn here.
 *
 * Usage (TV screen.html):
 *   FrameworkArena.install({ ads: [...] });   // before FrameworkGame.init
 *   FrameworkArena.burst(x, y, '#ffd700', 40); // on a scoring event
 *   FrameworkArena.celebrate(true);            // win -> fireworks + trophy
 *
 * window.FrameworkArena.
 */
class ArenaScene {
  constructor() {
    this.scene = null;        // generated star/seat/crowd layout (normalized)
    this.particles = [];
    this._pool = [];
    this.fw = [];             // firework particles
    this.fwActive = false;
    this.trophy = null;       // {t} when a victory trophy is animating
    this.crowdWave = 0;       // frames of crowd celebration left (rope ripple)
    this.ads = [
      { txt: 'PLAY', ux: -0.70, uy: 0.78, color: 'var-accent' },
      { txt: 'CONNECT · PLAY · WIN', ux: 0.70, uy: 0.78, color: '#cfe6c4' },
    ];
    this.field = null;     // optional FrameworkFields overlay name (e.g. 'goal')
    this._installed = false;
  }

  /** Read a themed colour from CSS vars, with a fallback. */
  _accent() {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--game-accent').trim();
      return v || '#00d2ff';
    } catch (_) { return '#00d2ff'; }
  }

  install(opts = {}) {
    if (opts.ads) this.ads = opts.ads;
    if (opts.field) this.field = opts.field;
    const L = window.FrameworkLayers;
    if (!L) { console.warn('[Arena] FrameworkLayers missing'); return; }
    L.register('background', (ctx, W, H) => this._drawBackground(ctx, W, H));
    L.register('ground', (ctx, W, H) => this._drawGround(ctx, W, H));
    L.register('particle', (ctx, W, H) => this._drawEffects(ctx, W, H));
    this._installed = true;
  }

  // ── geometry (matches ShotVisuals so landings align with the rope) ──────────
  perspective(W, H) { return window.ShotVisuals.perspective(W, H); }

  boundary(W, H) {
    const horizY = H * 0.30;
    return {
      ey: horizY + (H - horizY) * 0.70,
      erx: W * 0.46,
      ery: (H - horizY) * 0.57,
    };
  }

  _ensureScene() {
    if (this.scene) return;
    this.scene = {
      stars: Array.from({ length: 140 }, () => ({
        x: Math.random(), y: Math.random() * 0.92,
        r: Math.random() * 1.6 + 0.4, a: Math.random() * 0.85 + 0.15,
      })),
      seats: Array.from({ length: 700 }, (_, i) => ({
        filled: ((i * 13 + i * i) % 100) > 22,
        hue: 200 + ((i * 31) % 90),
      })),
      crowd: Array.from({ length: 300 }, (_, i) => ({
        x: i / 300, hue: 180 + (i * 17) % 140, sat: 30 + ((i * 13) % 28), off: (i * 3) % 10,
      })),
    };
  }

  // ── background: static floodlit stadium (cached by the layer manager) ───────
  _drawBackground(c, W, H) {
    this._ensureScene();
    const horizY = H * 0.30;
    const { ey, erx, ery } = this.boundary(W, H);

    // Sky.
    const sky = c.createLinearGradient(0, 0, 0, horizY);
    sky.addColorStop(0, '#02060e'); sky.addColorStop(0.55, '#06112a'); sky.addColorStop(1, '#0a1c10');
    c.fillStyle = sky; c.fillRect(0, 0, W, horizY + 4);

    // Baked stars (static — twinkle skipped for perf/cache).
    this.scene.stars.forEach(s => {
      c.beginPath(); c.arc(s.x * W, s.y * horizY, s.r, 0, Math.PI * 2);
      c.fillStyle = `rgba(255,255,240,${s.a.toFixed(2)})`; c.fill();
    });

    // Upper + lower stands (seat speckle).
    c.fillStyle = '#060e1c'; c.fillRect(0, 0, W, horizY * 0.50);
    const cols = Math.ceil(W / 5);
    for (let r = 0; r < 7; r++) {
      const ry = horizY * (0.03 + r * 0.056);
      const rw = W * (0.26 + r * 0.10), rx = (W - rw) / 2;
      for (let col = 0; col < Math.ceil(rw / 5); col++) {
        const s = this.scene.seats[(r * cols + col) % this.scene.seats.length];
        const l = s.filled ? 23 + r * 1.8 : 12;
        c.fillStyle = s.filled ? `hsl(${s.hue},52%,${l}%)` : `hsl(218,22%,${l}%)`;
        c.fillRect(rx + col * 5, ry, 4, 4);
      }
    }
    c.fillStyle = '#091526'; c.fillRect(0, horizY * 0.44, W, horizY * 0.24);
    for (let r = 0; r < 5; r++) {
      const ry = horizY * (0.46 + r * 0.043);
      for (let col = 0; col < Math.ceil(W / 5); col++) {
        const s = this.scene.seats[(r * 60 + col) % this.scene.seats.length];
        const l = s.filled ? 27 + r * 2 : 14;
        c.fillStyle = s.filled ? `hsl(${s.hue},55%,${l}%)` : `hsl(218,22%,${l}%)`;
        c.fillRect(col * 5, ry, 4, 5);
      }
    }

    // Floodlight towers + glow.
    const towers = [
      { x: W * 0.055, ty: horizY * 0.04 }, { x: W * 0.945, ty: horizY * 0.04 },
      { x: W * 0.20, ty: horizY * 0.40 }, { x: W * 0.80, ty: horizY * 0.40 },
    ];
    towers.forEach(({ x, ty }) => {
      const fx = W / 2, fy = horizY + (H - horizY) * 0.45;
      const cg = c.createLinearGradient(x, ty, fx, fy);
      cg.addColorStop(0, 'rgba(255,248,200,.07)'); cg.addColorStop(1, 'rgba(255,248,200,0)');
      const ang = Math.atan2(fy - ty, fx - x), perp = ang + Math.PI / 2, spread = H * 0.14;
      c.beginPath(); c.moveTo(x, ty);
      c.lineTo(fx + Math.cos(perp) * spread, fy + Math.sin(perp) * spread);
      c.lineTo(fx - Math.cos(perp) * spread, fy - Math.sin(perp) * spread);
      c.closePath(); c.fillStyle = cg; c.fill();
      [-7, -2.5, 2.5, 7].forEach(ox => {
        const lg = c.createRadialGradient(x + ox, ty, 0, x + ox, ty, 7);
        lg.addColorStop(0, 'rgba(255,252,210,1)'); lg.addColorStop(0.5, 'rgba(255,240,150,.5)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(x + ox, ty, 5, 0, Math.PI * 2); c.fill();
      });
    });

    // Crowd ring (baked static).
    const crowdY = horizY - 24;
    c.fillStyle = '#07150a'; c.fillRect(0, crowdY - 6, W, 36);
    this.scene.crowd.forEach(p => {
      const px = p.x * W, by = crowdY + p.off;
      c.fillStyle = `hsl(${p.hue},${p.sat}%,${20 + Math.sin(px * 0.3) * 4}%)`;
      c.fillRect(px, by, 4, 14);
      c.beginPath(); c.arc(px + 2, by - 3, 3.5, 0, Math.PI * 2); c.fill();
    });

    // Grass + depth stripes.
    const gnd = c.createLinearGradient(0, horizY, 0, H);
    gnd.addColorStop(0, '#102810'); gnd.addColorStop(0.5, '#2d5e1f'); gnd.addColorStop(1, '#4a8b3a');
    c.fillStyle = gnd; c.fillRect(0, horizY, W, H - horizY);
    c.save();
    c.beginPath(); c.ellipse(W / 2, ey, erx, ery, 0, 0, Math.PI * 2); c.clip();
    const sh = Math.max(10, (H - horizY) / 20);
    for (let sy = horizY; sy < H; sy += sh) {
      const even = Math.floor((sy - horizY) / sh) % 2 === 0;
      const depth = (sy - horizY) / (H - horizY);
      c.fillStyle = `hsl(128,36%,${even ? 26 + depth * 12 : 18 + depth * 8}%)`;
      c.fillRect(0, sy, W, sh);
    }
    c.restore();

    // Lamplight pool on the grass.
    const fh = H - horizY;
    c.save();
    c.beginPath(); c.rect(0, horizY, W, fh); c.clip();
    c.translate(W * 0.5, H * 0.75); c.scale(1, (H * 0.40) / (W * 0.80));
    const lime = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.80);
    lime.addColorStop(0, 'rgba(118,185,0,.08)'); lime.addColorStop(0.6, 'rgba(118,185,0,0)');
    c.fillStyle = lime; c.beginPath(); c.arc(0, 0, W * 0.80, 0, Math.PI * 2); c.fill();
    c.restore();

    // Corner vignette sinking the field edges.
    c.save();
    c.beginPath(); c.rect(0, horizY, W, fh); c.clip();
    c.translate(W * 0.5, H); c.scale(1, (fh * 1.15) / (W * 0.92));
    const cvg = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.92);
    cvg.addColorStop(0, 'rgba(7,16,12,0)'); cvg.addColorStop(0.58, 'rgba(7,16,12,0)');
    cvg.addColorStop(0.86, 'rgba(7,16,12,.40)'); cvg.addColorStop(1, 'rgba(7,16,12,.78)');
    c.fillStyle = cvg; c.beginPath(); c.arc(0, 0, W * 1.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ── ground: rope + infield circle + ad boards (live, cheap) ─────────────────
  _drawGround(c, W, H) {
    const horizY = H * 0.30;
    const { ey, erx, ery } = this.boundary(W, H);
    const rip = this.crowdWave > 0 ? Math.sin(Date.now() / 75) * 2.5 : 0;

    // Boundary rope.
    c.beginPath(); c.ellipse(W / 2, ey + rip * 0.4, erx + rip + 2, ery + rip * 0.5 + 2, 0, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 7; c.stroke();
    c.beginPath(); c.ellipse(W / 2, ey + rip * 0.4, erx + rip, ery + rip * 0.5, 0, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(240,240,240,.9)'; c.lineWidth = 3; c.stroke();

    // Infield circle.
    const cy = horizY + (H - horizY) * 0.52;
    c.beginPath(); c.ellipse(W / 2, cy, W * 0.225, (H - horizY) * 0.275, 0, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255,255,255,.065)'; c.lineWidth = 1.5;
    c.setLineDash([7, 9]); c.stroke(); c.setLineDash([]);

    // Outfield ad boards.
    const { cx, nearY, nearW } = this.perspective(W, H);
    const accent = this._accent();
    this.ads.forEach(ad => {
      const py = horizY + (nearY - horizY) * ad.uy + (H - nearY) * ad.uy * 0.4;
      const px = cx + ad.ux * (nearW * 2.1) * (0.4 + ad.uy * 0.6);
      const halfPitch = (nearW * 0.5) * ad.uy + (W * 0.04) * (1 - ad.uy);
      if (Math.abs(px - cx) < halfPitch + 12) return;
      const scale = 0.5 + ad.uy * 1.4;
      c.save();
      c.translate(px, py); c.transform(scale, 0, 0, scale * 0.34, 0, 0);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.font = '900 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(ad.txt, 1, 1);
      c.fillStyle = ad.color === 'var-accent' ? accent : ad.color;
      c.globalAlpha = 0.78; c.fillText(ad.txt, 0, 0);
      c.restore();
    });

    // Optional sport field overlay (goal / court / lanes / targetBoard).
    if (this.field && window.FrameworkFields && window.FrameworkFields[this.field]) {
      try { window.FrameworkFields[this.field](c, W, H); } catch (_) {}
    }

    if (this.crowdWave > 0) this.crowdWave--;
  }

  // ── effects: particles + fireworks + trophy (live) ──────────────────────────
  _drawEffects(c, W, H) {
    // particles
    let w = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.91; p.vy *= 0.91; p.vy += 0.25; p.life *= 0.88;
      if (p.life > 0.02) this.particles[w++] = p;
      else if (this._pool.length < 256) this._pool.push(p);
    }
    this.particles.length = w;
    const prevA = c.globalAlpha;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      c.globalAlpha = Math.min(1, p.life);
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = prevA;

    // fireworks
    if (this.fw.length) {
      this.fw = this.fw.filter(p => p.life > 0.02);
      this.fw.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.vx *= 0.94; p.vy *= 0.94; p.life *= 0.92;
        c.beginPath(); c.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        c.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0'); c.fill();
      });
    }

    if (this.trophy) this._drawTrophy(c, W, H);
  }

  _drawTrophy(c, W, H) {
    this.trophy.t = Math.min(2, this.trophy.t + 0.016);
    const t = this.trophy.t;
    const sc = t < 0.5 ? t / 0.5 : 1;
    const pulse = 0.88 + 0.12 * Math.sin(performance.now() * 0.0028);
    c.save(); c.translate(W / 2, H * 0.40); c.scale(sc * pulse, sc);
    const gw = c.createRadialGradient(0, 0, 10, 0, 0, 230);
    gw.addColorStop(0, 'rgba(255,215,0,.40)'); gw.addColorStop(0.5, 'rgba(255,180,0,.12)'); gw.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gw; c.beginPath(); c.arc(0, 0, 230, 0, Math.PI * 2); c.fill();
    const cg = c.createLinearGradient(-72, -135, 72, -135);
    cg.addColorStop(0, '#8b6914'); cg.addColorStop(0.25, '#ffd700'); cg.addColorStop(0.5, '#ffe870'); cg.addColorStop(0.75, '#ffd700'); cg.addColorStop(1, '#8b6914');
    c.beginPath();
    c.moveTo(-58, -135); c.bezierCurveTo(-82, -92, -82, -22, -36, 7);
    c.lineTo(-23, 28); c.lineTo(23, 28); c.lineTo(36, 7);
    c.bezierCurveTo(82, -22, 82, -92, 58, -135); c.closePath();
    c.fillStyle = cg; c.fill();
    c.lineWidth = 8; c.strokeStyle = '#c8a020'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-58, -92); c.bezierCurveTo(-100, -92, -100, -46, -58, -46); c.stroke();
    c.beginPath(); c.moveTo(58, -92); c.bezierCurveTo(100, -92, 100, -46, 58, -46); c.stroke();
    c.fillStyle = '#b8920a'; c.fillRect(-13, 28, 26, 46);
    c.beginPath(); c.moveTo(-56, 74); c.lineTo(-56, 96); c.lineTo(56, 96); c.lineTo(56, 74); c.closePath();
    c.fillStyle = cg; c.fill();
    c.restore();
  }

  // ── public effect triggers ──────────────────────────────────────────────────
  /** Spray particles from (x,y). Count auto-scales down on weak TVs. */
  burst(x, y, color, count) {
    const perf = window.TvPerfManager;
    const n = perf ? perf.scaleParticles(count || 20) : (count || 20);
    color = color || this._accent();
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      const p = this._pool.pop() || {};
      p.x = x; p.y = y;
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - 3;
      p.life = 1; p.r = 3 + Math.random() * 3; p.color = color;
      this.particles.push(p);
    }
  }

  /** Trigger crowd celebration (rope ripple) for a number of frames. */
  cheer(frames) { this.crowdWave = Math.max(this.crowdWave, frames || 120); }

  /** Win celebration: fireworks bursts + the trophy. */
  celebrate(win) {
    if (!win) return;
    this.trophy = { t: 0 };
    this.cheer(240);
    const W = (window.FrameworkRenderer && window.FrameworkRenderer.W) || 1280;
    const H = (window.FrameworkRenderer && window.FrameworkRenderer.H) || 720;
    const colors = ['#ffd700', '#7edb7e', '#4af', '#ff6688', '#ffffff'];
    const shoot = () => {
      const cx = W * (0.2 + Math.random() * 0.6);
      const cy = H * (0.15 + Math.random() * 0.3);
      const color = colors[(Math.random() * colors.length) | 0];
      const n = window.TvPerfManager ? window.TvPerfManager.scaleParticles(36) : 36;
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 5;
        this.fw.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 1, r: 3, color });
      }
    };
    let shots = 0;
    const iv = setInterval(() => { shoot(); if (++shots >= 8) clearInterval(iv); }, 320);
  }

  /** Clear all transient effects (new game / reset). */
  reset() {
    this.particles.length = 0;
    this.fw.length = 0;
    this.trophy = null;
    this.crowdWave = 0;
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkArena = new ArenaScene();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkArena;
}
