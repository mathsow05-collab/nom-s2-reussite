import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

// Décode le texte des blocs : lignes « Sous-titre : » puis métiers séparés par « ; ».
export function parseBlocs(texte) {
  const blocs = [];
  let cur = null;
  for (const ligne of String(texte || '').split('\n')) {
    const l = ligne.trim();
    if (!l) continue;
    if (l.endsWith(':')) {
      cur = { sous: l.slice(0, -1).trim(), metiers: [] };
      blocs.push(cur);
    } else {
      if (!cur) {
        cur = { sous: '', metiers: [] };
        blocs.push(cur);
      }
      cur.metiers.push(...l.split(';').map((m) => m.trim()).filter(Boolean));
    }
  }
  return blocs;
}

// Catalogue d'orientation : carrousel de métiers + filières universitaires.
export default function Metiers() {
  const [metiers, setMetiers] = useState(null);
  const [open, setOpen] = useState(null);
  const [parcours, setParcours] = useState([]);
  const [openP, setOpenP] = useState(null);
  const rail = useRef(null);

  useEffect(() => {
    api('/eleve/metiers')
      .then(setMetiers)
      .catch(() => setMetiers([]));
    api('/eleve/parcours-univ')
      .then(setParcours)
      .catch(() => setParcours([]));
  }, []);

  function scroll(dir) {
    rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  }

  if (!metiers)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  return (
    <main className="container orientation">
      <section className="banner">
        <h2>Où t'emmène le Bac S2 ?</h2>
        <p>
          Découvre des métiers concrets, les études qui y mènent et les débouchés au Sénégal et à l'international.
          Fais défiler le catalogue.
        </p>
      </section>

      <div className="carousel-wrap">
        <button className="car-arrow" onClick={() => scroll(-1)} aria-label="Précédent">
          <Icon name="left" />
        </button>
        <div className="carousel" ref={rail}>
          {metiers.map((met) => (
            <article className="metier-card" key={met.id}>
              <div className="metier-img">
                {met.image ? (
                  <img src={met.image} alt={met.titre} loading="lazy" />
                ) : (
                  <div className="metier-img-fallback">
                    <Icon name="cap" size={40} />
                  </div>
                )}
              </div>
              <div className="metier-body">
                {met.domaine && <span className="badge badge-soft">{met.domaine}</span>}
                <h3>{met.titre}</h3>
                <p className="muted clamp3">{met.description}</p>
                <button className="btn btn-outline" onClick={() => setOpen(met)}>
                  Découvrir la fiche <Icon name="right" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <button className="car-arrow" onClick={() => scroll(1)} aria-label="Suivant">
          <Icon name="right" />
        </button>
      </div>

      {parcours.length > 0 && (
        <>
          <section className="banner" style={{ marginTop: 18 }}>
            <h2>🎓 Les filières universitaires après le Bac</h2>
            <p>Chaque filière d'études ouvre une famille de métiers. Touche une carte pour voir tous les débouchés.</p>
          </section>
          <div className="grid-cards">
            {parcours.map((p) => (
              <button className="card cours-card" key={p.id} onClick={() => setOpenP(p)} style={{ '--mc': '#4338ca' }}>
                <div className="cours-top">
                  <span className="badge" style={{ background: '#4338ca' }}>
                    Filière {p.cible}
                  </span>
                  <Icon name="cap" size={16} />
                </div>
                <h3>{p.titre}</h3>
                <p className="muted clamp3">{p.intro}</p>
                <div className="cours-actions">
                  <span className="btn btn-outline">
                    Voir les métiers <Icon name="right" size={15} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {open && (
        <Modal title={open.titre} onClose={() => setOpen(null)} wide>
          {open.image && <img className="metier-modal-img" src={open.image} alt={open.titre} />}
          {open.domaine && (
            <div style={{ margin: '10px 0' }}>
              <span className="badge badge-soft">{open.domaine}</span>
            </div>
          )}
          <p>{open.description}</p>
          {open.parcours && (
            <>
              <h4 className="h4">🎓 Études après le Bac S2</h4>
              <p className="parcours-box">{open.parcours}</p>
            </>
          )}
          {open.debouches && (
            <>
              <h4 className="h4">Débouchés</h4>
              <ul className="debouches">
                {open.debouches
                  .split(';')
                  .map((d) => d.trim())
                  .filter(Boolean)
                  .map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
              </ul>
            </>
          )}
        </Modal>
      )}

      {openP && (
        <Modal title={`🎓 ${openP.titre}`} onClose={() => setOpenP(null)} wide>
          <div style={{ marginBottom: 10 }}>
            <span className="badge badge-soft">Filière {openP.cible}</span>
          </div>
          {openP.intro && <p className="muted">{openP.intro}</p>}
          {parseBlocs(openP.blocs).map((b, i) => (
            <div key={i} style={{ marginTop: 14 }}>
              {b.sous && <h4 className="h4">{b.sous}</h4>}
              <div className="pills" style={{ marginBottom: 0 }}>
                {b.metiers.map((m, j) => (
                  <span key={j} className="pill" style={{ cursor: 'default' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </main>
  );
}
