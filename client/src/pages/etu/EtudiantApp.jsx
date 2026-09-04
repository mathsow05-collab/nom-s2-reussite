import { useEffect, useRef, useState } from 'react';
import { api, getToken, clearToken } from '../../api.js';
import Icon from '../../Icon.jsx';
import { Modal, Spinner } from '../../ui.jsx';
import Anglais from '../Anglais.jsx';
import Juridique from '../Juridique.jsx';
import InstallApp from '../InstallApp.jsx';
import { sonClic, sonOuvrir } from '../../sons.js';
import { FILIERES_ETU } from '../../data/etu.js';
import Groupes from './Groupes.jsx';
import Boutique from './Boutique.jsx';
import CultureEtu from './CultureEtu.jsx';
import OrientationEtu from './OrientationEtu.jsx';
import PlanningEtu from './PlanningEtu.jsx';
import Opportunites from './Opportunites.jsx';
import ProfilEtu from './ProfilEtu.jsx';

const TUILES = [
  { id: 'anglais', icon: 'cap', titre: 'Maîtrise l’anglais', sub: '1000 mots en jeu · gratuit', cls: 't-sky' },
  { id: 'groupes', icon: 'users', titre: 'Groupes de travail', sub: 'Par filière ou projet', cls: 't-green' },
  { id: 'boutique', icon: 'briefcase', titre: 'Boutique de packs', sub: 'Cours vendus par les étudiants', cls: 't-amber' },
  { id: 'culture', icon: 'bulb', titre: 'Culture de ma filière', sub: 'Infos dédiées chaque jour', cls: 't-pink' },
  { id: 'orientation', icon: 'compass', titre: 'Orientation', sub: 'Débouchés & filières', cls: 't-teal' },
  { id: 'planning', icon: 'calendar', titre: 'Mon planning', sub: 'Emploi du temps perso', cls: 't-navy' },
  { id: 'opportunites', icon: 'award', titre: 'Bourses & stages', sub: 'Opportunités vérifiées', cls: 't-violet' },
];

export default function EtudiantApp() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('accueil');
  const [sheet, setSheet] = useState(false);
  const [jur, setJur] = useState(false);
  const premierTab = useRef(true);

  useEffect(() => {
    api('/etudiant/me')
      .then(setMe)
      .catch((e) => {
        if (e.status === 401) {
          clearToken();
          window.location.hash = '#/etudiant';
        }
      });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.target?.closest?.('button, .pill')) sonClic();
    };
    document.addEventListener('click', h, true);
    return () => document.removeEventListener('click', h, true);
  }, []);

  useEffect(() => {
    if (premierTab.current) {
      premierTab.current = false;
      return;
    }
    sonOuvrir(tab);
  }, [tab]);

  function logout() {
    api('/etudiant/logout').catch(() => {});
    clearToken();
    window.location.hash = '#/etudiant';
  }

  if (!me)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const fil = FILIERES_ETU[me.filiere] || { label: me.filiere, ico: '🎓' };

  return (
    <div className="student">
      <header className="topbar">
        <button className="topbar-brand" onClick={() => setTab('accueil')} title="Accueil">
          <span className="logo-kd">E</span> <span>SCHOOBY Étudiant</span>
        </button>
        <div className="topbar-user">
          <button className="avatar-btn" onClick={() => setTab('profil')} title="Mon profil">
            <span className={`anime-av i${me.avatar?.startsWith('an:') ? me.avatar.slice(3) : (me.etu_id.length || 0) % 8}`} />
          </button>
          <div className="topbar-id">
            <strong>
              <span className="topbar-name">{me.prenom} {me.nom}</span>{' '}
              <span className="filiere-badge fil-S2">{fil.ico} {fil.label}</span>
            </strong>
            <small>{me.universite || 'Étudiant·e'} · {me.etu_id}</small>
          </div>
        </div>
      </header>

      {tab === 'accueil' && <Home me={me} onOpen={setTab} />}
      {tab === 'anglais' && <Anglais />}
      {tab === 'groupes' && <Groupes me={me} />}
      {tab === 'boutique' && <Boutique me={me} />}
      {tab === 'culture' && <CultureEtu me={me} />}
      {tab === 'orientation' && <OrientationEtu />}
      {tab === 'planning' && <PlanningEtu />}
      {tab === 'opportunites' && <Opportunites />}
      {tab === 'profil' && (
        <ProfilEtu me={me} logout={logout} onJur={() => setJur(true)} onAvatar={(a) => {
          api('/etudiant/profil', { method: 'POST', body: { avatar: a } }).then(() => setMe((m) => ({ ...m, avatar: a })));
        }} />
      )}

      <nav className="bnav">
        <button className={tab === 'accueil' ? 'on' : ''} onClick={() => setTab('accueil')}>
          <Icon name="home" size={19} /> Accueil
        </button>
        <button className={tab === 'groupes' ? 'on' : ''} onClick={() => setTab('groupes')}>
          <Icon name="users" size={19} /> Groupes
        </button>
        <button className={tab === 'boutique' ? 'on' : ''} onClick={() => setTab('boutique')}>
          <Icon name="briefcase" size={19} /> Boutique
        </button>
        <button className={sheet ? 'on' : ''} onClick={() => setSheet(true)}>
          <Icon name="grid" size={19} /> Plus
        </button>
        <button className={tab === 'profil' ? 'on' : ''} onClick={() => setTab('profil')}>
          <Icon name="user" size={19} /> Profil
        </button>
      </nav>

      {sheet && (
        <div className="sheet3" onClick={() => setSheet(false)}>
          <div className="sheet3-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet3-handle" />
            <div className="sheet3-grid">
              {TUILES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSheet(false);
                    setTab(t.id);
                  }}
                >
                  <span className="bico2">
                    <Icon name={t.icon} size={18} />
                  </span>
                  {t.titre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <InstallApp auto />
      {jur && (
        <Modal title="Informations légales" onClose={() => setJur(false)} wide>
          <Juridique avecBoutonFermer onFermer={() => setJur(false)} />
        </Modal>
      )}
    </div>
  );
}

function Home({ me, onOpen }) {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Salam' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const fil = FILIERES_ETU[me.filiere] || { label: me.filiere, ico: '🎓' };
  return (
    <main className="container home3">
      <header className="hello3">
        <h1>{salut}, {me.prenom} 🎓</h1>
        <p>Ton espace étudiant 100 % gratuit — {fil.ico} {fil.label}{me.universite ? ` · ${me.universite}` : ''}.</p>
      </header>

      <section className="card welcome3">
        <div className="welcome3-txt">
          <strong>Ici tout est gratuit.</strong>
          <p className="muted small">
            Anglais pour tous, groupes de travail par filière, culture dédiée, orientation, planning et une boutique où
            les étudiants vendent leurs packs de cours entre eux.
          </p>
          <div className="welcome3-btns">
            <button className="btn btn-primary" onClick={() => onOpen('groupes')}>
              <Icon name="users" size={15} /> Trouver mon groupe
            </button>
            <button className="btn btn-outline" onClick={() => onOpen('anglais')}>
              <Icon name="cap" size={15} /> Booster mon anglais
            </button>
          </div>
        </div>
      </section>

      <h2 className="home3-title">Tous tes espaces</h2>
      <div className="bento">
        {TUILES.map((t, i) => (
          <button key={t.id} className="ptile" style={{ '--i': i }} onClick={() => onOpen(t.id)}>
            <span className="ptile-txt2">
              <strong>{t.titre}</strong>
              <small>{t.sub}</small>
            </span>
            <span className="bgo">→</span>
          </button>
        ))}
      </div>
    </main>
  );
}
