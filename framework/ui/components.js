'use strict';

/**
 * Reusable Generic UI Components for V1 Framework.
 * Compiles and renders standard visual modules (Dialog, ScoreCard, Overlay).
 */
class UIComponents {
  /**
   * Creates or updates a ScoreCard element.
   * @param {string} containerId - Target wrapper ID.
   * @param {string} label - Score label (e.g. "Score", "Goals").
   * @param {string|number} value - Score value.
   * @param {string} accentClass - Optional custom CSS class.
   */
  renderScoreCard(containerId, label, value, accentClass = '') {
    const parent = document.getElementById(containerId);
    if (!parent) return;

    parent.innerHTML = `
      <div class="score-card ${accentClass}">
        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--game-muted); margin-bottom: 6px;">
          ${label}
        </div>
        <div class="score-num">${value}</div>
      </div>
    `;
  }

  /**
   * Creates a grid of generic statistic nodes.
   * @param {string} containerId - Target wrapper ID.
   * @param {Array<{label: string, value: any}>} stats - List of stats to display.
   */
  renderStatGrid(containerId, stats) {
    const parent = document.getElementById(containerId);
    if (!parent) return;

    const itemsHtml = stats.map(item => `
      <div class="stat-card">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--game-muted); margin-bottom: 4px;">
          ${item.label}
        </div>
        <div class="stat-val">${item.value}</div>
      </div>
    `).join('');

    parent.innerHTML = `<div class="stat-grid">${itemsHtml}</div>`;
  }

  /**
   * Shows a gorgeous dialog modal overlay.
   * @param {object} opts - { title, body, confirmText, cancelText, onConfirm, onCancel }
   */
  showConfirmDialog(opts = {}) {
    let overlay = document.getElementById('fw-confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fw-confirm-overlay';
      overlay.className = 'dialog-overlay';
      document.body.appendChild(overlay);
    }

    const confirmText = opts.confirmText || 'OK';
    const cancelText = opts.cancelText || '';

    overlay.innerHTML = `
      <div class="dialog-card">
        <div class="dialog-title">${opts.title || 'Attention'}</div>
        <div class="dialog-body">${opts.body || ''}</div>
        <div class="dialog-btns">
          ${cancelText ? `<button class="btn btn-secondary" id="fw-dlg-cancel">${cancelText}</button>` : ''}
          <button class="btn btn-primary" id="fw-dlg-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.classList.add('show');

    const btnConfirm = overlay.querySelector('#fw-dlg-confirm');
    const btnCancel = overlay.querySelector('#fw-dlg-cancel');

    const close = () => {
      overlay.classList.remove('show');
    };

    btnConfirm.onclick = () => {
      close();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    };

    if (btnCancel) {
      btnCancel.onclick = () => {
        close();
        if (typeof opts.onCancel === 'function') opts.onCancel();
      };
    }
  }

  /**
   * Renders a persistent pairing overlay on the TV screen.
   * @param {string} roomCode - 6-letter room code.
   * @param {string} connectionStatus - "waiting" | "connecting" | "failed"
   * @param {string} qrCodeUrl - Optional URL to display for scanning.
   */
  renderPairingOverlay(roomCode, connectionStatus = 'waiting', qrCodeUrl = '') {
    let overlay = document.getElementById('fw-pairing-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fw-pairing-overlay';
      overlay.className = 'pairing-overlay';
      document.body.appendChild(overlay);
    }

    let statusText = 'Waiting for phone to connect…';
    if (connectionStatus === 'connecting') statusText = 'Connecting controller…';
    if (connectionStatus === 'failed') statusText = 'Connection failed. Trying again…';
    const title = (window.FrameworkAssets && window.FrameworkAssets.text('APP_TITLE')) || 'Pair Your Phone';

    overlay.innerHTML = `
      <div style="max-width: 640px; width: 92%; text-align:center;">
        <div style="font-size: clamp(40px,7vw,64px); font-weight: 900; letter-spacing: 2px; color: var(--game-accent); animation: fwLogoHeroIn .55s var(--fw-ease-out) both;">${title}</div>
        <div style="font-size: 14px; color: var(--game-muted); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px;">TV + Phone</div>
        <div style="margin: 28px auto 0; max-width: 560px; background: rgba(255,255,255,.04); border: 2px solid rgba(154,223,107,.35); border-radius: 24px; padding: 30px 24px;">
          <div style="font-size: 11px; color: var(--game-accent); letter-spacing: 5px; text-transform: uppercase; font-weight: 700;">Enter on Phone</div>
          <div class="pairing-code">${roomCode || '————'}</div>
          ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 180px; height: 180px; margin: 12px auto 0; border-radius: 12px; border: 4px solid var(--game-accent); display:block;" alt="Pairing QR"/>` : ''}
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;font-size:14px;color:var(--game-muted);">
            <span style="width:10px;height:10px;border-radius:50%;background:var(--game-accent);animation:fwPairPulse 1.4s ease-out infinite;"></span>
            <span>${statusText}</span>
          </div>
        </div>
        <div style="max-width:560px;margin:18px auto 0;padding:12px 16px;border-radius:14px;background:rgba(154,223,107,.08);border:1.5px solid rgba(154,223,107,.30);font-size:14px;color:#aee9c0;line-height:1.5;">📶 Phone &amp; TV must be on the <b>same Wi-Fi</b>.</div>
      </div>
    `;
    overlay.style.display = 'flex';
  }

  hidePairingOverlay() {
    const overlay = document.getElementById('fw-pairing-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Renders a small toast notification on screen.
   */
  showToast(text, duration = 3000, isError = false) {
    let toast = document.getElementById('fw-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fw-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 20, 30, 0.9);
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
        pointer-events: none;
        opacity: 0;
      `;
      document.body.appendChild(toast);
    }

    toast.style.border = isError ? '1.5px solid var(--game-danger)' : '1.5px solid var(--game-accent)';
    toast.style.color = isError ? 'var(--game-danger)' : 'var(--game-text)';
    toast.textContent = text;
    toast.style.opacity = '1';

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, duration);
  }

  // ── Premium building blocks (CricSwing-extracted, theme-driven) ──────────

  /**
   * Paintable team/club crest — a colored disc with initials. Returns HTML.
   * @param {object} o { short, color, size }
   */
  crest({ short = '', color = 'var(--game-accent)', size = 56 } = {}) {
    const grad = `radial-gradient(circle at 35% 30%, rgba(255,255,255,.35), rgba(0,0,0,.15)), ${color}`;
    return `<span class="crest" style="width:${size}px;height:${size}px;background:${grad};font-size:${Math.round(size * 0.27)}px;">${String(short).slice(0, 3).toUpperCase()}</span>`;
  }

  /** Premium pill/eyebrow. Returns HTML. */
  pill(text, accent = false) {
    return `<span class="pill${accent ? ' pill-accent' : ''}">${text}</span>`;
  }

  /** Premium card wrapper. Returns HTML. */
  card(innerHtml, extraStyle = '') {
    return `<div class="card" style="${extraStyle}">${innerHtml}</div>`;
  }

  /**
   * Code-input boxes (e.g. a 4-char pairing code). Returns HTML for N boxes; fill
   * via `setCode`. Sport-neutral. opts: { n, value }
   */
  codeInput({ n = 4, value = '' } = {}) {
    const v = String(value).toUpperCase();
    let boxes = '';
    for (let i = 0; i < n; i++) {
      boxes += `<div class="fw-code-box${i === v.length ? ' active' : ''}" data-i="${i}">${v[i] || ''}</div>`;
    }
    return `<div class="fw-codebox-row" id="fw-codebox-row">${boxes}</div>`;
  }
  /** Paint a value into a rendered codeInput row. */
  setCode(value, paired) {
    const row = document.getElementById('fw-codebox-row'); if (!row) return;
    const v = String(value || '').toUpperCase();
    row.classList.toggle('paired', !!paired);
    row.querySelectorAll('.fw-code-box').forEach((b, i) => {
      b.textContent = v[i] || '';
      b.classList.toggle('active', i === v.length && !paired);
    });
  }

  /** Pill tabs (region/group/bracket). Returns HTML; wire clicks via [data-tab]. */
  tabs(items = [], activeIdx = 0) {
    return `<div class="fw-tabs">${items.map((t, i) =>
      `<button class="fw-tab${i === activeIdx ? ' active' : ''}" data-tab="${i}">${t}</button>`).join('')}</div>`;
  }

  /** Progress dots. Returns HTML. */
  dots(n = 3, active = 0) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<i class="${i <= active ? 'on' : ''}"></i>`;
    return `<div class="fw-dots">${s}</div>`;
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkUI = new UIComponents();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkUI;
}
