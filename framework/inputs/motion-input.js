'use strict';

/**
 * Generic Motion and Orientation Input Manager.
 * Unifies browser APIs and React Native __nativeMotion/__nativeOrient bridge events.
 */
class MotionInput {
  constructor() {
    this.active = false;
    this.calibrated = false;
    this.calibOrient = { beta: 90, gamma: 0, alpha: 0 };
    
    this.currentOrient = { beta: 90, gamma: 0, alpha: 0 };
    this.relativeOrient = { lr: 0, fb: 0 };
    
    this.acc = { x: 0, y: 0, z: 0 };
    this.accG = { x: 0, y: 0, z: 0 };
    this.gyro = { alpha: 0, beta: 0, gamma: 0 }; // deg/s
    this.mag = 0; // linear acceleration magnitude

    this.motionCallbacks = new Set();
    this.orientationCallbacks = new Set();

    // Bound handlers
    this.handleBrowserMotion = this.handleBrowserMotion.bind(this);
    this.handleBrowserOrientation = this.handleBrowserOrientation.bind(this);
    this.handleNativeMotion = this.handleNativeMotion.bind(this);
    this.handleNativeOrient = this.handleNativeOrient.bind(this);
  }

  /**
   * Request motion & orientation permissions if required by the browser.
   */
  async requestPermission() {
    let motionGranted = false;
    let orientGranted = false;

    // Handle iOS/Safari permission request style
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const p = await DeviceMotionEvent.requestPermission();
        motionGranted = (p === 'granted');
      } catch (e) {
        console.warn('[MotionInput] DeviceMotion permission error:', e);
      }
    } else {
      motionGranted = true;
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        orientGranted = (p === 'granted');
      } catch (e) {
        console.warn('[MotionInput] DeviceOrientation permission error:', e);
      }
    } else {
      orientGranted = true;
    }

    return motionGranted && orientGranted;
  }

  /**
   * Starts listening to sensor events.
   */
  start() {
    if (this.active) return;
    this.active = true;

    if (window.__isNativeApp) {
      window.addEventListener('__nativeMotion', this.handleNativeMotion);
      window.addEventListener('__nativeOrient', this.handleNativeOrient);
    } else {
      window.addEventListener('devicemotion', this.handleBrowserMotion);
      window.addEventListener('deviceorientation', this.handleBrowserOrientation);
    }
    console.log('[MotionInput] Started listening to sensors (Native App:', !!window.__isNativeApp, ')');
  }

  /**
   * Stops listening to sensor events.
   */
  stop() {
    if (!this.active) return;
    this.active = false;

    if (window.__isNativeApp) {
      window.removeEventListener('__nativeMotion', this.handleNativeMotion);
      window.removeEventListener('__nativeOrient', this.handleNativeOrient);
    } else {
      window.removeEventListener('devicemotion', this.handleBrowserMotion);
      window.removeEventListener('deviceorientation', this.handleBrowserOrientation);
    }
    console.log('[MotionInput] Stopped listening to sensors');
  }

  /**
   * Calibrates the center/stance using the current device orientation.
   */
  calibrate() {
    this.calibOrient = { ...this.currentOrient };
    this.calibrated = true;
    this.updateRelative();
    console.log('[MotionInput] Calibrated stance:', this.calibOrient);
  }

  /**
   * Reset calibration baseline.
   */
  resetCalibration() {
    this.calibOrient = { beta: 90, gamma: 0, alpha: 0 };
    this.calibrated = false;
    this.updateRelative();
  }

  subscribeMotion(cb) {
    this.motionCallbacks.add(cb);
    return () => this.motionCallbacks.delete(cb);
  }

  subscribeOrientation(cb) {
    this.orientationCallbacks.add(cb);
    return () => this.orientationCallbacks.delete(cb);
  }

  updateRelative() {
    const rawGamma = this.currentOrient.gamma;
    const rawBeta = this.currentOrient.beta;

    // Relative tilt calculations (matches original CricSwing math)
    const lr = this.calibrated ? (rawGamma - this.calibOrient.gamma) : rawGamma;
    const fb = this.calibrated ? (rawBeta - this.calibOrient.beta) : 0;

    this.relativeOrient = { lr, fb };
  }

  handleBrowserMotion(e) {
    const rawAcc = e.acceleration || {};
    const rawAccG = e.accelerationIncludingGravity || {};

    let rx = 0, ry = 0, rz = 0;
    if (rawAcc.x != null && (Math.abs(rawAcc.x) + Math.abs(rawAcc.y) + Math.abs(rawAcc.z)) > 0.01) {
      rx = rawAcc.x;
      ry = rawAcc.y;
      rz = rawAcc.z;
    } else {
      rx = rawAccG.x || 0;
      ry = rawAccG.y || 0;
      rz = rawAccG.z || 0;
    }

    this.acc = { x: rx, y: ry, z: rz };
    this.accG = { x: rawAccG.x || 0, y: rawAccG.y || 0, z: rawAccG.z || 0 };
    this.mag = Math.hypot(rx, ry, rz);

    const rr = e.rotationRate;
    if (rr) {
      // Browser DeviceMotionEvent.rotationRate is in deg/s
      this.gyro = {
        alpha: rr.alpha || 0,
        beta: rr.beta || 0,
        gamma: rr.gamma || 0
      };
    }

    this.emitMotion();
  }

  handleBrowserOrientation(e) {
    this.currentOrient = {
      beta: e.beta ?? 90,
      gamma: e.gamma ?? 0,
      alpha: e.alpha ?? 0
    };
    this.updateRelative();
    this.emitOrientation();
  }

  handleNativeMotion() {
    // React Native outputs acceleration in window.__nativeAccel
    const rawAccel = window.__nativeAccel || { x: 0, y: 0, z: 0 };
    this.acc = { ...rawAccel };
    this.accG = { ...rawAccel };
    this.mag = Math.hypot(this.acc.x, this.acc.y, this.acc.z);

    // Gyro velocity is in rad/s from native. Convert to deg/s.
    const rawGyro = window.__nativeGyro || { x: 0, y: 0, z: 0 };
    const RAD_TO_DEG = 57.2958;
    this.gyro = {
      beta: (rawGyro.x || 0) * RAD_TO_DEG,
      gamma: (rawGyro.y || 0) * RAD_TO_DEG,
      alpha: (rawGyro.z || 0) * RAD_TO_DEG
    };

    this.emitMotion();
  }

  handleNativeOrient() {
    const rawOrient = window.__nativeOrient || { beta: 90, gamma: 0, alpha: 0 };
    this.currentOrient = {
      beta: rawOrient.beta ?? 90,
      gamma: rawOrient.gamma ?? 0,
      alpha: rawOrient.alpha ?? 0
    };
    this.updateRelative();
    this.emitOrientation();
  }

  emitMotion() {
    const data = {
      acc: this.acc,
      accG: this.accG,
      gyro: this.gyro,
      mag: this.mag
    };
    this.motionCallbacks.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }

  emitOrientation() {
    const data = {
      raw: this.currentOrient,
      relative: this.relativeOrient,
      calibrated: this.calibrated
    };
    this.orientationCallbacks.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }
}

if (typeof window !== 'undefined') {
  window.FrameworkMotion = new MotionInput();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkMotion;
}
