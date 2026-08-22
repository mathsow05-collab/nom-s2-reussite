import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon.jsx';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const LS = 'kd_emploi_rev';
const PRIO_L2 = ['francais', 'philosophie', 'anglais', 'histoire-geographie', 'economie', 'espagnol', 'maths', 'physique-chimie', 'svt'];
const OPT_LIBRE = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
const OPT_COUCHE = ['20', '21', '22', '23', '00', '01', '02', '03', '04', '05'];

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

/* heures libres du jour, de « libre » jusqu'à 1 h avant le coucher (peut passer minuit) */
function slotsDuJour(j) {
  const libre = parseInt(j.libre) || 17;
  const fin = ((parseInt(j.coucher) || 22) - 1 + 24) % 24;
  const slots = [];
  let h = libre;
  for (let k = 0; k < 12; k++) {
    if (h === fin) break;
    slots.push(h);
    h = (h + 1) % 24;
    if (h === libre) break;
  }
  return slots;
}

/* sessions intensives : 2 h par matière (3 h si difficulté), 1-2 matières par jour */
function generer(jours, diffs, matieres, filiere) {
  const prio = filiere === 'L2' ? PRIO_L2 : matieres.map((m) => m.id);
  const poids = (id) => {
    const idx = prio.indexOf(id);
    const base = idx === -1 ? 2 : Math.max(1, prio.length - idx);
    return base * (diffs.includes(id) ? 3 : 1);
  };
  return jours.map((j) => {
    const cellules = {};
    if (j.cours) for (let h = 8; h < 16; h++) cellules[h] = { t: 'cours' };
    const slots = slotsDuJour(j).filter((h) => !cellules[h]);
    const pool = (j.matieres?.length ? j.matieres : matieres.map((m) => m.id)).filter((id) =>
      matieres.some((m) => m.id === id)
    );
    const classes = [...pool].sort((a, b) => poids(b) - poids(a));
    const maxBlocs = j.cours ? 2 : 3;
    let i = 0;
    let bi = 0;
    while (i < slots.length && bi < maxBlocs) {
      let id = classes[bi % Math.max(1, classes.length)];
      if (!id) break;
      if (bi > 0 && id === cellules[slots[i - 1]]?.id && classes.length > 1)
        id = classes[(bi + 1) % classes.length];
      const len = Math.min(diffs.includes(id) ? 3 : 2, slots.length - i);
      for (let k = 0; k < len; k++) cellules[slots[i + k]] = { t: 'mat', id };
      i += len;
      bi++;
    }
    return cellules;
  });
}

export default function EmploiRevision({ filiere, matieres }) {
  const [st, setSt] = useState(lire);
  const [pret, setPret] = useState(false);
  const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const byId = useMemo(() => Object.fromEntries(matieres.map((m) => [m.id, m])), [matieres]);
  const grid = useMemo(() => generer(st.jours, st.diffs, matieres, filiere), [st, matieres, filiere]);

  /* lignes du tableau : 08h → 23h puis 00h → heure tardive max */
  const lignes = useMemo(() => {
    let maxTard = -1;
    st.jours.forEach((j) => {
      const fin = ((parseInt(j.coucher) || 22) - 1 + 24) % 24;
      if (fin < 8 && fin > maxTard) maxTard = fin;
    });
    const base = Array.from({ length: 16 }, (_, i) => i + 8);
    const tard = maxTard >= 0 ? Array.from({ length: maxTard + 1 }, (_, i) => i) : [];
    return [...base, ...tard];
  }, [st.jours]);

  function maj(n) {
    const next = { ...st, ...n };
    setSt(next);
    localStorage.setItem(LS, JSON.stringify(next));
  }
  function majJour(i, patch) {
    maj({ jours: st.jours.map((j, k) => (k === i ? { ...j, ...patch } : j)) });
  }
  function basculeDiff(id) {
    maj({ diffs: st.diffs.includes(id) ? st.diffs.filter((d) => d !== id) : [...st.diffs, id] });
  }

  /* notifications « c'est l'heure de réviser » */
  function activerNotifs() {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((p) => {
      setNotif(p);
      if (p === 'granted')
        new Notification('Rappels de révision activés 🔔', {
          body: 'Tant que l’application est ouverte, on te prévient à chaque heure de révision prévue.',
        });
    });
  }
  useEffect(() => {
    if (notif !== 'granted' || !pret) return;
    function check() {
      const now = new Date();
      const di = (now.getDay() + 6) % 7;
      const h = now.getHours();
      const c = grid[di]?.[h];
      if (c?.t === 'mat') {
        const key = `kd_notif_${now.toDateString()}_${h}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          new Notification('C’est l’heure de réviser ! 📚', {
            body: `${byId[c.id]?.label || 'Révision'} · ${h2(h)}–${h2((h + 1) % 24)}. Courage, tu gères !`,
          });
        }
      }
    }
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [notif, pret, grid, byId]);

  return (
    <section className="card s3card" style={{ marginTop: 14 }}>
      <h2>🗓 Emploi du temps de révision</h2>
      <p className="muted small">
        Dis-nous ton rythme (même si tu révises tard la nuit) : on te génère un tableau avec des{" "}
        <strong>sessions intensives de 2-3 h</strong> par matière. Appuie sur une matière du tableau pour signaler une
        difficulté — il se réajuste.
        {filiere === 'S2' && ' En filière S, les scientifiques sont prioritaires.'}
      </p>

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
                    {OPT_LIBRE.map((h) => (
                      <option key={h} value={h}>
                        {h}h
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <small>Couche à</small>
                  <select className="input" value={d.coucher} onChange={(e) => majJour(i, { coucher: e.target.value })}>
                    {OPT_COUCHE.map((h) => (
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

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setPret(true)}>
          <Icon name="calendar" size={15} /> Générer mon emploi du temps
        </button>
        {notif === 'granted' ? (
          <span className="er-chip on" style={{ alignSelf: 'center' }}>🔔 Rappels activés</span>
        ) : notif === 'unsupported' ? null : (
          <button className="btn btn-outline" onClick={activerNotifs}>
            🔔 Me rappeler les heures de révision
          </button>
        )}
      </div>

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
                {lignes.map((h) => (
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
                              title={diff ? 'Difficulté : sessions de 3 h' : 'Appuie pour signaler une difficulté'}
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
            🏫 = cours · « · » = libre/repos. Sessions de 2 h par matière (3 h si difficulté 💪) : 17h→20h peut être
            100 % maths si tu marques la difficulté. Appuie sur une matière pour ajuster.
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
