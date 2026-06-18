'use strict';

/**
 * Pre-built screen layout templates for TV and Mobile.
 * Minimizes HTML boilerplates in game extensions.
 */
class GameTemplates {
  /**
   * Inject Mobile Lobby shell
   */
  renderMobileLobby(container, { gameTitle, subtitle, onStart, lobbyOptionsHtml }) {
    container.innerHTML = `
      <div style="padding: 20px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between;">
        <div style="text-align: center; margin-top: 16px;">
          <h1 style="font-size: 28px; font-weight: 900; color: var(--game-accent); margin-bottom: 4px;">${gameTitle}</h1>
          <p style="font-size: 13px; color: var(--game-muted);">${subtitle}</p>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; margin: 20px 0;">
          ${lobbyOptionsHtml || `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
              <div style="font-size: 14px; font-weight: 700; color: var(--game-text);">Controller Connected</div>
              <div style="font-size: 12px; color: var(--game-muted); margin-top: 4px;">Waiting for host to start...</div>
            </div>
          `}
        </div>

        <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="fw-lobby-start" style="width: 100%;">${onStart ? 'START GAME' : 'WAITING FOR HOST'}</button>
        </div>
      </div>
    `;

    const startBtn = container.querySelector('#fw-lobby-start');
    if (onStart && startBtn) {
      startBtn.onclick = onStart;
    } else if (startBtn) {
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
    }
  }

  /**
   * Inject Mobile Sensor Calibration / Stance screen
   */
  renderMobileCalibration(container, { title, instructions, onCalibrate }) {
    container.innerHTML = `
      <div style="padding: 24px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between; text-align: center;">
        <div style="margin-top: 24px;">
          <h2 style="font-size: 24px; font-weight: 900; color: var(--game-accent); margin-bottom: 8px;">${title || 'Stance Lock'}</h2>
          <p style="font-size: 14px; color: var(--game-muted); line-height: 1.5;">${instructions || 'Hold the device in your starting position and lock orientation.'}</p>
        </div>

        <div style="margin: 40px auto; width: 140px; height: 140px; border-radius: 50%; border: 3px dashed var(--game-accent); display: flex; align-items: center; justify-content: center; animation: spin 20s linear infinite;">
          <div style="font-size: 36px;">📱</div>
        </div>

        <div style="margin-bottom: 24px;">
          <button class="btn btn-primary" id="fw-calibrate-btn" style="width: 100%; font-size: 16px; padding: 14px;">SET MY POSITION</button>
        </div>
      </div>
    `;

    const calBtn = container.querySelector('#fw-calibrate-btn');
    if (calBtn) {
      calBtn.onclick = onCalibrate;
    }
  }

  /**
   * Inject Mobile Active Play screen shell (HUD elements, active buttons)
   */
  renderMobileControllerHUD(container, { gameTitle, primaryStatLabel, secondaryStatLabel, customControlsHtml }) {
    container.innerHTML = `
      <div style="padding: 16px; display: flex; flex-direction: column; height: 100dvh; justify-content: space-between;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
          <div style="font-size: 16px; font-weight: 800; color: var(--game-accent);">${gameTitle}</div>
          <div style="display: flex; gap: 8px; font-size: 11px; align-items: center; background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 20px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--game-success);"></span>
            CONNECTED
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin: 16px 0;">
          <div class="score-card" style="flex: 1; padding: 10px;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--game-muted);">${primaryStatLabel || 'Score'}</div>
            <div id="fw-hud-primary" class="score-num" style="font-size: 24px;">0</div>
          </div>
          <div class="score-card" style="flex: 1; padding: 10px;">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--game-muted);">${secondaryStatLabel || 'Details'}</div>
            <div id="fw-hud-secondary" class="score-num" style="font-size: 24px; color: var(--game-text);">0</div>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px;">
          ${customControlsHtml || `
            <div style="text-align: center; color: var(--game-muted); font-size: 14px;">
              Perform action on controller or tilt to play!
            </div>
          `}
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button class="btn btn-secondary" id="fw-ctrl-recal">RE-SET STANCE</button>
        </div>
      </div>
    `;
  }

  /**
   * Inject TV Gameplay overlay HUD (top status, bottom feed)
   */
  renderTVHUD(container, { gameTitle, primaryLabel, secondaryLabel }) {
    container.innerHTML = `
      <div style="position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 32px; z-index: 10;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div style="background: rgba(10, 20, 30, 0.85); border: 2.5px solid var(--game-accent); border-radius: 16px; padding: 16px 24px; pointer-events: auto; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: var(--game-muted); text-transform: uppercase; margin-bottom: 4px;">
              ${gameTitle}
            </div>
            <div style="display: flex; gap: 24px; align-items: center;">
              <div>
                <span style="font-size: 13px; color: var(--game-muted); text-transform: uppercase;">${primaryLabel || 'Points'}</span>
                <div id="fw-tv-primary" style="font-size: 36px; font-weight: 900; color: var(--game-accent); line-height: 1;">0</div>
              </div>
              <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.15);"></div>
              <div>
                <span style="font-size: 13px; color: var(--game-muted); text-transform: uppercase;">${secondaryLabel || 'Record'}</span>
                <div id="fw-tv-secondary" style="font-size: 36px; font-weight: 900; color: var(--game-text); line-height: 1;">0</div>
              </div>
            </div>
          </div>

          <div style="background: rgba(10, 20, 30, 0.85); border: 1.5px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 10px 16px; pointer-events: auto; backdrop-filter: blur(8px); font-size: 14px; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--game-success); animation: flash 1s infinite alternate;"></span>
            <span id="fw-tv-status">Active Session</span>
          </div>
        </div>

        <div style="width: 100%; max-width: 450px; background: rgba(10, 20, 30, 0.85); border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.1); padding: 16px; pointer-events: auto; backdrop-filter: blur(8px); display: flex; flex-direction: column; gap: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="font-size: 11px; font-weight: 800; color: var(--game-muted); text-transform: uppercase; letter-spacing: 0.5px;">Live Feed</div>
          <div id="fw-tv-feed" style="font-size: 14px; font-weight: 700; color: var(--game-text); height: 40px; display: flex; align-items: center;">
            Waiting for first play...
          </div>
        </div>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkTemplates = new GameTemplates();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkTemplates;
}
