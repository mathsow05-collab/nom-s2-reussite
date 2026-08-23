import { useEffect, useState } from 'react';
import { api, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';

export default function FlashAdmin() {
  const [decks, setDecks] = useState(null);
  const [titre, setTitre] = useState('');
  const [filiere, setFiliere] = useState('all');
  const [matiere, setMatiere] = useState('');
  const [lignes, setLignes] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/admin/flash').then(setDecks);
  useEffect(() => {
    load();
  }, []);

  async function creer(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/admin/flash', { method: 'POST', body: { titre, filiere, matiere, lignes } });
      setTitre('');
      setLignes('');
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Flashcards</h1>
      <p className="muted">Crée des paquets de cartes recto/verso : les élèves les révisent en répétition espacée.</p>
      <section className="panel">
        <h2>Nouveau paquet</h2>
        <form onSubmit={creer}>
          <label className="label">Titre *</label>
          <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. : Vocabulaire anglais — unité 3" />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Filière</label>
              <select className="input" value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                <option value="all">Toutes</option>
                <option value="S2">S2</option>
                <option value="L2">L2</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Matière (optionnel)</label>
              <select className="input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
                <option value="">—</option>
                {Object.entries(MATIERE_BY_ID).map(([id, m]) => (
                  <option key={id} value={id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="label">Cartes — une par ligne, format « recto | verso » *</label>
          <textarea
            className="input"
            rows="6"
            required
            value={lignes}
            onChange={(e) => setLignes(e.target.value)}
            placeholder={'to eat | manger\nbook | livre'}
          />
          {err && <div className="alert alert-danger">{err}</div>}
          <button className="btn btn-primary" disabled={busy}>
            <Icon name="layers" size={15} /> Publier le paquet
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Paquets publiés</h2>
        {!decks && <p className="muted">Chargement…</p>}
        {decks?.map((d) => (
          <div className="hist3" key={d.id}>
            <span className="hist3-ico" style={{ background: '#e8eefb', color: '#1d4ed8' }}>
              <Icon name="layers" size={16} />
            </span>
            <div className="hist3-txt">
              <strong>{d.titre}</strong>
              <small>
                {d.filiere} · {d.nb} cartes
              </small>
            </div>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await api(`/admin/flash/${d.id}`, { method: 'DELETE' });
                load();
              }}
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
