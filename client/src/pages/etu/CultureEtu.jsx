import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Spinner } from '../../ui.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

/* Culture dédiée par filière : chaque filière a son propre fil d'infos curaté. */
export default function CultureEtu({ me }) {
  const [list, setList] = useState(null);
  const [fil, setFil] = useState(me.filiere);

  const maj = useCallback(() => {
    api(`/etudiant/culture?filiere=${fil}`).then(setList).catch(() => {});
  }, [fil]);

  useEffect(() => {
    maj();
  }, [maj]);

  if (!list)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const [une, ...reste] = list;

  return (
    <main className="container">
      <section className="banner">
        <h2>🎭 Culture de ma filière</h2>
        <p>Une culture dédiée à chaque filière : histoires, découvertes et faits qui donnent de la profondeur à tes études.</p>
      </section>

      <div className="pills">
        {Object.entries(FILIERES_ETU).map(([k, v]) => (
          <button key={k} className={fil === k ? 'pill active' : 'pill'} onClick={() => setFil(k)}>
            {v.ico} {v.label}
          </button>
        ))}
      </div>

      {une && (
        <article className="card culture-card a-la-une">
          <div className="culture-head">
            <span className="badge">À la une · {(FILIERES_ETU[fil] || {}).label}</span>
            <span className="muted small">{une.date_publi}</span>
          </div>
          <h3>{une.titre}</h3>
          <p>{une.contenu}</p>
        </article>
      )}

      <div className="culture-list">
        {reste.map((c) => (
          <article className="card culture-card" key={c.id}>
            <div className="culture-head">
              <span className="muted small">{c.date_publi}</span>
            </div>
            <h3>{c.titre}</h3>
            <p className="clamp3">{c.contenu}</p>
          </article>
        ))}
      </div>
      {list.length === 0 && <div className="empty">Pas encore de contenu pour cette filière — bientôt !</div>}
    </main>
  );
}
