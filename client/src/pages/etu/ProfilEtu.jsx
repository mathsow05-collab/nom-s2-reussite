import { useState } from 'react';
import Icon from '../../Icon.jsx';
import { FILIERES_ETU } from '../../data/etu.js';

export default function ProfilEtu({ me, logout, onJur, onAvatar }) {
  const [copie, setCopie] = useState(false);
  const fil = FILIERES_ETU[me.filiere] || { label: me.filiere, ico: '🎓' };

  function copierId() {
    try {
      navigator.clipboard?.writeText(me.etu_id);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="container">
      <section className="banner">
        <h2>👤 Mon profil</h2>
        <p>Compte étudiant gratuit — garde ton ID pour te reconnecter.</p>
      </section>

      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className={`anime-av i${me.avatar?.startsWith('an:') ? me.avatar.slice(3) : 0}`} style={{ width: 50, height: 50, borderRadius: '50%' }} />
        <div>
          <strong>{me.prenom} {me.nom}</strong>
          <div className="muted small">{fil.ico} {fil.label}{me.universite ? ` · ${me.universite}` : ''}</div>
          <div className="muted small mono">{me.etu_id}</div>
        </div>
        <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={copierId}>
          {copie ? '✔ Copié !' : 'Copier mon ID'}
        </button>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <strong>Choisis ton avatar</strong>
        <div className="avatar-grid" style={{ marginTop: 8 }}>
          {Array.from({ length: 8 }, (_, i) => `an:${i}`).map((a) => (
            <button key={a} className={me.avatar === a ? 'avatar-pick actif' : 'avatar-pick'} onClick={() => onAvatar(a)}>
              <span className={`anime-av i${i}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onJur}>📄 Conditions d'utilisation · Confidentialité</button>
        <button className="btn btn-primary" onClick={logout}>
          <Icon name="user" size={15} /> Déconnexion
        </button>
      </div>
    </main>
  );
}
