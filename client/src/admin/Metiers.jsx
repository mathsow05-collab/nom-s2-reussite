import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function MetiersAdmin({ adminScope = 'all' }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () =>
    api('/admin/metiers')
      .then(setList)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  async function del(m) {
    if (!window.confirm(`Supprimer la fiche « ${m.titre} » ?`)) return;
    try {
      await api(`/admin/metiers/${m.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Catalogue métiers (orientation S2)</h1>
        <button
          className="btn btn-primary"
          onClick={() => setForm({ id: null, titre: '', domaine: '', description: '', parcours: '', debouches: '', image: null, imageUrl: '', filiere: adminScope === 'all' ? 'S2' : adminScope })}
        >
          <Icon name="plus" size={16} /> Nouvelle fiche métier
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      {!list ? (
        <div className="page-loading">
          <Spinner />
        </div>
      ) : (
        <div className="grid-cards">
          {list.map((m) => (
            <article className="card metier-admin-card" key={m.id}>
              {m.image ? (
                <img className="metier-thumb" src={m.image} alt={m.titre} loading="lazy" />
              ) : (
                <div className="metier-thumb metier-thumb-empty">
                  <Icon name="cap" size={30} />
                </div>
              )}
              <div className="metier-admin-body">
                <div>
                  <span className={`filiere-badge fil-${m.filiere || 'S2'}`}>{m.filiere || 'S2'}</span>{' '}
                  {m.domaine && <span className="badge badge-soft">{m.domaine}</span>}
                </div>
                <h3>{m.titre}</h3>
                <p className="muted clamp2">{m.description}</p>
                <div className="td-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() =>
                      setForm({
                        id: m.id,
                        titre: m.titre,
                        domaine: m.domaine || '',
                        description: m.description || '',
                        parcours: m.parcours || '',
                        debouches: (m.debouches || '').split(';').join('\n'),
                        image: null,
                        imageUrl: m.image || '',
                        filiere: m.filiere || 'S2',
                      })
                    }
                  >
                    <Icon name="edit" size={14} /> Modifier
                  </button>
                  <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(m)} title="Supprimer">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {form && (
        <MetierForm
          form={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MetierForm({ form, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set(key, val) {
    setF((prev) => ({ ...prev, [key]: val }));
  }  async function onImage(file) {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api('/admin/upload-image', { method: 'POST', form: true, body: fd });
      set('imageUrl', r.url);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = {
        titre: f.titre,
        domaine: f.domaine,
        description: f.description,
        parcours: f.parcours,
        filiere: f.filiere,
        debouches: f.debouches
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean)
          .join(';'),
        image: f.imageUrl || null,
      };
      if (f.id) await api(`/admin/metiers/${f.id}`, { method: 'PUT', body });
      else await api('/admin/metiers', { method: 'POST', body });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={f.id ? 'Modifier la fiche métier' : 'Nouvelle fiche métier'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Titre du métier *</label>
        <input className="input" value={f.titre} onChange={(e) => set('titre', e.target.value)} autoFocus />

        <label className="label">Filière</label>
        <select className="input" value={f.filiere} onChange={(e) => set('filiere', e.target.value)} disabled={!!f.id}>
          <option value="S2">S2 · Sciences</option>
          <option value="L2">L2 · Lettres</option>
        </select>
        <label className="label">Domaine</label>
        <input className="input" placeholder="Santé, Numérique, Droit…" value={f.domaine} onChange={(e) => set('domaine', e.target.value)} />

        <label className="label">Description</label>
        <textarea className="input" rows="4" value={f.description} onChange={(e) => set('description', e.target.value)} />

        <label className="label">Parcours d'études après le Bac</label>
        <textarea className="input" rows="3" placeholder="Ex. : Bac S2 → EPT génie civil, 5 ans…" value={f.parcours} onChange={(e) => set('parcours', e.target.value)} />
        <label className="label">Débouchés (un par ligne)</label>
        <textarea className="input" rows="3" value={f.debouches} onChange={(e) => set('debouches', e.target.value)} />

        <label className="label">Image</label>
        {f.imageUrl && <img className="metier-thumb" src={f.imageUrl} alt="Aperçu" />}
        <input className="input" type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} />
        {uploading && <p className="hint">Envoi de l'image…</p>}

        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || uploading || !f.titre.trim()}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
