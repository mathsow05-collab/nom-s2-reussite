import { useEffect, useState } from 'react';
import { api, FILIERES } from '../api.js';
import { Spinner } from '../ui.jsx';
import Icon from '../Icon.jsx';

const COEFS = {
  S2: { maths: 5, physique: 4, chimie: 3, svt: 3, francais: 2, 'histoire-geographie': 2, anglais: 2, philosophie: 2 },
  L2: {
    francais: 4,
    philosophie: 3,
    'histoire-geographie': 3,
    anglais: 3,
    espagnol: 2,
    economie: 3,
    maths: 2,
    'physique-chimie': 2,
    svt: 2,
  },
};

function mention(m) {
  if (m >= 16) return 'Très bien 🏆';
  if (m >= 14) return 'Bien 👏';
  if (m >= 12) return 'Assez bien 👍';
  if (m >= 10) return 'Passable ✔';
  return 'Insuffisant — accroche-toi 💪';
}

export default function Outils() {
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
        <p>Simule ta moyenne générale et génère ton planning de révision personnalisé jusqu'au Bac.</p>
      </section>
      <Simulateur filiere={filiere} />
      <Planning filiere={filiere} />
    </main>
  );
}

/* ------------------------- Simulateur de moyenne ------------------------- */
function Simulateur({ filiere }) {
  const matieres = FILIERES[filiere].matieres;
  const [notes, setNotes] = useState({});
  const [coefs, setCoefs] = useState({ ...COEFS[filiere] });

  function moy(m) {
    const n = notes[m.id];
    if (!n) return null;
    const d = parseFloat(n.d);
    const c = parseFloat(n.c);
    if (isNaN(d) && isNaN(c)) return null;
    if (!isNaN(d) && !isNaN(c)) return Math.min(20, Math.max(0, (d + 2 * c) / 3));
    return Math.min(20, Math.max(0, isNaN(d) ? c : d));
  }

  let sum = 0;
  let totCoef = 0;
  for (const m of matieres) {
    const mm = moy(m.id);
    if (mm != null) {
      sum += mm * (coefs[m.id] || 1);
      totCoef += coefs[m.id] || 1;
    }
  }
  const globale = totCoef ? sum / totCoef : null;

  return (
    <section className="panel">
      <h2>
        <Icon name="chart" size={17} /> Simulateur de moyenne
      </h2>
      <p className="muted small">
        Entre tes notes sur 20 (devoir et composition). Moyenne de la matière = (devoir + 2 × composition) ÷ 3. Les
        coefficients sont modifiables.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Matière</th>
              <th>Devoir</th>
              <th>Compo</th>
              <th>Coef</th>
              <th>Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {matieres.map((m) => {
              const mm = moy(m.id);
              return (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td>
                    <input
                      className="input input-note"
                      type="number"
                      min="0"
                      max="20"
                      placeholder="—"
                      value={notes[m.id]?.d ?? ''}
                      onChange={(e) => setNotes((s) => ({ ...s, [m.id]: { ...s[m.id], d: e.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      className="input input-note"
                      type="number"
                      min="0"
                      max="20"
                      placeholder="—"
                      value={notes[m.id]?.c ?? ''}
                      onChange={(e) => setNotes((s) => ({ ...s, [m.id]: { ...s[m.id], c: e.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      className="input input-note"
                      type="number"
                      min="1"
                      max="9"
                      value={coefs[m.id] || 1}
                      onChange={(e) => setCoefs((s) => ({ ...s, [m.id]: parseInt(e.target.value, 10) || 1 }))}
                    />
                  </td>
                  <td>
                    <strong className={mm != null && mm < 10 ? 'ko-text' : 'ok-text'}>{mm != null ? mm.toFixed(2) : '—'}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {globale != null && (
        <div className="moy-globale">
          <div>
            Moyenne générale : <strong>{globale.toFixed(2)}/20</strong>
          </div>
          <div className="muted">{mention(globale)}</div>
        </div>
      )}
    </section>
  );
}

/* ------------------------- Générateur de planning de révision ------------------------- */
const TIPS = [
  'Relis ton cours, puis refais 2 exercices sans regarder la correction.',
  'Fais un sujet d’annales en temps limité.',
  'Fiche de révision + un quiz de la plateforme.',
  'Explique la leçon à voix haute, comme si tu étais le prof.',
];

function Planning({ filiere }) {
  const matieres = FILIERES[filiere].matieres;
  const [dateExamen, setDateExamen] = useState('2027-06-07');
  const [heures, setHeures] = useState(2);
  const [faibles, setFaibles] = useState([]);
  const [plan, setPlan] = useState(null);

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
      const p2 = rotation[(i + 1) % rotation.length];
      const h1 = Math.max(30, Math.round(((heures * 60) / 3) * 2 / 15) * 15);
      const h2 = heures * 60 - h1;
      jours.push({
        d,
        s1: p1,
        s2: p2 !== p1 ? p2 : rotation[(i + 2) % rotation.length],
        h1,
        h2,
        tip: TIPS[i % TIPS.length],
      });
    }
    setPlan(jours);
  }

  const label = (mId) => (FILIERES[filiere].matieres.find((m) => m.id === mId) || {}).label || mId;
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
          <label className="label">Heures par jour</label>
          <select className="input" value={heures} onChange={(e) => setHeures(parseInt(e.target.value, 10))}>
            {[1, 2, 3, 4, 5, 6].map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="label">Mes matières faibles (elles reviendront plus souvent)</label>
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
        <Icon name="refresh" size={15} /> Générer mon planning (4 semaines)
      </button>

      {plan && plan.length > 0 && (
        <div className="plan-list">
          {plan.map((j, i) => (
            <div className="plan-day" key={i}>
              <div className="plan-date">
                {j.d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div className="plan-detail">
                <div>
                  <strong>{label(j.s1)}</strong> · {fmtH(j.h1)} — puis <strong>{label(j.s2)}</strong> · {fmtH(j.h2)}
                </div>
                <div className="muted small">{j.tip}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {plan && plan.length === 0 && <div className="alert alert-warn">La date d'examen est déjà passée.</div>}
    </section>
  );
}
