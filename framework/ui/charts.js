'use strict';

/**
 * FrameworkCharts — optional broadcast HUD widgets (wagon-wheel, manhattan, win-prob,
 * run pie, over-pills, commentary). Pure SVG/DOM, no deps, theme-driven (--game-*).
 *
 * Every widget renders into a host (id string or element). A game enables only the
 * ones it wants (config `tv.wagonWheel` etc.) and calls them each update; a minimal
 * button game never loads this file. Sport-neutral data shapes — see each method.
 *
 * window.FrameworkCharts.
 */
window.FrameworkCharts = (function () {
  const COL = {
    accent: 'var(--game-accent)', gold: 'var(--game-gold)', text: 'var(--game-text)',
    muted: 'var(--game-muted)', danger: 'var(--game-danger)', blue: 'var(--game-blue)',
  };
  function host(h) { return typeof h === 'string' ? document.getElementById(h) : h; }
  function box(el, title) {
    return `<div style="background:var(--game-surface);border:1.5px solid var(--game-secondary-25);border-radius:12px;padding:10px 12px;">
      ${title ? `<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${COL.muted};margin-bottom:8px;">${title}</div>` : ''}${el}</div>`;
  }

  return {
    /** Ball-by-ball pills. balls:[{label,color,fg}] → row of discs. */
    overPills(h, balls = []) {
      const el = host(h); if (!el) return;
      const pills = balls.map(b => `<span style="min-width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--game-mono);font-weight:900;font-size:12px;background:${b.color || 'rgba(255,255,255,.08)'};color:${b.fg || COL.text};">${b.label}</span>`).join('');
      el.innerHTML = box(`<div style="display:flex;gap:6px;flex-wrap:wrap;">${pills}</div>`, 'This over');
    },

    /** Manhattan — runs per over. overs:[{runs,wkt}] → vertical bars. */
    manhattan(h, overs = []) {
      const el = host(h); if (!el) return;
      const max = Math.max(6, ...overs.map(o => o.runs || 0));
      const W = Math.max(80, overs.length * 18), H = 90;
      const bars = overs.map((o, i) => {
        const bh = Math.round((o.runs || 0) / max * (H - 16));
        const x = i * 18 + 4, y = H - bh - 12;
        const c = (o.runs || 0) >= 12 ? COL.gold : (o.runs || 0) >= 8 ? COL.blue : COL.accent;
        return `<rect x="${x}" y="${y}" width="13" height="${bh}" rx="2" fill="${c}"/>${o.wkt ? `<circle cx="${x + 6.5}" cy="${y - 5}" r="3" fill="${COL.danger}"/>` : ''}<text x="${x + 6.5}" y="${H - 2}" font-size="7" fill="${COL.muted}" text-anchor="middle">${i + 1}</text>`;
      }).join('');
      el.innerHTML = box(`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">${bars}</svg>`, 'Runs per over');
    },

    /** Wagon wheel — shot directions. shots:[{angle(0-360),power(0-1),color}]. */
    wagonWheel(h, shots = []) {
      const el = host(h); if (!el) return;
      const R = 56, C = R + 6, S = (R + 6) * 2;
      const rays = shots.map(s => {
        const a = (s.angle || 0) * Math.PI / 180;
        const len = R * (s.power != null ? s.power : 0.9);
        const x2 = C + Math.cos(a) * len, y2 = C + Math.sin(a) * len;
        return `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${s.color || COL.accent}" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;
      }).join('');
      el.innerHTML = box(`<svg viewBox="0 0 ${S} ${S}" width="100%" height="130">
        <circle cx="${C}" cy="${C}" r="${R}" fill="rgba(40,120,60,.18)" stroke="rgba(255,255,255,.15)"/>
        <line x1="${C}" y1="${C - 8}" x2="${C}" y2="${C + 8}" stroke="#fff" stroke-width="3"/>${rays}</svg>`, 'Wagon wheel');
    },

    /** Win-probability bar. pct 0-100 = user's win chance. */
    winProbBar(h, pct = 50) {
      const el = host(h); if (!el) return;
      const p = Math.max(0, Math.min(100, pct));
      el.innerHTML = box(`<div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.08);">
        <div style="width:${p}%;background:${COL.accent};transition:width .9s var(--fw-ease-out);"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-top:5px;"><span style="color:${COL.accent};">You ${Math.round(p)}%</span><span style="color:${COL.muted};">CPU ${Math.round(100 - p)}%</span></div>`, 'Win probability');
    },

    /** Run pie/donut. data:{dots,ones,bnd} → composition of scoring. */
    runPie(h, data = {}) {
      const el = host(h); if (!el) return;
      const parts = [{ v: data.dots || 0, c: COL.muted }, { v: data.ones || 0, c: COL.accent }, { v: data.bnd || 0, c: COL.gold }];
      const total = parts.reduce((s, p) => s + p.v, 0) || 1;
      let a0 = -Math.PI / 2; const C = 46, R = 38;
      const segs = parts.map(p => {
        const a1 = a0 + (p.v / total) * Math.PI * 2;
        const large = (a1 - a0) > Math.PI ? 1 : 0;
        const x0 = C + Math.cos(a0) * R, y0 = C + Math.sin(a0) * R, x1 = C + Math.cos(a1) * R, y1 = C + Math.sin(a1) * R;
        const d = `M ${C} ${C} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
        a0 = a1; return `<path d="${d}" fill="${p.c}" opacity=".9"/>`;
      }).join('');
      el.innerHTML = box(`<svg viewBox="0 0 ${C * 2} ${C * 2}" width="100%" height="110">${segs}<circle cx="${C}" cy="${C}" r="18" fill="rgba(7,16,12,.95)"/></svg>`, 'Run breakdown');
    },

    /** Last-ball commentary card. opts:{result, text, color}. */
    commentaryCard(h, { result, text, color } = {}) {
      const el = host(h); if (!el) return;
      el.innerHTML = box(`${result ? `<span style="display:inline-block;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:${color || COL.accent};margin-bottom:6px;">${result}</span>` : ''}
        <div style="font-size:14px;font-style:italic;color:${COL.text};line-height:1.4;">${text || ''}</div>`, 'Last ball');
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = window.FrameworkCharts; }
