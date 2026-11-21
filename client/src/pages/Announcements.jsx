import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Loader from '../components/ui/Loader.jsx';
import FormField from '../components/ui/FormField.jsx';
import { fmtDate, cap } from '../utils/format.js';

const prioType = { normal: 'info', important: 'warning', urgent: 'danger' };
const fields = [
  { name: 'title', label: 'Title', required: true, full: true },
  { name: 'audience', label: 'Audience', type: 'select', required: true, options: [{ value: 'all', label: 'Everyone' }, { value: 'students', label: 'Students' }, { value: 'teachers', label: 'Teachers' }] },
  { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['normal', 'important', 'urgent'].map((v) => ({ value: v, label: cap(v) })) },
  { name: 'message', label: 'Message', type: 'textarea', required: true, full: true },
];

export default function Announcements() {
  const { user } = useAuth();
  const notify = useToast();
  const canPost = user.role !== 'student';
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/announcements', { limit: 100 }).then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const openNew = () => { setForm({ title: '', audience: 'all', priority: 'normal', message: '' }); setFormError(''); setOpen(true); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    try { await api.post('/announcements', form); notify('Announcement published'); setOpen(false); load(); }
    catch (err) { setFormError(err.message); } finally { setBusy(false); }
  };
  const remove = async (a) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await api.del(`/announcements/${a._id}`); notify('Deleted'); load(); } catch (err) { notify(err.message, 'error'); }
  };
  const mine = (a) => user.role === 'admin' || a.createdBy?._id === user._id;

  return (
    <>
      <PageHeader title="Announcements" subtitle="Important updates for the campus"
        action={canPost && <Button icon={Plus} onClick={openNew}>New Announcement</Button>} />
      {error && <div className="alert alert-error">{error}</div>}
      {!items ? <Loader /> : items.length === 0 ? <Card><p className="muted">No announcements yet.</p></Card> : items.map((a) => (
        <Card key={a._id} className={`announcement ${a.priority}`}>
          <div className="row-between">
            <h3>{a.title}</h3>
            <div className="row-actions">
              <Badge type={prioType[a.priority]}>{cap(a.priority)}</Badge>
              <Badge type="info">{a.audience === 'all' ? 'Everyone' : cap(a.audience)}</Badge>
              {canPost && mine(a) && <button className="icon-btn danger" onClick={() => remove(a)} title="Delete"><Trash2 size={16} /></button>}
            </div>
          </div>
          <p className="pre">{a.message}</p>
          <small className="muted">{fmtDate(a.createdAt)}{a.createdBy ? ` · by ${a.createdBy.name}` : ''}</small>
        </Card>
      ))}
      {open && (
        <Modal title="New Announcement" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="form-grid">
              {fields.map((f) => <FormField key={f.name} field={f} value={form[f.name]} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />)}
            </div>
            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Publishing...' : 'Publish'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
