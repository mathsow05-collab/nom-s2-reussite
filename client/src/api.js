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

export const MATIERES = [
  { id: 'maths', label: 'Maths', color: '#4f46e5' },
  { id: 'physique-chimie', label: 'Physique-Chimie', color: '#0891b2' },
  { id: 'francais', label: 'Français', color: '#d97706' },
  { id: 'histoire-geographie', label: 'Histoire-Géo', color: '#059669' },
];
export const MATIERE_BY_ID = Object.fromEntries(MATIERES.map((m) => [m.id, m]));
