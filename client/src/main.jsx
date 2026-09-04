import React from 'react';

/* Filet de sécurité : si une erreur bloque l'app (ex. très vieux iPhone),
   un message clair s'affiche au lieu d'une page blanche. */
window.addEventListener('error', (e) => {
  const r = document.getElementById('root');
  if (r && !r.hasChildNodes()) {
    r.innerHTML =
      '<div style="font-family:sans-serif;padding:30px;color:#e2e8f0;background:#0f172a;min-height:100vh">' +
      '<h2>⚠️ SCHOOBY n\u2019a pas pu démarrer sur cet appareil.</h2>' +
      '<p>Essaie de mettre à jour iOS (Réglages → Général → Mise à jour logicielle), ou ouvre le site dans Chrome/Firefox.</p>' +
      '<p style="opacity:.6;font-size:13px">' + (e.message || '') + '</p>' +
      '<button onclick="location.reload()" style="padding:10px 18px;border-radius:10px;border:0;background:#6366f1;color:#fff">Réessayer</button>' +
      '</div>';
  }
});
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA : enregistre le service worker (rend l'application utilisable hors ligne).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
