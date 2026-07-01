'use strict';

/**
 * FrameworkMotionInput — OPTIONAL motion/swing input extension (STUB / contract).
 *
 * DEFAULT INPUT IS BUTTONS. This file is NOT loaded unless a game opts in with
 * `input: 'motion'` in game-config.json (the controller then adds this script and
 * calls FrameworkMotionInput.mount). Button games never touch it.
 *
 * This is a SCAFFOLD: the screens + sensor wiring are stubbed so another developer
 * (e.g. the Baseball swing/ML work) can fill them in without re-architecting. It
 * reuses what already exists: FrameworkMotion (sensor permission/stream) and
 * FrameworkTemplates.renderMobileCalibration (the stance/calibration shell).
 *
 * Contract (see framework/EXTENSIONS.md → ML/Motion):
 *   mount(opts)                 wire on the controller; opts:{ onSwing, onStanceLocked }
 *   requestPermissionUI()       show the "enable sensors" screen → resolves bool
 *   stanceLockUI(opts)          show the stance-calibration screen → resolves on lock
 *   start() / stop()            begin / end the motion stream
 *
 * window.FrameworkMotionInput.
 */
window.FrameworkMotionInput = (function () {
  let onSwing = null, onStanceLocked = null, streaming = false;

  function mount(opts = {}) {
    onSwing = opts.onSwing || null;
    onStanceLocked = opts.onStanceLocked || null;
    return api;
  }

  // Show a sensor-permission explainer, then ask the OS. Reuses FrameworkMotion.
  async function requestPermissionUI() {
    if (!window.FrameworkMotion) return false;
    try {
      const ok = await window.FrameworkMotion.requestPermission();
      return !!ok;
    } catch (_) { return false; }
  }

  // Camera-orientation hint before a motion match (rear camera → TV).
  function cameraHintUI(opts = {}) {
    return new Promise((resolve) => {
      const T = window.FrameworkTemplates;
      if (T && T.renderMobileCameraHint) { T.renderMobileCameraHint({ title: opts.title, body: opts.body, onAck: () => resolve(true) }); }
      else resolve(true);
    });
  }

  // Stance/calibration screen. Prefers the richer renderMobileStance (hold bar + LOCK),
  // falls back to renderMobileCalibration. The scaffold auto-fills the hold bar; the
  // real motion build drives updateMobileStance(pct, ready) from sensor steadiness.
  function stanceLockUI(opts = {}) {
    return new Promise((resolve) => {
      const T = window.FrameworkTemplates;
      if (T && T.renderMobileStance) {
        T.renderMobileStance({
          title: opts.title || 'Hold your stance', art: opts.art,
          onLock: () => { if (onStanceLocked) onStanceLocked(); resolve(true); },
        });
        // Scaffold: ramp the hold bar to "ready" so the LOCK button enables (the real
        // build replaces this with sensor-steadiness updates).
        let p = 0; const t = setInterval(() => { p += 20; T.updateMobileStance(p, p >= 100); if (p >= 100) clearInterval(t); }, 250);
      } else if (T && T.renderMobileCalibration) {
        T.renderMobileCalibration(opts.container || document.body, {
          title: opts.title || 'Get into your stance',
          instructions: opts.instructions || 'Hold the phone like a bat and tap to lock.',
          onCalibrate: () => { if (onStanceLocked) onStanceLocked(); resolve(true); },
        });
      } else { resolve(false); }
    });
  }

  // Begin streaming motion frames. TODO(dev): peak-detect a swing here and fire
  // onSwing({ dir, power, timing }). Left as a stub on purpose — buttons are default.
  function start() {
    if (streaming || !window.FrameworkMotion) return;
    streaming = true;
    try { window.FrameworkMotion.start(); } catch (_) {}
    // TODO: subscribe to motion frames (window '__csMotionBatch' / FrameworkMotion API)
    // and translate a detected swing into onSwing(...). Not implemented in the scaffold.
  }
  function stop() {
    streaming = false;
    try { window.FrameworkMotion && window.FrameworkMotion.stop && window.FrameworkMotion.stop(); } catch (_) {}
  }

  const api = { mount, requestPermissionUI, cameraHintUI, stanceLockUI, start, stop, isStreaming: () => streaming };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = window.FrameworkMotionInput; }
