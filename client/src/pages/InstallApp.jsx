import { useEffect, useState } from 'react';
import { useInstall } from '../offline.jsx';
import Icon from '../Icon.jsx';

const LS_DISMISS = 'kd_install_dismiss';
const estInstalle = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function InstallApp({ auto = false }) {
  const install = useInstall();
  const [ouvert, setOuvert] = useState(false);

  /* Invitation automatique : uniquement si l'installation directe est
     possible (prompt natif Android/Chrome/desktop) et pas déjà refusée. */
  useEffect(() => {
    if (!auto || !install.peut || estInstalle()) return;
    let dis = null;
    try {
      dis = localStorage.getItem(LS_DISMISS);
    } catch {
      /* ignore */
    }
    if (dis && Date.now() - Number(dis) < 3 * 86400000) return;
    setOuvert(true);
  }, [auto, install.peut]);

  function plusTard() {
    try {
      localStorage.setItem(LS_DISMISS, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOuvert(false);
  }

  async function installerMaintenant() {
    await install.installer();
    try {
      localStorage.setItem(LS_DISMISS, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOuvert(false);
  }

  const ios = /iPhone|iPad|iPod/.test(window.navigator.userAgent);

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOuvert(true)}>
        📲 Installer l'application
      </button>

      {ouvert && (
        <div className="ia-wrap">
          <div className="ia-card">
            <div className="ia-ico">
              <Icon name="cap" size={30} />
            </div>
            <h2>Installe SCHOOBY sur ton téléphone</h2>
            <p className="muted small">
              Icône sur l'écran d'accueil, accès en un tap, documents hors ligne : comme une vraie application.
            </p>

            {install.peut ? (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={installerMaintenant}>
                ⬇ Installer maintenant
              </button>
            ) : (
              <p className="ia-steps small">
                {ios
                  ? 'Sur iPhone : bouton Partager ↑ puis « Sur l’écran d’accueil ».'
                  : 'Ouvre le menu ⋮ du navigateur puis « Installer l’application ».'}
              </p>
            )}

            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={plusTard}>
              Plus tard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
