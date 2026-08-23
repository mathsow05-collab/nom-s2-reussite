import { useEffect, useState } from 'react';
import { useInstall } from '../offline.jsx';
import Icon from '../Icon.jsx';

const LS_DISMISS = 'kd_install_dismiss';
const estInstalle = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function InstallApp({ auto = false }) {
  const install = useInstall();
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!auto || estInstalle()) return undefined;
    let dis = null;
    try {
      dis = localStorage.getItem(LS_DISMISS);
    } catch {
      /* ignore */
    }
    if (dis && Date.now() - Number(dis) < 3 * 86400000) return undefined;
    const t = setTimeout(() => setOuvert(true), 1200);
    return () => clearTimeout(t);
  }, [auto]);

  function plusTard() {
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
              Comme une vraie application : icône sur l'écran d'accueil, accès rapide, et tes documents hors ligne
              même sans connexion.
            </p>

            {install.peut ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  install.installer();
                  setOuvert(false);
                }}
              >
                ⬇ Installer maintenant
              </button>
            ) : (
              <div className="ia-steps small">
                {ios ? (
                  <>
                    <strong>Sur iPhone / iPad :</strong>
                    <ol>
                      <li>Ouvre le menu Partager (carré avec flèche ↑) dans Safari ;</li>
                      <li>Choisis « Sur l'écran d'accueil » ;</li>
                      <li>Valide — l'icône SCHOOBY apparaît !</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <strong>Sur Android :</strong>
                    <ol>
                      <li>Ouvre le menu ⋮ de ton navigateur ;</li>
                      <li>Choisis « Ajouter à l'écran d'accueil » / « Installer l'application » ;</li>
                      <li>Valide — c'est terminé !</li>
                    </ol>
                  </>
                )}
              </div>
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
