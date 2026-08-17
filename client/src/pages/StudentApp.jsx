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
import Profil from './Profil.jsx';
import Examens from './Examens.jsx';
import { computeStats, getProg, markCours, recos, tickMinutes, fmtMin } from '../progress.js';

export const AVATARS = ['🧑‍🎓','👩🏾‍','🦁','🚀','⭐','📚','️','🎯','','🕌','','🎨','🎧','🐱','🦅','🌍'];

const TABS = [
  { id: 'ia', label: 'Prof IA', icon: 'chat' },
  { id: 'parcours', label: 'Parcours', icon: 'map', arSeul: true },
  { id: 'culture', label: 'Culture', icon: 'bulb', l2Seul: true },
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

  const [sheet, setSheet] = useState(false);
  const [prog, setProg] = useState(null);
  const [qCours, setQCours] = useState('');
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);

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
          <Icon name="cap" size={22} /> <span>KAY DIANG</span>
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
            {me.avatar || '🧑🏾‍'}
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
          onAvatar={(a) => {
            api('/eleve/profil', { method: 'POST', body: { avatar: a } }).then(() => setMe((m) => ({ ...m, avatar: a })));
          }}
          onGo={(t) => setTab(t)}
          logout={logout}
        />
      )}

      {tab === 'ia' && filiere !== 'L2' && <Assistant />}
      {tab === 'parcours' && filiere === 'AR' && <ParcoursArabe meId={me.eleve_id} />}
      {tab === 'culture' && filiere === 'L2' && <Culture />}
      {tab === 'annales' && <Annales />}
      {tab === 'examens' && <Examens />}
      {tab === 'quiz' && <Quiz />}
      {tab === 'orientation' && <Metiers />}
      {tab === 'agenda' && <Agenda />}
      {tab === 'outils' && <Outils />}
      {tab === 'echanges' && <Echanges />}

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
                  (!t.pasL2 || filiere !== 'L2')
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
                </button>
              ))}
            </div>
          </div>
        </div>
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
  { id: 'agenda', icon: 'calendar', img: '/metiers/campus.jpg', titre: 'Agenda', sub: 'Échéances & planning', cls: 't-sky' },
  { id: 'echanges', icon: 'chat', img: '/metiers/diplomate.jpg', titre: 'Échanges', sub: 'Administration & communauté', cls: 't-green' },
  { id: 'outils', icon: 'chart', img: '/metiers/finance.jpg', titre: 'Outils', sub: 'Notes, simulateur, planning', cls: 't-violet' },
  { id: 'orientation', icon: 'compass', img: '/metiers/ciel.jpg', titre: 'Orientation', sub: 'Métiers & études', cls: 't-teal' },
  { id: 'ia', icon: 'spark', img: '/metiers/info.jpg', titre: 'Prof IA', sub: 'Pose tes questions', cls: 't-orange', pasL2: true },
  { id: 'parcours', icon: 'book', img: '/metiers/parcours.jpg', titre: 'Parcours arabe', sub: 'Coran, audio & lexique', cls: 't-emerald', arSeul: true },
  { id: 'culture', icon: 'globe', img: '/metiers/culture.jpg', titre: 'Culture', sub: 'Découvertes & mini-jeux', cls: 't-pink', l2Seul: true },
];
const ICO_TAB = {
  cours: 'book', annales: 'file', examens: 'clock', quiz: 'target', agenda: 'calendar', echanges: 'chat',
  outils: 'chart', orientation: 'compass', ia: 'spark', parcours: 'book', culture: 'glob', suivi: 'chart', accueil: 'home',
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

      <div className="chips3">
        <span>
          <Icon name="book" size={13} /> {stats.vues}/{stats.total} cours
        </span>
        <span>
          <Icon name="target" size={13} /> {stats.pctMoy} % en quiz
        </span>
        <span>
          <Icon name="clock" size={13} /> {fmtMin(prog.minutes)}
        </span>
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

      <h2 className="home3-title">Tous tes espaces</h2>
      <div className="bento">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            className={t.id === 'cours' ? 'ptile feat' : 'ptile'}
            style={{ '--i': i }}
            onClick={() => onOpen(t.id)}
          >
            <img src={t.img} alt="" loading="lazy" />
            <span className="ptile-shade" />
            <span className="ptile-ico">
              <Icon name={t.icon} size={15} />
            </span>
            <span className="ptile-txt">
              <strong>{t.titre}</strong>
              <small>{t.sub}</small>
            </span>
          </button>
        ))}
      </div>
    </main>
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
      <label className="label">Choisis ton avatar</label>
      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <button key={a} className={me.avatar === a ? 'avatar-pick actif' : 'avatar-pick'} disabled={busy} onClick={() => choisir(a)}>
            {a}
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
      <div className="viewer-foot">
        {c.youtube_id && pdfUrl && (
          <button className="btn btn-outline" onClick={() => setShowPdf((s) => !s)}>
            <Icon name={showPdf ? 'play' : 'file'} size={16} />
            {showPdf ? 'Voir la vidéo' : 'Lire le PDF'}
          </button>
        )}
        {pdfUrl && (
          <a className="btn btn-ghost" href={pdfUrl} download>
            <Icon name="download" size={16} /> Télécharger
          </a>
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
