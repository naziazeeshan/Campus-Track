import { useEffect, useState } from 'react';
import { Printer, Save } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Loader from '../components/ui/Loader.jsx';
import { fmtDate, cap } from '../utils/format.js';

const examFields = [
  { name: 'name', label: 'Exam Name', required: true, placeholder: 'e.g. Mid-term 2026' },
  { name: 'type', label: 'Type', type: 'select', default: 'midterm', options: ['midterm', 'final', 'quiz', 'assignment', 'other'].map((v) => ({ value: v, label: cap(v) })) },
  { name: 'classSection', label: 'Class', type: 'select', required: true, optionsFrom: { endpoint: '/classes' } },
  { name: 'subject', label: 'Subject', type: 'select', required: true, optionsFrom: { endpoint: '/subjects', label: (o) => `${o.name} (${o.code})` } },
  { name: 'date', label: 'Exam Date', type: 'date' },
  { name: 'totalMarks', label: 'Total Marks', type: 'number', min: 1, required: true, default: 100 },
  { name: 'passingMarks', label: 'Passing Marks', type: 'number', min: 0, default: 40 },
];

const examColumns = [
  { key: 'name', label: 'Exam' },
  { key: 'type', label: 'Type', render: (r) => <Badge type="info">{cap(r.type)}</Badge> },
  { key: 'classSection', label: 'Class', render: (r) => r.classSection?.name || '—' },
  { key: 'subject', label: 'Subject', render: (r) => r.subject?.name || '—' },
  { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
  { key: 'totalMarks', label: 'Total / Pass', render: (r) => `${r.totalMarks} / ${r.passingMarks}` },
];

function MarksModal({ exam, onClose }) {
  const notify = useToast();
  const [sheet, setSheet] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get(`/exams/${exam._id}/sheet`).then(setSheet).catch((e) => { notify(e.message, 'error'); onClose(); }); }, [exam._id]); // eslint-disable-line

  const setMarks = (id, v) => setSheet((s) => ({ ...s, rows: s.rows.map((r) => (r.student === id ? { ...r, marksObtained: v } : r)) }));
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.post(`/exams/${exam._id}/results`, { records: sheet.rows.map((x) => ({ student: x.student, marksObtained: x.marksObtained })) });
      notify(`Marks saved for ${r.saved} student(s)`);
      onClose();
    } catch (e) { notify(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Marks Entry - ${exam.name}`} onClose={onClose} wide>
      {!sheet ? <Loader /> : sheet.rows.length === 0 ? <p className="muted">No active students in this class.</p> : (
        <>
          <p className="muted">{exam.subject?.name} · {exam.classSection?.name} · Total marks: {exam.totalMarks}. Grades and GPA are calculated automatically.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Admission No</th><th>Student</th><th style={{ width: 150 }}>Marks</th><th>Grade</th></tr></thead>
              <tbody>
                {sheet.rows.map((r) => (
                  <tr key={r.student}>
                    <td>{r.admissionNo}</td><td>{r.name}</td>
                    <td><input type="number" className="mark-input" min={0} max={exam.totalMarks} value={r.marksObtained} onChange={(e) => setMarks(r.student, e.target.value)} /></td>
                    <td>{r.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button icon={Save} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ResultCard({ studentId }) {
  const [d, setD] = useState(null);
  const [inst, setInst] = useState({});
  const [error, setError] = useState('');
  useEffect(() => {
    setD(null); setError('');
    api.get(`/results/card/${studentId}`).then(setD).catch((e) => setError(e.message));
    api.get('/settings').then(setInst).catch(() => {});
  }, [studentId]);
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <Loader />;
  const s = d.summary;
  return (
    <Card>
      <div className="print-area result-card">
        <div className="center">
          <h2>{inst.institutionName || 'Campus Track'}</h2>
          <p className="muted">Result Card · {inst.academicYear || ''}</p>
        </div>
        <div className="detail-grid">
          <div><small>Student</small><p>{d.student.name}</p></div>
          <div><small>Admission No</small><p>{d.student.admissionNo}</p></div>
          <div><small>Course</small><p>{d.student.course?.name || '—'}</p></div>
          <div><small>Class</small><p>{d.student.classSection?.name || '—'}</p></div>
        </div>
        {d.results.length === 0 ? <p className="muted">No results available yet.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>%</th><th>Grade</th><th>Result</th></tr></thead>
              <tbody>
                {d.results.filter((r) => r.exam).map((r) => {
                  const pass = r.marksObtained >= r.exam.passingMarks;
                  return (
                    <tr key={r._id}>
                      <td>{r.exam.name}</td><td>{r.exam.subject?.name || '—'}</td>
                      <td>{r.marksObtained} / {r.exam.totalMarks}</td><td>{r.percentage}%</td><td><strong>{r.grade}</strong></td>
                      <td><Badge type={pass ? 'success' : 'danger'}>{pass ? 'Pass' : 'Fail'}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mini-stats">
          <div><strong>{s.gpa ?? '—'}</strong><small>GPA (4.0)</small></div>
          <div><strong>{s.averagePercentage === null ? '—' : `${s.averagePercentage}%`}</strong><small>Average</small></div>
          <div><strong>{s.passed}</strong><small>Passed</small></div>
          <div><strong>{s.failed}</strong><small>Failed</small></div>
        </div>
      </div>
      <div className="form-actions no-print"><Button icon={Printer} onClick={() => window.print()}>Print Result Card</Button></div>
    </Card>
  );
}

function StaffResultCards() {
  const [students, setStudents] = useState([]);
  const [id, setId] = useState('');
  useEffect(() => { api.get('/students', { limit: 500 }).then((d) => setStudents(d.items)); }, []);
  return (
    <>
      <Card>
        <select className="filter-select" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Select a student...</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.admissionNo} - {s.name}</option>)}
        </select>
      </Card>
      {id && <ResultCard studentId={id} />}
    </>
  );
}

function MyResults() {
  const [id, setId] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/students/me').then((s) => setId(s._id)).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert alert-info">{error}</div>;
  if (!id) return <Loader />;
  return <ResultCard studentId={id} />;
}

export default function Exams() {
  const { user } = useAuth();
  const [tab, setTab] = useState('exams');
  const [marksExam, setMarksExam] = useState(null);
  const staff = user.role !== 'student';

  return (
    <>
      <PageHeader title="Examinations & Results" subtitle="Exams, marks entry, grades, GPA and result cards" />
      {!staff ? <MyResults /> : (
        <>
          <Tabs tabs={[{ key: 'exams', label: 'Exams & Marks' }, { key: 'cards', label: 'Result Cards' }]} active={tab} onChange={setTab} />
          {tab === 'exams' ? (
            <ResourcePage
              embedded endpoint="/exams" noun="exam" addLabel="Add Exam" searchPlaceholder="Search exams..."
              columns={examColumns} fields={examFields}
              filters={[{ name: 'classSection', label: 'All classes', optionsFrom: { endpoint: '/classes' } }]}
              rowActions={[{ label: 'Enter Marks', onClick: (row) => setMarksExam(row) }]}
            />
          ) : <StaffResultCards />}
          {marksExam && <MarksModal exam={marksExam} onClose={() => setMarksExam(null)} />}
        </>
      )}
    </>
  );
}
