import { useEffect, useState } from 'react';

/* Suivi local de l'activité de l'élève (par appareil) :
   cours ouverts, quiz passés, minutes d'étude, activité par jour. */

const KEY = (id) => `s2r_prog_${id}`;

function empty() {
  return { cours: {}, quiz: [], minutes: 0, jours: {} };
}

export function getProg(id) {
  try {
    return { ...empty(), ...(JSON.parse(localStorage.getItem(KEY(id)) || 'null') || {}) };
  } catch {
    return empty();
  }
}

function save(id, p) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(p));
  } catch {
    /* stockage plein : ignoré */
  }
}

export function markCours(id, c) {
  const p = getProg(id);
  p.cours[c.id] = { t: Date.now(), titre: c.titre, matiere: c.matiere };
  save(id, p);
  return p;
}

export function addQuiz(id, r) {
  const p = getProg(id);
  p.quiz.push({ ...r, t: Date.now() });
  p.quiz = p.quiz.slice(-60);
  save(id, p);
  return p;
}

export function tickMinutes(id, n = 1) {
  const p = getProg(id);
  p.minutes += n;
  const jour = new Date().toISOString().slice(0, 10);
  p.jours[jour] = (p.jours[jour] || 0) + n;
  // garde seulement 60 jours d'historique
  const cles = Object.keys(p.jours).sort();
  while (cles.length > 60) delete p.jours[cles.shift()];
  save(id, p);
  return p;
}

const SEM = 7 * 86400000;

export function computeStats(prog, coursAll) {
  const vues = Object.keys(prog.cours).length;
  const total = coursAll.length;
  const parMatiere = {};
  for (const c of coursAll) {
    const o = (parMatiere[c.matiere] ||= { vus: 0, total: 0 });
    o.total += 1;
    if (prog.cours[c.id]) o.vus += 1;
  }
  const nq = prog.quiz.length;
  const pctMoy = nq ? Math.round((prog.quiz.reduce((s, q) => s + q.score / q.total, 0) / nq) * 100) : 0;
  const last = Object.values(prog.cours).sort((a, b) => b.t - a.t)[0] || null;
  const now = Date.now();
  const semaine = (t) => now - t < SEM;
  const quizSemaine = prog.quiz.filter((q) => semaine(q.t)).length;
  const coursSemaine = Object.values(prog.cours).filter((c) => semaine(c.t)).length;
  const minutesSemaine = Object.entries(prog.jours)
    .filter(([d]) => now - new Date(d).getTime() < SEM)
    .reduce((s, [, m]) => s + m, 0);
  const joursActifs = Object.keys(prog.jours).filter((d) => now - new Date(d).getTime() < SEM).length;
  return { vues, total, parMatiere, nq, pctMoy, last, quizSemaine, coursSemaine, minutesSemaine, joursActifs };
}

/* Recommandations personnalisées selon la progression réelle. */
export function recos(prog, stats, coursAll, matieres) {
  const out = [];
  const lbl = (id) => (matieres.find((m) => m.id === id) || { label: id }).label;

  const faibles = Object.entries(stats.parMatiere)
    .filter(([, o]) => o.total > 0)
    .sort((a, b) => a[1].vus / a[1].total - b[1].vus / b[1].total);
  const [fId, fO] = faibles[0] || [];
  if (fId && fO.vus < fO.total) {
    out.push({
      emoji: '📚',
      txt: `En ${lbl(fId)}, il te reste ${fO.total - fO.vus} cours à découvrir`,
      tab: 'cours',
      matiere: fId,
    });
  }
  if (stats.nq > 0 && stats.pctMoy < 70) {
    out.push({ emoji: '🎯', txt: `Moyenne quiz ${stats.pctMoy} % : refais un quiz pour la faire monter`, tab: 'quiz' });
  } else if (stats.quizSemaine === 0) {
    out.push({ emoji: '🎯', txt: 'Aucun quiz cette semaine — 10 petites questions ?', tab: 'quiz' });
  }
  if (stats.coursSemaine === 0) {
    out.push({ emoji: '🔥', txt: 'Ouvre ton premier cours de la semaine pour garder le rythme', tab: 'cours' });
  }
  out.push({ emoji: '📝', txt: 'Un sujet d’annale en conditions réelles cette semaine ?', tab: 'annales' });
  return out.slice(0, 3);
}

/* Petit compteur animé (Count Up). */
export function useCountUp(target, dur = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

export function fmtMin(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')}`;
}
