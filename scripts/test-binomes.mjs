/* Test e2e des fonctionnalités binômes : chat, partage, devoirs concertés,
   accord de participation, classement, duels. Lance le serveur sur :3112
   avec DATA_DIR/UPLOADS_DIR temporaires avant d'exécuter. */
const B = 'http://localhost:3112/api';
const j = async (pr) => {
  const r = await pr;
  return { status: r.status, body: await r.json().catch(() => null) };
};
const get = (p, t) => j(fetch(B + p, { headers: t ? { Authorization: `Bearer ${t}` } : {} }));
const post = (p, b, t) =>
  j(
    fetch(B + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: JSON.stringify(b),
    })
  );

const ok = (cond, label) => console.log((cond ? 'PASS' : 'FAIL') + ' - ' + label);

const adm = await post('/admin/login', { username: 'abou', password: 'tounkara04' });
ok(adm.status === 200, 'login admin');
const AT = adm.body.token;
const e1 = await post('/admin/eleves', { prenom: 'Awa', nom: 'Diop', classe: 'Terminale S2' }, AT);
const e2 = await post('/admin/eleves', { prenom: 'Ibra', nom: 'Fall', classe: 'Terminale S2' }, AT);
ok(e1.status === 201 && e2.status === 201, 'création 2 élèves');

const l1 = await post('/eleve/login', { eleve_id: e1.body.eleve_id });
const l2 = await post('/eleve/login', { eleve_id: e2.body.eleve_id });
const T1 = l1.body.token;
const T2 = l2.body.token;
ok(l1.status === 200 && l2.status === 200, 'logins élèves');
const id1 = l1.body.eleve.id;
const id2 = l2.body.eleve.id;

const inv = await post('/eleve/chat/inviter', { vers_id: id2, type: 'binome' }, T1);
ok(inv.status === 200, 'invitation envoyée');
const h2 = await get('/eleve/chat/home', T2);
const invId = h2.body.invitations[0]?.id;
ok(!!invId, 'invitation visible chez Ibra');
const acc = await post(`/eleve/chat/invitation/${invId}/accepter`, { type: 'binome' }, T2);
ok(acc.status === 200, 'acceptation binôme');
const h1 = await get('/eleve/chat/home', T1);
ok(h1.body.amis.length === 1 && h1.body.amis[0].type === 'binome', 'lien binôme actif');

await post('/eleve/chat/messages', { vers_id: id2, texte: 'Salut, on révise ?' }, T1);
const part = await post(
  '/eleve/chat/messages',
  { vers_id: id2, type: 'partage', texte: JSON.stringify({ kind: 'cours', id: 1, titre: 'Test', sub: 'Maths' }) },
  T1
);
ok(part.status === 200, 'message partage accepté');
const msgs = await get(`/eleve/chat/messages/${id1}?since=0`, T2);
ok(Array.isArray(msgs.body) && msgs.body.length === 2 && msgs.body[1].type === 'partage', 'messages reçus (texte + partage)');

const dev = await post(
  '/admin/devoirs-binomes',
  {
    titre: 'Devoir test',
    description: 'Concertez-vous',
    filiere: 'S2',
    deadline: null,
    questions: [
      { question: 'Q1 : 2+2 ?', choix: ['3', '4', '5'], bonne: 1 },
      { question: 'Q2 : capitale du Sénégal ?', choix: ['Thiès', 'Dakar'], bonne: 1 },
    ],
  },
  AT
);
ok(dev.status === 201, 'devoir créé');
const did = dev.body.id;
const dv1 = await get('/eleve/devoir/' + did, T1);
ok(dv1.status === 200 && dv1.body.questions.length === 2 && dv1.body.partenaire.id === id2, 'devoir visible + partenaire');
ok(dv1.body.participation === null, 'pas encore de participation');
const q1 = dv1.body.questions[0].id;
const q2 = dv1.body.questions[1].id;

const gated = await post(`/eleve/devoir/${did}/question/${q1}`, { choix: 0 }, T1);
ok(gated.status === 400, 'réponses bloquées tant que le devoir n’est pas accepté');
const prop = await post(`/eleve/devoir/${did}/proposer`, {}, T1);
ok(prop.status === 200, 'devoir proposé au binôme');
const accd = await post(`/eleve/devoir/${did}/accepter`, {}, T2);
ok(accd.status === 200, 'devoir accepté par le binôme');

const r1 = await post(`/eleve/devoir/${did}/question/${q1}`, { choix: 0 }, T1);
ok(r1.status === 200 && r1.body.validee === false, 'choix seul non validé');
const r2 = await post(`/eleve/devoir/${did}/question/${q1}`, { choix: 1 }, T2);
ok(r2.body.validee === false, 'désaccord = pas de validation');
const r3 = await post(`/eleve/devoir/${did}/question/${q1}`, { choix: 0 }, T2);
ok(r3.body.validee === true && r3.body.bonne === false, 'accord validé (mauvaise réponse détectée)');
await post(`/eleve/devoir/${did}/question/${q2}`, { choix: 1 }, T1);
const r5 = await post(`/eleve/devoir/${did}/question/${q2}`, { choix: 1 }, T2);
ok(r5.body.validee === true && r5.body.bonne === true, 'accord validé (bonne réponse)');

const cl = await get(`/eleve/devoir/${did}/classement`, T1);
ok(cl.body.length === 1 && cl.body[0].score === 1 && cl.body[0].validees === 2, 'classement binôme');

const dv2 = await get('/eleve/devoir/' + did, T2);
ok(dv2.body.questions[0].bonne != null && dv2.body.questions[1].mon_choix === 1, 'état devoir côté Ibra');

// La carte « propose » est adressée au destinataire (Ibra lit avec son jeton).
const msgs3 = await get(`/eleve/chat/messages/${id1}?since=0`, T2);
ok(
  Array.isArray(msgs3.body) && msgs3.body.some((m) => m.type === 'devoir' && JSON.parse(m.texte).action === 'propose'),
  'proposition de devoir annoncée dans le chat'
);

const { createRequire } = await import('module');
const Database = createRequire('/home/user/s2-reussite/')('better-sqlite3');
const db = new Database('/tmp/s2test/s2reussite.db');
const ins = db.prepare('INSERT INTO quiz_questions (filiere, matiere, lecon, question, choix, bonne) VALUES (?,?,?,?,?,?)');
ins.run('S2', 'maths', 'arithmétique', 'Combien font 1+1 ?', '["2","3","4"]', 0);
ins.run('S2', 'maths', 'arithmétique', 'Combien font 5+5 ?', '["10","8","12"]', 0);
ins.run('S2', 'maths', 'arithmétique', 'Combien font 6/2 ?', '["3","2","4"]', 0);

const du = await post('/eleve/duel/defier', { vers_id: id2, matiere: 'maths', n: 5 }, T1);
ok(du.status === 200, 'duel lancé');
const duid = du.body.id;
const acc2 = await post(`/eleve/duel/${duid}/accepter`, {}, T2);
ok(acc2.status === 200, 'duel accepté');
const dd = await get('/eleve/duel/' + duid, T2);
ok(dd.status === 200 && dd.body.questions.length >= 5, 'questions du duel (minimum 5)');
for (const q of dd.body.questions) {
  await post(`/eleve/duel/${duid}/repondre`, { question_id: q.id, reponse: q.bonne }, T2);
  await post(`/eleve/duel/${duid}/repondre`, { question_id: q.id, reponse: (q.bonne + 1) % q.choix.length }, T1);
}
const dd2 = await get('/eleve/duel/' + duid, T2);
ok(
  dd2.body.duel.statut === 'fini' && dd2.body.duel.score_b === dd.body.questions.length && dd2.body.duel.score_a === 0,
  'duel terminé + scores'
);
const msgs4 = await get(`/eleve/chat/messages/${id2}?since=0`, T1);
ok(
  Array.isArray(msgs4.body) && msgs4.body.some((m) => m.type === 'duel' && JSON.parse(m.texte).action === 'resultat'),
  'résultat duel dans le chat'
);

const res = await get('/admin/devoirs-binomes/' + did, AT);
ok(res.body.resultats.length === 1 && res.body.resultats[0].score === 1, 'résultats admin');

console.log('--- terminé ---');
