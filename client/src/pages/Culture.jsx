import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Spinner } from '../ui.jsx';
import MiniJeu from '../components/MiniJeu.jsx';

export const CATS = {
  actualite: { label: 'Actu expliquée', icon: '🌍' },
  citation: { label: 'Citations', icon: '✒️' },
  figure: { label: 'Biographies', icon: '🧑🏾‍🏫' },
  histoire: { label: 'Un jour dans l’histoire', icon: '📜' },
  pratique: { label: 'Info pratique', icon: '🛠️' },
  geo: { label: 'Géo en chiffres', icon: '🗺️' },
  langue: { label: 'Langue & style', icon: '📖' },
  debat: { label: 'Débat du jour', icon: '💬' },
};

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Culture() {
  const [list, setList] = useState(null);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    api('/eleve/culture').then(setList);
  }, []);

  if (!list)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const visible = cat === 'all' ? list : list.filter((c) => c.categorie === cat);
  const [une, ...reste] = visible;

  return (
    <main className="container">
      <section className="banner">
        <h2>🌍 Culture du monde</h2>
        <p>Chaque jour, une info utile : actu expliquée, citations, biographies, méthodes… et apprends en jouant avec le challenge Histoire-Géo !</p>
      </section>

      <MiniJeu />

      <div className="pills">
        <button className={cat === 'all' ? 'pill active' : 'pill'} onClick={() => setCat('all')}>
          Tout
        </button>
        {Object.entries(CATS).map(([id, c]) => (
          <button key={id} className={cat === id ? 'pill active' : 'pill'} onClick={() => setCat(id)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {une && (
        <article className={une.categorie === 'citation' ? 'card culture-card a-la-une quote-card' : 'card culture-card a-la-une'}>
          <div className="culture-head">
            <span className="badge">📌 À la une · {fmt(une.date_publi)}</span>
            <span className="badge badge-soft">
              {(CATS[une.categorie] || CATS.actualite).icon} {(CATS[une.categorie] || CATS.actualite).label}
            </span>
          </div>
          {une.categorie === 'citation' ? <p className="quote-text">{une.titre}</p> : <h3>{une.titre}</h3>}
          <p>{une.contenu}</p>
        </article>
      )}

      <div className="culture-list">
        {reste.map((c) => (
          <article className="card culture-card" key={c.id}>
            <div className="culture-head">
              <span className="muted small">{fmt(c.date_publi)}</span>
              <span className="badge badge-soft">
                {(CATS[c.categorie] || CATS.actualite).icon} {(CATS[c.categorie] || CATS.actualite).label}
              </span>
            </div>
            {c.categorie === 'citation' ? <p className="quote-text">{c.titre}</p> : <h3>{c.titre}</h3>}
            <p className="clamp3">{c.contenu}</p>
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="empty">Rien dans cette catégorie pour l'instant — reviens demain !</div>}
    </main>
  );
}
