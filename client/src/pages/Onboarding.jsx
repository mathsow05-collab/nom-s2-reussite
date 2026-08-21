import { useState } from 'react';
import Icon from '../Icon.jsx';
import { AVATARS } from './StudentApp.jsx';

/* Onboarding de personnalisation (première connexion) :
   1) thème avec aperçu en direct, 2) passe-temps, 3) avatar (emoji ou animé). */

export const THEMES = [
  { id: 'light', nom: 'Clair', desc: 'Classique et lumineux', sw: ['#f3f5fb', '#ffffff', '#4f46e5'] },
  { id: 'dark', nom: 'Sombre', desc: 'Nuit confortable', sw: ['#0b1220', '#111a2f', '#6366f1'] },
  { id: 'sakura', nom: 'Sakura', desc: 'Rose animé, doux & stylé', sw: ['#fdf2f6', '#ffffff', '#db2777'] },
  { id: 'ocean', nom: 'Océan', desc: 'Bleu profond immersif', sw: ['#04121f', '#0a1c2c', '#0ea5e9'] },
];

export const PASSETIMES = [
  { id: 'anime', label: 'Animés & manga', emoji: '🌸' },
  { id: 'foot', label: 'Foot & sport', emoji: '⚽' },
  { id: 'musique', label: 'Musique', emoji: '🎵' },
  { id: 'gaming', label: 'Jeux vidéo', emoji: '🎮' },
  { id: 'lecture', label: 'Lecture', emoji: '📚' },
  { id: 'dessin', label: 'Dessin & art', emoji: '🎨' },
];

export default function Onboarding({ prenom, theme, onTheme, onFin }) {
  const [etape, setEtape] = useState(0);
  const [hobbies, setHobbies] = useState([]);
  const [av, setAv] = useState('');

  const bascule = (id) => setHobbies((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));

  return (
    <div className="ob-wrap">
      <div className="ob-card">
        <div className="ob-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === etape ? 'on' : ''} />
          ))}
        </div>

        {etape === 0 && (
          <>
            <h2>Bienvenue {prenom} ! Choisis ton ambiance</h2>
            <p className="muted small">Touche un thème : tout le site change aussitôt pour te montrer l'aperçu.</p>
            <div className="ob-themes">
              {THEMES.map((t) => (
                <button key={t.id} className={`ob-theme${theme === t.id ? ' on' : ''}`} onClick={() => onTheme(t.id)}>
                  <span className="ob-sw">
                    {t.sw.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </span>
                  <strong>{t.nom}</strong>
                  <small>{t.desc}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {etape === 1 && (
          <>
            <h2>Tes passe-temps ?</h2>
            <p className="muted small">
              Le site s'adapte : animations discrètes de ton univers (pétales pour les animés, notes pour la musique…)
              et suggestions d'avatars assortis.
            </p>
            <div className="ob-hobbies">
              {PASSETIMES.map((p) => (
                <button key={p.id} className={`ob-hobby${hobbies.includes(p.id) ? ' on' : ''}`} onClick={() => bascule(p.id)}>
                  <span className="ob-hobby-emoji">{p.emoji}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}

        {etape === 2 && (
          <>
            <h2>Choisis ton avatar</h2>
            <p className="muted small">Style classique ou style animé — changeable à tout moment dans le Profil.</p>
            <div className="ob-av-preview">
              {av.startsWith('an:') ? (
                <span className={`anime-av grand i${av.slice(3)}`} />
              ) : (
                <span className="ob-av-emoji">{av || '🧑‍'}</span>
              )}
            </div>
            <div className="ob-av-grid">
              {AVATARS.slice(0, 8).map((a) => (
                <button key={a} className={av === a ? 'on' : ''} onClick={() => setAv(a)}>
                  {a}
                </button>
              ))}
            </div>
            <div className="ob-av-grid anime">
              {Array.from({ length: 8 }, (_, i) => `an:${i}`).map((a) => (
                <button key={a} className={av === a ? 'on' : ''} onClick={() => setAv(a)}>
                  <span className={`anime-av i${a.slice(3)}`} />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="ob-nav">
          {etape > 0 && (
            <button className="btn btn-ghost" onClick={() => setEtape(etape - 1)}>
              Retour
            </button>
          )}
          {etape < 2 ? (
            <button className="btn btn-primary" onClick={() => setEtape(etape + 1)}>
              Continuer <Icon name="right" size={15} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onFin(hobbies, av)}>
              <Icon name="spark" size={15} /> C'est parti !
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
