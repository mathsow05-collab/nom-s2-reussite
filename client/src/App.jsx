import { useEffect, useState } from 'react';
import StudentLogin from './pages/StudentLogin.jsx';
import StudentApp from './pages/StudentApp.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminApp from './pages/AdminApp.jsx';

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.startsWith('#/admin/app')) return <AdminApp />;
  if (route.startsWith('#/admin')) return <AdminLogin />;
  if (route.startsWith('#/app')) return <StudentApp />;
  return <StudentLogin />;
}
