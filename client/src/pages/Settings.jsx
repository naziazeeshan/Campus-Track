import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import FormField from '../components/ui/FormField.jsx';
import { cap } from '../utils/format.js';

const instFields = [
  { name: 'institutionName', label: 'Institution Name', required: true, full: true },
  { name: 'address', label: 'Address', full: true },
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'academicYear', label: 'Academic Year' },
  { name: 'currency', label: 'Currency Symbol' },
  { name: 'attendanceThreshold', label: 'Minimum Attendance %', type: 'number', min: 0 },
];

function InstitutionSettings() {
  const notify = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/settings').then(setForm).catch((e) => notify(e.message, 'error')); }, []); // eslint-disable-line
  if (!form) return <Loader />;
  const set = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = Object.fromEntries(instFields.map((f) => [f.name, f.type === 'number' && form[f.name] !== '' ? Number(form[f.name]) : form[f.name] ?? '']));
      setForm(await api.put('/settings', payload));
      notify('Settings saved');
    } catch (err) { notify(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Card title="Institution Settings">
      <form onSubmit={submit}>
        <div className="form-grid">
          {instFields.map((f) => <FormField key={f.name} field={f} value={form[f.name]} onChange={set} />)}
        </div>
        <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Settings'}</Button></div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const notify = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) { setError('New passwords do not match'); return; }
    setBusy(true);
    try {
      await api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      notify('Password updated');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Card title="Change Password">
      <form onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <FormField field={{ name: 'currentPassword', label: 'Current Password', type: 'password', required: true, full: true }} value={form.currentPassword} onChange={set} />
          <FormField field={{ name: 'newPassword', label: 'New Password (min 6 characters)', type: 'password', required: true }} value={form.newPassword} onChange={set} />
          <FormField field={{ name: 'confirm', label: 'Confirm New Password', type: 'password', required: true }} value={form.confirm} onChange={set} />
        </div>
        <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Updating...' : 'Update Password'}</Button></div>
      </form>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Settings" subtitle="Institution settings and your account" />
      <Card title="My Account">
        <div className="detail-grid">
          <div><small>Name</small><p>{user.name}</p></div>
          <div><small>Email</small><p>{user.email}</p></div>
          <div><small>Role</small><p>{cap(user.role)}</p></div>
        </div>
      </Card>
      {user.role === 'admin' && <InstitutionSettings />}
      <PasswordCard />
    </>
  );
}
