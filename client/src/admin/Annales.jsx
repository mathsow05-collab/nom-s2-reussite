import { useEffect, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function Annales({ adminScope = 'all' }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api('/admin/annales').then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function del(a) {
    if (!window.confirm(`Supprimer « ${a.titre} » ?`)) return;
    await api(`/admin/annales/${a.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Annales (2000 → 2026)</h1>
        <button className="btn btn-primary" onClick={() => setForm({ titre: '', filiere: adminScope === 'all' ? 'S2' : adminScope, matiere: 'maths', annee: 2024, sujet: null, corrige: null })}>
          <Icon name="plus" size={16} /> Ajouter des annales
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      {!list ? (
        <Spinner />
      ) : (
        <div className="cours-list">
          {list.map((a) => (
            <div className="cours-row" key={a.id}>
              <div className="cours-row-main">
                <strong>{a.titre}</strong>
                <div className="cours-row-meta">
                  <span className={`filiere-badge fil-${a.filiere}`}>{a.filiere}</span>
                  <span className="badge badge-soft">{MATIERE_BY_ID[a.matiere]?.label || a.matiere}</span>
                  <span className="badge badge-soft">Session {a.annee}</span>
                  {a.sujet_pdf && <span className="badge badge-soft">Sujet</span>}
                  {a.corrige_pdf && <span className="badge badge-ok">Corrigé</span>}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(a)} title="Supprimer">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          {list.length === 0 && <div className="empty">Aucune annale.</div>}
        </div>
      )}
      {form && (
        <AnnalesForm form={form} adminScope={adminScope} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      )}
    </div>
  );
}

function AnnalesForm({ form, adminScope, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('titre', f.titre);
      fd.append('filiere', f.filiere);
      fd.append('matiere', f.matiere);
      fd.append('annee', String(f.annee));
      if (f.sujet) fd.append('sujet', f.sujet);
      if (f.corrige) fd.append('corrige', f.corrige);
      await api('/admin/annales', { method: 'POST', form: true, body: fd });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Ajouter des annales" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Titre *</label>
        <input className="input" placeholder="Ex. Bac S2 2020 – Mathématiques" value={f.titre} onChange={(e) => set('titre', e.target.value)} autoFocus />
        {adminScope === 'all' && (
          <>
            <label className="label">Filière</label>
            <select className="input" value={f.filiere} onChange={(e) => set('filiere', e.target.value)}>
              <option value="S2">S2</option>
              <option value="L2">L2</option>
            </select>
          </>
        )}
        <label className="label">Matière</label>
        <select className="input" value={f.matiere} onChange={(e) => set('matiere', e.target.value)}>
          {FILIERES[f.filiere].matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="label">Année (2000-2026) *</label>
        <input className="input" type="number" min="2000" max="2026" value={f.annee} onChange={(e) => set('annee', parseInt(e.target.value, 10))} />
        <label className="label">PDF du sujet</label>
        <input className="input" type="file" accept=".pdf" onChange={(e) => set('sujet', e.target.files?.[0] || null)} />
        <label className="label">PDF du corrigé</label>
        <input className="input" type="file" accept=".pdf" onChange={(e) => set('corrige', e.target.files?.[0] || null)} />
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !f.titre.trim()}>
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
