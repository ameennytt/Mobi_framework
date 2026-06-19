import { useEffect, RefObject } from 'react';
import WebView from 'react-native-webview';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors';

const UPDATE_MS = 16; // ~60 fps

/**
 * Streams device motion into the WebView as window.__nativeMotion / __nativeOrient
 * events — exactly what framework/inputs/motion-input.js listens for in native mode.
 *
 * Orientation is derived from the accelerometer gravity vector (drift-free):
 *   beta  (front-back) ≈ 90° upright  → atan2(y, z)
 *   gamma (left-right) ≈  0° upright  → atan2(x, y)
 * The gyroscope (rad/s) is forwarded as an extra feature channel for games that
 * want the rotational signature of a swing (button-only games can ignore it).
 *
 * Only needed for games that use motion. Button-only games can skip wiring this.
 */
export function useSensorBridge(
  webviewRef: RefObject<WebView | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    setUpdateIntervalForType(SensorTypes.accelerometer, UPDATE_MS);
    setUpdateIntervalForType(SensorTypes.gyroscope, UPDATE_MS);

    const R2D = 57.2958;
    let gx = 0, gy = 0, gz = 0;
    const gyroSub = gyroscope.subscribe(({ x, y, z }) => { gx = x; gy = y; gz = z; });

    const accelSub = accelerometer.subscribe(({ x, y, z }) => {
      const beta = Math.atan2(y, z) * R2D;
      const gamma = Math.atan2(x, y) * R2D;
      const js = `(function(){
        window.__nativeAccel={x:${x.toFixed(4)},y:${y.toFixed(4)},z:${z.toFixed(4)}};
        window.__nativeGyro={x:${gx.toFixed(4)},y:${gy.toFixed(4)},z:${gz.toFixed(4)}};
        window.__nativeOrient={beta:${beta.toFixed(2)},gamma:${gamma.toFixed(2)},alpha:0};
        window.dispatchEvent(new CustomEvent('__nativeMotion'));
        window.dispatchEvent(new CustomEvent('__nativeOrient'));
      })();true;`;
      webviewRef.current?.injectJavaScript(js);
    });

    return () => { accelSub.unsubscribe(); gyroSub.unsubscribe(); };
  }, [active, webviewRef]);
}
