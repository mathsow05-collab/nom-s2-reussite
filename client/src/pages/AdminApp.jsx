import { useEffect, useState } from 'react';
import { api, clearAdminToken } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import Dashboard from '../admin/Dashboard.jsx';
import Eleves from '../admin/Eleves.jsx';
import Cours from '../admin/Cours.jsx';
import MetiersAdmin from '../admin/Metiers.jsx';
import AnnalesAdmin from '../admin/Annales.jsx';
import ExamensAdmin from '../admin/Examens.jsx';
import FlashAdmin from '../admin/Flash.jsx';
import QuizAdmin from '../admin/Quiz.jsx';
import AgendaAdmin from '../admin/Agenda.jsx';
import QuestionsAdmin from '../admin/Questions.jsx';
import IdeesAdmin from '../admin/Idees.jsx';
import CultureAdmin from '../admin/Culture.jsx';
import IaSettings from '../admin/IaSettings.jsx';
import DevoirsBinomes from '../admin/Devoirs.jsx';

const TABS = [
  { id: 'dash', label: 'Tableau de bord', icon: 'grid' },
  { id: 'ia', label: 'Assistant IA', icon: 'chat', directionSeul: true },
  { id: 'eleves', label: 'Élèves & accès', icon: 'users' },
  { id: 'cours', label: 'Cours & PDF', icon: 'book' },
  { id: 'culture', label: 'Culture du monde', icon: 'bulb' },
  { id: 'annales', label: 'Annales', icon: 'file' },
  { id: 'examens', label: 'Examens', icon: 'clock' },
  { id: 'flash', label: 'Flashcards', icon: 'layers' },
  { id: 'quiz', label: 'Quiz', icon: 'award' },
  { id: 'devoirs', label: 'Devoirs binômes', icon: 'users' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'questions', label: 'Questions élèves', icon: 'chat' },
  { id: 'idees', label: 'Boîte à idées', icon: 'bulb' },
  { id: 'metiers', label: 'Catalogue métiers', icon: 'cap' },
];

export default function AdminApp() {
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState('dash');
  const [me, setMe] = useState(null);

  useEffect(() => {
    let alive = true;
    // Le serveur gratuit peut être long à démarrer : on réessaie au lieu de déconnecter.
    (async () => {
      for (let essai = 0; essai < 12; essai++) {
        try {
          const m = await api('/admin/me');
          if (!alive) return;
          setMe(m);
          setOk(true);
          return;
        } catch (e) {
          if (e?.status === 401) {
            if (alive) {
              clearAdminToken();
              window.location.hash = '#/admin';
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function logout() {
    clearAdminToken();
    window.location.hash = '#/admin';
  }

  if (!ok)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  // Périmètres : Arabe = essentiel seulement ; S2 = pas de Culture (contenu L2).
  const visibleTabs = TABS.filter((t) => {
    if (me.filiere === 'AR' && ['annales', 'quiz', 'agenda', 'metiers', 'culture', 'devoirs'].includes(t.id)) return false;
    return true;
  });

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <Icon name="cap" size={22} /> <span>KAY DIANG</span> <span className="badge badge-soft">Admin</span>
        </div>
        <div className="admin-scope-note muted small">
          {me.displayName} {me.filiere !== 'all' && <span className={`filiere-badge fil-${me.filiere}`}>{me.filiere}</span>}
        </div>
        <nav className="admin-nav">
          {visibleTabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} /> {t.id === 'cours' && me.filiere === 'AR' ? 'Cours Coran' : t.label}
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <div className="muted small">
            Connecté : <strong>{me.username}</strong>
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            <Icon name="logout" size={16} /> Déconnexion
          </button>
        </div>
      </aside>
      <div className="admin-main">
        {tab === 'dash' && <Dashboard />}
        {tab === 'ia' && me.filiere === 'all' && <IaSettings />}
        {tab === 'eleves' && <Eleves adminScope={me.filiere} />}
        {tab === 'cours' && <Cours adminScope={me.filiere} />}
        {tab === 'culture' && <CultureAdmin />}
        {tab === 'annales' && <AnnalesAdmin adminScope={me.filiere} />}
        {tab === 'examens' && <ExamensAdmin adminScope={me.filiere} />}
        {tab === 'flash' && <FlashAdmin />}
        {tab === 'quiz' && <QuizAdmin adminScope={me.filiere} />}
        {tab === 'devoirs' && <DevoirsBinomes />}
        {tab === 'agenda' && <AgendaAdmin />}
        {tab === 'questions' && <QuestionsAdmin adminScope={me.filiere} />}
        {tab === 'idees' && <IdeesAdmin />}
        {tab === 'metiers' && <MetiersAdmin adminScope={me.filiere} />}
      </div>
    </div>
  );
}
