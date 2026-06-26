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

    let statusText = 'Waiting for phone to connect...';
    if (connectionStatus === 'connecting') statusText = 'Connecting controller...';
    if (connectionStatus === 'failed') statusText = 'Connection failed. Trying again...';

    overlay.innerHTML = `
      <div style="max-width: 500px; width: 90%;">
        <div style="font-size: 20px; font-weight: 800; text-transform: uppercase; color: var(--game-muted); letter-spacing: 2px;">
          Pair Your Controller
        </div>
        <div style="font-size: 14px; color: var(--game-muted); margin-top: 8px;">
          Go to the web link on your mobile phone or scan the QR:
        </div>
        <div class="pairing-code">${roomCode}</div>
        ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 200px; height: 200px; margin: 16px auto; border-radius: 12px; border: 4px solid var(--game-accent);" alt="Pairing QR"/>` : ''}
        <div style="font-size: 14px; font-weight: 700; color: var(--game-accent); margin-top: 10px; animation: pulse 1.5s infinite;">
          ${statusText}
        </div>
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
}

if (typeof window !== 'undefined') {
  window.FrameworkUI = new UIComponents();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkUI;
}
