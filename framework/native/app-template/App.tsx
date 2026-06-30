import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, SafeAreaView,
  Animated, Easing, BackHandler, AppState,
} from 'react-native';
import WebView from 'react-native-webview';
import nodejs from 'nodejs-mobile-react-native';
import { NetworkInfo } from 'react-native-network-info';
import { useSensorBridge } from './useSensorBridge';

// ── EDIT per game ────────────────────────────────────────────────────────────
const GAME_ID = 'starter';                 // TEMPLATE default — `npm run publish <id>` overwrites this per game
const BRAND = { name: 'Starter Game', accent: '#00d2ff', bg: '#060a14', tagline: 'TV GAME' };
const USE_MOTION = false;                   // true for tilt/swing games
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic native shell. Boots the embedded Node server (framework + this game),
 * shows a splash until paired/timeout, then loads the game's lobby in a WebView.
 * Handles: LAN IP discovery, room-code bridge, hardware back, app lifecycle,
 * and (optionally) the sensor bridge — so games never touch native code.
 *
 * Packaging (see framework/native/README.md): bundle framework/core, the chosen
 * game folder, and a server entry into nodejs-assets/nodejs-project/.
 */
export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [serverReady, setServerReady] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [localIP, setLocalIP] = useState('…');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const screenGoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Animated splash (CricSwing-style): glow bloom, logo spring, text rise, progress bar.
  const glow = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const textY = useRef(new Animated.Value(18)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const [slowMsg, setSlowMsg] = useState(false);

  useEffect(() => {
    nodejs.start('server.js');

    const listener = nodejs.channel.addListener('message', (msg: string) => {
      if (msg === 'server-ready') { setServerReady(true); return; }
      try {
        const ev = JSON.parse(msg);
        if (ev.type === 'room-created') {
          if (screenGoneTimer.current) { clearTimeout(screenGoneTimer.current); screenGoneTimer.current = null; }
          setRoomCode(ev.code);
        }
        if (ev.type === 'screen-disconnected') {
          // Debounce 20s so a brief TV blip doesn't yank the user to re-pair.
          if (screenGoneTimer.current) clearTimeout(screenGoneTimer.current);
          screenGoneTimer.current = setTimeout(() => { setRoomCode(null); screenGoneTimer.current = null; }, 20000);
        }
      } catch {}
    });

    let tries = 0;
    const ipPoll = setInterval(() => {
      NetworkInfo.getIPV4Address().then(ip => { if (ip) { setLocalIP(ip); clearInterval(ipPoll); } });
      if (++tries > 10) clearInterval(ipPoll);
    }, 1000);
    NetworkInfo.getIPV4Address().then(ip => { if (ip) { setLocalIP(ip); clearInterval(ipPoll); } });

    const fallback = setTimeout(() => setServerReady(true), 3500);
    return () => { listener.remove(); clearInterval(ipPoll); clearTimeout(fallback); if (screenGoneTimer.current) clearTimeout(screenGoneTimer.current); };
  }, []);

  // Splash entrance animation (runs once on mount).
  useEffect(() => {
    Animated.parallel([
      Animated.timing(glow, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 450, delay: 250, useNativeDriver: true }),
      Animated.timing(textY, { toValue: 0, duration: 450, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(barProgress, { toValue: 1, duration: 2800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    const slow = setTimeout(() => setSlowMsg(true), 3000);
    return () => clearTimeout(slow);
  }, []);

  // Fade the splash once server + webview are ready (or after a short hold).
  useEffect(() => {
    if (!serverReady || !webviewReady) return;
    const t = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, roomCode ? 150 : 1200);
    return () => clearTimeout(t);
  }, [serverReady, webviewReady, roomCode]);

  // Hardware back → step back through WebView screens; exit at root.
  useEffect(() => {
    const onBack = () => {
      if (!webviewReady) return false;
      webviewRef.current?.injectJavaScript('window.handleBackPress && window.handleBackPress(); true;');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    const appSub = AppState.addEventListener('change', (next) => {
      const ev = next === 'active' ? '__appForeground' : '__appBackground';
      try { webviewRef.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('${ev}'));true;`); } catch {}
    });
    return () => { sub.remove(); appSub.remove(); };
  }, [webviewReady]);

  useSensorBridge(webviewRef, USE_MOTION && serverReady);

  const webviewUrl = `http://localhost:3000/games/${GAME_ID}/lobby.html`;
  const ipReady = localIP !== '…';
  const injectedJs =
    `document.documentElement.style.cssText+='opacity:0;transition:opacity 0.42s ease;';window.__isNativeApp=true;` +
    `${ipReady ? `window.__lanIp=${JSON.stringify(localIP)};` : ''}` +
    `window.__roomCode=${roomCode ? JSON.stringify(roomCode) : 'null'};true;`;

  // Re-inject LAN IP + room code into the WebView when they resolve/change.
  useEffect(() => {
    if (!webviewRef.current || !ipReady) return;
    try { webviewRef.current.injectJavaScript(`window.__lanIp=${JSON.stringify(localIP)};true;`); } catch {}
  }, [localIP, ipReady]);
  useEffect(() => {
    if (!webviewRef.current) return;
    const js = `window.__roomCode=${roomCode ? JSON.stringify(roomCode) : 'null'};` +
               `window.dispatchEvent(new CustomEvent('__roomCodeChanged'));true;`;
    try { webviewRef.current.injectJavaScript(js); } catch {}
  }, [roomCode]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: BRAND.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.bg} />
      {serverReady && (
        <WebView
          ref={webviewRef}
          source={{ uri: webviewUrl }}
          key={webviewUrl}
          style={[styles.webview, { backgroundColor: BRAND.bg }]}
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScriptBeforeContentLoaded={injectedJs}
          originWhitelist={['*']}
          mixedContentMode="always"
          onMessage={(e) => { if (e.nativeEvent.data === 'back-at-root') BackHandler.exitApp(); }}
          onLoadEnd={() => {
            setWebviewReady(true);
            webviewRef.current?.injectJavaScript('document.documentElement.style.opacity="1";true;');
          }}
        />
      )}
      {splashVisible && (
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.splash, { backgroundColor: BRAND.bg, opacity: splashOpacity }]}>
          {/* radial glow bloom behind the mark */}
          <Animated.View style={[styles.glow, {
            backgroundColor: BRAND.accent,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }]} />
          {/* logo disc (initial of brand) — swap for an <Image> per game if desired */}
          <Animated.View style={[styles.logo, { borderColor: BRAND.accent, transform: [{ scale: logoScale }] }]}>
            <Text style={[styles.logoChar, { color: BRAND.accent }]}>{(BRAND.name || '?').charAt(0)}</Text>
          </Animated.View>
          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }], alignItems: 'center' }}>
            <Text style={[styles.brand, { color: '#fff' }]}>{BRAND.name}</Text>
            {!!BRAND.tagline && <Text style={[styles.tagline, { color: BRAND.accent }]}>{BRAND.tagline}</Text>}
          </Animated.View>
          {/* progress bar */}
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, {
              backgroundColor: BRAND.accent,
              width: barProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
          {slowMsg && !webviewReady && <Text style={styles.slowText}>Warming up…</Text>}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webview: { flex: 1 },
  splash: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
  logo: { width: 96, height: 96, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  logoChar: { fontSize: 46, fontWeight: '900' },
  brand: { fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  tagline: { fontSize: 11, fontWeight: '700', letterSpacing: 3, marginTop: 4, opacity: 0.8 },
  barTrack: { width: 160, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, marginTop: 28, overflow: 'hidden' },
  barFill: { height: 2 },
  slowText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },
});
