import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

/* Devoirs communs (binômes) : l'admin crée un QCM ; chaque binôme doit se
   concerter dans son chat — une réponse n'est validée que si les deux
   membres choisissent la même option. Classement des binômes inclus. */

const QUESTION_VIDE = () => ({ question: '', choix: ['', '', '', ''], bonne: 0 });

export default function DevoirsBinomes() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [resultats, setResultats] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api('/admin/devoirs-binomes').then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function del(d) {
    if (!window.confirm(`Supprimer le devoir « ${d.titre} » et toutes ses réponses ?`)) return;
    await api(`/admin/devoirs-binomes/${d.id}`, { method: 'DELETE' });
    load();
  }

  async function basculer(d) {
    await api(`/admin/devoirs-binomes/${d.id}`, { method: 'PUT', body: { actif: !d.actif } });
    load();
  }

  async function voirResultats(d) {
    setResultats(null);
    api(`/admin/devoirs-binomes/${d.id}`).then(setResultats);
  }

  async function publier(e) {
    e.preventDefault();
    setErr(null);
    const questions = form.questions
      .map((q) => ({ ...q, choix: q.choix.map((c) => c.trim()).filter(Boolean) }))
      .filter((q) => q.question.trim());
    if (!questions.length) return setErr('Ajoutez au moins une question complète.');
    for (const q of questions) {
      if (q.choix.length < 2) return setErr('Chaque question doit avoir au moins 2 choix.');
      if (q.bonne >= q.choix.length) return setErr('La bonne réponse doit pointer vers un choix rempli.');
    }
    try {
      await api('/admin/devoirs-binomes', {
        method: 'POST',
        body: {
          titre: form.titre,
          description: form.description,
          filiere: form.filiere,
          deadline: form.deadline,
          questions,
        },
      });
      setForm(null);
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Devoirs communs (binômes)</h1>
        <button
          className="btn btn-primary"
          onClick={() =>
            setForm({
              titre: '',
              description: '',
              filiere: 'S2',
              deadline: '',
              questions: [QUESTION_VIDE()],
            })
          }
        >
          <Icon name="plus" size={16} /> Nouveau devoir
        </button>
      </div>
      <p className="muted small" style={{ maxWidth: 720 }}>
        Chaque binôme résout le devoir en discutant dans son chat : une réponse n'est validée que si les deux membres
        choisissent la même option. Le classement des binômes est visible par les élèves.
      </p>

      {!list ? (
        <Spinner />
      ) : (
        <div className="cours-list">
          {list.length === 0 && <p className="muted">Aucun devoir créé pour l'instant.</p>}
          {list.map((d) => (
            <div className="cours-row" key={d.id}>
              <div className="cours-row-main">
                <strong>
                  {d.titre} {!d.actif && <span className="badge">désactivé</span>}
                </strong>
                <div className="cours-row-meta muted small">
                  Filière {d.filiere} · {d.nb_questions} question(s) · {d.nb_binomes} binôme(s) participé(s)
                  {d.deadline ? ` · délai : ${d.deadline.slice(0, 16).replace('T', ' à ')}` : ' · sans délai'}
                </div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => voirResultats(d)}>
                Résultats
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => basculer(d)}>
                {d.actif ? 'Désactiver' : 'Activer'}
              </button>
              <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(d)} title="Supprimer">
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title="Nouveau devoir commun" onClose={() => setForm(null)} wide>
          <form onSubmit={publier}>
            <label className="label">Titre</label>
            <input
              className="input"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Ex. Devoir commun de maths — fonctions"
              required
            />
            <label className="label">Consigne (visible par les binômes)</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Discutez ensemble puis choisissez la même réponse…"
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="label">Filière</label>
                <select className="input" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })}>
                  <option value="S2">S2</option>
                  <option value="L2">L2</option>
                  <option value="all">Toutes</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="label">Délai (optionnel)</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>

            {form.questions.map((q, i) => (
              <div className="card" key={i} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Question {i + 1}</strong>
                  {form.questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost icon-only"
                      onClick={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })}
                      title="Retirer"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  value={q.question}
                  onChange={(e) =>
                    setForm({ ...form, questions: form.questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })
                  }
                  placeholder="Énoncé de la question"
                />
                {q.choix.map((c, k) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <input
                      type="radio"
                      name={`bonne-${i}`}
                      checked={q.bonne === k}
                      onChange={() => setForm({ ...form, questions: form.questions.map((x, j) => (j === i ? { ...x, bonne: k } : x)) })}
                      title="Bonne réponse"
                    />
                    <input
                      className="input"
                      value={c}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          questions: form.questions.map((x, j) =>
                            j === i ? { ...x, choix: x.choix.map((cc, kk) => (kk === k ? e.target.value : cc)) } : x
                          ),
                        })
                      }
                      placeholder={`Choix ${String.fromCharCode(65 + k)}`}
                    />
                  </div>
                ))}
                <small className="muted">Cochez la bonne réponse.</small>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginTop: 12 }}
              onClick={() => setForm({ ...form, questions: [...form.questions, QUESTION_VIDE()] })}
            >
              <Icon name="plus" size={15} /> Ajouter une question
            </button>

            {err && <p className="err-text" style={{ marginTop: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary">
                Publier (annonce aux binômes)
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resultats && (
        <Modal title={`Résultats — ${resultats.devoir.titre}`} onClose={() => setResultats(null)} wide>
          <p className="muted small">
            {resultats.nb_questions} question(s) · {resultats.resultats.length} binôme(s) avec au moins une réponse.
          </p>
          {resultats.resultats.length === 0 && <p className="muted">Aucun binôme n'a encore répondu.</p>}
          <div className="cours-list">
            {resultats.resultats.map((r, i) => (
              <div className="cours-row" key={i}>
                <div className="cours-row-main">
                  <strong>
                    {i + 1}. {r.binome}
                  </strong>
                  <div className="cours-row-meta muted small">
                    {r.type === 'binome' ? 'Binôme de travail' : 'Amis'} · {r.validees}/{resultats.nb_questions} réponses
                    validées
                  </div>
                </div>
                <span className="badge badge-soft">{r.score} pt(s)</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
