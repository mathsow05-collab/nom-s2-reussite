// Test de bout en bout de l'API — à lancer pendant que le serveur tourne :
//   npm run smoke
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

(async () => {
  console.log(`Smoke test contre ${BASE}\n`);

  const health = await req('GET', '/api/health');
  check('API en ligne', health.status === 200 && health.data.ok);

  const aLogin = await req('POST', '/api/admin/login', {
    body: { username: envOr('ADMIN1_USERNAME', 'admin'), password: envOr('ADMIN1_PASSWORD', 'Admin#S2-2026') },
  });
  check('Connexion admin', aLogin.status === 200 && !!aLogin.data.token);
  const at = aLogin.data.token;

  const stats = await req('GET', '/api/admin/stats', { token: at });
  check('Stats admin', stats.status === 200 && stats.data.totalEleves >= 3);

  const eleves = await req('GET', '/api/admin/eleves', { token: at });
  check('Liste des élèves', eleves.status === 200 && eleves.data.length > 0);
  const cible = eleves.data[0];

  const l1 = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Connexion élève (appareil A)', l1.status === 200 && !!l1.data.token);

  const l2 = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Connexion élève (appareil B)', l2.status === 200 && !!l2.data.token);

  const meA = await req('GET', '/api/eleve/me', { token: l1.data.token });
  check('Session unique : l’appareil A est rejeté', meA.status === 401 && meA.data.code === 'SESSION_PERDUE', `status=${meA.status}`);

  const meB = await req('GET', '/api/eleve/me', { token: l2.data.token });
  check('L’appareil B reste connecté', meB.status === 200);

  const cours = await req('GET', '/api/eleve/cours', { token: l2.data.token });
  check('Catalogue de cours', cours.status === 200 && cours.data.length > 0, `${cours.data?.length ?? 0} cours`);

  const pdfCours = cours.data.find((c) => c.has_pdf);
  if (pdfCours) {
    const r = await fetch(`${BASE}/api/eleve/cours/${pdfCours.id}/pdf?token=${encodeURIComponent(l2.data.token)}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    const head = String.fromCharCode(...bytes.slice(0, 5));
    check('Lecture PDF authentifiée', r.status === 200 && head.startsWith('%PDF'));
    const rNoAuth = await fetch(`${BASE}/api/eleve/cours/${pdfCours.id}/pdf`);
    check('PDF refusé sans session valide', rNoAuth.status === 401);
  }

  const rev = await req('POST', `/api/admin/eleves/${cible.id}/revoquer`, { token: at });
  check('Kill switch admin (révocation)', rev.status === 200);

  const meB2 = await req('GET', '/api/eleve/me', { token: l2.data.token });
  check('Session de l’appareil B invalidée après révocation', meB2.status === 401);

  const l3 = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Connexion refusée pour un ID révoqué', l3.status === 403 && l3.data.code === 'REVOQUE');

  const react = await req('POST', `/api/admin/eleves/${cible.id}/reactiver`, { token: at });
  const l4 = await req('POST', '/api/eleve/login', { body: { eleve_id: cible.eleve_id } });
  check('Réactivation puis reconnexion OK', react.status === 200 && l4.status === 200);

  const metiers = await req('GET', '/api/eleve/metiers', { token: l4.data.token });
  check('Catalogue métiers', metiers.status === 200 && metiers.data.length > 0);

  console.log(`\nRésultat : ${pass} réussis, ${fail} échoués.`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Smoke test interrompu :', e);
  process.exit(1);
});
