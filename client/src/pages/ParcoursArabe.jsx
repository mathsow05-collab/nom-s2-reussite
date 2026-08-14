import { useState } from 'react';
import { MONDES_A } from '../data-parcours-a.js';
import { MONDES_B } from '../data-parcours-b.js';
import Icon from '../Icon.jsx';

const MONDES = [...MONDES_A, ...MONDES_B];

// Prononciation via la synthèse vocale du navigateur (voix arabe si disponible).
function parler(texte) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'ar-SA';
    u.rate = 0.65;
    window.speechSynthesis.speak(u);
  } catch {
    /* navigateur sans TTS */
  }
}

const cle = (meId) => 's2r_parcours_' + meId;
function charger(meId) {
  try {
    return JSON.parse(localStorage.getItem(cle(meId)) || '{}');
  } catch {
    return {};
  }
}

function melange(t) {
  const a = [...t];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Barre({ pct, ok }) {
  return (
    <div className="mem-bar">
      <div style={{ width: `${Math.min(100, pct)}%`, background: ok ? 'var(--ok)' : 'var(--brand)' }} />
    </div>
  );
}

export default function ParcoursArabe({ meId }) {
  const [prog, setProg] = useState(() => charger(meId));
  const [mondeOuvert, setMondeOuvert] = useState(null);
  const [leconOuverte, setLeconOuverte] = useState(null);

  function noteScore(leconId, pct) {
    setProg((p) => {
      const next = { ...p, [leconId]: Math.max(p[leconId] || 0, pct) };
      localStorage.setItem(cle(meId), JSON.stringify(next));
      return next;
    });
  }

  const maitriseMonde = (m) => {
    if (!m.lecons.length) return 0;
    return Math.round(m.lecons.reduce((s, l) => s + (prog[l.id] || 0), 0) / m.lecons.length);
  };
  const debloque = (idx) => idx === 0 || maitriseMonde(MONDES[idx - 1]) >= 80;
  const totalLecons = MONDES.reduce((s, m) => s + m.lecons.length, 0);
  const leconsMaitrisees = MONDES.flatMap((m) => m.lecons).filter((l) => (prog[l.id] || 0) >= 80).length;

  /* ---------- Lecteur de leçon ---------- */
  if (leconOuverte) {
    return (
      <Lecon
        lecon={leconOuverte}
        onBack={() => setLeconOuverte(null)}
        onScore={(pct) => noteScore(leconOuverte.id, pct)}
        scoreActuel={prog[leconOuverte.id] || 0}
      />
    );
  }

  /* ---------- Liste des leçons d'un monde ---------- */
  if (mondeOuvert) {
    const m = mondeOuvert;
    return (
      <main className="container">
        <button className="btn btn-ghost" onClick={() => setMondeOuvert(null)}>
          <Icon name="left" size={15} /> Carte des mondes
        </button>
        <section className="banner">
          <h2>
            {m.icon} {m.titre}
          </h2>
          <p>{m.sous} — maîtrise {maitriseMonde(m)} % (80 % pour valider le monde)</p>
          <Barre pct={maitriseMonde(m)} ok={maitriseMonde(m) >= 80} />
        </section>
        <div className="lecons-list">
          {m.lecons.map((l) => (
            <button className="card lecon-card" key={l.id} onClick={() => setLeconOuverte(l)}>
              <div>
                <strong>{l.titre}</strong>
                <div className="muted small">{l.lecons || ''}{(prog[l.id] || 0) >= 80 ? '✅ maîtrisé' : prog[l.id] ? `en cours · ${prog[l.id]} %` : 'nouveau'}</div>
              </div>
              <div style={{ minWidth: 120 }}>
                <Barre pct={prog[l.id] || 0} ok={(prog[l.id] || 0) >= 80} />
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  /* ---------- Carte des mondes ---------- */
  return (
    <main className="container">
      <section className="banner">
        <h2>🗺️ Ta carte de progression</h2>
        <p>
          Avance monde après monde. Il faut <strong>80 %</strong> de maîtrise pour débloquer le suivant.{' '}
          {leconsMaitrisees}/{totalLecons} leçons maîtrisées.
        </p>
        <Barre pct={Math.round((leconsMaitrisees / totalLecons) * 100)} ok={false} />
      </section>
      <div className="mondes-map">
        {MONDES.map((m, i) => {
          const ok = debloque(i);
          const pct = maitriseMonde(m);
          return (
            <button key={m.id} className={ok ? 'card monde-card' : 'card monde-card verrou'} disabled={!ok} onClick={() => setMondeOuvert(m)}>
              <div className="monde-head">
                <span className="monde-icon">{m.icon}</span>
                <span className="muted small">Monde {i + 1}</span>
              </div>
              <strong>{m.titre}</strong>
              <div className="muted small">{m.sous}</div>
              <div style={{ margin: '8px 0 4px' }}>
                <Barre pct={pct} ok={pct >= 80} />
              </div>
              <div className="muted small">{ok ? `${pct} % de maîtrise` : `🔒 Maîtrise 80 % du monde ${i} pour entrer`}</div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

/* ================= Lecteur de leçon (étapes) ================= */
function Lecon({ lecon, onBack, onScore, scoreActuel }) {
  const ETAPES =
    lecon.type === 'mots'
      ? ['Découvrir', 'Écouter', 'Mémoriser', 'Exercices', 'Dans le Coran']
      : lecon.type === 'decoupe'
        ? ['Découvrir', 'Exercices']
        : lecon.type === 'ayah'
          ? ['Découvrir', 'Écouter', 'Exercices']
          : ['Découvrir', 'Écouter', 'Exercices'];
  const [etape, setEtape] = useState(0);
  const [resultat, setResultat] = useState(null);

  const exos = lecon.type === 'mots' ? genererExosMots(lecon) : lecon.exos || [];

  function terminer(score) {
    const pct = Math.round((score / exos.length) * 100);
    setResultat(pct);
    onScore(pct);
  }

  return (
    <main className="container">
      <button className="btn btn-ghost" onClick={onBack}>
        <Icon name="left" size={15} /> Retour
      </button>
      <section className="banner">
        <h2>{lecon.titre}</h2>
        <p>Meilleure maîtrise : {Math.max(scoreActuel, resultat ?? 0)} %</p>
      </section>
      <div className="pills">
        {ETAPES.map((e, i) => (
          <button key={e} className={etape === i ? 'pill active' : 'pill'} onClick={() => setEtape(i)}>
            {i + 1}. {e}
          </button>
        ))}
      </div>

      {ETAPES[etape] === 'Découvrir' && <EtapeDecouvrir lecon={lecon} />}
      {ETAPES[etape] === 'Écouter' && <EtapeEcouter lecon={lecon} />}
      {ETAPES[etape] === 'Mémoriser' && <EtapeFlashcards lecon={lecon} />}
      {ETAPES[etape] === 'Dans le Coran' && <EtapeCoran lecon={lecon} />}
      {ETAPES[etape] === 'Exercices' && (
        <EtapeExos exos={exos} onFin={terminer} resultat={resultat} onRejouer={() => setResultat(null)} />
      )}
    </main>
  );
}

function genererExosMots(lecon) {
  const exos = [];
  for (const c of lecon.cartes) {
    const autresFr = melange(lecon.cartes.filter((x) => x.ar !== c.ar).map((x) => x.fr)).slice(0, 3);
    exos.push({ q: `Que signifie « ${c.ar} » ?`, choix: melange([c.fr, ...autresFr]), bonne: null, bonneValeur: c.fr });
    const autresAr = melange(lecon.cartes.filter((x) => x.fr !== c.fr).map((x) => x.ar)).slice(0, 3);
    exos.push({ q: `Choisis le mot arabe pour « ${c.fr} » :`, choix: melange([c.ar, ...autresAr]), bonne: null, bonneValeur: c.ar });
  }
  return melange(exos).slice(0, 8);
}

function EtapeDecouvrir({ lecon }) {
  const [mot, setMot] = useState(null);
  if (lecon.type === 'ayah')
    return (
      <div className="card panel">
        <p className="muted">Touche chaque mot du verset pour voir son sens et son explication.</p>
        <div className="ayah-mots">
          {lecon.cartes.map((c) => (
            <button key={c.ar} className={mot === c ? 'ayah-mot actif' : 'ayah-mot'} onClick={() => setMot(mot === c ? null : c)}>
              {c.ar}
            </button>
          ))}
        </div>
        {mot && (
          <div className="ayah-note">
            <strong>{mot.ar}</strong> → {mot.fr}
            <div className="muted small">{mot.note}</div>
          </div>
        )}
      </div>
    );
  if (lecon.type === 'decoupe')
    return (
      <div className="card panel">
        <p className="muted">Chaque mot coranique est découpé : lis les segments de droite à gauche.</p>
        {lecon.cartes.map((c) => (
          <div className="decoupe-card" key={c.mot}>
            <div className="decoupe-mot">{c.mot} <span className="muted small">= {c.sens}</span></div>
            <div className="decoupe-segs">
              {c.segments.map(([seg, expl], i) => (
                <div className="decoupe-seg" key={i}>
                  <span className="decoupe-ar">{seg}</span>
                  <span className="muted small">{expl}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  if (lecon.type === 'grammaire')
    return (
      <div className="card panel">
        {lecon.cartes.map((c, i) => (
          <div className="gram-card" key={i}>
            <div>{c.regle}</div>
            <div className="gram-ex">
              {c.ex.map((e, j) => (
                <span key={j}>
                  <strong className="rtl">{e.ar}</strong> <span className="muted small">{e.fr}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  if (lecon.type === 'racine')
    return (
      <div className="card panel">
        {lecon.explication && <p className="muted">{lecon.explication}</p>}
        <div className="racine-arbre">
          {lecon.cartes.map((c) => (
            <div className="lex-card" key={c.ar}>
              <div className="lex-ar">{c.ar}</div>
              <div className="lex-fr">{c.fr}</div>
            </div>
          ))}
        </div>
      </div>
    );
  // lettres / voyelles / signes / mots
  return (
    <div className="card panel">
      <div className="lexique-grid">
        {lecon.cartes.map((c) => (
          <div className="lex-card" key={c.ar}>
            <div className="lex-ar">{c.ar}</div>
            <div className="lex-fr">
              {c.nom}
              {c.son ? ` · ${c.son}` : ''}
              {c.fr ? ` · ${c.fr}` : ''}
            </div>
            {c.ex && <div className="muted small rtl">{c.ex}</div>}
            {c.regle && <div className="muted small">{c.regle}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EtapeEcouter({ lecon }) {
  return (
    <div className="card panel">
      <p className="muted">Touche 🔊 pour écouter (voix arabe de ton appareil), puis répète à voix haute.</p>
      <div className="lexique-grid">
        {lecon.cartes.map((c) => (
          <button className="lex-card" key={c.ar} onClick={() => parler(c.ar)}>
            <div className="lex-ar">{c.ar}</div>
            <div className="lex-fr">🔊 {c.nom || c.fr || ''}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EtapeFlashcards({ lecon }) {
  const [i, setI] = useState(0);
  const [retour, setRetour] = useState(false);
  const c = lecon.cartes[i];
  return (
    <div className="card panel" style={{ textAlign: 'center' }}>
      <p className="muted small">
        Carte {i + 1}/{lecon.cartes.length} — touche la carte pour retourner
      </p>
      <button className="flashcard" onClick={() => setRetour(!retour)}>
        {retour ? <span>{c.fr}</span> : <span className="flash-ar">{c.ar}</span>}
      </button>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => { setI(i - 1); setRetour(false); }}>
          <Icon name="left" size={15} />
        </button>
        <button className="btn btn-primary" disabled={i + 1 >= lecon.cartes.length} onClick={() => { setI(i + 1); setRetour(false); }}>
          <Icon name="right" size={15} />
        </button>
      </div>
    </div>
  );
}

function EtapeCoran({ lecon }) {
  return (
    <div className="card panel">
      <p className="muted">Chaque mot appris, retrouvé dans un vrai verset.</p>
      {lecon.cartes.map((c) => (
        <div className="coran-ligne" key={c.ar}>
          <span className="rtl coran-ayah">{c.ayah}</span>
          <span className="muted small">
            <strong className="rtl">{c.ar}</strong> = {c.fr}
          </span>
        </div>
      ))}
    </div>
  );
}

function EtapeExos({ exos, onFin, resultat, onRejouer }) {
  const [reps, setReps] = useState({});
  if (resultat !== null)
    return (
      <div className="card panel" style={{ textAlign: 'center' }}>
        <div className="quiz-score">{resultat} %</div>
        <p className="muted">{resultat >= 80 ? 'Monde en route, excellent ! 🌟' : 'Repasse les étapes puis rejoue pour viser 80 %.'}</p>
        <button className="btn btn-primary" onClick={onRejouer}>
          <Icon name="refresh" size={15} /> Rejouer
        </button>
      </div>
    );
  const toutes = Object.keys(reps).length === exos.length;
  const score = exos.reduce((s, e, i) => s + (reps[i] === e.bonneValeur || reps[i] === e.bonne ? 1 : 0), 0);
  return (
    <div className="card panel">
      {exos.map((e, i) => {
        const bonneIdx = e.bonneValeur ? e.choix.indexOf(e.bonneValeur) : e.bonne;
        return (
          <div className="exo-bloc" key={i}>
            <div className="exo-q">
              {e.audio && (
                <button className="btn btn-sm btn-outline" onClick={() => parler(e.audio)}>
                  🔊 Écouter
                </button>
              )}{' '}
              {e.q}
            </div>
            <div className="ayah-choices">
              {e.choix.map((v, j) => {
                let cls = 'quiz-choice';
                if (reps[i] !== undefined) {
                  if (j === bonneIdx) cls += ' good';
                  else if (reps[i] === j) cls += ' bad';
                }
                return (
                  <button key={j} className={cls} disabled={reps[i] !== undefined} onClick={() => setReps((r) => ({ ...r, [i]: j }))}>
                    <span className="rtl">{v}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {toutes && (
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => onFin(score)}>
            <Icon name="check" size={15} /> Terminer la leçon
          </button>
        </div>
      )}
    </div>
  );
}
