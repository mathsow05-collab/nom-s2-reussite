import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner } from '../../ui.jsx';

const TYPES = { bourse: { label: '🎓 Bourses', ico: '🎓' }, stage: { label: '💼 Stages', ico: '💼' }, concours: { label: '🏆 Concours', ico: '🏆' } };

/* Opportunités curatées : bourses, stages et concours (contenu vérifié). */
export default function Opportunites() {
  const [list, setList] = useState(null);
  const [type, setType] = useState('all');

  useEffect(() => {
    api('/etudiant/opportunites').then(setList).catch(() => {});
  }, []);

  if (!list)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const visible = type === 'all' ? list : list.filter((o) => o.type === type);

  return (
    <main className="container">
      <section className="banner">
        <h2>🌟 Bourses & opportunités</h2>
        <p>Bourses, stages et concours sélectionnés pour les étudiants — contenus vérifiés et mis à jour par la plateforme.</p>
      </section>
      <div className="pills">
        <button className={type === 'all' ? 'pill active' : 'pill'} onClick={() => setType('all')}>Tout</button>
        {Object.entries(TYPES).map(([k, v]) => (
          <button key={k} className={type === k ? 'pill active' : 'pill'} onClick={() => setType(k)}>{v.label}</button>
        ))}
      </div>
      <div className="culture-list">
        {visible.map((o) => (
          <article className="card culture-card" key={o.id}>
            <div className="culture-head">
              <span className="badge badge-soft">{(TYPES[o.type] || {}).label || o.type}</span>
              {o.date_limite && <span className="badge">Limite : {o.date_limite}</span>}
            </div>
            <h3>{o.titre}</h3>
            <p>{o.contenu}</p>
            {o.lien && (
              <a className="btn btn-outline" href={o.lien} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block' }}>
                En savoir plus →
              </a>
            )}
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="empty">Rien dans cette catégorie pour l'instant.</div>}
    </main>
  );
}
