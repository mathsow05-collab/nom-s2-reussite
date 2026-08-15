import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import { CATS } from '../pages/Culture.jsx';

export default function CultureAdmin() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api('/admin/culture').then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function del(c) {
    if (!window.confirm(`Supprimer « ${c.titre} » ?`)) return;
    await api(`/admin/culture/${c.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Culture du monde (L2)</h1>
        <button className="btn btn-primary" onClick={() => setForm({ categorie: 'actualite', titre: '', contenu: '' })}>
          <Icon name="plus" size={16} /> Publier aujourd'hui
        </button>
      </div>
      <p className="muted">Une publication par jour garde tes élèves curieux : actualité, histoire, méthodes, figures…</p>
      {err && <div className="alert alert-danger">{err}</div>}
      {!list ? (
        <Spinner />
      ) : (
        <div className="cours-list">
          {list.map((c) => (
            <div className="cours-row" key={c.id}>
              <div className="cours-row-main">
                <strong>{c.titre}</strong>
                <div className="cours-row-meta muted small">
                  {c.date_publi} · {(CATS[c.categorie] || CATS.actualite).icon} {(CATS[c.categorie] || CATS.actualite).label}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(c)} title="Supprimer">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {list.length === 0 && <div className="empty">Aucune publication.</div>}
        </div>
      )}
      {form && (
        <CultureForm form={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      )}
    </div>
  );
}

function CultureForm({ form, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/admin/culture', { method: 'POST', body: f });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Publication du jour" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Catégorie</label>
        <select className="input" value={f.categorie} onChange={(e) => set('categorie', e.target.value)}>
          {Object.entries(CATS).map(([id, c]) => (
            <option key={id} value={id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        <label className="label">Titre *</label>
        <input className="input" value={f.titre} onChange={(e) => set('titre', e.target.value)} autoFocus />
        <label className="label">Contenu *</label>
        <textarea className="input" rows="5" value={f.contenu} onChange={(e) => set('contenu', e.target.value)} />
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !f.titre.trim() || !f.contenu.trim()}>
            Publier (daté d'aujourd'hui)
          </button>
        </div>
      </form>
    </Modal>
  );
}
