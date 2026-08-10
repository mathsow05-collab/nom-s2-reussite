import { useEffect, useState } from 'react';
import { api, MATIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function Cours() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () =>
    api('/admin/cours')
      .then(setList)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  async function del(c) {
    if (!window.confirm(`Supprimer le cours « ${c.titre} » ?`)) return;
    try {
      await api(`/admin/cours/${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Cours &amp; PDF</h1>
        <button
          className="btn btn-primary"
          onClick={() => setForm({ id: null, titre: '', matiere: 'maths', description: '', youtube_url: '', fichier: null })}
        >
          <Icon name="plus" size={16} /> Ajouter un cours
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      {!list ? (
        <div className="page-loading">
          <Spinner />
        </div>
      ) : (
        MATIERES.map((m) => {
          const items = list.filter((c) => c.matiere === m.id);
          return (
            <section className="panel" key={m.id}>
              <h2 style={{ color: m.color }}>{m.label}</h2>
              {items.length === 0 ? (
                <p className="muted">Aucun cours publié dans cette matière.</p>
              ) : (
                <div className="cours-list">
                  {items.map((c) => (
                    <div className="cours-row" key={c.id}>
                      <div className="cours-row-main">
                        <strong>{c.titre}</strong>
                        <div className="cours-row-meta">
                          {c.youtube_id && (
                            <span className="badge badge-soft">
                              <Icon name="video" size={12} /> Vidéo
                            </span>
                          )}
                          {c.pdf_file && (
                            <span className="badge badge-soft">
                              <Icon name="file" size={12} /> PDF
                            </span>
                          )}
                          {c.description && <span className="muted clamp1">{c.description}</span>}
                        </div>
                      </div>
                      <div className="td-actions">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            setForm({
                              id: c.id,
                              titre: c.titre,
                              matiere: c.matiere,
                              description: c.description || '',
                              youtube_url: c.youtube_id ? `https://www.youtube.com/watch?v=${c.youtube_id}` : '',
                              fichier: null,
                              pdfActuel: c.pdf_file,
                            })
                          }
                        >
                          <Icon name="edit" size={14} /> Modifier
                        </button>
                        <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(c)} title="Supprimer">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
      {form && (
        <CoursForm
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

function CoursForm({ form, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(key, val) {
    setF((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('titre', f.titre);
      fd.append('matiere', f.matiere);
      fd.append('description', f.description);
      fd.append('youtube_url', f.youtube_url);
      if (f.fichier) fd.append('pdf', f.fichier);
      if (f.id) await api(`/admin/cours/${f.id}`, { method: 'PUT', form: true, body: fd });
      else await api('/admin/cours', { method: 'POST', form: true, body: fd });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={f.id ? 'Modifier le cours' : 'Ajouter un cours'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">Titre *</label>
        <input className="input" value={f.titre} onChange={(e) => set('titre', e.target.value)} autoFocus />

        <label className="label">Matière *</label>
        <select className="input" value={f.matiere} onChange={(e) => set('matiere', e.target.value)}>
          {MATIERES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <label className="label">Description</label>
        <textarea className="input" rows="2" value={f.description} onChange={(e) => set('description', e.target.value)} />

        <label className="label">Lien YouTube (vidéo non répertoriée)</label>
        <input
          className="input"
          placeholder="https://www.youtube.com/watch?v=…"
          value={f.youtube_url}
          onChange={(e) => set('youtube_url', e.target.value)}
        />
        <p className="hint">
          Astuce : sur YouTube, réglez la visibilité de la vidéo sur « Non répertoriée » pour qu'elle soit introuvable
          en recherche mais lisible ici.
        </p>

        <label className="label">Fiche PDF {f.id ? '(remplacer)' : '(optionnel)'}</label>
        <input
          className="input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => set('fichier', e.target.files?.[0] || null)}
        />
        {f.pdfActuel && !f.fichier && <p className="hint">PDF actuel conservé : {f.pdfActuel}</p>}

        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !f.titre.trim()}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
