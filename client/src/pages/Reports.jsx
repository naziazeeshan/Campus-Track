import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Badge from '../components/ui/Badge.jsx';
import { Wallet, CheckCircle2, Clock4, Percent } from 'lucide-react';
import { fmtMoney, cap, exportCsv } from '../utils/format.js';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function useReport(path, deps = []) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setD(null); api.get(path).then(setD).catch((e) => setError(e.message)); }, deps); // eslint-disable-line
  return { d, error };
}

function Pie2({ title, data }) {
  return (
    <Card title={title}>
      <div className="chart-box small">
        {data.length === 0 ? <p className="muted">No data</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.map((x) => ({ ...x, name: cap(String(x.name)) }))} dataKey="count" nameKey="name" outerRadius={80} label>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function StudentReport() {
  const { d, error } = useReport('/reports/students');
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;
  return (
    <>
      <div className="grid stats-grid"><StatCard label="Total Students" value={d.total} icon={Percent} color="blue" /></div>
      <div className="grid charts-grid">
        <Card title="Students per Course">
          <div className="chart-box small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byCourse}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Pie2 title="By Status" data={d.byStatus} />
        <Pie2 title="By Gender" data={d.byGender} />
        <Card title="Students per Class">
          <Table columns={[{ key: 'name', label: 'Class' }, { key: 'count', label: 'Students' }]} rows={d.byClass} />
        </Card>
      </div>
    </>
  );
}

function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/classes', { limit: 500 }).then((r) => setClasses(r.items)); }, []);
  useEffect(() => { setData(null); api.get('/attendance/summary', { classSection: classId }).then(setData).catch(() => setData({ items: [] })); }, [classId]);
  const cols = [
    { key: 'admissionNo', label: 'Admission No' }, { key: 'name', label: 'Student' }, { key: 'present', label: 'Present' },
    { key: 'late', label: 'Late' }, { key: 'absent', label: 'Absent' }, { key: 'leave', label: 'Leave' }, { key: 'total', label: 'Total' },
    { key: 'percentage', label: 'Attendance %', render: (r) => <Badge type={r.percentage >= 75 ? 'success' : 'danger'}>{r.percentage}%</Badge> },
  ];
  return (
    <Card>
      <div className="toolbar">
        <select className="filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>{classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {data?.items.length > 0 && <Button variant="outline" icon={Download} onClick={() => exportCsv('attendance-report.csv', data.items, cols.map(({ key, label }) => ({ key, label })))}>Export CSV</Button>}
      </div>
      {!data ? <Loader /> : <Table columns={cols} rows={data.items.map((r) => ({ ...r, id: r.student }))} />}
    </Card>
  );
}

function FeeReport() {
  const { d, error } = useReport('/reports/fees');
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;
  const cols = [
    { key: 'admissionNo', label: 'Admission No' }, { key: 'name', label: 'Student' }, { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'balance', label: 'Outstanding', render: (r) => <strong>{fmtMoney(r.balance)}</strong> },
  ];
  return (
    <>
      <div className="grid stats-grid">
        <StatCard label="Total Billed" value={fmtMoney(d.totals.billed)} icon={Wallet} color="blue" />
        <StatCard label="Collected" value={fmtMoney(d.totals.collected)} icon={CheckCircle2} color="green" />
        <StatCard label="Pending" value={fmtMoney(d.totals.pending)} icon={Clock4} color="orange" />
      </div>
      <div className="grid charts-grid">
        <Card title="Collection by Month">
          <div className="chart-box small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byMonth}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Pie2 title="Fee Records by Status" data={d.byStatus} />
      </div>
      <Card title="Defaulters (outstanding dues)" action={d.defaulters.length > 0 && <Button variant="outline" icon={Download} onClick={() => exportCsv('fee-defaulters.csv', d.defaulters, cols.map(({ key, label }) => ({ key, label })))}>Export CSV</Button>}>
        <Table columns={cols} rows={d.defaulters.map((r, i) => ({ ...r, id: i }))} emptyText="No outstanding dues" />
      </Card>
    </>
  );
}

function AcademicReport() {
  const { d, error } = useReport('/reports/academic');
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;
  return (
    <>
      <div className="grid stats-grid">
        <StatCard label="Overall Pass Rate" value={d.passRate === null ? '—' : `${d.passRate}%`} icon={Percent} color="green" trend={`${d.totalResults} results`} />
      </div>
      <div className="grid charts-grid">
        <Card title="Grade Distribution">
          <div className="chart-box small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.gradeDistribution}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="grade" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Average % per Exam (latest 10)">
          <div className="chart-box small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.examAverages}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip />
                <Bar dataKey="average" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const tabs = [
    { key: 'students', label: 'Students' }, { key: 'attendance', label: 'Attendance' },
    ...(user.role === 'admin' ? [{ key: 'fees', label: 'Fees' }] : []),
    { key: 'academic', label: 'Academic' },
  ];
  const [tab, setTab] = useState('students');
  return (
    <>
      <PageHeader title="Reports" subtitle="Student, attendance, fee and academic reports" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'students' && <StudentReport />}
      {tab === 'attendance' && <AttendanceReport />}
      {tab === 'fees' && <FeeReport />}
      {tab === 'academic' && <AcademicReport />}
    </>
  );
}
