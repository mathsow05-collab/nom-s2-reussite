import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { Spinner } from '../ui.jsx';

export default function Idees() {
  const [list, setList] = useState(null);
  const load = () => api('/admin/idees').then(setList);
  useEffect(() => {
    load();
  }, []);

  async function marquer(id) {
    await api(`/admin/idees/${id}/lu`, { method: 'POST' });
    load();
  }

  return (
    <div className="admin-page">
      <h1>Boîte à idées des élèves</h1>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="empty">Aucune idée déposée pour le moment.</div>
      ) : (
        <div className="qa-list">
          {list.map((i) => (
            <div className={i.lu ? 'qa-item' : 'qa-item warn-border'} key={i.id}>
              <div className="qa-q">
                <Icon name="bulb" size={16} /> <strong>{i.eleve_ref || 'Élève'}</strong>
                <p style={{ margin: '6px 0 0' }}>{i.message}</p>
              </div>
              {!i.lu && (
                <button className="btn btn-outline btn-sm" onClick={() => marquer(i.id)}>
                  <Icon name="check" size={14} /> Marquer comme lue
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
