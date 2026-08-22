import { useMemo, useState } from 'react';
import Icon from '../Icon.jsx';
import { MOTS, RANKS, TOTAL_MOTS } from '../data/english.js';
import { addBonus } from '../progress.js';

const SERIE = 10;
const LS = 'kd_english';

function lire() {
  try {
    return JSON.parse(localStorage.getItem(LS)) || { rank: 0, first: 0, doubles: 0, series: 0 };
  } catch {
    return { rank: 0, first: 0, doubles: 0, series: 0 };
  }
}
function sauver(p) {
  localStorage.setItem(LS, JSON.stringify(p));
}
const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function melange(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tirerSerie(rankId) {
  return melange(MOTS[rankId] || [])
    .slice(0, SERIE)
    .map(([en, fr]) => ({ en, fr, dir: Math.random() < 0.5 ? 'en' : 'fr' }));
}

export default function Anglais({ meId }) {
  const [prog, setProg] = useState(lire);
  const [serie, setSerie] = useState(() => tirerSerie(RANKS[lire().rank].id));
  const [idx, setIdx] = useState(0);
  const [essai, setEssai] = useState(0);
  const [saisie, setSaisie] = useState('');
  const [fb, setFb] = useState(null); // {type:'ok'|'ko1'|'ko2', texte}
  const rank = RANKS[prog.rank];
  const q = serie[idx];
  const question = q ? (q.dir === 'en' ? q.en : q.fr) : '';
  const attendu = q ? (q.dir === 'en' ? q.fr : q.en) : '';

  function maj(p) {
    sauver(p);
    setProg(p);
  }

  function repondre(e) {
    e.preventDefault();
    if (!q || fb?.type === 'ko2') return;
    const ok = norm(saisie) === norm(attendu);
    setSaisie('');
    if (ok) {
      const bonus = essai === 0 ? 1 : 0;
      if (bonus) maj({ ...prog, first: prog.first + 1 });
      if (bonus && meId) addBonus(meId, bonus);
      setFb({ type: 'ok', texte: `✔ ${attendu}` });
      setTimeout(() => {
        setFb(null);
        if (idx + 1 >= SERIE) {
          // série complète !
          const gain = prog.rank < RANKS.length - 1 ? 25 : 10;
          const np = { ...prog, series: prog.series + 1 };
          if (meId) addBonus(meId, gain);
          maj(np);
          setFbWin(true);
        } else {
          setIdx(idx + 1);
          setEssai(0);
        }
      }, 900);
    } else if (essai === 0) {
      setEssai(1);
      setFb({ type: 'ko1', texte: `✘ Pas tout à fait… 2e essai ! Indice : « ${attendu[0].toUpperCase()}… » (${attendu.length} caractères)` });
    } else {
      maj({ ...prog, doubles: prog.doubles + 1 });
      setFb({ type: 'ko2', texte: `La réponse était : ${attendu}. La série reprend à zéro — tu vas y arriver !` });
    }
  }

  const [win, setFbWin] = useState(false);

  function recommencer() {
    setSerie(tirerSerie(rank.id));
    setIdx(0);
    setEssai(0);
    setFb(null);
    setSaisie('');
  }

  function rangSuivant() {
    const np = { ...prog, rank: Math.min(RANKS.length - 1, prog.rank + 1) };
    maj(np);
    setSerie(tirerSerie(RANKS[np.rank].id));
    setIdx(0);
    setEssai(0);
    setFb(null);
    setFbWin(false);
  }

  const pctSerie = Math.round((idx / SERIE) * 100);

  return (
    <main className="container">
      <section className="banner">
        <h2>🇬 Maîtrise l’anglais</h2>
        <p>
          Les {TOTAL_MOTS} mots & expressions essentiels, en jeu : traduis, 2 essais par mot, série de {SERIE} à
          finir pour monter de rang. E → D → C → B → A → S → National !
        </p>
      </section>

      {/* échelle des rangs */}
      <div className="en-ranks">
        {RANKS.map((r, i) => (
          <div key={r.id} className={i === prog.rank ? 'en-rank on' : i < prog.rank ? 'en-rank done' : 'en-rank'}>
            <strong>{r.id}</strong>
            <small>{i < prog.rank ? '✓' : i === prog.rank ? r.desc : '🔒'}</small>
          </div>
        ))}
      </div>

      <div className="card en-stats">
        <span>
          <Icon name="award" size={14} /> Rang actuel : <strong>{rank.nom}</strong>
        </span>
        <span>
          <Icon name="check" size={14} /> {prog.first} mots du 1er coup
        </span>
        <span>
          <Icon name="target" size={14} /> {prog.series} séries finies
        </span>
      </div>

      {win ? (
        <div className="card en-win">
          <div className="en-win-trophy">
            <Icon name="trophy" size={40} />
          </div>
          <h2>Série complète !</h2>
          <p className="muted">
            {prog.rank < RANKS.length - 1
              ? `+25 XP et passage au ${RANKS[prog.rank + 1].nom} !`
              : '+10 XP — tu es au sommet, continue de t’entraîner !'}
          </p>
          {prog.rank < RANKS.length - 1 ? (
            <button className="btn btn-primary" onClick={rangSuivant}>
              Passer au {RANKS[prog.rank + 1].nom}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={rangSuivant}>
              Rejouer une série National
            </button>
          )}
        </div>
      ) : (
        <div className="card en-jeu">
          <div className="en-top">
            <span className="en-rang-badge">{rank.id}</span>
            <div className="en-serie-bar">
              <div style={{ width: `${pctSerie}%` }} />
            </div>
            <span className="en-qnum">
              {idx + 1}/{SERIE}
            </span>
          </div>

          <p className="en-dir">{q?.dir === 'en' ? 'Traduis en français :' : 'Traduis en anglais :'}</p>
          <div className="en-mot">{question}</div>

          <form className="en-form" onSubmit={repondre}>
            <input
              className="input"
              placeholder={q?.dir === 'en' ? 'Ta réponse en français…' : 'Your answer in English…'}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              disabled={fb?.type === 'ko2'}
              autoFocus
            />
            <button className="btn btn-primary" disabled={!saisie.trim() || fb?.type === 'ko2'}>
              Valider
            </button>
          </form>

          <div className="en-essais">
            <span className={essai === 0 ? 'en-dot' : 'en-dot off'} />
            <span className={essai === 1 ? 'en-dot' : 'en-dot off'} />
            <small className="muted">essais</small>
          </div>

          {fb && (
            <div className={fb.type === 'ok' ? 'en-fb ok' : fb.type === 'ko1' ? 'en-fb ko1' : 'en-fb ko2'}>
              {fb.texte}
            </div>
          )}

          {fb?.type === 'ko2' && (
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={recommencer}>
              Reprendre la série à zéro
            </button>
          )}
        </div>
      )}

      <p className="muted small" style={{ marginTop: 10 }}>
        Règle du jeu : trouve la traduction en 2 essais maximum. Si tu échoues deux fois, la série recommence au
        début — comme un vrai entraînement ! 1 XP par mot trouvé du premier coup, 25 XP par rang gagné.
      </p>
    </main>
  );
}
