import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function Agenda() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => api('/admin/echeances').then(setList);
  useEffect(() => {
    load();
  }, []);

  async function del(e) {
    if (!window.confirm(`Supprimer « ${e.titre} » ?`)) return;
    await api(`/admin/echeances/${e.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Agenda des échéances</h1>
        <button className="btn btn-primary" onClick={() => setForm({ titre: '', categorie: 'bac', date_debut: '', date_fin: '', lieu: '', description: '', conseils: '' })}>
          <Icon name="plus" size={16} /> Nouvelle échéance
        </button>
      </div>
      {!list ? (
        <Spinner />
      ) : (
        <div className="cours-list">
          {list.map((e) => (
            <div className="cours-row" key={e.id}>
              <div className="cours-row-main">
                <strong>{e.titre}</strong>
                <div className="cours-row-meta muted small">
                  {e.date_debut}
                  {e.date_fin ? ` → ${e.date_fin}` : ''} · {e.categorie}
                  {e.lieu ? ` · ${e.lieu}` : ''}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(e)} title="Supprimer">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {list.length === 0 && <div className="empty">Aucune échéance.</div>}
        </div>
      )}
      {form && (
        <AgendaForm form={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      )}
    </div>
  );
}

function AgendaForm({ form, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/admin/echeances', { method: 'POST', body: f });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Nouvelle échéance" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Titre *</label>
        <input className="input" value={f.titre} onChange={(e) => set('titre', e.target.value)} autoFocus />
        <label className="label">Catégorie</label>
        <select className="input" value={f.categorie} onChange={(e) => set('categorie', e.target.value)}>
          <option value="bac">Bac</option>
          <option value="concours">Concours</option>
          <option value="examen">Examen / composition</option>
          <option value="autre">Autre</option>
        </select>
        <label className="label">Date de début *</label>
        <input className="input" type="date" value={f.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
        <label className="label">Date de fin</label>
        <input className="input" type="date" value={f.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
        <label className="label">Lieu</label>
        <input className="input" value={f.lieu} onChange={(e) => set('lieu', e.target.value)} />
        <label className="label">Description</label>
        <textarea className="input" rows="2" value={f.description} onChange={(e) => set('description', e.target.value)} />
        <label className="label">Conseils (« ; » entre chaque)</label>
        <textarea className="input" rows="2" value={f.conseils} onChange={(e) => set('conseils', e.target.value)} />
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !f.titre.trim() || !f.date_debut}>
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
