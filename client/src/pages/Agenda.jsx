import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

const CAT = {
  bac: { label: 'Bac', cls: 'badge' },
  concours: { label: 'Concours', cls: 'badge badge-soft' },
  examen: { label: 'Examen', cls: 'badge badge-ok' },
  autre: { label: 'Autre', cls: 'badge badge-soft' },
};

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function statut(e) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const debut = new Date(e.date_debut + 'T00:00:00');
  const fin = new Date((e.date_fin || e.date_debut) + 'T00:00:00');
  if (today > fin) return { txt: 'Terminé', cls: 'count-done' };
  if (today >= debut) return { txt: 'En cours', cls: 'count-live' };
  const j = Math.round((debut - today) / 86400000);
  return { txt: `J-${j}`, cls: 'count-next' };
}

export default function Agenda() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [me, setMe] = useState(null);
  const [plan, setPlan] = useState(null);
  const [done, setDone] = useState({});

  useEffect(() => {
    api('/eleve/echeances').then(setList);
    api('/eleve/me').then((m) => {
      setMe(m);
      try {
        const p = JSON.parse(localStorage.getItem(`s2r_plan_${m.eleve_id}`) || 'null');
        if (p) {
          setPlan(p.sessions);
          setDone(p.done || {});
        }
      } catch {
        /* rien */
      }
    });
  }, []);

  function sauverPlan(sessions, doneNext) {
    localStorage.setItem(`s2r_plan_${me.eleve_id}`, JSON.stringify({ sessions, done: doneNext }));
  }

  // Planning intelligent : 3 séances de révision par échéance (J-7, J-3, J-1).
  function generer() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessions = [];
    for (const e of list) {
      const debut = new Date(e.date_debut + 'T00:00:00');
      const diff = Math.round((debut - today) / 86400000);
      if (diff < 0 || diff > 21) continue;
      for (const off of [7, 3, 1]) {
        const d = new Date(debut);
        d.setDate(d.getDate() - off);
        if (d >= today) {
          sessions.push({
            id: `${e.id}-${off}`,
            date: d.toISOString().slice(0, 10),
            titre: `Réviser pour « ${e.titre} »`,
            sub: off === 1 ? 'Dernière ligne droite : fiches + annales' : off === 3 ? 'Faire un sujet en conditions réelles' : 'Relire le cours et faire un quiz',
          });
        }
      }
    }
    sessions.sort((a, b) => a.date.localeCompare(b.date));
    setPlan(sessions);
    setDone({});
    sauverPlan(sessions, {});
  }

  function cocher(id) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    sauverPlan(plan, next);
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
        <h2>Agenda des échéances</h2>
        <p>Bac, concours, compositions : les dates clés, ce qu'il faut faire et où ça se passe. Touche une carte pour le détail.</p>
      </section>

      <section className="card s3card plan3">
        <h2>🗓️ Mon planning de révision intelligent</h2>
        {plan === null ? (
          <>
            <p className="muted small">
              À partir de tes échéances (J-7, J-3, J-1), la plateforme construit automatiquement ton planning de
              révision, séance par séance.
            </p>
            <button className="btn btn-primary" onClick={generer}>
              ✨ Générer mon planning
            </button>
          </>
        ) : plan.length === 0 ? (
          <p className="muted small">Aucune échéance proche : profite-en pour avancer tes cours ! 🌱</p>
        ) : (
          <>
            {plan.map((s) => (
              <button key={s.id} className={done[s.id] ? 'plan3-item fait' : 'plan3-item'} onClick={() => cocher(s.id)}>
                <span className="plan3-check">{done[s.id] ? '✅' : '⬜'}</span>
                <span className="plan3-txt">
                  <strong>{s.titre}</strong>
                  <small>
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.sub}
                  </small>
                </span>
              </button>
            ))}
            <div className="s3-actions">
              <button className="btn btn-outline" onClick={generer}>
                ↺ Régénérer
              </button>
            </div>
          </>
        )}
      </section>
      <div className="agenda-list timeline">
        {list.map((e) => {
          const s = statut(e);
          const cat = CAT[e.categorie] || CAT.autre;
          return (
            <button className="card agenda-card" key={e.id} onClick={() => setOpen(e)}>
              <div className={`count ${s.cls}`}>{s.txt}</div>
              <div className="agenda-body">
                <div className="cours-top">
                  <span className={cat.cls}>{cat.label}</span>
                  <span className="muted small">
                    {fmt(e.date_debut)}
                    {e.date_fin ? ` → ${fmt(e.date_fin)}` : ''}
                  </span>
                </div>
                <h3>{e.titre}</h3>
                {e.lieu && (
                  <p className="muted small">
                    📍 {e.lieu}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {list.length === 0 && <div className="empty">Aucune échéance programmée pour le moment.</div>}
      </div>

      {open && (
        <Modal title={open.titre} onClose={() => setOpen(null)}>
          <div className="cours-top" style={{ marginBottom: 10 }}>
            <span className={(CAT[open.categorie] || CAT.autre).cls}>{(CAT[open.categorie] || CAT.autre).label}</span>
            <span className={`count ${statut(open).cls}`}>{statut(open).txt}</span>
          </div>
          <p>
            <strong>Dates :</strong> {fmt(open.date_debut)}
            {open.date_fin ? ` → ${fmt(open.date_fin)}` : ''}
          </p>
          {open.lieu && (
            <p>
              <strong>Lieu :</strong> {open.lieu}
            </p>
          )}
          {open.description && <p className="muted">{open.description}</p>}
          {open.conseils && (
            <>
              <h4 className="h4">Que faire ?</h4>
              <ul className="debouches">
                {open.conseils
                  .split(';')
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
              </ul>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
