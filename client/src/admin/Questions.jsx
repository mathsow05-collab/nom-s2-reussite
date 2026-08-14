import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

export default function Questions({ adminScope = 'all' }) {
  const [list, setList] = useState(null);
  const [rep, setRep] = useState({});

  const load = () => api('/admin/questions').then(setList);
  useEffect(() => {
    load();
  }, []);

  async function repondre(q) {
    const texte = (rep[q.id] || '').trim();
    if (!texte) return;
    await api(`/admin/questions/${q.id}/repondre`, { method: 'POST', body: { reponse: texte } });
    load();
  }

  return (
    <div className="admin-page">
      <h1>Questions des élèves</h1>
      <p className="muted">Les questions arrivent ici ; ta réponse part instantanément sur l'espace de l'élève.</p>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="empty">Aucune question pour le moment.</div>
      ) : (
        <div className="qa-list">
          {list.map((q) => (
            <div className={q.statut === 'repondu' ? 'qa-item ok-border' : 'qa-item'} key={q.id}>
              <div className="qa-q">
                <span className={`filiere-badge fil-${q.filiere || 'S2'}`}>{q.filiere || 'S2'}</span>{' '}
                <strong>{q.eleve_ref}</strong>
                {q.sujet && <span className="muted"> · {q.sujet}</span>}
                <p style={{ margin: '6px 0 0' }}>{q.message}</p>
              </div>
              {q.statut === 'repondu' ? (
                <div className="qa-r">
                  <Icon name="check" size={15} /> {q.reponse}
                </div>
              ) : (
                <div className="qa-reply">
                  <textarea className="input" rows="2" placeholder="Ta réponse…" value={rep[q.id] || ''} onChange={(e) => setRep((s) => ({ ...s, [q.id]: e.target.value }))} />
                  <button className="btn btn-primary btn-sm" onClick={() => repondre(q)}>
                    <Icon name="chat" size={14} /> Répondre (envoi immédiat)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
