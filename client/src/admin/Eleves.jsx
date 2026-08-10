import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner, CopyField } from '../ui.jsx';

const CLASSES = ['Seconde S2', 'Première S2', 'Terminale S2'];

export default function Eleves() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState(null);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api('/admin/eleves')
      .then(setList)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  async function act(eleve, action) {
    if (action === 'supprimer' && !window.confirm(`Supprimer définitivement ${eleve.prenom} ${eleve.nom} ?`)) return;
    if (action === 'revoquer' && !window.confirm('Suspendre cet ID et déconnecter immédiatement l’élève ?')) return;
    if (action === 'regenerer' && !window.confirm('Régénérer l’ID ? L’ancien ID deviendra inutilisable et l’élève sera déconnecté.')) return;
    setBusyId(eleve.id);
    setErr(null);
    try {
      if (action === 'supprimer') {
        await api(`/admin/eleves/${eleve.id}`, { method: 'DELETE' });
      } else {
        const r = await api(`/admin/eleves/${eleve.id}/${action}`, { method: 'POST' });
        if (action === 'regenerer' && r.eleve_id) setNewId(r.eleve_id);
      }
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (list || []).filter((e) => {
    const s = `${e.eleve_id} ${e.prenom} ${e.nom} ${e.classe}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Élèves &amp; accès</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} /> Générer un ID
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      <input className="input search" placeholder="Rechercher (nom, ID, classe)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!list ? (
        <div className="page-loading">
          <Spinner />
        </div>
      ) : (
        <div className="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>ID unique</th>
                <th>Élève</th>
                <th>Classe</th>
                <th>Statut</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.eleve_id}</td>
                  <td>
                    {e.prenom} {e.nom}
                  </td>
                  <td>{e.classe}</td>
                  <td>
                    {!e.actif ? (
                      <span className="badge badge-danger">Révoqué</span>
                    ) : e.en_session ? (
                      <span className="badge badge-ok">En session</span>
                    ) : (
                      <span className="badge badge-soft">Actif</span>
                    )}
                  </td>
                  <td className="td-actions">
                    {e.actif ? (
                      <>
                        <button className="btn btn-sm btn-danger-outline" disabled={busyId === e.id} onClick={() => act(e, 'revoquer')}>
                          Révoquer
                        </button>
                        <button className="btn btn-sm btn-ghost" disabled={busyId === e.id} onClick={() => act(e, 'regenerer')} title="Nouvel ID (si l'ancien a fuité)">
                          <Icon name="refresh" size={14} />
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-outline" disabled={busyId === e.id} onClick={() => act(e, 'reactiver')}>
                        Réactiver
                      </button>
                    )}
                    <button className="btn btn-sm btn-ghost icon-only" disabled={busyId === e.id} onClick={() => act(e, 'supprimer')} title="Supprimer">
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">
                    Aucun élève trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateEleve
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setNewId(id);
            load();
          }}
        />
      )}

      {newId && (
        <Modal title="ID généré avec succès" onClose={() => setNewId(null)}>
          <p className="muted">Transmettez cet ID à l'élève de façon sécurisée :</p>
          <CopyField value={newId} />
          <div className="alert alert-warn">
            <Icon name="alert" size={16} /> Chaque ID donne accès à la plateforme. Ne le partagez pas publiquement.
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateEleve({ onClose, onCreated }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [classe, setClasse] = useState('Terminale S2');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api('/admin/eleves', { method: 'POST', body: { prenom, nom, classe } });
      onCreated(r.eleve_id);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Nouvel élève" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Prénom</label>
        <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoFocus />
        <label className="label">Nom</label>
        <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} />
        <label className="label">Classe</label>
        <select className="input" value={classe} onChange={(e) => setClasse(e.target.value)}>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !prenom.trim() || !nom.trim()}>
            {busy ? 'Génération…' : "Générer l'ID"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
