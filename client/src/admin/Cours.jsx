import { useEffect, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function Cours({ adminScope = 'all' }) {
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

  const filieres = adminScope === 'all' ? ['S2', 'L2'] : [adminScope];

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Cours &amp; PDF</h1>
        <button
          className="btn btn-primary"
          onClick={() =>
            setForm({
              id: null,
              titre: '',
              filiere: adminScope === 'all' ? 'S2' : adminScope,
              matiere: FILIERES[adminScope === 'all' ? 'S2' : adminScope].matieres[0].id,
              niveau: 1,
              description: '',
              youtube_url: '',
              fichier: null,
            })
          }
        >
          <Icon name="plus" size={16} /> Ajouter un cours
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      {adminScope !== 'all' && <div className="alert alert-warn">Périmètre de gestion : <strong>{FILIERES[adminScope]?.label}</strong></div>}
      {!list ? (
        <div className="page-loading">
          <Spinner />
        </div>
      ) : (
        filieres.map((f) => (
          <div key={f}>
            <h2 className="filiere-titre">
              <span className={`filiere-badge fil-${f}`}>{f}</span> {FILIERES[f].label}
            </h2>
            {FILIERES[f].matieres.map((m) => {
              const items = list.filter((c) => c.matiere === m.id && (c.filiere || 'S2') === f);
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
                                  filiere: c.filiere || 'S2',
                                  matiere: c.matiere,
                                  niveau: c.niveau || 1,
                                  description: c.description || '',
                                  youtube_url: c.youtube_id ? `https://www.youtube.com/watch?v=${c.youtube_id}` : '',
                                  fichier: null,
                                  pdfActuel: c.pdf_file,
                                  duree_min: c.duree_min || '',
                                  difficulte: c.difficulte || 0,
                                  acquis: c.acquis || '',
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
            })}
          </div>
        ))
      )}
      {form && (
        <CoursForm
          form={form}
          adminScope={adminScope}
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

function CoursForm({ form, adminScope, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(key, val) {
    setF((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'filiere') {
        next.matiere = FILIERES[val].matieres[0].id;
      }
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('titre', f.titre);
      fd.append('matiere', f.matiere);
      fd.append('filiere', f.filiere);
      fd.append('niveau', String(f.niveau || 1));
      fd.append('description', f.description);
      fd.append('duree_min', String(f.duree_min || ''));
      fd.append('difficulte', String(f.difficulte || 0));
      fd.append('acquis', f.acquis || '');
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

        {adminScope === 'all' && !f.id && (
          <>
            <label className="label">Filière *</label>
            <select className="input" value={f.filiere} onChange={(e) => set('filiere', e.target.value)}>
              <option value="S2">S2 · Sciences</option>
              <option value="L2">L2 · Lettres</option>
              <option value="AR">Arabe · Niveaux</option>
            </select>
          </>
        )}
        {f.id && <div className="alert alert-warn">Filière du cours : <strong>{f.filiere}</strong></div>}

        <label className="label">Matière *</label>
        <select className="input" value={f.matiere} onChange={(e) => set('matiere', e.target.value)}>
          {FILIERES[f.filiere].matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {f.filiere === 'AR' && (
          <>
            <label className="label">Niveau de l'élève *</label>
            <select className="input" value={f.niveau} onChange={(e) => set('niveau', parseInt(e.target.value, 10))}>
              <option value={1}>Niveau 1 (débutant)</option>
              <option value={2}>Niveau 2</option>
              <option value={3}>Niveau 3</option>
            </select>
          </>
        )}

        <label className="label">Description</label>
        <textarea className="input" rows="2" value={f.description} onChange={(e) => set('description', e.target.value)} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Durée estimée (min)</label>
            <input className="input" type="number" min="5" max="240" value={f.duree_min || ''} onChange={(e) => set('duree_min', e.target.value)} placeholder="ex. 25" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Difficulté</label>
            <select className="input" value={f.difficulte || 0} onChange={(e) => set('difficulte', parseInt(e.target.value, 10))}>
              <option value="0">Non précisée</option>
              <option value="1">Facile</option>
              <option value="2">Moyen</option>
              <option value="3">Difficile</option>
            </select>
          </div>
        </div>
        <label className="label">Ce que tu vas apprendre (séparé par ;)</label>
        <textarea className="input" rows="2" value={f.acquis || ''} onChange={(e) => set('acquis', e.target.value)} placeholder="ex. Poser une équation ; Résoudre un système ; Interpréter un graphique" />

        <label className="label">Lien YouTube (vidéo non répertoriée)</label>
        <input
          className="input"
          placeholder="https://www.youtube.com/watch?v=…"
          value={f.youtube_url}
          onChange={(e) => set('youtube_url', e.target.value)}
        />
        <p className="hint">Réglez la visibilité YouTube sur « Non répertoriée » : introuvable en recherche, lisible ici.</p>

        <label className="label">Fiche PDF {f.id ? '(remplacer)' : '(optionnel)'}</label>
        <input className="input" type="file" accept="application/pdf,.pdf" onChange={(e) => set('fichier', e.target.files?.[0] || null)} />
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
