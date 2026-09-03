import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Modal, Spinner } from '../../ui.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

/* Orientation universitaire : fiches curatées par filière (débouchés, écoles, conseils). */
export default function OrientationEtu() {
  const [list, setList] = useState(null);
  const [ouvert, setOuvert] = useState(null);

  useEffect(() => {
    api('/etudiant/orientation').then(setList).catch(() => {});
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
        <h2>🧭 Orientation</h2>
        <p>Débouchés, écoles au Sénégal, salaires et conseils de méthode pour chaque filière universitaire.</p>
      </section>
      <div className="grid-cards">
        {list.map((o) => {
          const f = FILIERES_ETU[o.filiere] || { label: o.filiere, ico: '🎓' };
          return (
            <article className="card cours-card" key={o.id}>
              <div className="cours-top">
                <span className="badge-pastel">{f.ico} {f.label}</span>
              </div>
              <h3>{o.titre}</h3>
              <p className="muted clamp3">{o.contenu}</p>
              <div className="cours-actions">
                <button className="btn btn-outline" onClick={() => setOuvert(o)}>Lire la fiche complète</button>
              </div>
            </article>
          );
        })}
      </div>
      {ouvert && (
        <Modal title={`${(FILIERES_ETU[ouvert.filiere] || {}).ico || '🎓'} ${ouvert.titre}`} onClose={() => setOuvert(null)} wide>
          <p style={{ whiteSpace: 'pre-wrap' }}>{ouvert.contenu}</p>
        </Modal>
      )}
    </main>
  );
}
