import { useEffect, useState } from 'react';
import { api, FILIERES } from '../api.js';
import { Spinner } from '../ui.jsx';
import Icon from '../Icon.jsx';

const COEFS_DEF = {
  S2: { maths: 5, physique: 4, chimie: 3, svt: 3, francais: 2, 'histoire-geographie': 2, anglais: 2, philosophie: 2 },
  L2: { francais: 4, philosophie: 3, 'histoire-geographie': 3, anglais: 3, espagnol: 2, economie: 3, maths: 2, 'physique-chimie': 2, svt: 2 },
  AR: { lecture: 3, sourates: 3, tajwid: 2, tafsir: 2 },
};

function mention(m) {
  if (m >= 16) return { txt: 'Très bien', emoji: '', cls: 'tb' };
  if (m >= 14) return { txt: 'Bien', emoji: '', cls: 'b' };
  if (m >= 12) return { txt: 'Assez bien', emoji: '', cls: 'ab' };
  if (m >= 10) return { txt: 'Passable', emoji: '✔', cls: 'p' };
  return { txt: 'Insuffisant', emoji: '', cls: 'i' };
}

export default function Outils() {
  const [vue, setVue] = useState('simu');
  const [me, setMe] = useState(null);
  useEffect(() => {
    api('/eleve/me').then(setMe);
  }, []);
  if (!me)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );
  const filiere = me.filiere || 'S2';
  return (
    <main className="container">
      <section className="banner">
        <h2>Boîte à outils de réussite</h2>
        <p>
          {me.prenom}, trois outils pour réussir : simulateur de moyenne, planning jusqu'au jour J et emploi du temps
          de révision personnalisé.
        </p>
      </section>
      <div className="pills">
        <button className={vue === 'simu' ? 'pill active' : 'pill'} onClick={() => setVue('simu')}>
          📊 Simulateur de moyenne
        </button>
        <button className={vue === 'plan' ? 'pill active' : 'pill'} onClick={() => setVue('plan')}>
          🎯 Planning jusqu'au jour J
        </button>
        <button className={vue === 'emploi' ? 'pill active' : 'pill'} onClick={() => setVue('emploi')}>
          🗓 Emploi du temps de révision
        </button>
      </div>
      {vue === 'simu' && <Simulateur filiere={filiere} />}
      {vue === 'plan' && <Planning filiere={filiere} />}
      {vue === 'emploi' && <EmploiRevision filiere={filiere} matieres={FILIERES[filiere].matieres} />}
    </main>
  );
}

/* ================= Simulateur de moyenne (cartes mobiles) ================= */
function Simulateur({ filiere }) {
  const matieres = FILIERES[filiere].matieres;
  const [notes, setNotes] = useState({});
  const [coefs, setCoefs] = useState({ ...(COEFS_DEF[filiere] || {}) });

  function moy(id) {
    const n = notes[id];
    if (!n) return null;
    const d = parseFloat(n.d);
    const c = parseFloat(n.c);
    if (isNaN(d) && isNaN(c)) return null;
    if (!isNaN(d) && !isNaN(c)) return Math.min(20, Math.max(0, (d + 2 * c) / 3));
    return Math.min(20, Math.max(0, isNaN(d) ? c : d));
  }

  let sum = 0;
  let totCoef = 0;
  let nbSaisies = 0;
  for (const m of matieres) {
    const mm = moy(m.id);
    if (mm != null) {
      sum += mm * (coefs[m.id] || 1);
      totCoef += coefs[m.id] || 1;
      nbSaisies += 1;
    }
  }
  const globale = totCoef ? sum / totCoef : null;
  const men = globale != null ? mention(globale) : null;

  return (
    <section className="panel">
      <h2>
        <Icon name="chart" size={17} /> Simulateur de moyenne
      </h2>
      <p className="muted small">
        Entre devoir et composition : la moyenne de la matière = (devoir + 2 × compo) ÷ 3. Coefficients modifiables.
      </p>

      {/* Résumé global, toujours visible */}
      <div className={globale != null ? `sim-summary ${men.cls}` : 'sim-summary vide'}>
        <div className="sim-big">{globale != null ? globale.toFixed(2) : '—'}</div>
        <div className="sim-infos">
          <strong>Moyenne générale /20</strong>
          <div className="muted small">
            {globale != null
              ? `${men.emoji} ${men.txt} · ${nbSaisies} matière${nbSaisies > 1 ? 's' : ''} · total coefficients ${totCoef}`
              : 'Entre tes premières notes pour voir ta moyenne générale.'}
          </div>
        </div>
      </div>

      <div className="sim-cards">
        {matieres.map((m) => {
          const mm = moy(m.id);
          return (
            <div className="sim-card" key={m.id} style={{ '--mc': m.color }}>
              <div className="sim-head">
                <span className="sim-dot" />
                <strong>{m.label}</strong>
                <label className="sim-coef">
                  coef
                  <input
                    type="number"
                    min="1"
                    max="9"
                    value={coefs[m.id] || 1}
                    onChange={(e) => setCoefs((s) => ({ ...s, [m.id]: parseInt(e.target.value, 10) || 1 }))}
                  />
                </label>
              </div>
              <div className="sim-notes">
                <label>
                  Devoir
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="—"
                    value={notes[m.id]?.d ?? ''}
                    onChange={(e) => setNotes((s) => ({ ...s, [m.id]: { ...s[m.id], d: e.target.value } }))}
                  />
                </label>
                <label>
                  Compo
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="—"
                    value={notes[m.id]?.c ?? ''}
                    onChange={(e) => setNotes((s) => ({ ...s, [m.id]: { ...s[m.id], c: e.target.value } }))}
                  />
                </label>
                <div className={mm == null ? 'sim-moy' : mm < 10 ? 'sim-moy ko' : 'sim-moy ok'}>
                  {mm != null ? mm.toFixed(1) : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ================= Générateur de planning (style premium) ================= */
const TIPS = [
  'Relis ton cours, puis refais 2 exercices sans regarder la correction.',
  'Fais un sujet d’annales en temps limité.',
  'Fiche de révision + un quiz de la plateforme.',
  'Explique la leçon à voix haute, comme si tu étais le prof.',
  'Termine par 5 minutes de relecture de tes fiches.',
];

function Planning({ filiere }) {
  const matieres = FILIERES[filiere].matieres;
  const [dateExamen, setDateExamen] = useState('2027-06-07');
  const [heures, setHeures] = useState(2);
  const [faibles, setFaibles] = useState([]);
  const [plan, setPlan] = useState(null);

  const parId = (id) => matieres.find((m) => m.id === id) || { label: id, color: '#64748b' };

  function generer() {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(dateExamen + 'T00:00:00');
    if (end <= start) return setPlan([]);
    const nbJours = Math.min(28, Math.round((end - start) / 86400000));
    const rotation = [];
    for (const m of matieres) {
      rotation.push(m.id);
      if (faibles.includes(m.id)) rotation.push(m.id);
    }
    const jours = [];
    for (let i = 0; i < nbJours; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const p1 = rotation[i % rotation.length];
      let p2 = rotation[(i + 1) % rotation.length];
      if (p2 === p1) p2 = rotation[(i + 2) % rotation.length];
      const h1 = Math.max(30, Math.round((((heures * 60) / 3) * 2) / 15) * 15);
      jours.push({ d, s1: p1, s2: p2, h1, h2: heures * 60 - h1, tip: TIPS[i % TIPS.length] });
    }
    // regroupement par semaines
    const semaines = [];
    for (let i = 0; i < jours.length; i += 7) semaines.push(jours.slice(i, i + 7));
    setPlan({ semaines, total: jours.length, heures });
  }

  const fmtH = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`);

  return (
    <section className="panel">
      <h2>
        <Icon name="calendar" size={17} /> Générateur de planning de révision
      </h2>
      <div className="outils-bar">
        <div>
          <label className="label">Date de l'examen</label>
          <input className="input" type="date" value={dateExamen} onChange={(e) => setDateExamen(e.target.value)} />
        </div>
        <div>
          <label className="label">⏳ Temps par jour</label>
          <select className="input" value={heures} onChange={(e) => setHeures(parseInt(e.target.value, 10))}>
            {[1, 2, 3, 4, 5, 6].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="label">Mes matières faibles (elles reviendront 2× plus souvent)</label>
      <div className="pills">
        {matieres.map((m) => (
          <button
            key={m.id}
            className={faibles.includes(m.id) ? 'pill active' : 'pill'}
            style={{ '--mc': m.color }}
            onClick={() => setFaibles((f) => (f.includes(m.id) ? f.filter((x) => x !== m.id) : [...f, m.id]))}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" onClick={generer}>
        Générer mon planning
      </button>

      {plan && plan.semaines && plan.semaines.length > 0 && (
        <>
          <div className="plan-hero">
            <div>
              <strong>
                {plan.total} jours · {plan.total * plan.heures} h de révision prévues
              </strong>
              <div className="muted small">jusqu'au {new Date(dateExamen + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            
          </div>

          {plan.semaines.map((sem, si) => {
            const totalSem = {};
            sem.forEach((j) => {
              totalSem[j.s1] = (totalSem[j.s1] || 0) + j.h1;
              totalSem[j.s2] = (totalSem[j.s2] || 0) + j.h2;
            });
            return (
              <div className="plan-week" key={si}>
                <div className="plan-week-head">
                  <strong>Semaine {si + 1}</strong>
                  <div className="plan-recap">
                    {Object.entries(totalSem).map(([id, min]) => (
                      <span key={id} className="plan-recap-chip" style={{ '--mc': parId(id).color }}>
                        {parId(id).label} · {fmtH(min)}
                      </span>
                    ))}
                  </div>
                </div>
                {sem.map((j, ji) => (
                  <div className="plan-jour" key={ji}>
                    <div className="plan-jour-date">
                      <span className="pj-weekday">{j.d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      <span className="pj-day">{j.d.getDate()}</span>
                    </div>
                    <div className="plan-jour-body">
                      <div className="plan-sessions">
                        <span className="plan-session" style={{ '--mc': parId(j.s1).color }}>
                          <b>{parId(j.s1).label}</b> {fmtH(j.h1)}
                        </span>
                        <span className="plan-session" style={{ '--mc': parId(j.s2).color }}>
                          <b>{parId(j.s2).label}</b> {fmtH(j.h2)}
                        </span>
                      </div>
                      <div className="muted small">{j.tip}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
      {plan && plan.semaines?.length === 0 && <div className="alert alert-warn">La date d'examen est déjà passée.</div>}
    </section>
  );
}
