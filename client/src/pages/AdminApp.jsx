import { useEffect, useState } from 'react';
import { api, clearToken } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import Dashboard from '../admin/Dashboard.jsx';
import Eleves from '../admin/Eleves.jsx';
import Cours from '../admin/Cours.jsx';
import MetiersAdmin from '../admin/Metiers.jsx';
import AnnalesAdmin from '../admin/Annales.jsx';
import QuizAdmin from '../admin/Quiz.jsx';
import AgendaAdmin from '../admin/Agenda.jsx';
import QuestionsAdmin from '../admin/Questions.jsx';
import IdeesAdmin from '../admin/Idees.jsx';

const TABS = [
  { id: 'dash', label: 'Tableau de bord', icon: 'grid' },
  { id: 'eleves', label: 'Élèves & accès', icon: 'users' },
  { id: 'cours', label: 'Cours & PDF', icon: 'book' },
  { id: 'annales', label: 'Annales', icon: 'file' },
  { id: 'quiz', label: 'Quiz', icon: 'award' },
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
    api('/admin/me')
      .then((m) => {
        setMe(m);
        setOk(true);
      })
      .catch(() => {
        clearToken();
        window.location.hash = '#/admin';
      });
  }, []);

  function logout() {
    clearToken();
    window.location.hash = '#/admin';
  }

  if (!ok)
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <Icon name="cap" size={22} /> <span>S2 Réussite</span> <span className="badge badge-soft">Admin</span>
        </div>
        <div className="admin-scope-note muted small">
          {me.displayName} {me.filiere !== 'all' && <span className={`filiere-badge fil-${me.filiere}`}>{me.filiere}</span>}
        </div>
        <nav className="admin-nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} /> {t.label}
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
        {tab === 'eleves' && <Eleves adminScope={me.filiere} />}
        {tab === 'cours' && <Cours adminScope={me.filiere} />}
        {tab === 'annales' && <AnnalesAdmin adminScope={me.filiere} />}
        {tab === 'quiz' && <QuizAdmin adminScope={me.filiere} />}
        {tab === 'agenda' && <AgendaAdmin />}
        {tab === 'questions' && <QuestionsAdmin adminScope={me.filiere} />}
        {tab === 'idees' && <IdeesAdmin />}
        {tab === 'metiers' && <MetiersAdmin adminScope={me.filiere} />}
      </div>
    </div>
  );
}
