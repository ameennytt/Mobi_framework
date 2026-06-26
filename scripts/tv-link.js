#!/usr/bin/env node
'use strict';

/**
 * Print the TV URL for a phone-hosted game (APK = phone runs the server).
 *
 *   node scripts/tv-link.js [gameId]      # default gameId: soccer
 *
 * Does three things:
 *   1. confirms a phone is attached over adb,
 *   2. reads the phone's current WiFi IP (it changes — pairing is by code, not IP),
 *   3. sets up a USB tunnel (adb forward) as an IP-proof fallback,
 * then prints both TV URLs you can open in a browser.
 */
const { execSync } = require('child_process');

const gameId = (process.argv[2] || 'soccer').trim();
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();

function main() {
  // 1. device attached?
  let devices;
  try { devices = sh('adb devices'); }
  catch (_) { console.error('adb not found. Install Android platform-tools / add to PATH.'); process.exit(1); }
  const online = devices.split('\n').slice(1).filter(l => /\tdevice$/.test(l));
  if (!online.length) { console.error('No phone attached. Plug in USB + enable USB debugging, then: adb devices'); process.exit(1); }

  // 2. phone WiFi IP (may be empty if WiFi off)
  let ip = '';
  try {
    const out = sh('adb shell ip -f inet addr show wlan0');
    const m = out.match(/inet (\d+\.\d+\.\d+\.\d+)/);
    if (m) ip = m[1];
  } catch (_) {}

  // 3. USB tunnel (PC localhost:3001 -> phone:3000) — survives IP changes
  let usbOk = false;
  try { sh('adb forward tcp:3001 tcp:3000'); usbOk = true; } catch (_) {}

  console.log(`\n  Game: ${gameId}`);
  console.log(`  ─────────────────────────────────────────`);
  if (ip) console.log(`  TV via WiFi : http://${ip}:3000/games/${gameId}/screen.html`);
  else    console.log(`  TV via WiFi : (phone WiFi IP not found — turn WiFi on)`);
  if (usbOk) console.log(`  TV via USB  : http://localhost:3001/games/${gameId}/screen.html  (IP-proof)`);
  console.log(`  Phone       : opens the APK — lobby auto-loads`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Note: phone IP changes on reconnect; the USB link does not.\n`);
}

main();
