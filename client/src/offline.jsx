import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon.jsx';

/* Téléchargements « à la YouTube » : quand un élève appuie sur « Hors ligne »,
   le document est enregistré DANS l'application (IndexedDB du navigateur),
   puis lisible sans connexion depuis la page Profil → Téléchargements.
   Le fichier ne sort jamais vers le téléphone : comme un téléchargement
   YouTube, il reste sur la plateforme. */

const DB = 'kaydiang-hl';
const STORE = 'fichiers';
const EVT = 'kd-hl-change';

let dbPromise = null;
function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbPromise;
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    let out;
    const req = fn(t.objectStore(STORE));
    if (req && 'result' in req) req.onsuccess = () => (out = req.result);
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

export async function listerHL() {
  const list = await withStore('readonly', (s) => s.getAll());
  return (list || []).sort((a, b) => b.date - a.date);
}
export const lireHL = (id) => withStore('readonly', (s) => s.get(id));

export async function supprimerHL(id) {
  await withStore('readwrite', (s) => s.delete(id));
  window.dispatchEvent(new Event(EVT));
}

export async function enregistrerHL({ id, titre, sous, url }) {
  const rep = await fetch(url);
  if (!rep.ok) throw new Error('Téléchargement impossible.');
  const blob = await rep.blob();
  const rec = { id, titre, sous: sous || '', date: Date.now(), taille: blob.size, blob };
  await withStore('readwrite', (s) => s.put(rec));
  window.dispatchEvent(new Event(EVT));
  return rec;
}

export const fmtTaille = (o) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

export function useHorsLigne() {
  const [items, setItems] = useState([]);
  const reload = useCallback(() => {
    if (!('indexedDB' in window)) return;
    listerHL().then(setItems).catch(() => {});
  }, []);
  useEffect(() => {
    reload();
    window.addEventListener(EVT, reload);
    return () => window.removeEventListener(EVT, reload);
  }, [reload]);
  const parId = new Map(items.map((i) => [i.id, i]));
  return { items, parId };
}

/* Bouton « Hors ligne » : enregistre/retire le document de la bibliothèque
   locale. id doit être unique par document (ex. cours-12, annale-5-sujet). */
export function TelechargerHL({ id, titre, sous, url }) {
  const { parId } = useHorsLigne();
  const [etat, setEtat] = useState('idle'); // idle | cours | err
  const deja = parId.has(id);

  async function basculer() {
    if (deja) {
      await supprimerHL(id);
      return;
    }
    setEtat('cours');
    try {
      await enregistrerHL({ id, titre, sous, url });
      setEtat('idle');
    } catch {
      setEtat('err');
      setTimeout(() => setEtat('idle'), 2500);
    }
  }

  return (
    <button
      className={`btn btn-ghost hl-btn${deja ? ' hl-saved' : ''}`}
      onClick={basculer}
      disabled={etat === 'cours'}
      title={deja ? 'Retirer de mes téléchargements' : 'Garder ce document disponible sans connexion'}
    >
      <Icon name={etat === 'cours' ? 'clock' : deja ? 'check' : 'download'} size={16} />
      {etat === 'cours' ? 'Enregistrement…' : deja ? 'Hors ligne ✓' : etat === 'err' ? 'Réessayer' : 'Hors ligne'}
    </button>
  );
}

/* Invite d'installation PWA (Android/Chrome surtout) : le bouton n'apparaît
   que si le navigateur propose l'installation. */
export function useInstall() {
  const [evt, setEvt] = useState(null);
  useEffect(() => {
    const h = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  return {
    peut: !!evt,
    installer: async () => {
      if (!evt) return;
      evt.prompt();
      await evt.userChoice;
      setEvt(null);
    },
  };
}
