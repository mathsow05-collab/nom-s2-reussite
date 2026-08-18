import { useMemo, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import {
  SLOGAN, BRANCHES, UNIVERSITES, FACULTES, LICENCES, DOMAINES_ECOLES, ECOLES, PRO, CONCOURS, ETRANGER,
  TRAVAIL, PASSERELLES_GLOBALES, INTERETS, scoreFormation,
} from '../orientation/data.js';

/* Carte d'orientation : l'élève explore un arbre qui se déploie — branches,
   universités, facultés, licences, écoles, passerelles, comparateur et
   moteur « Trouver mon parcours » (3 parcours en ligne du temps). */

const IMG_BRANCHE = { universite: '/metiers/campus.jpg', ecoles: '/metiers/ecole.jpg' };

export default function CarteOrientation({ filiere, onOpenMetier }) {
  const [branche, setBranche] = useState(null);
  const [univ, setUniv] = useState(null);
  const [fac, setFac] = useState(null);
  const [domaine, setDomaine] = useState(null);
  const [fiche, setFiche] = useState(null); // { kind, ... }
  const [compar, setCompar] = useState([]);
  const [showCompar, setShowCompar] = useState(false);
  const [wizard, setWizard] = useState(false);

  const reset = () => {
    setBranche(null);
    setUniv(null);
    setFac(null);
    setDomaine(null);
  };

  const chemin = [];
  if (branche) chemin.push({ label: BRANCHES.find((b) => b.id === branche)?.titre, go: reset });
  if (branche === 'universite' && univ) chemin.push({ label: univ.nom, go: () => { setUniv(null); setFac(null); } });
  if (branche === 'universite' && fac) chemin.push({ label: FACULTES[fac].nom, go: () => setFac(null) });
  if (branche === 'ecoles' && domaine) chemin.push({ label: DOMAINES_ECOLES.find((d) => d.id === domaine)?.nom, go: () => setDomaine(null) });

  function toggleCompar(item) {
    setCompar((c) => {
      const deja = c.find((x) => x.kind === item.kind && x.id === item.id);
      if (deja) return c.filter((x) => !(x.kind === item.kind && x.id === item.id));
      if (c.length >= 3) return c;
      return [...c, item];
    });
  }
  const inCompar = (kind, id) => compar.some((x) => x.kind === kind && x.id === id);

  return (
    <div className="ocarte">
      <header className="ocarte-hero">
        <h2>Carte d'orientation</h2>
        <p className="ocarte-slogan">« {SLOGAN} »</p>
        <div className="ocarte-actions">
          <button className="btn btn-primary" onClick={() => setWizard(true)}>
            <Icon name="target" size={15} /> Trouver mon parcours
          </button>
          <button className="btn btn-outline" onClick={() => setShowCompar(true)} disabled={compar.length < 2}>
            <Icon name="layers" size={15} /> Comparer ({compar.length})
          </button>
        </div>
      </header>

      {chemin.length > 0 && (
        <nav className="ocarte-fil">
          <button className="fil-chip racine" onClick={reset}>
            <Icon name="home" size={12} /> Départ
          </button>
          {chemin.map((c, i) => (
            <button className="fil-chip" key={i} onClick={c.go}>
              {c.label}
            </button>
          ))}
        </nav>
      )}

      {!branche && (
        <>
          <h3 className="ocarte-question">Où veux-tu aller après le Bac ?</h3>
          <div className="ocarte-grille">
            {BRANCHES.map((b, i) => (
              <button
                className="ocarte-branche"
                key={b.id}
                style={{ animationDelay: `${i * 70}ms` }}
                onClick={() => {
                  reset();
                  setBranche(b.id);
                }}
              >
                <img src={b.img || IMG_BRANCHE[b.id]} alt="" loading="lazy" />
                <span className="ocarte-branche-txt">
                  <strong>
                    <Icon name={b.icone} size={15} /> {b.titre}
                  </strong>
                  <small>{b.desc}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {branche === 'universite' && !univ && (
        <div className="ocarte-grille">
          {UNIVERSITES.map((u, i) => (
            <button className="ocarte-branche" key={u.id} style={{ animationDelay: `${i * 70}ms` }} onClick={() => setUniv(u)}>
              <img src={u.img} alt="" loading="lazy" />
              <span className="ocarte-branche-txt">
                <strong>{u.nom}</strong>
                <small>
                  {u.ville} · {u.frais}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}

      {branche === 'universite' && univ && !fac && (
        <div className="ocarte-grille">
          {univ.facultes.map((fid, i) => (
            <button className="ocarte-branche" key={fid} style={{ animationDelay: `${i * 70}ms` }} onClick={() => setFac(fid)}>
              <span className="ocarte-branche-txt">
                <strong>
                  <Icon name="cap" size={15} /> {FACULTES[fid].nom}
                </strong>
                <small>{FACULTES[fid].licences.length} licences — déroule la faculté</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {branche === 'universite' && univ && fac && (
        <div className="ocarte-grille">
          {FACULTES[fac].licences.map((lid, i) => {
            const L = LICENCES[lid];
            return (
              <div className="ocarte-carte" key={lid} style={{ animationDelay: `${i * 70}ms` }}>
                <button className="ocarte-ouvrir" onClick={() => setFiche({ kind: 'licence', id: lid })}>
                  <strong>{L.nom}</strong>
                  <small>
                    {L.duree} · difficulté {'●'.repeat(L.difficulte)}
                    {'○'.repeat(3 - L.difficulte)}
                  </small>
                  <small className="muted">{L.matieres.slice(0, 3).join(' · ')}</small>
                </button>
                <button
                  className={`ocarte-compar${inCompar('licence', lid) ? ' on' : ''}`}
                  title="Ajouter au comparateur"
                  onClick={() => toggleCompar({ kind: 'licence', id: lid, nom: L.nom })}
                >
                  <Icon name="layers" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {branche === 'ecoles' && !domaine && (
        <div className="ocarte-grille">
          {DOMAINES_ECOLES.map((d, i) => (
            <button className="ocarte-branche" key={d.id} style={{ animationDelay: `${i * 60}ms` }} onClick={() => setDomaine(d.id)}>
              <img src={d.img} alt="" loading="lazy" />
              <span className="ocarte-branche-txt">
                <strong>{d.nom}</strong>
                <small>{ECOLES.filter((e) => e.domaine === d.id).length} école(s)</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {branche === 'ecoles' && domaine && (
        <div className="ocarte-grille">
          {ECOLES.filter((e) => e.domaine === domaine).map((e, i) => (
            <div className="ocarte-carte" key={e.id} style={{ animationDelay: `${i * 70}ms` }}>
              <button className="ocarte-ouvrir" onClick={() => setFiche({ kind: 'ecole', id: e.id })}>
                <strong>{e.nom}</strong>
                <small>
                  {e.ville} · {e.duree}
                </small>
                <small className="muted">{e.diplome}</small>
              </button>
              <button
                className={`ocarte-compar${inCompar('ecole', e.id) ? ' on' : ''}`}
                title="Ajouter au comparateur"
                onClick={() => toggleCompar({ kind: 'ecole', id: e.id, nom: e.nom })}
              >
                <Icon name="layers" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {branche === 'pro' && (
        <div className="ocarte-grille">
          {PRO.map((p, i) => (
            <div className="ocarte-carte" key={p.id} style={{ animationDelay: `${i * 70}ms` }}>
              <button className="ocarte-ouvrir" onClick={() => setFiche({ kind: 'pro', id: p.id })}>
                <strong>{p.nom}</strong>
                <small>{p.diplome}</small>
                <small className="muted">{p.debouches}</small>
              </button>
              <button
                className={`ocarte-compar${inCompar('pro', p.id) ? ' on' : ''}`}
                onClick={() => toggleCompar({ kind: 'pro', id: p.id, nom: p.nom })}
                title="Ajouter au comparateur"
              >
                <Icon name="layers" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {branche === 'concours' && (
        <div className="ocarte-grille">
          {CONCOURS.map((c, i) => (
            <button className="ocarte-branche" key={c.id} style={{ animationDelay: `${i * 70}ms` }} onClick={() => setFiche({ kind: 'concours', id: c.id })}>
              <span className="ocarte-branche-txt">
                <strong>
                  <Icon name="award" size={15} /> {c.nom}
                </strong>
                <small>{c.preparation}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {branche === 'etranger' && (
        <div className="ocarte-grille">
          {ETRANGER.map((x, i) => (
            <button className="ocarte-branche" key={x.id} style={{ animationDelay: `${i * 70}ms` }} onClick={() => setFiche({ kind: 'etranger', id: x.id })}>
              <img src="/metiers/ciel.jpg" alt="" loading="lazy" />
              <span className="ocarte-branche-txt">
                <strong>
                  <Icon name="globe" size={15} /> {x.nom}
                </strong>
                <small>{x.budget}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {branche === 'travail' && (
        <div className="ocarte-grille">
          {TRAVAIL.map((t, i) => (
            <button className="ocarte-branche" key={i} style={{ animationDelay: `${i * 70}ms` }} onClick={() => setFiche({ kind: 'travail', id: i })}>
              <span className="ocarte-branche-txt">
                <strong>
                  <Icon name="zap" size={15} /> {t.nom}
                </strong>
                <small>{t.desc}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {fiche && (
        <Fiche
          fiche={fiche}
          onClose={() => setFiche(null)}
          onOpenMetier={onOpenMetier}
          onNaviguer={(b, extra) => {
            reset();
            setFiche(null);
            setBranche(b);
            extra?.();
          }}
          inCompar={inCompar}
          toggleCompar={toggleCompar}
        />
      )}

      {compar.length > 0 && !showCompar && (
        <div className="compar-tray">
          {compar.map((c) => (
            <span className="fil-chip" key={c.kind + c.id}>
              {c.nom}
              <button onClick={() => toggleCompar(c)} title="Retirer">
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <button className="btn btn-primary" disabled={compar.length < 2} onClick={() => setShowCompar(true)}>
            Comparer côte à côte
          </button>
        </div>
      )}

      {showCompar && <Comparateur items={compar} onClose={() => setShowCompar(false)} onOpenMetier={onOpenMetier} />}
      {wizard && (
        <Wizard
          filiere={filiere}
          onClose={() => setWizard(false)}
          onOuvrir={(f) => {
            setWizard(false);
            setFiche(f);
          }}
          onOpenMetier={onOpenMetier}
          onNaviguer={(b) => {
            reset();
            setWizard(false);
            setBranche(b);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------- FICHE DÉTAILLÉE ------------------------------- */
function Fiche({ fiche, onClose, onOpenMetier, onNaviguer, inCompar, toggleCompar }) {
  const { kind, id } = fiche;
  let corps = null;
  let titre = '';
  let comparable = null;

  if (kind === 'licence') {
    const L = LICENCES[id];
    titre = L.nom;
    comparable = { kind: 'licence', id, nom: L.nom };
    corps = (
      <>
        <p>{L.presentation}</p>
        <div className="fiche-grille">
          <div><strong>Durée</strong><span>{L.duree}</span></div>
          <div><strong>Admission</strong><span>{L.admission}</span></div>
          <div><strong>Frais</strong><span>{L.frais}</span></div>
          <div>
            <strong>Difficulté</strong>
            <span>
              {'●'.repeat(L.difficulte)}
              {'○'.repeat(3 - L.difficulte)}
            </span>
          </div>
        </div>
        <h4>Matières principales</h4>
        <div className="chips3">{L.matieres.map((m) => <span key={m}>{m}</span>)}</div>
        <h4>Compétences acquises</h4>
        <div className="chips3">{L.competences.map((m) => <span key={m}>{m}</span>)}</div>
        <h4>Universités qui la proposent</h4>
        <div className="chips3">
          {L.univs.map((u) => (
            <button key={u} className="chip-lien" onClick={() => onNaviguer('universite', () => {}) }>
              {UNIVERSITES.find((x) => x.id === u)?.nom}
            </button>
          ))}
        </div>
        <h4 className="ok-text">Que faire après cette licence ?</h4>
        <div className="apres-blocs">
          <div>
            <strong>Masters recommandés</strong>
            {L.apres.masters.map((m) => <span key={m} className="puce">{m}</span>)}
          </div>
          <div>
            <strong>Métiers accessibles</strong>
            {L.apres.metiers.map((m) => (
              <button key={m} className="puce lien" onClick={() => onOpenMetier(m)}>
                {m}
              </button>
            ))}
          </div>
          {L.apres.concours.length > 0 && (
            <div>
              <strong>Concours</strong>
              {L.apres.concours.map((m) => <span key={m} className="puce">{m}</span>)}
            </div>
          )}
          <div>
            <strong>Secteurs qui recrutent</strong>
            {L.apres.secteurs.map((m) => <span key={m} className="puce">{m}</span>)}
          </div>
        </div>
        <p className="muted small">
          <Icon name="chart" size={13} /> Débouchés : {L.apres.debouche}
        </p>
        <h4>Et si je change d'avis ?</h4>
        <ul className="passerelles">
          {L.passerelles.map((p) => (
            <li key={p}>{p}</li>
          ))}
          {PASSERELLES_GLOBALES.slice(0, 2).map((p) => (
            <li key={p.de}>
              {p.de} → {p.vers} <em>({p.note})</em>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (kind === 'ecole') {
    const E = ECOLES[id];
    titre = E.nom;
    comparable = { kind: 'ecole', id, nom: E.nom };
    corps = (
      <>
        <div className="fiche-grille">
          <div><strong>Ville</strong><span>{E.ville}</span></div>
          <div><strong>Durée</strong><span>{E.duree}</span></div>
          <div><strong>Diplôme</strong><span>{E.diplome}</span></div>
          <div><strong>Admission</strong><span>{E.admission}</span></div>
          <div><strong>Inscription</strong><span>{E.fraisInscription}</span></div>
          <div><strong>Scolarité</strong><span>{E.fraisScolarite}</span></div>
        </div>
        <h4>Débouchés</h4>
        <p>{E.debouches}</p>
        <h4>Métiers</h4>
        <div className="chips3">
          {E.metiers.map((m) => (
            <button key={m} className="puce lien" onClick={() => onOpenMetier(m)}>
              {m}
            </button>
          ))}
        </div>
        <h4>Poursuite d'études</h4>
        <div className="chips3">{E.masters.map((m) => <span key={m}>{m}</span>)}</div>
        <h4>Et si je change d'avis ?</h4>
        <ul className="passerelles">
          {PASSERELLES_GLOBALES.slice(1, 4).map((p) => (
            <li key={p.de}>
              {p.de} → {p.vers} <em>({p.note})</em>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (kind === 'pro') {
    const P = PRO[id];
    titre = P.nom;
    comparable = { kind: 'pro', id, nom: P.nom };
    corps = (
      <>
        <div className="fiche-grille">
          <div><strong>Durée</strong><span>{P.duree}</span></div>
          <div><strong>Admission</strong><span>{P.admission}</span></div>
          <div><strong>Coût</strong><span>{P.cout}</span></div>
          <div><strong>Diplôme</strong><span>{P.diplome}</span></div>
        </div>
        <h4>Débouchés</h4>
        <p>{P.debouches}</p>
        <h4>Passerelle</h4>
        <p className="ok-text">{P.passerelle}</p>
      </>
    );
  }

  if (kind === 'concours') {
    const C = CONCOURS[id];
    titre = C.nom;
    corps = (
      <>
        <div className="fiche-grille">
          <div><strong>Préparation</strong><span>{C.preparation}</span></div>
          <div><strong>Durée après réussite</strong><span>{C.dureeApres}</span></div>
        </div>
        <h4>Métiers visés</h4>
        <div className="chips3">
          {C.metiers.map((m) => (
            <button key={m} className="puce lien" onClick={() => onOpenMetier(m)}>
              {m}
            </button>
          ))}
        </div>
        <p className="ok-text">
          <Icon name="bulb" size={14} /> {C.conseil}
        </p>
      </>
    );
  }

  if (kind === 'etranger') {
    const X = ETRANGER[id];
    titre = X.nom;
    corps = (
      <>
        <div className="fiche-grille">
          <div><strong>Budget</strong><span>{X.budget}</span></div>
          <div><strong>Conditions</strong><span>{X.conditions}</span></div>
        </div>
        <h4>Atouts</h4>
        <p className="ok-text">{X.atouts}</p>
        <h4>Vigilance</h4>
        <p className="err-text">{X.vigilance}</p>
      </>
    );
  }

  if (kind === 'travail') {
    const T = TRAVAIL[id];
    titre = T.nom;
    corps = (
      <>
        <p>{T.desc}</p>
        <div className="fiche-grille">
          <div><strong>Atout</strong><span>{T.atout}</span></div>
          <div><strong>Risque</strong><span>{T.risque}</span></div>
        </div>
        <h4>Et si je veux reprendre des études ?</h4>
        <p className="ok-text">{T.passerelle}</p>
      </>
    );
  }

  return (
    <Modal title={titre} onClose={onClose} wide>
      {comparable && (
        <button
          className={`btn btn-outline${inCompar(comparable.kind, comparable.id) ? ' hl-saved' : ''}`}
          style={{ marginBottom: 10 }}
          onClick={() => toggleCompar(comparable)}
        >
          <Icon name="layers" size={14} /> {inCompar(comparable.kind, comparable.id) ? 'Dans le comparateur' : 'Ajouter au comparateur'}
        </button>
      )}
      {corps}
    </Modal>
  );
}

/* -------------------------------- COMPARATEUR -------------------------------- */
function Comparateur({ items, onClose, onOpenMetier }) {
  const rows = [
    ['Prix / frais', (f) => f.kind === 'licence' ? LICENCES[f.id].frais : f.kind === 'ecole' ? `${ECOLES[f.id].fraisInscription} + ${ECOLES[f.id].fraisScolarite}` : f.kind === 'pro' ? PRO[f.id].cout : '—'],
    ['Durée', (f) => f.kind === 'licence' ? LICENCES[f.id].duree : f.kind === 'ecole' ? ECOLES[f.id].duree : PRO[f.id].duree],
    ["Conditions d'accès", (f) => f.kind === 'licence' ? LICENCES[f.id].admission : f.kind === 'ecole' ? ECOLES[f.id].admission : PRO[f.id].admission],
    ['Diplôme', (f) => f.kind === 'licence' ? 'Licence (Bac+3)' : f.kind === 'ecole' ? ECOLES[f.id].diplome : PRO[f.id].diplome],
    ['Matières / programme', (f) => f.kind === 'licence' ? LICENCES[f.id].matieres.join(', ') : f.kind === 'ecole' ? ECOLES[f.id].debouches : PRO[f.id].debouches],
    ['Masters possibles', (f) => f.kind === 'licence' ? LICENCES[f.id].apres.masters.join(' · ') : f.kind === 'ecole' ? ECOLES[f.id].masters.join(' · ') : PRO[f.id].passerelle],
    ['Débouchés', (f) => f.kind === 'licence' ? LICENCES[f.id].apres.debouche : f.kind === 'ecole' ? ECOLES[f.id].debouches : PRO[f.id].debouches],
    ['Métiers', (f) => f.kind === 'licence' ? LICENCES[f.id].apres.metiers.join(', ') : f.kind === 'ecole' ? ECOLES[f.id].metiers.join(', ') : PRO[f.id].metiers.join(', ')],
  ];
  return (
    <Modal title="Comparateur de formations" onClose={onClose} wide>
      <div className="compar-table">
        <div className="compar-col head" style={{ gridTemplateColumns: `120px repeat(${items.length}, 1fr)` }}>
          <div className="compar-cell" />
          {items.map((f) => (
            <div className="compar-cell titre" key={f.kind + f.id}>
              {f.nom}
            </div>
          ))}
        </div>
        {rows.map(([label, fn]) => (
          <div className="compar-col" key={label} style={{ gridTemplateColumns: `120px repeat(${items.length}, 1fr)` }}>
            <div className="compar-cell label">{label}</div>
            {items.map((f) => (
              <div className="compar-cell" key={f.kind + f.id}>
                {fn(f)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ----------------------------- TROUVER MON PARCOURS ----------------------------- */
function Wizard({ filiere, onClose, onOuvrir, onOpenMetier, onNaviguer }) {
  const matieres = (FILIERES[filiere] || FILIERES.S2).matieres;
  const [profil, setProfil] = useState({ matieres: [], interets: [], metier: '', budget: 1, niveau: 'bon' });
  const [resultats, setResultats] = useState(null);

  const bascule = (cle, v) =>
    setProfil((p) => ({ ...p, [cle]: p[cle].includes(v) ? p[cle].filter((x) => x !== v) : [...p[cle], v] }));

  function calculer() {
    const formations = [
      ...Object.entries(LICENCES).map(([id, L]) => ({ kind: 'licence', id, nom: L.nom, tags: L.tags, branche: 'universite' })),
      ...ECOLES.map((E) => ({ kind: 'ecole', id: E.id, nom: E.nom, tags: { matieres: [], interets: E.interets, budget: E.budget, select: E.select }, branche: 'ecoles' })),
      ...PRO.map((P) => ({ kind: 'pro', id: P.id, nom: P.nom, tags: P.tags, branche: 'pro' })),
    ].map((f) => ({ ...f, score: scoreFormation(profil, f.tags) }));
    formations.sort((a, b) => b.score - a.score);
    const niveau = { faible: 1, bon: 2, excellent: 3 }[profil.niveau] || 2;
    const reco = formations.find((f) => f.tags.select <= niveau) || formations[0];
    const ambit = formations.find((f) => f.tags.select > niveau && f.id !== reco?.id) || formations[1];
    const alt = formations.find((f) => f.branche !== reco?.branche && f.id !== reco?.id && f.id !== ambit?.id) || formations[2];
    setResultats({ reco, ambit, alt });
  }

  function timeline(f) {
    if (!f) return [];
    if (f.kind === 'licence') {
      const L = LICENCES[f.id];
      return [
        { t: 'Bac', s: FILIERES[filiere]?.label || filiere },
        { t: 'Université', s: UNIVERSITES.find((u) => u.id === L.univs[0])?.nom, nav: 'universite' },
        { t: L.nom, s: `${L.duree} · ${L.frais}`, fiche: { kind: 'licence', id: f.id } },
        { t: 'Master', s: L.apres.masters[0] },
        { t: 'Métier', s: L.apres.metiers[0], metier: L.apres.metiers[0] },
      ];
    }
    if (f.kind === 'ecole') {
      const E = ECOLES[f.id];
      return [
        { t: 'Bac', s: FILIERES[filiere]?.label || filiere },
        { t: 'École', s: E.nom, fiche: { kind: 'ecole', id: E.id } },
        { t: 'Diplôme', s: E.diplome },
        { t: 'Master', s: E.masters[0] },
        { t: 'Métier', s: E.metiers[0], metier: E.metiers[0] },
      ];
    }
    const P = PRO[f.id];
    return [
      { t: 'Bac', s: FILIERES[filiere]?.label || filiere },
      { t: 'Formation', s: P.nom, fiche: { kind: 'pro', id: P.id } },
      { t: 'Diplôme', s: P.diplome },
      { t: 'Passerelle', s: P.passerelle },
      { t: 'Métier', s: P.metiers[0], metier: P.metiers[0] },
    ];
  }

  const NB = [
    ['reco', 'Parcours recommandé', 'ok-text'],
    ['ambit', 'Parcours ambitieux', 'warn-text'],
    ['alt', 'Parcours alternatif', 'muted'],
  ];

  return (
    <Modal title="Trouver mon parcours" onClose={onClose} wide>
      <p className="muted small">Quelques questions : le site te construit trois parcours en ligne du temps.</p>
      <label className="label">Mes matières préférées</label>
      <div className="chips3">
        {matieres.map((m) => (
          <button key={m.id} className={profil.matieres.includes(m.id) ? 'chip on' : 'chip'} onClick={() => bascule('matieres', m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <label className="label">Mes centres d'intérêt</label>
      <div className="chips3">
        {INTERETS.map((m) => (
          <button key={m.id} className={profil.interets.includes(m.id) ? 'chip on' : 'chip'} onClick={() => bascule('interets', m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label className="label">Mon niveau</label>
          <select className="input" value={profil.niveau} onChange={(e) => setProfil({ ...profil, niveau: e.target.value })}>
            <option value="faible">Je vise simple</option>
            <option value="bon">Bon niveau</option>
            <option value="excellent">Excellent / mention</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label className="label">Budget familial</label>
          <select className="input" value={profil.budget} onChange={(e) => setProfil({ ...profil, budget: Number(e.target.value) })}>
            <option value={1}>Public / économique</option>
            <option value={2}>Privé moyen</option>
            <option value={3}>Privé haut de gamme</option>
          </select>
        </div>
      </div>
      <label className="label">Le métier que je vise (optionnel)</label>
      <input className="input" value={profil.metier} onChange={(e) => setProfil({ ...profil, metier: e.target.value })} placeholder="Ex. ingénieur, avocat, data scientist…" />
      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={calculer}>
        <Icon name="spark" size={15} /> Construire mes 3 parcours
      </button>

      {resultats && (
        <div className="parcours-liste">
          {NB.map(([cle, label, cls]) => {
            const f = resultats[cle];
            if (!f) return null;
            return (
              <div className="parcours-carte" key={cle}>
                <strong className={cls}>{label}</strong>
                <div className="timeline">
                  {timeline(f).map((etape, i) => (
                    <button
                      className="timeline-etape"
                      key={i}
                      style={{ animationDelay: `${i * 90}ms` }}
                      onClick={() => {
                        if (etape.fiche) onOuvrir(etape.fiche);
                        else if (etape.metier) onOpenMetier(etape.metier);
                        else if (etape.nav) onNaviguer(etape.nav);
                      }}
                    >
                      <span className="tl-point" />
                      <span className="tl-txt">
                        <strong>{etape.t}</strong>
                        <small>{etape.s}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
