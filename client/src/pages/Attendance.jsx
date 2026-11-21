import { useEffect, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Table from '../components/ui/Table.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { CalendarCheck } from 'lucide-react';
import { today, fmtDate, cap, exportCsv } from '../utils/format.js';

const STATUS = [
  { key: 'present', short: 'P', label: 'Present' },
  { key: 'absent', short: 'A', label: 'Absent' },
  { key: 'late', short: 'L', label: 'Late' },
  { key: 'leave', short: 'Lv', label: 'Leave' },
];
const statusType = { present: 'success', absent: 'danger', late: 'warning', leave: 'info' };

function useClasses() {
  const [classes, setClasses] = useState([]);
  useEffect(() => { api.get('/classes', { limit: 500 }).then((d) => setClasses(d.items)).catch(() => {}); }, []);
  return classes;
}

function MarkAttendance() {
  const notify = useToast();
  const classes = useClasses();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classId || !date) { setRows([]); return; }
    setLoading(true);
    api.get('/attendance/sheet', { classSection: classId, date })
      .then(setRows)
      .catch((e) => notify(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [classId, date]); // eslint-disable-line

  const setStatus = (id, status) => setRows((rs) => rs.map((r) => (r.student === id ? { ...r, status } : r)));
  const markAll = (status) => setRows((rs) => rs.map((r) => ({ ...r, status })));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/attendance/bulk', {
        classSection: classId, date,
        records: rows.map((r) => ({ student: r.student, status: r.status, remarks: r.remarks })),
      });
      notify('Attendance saved');
      setRows((rs) => rs.map((r) => ({ ...r, marked: true })));
    } catch (e) { notify(e.message, 'error'); } finally { setSaving(false); }
  };

  const counts = STATUS.map((s) => ({ ...s, n: rows.filter((r) => r.status === s.key).length }));

  return (
    <Card>
      <div className="toolbar">
        <div className="toolbar-left">
          <select className="filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class...</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input type="date" className="filter-select" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>
        {rows.length > 0 && (
          <div className="toolbar-right">
            <Button variant="outline" onClick={() => markAll('present')}>All Present</Button>
            <Button icon={Save} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</Button>
          </div>
        )}
      </div>

      {!classId ? <p className="muted">Select a class and date to mark attendance.</p> : loading ? <Loader /> : rows.length === 0 ? (
        <p className="muted">No active students are enrolled in this class.</p>
      ) : (
        <>
          <div className="count-chips">
            {counts.map((c) => <Badge key={c.key} type={statusType[c.key]}>{c.label}: {c.n}</Badge>)}
            {rows[0]?.marked && <span className="muted small">Already marked for this date - saving will update it.</span>}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Admission No</th><th>Student</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student}>
                    <td>{r.admissionNo}</td>
                    <td>{r.name}</td>
                    <td>
                      <div className="seg">
                        {STATUS.map((s) => (
                          <button
                            key={s.key} type="button" title={s.label}
                            className={`seg-btn ${s.key} ${r.status === s.key ? 'on' : ''}`}
                            onClick={() => setStatus(r.student, s.key)}
                          >{s.short}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function AttendanceReport() {
  const classes = useClasses();
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/settings').then((s) => setThreshold(s.attendanceThreshold ?? 75)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    api.get('/attendance/summary', { classSection: classId, from, to }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [classId, from, to]);

  const columns = [
    { key: 'admissionNo', label: 'Admission No' }, { key: 'name', label: 'Student' },
    { key: 'present', label: 'Present' }, { key: 'late', label: 'Late' }, { key: 'absent', label: 'Absent' },
    { key: 'leave', label: 'Leave' }, { key: 'total', label: 'Total Days' },
    { key: 'percentage', label: 'Attendance', render: (r) => <Badge type={r.percentage >= threshold ? 'success' : 'danger'}>{r.percentage}%</Badge> },
  ];

  return (
    <Card>
      <div className="toolbar">
        <div className="toolbar-left">
          <select className="filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <label className="inline-label">From <input type="date" className="filter-select" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="inline-label">To <input type="date" className="filter-select" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="toolbar-right">
          {data?.items.length > 0 && (
            <Button variant="outline" icon={Download} onClick={() => exportCsv('attendance-report.csv', data.items, columns.map((c) => ({ key: c.key, label: c.label })))}>Export CSV</Button>
          )}
        </div>
      </div>
      <p className="muted small">Late counts as attended. Students below {threshold}% are highlighted in red.</p>
      {loading ? <Loader /> : <Table columns={columns} rows={(data?.items || []).map((r) => ({ ...r, id: r.student }))} />}
    </Card>
  );
}

function StudentAttendance() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api.get('/attendance/summary'), api.get('/attendance', { limit: 500 })])
      .then(([s, h]) => { setSummary(s); setHistory(h.items); })
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!summary) return <Loader />;
  const cols = [
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'classSection', label: 'Class', render: (r) => r.classSection?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge type={statusType[r.status]}>{cap(r.status)}</Badge> },
  ];
  return (
    <>
      <div className="grid stats-grid">
        <StatCard label="Overall Attendance" value={summary.overall.percentage === null ? '—' : `${summary.overall.percentage}%`} icon={CalendarCheck} color="blue" trend={`${summary.overall.total} days recorded`} />
      </div>
      <Card title="Attendance History"><Table columns={cols} rows={history} /></Card>
    </>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('mark');
  return (
    <>
      <PageHeader title="Attendance" subtitle="Daily attendance, history and percentage reports" />
      {user.role === 'student' ? <StudentAttendance /> : (
        <>
          <Tabs tabs={[{ key: 'mark', label: 'Mark Attendance' }, { key: 'report', label: 'Reports & History' }]} active={tab} onChange={setTab} />
          {tab === 'mark' ? <MarkAttendance /> : <AttendanceReport />}
        </>
      )}
    </>
  );
}
