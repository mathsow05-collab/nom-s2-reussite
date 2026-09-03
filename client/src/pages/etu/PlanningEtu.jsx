import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Icon from '../../Icon.jsx';
import { Spinner } from '../../ui.jsx';
import { JOURS } from '../../data/etu.js';

/* Planning personnel : l'étudiant construit son emploi du temps de la semaine. */
export default function PlanningEtu() {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ jour: 0, debut: '08:00', fin: '10:00', titre: '', salle: '' });
  const [err, setErr] = useState(null);

  const maj = () => api('/etudiant/planning').then(setList).catch(() => {});
  useEffect(() => {
    maj();
  }, []);

  async function ajouter(e) {
    e.preventDefault();
    setErr(null);
    try {
      await api('/etudiant/planning', { method: 'POST', body: f });
      setF({ ...f, titre: '', salle: '' });
      maj();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function supprimer(id) {
    await api(`/etudiant/planning/${id}`, { method: 'DELETE' }).catch(() => {});
    maj();
  }

  if (!list)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  return (
    <main className="container">
      <section className="banner">
        <h2>🗓️ Mon planning</h2>
        <p>Ton emploi du temps perso, toujours sur toi. Ajoute tes cours, TD et TP de la semaine.</p>
      </section>

      <form onSubmit={ajouter} className="card" style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="input" style={{ flex: 1 }} value={f.jour} onChange={(e) => setF({ ...f, jour: Number(e.target.value) })}>
            {JOURS.map((j, i) => (
              <option key={j} value={i}>{j}</option>
            ))}
          </select>
          <input className="input" style={{ width: 110 }} type="time" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} />
          <input className="input" style={{ width: 110 }} type="time" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 2 }} placeholder="Matière / activité *" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} required />
          <input className="input" style={{ flex: 1 }} placeholder="Salle" value={f.salle} onChange={(e) => setF({ ...f, salle: e.target.value })} />
          <button className="btn btn-primary">+ Ajouter</button>
        </div>
        {err && <div className="alert alert-danger">{err}</div>}
      </form>

      {JOURS.map((j, i) => {
        const creneaux = list.filter((c) => c.jour === i);
        if (creneaux.length === 0) return null;
        return (
          <div key={j} style={{ marginTop: 12 }}>
            <h3 className="etu-jour">{j}</h3>
            {creneaux.map((c) => (
              <div className="card etu-creneau" key={c.id}>
                <span className="etu-heure">
                  <Icon name="clock" size={13} /> {c.debut}{c.fin ? ` – ${c.fin}` : ''}
                </span>
                <span className="etu-titre">
                  <strong>{c.titre}</strong>
                  {c.salle && <small className="muted"> · {c.salle}</small>}
                </span>
                <button className="icon-btn" onClick={() => supprimer(c.id)} title="Supprimer">✕</button>
              </div>
            ))}
          </div>
        );
      })}
      {list.length === 0 && <div className="empty">Planning vide — ajoute ton premier créneau ci-dessus.</div>}
    </main>
  );
}
