const TOKEN_KEY = 's2r_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, form = false } = {}) {
  const headers = {};
  const token = getToken();
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
  if (!res.ok) throw new ApiError(res.status, data?.code, data?.error || 'Erreur serveur');
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
export const MATIERES_AR = [
  { id: 'lecture', label: 'Lecture & makharij', color: '#0d9488' },
  { id: 'sourates', label: 'Sourates & mémorisation', color: '#059669' },
  { id: 'tajwid', label: 'Tajwid', color: '#d97706' },
  { id: 'tafsir', label: 'Sens & tafsîr', color: '#7c3aed' },
];
export const FILIERES = {
  S2: { label: 'S2 · Sciences', matieres: MATIERES_S2 },
  L2: { label: 'L2 · Lettres', matieres: MATIERES_L2 },
  AR: { label: 'Arabe · Niveaux', matieres: MATIERES_AR },
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
