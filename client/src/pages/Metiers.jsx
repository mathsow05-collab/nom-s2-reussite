import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

// Catalogue d'orientation S2 : carrousel fluide de fiches métiers post-Bac.
export default function Metiers() {
  const [metiers, setMetiers] = useState(null);
  const [open, setOpen] = useState(null);
  const rail = useRef(null);

  useEffect(() => {
    api('/eleve/metiers')
      .then(setMetiers)
      .catch(() => setMetiers([]));
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

      {open && (
        <Modal title={open.titre} onClose={() => setOpen(null)} wide>
          {open.image && <img className="metier-modal-img" src={open.image} alt={open.titre} />}
          {open.domaine && (
            <div style={{ margin: '10px 0' }}>
              <span className="badge badge-soft">{open.domaine}</span>
            </div>
          )}
          <p>{open.description}</p>
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
    </main>
  );
}
