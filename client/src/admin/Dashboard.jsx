import { useEffect, useState } from 'react';
import { api, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

function fmtDate(s) {
  try {
    const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api('/admin/stats')
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!stats)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  return (
    <div className="admin-page">
      <h1>Tableau de bord</h1>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-num">{stats.totalEleves}</div>
          <div className="stat-label">
            <Icon name="users" /> Élèves inscrits
          </div>
        </div>
        <div className="stat stat-ok">
          <div className="stat-num">{stats.sessionsActives}</div>
          <div className="stat-label">
            <Icon name="eye" /> Sessions actives
          </div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.totalCours}</div>
          <div className="stat-label">
            <Icon name="book" /> Cours en ligne
          </div>
        </div>
        <div className="stat stat-warn">
          <div className="stat-num">{stats.revoques}</div>
          <div className="stat-label">
            <Icon name="shield" /> Accès suspendus
          </div>
        </div>
      </div>

      <section className="panel">
        <h2>Contenu par matière</h2>
        <div className="matiere-stats">
          {Object.keys(stats.parMatiere).length === 0 && <p className="muted">Aucun cours publié.</p>}
          {Object.entries(stats.parMatiere).map(([m, n]) => (
            <div key={m} className="ms-row">
              <span className="badge" style={{ background: MATIERE_BY_ID[m]?.color || '#64748b' }}>
                {MATIERE_BY_ID[m]?.label || m}
              </span>
              <span>
                {n} cours · {stats.totalMetiers} fiches métiers au catalogue
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Derniers événements (logs de connexion et d'audit)</h2>
        {stats.derniersLogs.length === 0 ? (
          <p className="muted">Aucun événement enregistré.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Élève</th>
                  <th>Détails</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {stats.derniersLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">{fmtDate(l.created_at)}</td>
                    <td>
                      <code>{l.action}</code>
                    </td>
                    <td>{l.eleve_ref || '—'}</td>
                    <td className="muted">{l.details || '—'}</td>
                    <td className="muted">{l.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
