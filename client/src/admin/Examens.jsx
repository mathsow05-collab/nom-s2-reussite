import { useEffect, useState } from 'react';
import { api, getToken, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';

const DL = { 60: '1 h', 120: '2 h', 180: '3 h' };

export default function ExamensAdmin() {
  const [list, setList] = useState(null);
  const [tents, setTents] = useState(null);
  const [openEx, setOpenEx] = useState(null);
  const [titre, setTitre] = useState('');
  const [matiere, setMatiere] = useState('');
  const [filiere, setFiliere] = useState('S2');
  const [consignes, setConsignes] = useState('');
  const [durees, setDurees] = useState({ 60: false, 120: true, 180: false });
  const [sujet, setSujet] = useState(null);
  const [corrige, setCorrige] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [corr, setCorr] = useState({});

  const load = () => api('/admin/examens').then(setList);
  useEffect(() => {
    load();
  }, []);

  async function creer(e) {
    e.preventDefault();
    setErr(null);
    if (!sujet) return setErr('Le PDF du sujet est obligatoire.');
    const durs = Object.entries(durees).filter(([, v]) => v).map(([k]) => k).join(';');
    if (!durs) return setErr('Choisissez au moins une durée.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('titre', titre);
      fd.append('matiere', matiere);
      fd.append('filiere', filiere);
      fd.append('consignes', consignes);
      fd.append('durees', durs);
      fd.append('sujet', sujet);
      if (corrige) fd.append('corrige', corrige);
      const res = await fetch(`/api/admin/examens?token=${encodeURIComponent(getToken())}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur.');
      setTitre(''); setConsignes(''); setSujet(null); setCorrige(null);
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function voirCopies(ex) {
    setOpenEx(ex);
    setTents(null);
    api(`/admin/examens/${ex.id}/tentatives`).then(setTents);
  }

  async function corriger(tid) {
    const c = corr[tid] || {};
    await api(`/admin/tentatives/${tid}/corriger`, { method: 'POST', body: { score: c.score || '', commentaire: c.com || '' } });
    voirCopies(openEx);
  }

  return (
    <main className="container" style={{ padding: '16px' }}>
      <section className="panel">
        <h2>Publier un examen</h2>
        <form onSubmit={creer}>
          <label className="label">Titre *</label>
          <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : Bac blanc maths — session août" />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Matière</label>
              <select className="input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
                <option value="">Général</option>
                {Object.entries(MATIERE_BY_ID).map(([id, m]) => (
                  <option key={id} value={id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Filière</label>
              <select className="input" value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                <option value="S2">S2</option>
                <option value="L2">L2</option>
                <option value="all">Toutes</option>
              </select>
            </div>
          </div>
          <label className="label">Durées proposées à l'élève</label>
          <div className="pills">
            {Object.entries(DL).map(([k, v]) => (
              <button type="button" key={k} className={durees[k] ? 'pill active' : 'pill'} onClick={() => setDurees((d) => ({ ...d, [k]: !d[k] }))}>
                {v}
              </button>
            ))}
          </div>
          <label className="label">Consignes (affichées avant le sujet)</label>
          <textarea className="input" rows="2" value={consignes} onChange={(e) => setConsignes(e.target.value)} placeholder="Ex. : 4 exercices, calculatrice autorisée…" />
          <label className="label">PDF du sujet *</label>
          <input type="file" accept="application/pdf" onChange={(e) => setSujet(e.target.files[0])} />
          <label className="label">PDF du corrigé (recommandé)</label>
          <input type="file" accept="application/pdf" onChange={(e) => setCorrige(e.target.files[0])} />
          {err && <div className="alert alert-danger">{err}</div>}
          <button className="btn btn-primary" disabled={busy}>
            <Icon name="upload" size={15} /> Publier l'examen
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Examens publiés</h2>
        {!list && <p className="muted">Chargement…</p>}
        {list && list.length === 0 && <p className="muted">Aucun examen publié.</p>}
        {list?.map((ex) => (
          <div className="hist3" key={ex.id}>
            <span className="hist3-ico" style={{ background: '#e8eefb', color: '#1d4ed8' }}>
              <Icon name="clock" size={16} />
            </span>
            <div className="hist3-txt">
              <strong>{ex.titre}</strong>
              <small>
                {ex.filiere} · {ex.durees.split(';').map((d) => DL[d]).join('/')} · {MATIERE_BY_ID[ex.matiere]?.label || 'Général'}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline" onClick={() => voirCopies(ex)}>
                Copies
              </button>
              <button className="btn btn-ghost" onClick={async () => { await api(`/admin/examens/${ex.id}`, { method: 'DELETE' }); load(); }}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </section>

      {openEx && (
        <section className="panel">
          <h2>Copies — {openEx.titre}</h2>
          {!tents && <p className="muted">Chargement…</p>}
          {tents && tents.length === 0 && <p className="muted">Aucune copie pour l'instant.</p>}
          {tents?.map((t) => (
            <div className="card s3card" key={t.id} style={{ marginBottom: 10 }}>
              <div className="hist3" style={{ border: 'none', padding: 0 }}>
                <div className="hist3-txt">
                  <strong>{t.prenom} {t.nom} <span className="muted small">({t.classe})</span></strong>
                  <small>
                    Statut : {t.statut === 'en_cours' ? 'en cours' : t.statut === 'rendu' ? 'copie rendue' : `corrigé — ${t.score}`}
                  </small>
                </div>
                {t.copie_pdf && (
                  <a className="btn btn-outline" href={`/api/admin/examens/copie/${t.id}?token=${encodeURIComponent(getToken())}`} target="_blank" rel="noreferrer">
                    <Icon name="file" size={15} /> Voir la copie
                  </a>
                )}
              </div>
              {t.statut !== 'en_cours' && t.statut !== 'corrige' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    style={{ maxWidth: 110 }}
                    placeholder="Note (ex. 12/20)"
                    value={(corr[t.id] || {}).score || ''}
                    onChange={(e) => setCorr((c) => ({ ...c, [t.id]: { ...c[t.id], score: e.target.value } }))}
                  />
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 180 }}
                    placeholder="Commentaire de correction…"
                    value={(corr[t.id] || {}).com || ''}
                    onChange={(e) => setCorr((c) => ({ ...c, [t.id]: { ...c[t.id], com: e.target.value } }))}
                  />
                  <button className="btn btn-primary" onClick={() => corriger(t.id)}>
                    Valider la correction
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
