import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import Icon from '../../Icon.jsx';
import { Modal, Spinner } from '../../ui.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

export default function Groupes({ me }) {
  const [list, setList] = useState(null);
  const [fil, setFil] = useState(me.filiere);
  const [type, setType] = useState('all');
  const [creer, setCreer] = useState(false);
  const [ouvert, setOuvert] = useState(null);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({ titre: '', filiere: me.filiere, type: 'etude', description: '' });

  const maj = useCallback(() => {
    const qs = new URLSearchParams();
    if (fil !== 'all') qs.set('filiere', fil);
    if (type !== 'all') qs.set('type', type);
    api(`/etudiant/groupes?${qs}`).then(setList).catch(() => {});
  }, [fil, type]);

  useEffect(() => {
    maj();
  }, [maj]);

  async function rejoindre(g) {
    try {
      await api(`/etudiant/groupes/${g.id}/rejoindre`, { method: 'POST', body: {} });
      maj();
      setOuvert({ ...g, dedans: 1 });
    } catch (e) {
      setErr(e.message);
    }
  }

  async function creerGroupe(e) {
    e.preventDefault();
    setErr(null);
    try {
      await api('/etudiant/groupes', { method: 'POST', body: f });
      setCreer(false);
      setF({ titre: '', filiere: me.filiere, type: 'etude', description: '' });
      maj();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <main className="container">
      <section className="banner">
        <h2>👥 Groupes de travail</h2>
        <p>Rejoins un groupe de ta filière, ou monte un groupe-projet entre filières différentes (exposé, mémoire, concours…). Max 30 membres.</p>
      </section>

      <div className="pills">
        <button className={fil === me.filiere ? 'pill active' : 'pill'} onClick={() => setFil(me.filiere)}>Ma filière</button>
        <button className={fil === 'all' ? 'pill active' : 'pill'} onClick={() => setFil('all')}>Toutes</button>
        <button className={type === 'etude' ? 'pill active' : 'pill'} onClick={() => setType(type === 'etude' ? 'all' : 'etude')}>📚 Étude</button>
        <button className={type === 'projet' ? 'pill active' : 'pill'} onClick={() => setType(type === 'projet' ? 'all' : 'projet')}>🚀 Projet</button>
        <button className="pill" style={{ marginLeft: 'auto' }} onClick={() => setCreer(true)}>+ Créer un groupe</button>
      </div>

      {!list ? (
        <div className="page-loading"><Spinner /></div>
      ) : list.length === 0 ? (
        <div className="empty">Aucun groupe pour l'instant — sois le premier ou la première à en créer un !</div>
      ) : (
        <div className="grid-cards">
          {list.map((g) => (
            <article className="card cours-card" key={g.id}>
              <div className="cours-top">
                <span className="badge-pastel">{g.type === 'projet' ? '🚀 Projet' : '📚 Étude'} · {(FILIERES_ETU[g.filiere] || {}).label || g.filiere}</span>
                <span className="muted small"><Icon name="users" size={12} /> {g.membres}/30</span>
              </div>
              <h3>{g.titre}</h3>
              {g.description && <p className="muted clamp2">{g.description}</p>}
              <div className="cours-actions">
                {g.dedans ? (
                  <button className="btn btn-primary" onClick={() => setOuvert(g)}>
                    <Icon name="chat" size={15} /> Ouvrir la discussion
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={() => rejoindre(g)}>
                    <Icon name="users" size={15} /> Rejoindre
                  </button>
                )}
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>Créé par {g.createur || '—'}</p>
            </article>
          ))}
        </div>
      )}
      {err && <div className="alert alert-danger" style={{ marginTop: 10 }}>{err}</div>}

      {creer && (
        <Modal title="Créer un groupe" onClose={() => setCreer(false)}>
          <form onSubmit={creerGroupe} style={{ display: 'grid', gap: 8 }}>
            <div className="pills">
              <button type="button" className={f.type === 'etude' ? 'pill active' : 'pill'} onClick={() => setF({ ...f, type: 'etude' })}>📚 Groupe d'étude</button>
              <button type="button" className={f.type === 'projet' ? 'pill active' : 'pill'} onClick={() => setF({ ...f, type: 'projet' })}>🚀 Projet (multi-filières ok)</button>
            </div>
            <input className="input" placeholder="Nom du groupe *" value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} required />
            <select className="input" value={f.filiere} onChange={(e) => setF({ ...f, filiere: e.target.value })}>
              {Object.entries(FILIERES_ETU).map(([k, v]) => (
                <option key={k} value={k}>{v.ico} {v.label}</option>
              ))}
            </select>
            <textarea className="input" rows={3} placeholder="Description : objectif, matières, rythme des rencontres…" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            {err && <div className="alert alert-danger">{err}</div>}
            <button className="btn btn-primary">Créer le groupe</button>
          </form>
        </Modal>
      )}

      {ouvert && <ChatGroupe g={ouvert} me={me} onQuit={() => { maj(); setOuvert(null); }} />}
    </main>
  );
}

function ChatGroupe({ g, me, onQuit }) {
  const [msgs, setMsgs] = useState(null);
  const [txt, setTxt] = useState('');
  const [err, setErr] = useState(null);

  const maj = useCallback(() => {
    api(`/etudiant/groupes/${g.id}/messages`).then(setMsgs).catch(() => {});
  }, [g.id]);

  useEffect(() => {
    maj();
    const t = setInterval(maj, 5000);
    return () => clearInterval(t);
  }, [maj]);

  async function envoyer(e) {
    e.preventDefault();
    if (!txt.trim()) return;
    try {
      await api(`/etudiant/groupes/${g.id}/messages`, { method: 'POST', body: { texte: txt } });
      setTxt('');
      maj();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function quitter() {
    await api(`/etudiant/groupes/${g.id}/quitter`, { method: 'POST', body: {} }).catch(() => {});
    onQuit();
  }

  return (
    <Modal title={`${g.titre} — discussion`} onClose={onQuit} wide>
      <div style={{ maxHeight: '45vh', overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 10 }}>
        {!msgs && <p className="muted">Chargement…</p>}
        {msgs?.length === 0 && <p className="muted">Aucun message — lance la discussion !</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={m.etudiant_id === me.id ? 'etu-msg moi' : 'etu-msg'}>
            <small className="muted">{m.prenom} · {(FILIERES_ETU[m.filiere] || {}).label || m.filiere}</small>
            <p>{m.texte}</p>
          </div>
        ))}
      </div>
      <form onSubmit={envoyer} style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Ton message…" value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={600} />
        <button className="btn btn-primary">Envoyer</button>
      </form>
      {err && <div className="alert alert-danger" style={{ marginTop: 8 }}>{err}</div>}
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={quitter}>
        Quitter ce groupe
      </button>
    </Modal>
  );
}
