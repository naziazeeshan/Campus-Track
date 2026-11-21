import { useCallback, useEffect, useState } from 'react';
import { Send, Reply } from 'lucide-react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import FormField from '../components/ui/FormField.jsx';
import { fmtDate, cap } from '../utils/format.js';

function Compose({ initial, onSent }) {
  const notify = useToast();
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ to: initial?.to || '', subject: initial?.subject || '', body: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/messages/contacts').then((d) => setContacts(d.items)); }, []);
  const set = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.post('/messages', form); notify('Message sent'); onSent(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <form onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <FormField field={{ name: 'to', label: 'To', type: 'select', required: true, full: true }} value={form.to} onChange={set}
            options={contacts.map((c) => ({ value: c._id, label: `${c.name} (${cap(c.role)})` }))} />
          <FormField field={{ name: 'subject', label: 'Subject', full: true }} value={form.subject} onChange={set} />
          <FormField field={{ name: 'body', label: 'Message', type: 'textarea', required: true, full: true }} value={form.body} onChange={set} />
        </div>
        <div className="form-actions"><Button type="submit" icon={Send} disabled={busy}>{busy ? 'Sending...' : 'Send'}</Button></div>
      </form>
    </Card>
  );
}

function MessageList({ box, onReply }) {
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const load = useCallback(() => { api.get(`/messages/${box}`).then((d) => setItems(d.items)).catch(() => setItems([])); }, [box]);
  useEffect(load, [load]);

  const toggle = async (m) => {
    setOpenId(openId === m._id ? null : m._id);
    if (box === 'inbox' && !m.read) { await api.patch(`/messages/${m._id}/read`).catch(() => {}); load(); }
  };

  if (!items) return <Loader />;
  if (items.length === 0) return <Card><p className="muted">No messages.</p></Card>;
  return (
    <Card>
      <ul className="msg-list">
        {items.map((m) => {
          const other = box === 'inbox' ? m.from : m.to;
          return (
            <li key={m._id} className={`msg ${box === 'inbox' && !m.read ? 'unread' : ''}`}>
              <button className="msg-head" onClick={() => toggle(m)}>
                <strong>{other?.name || 'Unknown'} <small className="muted">({cap(other?.role)})</small></strong>
                <span>{m.subject || '(no subject)'}</span>
                <small className="muted">{fmtDate(m.createdAt)}</small>
              </button>
              {openId === m._id && (
                <div className="msg-body">
                  <p className="pre">{m.body}</p>
                  {box === 'inbox' && other && (
                    <Button variant="outline" icon={Reply} className="btn-sm" onClick={() => onReply({ to: other._id, subject: m.subject ? `Re: ${m.subject.replace(/^Re: /, '')}` : '' })}>Reply</Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function Messages() {
  const [tab, setTab] = useState('inbox');
  const [draft, setDraft] = useState(null);
  const tabs = [{ key: 'inbox', label: 'Inbox' }, { key: 'sent', label: 'Sent' }, { key: 'compose', label: 'Compose' }];
  return (
    <>
      <PageHeader title="Messages" subtitle="Communicate with teachers, students and the administration" />
      <Tabs tabs={tabs} active={tab} onChange={(t) => { if (t === 'compose') setDraft(null); setTab(t); }} />
      {tab === 'compose'
        ? <Compose key={draft ? draft.to : 'new'} initial={draft} onSent={() => { setDraft(null); setTab('sent'); }} />
        : <MessageList key={tab} box={tab} onReply={(d) => { setDraft(d); setTab('compose'); }} />}
    </>
  );
}
