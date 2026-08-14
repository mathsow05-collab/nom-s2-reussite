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

  useEffect(() => {
    api('/eleve/echeances').then(setList);
  }, []);

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
      <div className="agenda-list">
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
