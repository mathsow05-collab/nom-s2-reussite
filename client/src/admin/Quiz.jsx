import { useEffect, useState } from 'react';
import { api, FILIERES, MATIERE_BY_ID } from '../api.js';
import Icon from '../Icon.jsx';
import { Modal, Spinner } from '../ui.jsx';

export default function Quiz({ adminScope = 'all' }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api('/admin/quiz').then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function del(q) {
    if (!window.confirm('Supprimer cette question ?')) return;
    await api(`/admin/quiz/${q.id}`, { method: 'DELETE' });
    load();
  }

  const groupes = {};
  (list || []).forEach((q) => {
    const k = `${q.filiere}|${q.matiere}|${q.lecon}`;
    (groupes[k] = groupes[k] || []).push(q);
  });

  return (
    <div className="admin-page">
      <div className="page-head">
        <h1>Banque de questions (quiz)</h1>
        <button className="btn btn-primary" onClick={() => setForm({ filiere: adminScope === 'all' ? 'S2' : adminScope, matiere: 'maths', lecon: '', question: '', choix: ['', '', '', ''], bonne: 0 })}>
          <Icon name="plus" size={16} /> Nouvelle question
        </button>
      </div>
      {err && <div className="alert alert-danger">{err}</div>}
      {!list ? (
        <Spinner />
      ) : (
        Object.entries(groupes).map(([k, qs]) => {
          const [fil, mat, lec] = k.split('|');
          return (
            <section className="panel" key={k}>
              <h2>
                <span className={`filiere-badge fil-${fil}`}>{fil}</span> {MATIERE_BY_ID[mat]?.label || mat} — {lec}{' '}
                <span className="muted small">({qs.length} questions)</span>
              </h2>
              <div className="cours-list">
                {qs.map((q) => (
                  <div className="cours-row" key={q.id}>
                    <div className="cours-row-main">
                      <strong>{q.question}</strong>
                      <div className="cours-row-meta muted small">Réponse : {q.choix[q.bonne]}</div>
                    </div>
                    <button className="btn btn-sm btn-ghost icon-only" onClick={() => del(q)} title="Supprimer">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
      {form && <QuizForm form={form} adminScope={adminScope} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}

function QuizForm({ form, adminScope, onClose, onSaved }) {
  const [f, setF] = useState(form);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api('/admin/quiz', { method: 'POST', body: f });
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Nouvelle question de quiz" onClose={onClose}>
      <form onSubmit={submit}>
        {adminScope === 'all' && (
          <>
            <label className="label">Filière</label>
            <select className="input" value={f.filiere} onChange={(e) => set('filiere', e.target.value)}>
              <option value="S2">S2</option>
              <option value="L2">L2</option>
              <option value="AR">Arabe</option>
            </select>
          </>
        )}
        <label className="label">Matière</label>
        <select className="input" value={f.matiere} onChange={(e) => set('matiere', e.target.value)}>
          {FILIERES[f.filiere].matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="label">Leçon *</label>
        <input className="input" placeholder="Ex. : Puissances" value={f.lecon} onChange={(e) => set('lecon', e.target.value)} />
        <label className="label">Question *</label>
        <textarea className="input" rows="2" value={f.question} onChange={(e) => set('question', e.target.value)} />
        <label className="label">4 choix (coche la bonne réponse)</label>
        {f.choix.map((c, i) => (
          <div className="quiz-admin-choice" key={i}>
            <input type="radio" name="bonne" checked={f.bonne === i} onChange={() => set('bonne', i)} />
            <input className="input" value={c} onChange={(e) => set('choix', f.choix.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Choix ${i + 1}`} />
          </div>
        ))}
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy || !f.question.trim() || !f.lecon.trim()}>
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}
