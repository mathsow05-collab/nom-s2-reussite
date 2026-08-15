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
  const [tab, setTab] = useState('cours');  const [matiere, setMatiere] = useState('all');
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

  const [profil, setProfil] = useState(false);

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
    document.addEventListener('contextmenu', noCtx);
    document.addEventListener('keydown', noKey);
    return () => {
      document.removeEventListener('contextmenu', noCtx);
      document.removeEventListener('keydown', noKey);
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
  const visible = matiere === 'all' ? cours : cours.filter((c) => c.matiere === matiere);

  const wm = encodeURIComponent(me.eleve_id);

  return (
    <div className="student">
      {/* Filigrane discret anti-fuite : identifie l'élève sur toute capture */}
      <div
        className="watermark"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='180'%3E%3Ctext x='14' y='96' fill='%23000' fill-opacity='0.045' font-size='15' transform='rotate(-18 130 90)'%3E${wm}%3C/text%3E%3C/svg%3E")`,
        }}
      />
      <header className="topbar">
        <div className="topbar-brand">
          <Icon name="cap" size={22} /> <span>S2 Réussite</span>
        </div>
        <div className="topbar-user">
          <button className="avatar-btn" onClick={() => setProfil(true)} title="Mon profil">
            {me.avatar || '🧑🏾‍🎓'}
          </button>
          <div className="topbar-id">
            <strong>
              {me.prenom} {me.nom} <span className={`filiere-badge fil-${filiere}`}>{filiere}</span>
            </strong>
            <small>
              {me.classe} · {me.eleve_id}
            </small>
          </div>
          <button className="btn btn-ghost" onClick={logout} title="Déconnexion">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <nav className="seg">
        {TABS.filter((t) => (!t.arSeul || filiere === 'AR') && (!t.l2Seul || filiere === 'L2')).map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
      </nav>

      {tab === 'ia' && <Assistant />}
      {tab === 'parcours' && filiere === 'AR' && <ParcoursArabe meId={me.eleve_id} />}
      {tab === 'culture' && filiere === 'L2' && <Culture />}
      {tab === 'annales' && <Annales />}
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
            <div className="grid-cards">
              {visible.map((c) => (
                <CoursCard key={c.id} c={c} onOpen={() => setViewer(c)} />
              ))}
            </div>
          )}
        </main>
      )}

      {viewer && <Viewer c={viewer} onClose={() => setViewer(null)} />}
      {profil && (
        <ProfilModal
          me={me}
          onClose={() => setProfil(false)}
          onAvatar={(a) => setMe((m) => ({ ...m, avatar: a }))}
        />
      )}
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

function CoursCard({ c, onOpen }) {
  const m = MATIERE_BY_ID[c.matiere] || { label: c.matiere, color: '#64748b' };
  return (
    <article className="card cours-card" style={{ '--mc': m.color }}>
      <div className="cours-top">
        <span className="badge" style={{ background: m.color }}>
          {m.label}
        </span>
        <div className="cours-icons">
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
        <h2>🕌 Ma mémorisation des sourates</h2>
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
      <h2>📖 Lexique arabe – français</h2>
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
