import { useCallback, useEffect, useState } from 'react';
import { api, FILIERES } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

/* ------------------------- Duels de quiz entre binômes -------------------------
   On défie son binôme sur un même jeu de questions ; chacun répond de son côté,
   les scores sont comparés à la fin et le résultat s'affiche dans le chat.      */

const matiereLabel = (id) => {
  for (const f of Object.values(FILIERES)) {
    const m = f.matieres.find((x) => x.id === id);
    if (m) return m.label;
  }
  return 'Toutes matières';
};

export default function Duels({ home, notifier }) {
  const [duels, setDuels] = useState(null);
  const [errDuels, setErrDuels] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [defi, setDefi] = useState(false);

  const charger = useCallback(() => {
    setErrDuels(null);
    api('/eleve/duels')
      .then(setDuels)
      .catch((e) => setErrDuels(e.message || 'Erreur API'));
  }, []);
  useEffect(() => {
    charger();
    const h = () => charger();
    window.addEventListener('kd-chat', h);
    return () => window.removeEventListener('kd-chat', h);
  }, [charger]);

  const aRelever = (duels || []).filter((d) => d.statut === 'en_attente' && !d.je_suis_createur);

  return (
    <>
      <section className="card">
        <div className="duel-top">
          <div>
            <h2 className="chat-h2">Duels de quiz</h2>
            <p className="muted small">Défie ton binôme sur les mêmes questions : le meilleur score gagne.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setDefi(true)} disabled={!home?.amis.length}>
            <Icon name="zap" size={15} /> Défier
          </button>
        </div>
        {!home?.amis.length && <p className="muted small">Ajoute d'abord un ami ou un binôme pour lancer un duel.</p>}
      </section>

      {aRelever.length > 0 && (
        <section className="card">
          <h2 className="chat-h2">Défis à relever</h2>
          {aRelever.map((d) => (
            <div className="chat-row" key={d.id}>
              <span className="duel-ico">
                <Icon name="zap" size={16} />
              </span>
              <div className="chat-row-txt">
                <strong>{d.je_suis_createur ? d.adversaire : d.createur?.prenom} te défie !</strong>
                <small className="muted">
                  {matiereLabel(d.matiere)} · {d.n} questions
                </small>
              </div>
              <button className="btn btn-primary" onClick={() => setOuvert(d.id)}>
                Relever
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h2 className="chat-h2">Mes duels</h2>
        {errDuels && (
          <p className="err-text">
            Impossible de charger : {errDuels}
            <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={charger}>
              Réessayer
            </button>
          </p>
        )}
        {!duels && !errDuels && <Spinner />}
        {duels && duels.length === 0 && <p className="muted">Aucun duel pour l'instant. Lance ton premier défi !</p>}
        {(duels || []).map((d) => (
          <button className="chat-row cliquable" key={d.id} onClick={() => setOuvert(d.id)}>
            <span className={`duel-ico ${d.statut}`}>
              <Icon name={d.statut === 'fini' ? 'trophy' : 'zap'} size={16} />
            </span>
            <div className="chat-row-txt">
              <strong>
                vs {((d.je_suis_createur ? d.adversaire : d.createur) || { prenom: '?' }).prenom} ·{' '}
                {matiereLabel(d.matiere)}
              </strong>
              <small className="muted">
                {d.statut === 'en_attente' && (d.je_suis_createur ? 'En attente de sa réponse…' : 'À accepter')}
                {d.statut === 'en_cours' && 'En cours'}
                {d.statut === 'refuse' && 'Refusé'}
                {d.statut === 'fini' && (d.mon_score != null ? `Score : ${d.mon_score} – ${d.son_score}` : 'Terminé')}
              </small>
            </div>
            {d.statut === 'fini' && d.mon_score != null && (
              <span className={`duel-verdict ${d.mon_score > d.son_score ? 'gagne' : d.mon_score < d.son_score ? 'perdu' : 'egal'}`}>
                {d.mon_score > d.son_score ? 'Gagné' : d.mon_score < d.son_score ? 'Perdu' : 'Égalité'}
              </span>
            )}
          </button>
        ))}
      </section>

      {defi && <DefiForm home={home} onClose={() => setDefi(false)} notifier={notifier} onCree={(id) => { setDefi(false); charger(); setOuvert(id); }} />}
      {ouvert != null && <DuelJeu id={ouvert} onClose={() => { setOuvert(null); charger(); }} notifier={notifier} />}
    </>
  );
}

function DefiForm({ home, onClose, notifier, onCree }) {
  const [vers, setVers] = useState(home.amis[0]?.ami?.id || '');
  const [matiere, setMatiere] = useState('all');
  const [n, setN] = useState(10);
  const [busy, setBusy] = useState(false);
  const matieres = FILIERES[home?.amis?.[0]?.ami?.filiere]?.matieres || [];

  async function lancer() {
    setBusy(true);
    try {
      const r = await api('/duel/defier', { method: 'POST', body: { vers_id: vers, matiere, n } });
      notifier('Défi envoyé !');
      onCree(r.id);
    } catch (err) {
      notifier(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="chat-lightbox" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Défier mon binôme</h3>
        <label className="label">Contre</label>
        <select className="input" value={vers} onChange={(e) => setVers(e.target.value)}>
          {home.amis.map((l) => (
            <option key={l.id} value={l.ami.id}>
              {l.ami.prenom} {l.ami.nom}
            </option>
          ))}
        </select>
        <label className="label">Matière</label>
        <select className="input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
          <option value="all">Toutes matières</option>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="label">Nombre de questions : {n}</label>
        <input type="range" min="5" max="15" value={n} onChange={(e) => setN(Number(e.target.value))} />
        <div className="chat-inv-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={busy || !vers} onClick={lancer}>
            <Icon name="zap" size={15} /> Lancer le duel
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* Écran de jeu d'un duel : questions une par une, comme le quiz. */
export function DuelJeu({ id, onClose, notifier }) {
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(null);
  const [choisi, setChoisi] = useState(null);

  const charger = useCallback(() => api(`/eleve/duel/${id}`).then(setData).catch(() => onClose()), [id, onClose]);
  useEffect(() => {
    charger();
    const t = setInterval(charger, 5000);
    return () => clearInterval(t);
  }, [charger]);

  if (!data)
    return (
      <div className="chat-lightbox">
        <div className="chat-modal">
          <Spinner />
        </div>
      </div>
    );

  const { duel, questions, mes_reponses, opposant } = data;
  const adversaire = duel.je_suis_createur ? duel.adversaire : duel.createur;
  const moiNom = duel.je_suis_createur ? duel.createur : duel.adversaire;
  const sansReponse = questions.findIndex((q) => mes_reponses[q.id] === undefined);

  async function accepter(action) {
    try {
      await api(`/eleve/duel/${id}/${action}`, { method: 'POST' });
      charger();
    } catch (err) {
      notifier(err.message);
    }
  }

  async function repondre(q, i) {
    if (choisi != null) return;
    setChoisi(i);
    try {
      await api(`/eleve/duel/${id}/repondre`, { method: 'POST', body: { question_id: q.id, reponse: i } });
      const reste = questions.filter((qq) => mes_reponses[qq.id] === undefined && qq.id !== q.id);
      setTimeout(() => {
        setChoisi(null);
        charger();
        setIdx(reste.length ? 0 : null);
      }, 350);
    } catch (err) {
      notifier(err.message);
      setChoisi(null);
    }
  }

  const actif = duel.statut === 'en_cours' && sansReponse >= 0;
  const q = actif ? questions[sansReponse] : null;
  const reponduesMoi = questions.filter((qq) => mes_reponses[qq.id] !== undefined).length;

  return (
    <div className="chat-lightbox">
      <div className="chat-modal duel-jeu">
        <div className="duel-jeu-head">
          <strong>
            {moiNom?.prenom} vs {adversaire?.prenom}
          </strong>
          <button className="convo-retour" onClick={onClose} title="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="muted small">
          {matiereLabel(duel.matiere)} · {questions.length} questions · {adversaire?.prenom} a répondu à{' '}
          {opposant.repondues}/{opposant.total}.
        </p>

        {duel.statut === 'en_attente' && (
          <div className="chat-vide">
            <Icon name="zap" size={24} />
            {duel.je_suis_createur ? (
              <p className="muted small">En attente : {adversaire?.prenom} doit accepter le défi.</p>
            ) : (
              <>
                <strong>{moiNom?.prenom} te défie !</strong>
                <div className="chat-inv-actions">
                  <button className="btn btn-primary" onClick={() => accepter('accepter')}>
                    Accepter le duel
                  </button>
                  <button className="btn btn-ghost" onClick={() => accepter('refuser')}>
                    Refuser
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {duel.statut === 'refuse' && (
          <div className="chat-vide">
            <Icon name="x" size={24} />
            <p className="muted small">Le défi a été refusé.</p>
          </div>
        )}

        {duel.statut === 'en_cours' && q && (
          <>
            <div className="bar3">
              <div style={{ width: `${(reponduesMoi / questions.length) * 100}%` }} />
            </div>
            <p className="duel-question">
              Question {reponduesMoi + 1}/{questions.length} — {q.question}
            </p>
            <div className="quiz-choix">
              {q.choix.map((c, i) => (
                <button key={i} className={`quiz-choix-btn${choisi === i ? ' choix-on' : ''}`} onClick={() => repondre(q, i)}>
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {duel.statut === 'en_cours' && sansReponse < 0 && (
          <div className="chat-vide">
            <Icon name="clock" size={24} />
            <strong>
              Tu as répondu à tout ({reponduesMoi}/{questions.length})
            </strong>
            <p className="muted small">
              {adversaire?.prenom} a répondu à {opposant.repondues}/{opposant.total}. Le résultat arrive dès qu'il a
              fini.
            </p>
          </div>
        )}

        {duel.statut === 'fini' && (
          <div className="chat-vide">
            <Icon name="trophy" size={26} />
            <div className="duel-score-final">
              <span>{duel.je_suis_createur ? duel.score_a : duel.score_b}</span>
              <em>–</em>
              <span>{duel.je_suis_createur ? duel.score_b : duel.score_a}</span>
            </div>
            <strong>
              {(duel.je_suis_createur ? duel.score_a : duel.score_b) > (duel.je_suis_createur ? duel.score_b : duel.score_a)
                ? 'Victoire ! 🎉'
                : (duel.je_suis_createur ? duel.score_a : duel.score_b) < (duel.je_suis_createur ? duel.score_b : duel.score_a)
                  ? `${adversaire?.prenom} gagne ce duel.`
                  : 'Égalité parfaite !'}
            </strong>
            <button className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
