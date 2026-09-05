const TOKEN_KEY = 's2r_token';
const ADMIN_TOKEN_KEY = 's2r_admin_token';

/* Jetons en sessionStorage : chaque onglet garde SA session. On peut donc
   tester avec deux élèves (ou un élève + un admin) dans deux onglets du même
   navigateur sans se déconnecter mutuellement. */
/* Accès stockage blindé : sur iPhone avec protections de confidentialité
   renforcées (ou navigation privée stricte), sessionStorage/localStorage
   peuvent être bloqués → on bascule sur un repli en mémoire au lieu de
   faire planter toute l'application. */
const memStore = {};
function sGet(k) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return k in memStore ? memStore[k] : null;
  }
}
function sSet(k, v) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    memStore[k] = v;
  }
}
function sDel(k) {
  try {
    sessionStorage.removeItem(k);
  } catch {
    delete memStore[k];
  }
}
export const getToken = () => sGet(TOKEN_KEY);
export const setToken = (t) => sSet(TOKEN_KEY, t);
export const clearToken = () => sDel(TOKEN_KEY);
export const getAdminToken = () => sGet(ADMIN_TOKEN_KEY);
export const setAdminToken = (t) => sSet(ADMIN_TOKEN_KEY, t);
export const clearAdminToken = () => sDel(ADMIN_TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, form = false } = {}) {
  const headers = {};
  const token = path.startsWith('/admin') ? getAdminToken() : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = body; // FormData : pas de Content-Type manuel
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    // Session admin expirée (ex. après un redéploiement) : on renvoie
    // proprement vers l'écran de connexion au lieu d'afficher des erreurs.
    if (res.status === 401 && path.startsWith('/admin/') && !path.startsWith('/admin/login')) {
      clearAdminToken();
      if (!window.location.hash.startsWith('#/admin')) window.location.hash = '#/admin';
      else window.location.reload();
    }
    throw new ApiError(res.status, data?.code, data?.error || 'Erreur serveur');
  }
  return data;
}

/* ---------- Filières & matières ---------- */
export const MATIERES_S2 = [
  { id: 'maths', label: 'Maths', color: '#4f46e5' },
  { id: 'physique', label: 'Physique', color: '#0ea5e9' },
  { id: 'chimie', label: 'Chimie', color: '#16a34a' },
  { id: 'svt', label: 'SVT', color: '#65a30d' },
  { id: 'anglais', label: 'Anglais', color: '#db2777' },
  { id: 'philosophie', label: 'Philosophie', color: '#7c3aed' },
  { id: 'francais', label: 'Français', color: '#d97706' },
  { id: 'histoire-geographie', label: 'Histoire-Géo', color: '#059669' },
];
export const MATIERES_L2 = [
  { id: 'maths', label: 'Maths', color: '#4f46e5' },
  { id: 'physique-chimie', label: 'Physique-Chimie', color: '#0891b2' },
  { id: 'svt', label: 'SVT', color: '#65a30d' },
  { id: 'anglais', label: 'Anglais', color: '#db2777' },
  { id: 'philosophie', label: 'Philosophie', color: '#7c3aed' },
  { id: 'francais', label: 'Français', color: '#d97706' },
  { id: 'histoire-geographie', label: 'Histoire-Géo', color: '#059669' },
  { id: 'economie', label: 'Économie', color: '#0d9488' },
  { id: 'espagnol', label: 'Espagnol', color: '#ea580c' },
];

export const FILIERES = {
  S2: { label: 'S2 · Sciences', matieres: MATIERES_S2 },
  L2: { label: 'L2 · Lettres', matieres: MATIERES_L2 },
};
export const MATIERES = [
  ...MATIERES_S2,
  ...MATIERES_L2.filter((m) => !MATIERES_S2.some((s) => s.id === m.id)),
];
export const MATIERE_BY_ID = Object.fromEntries(MATIERES.map((m) => [m.id, m]));
export const CLASSES = {
  S2: ['Seconde S2', 'Première S2', 'Terminale S2'],
  L2: ['Seconde L2', 'Première L2', 'Terminale L2'],
  AR: ['Niveau 1', 'Niveau 2', 'Niveau 3'],
};
