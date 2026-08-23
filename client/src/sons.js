/* Sons d'interface professionnels (fichiers locaux /sons — licence Mixkit libre).
   Chaque action a son vrai son : appui, ouverture, réussite, erreur, victoire, rappel. */
let actif = typeof localStorage !== 'undefined' ? localStorage.getItem('kd_sons') !== '0' : true;

export const sonsActifs = () => actif;
export function setSons(v) {
  actif = !!v;
  try {
    localStorage.setItem('kd_sons', v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function jouer(fichier, vol = 0.5) {
  if (!actif) return;
  try {
    const a = new Audio(`/sons/${fichier}.mp3`);
    a.volume = vol;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

/* tic de sélection net et discret */
export const sonClic = () => jouer('clic', 0.35);

/* carillon doux à l'ouverture d'un espace */
export const sonOuvrir = () => jouer('ouvrir', 0.45);

/* ton « bonne réponse » chaleureux */
export const sonOk = () => jouer('ok', 0.5);

/* ton d'erreur feutré, jamais agressif */
export const sonKo = () => jouer('ko', 0.4);

/* carillon de victoire */
export const sonWin = () => jouer('win', 0.55);

/* rappel / notification positive */
export const sonNotif = () => jouer('notif', 0.5);
