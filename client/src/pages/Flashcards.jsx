import { useEffect, useState } from 'react';
import { api, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import Illu from '../components/Illustrations.jsx';

/* Répétition espacée façon Anki (système de Leitner) :
   boîte 0 = à revoir vite, boîte 5 = acquis long terme.
   Intervalles : 5 min, 1 j, 3 j, 7 j, 14 j, 30 j. */
const DUE = [5 * 60000, 86400000, 3 * 86400000, 7 * 86400000, 14 * 86400000, 30 * 86400000];

export default function Flashcards({ meId }) {
  const [decks, setDecks] = useState(null);
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [st, setSt] = useState({});

  const KEY = `s2r_anki_${meId}`;
  useEffect(() => {
    api('/eleve/flash').then(setDecks);
  }, []);
  useEffect(() => {
    try {
      setSt(JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch {
      setSt({});
    }
  }, [meId]);

  function saveSt(next) {
    setSt(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  const kOf = (c) => `${deck.id}:${c.id}`;

  function ouvrir(d) {
    setDeck(d);
    setCards(null);
    api(`/eleve/flash/${d.id}/cards`).then((cs) => {
      setCards(cs);
      const now = Date.now();
      const dues = cs.filter((c) => {
        const s = st[`${d.id}:${c.id}`];
        return !s || s.due <= now;
      });
      setQueue(dues.length ? dues : cs);
      setDoneCount(0);
      setFlipped(false);
    });
  }

  function noter(qualite) {
    const c = queue[0];
    const now = Date.now();
    const cur = st[kOf(c)] || { box: 0, due: 0 };
    let next;
    let requeue = false;
    if (qualite === 'again') {
      next = { box: 0, due: now + DUE[0] };
      requeue = true;
    } else if (qualite === 'hard') {
      next = { box: cur.box, due: now + Math.max(10 * 60000, Math.floor((DUE[cur.box] || DUE[0]) / 2)) };
    } else {
      const box = Math.min(5, cur.box + 1);
      next = { box, due: now + DUE[box] };
    }
    const ns = { ...st, [kOf(c)]: next };
    saveSt(ns);
    setFlipped(false);
    setDoneCount((n) => n + 1);
    setQueue((q) => (requeue ? [...q.slice(1), c] : q.slice(1)));
  }

  /* ---------------- session en cours ---------------- */
  if (deck && cards) {
    if (queue.length === 0)
      return (
        <main className="container">
          <button className="btn btn-ghost" onClick={() => setDeck(null)}>
            <Icon name="left" size={15} /> Tous les paquets
          </button>
          <section className="card s3card fc-fini">
            <Illu name="flash" />
            <h2>Session terminée !</h2>
            <p className="muted">
              {doneCount} carte{doneCount > 1 ? 's' : ''} travaillée{doneCount > 1 ? 's' : ''}. Les cartes reviendront au
              meilleur moment, selon la répétition espacée.
            </p>
            <button className="btn btn-primary" onClick={() => ouvrir(deck)}>
              <Icon name="refresh" size={15} /> Tout réviser maintenant
            </button>
          </section>
        </main>
      );

    const c = queue[0];
    const s = st[kOf(c)];
    return (
      <main className="container">
        <div className="fc-top">
          <button className="btn btn-ghost" onClick={() => setDeck(null)}>
            <Icon name="left" size={15} /> Paquets
          </button>
          <span className="muted small">
            {queue.length} restante{queue.length > 1 ? 's' : ''} · {doneCount} faite{doneCount > 1 ? 's' : ''}
          </span>
        </div>
        <div className="bar3" style={{ marginBottom: 14 }}>
          <div style={{ width: `${Math.round((doneCount / Math.max(1, doneCount + queue.length)) * 100)}%` }} />
        </div>
        <button className={flipped ? 'fc-scene flipped' : 'fc-scene'} onClick={() => setFlipped((f) => !f)}>
          <span className="fc-face fc-front">
            <small>Réfléchis puis touche la carte</small>
            <strong>{c.recto}</strong>
          </span>
          <span className="fc-face fc-back">
            <small>Réponse</small>
            <strong>{c.verso}</strong>
          </span>
        </button>
        {s && s.box > 0 && <p className="muted small" style={{ textAlign: 'center' }}>Boîte {s.box}/5</p>}
        <div className={flipped ? 'fc-actions show' : 'fc-actions'}>
          <button className="fc-btn again" onClick={() => noter('again')}>
            À revoir
          </button>
          <button className="fc-btn hard" onClick={() => noter('hard')}>
            Difficile
          </button>
          <button className="fc-btn ok" onClick={() => noter('ok')}>
            Acquis
          </button>
        </div>
      </main>
    );
  }

  /* ---------------- liste des paquets ---------------- */
  const now = Date.now();
  return (
    <main className="container">
      <section className="banner">
        <h2>Flashcards</h2>
        <p>Mémorise avec la répétition espacée : chaque carte revient au bon moment, comme sur Anki.</p>
      </section>
      {!decks ? (
        <Spinner />
      ) : (
        <div className="annales-list">
          {decks.map((d, i) => {
            const m = d.matiere ? MATIERE_BY_ID[d.matiere] || { label: d.matiere, color: '#0f2557' } : { label: 'Mémo', color: '#0e7490' };
            let acquis = 0;
            let dues = 0;
            Object.entries(st).forEach(([k, v]) => {
              if (k.startsWith(`${d.id}:`)) {
                if (v.box >= 3) acquis += 1;
                if (v.due <= now) dues += 1;
              }
            });
            return (
              <button className="card annale-card" style={{ '--mc': m.color, '--i': i }} key={d.id} onClick={() => ouvrir(d)}>
                <div className="annale-body">
                  <div className="annale-top">
                    <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>{m.label}</span>
                    <span className="annale-year-txt" style={{ color: m.color }}>
                      {dues > 0 ? `${dues} à revoir` : 'À jour'}
                    </span>
                  </div>
                  <h3>{d.titre}</h3>
                  <div className="cours-meta">
                    <span>
                      <Icon name="layers" size={12} /> {d.nb} cartes
                    </span>
                    <span>
                      <Icon name="check" size={12} /> {acquis} acquise{acquis > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
