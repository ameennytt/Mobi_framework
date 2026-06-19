// Generic rendezvous Worker — one per game, deployed to the game's own domain.
// Pairs a TV browser with a phone via a short code, then redirects the TV to the
// phone's LAN URL (the phone runs the embedded game server). After the redirect
// the cloud is out of the loop — all gameplay is local phone↔TV over Wi-Fi.
//
// Per-game setup:
//   1. Edit BRAND below (name shown on the landing page).
//   2. Set your domain in wrangler.toml (routes + name).
//   3. `wrangler deploy`
//   4. In the game's lobby.html set RENDEZVOUS_URL to this domain.
//
// Uses a Durable Object for strong consistency (sub-second pairing).

const BRAND = { name: 'Striker Duel', tagline: 'TV Game', emoji: '🎮' }; // EDIT per game

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1
const TTL_MS = 5 * 60 * 1000;
const PENDING = '__pending__';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function genCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c;
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...CORS, ...(init.headers || {}) },
  });
}

// ── Durable Object: one instance per pairing code, strongly consistent. ──
export class PairingSession {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();
    const data = await this.state.storage.get(['value', 'expires']);
    const expires = data.get('expires');
    let value = data.get('value');
    if (expires && now > expires) { value = null; await this.state.storage.deleteAll(); }

    if (url.pathname === '/init') {
      await this.state.storage.put({ value: PENDING, expires: now + TTL_MS });
      return json({ ok: true });
    }
    if (url.pathname === '/set' && request.method === 'POST') {
      if (!value) return json({ error: 'expired' }, { status: 404 });
      const body = await request.json().catch(() => ({}));
      const lanUrl = String(body.lanUrl || '').trim();
      // Only IPv4 — anything else (localhost, hostnames, IPv6) can't be reached
      // by the TV across the LAN. Also blocks open-redirect abuse.
      if (!/^http:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(lanUrl))
        return json({ error: 'bad_url' }, { status: 400 });
      await this.state.storage.put('value', lanUrl);
      return json({ ok: true });
    }
    if (url.pathname === '/get') {
      if (!value) return json({ status: 'expired' });
      if (value === PENDING) return json({ status: 'waiting' });
      return json({ status: 'paired', url: value });
    }
    return new Response('Not Found', { status: 404 });
  }
}

async function callDO(env, code, path, init = {}) {
  const id = env.PAIRS_DO.idFromName(code);
  const stub = env.PAIRS_DO.get(id);
  return stub.fetch('https://do.local' + path, init);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // GET /api/new — TV asks for a fresh code
    if (url.pathname === '/api/new') {
      const code = genCode();
      await callDO(env, code, '/init');
      return json({ code });
    }

    // POST /api/pair — phone submits { code, lanUrl }
    if (url.pathname === '/api/pair' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const code = String(body.code || '').toUpperCase().trim();
      const lanUrl = String(body.lanUrl || '').trim();
      if (!/^[A-Z0-9]{4}$/.test(code)) return json({ error: 'bad_code' }, { status: 400 });
      const r = await callDO(env, code, '/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lanUrl }),
      });
      return new Response(r.body, { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // GET /api/poll?code=XXXX — TV polls
    if (url.pathname === '/api/poll') {
      const code = String(url.searchParams.get('code') || '').toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) return json({ status: 'expired' });
      const r = await callDO(env, code, '/get');
      return new Response(r.body, { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(LANDING_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
};

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND.name} — Pair Your Phone & TV</title>
<style>
:root{--accent:#00d2ff;--bg:#060a14;--text:#eef3ff;--muted:#7a8aaa;--ok:#7edb7e;--err:#ff4d4d}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
  background:radial-gradient(ellipse at 30% 0%,#141d33 0%,#0a1424 35%,#060a14 100%);
  color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 20px}
.hero{text-align:center;max-width:880px;width:100%}
.emoji{font-size:64px}
.brand{font-size:clamp(44px,8vw,72px);font-weight:900;letter-spacing:2px;color:var(--accent);margin-top:8px}
.tag{font-size:14px;color:var(--muted);letter-spacing:4px;text-transform:uppercase;margin-top:8px}
.sub{font-size:16px;color:var(--muted);margin-top:14px;max-width:520px;margin-inline:auto;line-height:1.6}
.wifi-hint{max-width:560px;margin:18px auto 0;padding:14px 18px;background:rgba(0,210,255,.08);
  border:1.5px solid rgba(0,210,255,.35);border-radius:14px;font-size:14px;color:#aee9ff;line-height:1.5}
.code-card{margin:28px auto 0;max-width:560px;width:100%;background:rgba(255,255,255,.04);
  border:2px solid rgba(0,210,255,.35);border-radius:24px;padding:30px 24px}
.code-lbl{font-size:11px;color:var(--accent);letter-spacing:5px;text-transform:uppercase;font-weight:700}
.code-display{font-size:clamp(56px,11vw,104px);font-weight:900;letter-spacing:8px;line-height:1;margin-top:16px;
  font-family:'SF Mono',Consolas,monospace;color:var(--accent)}
.code-display.loading{animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
.status-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;font-size:14px;color:var(--muted)}
.dot{width:10px;height:10px;border-radius:50%;background:var(--accent);animation:dotPulse 1.4s ease-in-out infinite}
@keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.5}}
.status-row.err .dot{background:var(--err);animation:none}
.paired{position:fixed;inset:0;background:rgba(6,10,20,.97);display:none;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:20px}
.paired.show{display:flex}
.paired-icon{font-size:80px}.paired-title{font-size:34px;font-weight:900;color:var(--ok);margin-top:12px}
.paired-sub{font-size:15px;color:var(--muted);margin-top:8px}
</style>
</head>
<body>
  <main class="hero">
    <div class="emoji">${BRAND.emoji}</div>
    <h1 class="brand">${BRAND.name}</h1>
    <div class="tag">${BRAND.tagline}</div>
    <p class="sub">Enter the code below in the ${BRAND.name} app on your phone to start playing.</p>
    <div class="wifi-hint">📶 <b>Phone &amp; TV must be on the SAME Wi-Fi.</b> Cellular won't work — the TV connects directly to your phone.</div>
    <section class="code-card" aria-live="polite">
      <div class="code-lbl">Enter on Phone</div>
      <div class="code-display loading" id="code">————</div>
      <div class="status-row" id="status"><div class="dot"></div><span id="status-text">Waiting for phone…</span></div>
    </section>
  </main>
  <div class="paired" id="paired">
    <div class="paired-icon">✅</div>
    <div class="paired-title">Phone Paired!</div>
    <div class="paired-sub">Connecting to your TV…</div>
  </div>
<script>
(async function(){
  const codeEl=document.getElementById('code');
  const statusEl=document.getElementById('status');
  const statusText=document.getElementById('status-text');
  let code=null,pollTimer=null;
  async function fetchNew(){
    try{
      const r=await fetch('/api/new',{cache:'no-store'});const j=await r.json();
      if(j.code){code=j.code;codeEl.textContent=code;codeEl.classList.remove('loading');startPolling();}
    }catch(e){statusText.textContent='Connection error · retrying…';setTimeout(fetchNew,3000);}
  }
  function startPolling(){
    clearInterval(pollTimer);
    pollTimer=setInterval(async()=>{
      try{
        const r=await fetch('/api/poll?code='+encodeURIComponent(code),{cache:'no-store'});const j=await r.json();
        if(j.status==='paired'&&j.url){clearInterval(pollTimer);document.getElementById('paired').classList.add('show');setTimeout(()=>{window.location.href=j.url;},700);}
        else if(j.status==='expired'){clearInterval(pollTimer);statusEl.classList.add('err');statusText.textContent='Code expired · refreshing…';codeEl.classList.add('loading');codeEl.textContent='————';setTimeout(fetchNew,1000);}
      }catch(e){}
    },1500);
  }
  fetchNew();
})();
</script>
</body>
</html>`;
