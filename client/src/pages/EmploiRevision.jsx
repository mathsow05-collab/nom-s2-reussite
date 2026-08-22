import { useMemo, useState } from 'react';
import Icon from '../Icon.jsx';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const HEURES = Array.from({ length: 13 }, (_, i) => i + 8); // 08 → 20
const LS = 'kd_emploi_rev';
const PRIO_L2 = ['francais', 'philosophie', 'anglais', 'histoire-geographie', 'economie', 'espagnol', 'maths', 'physique-chimie', 'svt'];

function defaut() {
  return {
    jours: JOURS.map((_, i) => ({ cours: i < 6, libre: i < 6 ? '17' : '09', coucher: '22', matieres: [] })),
    diffs: [],
  };
}
function lire() {
  try {
    const d = JSON.parse(localStorage.getItem(LS));
    if (d?.jours?.length === 7) return d;
  } catch {
    /* ignore */
  }
  return defaut();
}
const h2 = (h) => `${String(h).padStart(2, '0')}h`;

function generer(jours, diffs, matieres, filiere) {
  const prio = filiere === 'L2' ? PRIO_L2 : matieres.map((m) => m.id);
  const poids = (id) => {
    const idx = prio.indexOf(id);
    const base = idx === -1 ? 2 : Math.max(1, prio.length - idx);
    return base * (diffs.includes(id) ? 2.5 : 1);
  };
  return jours.map((j) => {
    const cellules = {};
    if (j.cours) for (let h = 8; h < 16; h++) cellules[h] = { t: 'cours' };
    const debut = Math.min(19, Math.max(8, parseInt(j.libre) || 17));
    const fin = Math.min(20, (parseInt(j.coucher) || 22) - 1);
    const dispo = [];
    for (let h = debut; h < fin; h++) if (!cellules[h]) dispo.push(h);
    const pool = (j.matieres?.length ? j.matieres : matieres.map((m) => m.id)).filter((id) =>
      matieres.some((m) => m.id === id)
    );
    const maxBlocs = j.cours ? 3 : 5;
    const restants = pool.map((id) => ({ id, p: poids(id) + Math.random() * 0.4 }));
    const blocs = [];
    for (let k = 0; k < Math.min(maxBlocs, dispo.length) && restants.length; k++) {
      restants.sort((a, b) => b.p - a.p);
      let choix = restants[0];
      if (blocs.length && choix.id === blocs[blocs.length - 1] && restants.length > 1) choix = restants[1];
      blocs.push(choix.id);
      choix.p *= 0.5;
    }
    blocs.forEach((id, k) => {
      cellules[dispo[k]] = { t: 'mat', id };
    });
    return cellules;
  });
}

export default function EmploiRevision({ filiere, matieres }) {
  const [st, setSt] = useState(lire);
  const [pret, setPret] = useState(false);
  const byId = useMemo(() => Object.fromEntries(matieres.map((m) => [m.id, m])), [matieres]);
  const grid = useMemo(() => generer(st.jours, st.diffs, matieres, filiere), [st, matieres, filiere]);

  function maj(n) {
    const next = { ...st, ...n };
    setSt(next);
    localStorage.setItem(LS, JSON.stringify(next));
  }
  function majJour(i, patch) {
    const jours = st.jours.map((j, k) => (k === i ? { ...j, ...patch } : j));
    maj({ jours });
  }
  function basculeDiff(id) {
    maj({ diffs: st.diffs.includes(id) ? st.diffs.filter((d) => d !== id) : [...st.diffs, id] });
  }

  return (
    <section className="card s3card" style={{ marginTop: 14 }}>
      <h2>🗓 Emploi du temps de révision</h2>
      <p className="muted small">
        Dis-nous ton rythme de la semaine : on te génère un emploi du temps de révision de 08h à 20h. Appuie ensuite
        sur une matière du tableau pour signaler une difficulté — il se réajuste tout seul.
        {filiere === 'S2' && ' En filière S, les matières scientifiques sont prioritaires par défaut.'}
      </p>

      {/* questionnaire semaine */}
      <div className="er-jours">
        {JOURS.map((j, i) => {
          const d = st.jours[i];
          return (
            <div className="er-jour" key={j}>
              <div className="er-jour-top">
                <strong>{j}</strong>
                <button className={d.cours ? 'er-switch on' : 'er-switch'} onClick={() => majJour(i, { cours: !d.cours })}>
                  {d.cours ? 'Cours' : 'Pas cours'}
                </button>
              </div>
              <div className="er-champs">
                <label>
                  <small>Libre à</small>
                  <select className="input" value={d.libre} onChange={(e) => majJour(i, { libre: e.target.value })}>
                    {['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].map((h) => (
                      <option key={h} value={h}>
                        {h}h
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <small>Couche à</small>
                  <select className="input" value={d.coucher} onChange={(e) => majJour(i, { coucher: e.target.value })}>
                    {['20', '21', '22', '23'].map((h) => (
                      <option key={h} value={h}>
                        {h}h
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {d.cours && (
                <div className="er-mats">
                  <small className="muted">Matières du jour :</small>
                  <div className="er-chips">
                    {matieres.map((m) => (
                      <button
                        key={m.id}
                        className={d.matieres.includes(m.id) ? 'er-chip on' : 'er-chip'}
                        style={d.matieres.includes(m.id) ? { borderColor: m.color, color: m.color } : undefined}
                        onClick={() =>
                          majJour(i, {
                            matieres: d.matieres.includes(m.id) ? d.matieres.filter((x) => x !== m.id) : [...d.matieres, m.id],
                          })
                        }
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPret(true)}>
        <Icon name="calendar" size={15} /> Générer mon emploi du temps
      </button>

      {pret && (
        <>
          <div className="er-table-wrap">
            <table className="er-table">
              <thead>
                <tr>
                  <th>Heure</th>
                  {JOURS.map((j) => (
                    <th key={j}>{j.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEURES.map((h) => (
                  <tr key={h}>
                    <td className="er-h">{h2(h)}</td>
                    {JOURS.map((_, di) => {
                      const c = grid[di][h];
                      if (c?.t === 'cours')
                        return (
                          <td key={di} className="er-cours">
                            🏫
                          </td>
                        );
                      if (c?.t === 'mat') {
                        const m = byId[c.id];
                        const diff = st.diffs.includes(c.id);
                        return (
                          <td key={di}>
                            <button
                              className={diff ? 'er-cell diff' : 'er-cell'}
                              style={{ background: `${m.color}22`, color: m.color, borderColor: diff ? 'var(--danger)' : m.color }}
                              title={diff ? 'Difficulté signalée : plus de créneaux' : 'Appuie pour signaler une difficulté'}
                              onClick={() => basculeDiff(c.id)}
                            >
                              {m.label}
                              {diff ? ' 💪' : ''}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={di} className="er-vide">
                          ·
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            🏫 = cours · « · » = temps libre / repos. Appuie sur une matière pour marquer une difficulté (💪) :
            l'emploi du temps lui donne automatiquement plus de créneaux.
          </p>
          {st.diffs.length > 0 && (
            <div className="er-diffs">
              <small className="muted">Difficultés suivies :</small>{' '}
              {st.diffs.map((id) => (
                <button key={id} className="er-chip on" style={{ borderColor: byId[id]?.color, color: byId[id]?.color }} onClick={() => basculeDiff(id)}>
                  {byId[id]?.label} ✕
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
