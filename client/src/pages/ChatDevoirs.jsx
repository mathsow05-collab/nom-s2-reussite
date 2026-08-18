import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

/* ------------------------- Devoirs communs (binômes) -------------------------
   L'admin propose un devoir QCM. Dans chaque binôme, les deux membres se
   concertent (dans leur chat) : une réponse n'est validée QUE si les deux
   choisissent la même option. Classement des binômes à la clé.                */

function resteTemps(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'Terminé';
  const j = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (j > 0) return `Encore ${j} j ${h} h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `Encore ${h} h ${m} min`;
}

export default function Devoirs({ notifier }) {
  const [liste, setListe] = useState(null);
  const [errListe, setErrListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [classement, setClassement] = useState(null);

  const charger = useCallback(() => {
    setErrListe(null);
    api('/eleve/devoirs')
      .then(setListe)
      .catch((e) => setErrListe(e.message || 'Erreur API'));
  }, []);
  useEffect(() => {
    charger();
    const h = () => charger();
    window.addEventListener('kd-chat', h);
    return () => window.removeEventListener('kd-chat', h);
  }, [charger]);

  return (
    <>
      <section className="card">
        <h2 className="chat-h2">Devoirs communs</h2>
        <p className="muted small">
          Proposés par l'administration : discute avec ton binôme et mettez-vous d'accord — une réponse n'est validée
          que si vous choisissez la même option.
        </p>
        {!liste && !errListe && <Spinner />}
        {errListe && (
          <p className="err-text">
            Impossible de charger : {errListe}
            <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={charger}>
              Réessayer
            </button>
          </p>
        )}
        {liste && liste.length === 0 && <p className="muted">Aucun devoir pour l'instant.</p>}
        {(liste || []).map((d) => (
          <div className="devoir-carte" key={d.id}>
            <div className="chat-row-txt">
              <strong>{d.titre}</strong>
              {d.description && <small className="muted">{d.description}</small>}
              <small className="muted">
                {d.fini ? 'Délai dépassé' : resteTemps(d.deadline) || 'Sans délai'} · {d.validees}/{d.total} réponses
                validées{d.validees > 0 ? ` · score ${d.score}` : ''}
              </small>
            </div>
            {!d.binome ? (
              <span className="chat-etat">Binôme requis</span>
            ) : (
              <div className="chat-dec-actions">
                <button className="btn btn-primary" onClick={() => setOuvert(d.id)}>
                  Ouvrir
                </button>
                <button className="btn btn-outline" onClick={() => setClassement(d.id)}>
                  Classement
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {ouvert != null && <DevoirPanneau id={ouvert} onClose={() => { setOuvert(null); charger(); }} notifier={notifier} />}
      {classement != null && <Classement id={classement} onClose={() => setClassement(null)} />}
    </>
  );
}

/* Panneau du devoir : chaque question montre mon choix, celui de mon binôme,
   et ne se verrouille que si les deux choix sont identiques. */
export function DevoirPanneau({ id, onClose, notifier }) {
  const [data, setData] = useState(null);
  const [envoi, setEnvoi] = useState(null);

  const charger = useCallback(() => api(`/devoir/${id}`).then(setData).catch((e) => notifier(e.message)), [id, notifier]);
  useEffect(() => {
    charger();
    const t = setInterval(charger, 5000);
    const h = () => charger();
    window.addEventListener('kd-chat', h);
    return () => {
      clearInterval(t);
      window.removeEventListener('kd-chat', h);
    };
  }, [charger]);

  async function choisir(q, i) {
    if (q.validee || data?.devoir.fini || envoi != null) return;
    setEnvoi(q.id);
    try {
      const r = await api(`/devoir/${id}/question/${q.id}`, { method: 'POST', body: { choix: i } });
      if (r.validee) notifier(r.bonne ? `Question ${q.num} validée — bonne réponse !` : `Question ${q.num} validée — ce n'était pas la bonne.`);
      charger();
    } catch (err) {
      notifier(err.message);
    }
    setEnvoi(null);
  }

  if (!data)
    return (
      <div className="chat-lightbox">
        <div className="chat-modal">
          <Spinner />
        </div>
      </div>
    );

  const { devoir, partenaire, questions } = data;

  return (
    <div className="chat-lightbox">
      <div className="chat-modal devoir-panneau">
        <div className="duel-jeu-head">
          <strong>{devoir.titre}</strong>
          <button className="convo-retour" onClick={onClose} title="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        {devoir.description && <p className="muted small">{devoir.description}</p>}
        <p className="muted small">
          Avec <strong>{partenaire?.prenom}</strong> · {devoir.fini ? 'délai dépassé' : resteTemps(devoir.deadline) || 'sans délai'} ·
          discutez dans le chat puis choisissez la même réponse.
        </p>

        {questions.map((q) => (
          <div className={`devoir-q${q.validee ? ' validee' : ''}`} key={q.id}>
            <p className="duel-question">
              {q.num}. {q.question}
            </p>
            <div className="quiz-choix">
              {q.choix.map((c, i) => {
                const moi = q.mon_choix === i;
                const lui = q.son_choix === i;
                const bonne = q.bonne != null && q.bonne === i;
                const mauvaise = q.validee && moi && !bonne;
                return (
                  <button
                    key={i}
                    className={[
                      'quiz-choix-btn',
                      moi ? 'choix-on' : '',
                      lui ? 'choix-lui' : '',
                      bonne ? 'choix-bon' : '',
                      mauvaise ? 'choix-mauvais' : '',
                    ].join(' ')}
                    onClick={() => choisir(q, i)}
                    disabled={q.validee || devoir.fini}
                  >
                    <span className="choix-txt">{c}</span>
                    <span className="choix-marques">
                      {moi && <span className="marque moi">Toi</span>}
                      {lui && <span className="marque lui">{partenaire?.prenom}</span>}
                      {bonne && <Icon name="check" size={14} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {q.validee ? (
              <small className={q.bonne === q.mon_choix ? 'ok-text' : 'err-text'}>
                {q.bonne === q.mon_choix ? 'Bonne réponse validée ensemble !' : `Validée ensemble — la bonne réponse était : ${q.choix[q.bonne]}`}
              </small>
            ) : q.mon_choix != null && q.son_choix != null && q.mon_choix !== q.son_choix ? (
              <small className="err-text">Vous n'avez pas choisi la même chose : discutez et mettez-vous d'accord.</small>
            ) : (
              <small className="muted">
                {q.mon_choix == null && q.son_choix == null
                  ? 'Aucun choix pour l’instant.'
                  : q.son_choix != null
                    ? `${partenaire?.prenom} a déjà choisi — à toi !`
                    : 'Ton choix est noté, en attente de celui de ton binôme…'}
              </small>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Classement({ id, onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api(`/devoir/${id}/classement`).then(setRows).catch(() => setRows([]));
  }, [id]);

  return (
    <div className="chat-lightbox" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="duel-jeu-head">
          <strong>Classement des binômes</strong>
          <button className="convo-retour" onClick={onClose} title="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        {!rows && <Spinner />}
        {rows && rows.length === 0 && <p className="muted">Aucun binôme n'a encore validé de réponse.</p>}
        {(rows || []).map((r, i) => (
          <div className={`chat-row${r.mon_binome ? ' rang-moi' : ''}`} key={r.lien_id}>
            <span className="rang">{i === 0 ? '1ᵉʳ' : `${i + 1}ᵉ`}</span>
            <div className="chat-row-txt">
              <strong>
                {r.eleve_a?.prenom} + {r.eleve_b?.prenom}
              </strong>
              <small className="muted">
                {r.validees}/{r.total} validées
              </small>
            </div>
            <span className="rang-score">
              {r.score} pt{r.score > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
