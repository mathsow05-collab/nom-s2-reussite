// Vérifie la déconnexion TEMPS RÉEL via SSE (le cœur du système de session unique) :
//   1. l'appareil A reçoit l'événement "session_remplacee" quand l'élève se connecte sur B
//   2. l'appareil A reçoit l'événement "revoque" quand l'actionne le kill switch admin
// À lancer pendant que le serveur tourne : npm run test:sse
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function envOr(key, def) {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = txt.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
    if (m) return m[1].trim();
  } catch {
    /* pas de .env */
  }
  return def;
}

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

async function req(method, p, { body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* corps non JSON */
  }
  return { status: res.status, data };
}

// Lit un flux SSE pendant `ms` millisecondes et retourne tout ce qui a été reçu.
async function captureStream(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  let data = '';
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      data += dec.decode(value, { stream: true });
    }
  } catch {
    /* flux interrompu volontairement */
  }
  clearTimeout(timer);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`Test SSE temps réel contre ${BASE}\n`);

  const aLogin = await req('POST', '/api/admin/login', {
    body: { username: envOr('ADMIN1_USERNAME', 'admin'), password: envOr('ADMIN1_PASSWORD', 'Admin#S2-2026') },
  });
  if (aLogin.status !== 200) {
    console.error('Connexion admin impossible, test abandonné.');
    process.exit(1);
  }
  const at = aLogin.data.token;
  const cible = (await req('GET', '/api/admin/eleves', { token: at })).data[0];

  const lA = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Appareil A connecté', lA.status === 200);

  // A ouvre son canal temps réel (comme le fait l'app élève)
  const streamP = captureStream(`${BASE}/api/eleve/stream?token=${encodeURIComponent(lA.data.token)}`, 9000);
  await sleep(700);

  const lB = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Appareil B se connecte (écrase la session A)', lB.status === 200);
  await sleep(700);

  const rev = await req('POST', `/api/admin/eleves/${cible.id}/revoquer`, { token: at });
  check('Kill switch actionné par l’admin', rev.status === 200);

  const captured = await streamP;
  check('L’appareil A a reçu « session_remplacee » en temps réel', captured.includes('session_remplacee'));
  check('L’appareil A a reçu « revoque » en temps réel', captured.includes('revoque'));

  // Nettoyage : on réactive l'élève de démo
  await req('POST', `/api/admin/eleves/${cible.id}/reactiver`, { token: at });

  console.log(`\nRésultat : ${pass} réussis, ${fail} échoués.`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Test SSE interrompu :', e);
  process.exit(1);
});
