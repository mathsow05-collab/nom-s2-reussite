import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import AudioBulle from '../components/AudioBulle.jsx';
import { useMicro } from '../useMicro.jsx';

/* ------------------------- Devoirs communs (binômes) -------------------------
   Concertation obligatoire, chrono + bonus vitesse, séries, classement global
   à médailles, explications vocales notées, questions illustrées, revanche. */

const fichierExplique = (id) => `/api/eleve/devoir/fichier/${id}?token=${encodeURIComponent(getToken())}`;
const imageQuestion = (devoirId, qid) => `/api/eleve/devoir/${devoirId}/image/${qid}?token=${encodeURIComponent(getToken())}`;

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

const fmtChrono = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Devoirs({ notifier, meId }) {
  const [liste, setListe] = useState(null);
  const [errListe, setErrListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [classement, setClassement] = useState(null);
  const [global, setGlobal] = useState(false);

  const charger = useCallback(() => {
    setErrListe(null);
    api('/eleve/devoirs')
      .then(setListe)
      .catch((e) => setErrListe(e.message || 'Erreur API'));
  }, []);
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

  async function agir(id, action) {
    try {
      await api(`/eleve/devoir/${id}/${action}`, { method: 'POST' });
      notifier(action === 'accepter' ? 'Devoir accepté : ouvre-le et mettez-vous d’accord !' : 'Devoir refusé.');
      charger();
    } catch (e) {
      notifier(e.message);
    }
  }

  return (
    <>
      <section className="card">
        <div className="duel-top">
          <div>
            <h2 className="chat-h2">Devoirs communs</h2>
            <p className="muted small">
              Proposés par l'administration : discute avec ton binôme et mettez-vous d'accord — une réponse n'est
              validée que si vous choisissez la même option.
            </p>
          </div>
          <button className="btn btn-outline" onClick={() => setGlobal(true)}>
            <Icon name="trophy" size={15} /> Classement
          </button>
        </div>
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
        {(liste || []).map((d) => {
          const attendMoi = d.participation?.statut === 'propose' && d.participation.par !== meId;
          const attenduAutre = d.participation?.statut === 'propose' && d.participation.par === meId;
          const refuse = d.participation?.statut === 'refuse';
          return (
            <div className={`devoir-carte${attendMoi ? ' attend-moi' : ''}`} key={d.id}>
              <div className="chat-row-txt">
                <strong>
                  {d.titre}
                  {d.parfait && (
                    <span className="badge-parfait" title="Devoir parfait : tout juste !">
                      <Icon name="trophy" size={11} /> parfait
                    </span>
                  )}
                </strong>
                {d.description && <small className="muted">{d.description}</small>}
                <small className="muted">
                  {d.serie ? `${d.serie} · ` : ''}
                  {d.duree_min ? `chrono ${d.duree_min} min · ` : ''}
                  {d.fini ? 'délai dépassé' : resteTemps(d.deadline) || 'sans délai'} · {d.validees}/{d.total} validées
                  {d.validees > 0 ? ` · ${d.score} pt${d.score > 1 ? 's' : ''}${d.bonus ? ' +1 bonus' : ''}` : ''}
                </small>
                {attendMoi && <small className="ok-text">Ton binôme veut faire ce devoir avec toi : accepte ou refuse.</small>}
                {attenduAutre && <small className="muted">Proposition envoyée, en attente de ton binôme…</small>}
                {refuse && <small className="err-text">Devoir refusé.</small>}
                {d.participation?.statut === 'accepte' && (
                  <small className="ok-text">Devoir accepté : choisissez les mêmes réponses !</small>
                )}
              </div>
              {!d.binome ? (
                <span className="chat-etat">Binôme requis</span>
              ) : attendMoi ? (
                <div className="chat-dec-actions">
                  <button className="btn btn-primary" onClick={() => agir(d.id, 'accepter')}>
                    <Icon name="check" size={15} /> Accepter
                  </button>
                  <button className="btn btn-ghost" onClick={() => agir(d.id, 'refuser')}>
                    Refuser
                  </button>
                </div>
              ) : (
                <div className="chat-dec-actions">
                  <button className="btn btn-primary" onClick={() => setOuvert(d.id)}>
                    Ouvrir
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {ouvert != null && (
        <DevoirPanneau id={ouvert} onClose={() => { setOuvert(null); charger(); }} notifier={notifier} moiId={meId} />
      )}
      {classement != null && <Classement id={classement} onClose={() => setClassement(null)} />}
      {global && <ClassementGlobal onClose={() => setGlobal(false)} />}
    </>
  );
}

/* Panneau du devoir : concertation, chrono, images, explications, revanche. */
export function DevoirPanneau({ id, onClose, notifier, moiId }) {
  const [data, setData] = useState(null);
  const [envoi, setEnvoi] = useState(null);
  const [errDevoir, setErrDevoir] = useState(null);
  const [reste, setReste] = useState(null);
  const [qExplique, setQExplique] = useState(null); // question en cours d'explication

  const charger = useCallback(() => {
    setErrDevoir(null);
    api(`/eleve/devoir/${id}`)
      .then((d) => {
        setData(d);
        setReste(d.devoir.temps_restant);
      })
      .catch((e) => {
        notifier(e.message);
        setErrDevoir(e.message);
      });
  }, [id, notifier]);
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

  // Compte à rebours local entre deux rafraîchissements.
  useEffect(() => {
    if (reste == null) return undefined;
    const t = setInterval(() => setReste((s) => (s == null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(t);
  }, [reste == null]);

  const micro = useMicro(notifier, (blob, ext) => {
    if (qExplique == null) return;
    const fd = new FormData();
    fd.append('fichier', new File([blob], `explication-${Date.now()}.${ext}`, { type: blob.type }));
    api(`/eleve/devoir/${id}/question/${qExplique}/explique`, { method: 'POST', form: true, body: fd })
      .then(() => {
        notifier('Explication envoyée à ton binôme !');
        setQExplique(null);
        charger();
      })
      .catch((e) => notifier(e.message));
  });

  async function choisir(q, i) {
    if (q.validee || data?.devoir.fini || (reste != null && reste <= 0) || envoi != null) return;
    setEnvoi(q.id);
    try {
      const r = await api(`/eleve/devoir/${id}/question/${q.id}`, { method: 'POST', body: { choix: i } });
      if (r.validee)
        notifier(r.bonne ? `Question ${q.num} validée — bonne réponse !` : `Question ${q.num} validée — ce n'était pas la bonne.`);
      charger();
    } catch (err) {
      notifier(err.message);
    }
    setEnvoi(null);
  }

  async function participationAction(action) {
    try {
      await api(`/eleve/devoir/${id}/${action}`, { method: 'POST' });
      charger();
    } catch (e) {
      notifier(e.message);
    }
  }

  async function noter(xid, note) {
    try {
      await api(`/eleve/devoir/explique/${xid}/noter`, { method: 'POST', body: { note } });
      notifier(note ? 'Merci ! Explication jugée claire.' : 'Explication jugée pas claire.');
      charger();
    } catch (e) {
      notifier(e.message);
    }
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
  const part = data.participation;
  const chronoActif = devoir.duree_min && reste != null && part?.statut === 'accepte';
  const chronoEcoule = chronoActif && reste <= 0;
  const toutValide = questions.length > 0 && questions.every((q) => q.validee);

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
          {devoir.serie ? `${devoir.serie} · ` : ''}Avec <strong>{partenaire?.prenom}</strong> ·{' '}
          {devoir.fini ? 'délai dépassé' : resteTemps(devoir.deadline) || 'sans délai'}
        </p>

        {chronoActif && (
          <div className={`chrono${chronoEcoule ? ' chrono-ko' : reste < 60 ? ' chrono-ko' : reste < 180 ? ' chrono-warn' : ''}`}>
            <Icon name="clock" size={15} />
            {chronoEcoule ? 'Chrono écoulé !' : `Chrono du binôme : ${fmtChrono(reste)}`}
            {devoir.duree_min ? ' — finissez tout à temps pour le point bonus.' : ''}
          </div>
        )}
        {devoir.parfait && (
          <div className="chrono chrono-ok">
            <Icon name="trophy" size={15} /> Devoir parfait !{devoir.bonus ? ' +1 point bonus vitesse.' : ''}
          </div>
        )}

        {errDevoir && (
          <div className="chat-vide">
            <Icon name="alert" size={24} />
            <strong>Problème</strong>
            <p className="muted small">{errDevoir}</p>
            <button className="btn btn-primary" onClick={charger}>
              Réessayer
            </button>
          </div>
        )}

        {!errDevoir && !devoir.fini && !part && (
          <div className="devoir-part">
            <p className="muted small">Pour commencer, propose le devoir à ton binôme : il pourra accepter ou refuser.</p>
            <button className="btn btn-primary" onClick={() => participationAction('proposer')}>
              <Icon name="send" size={15} /> Proposer à {partenaire?.prenom} de faire ce devoir
            </button>
          </div>
        )}
        {!errDevoir && part?.statut === 'propose' && part.par !== moiId && (
          <div className="devoir-part">
            <p className="muted small">
              <strong>{partenaire?.prenom}</strong> veut faire ce devoir avec toi. Tu acceptes ?
            </p>
            <div className="chat-inv-actions">
              <button className="btn btn-primary" onClick={() => participationAction('accepter')}>
                <Icon name="check" size={15} /> Accepter
              </button>
              <button className="btn btn-ghost" onClick={() => participationAction('refuser')}>
                Refuser
              </button>
            </div>
          </div>
        )}
        {!errDevoir && part?.statut === 'propose' && part.par === moiId && (
          <div className="devoir-part">
            <p className="muted small">
              Proposition envoyée : en attente de l'accord de <strong>{partenaire?.prenom}</strong>…
            </p>
          </div>
        )}
        {!errDevoir && part?.statut === 'refuse' && (
          <div className="devoir-part">
            <p className="err-text">Ce devoir a été refusé : vous ne le ferez pas ensemble.</p>
          </div>
        )}

        {part?.statut === 'accepte' &&
          questions.map((q) => (
            <div className={`devoir-q${q.validee ? ' validee' : ''}`} key={q.id}>
              <p className="duel-question">
                {q.num}. {q.question}
              </p>
              {q.image && <img className="devoir-img" src={imageQuestion(id, q.id)} alt="Document de la question" loading="lazy" />}
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
                      disabled={q.validee || devoir.fini || chronoEcoule}
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
                <>
                  <small className={q.bonne === q.mon_choix ? 'ok-text' : 'err-text'}>
                    {q.bonne === q.mon_choix
                      ? 'Bonne réponse validée ensemble !'
                      : `Validée ensemble — la bonne réponse était : ${q.choix[q.bonne]}`}
                  </small>
                  <ExpliqueZone
                    q={q}
                    partenaire={partenaire}
                    onNoter={noter}
                    micro={micro}
                    enCours={qExplique === q.id}
                    setEnCours={(v) => setQExplique(v ? q.id : null)}
                  />
                </>
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

        {part?.statut === 'accepte' && (toutValide || chronoEcoule) && (
          <div className="devoir-part">
            <button className="btn btn-outline" onClick={() => participationAction('revanche')}>
              <Icon name="refresh" size={15} /> Revanche : refaire ce devoir pour améliorer le score
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Explications vocales d'une question validée : écoute + note clair/pas clair. */
function ExpliqueZone({ q, partenaire, onNoter, micro, enCours, setEnCours }) {
  return (
    <div className="explique-zone">
      <div className="explique-head">
        <strong>
          <Icon name="mic" size={13} /> Explique ta réponse
        </strong>
        {enCours ? (
          <span className="chat-rec" style={{ width: 'auto' }}>
            <span className="chat-rec-dot" />
            <span className="chat-rec-txt">{fmtChrono(micro.sec || 0)}</span>
            <button className="btn btn-primary" style={{ padding: '5px 10px' }} onClick={micro.stop}>
              <Icon name="check" size={14} /> Envoyer
            </button>
            <button className="btn btn-ghost" style={{ padding: '5px 10px' }} onClick={micro.cancel}>
              <Icon name="trash" size={14} />
            </button>
          </span>
        ) : (
          <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => { setEnCours(true); micro.start(); }}>
            <Icon name="mic" size={13} /> Enregistrer mon explication
          </button>
        )}
      </div>
      {(q.expliques || []).map((x) => (
        <div className="explique-row" key={x.id}>
          <AudioBulle src={fichierExplique(x.id)} />
          <small className="muted">{x.mien ? 'Toi' : partenaire?.prenom}</small>
          {x.mien ? (
            x.note != null && <small className={x.note ? 'ok-text' : 'err-text'}>{x.note ? 'jugée claire' : 'jugée pas claire'}</small>
          ) : x.note == null ? (
            <span className="explique-noter">
              <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => onNoter(x.id, 1)}>
                Clair
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => onNoter(x.id, 0)}>
                Pas clair
              </button>
            </span>
          ) : (
            <small className={x.note ? 'ok-text' : 'err-text'}>{x.note ? 'tu as jugé clair' : 'tu as jugé pas clair'}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function Classement({ id, onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api(`/eleve/devoir/${id}/classement`).then(setRows).catch(() => setRows([]));
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
            <span className={`rang${i < 3 ? ` medal-${i + 1}` : ''}`}>{i === 0 ? '1ᵉʳ' : `${i + 1}ᵉ`}</span>
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

function ClassementGlobal({ onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api('/eleve/devoirs/classement').then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="chat-lightbox" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="duel-jeu-head">
          <strong>
            <Icon name="trophy" size={16} /> Classement général des binômes
          </strong>
          <button className="convo-retour" onClick={onClose} title="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="muted small">Points = bonnes réponses + bonus vitesse, tous devoirs confondus.</p>
        {!rows && <Spinner />}
        {rows && rows.length === 0 && <p className="muted">Aucun binôme n'a encore commencé de devoir.</p>}
        {(rows || []).map((r, i) => (
          <div className={`chat-row${r.mon_binome ? ' rang-moi' : ''}`} key={r.lien_id}>
            <span className={`rang${i < 3 ? ` medal-${i + 1}` : ''}`}>{i === 0 ? '1ᵉʳ' : `${i + 1}ᵉ`}</span>
            <div className="chat-row-txt">
              <strong>
                {r.eleve_a?.prenom} + {r.eleve_b?.prenom}
              </strong>
              <small className="muted">
                {r.devoirs} devoir(s) · {r.parfaits} parfait(s)
              </small>
            </div>
            <span className="rang-score">{r.pts} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
