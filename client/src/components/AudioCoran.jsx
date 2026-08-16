import { useState } from 'react';
import { RECITERS, SOURATES, audioSurahUrl } from '../data-coran.js';
import Icon from '../Icon.jsx';

// Écoute de récitation : lecture audio directe dans le site (CDN libre),
// avec choix du récitateurs. Aucune sortie vers YouTube.
export default function AudioCoran() {
  const [reciter, setReciter] = useState(RECITERS[0].id);
  const [num, setNum] = useState(1);
  const courante = SOURATES.find(([n]) => n === num);

  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <h2>Écouter la récitation</h2>
      <p className="muted small">Choisis un récitateurs puis une sourate : l'audio se lance directement ici.</p>
      <div className="pills">
        {RECITERS.map((r) => (
          <button key={r.id} className={reciter === r.id ? 'pill active' : 'pill'} onClick={() => setReciter(r.id)}>
            {r.nom}
          </button>
        ))}
      </div>
      <div className="mem-grid" style={{ marginBottom: 12 }}>
        {SOURATES.map(([n, nom, ayats]) => (
          <button key={n} className={num === n ? 'mem-item acquis' : 'mem-item'} onClick={() => setNum(n)}>
            <strong>{nom}</strong>
            <span className="muted small">
              {n} · {ayats} versets
            </span>
          </button>
        ))}
      </div>
      <div className="audio-box">
        <div className="audio-title">
          <Icon name="play" size={16} /> Sourate {courante[1]} — {RECITERS.find((r) => r.id === reciter).nom}
        </div>
        <audio key={audioSurahUrl(reciter, num)} controls src={audioSurahUrl(reciter, num)} style={{ width: '100%' }} />
      </div>
    </section>
  );
}
