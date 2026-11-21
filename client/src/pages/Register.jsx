import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><GraduationCap size={30} /></div>
        <h1>Create account</h1>
        <p className="auth-sub">Student registration</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group"><label>Full name</label><input required value={form.name} onChange={set('name')} /></div>
        <div className="form-group"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
        <div className="form-group"><label>Password</label><input type="password" required minLength={6} value={form.password} onChange={set('password')} /></div>
        <div className="form-group"><label>Confirm password</label><input type="password" required value={form.confirm} onChange={set('confirm')} /></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating...' : 'Register'}</button>
        <p className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
