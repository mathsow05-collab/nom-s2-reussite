import { useEffect, useState } from 'react';
import { api, getToken, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import PdfViewer from '../components/PdfViewer.jsx';

const ANNEES = Array.from({ length: 27 }, (_, i) => 2026 - i); // 2026 → 2000

export default function Annales() {
  const [me, setMe] = useState(null);
  const [list, setList] = useState(null);
  const [annee, setAnnee] = useState('all');
  const [matiere, setMatiere] = useState('all');
  const [q, setQ] = useState('');
  const [viewer, setViewer] = useState(null); // { a, type }

  useEffect(() => {
    api('/eleve/me').then(setMe);
  }, []);

  useEffect(() => {
    if (!me) return;
    const qs = new URLSearchParams();
    if (annee !== 'all') qs.set('annee', annee);
    if (matiere !== 'all') qs.set('matiere', matiere);
    api('/eleve/annales?' + qs.toString()).then(setList);
  }, [me, annee, matiere]);

  if (!me || !list)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const matieres = (FILIERES[me.filiere] || FILIERES.S2).matieres;
  const nq = q.trim().toLowerCase();
  const liste = nq
    ? list.filter((a) => `${a.titre} ${(MATIERE_BY_ID[a.matiere] || { label: a.matiere }).label} ${a.annee}`.toLowerCase().includes(nq))
    : list;

  return (
    <main className="container">
      <section className="banner">
        <h2>Annales du Bac (2000 → 2026)</h2>
        <p>Sujets et corrigés de ta filière, classés par année et par matière. Entraîne-toi en conditions réelles.</p>
      </section>

      <div className="outils-bar">
        <div className="search3">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher un sujet…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={annee} onChange={(e) => setAnnee(e.target.value)}>
          <option value="all">Toutes les années</option>
          {ANNEES.map((a) => (
            <option key={a} value={a}>
              Session {a}
            </option>
          ))}
        </select>
        <div className="pills">
          <button className={matiere === 'all' ? 'pill active' : 'pill'} onClick={() => setMatiere('all')}>
            Toutes
          </button>
          {matieres.map((m) => (
            <button key={m.id} className={matiere === m.id ? 'pill active' : 'pill'} style={{ '--mc': m.color }} onClick={() => setMatiere(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="empty">Aucune annale pour ces filtres. L'administration en ajoute régulièrement.</div>
      ) : (
        <div className="annales-list">
          {liste.map((a) => {
            const m = MATIERE_BY_ID[a.matiere] || { label: a.matiere, color: '#64748b' };
            return (
              <article className="card annale-card" key={a.id} style={{ '--mc': m.color }}>
                <div className="annale-body">
                  <div className="annale-top">
                    <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>
                      {m.label}
                    </span>
                    <span className="annale-year-txt" style={{ color: m.color }}>
                      Session {a.annee}
                    </span>
                  </div>
                  <h3>{a.titre}</h3>
                  <div className="cours-actions">
                    {a.has_sujet && (
                      <button className="btn btn-primary" onClick={() => setViewer({ a, type: 'sujet' })}>
                        <Icon name="file" size={16} /> Sujet
                      </button>
                    )}
                    {a.has_corrige && (
                      <button className="btn btn-outline" onClick={() => setViewer({ a, type: 'corrige' })}>
                        <Icon name="check" size={16} /> Corrigé
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewer && (
        <Modal title={`${viewer.a.titre} — ${viewer.type === 'sujet' ? 'Sujet' : 'Corrigé'}`} onClose={() => setViewer(null)} wide>
          <PdfViewer url={`/api/eleve/annales/${viewer.a.id}/${viewer.type}?token=${encodeURIComponent(getToken())}`} />
        </Modal>
      )}
    </main>
  );
}
