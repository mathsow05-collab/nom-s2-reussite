import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, clearToken, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';
import PdfViewer from '../components/PdfViewer.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import AudioCoran from '../components/AudioCoran.jsx';
import QuizAyat from '../components/QuizAyat.jsx';
import Metiers from './Metiers.jsx';
import Annales from './Annales.jsx';
import Quiz from './Quiz.jsx';
import Agenda from './Agenda.jsx';
import Outils from './Outils.jsx';
import Echanges from './Echanges.jsx';
import ParcoursArabe from './ParcoursArabe.jsx';
import Culture from './Culture.jsx';
import Assistant from './Assistant.jsx';
import Suivi from './Suivi.jsx';
import { TelechargerHL } from '../offline.jsx';
import Profil from './Profil.jsx';
import Examens from './Examens.jsx';
import Chat from './Chat.jsx';
import Decouverte from './Decouverte.jsx';
import Onboarding from './Onboarding.jsx';
import Flashcards from './Flashcards.jsx';
import Illu from '../components/Illustrations.jsx';
import { computeStats, getProg, markCours, recos, tickMinutes, fmtMin, streak, xpOf } from '../progress.js';

export const AVATARS = ['🧑‍🎓','👩🏾‍','🦁','🚀','⭐','📚','️','🎯','','🕌','','🎨','🎧','🐱','🦅','🌍'];

const TABS = [
  { id: 'ia', label: 'Prof IA', icon: 'chat' },
  { id: 'parcours', label: 'Parcours', icon: 'map', arSeul: true },
  { id: 'culture', label: 'Culture', icon: 'bulb', pasAR: true },
  { id: 'cours', label: 'Cours', icon: 'book' },
  { id: 'annales', label: 'Annales', icon: 'file' },
  { id: 'quiz', label: 'Quiz', icon: 'award' },
  { id: 'orientation', label: 'Orientation', icon: 'compass' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'outils', label: 'Outils', icon: 'chart' },
  { id: 'echanges', label: 'Échanges', icon: 'chat' },
];

export default function StudentApp() {
  const [me, setMe] = useState(null);
  const [cours, setCours] = useState(null);
  const [lost, setLost] = useState(null); // raison de la déconnexion forcée
  const [tab, setTab] = useState('accueil');
  const [matiere, setMatiere] = useState('all');
  const [viewer, setViewer] = useState(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([api('/eleve/me'), api('/eleve/cours')]);
      setMe(m);
      setCours(c);
    } catch (e) {
      if (e.status === 401) setLost('session_perdue');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Suivi local d'activité : chargement + 1 minute d'étude comptée par minute passée.
  useEffect(() => {
    if (!me) return undefined;
    setProg(getProg(me.eleve_id));
    const t = setInterval(() => setProg(tickMinutes(me.eleve_id, 1)), 60000);
    return () => clearInterval(t);
  }, [me]);

  // Notifications intelligentes : nouveautés, échéances proches, objectifs.
  useEffect(() => {
    if (!me || !cours) return undefined;
    let live = true;
    (async () => {
      const id = me.eleve_id;
      const seenKey = `s2r_seen_${id}`;
      let seen = null;
      try {
        seen = JSON.parse(localStorage.getItem(seenKey) || 'null');
      } catch {
        seen = null;
      }
      const [annales, echeances] = await Promise.all([
        api('/eleve/annales').catch(() => []),
        api('/eleve/echeances').catch(() => []),
      ]);
      if (!live) return;
      const premier = !seen;
      seen = seen || { cours: [], annales: [] };
      const list = [];
      if (!premier) {
        for (const c of cours) if (!seen.cours.includes(c.id)) list.push({ emoji: '📚', txt: `Nouveau cours disponible : ${c.titre}`, tab: 'cours' });
        for (const a of annales) if (!seen.annales.includes(a.id)) list.push({ emoji: '📝', txt: `Nouvelle annale ${a.annee} : ${a.titre}`, tab: 'annales' });
      }
      const now = Date.now();
      for (const e of echeances) {
        const days = Math.ceil((new Date(e.date_debut) - now) / 86400000);
        if (days >= 0 && days <= 7)
          list.push({ emoji: '⏰', txt: `${e.titre} — ${days === 0 ? 'c’est aujourd’hui !' : `dans ${days} j`}`, tab: 'agenda' });
      }
      const st = computeStats(getProg(id), cours);
      if (st.quizSemaine === 0) list.push({ emoji: '🎯', txt: 'Objectif de la semaine : fais ton premier quiz', tab: 'quiz' });
      if (st.coursSemaine === 0) list.push({ emoji: '📖', txt: 'Objectif de la semaine : ouvre au moins un cours', tab: 'cours' });
      setNotifList(list.slice(0, 12));
      localStorage.setItem(seenKey, JSON.stringify({ cours: cours.map((c) => c.id), annales: annales.map((a) => a.id) }));
    })();
    return () => {
      live = false;
    };
  }, [me, cours]);

  // Temps réel : le serveur pousse la déconnexion forcée via SSE.
  useEffect(() => {
    if (!me) return undefined;
    const es = new EventSource(`/api/eleve/stream?token=${encodeURIComponent(getToken())}`);
    es.addEventListener('session', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setLost(d.type || 'session_perdue');
      } catch {
        /* ignore */
      }
    });
    es.addEventListener('reponse', (ev) => {
      try {
        window.dispatchEvent(new CustomEvent('s2r-sse', { detail: JSON.parse(ev.data) }));
      } catch {
        /* ignore */
      }
    });
    // Chat & binômes : nouveau message ou invitation poussés par le serveur.
    es.addEventListener('chat', () => {
      window.dispatchEvent(new Event('kd-chat'));
    });
    return () => es.close();
  }, [me]);

  // Filet de sécurité si le SSE est bloqué par le réseau.
  useEffect(() => {
    if (!me) return undefined;
    const t = setInterval(() => {
      api('/eleve/me').catch((e) => {
        if (e.status === 401) setLost('session_perdue');
      });
    }, 45000);
    return () => clearInterval(t);
  }, [me]);

  // Contenu recommandé depuis le chat : ouvre directement le cours ou l'annale.
  const [annalesFocus, setAnnalesFocus] = useState(null);
  function ouvrirContenu(payload) {
    if (payload?.kind === 'cours') {
      const c = (cours || []).find((x) => x.id === payload.id);
      if (c) {
        setTab('cours');
        setViewer(c);
      }
    } else if (payload?.kind === 'annale') {
      setAnnalesFocus({ id: payload.id });
      setTab('annales');
    }
  }

  // Chat & binômes : lien d'invitation reçu dans l'URL (?inviter=CODE) + badge.
  const [chatCode, setChatCode] = useState(null);
  const [chatBadge, setChatBadge] = useState(0);

  // Ligue : envoie la progression locale au serveur (classement hebdo).
  useEffect(() => {
    if (!me) return undefined;
    const send = () => {
      const p = getProg(me.eleve_id);
      api('/eleve/prog/sync', { method: 'POST', body: { xp: xpOf(p), minutes: p.minutes, streak: streak(p) } }).catch(() => {});
    };
    send();
    const t = setInterval(send, 60000);
    return () => clearInterval(t);
  }, [me]);

  // Rappels locaux (PWA) : flamme en danger / binôme qui attend.
  useEffect(() => {
    if (!me || !('Notification' in window) || Notification.permission !== 'granted') return;
    const auj = new Date().toISOString().slice(0, 10);
    const cle = `kd_notif_${auj}`;
    if (sessionStorage.getItem(cle)) return;
    const p = getProg(me.eleve_id);
    const st = streak(p);
    const actif = (p.jours[auj] || 0) > 0;
    const msgs = [];
    if (st > 0 && !actif) msgs.push(`Ta série de ${st} jour(s) est en danger — 5 min de quiz pour la garder.`);
    if (chatBadge > 0) msgs.push('Ton binôme t’attend sur le chat.');
    if (msgs.length) {
      try {
        new Notification('SCHOOBY', { body: msgs.join(' ') });
        sessionStorage.setItem(cle, '1');
      } catch {
        /* ignore */
      }
    }
  }, [me, chatBadge]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const code = p.get('inviter');
    if (code) {
      p.delete('inviter');
      const qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
      setTab('chat');
      setChatCode(code);
    }
  }, []);
  useEffect(() => {
    if (!me) return undefined;
    const maj = () => api('/eleve/chat/badge').then((d) => setChatBadge(d.n)).catch(() => {});
    maj();
    const t = setInterval(maj, 25000);
    window.addEventListener('kd-chat', maj);
    window.addEventListener('kd-chat-lu', maj);
    return () => {
      clearInterval(t);
      window.removeEventListener('kd-chat', maj);
      window.removeEventListener('kd-chat-lu', maj);
    };
  }, [me]);

  const [sheet, setSheet] = useState(false);
  const [prog, setProg] = useState(null);
  const [qCours, setQCours] = useState('');
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('s2r_theme') || 'dark';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme && theme !== 'light') document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem('s2r_theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  function logout() {
    api('/eleve/logout').catch(() => {});
    clearToken();
    window.location.hash = '#/';
  }

  // Protections anti-capture : pas de menu contextuel, pas de sélection,
  // raccourcis d'impression/capture bloqués. (Aucune méthode web n'est 100 %
  // efficace contre une capture système : le filigrane identifie donc chaque fuite.)
  useEffect(() => {
    const noCtx = (e) => e.preventDefault();
    const noKey = (e) => {
      const k = e.key.toLowerCase();
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        try {
          navigator.clipboard?.writeText('');
        } catch {
          /* ignore */
        }
      }
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(k)) e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) e.preventDefault();
      if (e.ctrlKey && k === 'c' && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) e.preventDefault();
    };
    const noCopy = (e) => e.preventDefault();
    document.addEventListener('contextmenu', noCtx);
    document.addEventListener('keydown', noKey);
    document.addEventListener('copy', noCopy);
    document.addEventListener('cut', noCopy);
    document.addEventListener('dragstart', noCopy);
    return () => {
      document.removeEventListener('contextmenu', noCtx);
      document.removeEventListener('keydown', noKey);
      document.removeEventListener('copy', noCopy);
      document.removeEventListener('cut', noCopy);
      document.removeEventListener('dragstart', noCopy);
    };
  }, []);

  // Bouton retour Android : navigue dans l'app ; sur l'accueil → confirmation.
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [onboard, setOnboard] = useState(() => {
    try {
      return !localStorage.getItem('kd_onboarded');
    } catch {
      return false;
    }
  });
  const [hobbies, setHobbies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kd_hobbies') || '[]');
    } catch {
      return [];
    }
  });
  const coucheRef = useRef(() => null);
  coucheRef.current = () => {
    if (viewer) return () => setViewer(null);
    if (notifsOpen) return () => setNotifsOpen(false);
    if (searchOpen) return () => setSearchOpen(false);
    if (sheet) return () => setSheet(false);
    if (tab && tab !== 'accueil') return () => setTab('accueil');
    return null;
  };
  useEffect(() => {
    window.history.replaceState({ kd: 1 }, '');
    window.history.pushState({ kd: 1 }, '');
    const onPop = () => {
      const fermer = coucheRef.current();
      if (fermer) fermer();
      else setConfirmQuit(true);
      window.history.pushState({ kd: 1 }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (lost) return <SessionLost reason={lost} />;
  if (!me || !cours)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  const filiere = me.filiere || 'S2';
  const matieres = (FILIERES[filiere] || FILIERES.S2).matieres;
  const visibleAll = matiere === 'all' ? cours : cours.filter((c) => c.matiere === matiere);
  const nq3 = norm3(qCours);
  const visible = nq3 ? visibleAll.filter((c) => norm3(`${c.titre} ${c.description}`).includes(nq3)) : visibleAll;

  const wm = encodeURIComponent(me.eleve_id);

  return (
    <div className="student">
      {/* Filigrane discret anti-fuite : identifie l'élève sur toute capture */}
      <div
        className="watermark"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='180'%3E%3Ctext x='14' y='96' fill='%23000' fill-opacity='0.025' font-size='15' transform='rotate(-18 130 90)'%3E${wm}%3C/text%3E%3C/svg%3E")`,
        }}
      />
      <header className="topbar">
        <button className="topbar-brand" onClick={() => setTab('accueil')} title="Accueil">
          <span className="logo-kd">S</span> <span>SCHOOBY</span>
        </button>
        <div className="topbar-user">
          <button className="icon3" onClick={() => setSearchOpen(true)} title="Recherche globale">
            <Icon name="search" size={17} />
          </button>
          <button className="icon3" onClick={() => setNotifsOpen(true)} title="Notifications">
            <Icon name="bell" size={17} />
            {notifList.length > 0 && <span className="dot3">{notifList.length}</span>}
          </button>
          <button className="avatar-btn" onClick={() => setTab('profil')} title="Mon profil">
            <span className={`anime-av i${me.avatar?.startsWith('an:') ? me.avatar.slice(3) : (me.id || 0) % 8}`} />
          </button>
          <div className="topbar-id">
            <strong>
              <span className="topbar-name">
                {me.prenom} {me.nom}
              </span>{' '}
              <span className={`filiere-badge fil-${filiere}`}>{filiere}</span>
            </strong>
            <small>
              {me.classe} · {me.eleve_id}
            </small>
          </div>
        </div>
      </header>


      {onboard && (
        <Onboarding
          prenom={me.prenom}
          theme={theme}
          onTheme={setTheme}
          onFin={(hobs, av) => {
            try {
              localStorage.setItem('kd_onboarded', '1');
              localStorage.setItem('kd_hobbies', JSON.stringify(hobs));
            } catch {
              /* ignore */
            }
            setHobbies(hobs);
            if (av) {
              api('/eleve/profil', { method: 'POST', body: { avatar: av } }).then(() => setMe((m) => ({ ...m, avatar: av })));
            }
            setOnboard(false);
          }}
        />
      )}

      {tab === 'accueil' && (
        <Home
          me={me}
          filiere={filiere}
          prog={prog || PROG_VIDE}
          cours={cours}
          onOpen={setTab}
          onGo={(t, m) => {
            if (m) setMatiere(m);
            setTab(t);
          }}
        />
      )}
      {tab === 'suivi' && <Suivi me={me} cours={cours} prog={prog || PROG_VIDE} onGo={(t) => setTab(t)} />}
      {tab === 'profil' && (
        <Profil
          me={me}
          cours={cours}
          prog={prog || PROG_VIDE}
          theme={theme}
          onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onAvatar={(a) => {
            api('/eleve/profil', { method: 'POST', body: { avatar: a } }).then(() => setMe((m) => ({ ...m, avatar: a })));
          }}
          onGo={(t) => setTab(t)}
          logout={logout}
          onSetTheme={setTheme}
          onPersoChange={() => {
            try {
              setHobbies(JSON.parse(localStorage.getItem('kd_hobbies') || '[]'));
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      {tab === 'ia' && filiere !== 'L2' && <Assistant />}
      {tab === 'parcours' && filiere === 'AR' && <ParcoursArabe meId={me.eleve_id} />}
      {tab === 'culture' && filiere !== 'AR' && <Culture meId={me.id} />}
      {tab === 'annales' && <Annales focus={annalesFocus} onFocusLu={() => setAnnalesFocus(null)} />}
      {tab === 'examens' && <Examens />}
      {tab === 'quiz' && <Quiz />}
      {tab === 'flash' && <Flashcards meId={me.eleve_id} />}
      {tab === 'orientation' && <Metiers />}
      {tab === 'agenda' && <Agenda />}
      {tab === 'outils' && <Outils />}
      {tab === 'echanges' && <Echanges />}
      {tab === 'chat' && (
        <Chat me={me} codeInvite={chatCode} onCodeTraite={() => setChatCode(null)} onOuvrirContenu={ouvrirContenu} />
      )}

      {tab === 'cours' && (
        <main className="container">
          {filiere === 'AR' && <CoranEspace meId={me.eleve_id} />}
          {filiere === 'AR' && <AudioCoran />}
          {filiere === 'AR' && <QuizAyat />}
          {filiere === 'AR' && <LexiqueArabe />}
        <div className="search3">
          <Icon name="search" size={16} />
          <input placeholder="Rechercher un cours…" value={qCours} onChange={(e) => setQCours(e.target.value)} />
        </div>
          <div className="pills">
            <button className={matiere === 'all' ? 'pill active' : 'pill'} onClick={() => setMatiere('all')}>
              Toutes
            </button>
            {matieres.map((m) => (
              <button
                key={m.id}
                className={matiere === m.id ? 'pill active' : 'pill'}
                style={{ '--mc': m.color }}
                onClick={() => setMatiere(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="empty">Aucun cours dans cette matière pour l'instant.</div>
          ) : (
            <div className="grid-cards" key={`${matiere}-${qCours}`}>
              {visible.map((c, i) => (
                <CoursCard
                  key={c.id}
                  c={c}
                  i={i}
                  vu={!!(prog && prog.cours[c.id])}
                  onOpen={() => {
                    setViewer(c);
                    if (me) setProg(markCours(me.eleve_id, c));
                  }}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {viewer && <Viewer c={viewer} onClose={() => setViewer(null)} />}

      {/* Barre de navigation fixe en bas (application mobile) */}
      <nav className="bnav">
        <button className={tab === 'accueil' ? 'on' : ''} onClick={() => setTab('accueil')}>
          <Icon name="home" size={19} /> Accueil
        </button>
        <button className={tab === 'cours' ? 'on' : ''} onClick={() => setTab('cours')}>
          <Icon name="book" size={19} /> Cours
        </button>
        <button className={tab === 'suivi' ? 'on' : ''} onClick={() => setTab('suivi')}>
          <Icon name="chart" size={19} /> Suivi
        </button>
        <button className={sheet ? 'on' : ''} onClick={() => setSheet(true)}>
          <Icon name="grid" size={19} /> Plus
        </button>
        <button className={tab === 'profil' ? 'on' : ''} onClick={() => setTab('profil')}>
          <Icon name="user" size={19} /> Profil
        </button>
      </nav>

      {notifsOpen && (
        <div className="sheet3" onClick={() => setNotifsOpen(false)}>
          <div className="sheet3-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet3-handle" />
            <h2 className="sheet3-title">Notifications</h2>
            {notifList.length === 0 && <p className="muted">Rien de nouveau pour l'instant.</p>}
            {notifList.map((n, i) => (
              <button
                key={i}
                className="reco3"
                onClick={() => {
                  setNotifsOpen(false);
                  setTab(n.tab);
                }}
              >
                <span className="reco3-ico">
                  <Icon name={ICO_TAB[n.tab] || 'bell'} size={15} />
                </span>
                {n.txt}
              </button>
            ))}
          </div>
        </div>
      )}

      {searchOpen && (
        <GlobalSearch
          cours={cours}
          filiere={filiere}
          onClose={() => setSearchOpen(false)}
          onPick={(t, payload) => {
            setSearchOpen(false);
            if (payload?.matiere) setMatiere(payload.matiere);
            setTab(t);
            if (payload?.cours) {
              setViewer(payload.cours);
              setProg(markCours(me.eleve_id, payload.cours));
            }
          }}
        />
      )}

      {sheet && (
        <div className="sheet3" onClick={() => setSheet(false)}>
          <div className="sheet3-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet3-handle" />
            <div className="sheet3-grid">
              {TUILES.filter(
                (t) =>
                  t.id !== 'cours' &&
                  (!t.arSeul || filiere === 'AR') &&
                  (!t.l2Seul || filiere === 'L2') &&
                  (!t.pasL2 || filiere !== 'L2') &&
                  (!t.pasAR || filiere !== 'AR')
              ).map((t) => (
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
                  {t.id === 'chat' && chatBadge > 0 && <span className="tile-badge">{chatBadge}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {confirmQuit && (
        <Modal title="Quitter SCHOOBY ?" onClose={() => setConfirmQuit(false)}>
          <p>Voulez-vous vraiment vous déconnecter ?</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={logout}>
              Oui, déconnexion
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmQuit(false)}>
              Non, rester
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Écran d'accueil : cartes photo par section.
const TUILES = [
  { id: 'cours', icon: 'book', img: '/metiers/ecole.jpg', titre: 'Cours', sub: 'Vidéos & fiches PDF', cls: 't-indigo' },
  { id: 'annales', icon: 'file', img: '/metiers/lettres.jpg', titre: 'Annales', sub: 'Sujets d’examens', cls: 't-amber' },
  { id: 'examens', icon: 'clock', img: '/metiers/juriste.jpg', titre: 'Examens', sub: 'Examens chronométrés', cls: 't-navy' },
  { id: 'quiz', icon: 'award', img: '/metiers/data.jpg', titre: 'Quiz', sub: 'Teste-toi', cls: 't-rose' },
  { id: 'flash', icon: 'layers', img: '/metiers/lettres.jpg', titre: 'Flashcards', sub: 'Mémo façon Anki', cls: 't-teal' },
  { id: 'agenda', icon: 'calendar', img: '/metiers/campus.jpg', titre: 'Agenda', sub: 'Échéances & planning', cls: 't-sky' },
  { id: 'echanges', icon: 'chat', img: '/metiers/diplomate.jpg', titre: 'Échanges', sub: 'Administration & communauté', cls: 't-green' },
  { id: 'chat', icon: 'users', img: '/metiers/campus.jpg', titre: 'Chat & binômes', sub: 'Discute avec tes amis', cls: 't-violet' },
  { id: 'outils', icon: 'chart', img: '/metiers/finance.jpg', titre: 'Outils', sub: 'Notes, simulateur, planning', cls: 't-violet' },
  { id: 'orientation', icon: 'compass', img: '/metiers/ciel.jpg', titre: 'Orientation', sub: 'Métiers & études', cls: 't-teal' },
  { id: 'ia', icon: 'spark', img: '/metiers/info.jpg', titre: 'Prof IA', sub: 'Pose tes questions', cls: 't-orange', pasL2: true },
  { id: 'parcours', icon: 'book', img: '/metiers/parcours.jpg', titre: 'Parcours arabe', sub: 'Coran, audio & lexique', cls: 't-emerald', arSeul: true },
  { id: 'culture', icon: 'globe', img: '/metiers/culture.jpg', titre: 'Culture', sub: 'Découvertes & mini-jeux', cls: 't-pink', pasAR: true },
];
const ICO_TAB = {
  cours: 'book', annales: 'file', examens: 'clock', quiz: 'target', flash: 'layers', agenda: 'calendar', echanges: 'chat',
  outils: 'chart', orientation: 'compass', ia: 'spark', parcours: 'book', culture: 'glob', suivi: 'chart', accueil: 'home', chat: 'users',
};

const PROG_VIDE = { cours: {}, quiz: [], minutes: 0, jours: {} };
const norm3 = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function Home({ me, filiere, prog, cours, onOpen, onGo }) {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Salam' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const stats = computeStats(prog, cours);
  const conseils = recos(prog, stats, cours, (FILIERES[filiere] || FILIERES.S2).matieres);
  const tiles = TUILES.filter(
    (t) => (!t.arSeul || filiere === 'AR') && (!t.l2Seul || filiere === 'L2') && (!t.pasL2 || filiere !== 'L2')
  );
  return (
    <main className="container home3">
      <header className="hello3">
        <h1>
          {salut}, {me.prenom}
        </h1>
        <p>
          {stats.vues > 0
            ? `Déjà ${stats.vues} cours ouverts et ${stats.nq} quiz — continue sur ta lancée.`
            : 'Prêt·e pour ta session de travail du jour ?'}
        </p>
      </header>

      {stats.last && (
        <button className="resume3" onClick={() => onGo('cours')}>
          <span className="resume3-ico">
            <Icon name="play" size={18} />
          </span>
          <span className="resume3-txt">
            <small>Reprendre où tu t'étais arrêté·e</small>
            <strong>{stats.last.titre}</strong>
          </span>
          <span className="bgo">→</span>
        </button>
      )}

      {stats.vues === 0 && stats.nq === 0 ? (
        <section className="card welcome3">
          <div className="welcome3-illu">
            <Illu name="cours" />
          </div>
          <div className="welcome3-txt">
            <strong>Bienvenue ! Ta progression s'affichera ici.</strong>
            <p className="muted small">Commence par une étape, ta barre de progrès démarre aujourd'hui :</p>
            <div className="bar3">
              <div style={{ width: '4%' }} />
            </div>
            <div className="welcome3-btns">
              <button className="btn btn-primary" onClick={() => onGo('cours')}>
                Ouvrir mon premier cours
              </button>
              <button className="btn btn-outline" onClick={() => onGo('quiz')}>
                Tester un quiz
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="chips3">
          <span className="chip-bac">
            <Icon name="cap" size={13} /> Bac 2027 : J-{Math.max(0, Math.ceil((new Date('2027-06-15') - Date.now()) / 86400000))}
          </span>
          <span className="pchip">
            <small>
              <Icon name="book" size={12} /> {stats.vues}/{stats.total} cours
            </small>
            <span className="pbar">
              <i style={{ width: `${Math.round((stats.vues / Math.max(1, stats.total)) * 100)}%` }} />
            </span>
          </span>
          <span className="pchip">
            <small>
              <Icon name="target" size={12} /> {stats.pctMoy} % en quiz
            </small>
            <span className="pbar">
              <i style={{ width: `${stats.pctMoy}%` }} />
            </span>
          </span>
          <span className="pchip">
            <small>
              <Icon name="clock" size={12} /> {fmtMin(prog.minutes)} / 1 h
            </small>
            <span className="pbar">
              <i style={{ width: `${Math.min(100, Math.round((prog.minutes / 60) * 100))}%` }} />
            </span>
          </span>
        </div>
      )}

      <StreakBanner prog={prog} onGo={onGo} />
      <div className="bac-ligue-row">
        <ContratBac me={me} />
        <LigueCard meId={me.id} />
      </div>

      {conseils.length > 0 && (
        <div className="recos3">
          <div className="recos3-title">Recommandé pour toi aujourd'hui</div>
          {conseils.map((r, i) => (
            <button key={i} className="reco3" onClick={() => onGo(r.tab, r.matiere)}>
              <span className="reco3-ico">
                <Icon name={ICO_TAB[r.tab] || 'star'} size={15} />
              </span>
              {r.txt}
            </button>
          ))}
        </div>
      )}

      <Decouverte meId={me.id} />

      <h2 className="home3-title">Tous tes espaces</h2>
      <div className="bento">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            className={t.id === 'cours' ? 'ptile feat' : 'ptile'}
            style={{ '--i': i }}
            onClick={() => onOpen(t.id)}
          >
            <span className="ptile-illu">
              <Illu name={t.id} />
            </span>
            <span className="ptile-txt2">
              <strong>{t.titre}</strong>
              <small>{t.sub}</small>
            </span>
            {t.id === 'cours' && <span className="bgo">→</span>}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ------------------- Streak, rappels, contrat Bac, ligue ------------------- */
const semKey = (d = new Date()) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
};
const BAC_DATE = new Date('2027-06-15');

function StreakBanner({ prog, onGo }) {
  const [perm, setPerm] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const auj = new Date().toISOString().slice(0, 10);
  const actif = (prog.jours[auj] || 0) > 0;
  const st = streak(prog);
  return (
    <>
      {perm === 'default' && (
        <button
          className="streak-banneau optin"
          onClick={() =>
            Notification.requestPermission().then((p) => setPerm(p))
          }
        >
          <Icon name="bell" size={16} />
          <span>Active les rappels : « flamme en danger », « ton binôme t'attend »…</span>
          <strong>Activer</strong>
        </button>
      )}
      {st > 0 && !actif && (
        <button className="streak-banneau danger" onClick={() => onGo('quiz')}>
          <span className="streak-flamme">
            <Icon name="flame" size={18} />
          </span>
          <span>
            Ta série de <strong>{st} jour(s)</strong> est en danger — 5 min de quiz pour la sauver.
          </span>
          <strong className="streak-cta">Sauver</strong>
        </button>
      )}
      {actif && (
        <div className="streak-banneau ok">
          <span className="streak-flamme">
            <Icon name="flame" size={18} />
          </span>
          <span>
            Série entretenue aujourd'hui : <strong>{st} jour(s)</strong> d'affilée. Continue demain !
          </span>
        </div>
      )}
    </>
  );
}

function ContratBac({ me }) {
  const [contrat, setContrat] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`kd_contrat_${me.eleve_id}`) || 'null');
    } catch {
      return null;
    }
  });
  const [modal, setModal] = useState(false);
  const [check, setCheck] = useState(false);
  const [form, setForm] = useState({ objectif: 'Bien', heures: 5, nom: '' });
  const jours = Math.max(0, Math.ceil((BAC_DATE - Date.now()) / 86400000));
  const sem = semKey();
  const aCheck = contrat && contrat.checks?.[sem] === undefined;

  function signer(e) {
    e.preventDefault();
    const c = { objectif: form.objectif, heures: Number(form.heures), nom: form.nom || `${me.prenom} ${me.nom}`, checks: {}, depuis: sem };
    localStorage.setItem(`kd_contrat_${me.eleve_id}`, JSON.stringify(c));
    setContrat(c);
    setModal(false);
  }
  function checkIn(ok) {
    const c = { ...contrat, checks: { ...contrat.checks, [sem]: ok } };
    localStorage.setItem(`kd_contrat_${me.eleve_id}`, JSON.stringify(c));
    setContrat(c);
    setCheck(false);
  }
  const tenues = contrat ? Object.values(contrat.checks || {}).filter(Boolean).length : 0;

  const C = 2 * Math.PI * 30;
  return (
    <section className="card bac-card">
      <div className="bac-ring" style={{ '--p': Math.min(1, jours / 300) }}>
        <svg viewBox="0 0 72 72">
          <defs>
            <linearGradient id="bacg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="36" cy="36" r="30" className="bac-ring-fond" />
          <circle cx="36" cy="36" r="30" className="bac-ring-trait" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, jours / 300))} />
        </svg>
        <div className="bac-ring-txt">
          <strong>J-{jours}</strong>
          <small>Bac 2027</small>
        </div>
      </div>
      {!contrat ? (
        <div className="bac-txt">
          <strong>Signe ton contrat d'objectif</strong>
          <p className="muted small">Objectif de mention + heures par semaine : l'app te le rappelle chaque semaine.</p>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Icon name="edit" size={14} /> Signer mon contrat
          </button>
        </div>
      ) : (
        <div className="bac-txt">
          <strong>
            Objectif : {contrat.objectif} · {contrat.heures} h/sem.
          </strong>
          <p className="muted small">
            Signé par {contrat.nom} · {tenues} semaine(s) tenue(s).
          </p>
          {aCheck && (
            <button className="btn btn-outline" onClick={() => setCheck(true)}>
              <Icon name="check" size={14} /> Check-in de la semaine
            </button>
          )}
        </div>
      )}

      {modal && (
        <Modal title="Mon contrat d'objectif Bac" onClose={() => setModal(false)}>
          <form onSubmit={signer}>
            <label className="label">Mon objectif</label>
            <select className="input" value={form.objectif} onChange={(e) => setForm({ ...form, objectif: e.target.value })}>
              <option>Admis·e</option>
              <option>Assez Bien</option>
              <option>Bien</option>
              <option>Très Bien</option>
            </select>
            <label className="label">Heures de travail par semaine</label>
            <select className="input" value={form.heures} onChange={(e) => setForm({ ...form, heures: e.target.value })}>
              <option value="3">3 h</option>
              <option value="5">5 h</option>
              <option value="7">7 h</option>
              <option value="10">10 h et +</option>
            </select>
            <label className="label">Signature (ton nom)</label>
            <input className="input" value={form.nom} placeholder={`${me.prenom} ${me.nom}`} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <button className="btn btn-primary" style={{ marginTop: 12 }} type="submit">
              Je m'engage
            </button>
          </form>
        </Modal>
      )}
      {check && (
        <Modal title="Check-in hebdomadaire" onClose={() => setCheck(false)}>
          <p>
            Cette semaine, as-tu tenu ton engagement (~{contrat.heures} h) ?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => checkIn(true)}>
              Oui, contrat tenu
            </button>
            <button className="btn btn-ghost" onClick={() => checkIn(false)}>
              Pas tout à fait
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Si non : pas grave — les recommandations « rattrapage » ci-dessous s'adaptent automatiquement.
          </p>
        </Modal>
      )}
    </section>
  );
}

function LigueCard({ meId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const charger = () => api('/eleve/ligue').then(setData).catch(() => {});
    charger();
    const t = setInterval(charger, 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="card ligue-card">
      <strong className="ligue-titre">
        <Icon name="trophy" size={15} /> Ligue de la semaine
      </strong>
      {!data && <p className="muted small">Chargement…</p>}
      {data && data.top.length === 0 && <p className="muted small">Sois la première personne à marquer des points cette semaine !</p>}
      {data &&
        data.top.map((r, i) => (
          <div className={`ligue-row${r.moi ? ' moi' : ''}`} key={r.id}>
            <span className={`rang${i < 3 ? ` medal-${i + 1}` : ''}`}>{i + 1}</span>
            <span className="ligue-nom">
              {r.prenom} {r.nom?.[0]}.
            </span>
            <span className="ligue-flamme">
              <Icon name="flame" size={12} /> {r.streak_j}
            </span>
            <span className="ligue-xp">{r.xp} XP</span>
          </div>
        ))}
      {data && <p className="muted small ligue-moi">Ta place actuelle : {data.rang} · {data.xp} XP</p>}
    </section>
  );
}

/* Recherche globale : cours, matières, annales, orientation, agenda. */
function GlobalSearch({ cours, filiere, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([
      api('/eleve/annales').catch(() => []),
      api('/eleve/metiers').catch(() => []),
      api('/eleve/echeances').catch(() => []),
    ]).then(([a, m, e]) => setData({ a, m, e }));
  }, []);
  const nq = norm3(q);
  const matieres = (FILIERES[filiere] || FILIERES.S2).matieres;
  const rCours = nq ? cours.filter((c) => norm3(`${c.titre} ${c.description}`).includes(nq)).slice(0, 4) : [];
  const rMat = nq ? matieres.filter((m) => norm3(m.label).includes(nq)).slice(0, 3) : [];
  const rAnn = nq && data ? data.a.filter((a) => norm3(`${a.titre} ${a.annee}`).includes(nq)).slice(0, 3) : [];
  const rMet = nq && data ? data.m.filter((m) => norm3(`${m.titre} ${m.domaine}`).includes(nq)).slice(0, 3) : [];
  const rAge = nq && data ? data.e.filter((e) => norm3(`${e.titre} ${e.description || ''}`).includes(nq)).slice(0, 3) : [];
  const vide = nq && !rCours.length && !rMat.length && !rAnn.length && !rMet.length && !rAge.length;
  return (
    <div className="gs3" onClick={onClose}>
      <div className="gs3-card" onClick={(e) => e.stopPropagation()}>
        <div className="search3">
          <Icon name="search" size={16} />
          <input autoFocus placeholder="Rechercher partout : cours, annales, métiers…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {!nq && <p className="muted small">Tape au moins deux lettres pour chercher dans toute la plateforme.</p>}
        {vide && <p className="muted small">Aucun résultat pour « {q} ».</p>}
        {rMat.length > 0 && (
          <div className="gs3-sec">
            <strong>Matières</strong>
            {rMat.map((m) => (
              <button key={m.id} className="reco3" onClick={() => onPick('cours', { matiere: m.id })}>
                <span className="reco3-ico"><Icon name="grid" size={15} /></span> {m.label}
              </button>
            ))}
          </div>
        )}
        {rCours.length > 0 && (
          <div className="gs3-sec">
            <strong>Cours</strong>
            {rCours.map((c) => (
              <button key={c.id} className="reco3" onClick={() => onPick('cours', { cours: c })}>
                <span className="reco3-ico"><Icon name="book" size={15} /></span> {c.titre}
              </button>
            ))}
          </div>
        )}
        {rAnn.length > 0 && (
          <div className="gs3-sec">
            <strong>Annales</strong>
            {rAnn.map((a) => (
              <button key={a.id} className="reco3" onClick={() => onPick('annales')}>
                <span className="reco3-ico"><Icon name="file" size={15} /></span> {a.annee} — {a.titre}
              </button>
            ))}
          </div>
        )}
        {rMet.length > 0 && (
          <div className="gs3-sec">
            <strong>Orientation</strong>
            {rMet.map((m) => (
              <button key={m.id} className="reco3" onClick={() => onPick('orientation')}>
                <span className="reco3-ico"><Icon name="compass" size={15} /></span> {m.titre} · {m.domaine}
              </button>
            ))}
          </div>
        )}
        {rAge.length > 0 && (
          <div className="gs3-sec">
            <strong>Agenda</strong>
            {rAge.map((e) => (
              <button key={e.id} className="reco3" onClick={() => onPick('agenda')}>
                <span className="reco3-ico"><Icon name="calendar" size={15} /></span> {e.titre}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilModal({ me, onClose, onAvatar }) {
  const [busy, setBusy] = useState(false);
  async function choisir(a) {
    setBusy(true);
    try {
      await api('/eleve/profil', { method: 'POST', body: { avatar: a } });
      onAvatar(a);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Mon profil" onClose={onClose}>
      <div className="profil-head">
        <div className="profil-avatar">{me.avatar || '🧑🏾‍🎓'}</div>
        <div>
          <strong>
            {me.prenom} {me.nom}
          </strong>
          <div className="muted small">
            {me.classe} · Filière {me.filiere}
          </div>
          <div className="muted small mono">{me.eleve_id}</div>
        </div>
      </div>
      <label className="label">Choisis ton avatar style animé</label>
      <div className="avatar-grid">
        {Array.from({ length: 8 }, (_, i) => `an:${i}`).map((a) => (
          <button key={a} className={me.avatar === a ? 'avatar-pick actif' : 'avatar-pick'} disabled={busy} onClick={() => choisir(a)}>
            <span className={`anime-av i${a.slice(3)}`} />
          </button>
        ))}
      </div>
      <p className="hint">Ton avatar s'affiche en haut de ton espace, sur tous tes appareils.</p>
    </Modal>
  );
}

function CoursCard({ c, onOpen, vu, i }) {
  const m = MATIERE_BY_ID[c.matiere] || { label: c.matiere, color: '#64748b' };
  return (
    <article className="card cours-card anim" style={{ '--mc': m.color, '--i': Math.min(i, 11) }}>
      <div className="cours-top">
        <span className="badge-pastel" style={{ background: `${m.color}1a`, color: m.color }}>
          {m.label}
        </span>
        <div className="cours-icons">
          {vu && <span className="vu3">✔ vu</span>}
          {c.youtube_id && <Icon name="video" size={16} />}
          {c.has_pdf && <Icon name="file" size={16} />}
        </div>
      </div>
      <h3>{c.titre}</h3>
      {(c.duree_min || c.difficulte) && (
        <div className="cours-meta">
          {c.duree_min && (
            <span>
              <Icon name="clock" size={12} /> ~{c.duree_min} min
            </span>
          )}
          {c.difficulte > 0 && (
            <span className="diff3" title={`Difficulté ${c.difficulte}/3`}>
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= c.difficulte ? 'on' : ''} />
              ))}
            </span>
          )}
        </div>
      )}
      {c.description && <p className="muted clamp2">{c.description}</p>}
      <div className="cours-actions">
        {c.youtube_id && (
          <button className="btn btn-primary" onClick={onOpen}>
            <Icon name="play" size={16} /> Regarder
          </button>
        )}
        {c.has_pdf && (
          <button className={c.youtube_id ? 'btn btn-outline' : 'btn btn-primary'} onClick={onOpen}>
            <Icon name="file" size={16} /> Lire le PDF
          </button>
        )}
      </div>
    </article>
  );
}

function Viewer({ c, onClose }) {
  const pdfUrl = c.has_pdf ? `/api/eleve/cours/${c.id}/pdf?token=${encodeURIComponent(getToken())}` : null;
  const [showPdf, setShowPdf] = useState(!!pdfUrl && !c.youtube_id);
  const pdfRef = useRef(null);

  function pleinEcranPdf() {
    const el = pdfRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <Modal title={c.titre} onClose={onClose} wide>
      {c.youtube_id && !showPdf && <VideoPlayer id={c.youtube_id} titre={c.titre} />}
      {pdfUrl && showPdf && (
        <div ref={pdfRef} className="pdf-full-wrap">
          <PdfViewer url={pdfUrl} />
          <button className="vp-full pdf-full-btn" onClick={pleinEcranPdf} title="Plein écran">
            ⛶
          </button>
        </div>
      )}
      {c.acquis && (
        <div className="acquis3">
          <strong>Ce que tu vas apprendre</strong>
          <ul>
            {c.acquis
              .split(';')
              .map((a) => a.trim())
              .filter(Boolean)
              .map((a, i) => (
                <li key={i}>{a}</li>
              ))}
          </ul>
        </div>
      )}
      <div className="viewer-foot">
        {c.youtube_id && pdfUrl && (
          <button className="btn btn-outline" onClick={() => setShowPdf((s) => !s)}>
            <Icon name={showPdf ? 'play' : 'file'} size={16} />
            {showPdf ? 'Voir la vidéo' : 'Lire le PDF'}
          </button>
        )}
        {pdfUrl && (
          <TelechargerHL
            id={`cours-${c.id}`}
            titre={c.titre}
            sous={`${MATIERE_BY_ID[c.matiere]?.label || 'Cours'} · PDF`}
            url={pdfUrl}
          />
        )}
      </div>
    </Modal>
  );
}

// Espace Coran : verset du jour + suivi de mémorisation des sourates.
const VERSETS = [
  { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', fr: 'À côté de la difficulté, il y a certes une facilité.', ref: 'Ash-Sharh · 6' },
  { ar: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', fr: 'Allah est avec ceux qui patientent.', ref: 'Al-Baqara · 153' },
  { ar: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', fr: '« Mon Seigneur, accrois mes connaissances ! »', ref: 'Tâ-Hâ · 114' },
  { ar: 'لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', fr: 'Ne désespérez pas de la miséricorde d’Allah.', ref: 'Az-Zumar · 53' },
  { ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ', fr: 'Souvenez-vous de Moi, Je me souviendrai de vous.', ref: 'Al-Baqara · 152' },
  { ar: 'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ', fr: 'Ce Coran guide vers ce qui est le plus juste.', ref: 'Al-Isrâ · 9' },
];
const SOURATES_MEM = [
  ['Al-Fâtiha', 7], ['Az-Zalzala', 8], ['Al-ʿÂdiyât', 11], ['Al-Qâriʿa', 11], ['At-Takâthur', 8],
  ['Al-ʿAsr', 3], ['Al-Humaza', 9], ['Al-Fîl', 5], ['Quraysh', 4], ['Al-Mâʿûn', 7],
  ['Al-Kawthar', 3], ['Al-Kâfirûn', 6], ['An-Nasr', 3], ['Al-Masad', 5], ['Al-Ikhlâs', 4],
  ['Al-Falaq', 5], ['An-Nâs', 6],
];
function CoranEspace({ meId }) {
  const jour = Math.floor(Date.now() / 86400000) % VERSETS.length;
  const v = VERSETS[jour];
  const key = `s2r_mem_${meId}`;
  const [mem, setMem] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  });
  function cycle(nom) {
    setMem((m) => {
      const next = { ...m, [nom]: m[nom] === 'encours' ? 'acquis' : m[nom] === 'acquis' ? '' : 'encours' };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }
  const acquis = SOURATES_MEM.filter(([n]) => mem[n] === 'acquis').length;
  const pct = Math.round((acquis / SOURATES_MEM.length) * 100);
  return (
    <>
      <section className="verse-card">
        <div className="verse-ar">{v.ar}</div>
        <div className="verse-fr">« {v.fr} »</div>
        <div className="verse-ref">Verset du jour — {v.ref}</div>
      </section>
      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Ma mémorisation des sourates</h2>
        <p className="muted small">Touche une sourate pour la passer « en cours » puis « acquise ». Ton progrès est gardé sur cet appareil.</p>
        <div className="mem-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>
          {acquis}/{SOURATES_MEM.length} sourates acquises ({pct} %)
        </div>
        <div className="mem-grid">
          {SOURATES_MEM.map(([nom, ayats]) => (
            <button key={nom} className={mem[nom] === 'acquis' ? 'mem-item acquis' : mem[nom] === 'encours' ? 'mem-item encours' : 'mem-item'} onClick={() => cycle(nom)}>
              <strong>{nom}</strong>
              <span className="muted small">{ayats} versets</span>
              <span className="mem-status">{mem[nom] === 'acquis' ? '✔ acquise' : mem[nom] === 'encours' ? '⏳ en cours' : 'à apprendre'}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

// Bonus filière arabe : lexique interactif arabe-français.
function LexiqueArabe() {
  const [mots, setMots] = useState(null);
  const [cat, setCat] = useState('all');
  useEffect(() => {
    api('/eleve/lexique').then(setMots).catch(() => setMots([]));
  }, []);
  if (!mots || mots.length === 0) return null;
  const cats = [...new Set(mots.map((m) => m.categorie))];
  const visible = cat === 'all' ? mots : mots.filter((m) => m.categorie === cat);
  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <h2>Lexique arabe – français</h2>
      <div className="pills">
        <button className={cat === 'all' ? 'pill active' : 'pill'} onClick={() => setCat('all')}>
          Tout
        </button>
        {cats.map((c) => (
          <button key={c} className={cat === c ? 'pill active' : 'pill'} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="lexique-grid">
        {visible.map((m) => (
          <div className="lex-card" key={m.id}>
            <div className="lex-ar">{m.mot_ar}</div>
            <div className="lex-fr">{m.mot_fr}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionLost({ reason }) {
  const messages = {
    session_remplacee: [
      'Session unique : ton ID vient d’être utilisé sur un autre appareil.',
      'Par sécurité, la session de cet appareil a été fermée. Si ce n’était pas toi, préviens immédiatement l’administration.',
    ],
    revoque: [
      'Ton accès a été suspendu par l’administration.',
      'Contacte ton administrateur pour réactiver ton ID.',
    ],
    session_perdue: [
      'Ta session a expiré ou a été fermée.',
      'Reconnecte-toi avec ton ID pour continuer.',
    ],
  };
  const [title, sub] = messages[reason] || messages.session_perdue;
  return (
    <div className="lost">
      <div className="lost-card">
        <div className="lost-icon">
          <Icon name="shield" size={34} />
        </div>
        <h2>{title}</h2>
        <p className="muted">{sub}</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            clearToken();
            window.location.hash = '#/';
          }}
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
