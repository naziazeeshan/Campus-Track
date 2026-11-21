import { useEffect, useState } from 'react';
import { GraduationCap, Users, BookOpen, Wallet, CalendarCheck, Award, AlertCircle, Percent } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import Badge from '../components/ui/Badge.jsx';
import { fmtDate, fmtMoney } from '../utils/format.js';

const prioType = { normal: 'info', important: 'warning', urgent: 'danger' };

function AnnouncementList({ items }) {
  return (
    <Card title="Latest Announcements">
      {items.length === 0 ? <p className="muted">No announcements yet.</p> : (
        <ul className="activity-list">
          {items.map((a) => (
            <li key={a._id}>
              <div className="row-between">
                <strong>{a.title}</strong>
                <Badge type={prioType[a.priority]}>{a.priority}</Badge>
              </div>
              <small className="muted">{fmtDate(a.createdAt)}{a.createdBy ? ` · ${a.createdBy.name}` : ''}</small>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StaffDashboard({ isAdmin }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/reports/dashboard').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;

  return (
    <>
      <div className="grid stats-grid">
        <StatCard label="Active Students" value={d.counts.students.toLocaleString()} icon={GraduationCap} color="blue" trend={`${d.counts.classes} classes`} />
        <StatCard label="Teachers" value={d.counts.teachers} icon={Users} color="green" trend={`${d.counts.staff} other staff`} />
        <StatCard label="Courses" value={d.counts.courses} icon={BookOpen} color="purple" />
        {isAdmin && d.fees && <StatCard label="Fees Collected" value={fmtMoney(d.fees.collected)} icon={Wallet} color="orange" trend={`${fmtMoney(d.fees.pending)} pending`} />}
      </div>

      <div className="grid charts-grid">
        <Card title="Attendance - Last 7 Days (%)">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.attendance}>
                <defs>
                  <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#4f46e5" fill="url(#att)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        {isAdmin && (
          <Card title="Fee Collection - Last 6 Months">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.feesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <div className="grid charts-grid">
        <Card title="Recent Admissions">
          {d.recentStudents.length === 0 ? <p className="muted">No students yet.</p> : (
            <ul className="activity-list">
              {d.recentStudents.map((s) => (
                <li key={s._id} className="row-between"><span>{s.name} <small className="muted">{s.admissionNo}</small></span><small className="muted">{fmtDate(s.createdAt)}</small></li>
              ))}
            </ul>
          )}
        </Card>
        {isAdmin ? (
          <Card title="Recent Payments">
            {d.recentPayments.length === 0 ? <p className="muted">No payments yet.</p> : (
              <ul className="activity-list">
                {d.recentPayments.map((p) => (
                  <li key={p._id} className="row-between"><span>{p.student?.name || '—'}</span><strong>{fmtMoney(p.amount)}</strong></li>
                ))}
              </ul>
            )}
          </Card>
        ) : <AnnouncementList items={d.announcements} />}
      </div>
      {isAdmin && <AnnouncementList items={d.announcements} />}
    </>
  );
}

function StudentDashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/reports/my-summary').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;

  if (!d.linked) {
    return (
      <>
        <div className="alert alert-info">
          <AlertCircle size={16} /> Your login is not linked to a student record yet. Ask the administrator to add a student profile using your email address.
        </div>
        <AnnouncementList items={d.announcements} />
      </>
    );
  }
  return (
    <>
      <div className="grid stats-grid">
        <StatCard label="Attendance" value={d.attendance.percentage === null ? '—' : `${d.attendance.percentage}%`} icon={CalendarCheck} color="blue" trend={`${d.attendance.total} days recorded`} />
        <StatCard label="GPA" value={d.academic.gpa ?? '—'} icon={Award} color="green" trend={`${d.academic.totalExams} exam(s)`} />
        <StatCard label="Average Marks" value={d.academic.averagePercentage === null ? '—' : `${d.academic.averagePercentage}%`} icon={Percent} color="purple" />
        <StatCard label="Fee Balance" value={fmtMoney(d.fees.balance)} icon={Wallet} color="orange" trend={`${fmtMoney(d.fees.paid)} paid`} />
      </div>
      <AnnouncementList items={d.announcements} />
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Campus overview at a glance" />
      {user.role === 'student' ? <StudentDashboard /> : <StaffDashboard isAdmin={user.role === 'admin'} />}
    </>
  );
}
