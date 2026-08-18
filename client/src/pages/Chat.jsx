import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';
import Duels, { DuelJeu } from './ChatDuels.jsx';
import Devoirs, { DevoirPanneau } from './ChatDevoirs.jsx';

/* ------------------------------------------------------------------ */
/* CHAT & BINÔMES : espace de discussion privé entre élèves.           */
/* On ajoute un ami/binôme par lien d'invitation ou par découverte ;   */
/* ensuite : messages texte, notes vocales et photos, qui restent      */
/* hébergés sur la plateforme (rien ne part vers le téléphone).        */
/* ------------------------------------------------------------------ */

const fichierUrl = (id) => `/api/eleve/chat/fichier/${id}?token=${encodeURIComponent(getToken())}`;
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const initiales = (e) => `${(e.prenom || '?')[0] || ''}${(e.nom || '?')[0] || ''}`.toUpperCase();
const TYPE_LABEL = { ami: 'Ami', binome: 'Binôme' };

const jourLabel = (iso) => {
  const d = new Date(iso);
  const meme = (a, b) => a.toDateString() === b.toDateString();
  if (meme(d, new Date())) return "Aujourd'hui";
  if (meme(d, new Date(Date.now() - 86400000))) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

function Avatar({ e, gros }) {
  return e.avatar ? (
    <span className={gros ? 'chat-av gros' : 'chat-av'}>{e.avatar}</span>
  ) : (
    <span className={gros ? 'chat-av gros txt' : 'chat-av txt'}>{initiales(e)}</span>
  );
}

function ChoixType({ value, onChange }) {
  return (
    <div className="chat-type">
      <button type="button" className={value === 'ami' ? 'on' : ''} onClick={() => onChange('ami')}>
        <Icon name="heart" size={14} /> Ami
      </button>
      <button type="button" className={value === 'binome' ? 'on' : ''} onClick={() => onChange('binome')}>
        <Icon name="users" size={14} /> Binôme de travail
      </button>
    </div>
  );
}

export default function Chat({ me, codeInvite, onCodeTraite, onOuvrirContenu }) {
  const [home, setHome] = useState(null);
  const [homeErr, setHomeErr] = useState(null);
  const [devoirs, setDevoirs] = useState([]);
  const [duels, setDuels] = useState([]);
  const [vue, setVue] = useState('liste');
  const [convo, setConvo] = useState(null);
  const [toast, setToast] = useState(null);
  const [lumiere, setLumiere] = useState(null);
  const [duelId, setDuelId] = useState(null);
  const [devoirId, setDevoirId] = useState(null);
  const toastT = useRef(null);

  const notifier = useCallback((t) => {
    setToast(t);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const charger = useCallback(() => {
    setHomeErr(null);
    api('/eleve/chat/home')
      .then(setHome)
      .catch((e) => setHomeErr(e.message || 'Erreur API'));
  }, []);
  useEffect(() => {
    charger();
    const t = setInterval(charger, 12000);
    const h = () => charger();
    window.addEventListener('kd-chat', h);
    return () => {
      clearInterval(t);
      window.removeEventListener('kd-chat', h);
    };
  }, [charger]);

  useEffect(() => {
    if (codeInvite) setVue('lien');
  }, [codeInvite]);

  useEffect(() => {
    const maj = () => {
      api('/eleve/devoirs').then(setDevoirs).catch(() => {});
      api('/eleve/duels').then(setDuels).catch(() => {});
    };
    maj();
    const t = setInterval(maj, 30000);
    window.addEventListener('kd-chat', maj);
    return () => {
      clearInterval(t);
      window.removeEventListener('kd-chat', maj);
    };
  }, []);

  const devoirsActifs = devoirs.filter((d) => !d.fini && d.binome);
  const devoirsAAccapter = devoirs.filter(
    (d) => !d.fini && d.participation?.statut === 'propose' && d.participation.par !== me.id
  );
  const duelsARelever = duels.filter((d) => d.statut === 'en_attente' && !d.je_suis_createur);

  const lienPerso = home ? `${location.origin}${location.pathname}?inviter=${home.moi.code}` : '';
  async function copier() {
    try {
      await navigator.clipboard.writeText(lienPerso);
      notifier('Lien copié ! Envoie-le à ton ami.');
    } catch {
      notifier('Impossible de copier automatiquement.');
    }
  }
  async function partager() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'KAY DIANG', text: 'Rejoins-moi sur KAY DIANG pour réviser ensemble :', url: lienPerso });
      } catch {
        /* annulé */
      }
    } else copier();
  }

  if (vue === 'convo' && convo) {
    return (
      <main className="container chat-page">
        <Convo
          lien={convo}
          moiId={me.id}
          devoirsActifs={devoirsActifs}
          onRetour={() => {
            setConvo(null);
            setVue('liste');
            charger();
          }}
          onRetirer={() => {
            setConvo(null);
            setVue('liste');
            charger();
            notifier('Lien retiré.');
          }}
          onImage={setLumiere}
          onOuvrirDuel={setDuelId}
          onOuvrirDevoir={setDevoirId}
          onOuvrirContenu={onOuvrirContenu}
          notifier={notifier}
        />
        {duelId != null && <DuelJeu id={duelId} onClose={() => setDuelId(null)} notifier={notifier} />}
        {devoirId != null && <DevoirPanneau id={devoirId} onClose={() => setDevoirId(null)} notifier={notifier} moiId={me.id} />}
        {toast && <div className="chat-toast">{toast}</div>}
        {lumiere && (
          <div className="chat-lightbox" onClick={() => setLumiere(null)}>
            <img src={lumiere} alt="" />
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="container chat-page">
      <header className="chat-head">
        <h1>Chat & binômes</h1>
        <p className="muted small">Discute avec tes amis et binômes de révision : texte, notes vocales et photos.</p>
        <div className="chat-pills">
          <button className={vue === 'liste' ? 'on' : ''} onClick={() => setVue('liste')}>
            Discussions
          </button>
          <button className={vue === 'decouvrir' ? 'on' : ''} onClick={() => setVue('decouvrir')}>
            Découvrir
          </button>
          <button className={vue === 'invitations' ? 'on' : ''} onClick={() => setVue('invitations')}>
            Invitations{home?.invitations.length > 0 && <span className="chat-badge">{home.invitations.length}</span>}
          </button>
          <button className={vue === 'duels' ? 'on' : ''} onClick={() => setVue('duels')}>
            Duels{duelsARelever.length > 0 && <span className="chat-badge">{duelsARelever.length}</span>}
          </button>
          <button className={vue === 'devoirs' ? 'on' : ''} onClick={() => setVue('devoirs')}>
            Devoirs
            {(devoirsAAccapter.length > 0 || devoirsActifs.length > 0) && (
              <span className="chat-badge">{devoirsAAccapter.length || devoirsActifs.length}</span>
            )}
          </button>
        </div>
      </header>

      {!home && !homeErr && <Spinner />}
      {homeErr && (
        <section className="card chat-vide">
          <Icon name="alert" size={24} />
          <strong>Problème de chargement</strong>
          <p className="muted small">{homeErr}</p>
          <button className="btn btn-primary" onClick={charger}>
            Réessayer
          </button>
        </section>
      )}

      {home && vue === 'liste' && (
        <>
          <section className="card chat-lien">
            <div className="chat-lien-txt">
              <strong>
                <Icon name="chat" size={15} /> Ton lien d'invitation
              </strong>
              <span className="muted small">Partage-le : celui qui l'ouvre pourra t'ajouter comme ami ou binôme.</span>
            </div>
            <div className="chat-lien-actions">
              <button className="btn btn-outline" onClick={copier}>
                <Icon name="copy" size={15} /> Copier
              </button>
              <button className="btn btn-primary" onClick={partager}>
                <Icon name="send" size={15} /> Partager
              </button>
            </div>
          </section>

          {home.amis.length === 0 && home.envoyees.length === 0 && (
            <section className="card chat-vide">
              <Icon name="users" size={26} />
              <strong>Aucune discussion pour l'instant</strong>
              <p className="muted small">
                Ajoute un ami avec ton lien d'invitation, ou découvre des élèves avec qui réviser.
              </p>
              <button className="btn btn-primary" onClick={() => setVue('decouvrir')}>
                Découvrir des élèves
              </button>
            </section>
          )}

          {home.envoyees.length > 0 && (
            <section className="card">
              <h2 className="chat-h2">Invitations envoyées</h2>
              {home.envoyees.map((l) => (
                <div className="chat-row" key={l.id}>
                  <Avatar e={l.vers} />
                  <div className="chat-row-txt">
                    <strong>
                      {l.vers.prenom} {l.vers.nom}
                    </strong>
                    <small className="muted">
                      En attente · comme {TYPE_LABEL[l.type] || 'Ami'}
                    </small>
                  </div>
                  <span className="chat-etat">En attente</span>
                </div>
              ))}
            </section>
          )}

          {home.amis.length > 0 && (
            <section className="card">
              <h2 className="chat-h2">Mes discussions</h2>
              {home.amis.map((l) => (
                <button className="chat-row cliquable" key={l.id} onClick={() => { setConvo(l); setVue('convo'); }}>
                  <Avatar e={l.ami} />
                  <div className="chat-row-txt">
                    <strong>
                      {l.ami.prenom} {l.ami.nom}
                      <span className={`chat-type-badge ${l.type}`}>{TYPE_LABEL[l.type] || 'Ami'}</span>
                    </strong>
                    <small className="muted">
                      {l.dernier
                        ? l.dernier.type === 'texte'
                          ? `${l.dernier.de_id === me.id ? 'Toi : ' : ''}${l.dernier.texte}`
                          : l.dernier.type === 'audio'
                            ? 'Note vocale'
                            : l.dernier.type === 'partage'
                              ? 'Contenu recommandé'
                              : l.dernier.type === 'duel'
                                ? 'Duel de quiz'
                                : l.dernier.type === 'devoir'
                                  ? 'Devoir commun'
                                  : 'Photo'
                        : `Dites-vous bonjour !`}
                    </small>
                  </div>
                  {l.dernier && <span className="chat-row-heure">{heure(l.dernier.created_at)}</span>}
                  {l.non_lus > 0 && <span className="chat-badge">{l.non_lus}</span>}
                </button>
              ))}
            </section>
          )}
        </>
      )}

      {home && vue === 'decouvrir' && (
        <section className="card">
          <h2 className="chat-h2">Élèves avec qui réviser</h2>
          <p className="muted small">Envoie une invitation : quand la personne accepte, vous pouvez discuter.</p>
          {home.decouvrir.length === 0 && <p className="muted">Personne à découvrir pour l'instant.</p>}
          {home.decouvrir.map((e) => (
            <CarteDecouverte key={e.id} e={e} notifier={notifier} />
          ))}
        </section>
      )}

      {home && vue === 'invitations' && (
        <section className="card">
          <h2 className="chat-h2">Invitations reçues</h2>
          {home.invitations.length === 0 && (
            <p className="muted">Aucune invitation pour l'instant. Partage ton lien pour en recevoir.</p>
          )}
          {home.invitations.map((inv) => (
            <CarteInvitation key={inv.id} inv={inv} onFait={charger} notifier={notifier} />
          ))}
        </section>
      )}

      {home && vue === 'duels' && <Duels home={home} notifier={notifier} />}
      {home && vue === 'devoirs' && <Devoirs notifier={notifier} meId={me.id} />}

      {home && vue === 'lien' && codeInvite && (
        <VueLien code={codeInvite} notifier={notifier} onFini={() => { onCodeTraite(); setVue('liste'); charger(); }} onVoirInvitations={() => { onCodeTraite(); setVue('invitations'); }} />
      )}

      {duelId != null && <DuelJeu id={duelId} onClose={() => setDuelId(null)} notifier={notifier} />}
      {devoirId != null && <DevoirPanneau id={devoirId} onClose={() => setDevoirId(null)} notifier={notifier} moiId={me.id} />}
      {toast && <div className="chat-toast">{toast}</div>}
      {lumiere && (
        <div className="chat-lightbox" onClick={() => setLumiere(null)}>
          <img src={lumiere} alt="" />
        </div>
      )}
    </main>
  );
}

function CarteDecouverte({ e, notifier }) {
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);

  async function inviter(type) {
    setEnvoi(true);
    try {
      await api('/eleve/chat/inviter', { method: 'POST', body: { vers_id: e.id, type } });
      setFait(true);
      notifier(`Invitation envoyée à ${e.prenom}.`);
    } catch (err) {
      notifier(err.message);
    }
    setEnvoi(false);
  }

  return (
    <div className="chat-row">
      <Avatar e={e} />
      <div className="chat-row-txt">
        <strong>
          {e.prenom} {e.nom}
        </strong>
        <small className="muted">
          {e.classe} · {e.filiere}
          {e.meme_filiere ? ' · même filière' : ''}
        </small>
      </div>
      {fait ? (
        <span className="chat-etat ok">
          <Icon name="check" size={13} /> Envoyée
        </span>
      ) : (
        <div className="chat-dec-actions">
          <button className="btn btn-outline" disabled={envoi} onClick={() => inviter('ami')}>
            Ami
          </button>
          <button className="btn btn-outline" disabled={envoi} onClick={() => inviter('binome')}>
            Binôme
          </button>
        </div>
      )}
    </div>
  );
}

function CarteInvitation({ inv, onFait, notifier }) {
  const [type, setType] = useState(inv.type === 'binome' ? 'binome' : 'ami');
  const [busy, setBusy] = useState(false);

  async function decider(action) {
    setBusy(true);
    try {
      await api(`/eleve/chat/invitation/${inv.id}/${action}`, { method: 'POST', body: { type } });
      notifier(action === 'accepter' ? `Vous êtes maintenant ${type === 'binome' ? 'binômes de travail' : 'amis'} !` : 'Invitation refusée.');
      onFait();
    } catch (err) {
      notifier(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="chat-inv">
      <div className="chat-row">
        <Avatar e={inv.de} />
        <div className="chat-row-txt">
          <strong>
            {inv.de.prenom} {inv.de.nom}
          </strong>
          <small className="muted">
            {inv.de.classe} · {inv.de.filiere} · veut travailler avec toi
          </small>
        </div>
      </div>
      <ChoixType value={type} onChange={setType} />
      <div className="chat-inv-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => decider('accepter')}>
          <Icon name="check" size={15} /> Accepter
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => decider('refuser')}>
          Refuser
        </button>
      </div>
    </div>
  );
}

function VueLien({ code, notifier, onFini, onVoirInvitations }) {
  const [etat, setEtat] = useState('chargement'); // chargement | erreur | ok
  const [data, setData] = useState(null);
  const [type, setType] = useState('ami');
  const [busy, setBusy] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    api(`/eleve/chat/code/${encodeURIComponent(code)}`)
      .then((d) => {
        setData(d);
        setEtat('ok');
      })
      .catch((err) => {
        setEtat('erreur');
        notifier(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function ajouter() {
    setBusy(true);
    try {
      await api(`/eleve/chat/code/${encodeURIComponent(code)}/ajouter`, { method: 'POST', body: { type } });
      setEnvoye(true);
      notifier(`Invitation envoyée à ${data.eleve.prenom} !`);
    } catch (err) {
      notifier(err.message);
    }
    setBusy(false);
  }

  return (
    <section className="card chat-lien-carte">
      {etat === 'chargement' && <Spinner />}
      {etat === 'erreur' && (
        <div className="chat-vide">
          <Icon name="alert" size={26} />
          <strong>Lien invalide</strong>
          <p className="muted small">Ce lien d'invitation n'existe pas ou plus.</p>
          <button className="btn btn-primary" onClick={onFini}>
            Retour au chat
          </button>
        </div>
      )}
      {etat === 'ok' && data && (
        <>
          <div className="chat-lien-head">
            <Avatar e={data.eleve} gros />
            <div>
              <strong>
                {data.eleve.prenom} {data.eleve.nom}
              </strong>
              <div className="muted small">
                {data.eleve.classe} · filière {data.eleve.filiere}
              </div>
            </div>
          </div>

          {data.moi && (
            <p className="muted small">
              Ceci est <strong>ton propre lien</strong> : partage-le à un ami pour qu'il t'ajoute.
            </p>
          )}
          {!data.moi && data.relation?.statut === 'actif' && (
            <p className="muted small">Vous êtes déjà liés : retrouvez-vous dans vos discussions.</p>
          )}
          {!data.moi && data.relation?.statut === 'en_attente' && data.relation.sens === 'envoyee' && (
            <p className="muted small">Ton invitation est déjà en attente : patience !</p>
          )}
          {!data.moi && data.relation?.statut === 'en_attente' && data.relation.sens === 'recue' && (
            <>
              <p className="muted small">Cette personne t'a déjà envoyé une invitation.</p>
              <button className="btn btn-primary" onClick={onVoirInvitations}>
                Voir l'invitation
              </button>
            </>
          )}
          {!data.moi && !data.relation && (
            <>
              {envoye ? (
                <p className="muted small">
                  <Icon name="check" size={14} /> Invitation envoyée ! Quand {data.eleve.prenom} accepte, vous pourrez
                  discuter.
                </p>
              ) : (
                <>
                  <p className="muted small">Choisissez ensemble votre type de lien :</p>
                  <ChoixType value={type} onChange={setType} />
                  <button className="btn btn-primary" disabled={busy} onClick={ajouter}>
                    <Icon name="send" size={15} /> Envoyer l'invitation
                  </button>
                </>
              )}
            </>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={onFini}>
            Retour au chat
          </button>
        </>
      )}
    </section>
  );
}

/* ------------------------------ Conversation ------------------------------ */
function Convo({ lien, moiId, onRetour, onRetirer, onImage, devoirsActifs, onOuvrirDuel, onOuvrirDevoir, onOuvrirContenu, notifier }) {
  const [msgs, setMsgs] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [rec, setRec] = useState(null); // secondes écoulées pendant l'enregistrement
  const [partage, setPartage] = useState(null); // null | { cours: [], annales: [] }
  const finRef = useRef(null);
  const lastId = useRef(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const charger = useCallback(
    async (depuis) => {
      try {
        const d = await api(`/eleve/chat/messages/${lien.ami.id}?since=${depuis}`);
        if (d.length) {
          setMsgs((m) => [...m, ...d]);
          lastId.current = d[d.length - 1].id;
        }
      } catch {
        /* silencieux */
      }
    },
    [lien.ami.id]
  );

  useEffect(() => {
    charger(0);
    const t = setInterval(() => charger(lastId.current), 4000);
    return () => {
      clearInterval(t);
      const r = recRef.current;
      if (r && r.state !== 'inactive') r.stop();
      clearInterval(timerRef.current);
    };
  }, [charger]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length]);

  useEffect(() => {
    window.dispatchEvent(new Event('kd-chat-lu'));
  }, [msgs.length]);

  async function envoyerTexte(e) {
    e.preventDefault();
    const t = texte.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    try {
      await api('/eleve/chat/messages', { method: 'POST', body: { vers_id: lien.ami.id, texte: t } });
      setTexte('');
      charger(lastId.current);
    } catch (err) {
      notifier(err.message);
    }
    setEnvoi(false);
  }

  async function envoyerFichier(blob, nom, mime) {
    try {
      const fd = new FormData();
      fd.append('vers_id', lien.ami.id);
      fd.append('fichier', new File([blob], nom, { type: mime || blob.type }));
      await api('/eleve/chat/messages', { method: 'POST', form: true, body: fd });
      charger(lastId.current);
    } catch (err) {
      notifier(err.message);
    }
  }

  async function choisirImage(ev) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    notifier('Préparation de la photo…');
    const blob = await compresserImage(f);
    envoyerFichier(blob, `photo-${Date.now()}.jpg`, 'image/jpeg');
  }

  async function demarrerMicro() {
    if (rec !== null) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
          (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)
        ) || '';
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      r.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setRec(null);
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        if (blob.size > 1500) {
          const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
          envoyerFichier(blob, `note-${Date.now()}.${ext}`, mime || 'audio/webm');
        }
      };
      r.start();
      recRef.current = r;
      setRec(0);
      timerRef.current = setInterval(() => {
        setRec((s) => {
          if (s + 1 >= 120 && r.state !== 'inactive') r.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      notifier('Active ton micro dans les réglages du navigateur.');
    }
  }

  function annulerMicro() {
    const r = recRef.current;
    chunksRef.current = [];
    if (r && r.state !== 'inactive') {
      r.onstop = () => r.stream.getTracks().forEach((t) => t.stop());
      r.stop();
    }
    clearInterval(timerRef.current);
    setRec(null);
  }

  async function ouvrirPartage() {
    if (partage) {
      setPartage(null);
      return;
    }
    setPartage({ cours: [], annales: [] });
    const [c, a] = await Promise.all([api('/eleve/cours').catch(() => []), api('/eleve/annales').catch(() => [])]);
    setPartage({ cours: c || [], annales: a || [] });
  }

  async function partagerContenu(kind, item) {
    const payload = {
      kind,
      id: item.id,
      titre: item.titre,
      sub: kind === 'cours' ? MATIERE_BY_ID[item.matiere]?.label || 'Cours' : `Annales ${item.annee}`,
    };
    setPartage(null);
    try {
      await api('/eleve/chat/messages', {
        method: 'POST',
        body: { vers_id: lien.ami.id, type: 'partage', texte: JSON.stringify(payload) },
      });
      charger(lastId.current);
    } catch (err) {
      notifier(err.message);
    }
  }

  async function retirer() {
    if (!window.confirm(`Retirer le lien avec ${lien.ami.prenom} ? La conversation restera dans l'historique du serveur mais ne sera plus visible.`)) return;
    try {
      await api(`/eleve/chat/retirer/${lien.id}`, { method: 'POST' });
      onRetirer();
    } catch (err) {
      notifier(err.message);
    }
  }

  return (
    <>
      <header className="convo-head">
        <button className="convo-retour" onClick={onRetour} title="Retour">
          <Icon name="left" size={20} />
        </button>
        <Avatar e={lien.ami} />
        <div className="convo-id">
          <strong>
            {lien.ami.prenom} {lien.ami.nom}
          </strong>
          <span className={`chat-type-badge ${lien.type}`}>
            {lien.type === 'binome' ? 'Binôme de travail' : 'Ami'} · {lien.ami.classe}
          </span>
        </div>
        <button className="convo-retour" onClick={retirer} title="Retirer le lien">
          <Icon name="trash" size={17} />
        </button>
      </header>

      {devoirsActifs.length > 0 && (
        <button className="devoir-banniere" onClick={() => onOuvrirDevoir(devoirsActifs[0].id)}>
          <Icon name="users" size={15} />
          <span>
            Devoir commun : {devoirsActifs[0].titre} · {devoirsActifs[0].validees}/{devoirsActifs[0].total} — Ouvrir
          </span>
        </button>
      )}

      <div className="convo-flot">
        {msgs.length === 0 && (
          <div className="chat-vide">
            <Icon name="chat" size={24} />
            <strong>Commencez la discussion !</strong>
            <p className="muted small">Messages, notes vocales et photos : tout reste sur la plateforme.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const mien = m.de_id === moiId;
          const jour = jourLabel(m.created_at);
          const prec = i > 0 ? jourLabel(msgs[i - 1].created_at) : null;
          return (
            <Fragment key={m.id}>
              {jour !== prec && <div className="chat-jour">{jour}</div>}
              {['duel', 'devoir', 'partage'].includes(m.type) ? (
                <CarteSpeciale m={m} onOuvrirDuel={onOuvrirDuel} onOuvrirDevoir={onOuvrirDevoir} onOuvrirContenu={onOuvrirContenu} />
              ) : (
              <div className={mien ? 'bulle bulle-moi' : 'bulle bulle-ami'}>
                {m.type === 'texte' && <p>{m.texte}</p>}
                {m.type === 'image' && (
                  <button className="bulle-img" onClick={() => onImage(fichierUrl(m.id))} title="Agrandir">
                    <img src={fichierUrl(m.id)} alt="Photo" loading="lazy" />
                  </button>
                )}
                {m.type === 'audio' && <AudioBulle id={m.id} />}
                <span className="bulle-heure">{heure(m.created_at)}</span>
              </div>
              )}
            </Fragment>
          );
        })}
        <div ref={finRef} />
      </div>

      <form className="chat-composer" onSubmit={envoyerTexte}>
        {rec !== null ? (
          <div className="chat-rec">
            <span className="chat-rec-dot" />
            <span className="chat-rec-txt">{fmt(rec)} · note vocale…</span>
            <button type="button" className="btn btn-primary" onClick={() => recRef.current?.stop()}>
              <Icon name="check" size={15} /> Envoyer
            </button>
            <button type="button" className="btn btn-ghost" onClick={annulerMicro} title="Annuler">
              <Icon name="trash" size={15} />
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="chat-ico" onClick={() => fileRef.current?.click()} title="Envoyer une photo">
              <Icon name="image" size={20} />
            </button>
            <button type="button" className="chat-ico" onClick={demarrerMicro} title="Note vocale">
              <Icon name="mic" size={20} />
            </button>
            <button type="button" className="chat-ico" onClick={ouvrirPartage} title="Recommander un cours ou une annale">
              <Icon name="plus" size={20} />
            </button>
            <input
              className="chat-input"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Écris ton message…"
              maxLength={2000}
            />
            <button type="submit" className="chat-send" disabled={!texte.trim() || envoi} title="Envoyer">
              <Icon name="send" size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={choisirImage} />
          </>
        )}
      </form>
      {partage && <PartageSheet data={partage} onChoix={partagerContenu} onFermer={() => setPartage(null)} />}
    </>
  );
}

/* Carte centrée pour les événements : défi de duel, devoir commun, contenu
   recommandé. de_id = 0 côté serveur : ce n'est aucun des deux élèves. */
function CarteSpeciale({ m, onOuvrirDuel, onOuvrirDevoir, onOuvrirContenu }) {
  let p = {};
  try {
    p = JSON.parse(m.texte || '{}');
  } catch {
    return <div className="carte-sys mini">{m.texte}</div>;
  }

  if (m.type === 'duel') {
    const mat = MATIERE_BY_ID[p.matiere]?.label || 'Quiz';
    if (p.action === 'defi')
      return (
        <div className="carte-sys">
          <span className="carte-sys-ico zap">
            <Icon name="zap" size={16} />
          </span>
          <div className="carte-sys-txt">
            <strong>{p.de} te défie !</strong>
            <small>
              {mat} · {p.n} questions
            </small>
          </div>
          <button className="btn btn-primary" onClick={() => onOuvrirDuel(p.duel_id)}>
            Relever
          </button>
        </div>
      );
    if (p.action === 'resultat')
      return (
        <div className="carte-sys">
          <span className="carte-sys-ico trophy">
            <Icon name="trophy" size={16} />
          </span>
          <div className="carte-sys-txt">
            <strong>
              Duel terminé : {p.score_a} – {p.score_b}
            </strong>
            <small>{p.gagnant ? `Gagné par ${p.gagnant}` : 'Égalité parfaite !'}</small>
          </div>
          <button className="btn btn-outline" onClick={() => onOuvrirDuel(p.duel_id)}>
            Voir
          </button>
        </div>
      );
    if (p.action === 'accepte')
      return (
        <div className="carte-sys mini">
          <Icon name="zap" size={13} /> {p.de} a accepté le duel — à toi de jouer !
          <button className="btn btn-outline" onClick={() => onOuvrirDuel(p.duel_id)}>
            Jouer
          </button>
        </div>
      );
    return (
      <div className="carte-sys mini">
        {p.de} a refusé le duel.
      </div>
    );
  }

  if (m.type === 'devoir') {
    if (p.action === 'propose')
      return (
        <div className="carte-sys">
          <span className="carte-sys-ico devoirico">
            <Icon name="users" size={16} />
          </span>
          <div className="carte-sys-txt">
            <strong>{p.de} veut faire un devoir avec toi</strong>
            <small>{p.titre} — accepte ou refuse</small>
          </div>
          <button className="btn btn-primary" onClick={() => onOuvrirDevoir(p.devoir_id)}>
            Voir
          </button>
        </div>
      );
    if (p.action === 'devoir-accepte')
      return (
        <div className="carte-sys mini ok">
          <Icon name="check" size={13} /> Devoir « {p.titre} » accepté : c'est parti, mettez-vous d'accord sur les réponses !
        </div>
      );
    if (p.action === 'devoir-refuse')
      return (
        <div className="carte-sys mini ko">
          <Icon name="x" size={13} /> {p.de} a refusé le devoir « {p.titre} ».
        </div>
      );
    if (p.action === 'nouveau')
      return (
        <div className="carte-sys">
          <span className="carte-sys-ico devoirico">
            <Icon name="users" size={16} />
          </span>
          <div className="carte-sys-txt">
            <strong>Nouveau devoir commun</strong>
            <small>{p.titre} — à résoudre avec ton binôme</small>
          </div>
          <button className="btn btn-primary" onClick={() => onOuvrirDevoir(p.devoir_id)}>
            Ouvrir
          </button>
        </div>
      );
    return (
      <div className={`carte-sys mini ${p.bonne ? 'ok' : 'ko'}`}>
        <Icon name={p.bonne ? 'check' : 'alert'} size={13} />
        Question {p.num} validée {p.bonne ? '— bonne réponse !' : '— ce n’était pas la bonne.'}
      </div>
    );
  }

  return (
    <div className="carte-sys">
      <span className="carte-sys-ico partage">
        <Icon name={p.kind === 'annale' ? 'file' : 'book'} size={16} />
      </span>
      <div className="carte-sys-txt">
        <strong>{p.titre}</strong>
        <small>{p.sub} · recommandé pour toi</small>
      </div>
      <button className="btn btn-primary" onClick={() => onOuvrirContenu?.(p)}>
        Ouvrir
      </button>
    </div>
  );
}

function PartageSheet({ data, onChoix, onFermer }) {
  return (
    <div className="sheet3" onClick={onFermer}>
      <div className="sheet3-card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet3-handle" />
        <h2 className="sheet3-title">Recommander un contenu</h2>
        <div className="partage-liste">
          {data.cours.length > 0 && <h3>Cours</h3>}
          {data.cours.map((c) => (
            <button key={`c${c.id}`} onClick={() => onChoix('cours', c)}>
              <Icon name="book" size={15} /> {c.titre}
            </button>
          ))}
          {data.annales.length > 0 && <h3>Annales</h3>}
          {data.annales.map((a) => (
            <button key={`a${a.id}`} onClick={() => onChoix('annale', a)}>
              <Icon name="file" size={15} /> {a.titre} ({a.annee})
            </button>
          ))}
          {data.cours.length === 0 && data.annales.length === 0 && (
            <p className="muted small">Chargement…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioBulle({ id }) {
  const audioRef = useRef(null);
  const [joue, setJoue] = useState(false);
  const [prog, setProg] = useState(0);
  const [duree, setDuree] = useState(0);

  return (
    <span className="audio-bulle">
      <audio
        ref={audioRef}
        src={fichierUrl(id)}
        preload="metadata"
        onPlay={() => setJoue(true)}
        onPause={() => setJoue(false)}
        onEnded={() => {
          setJoue(false);
          setProg(0);
        }}
        onTimeUpdate={(e) => setProg(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuree(e.target.duration)}
      />
      <button type="button" className="audio-btn" onClick={() => (joue ? audioRef.current?.pause() : audioRef.current?.play())}>
        <Icon name={joue ? 'pause' : 'play'} size={15} />
      </button>
      <span className="audio-bar">
        <span style={{ width: duree ? `${Math.min(100, (prog / duree) * 100)}%` : '0%' }} />
      </span>
      <span className="audio-dur">{fmt(duree || 0)}</span>
    </span>
  );
}

/* Réduit les photos à max 1280 px en JPEG avant l'envoi (économie de data). */
async function compresserImage(file) {
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    URL.revokeObjectURL(url);
    return blob || file;
  } catch {
    return file;
  }
}
