import { useEffect, useState } from 'react';
import ResourcePage from '../components/ResourcePage.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const sel = (endpoint, label) => ({ endpoint, label });

const configs = {
  departments: {
    endpoint: '/departments', noun: 'department', addLabel: 'Add Department', searchPlaceholder: 'Search departments...',
    columns: [
      { key: 'name', label: 'Department' }, { key: 'code', label: 'Code', render: (r) => r.code || '—' },
      { key: 'head', label: 'Head', render: (r) => r.head?.name || '—' },
      { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    ],
    fields: [
      { name: 'name', label: 'Department Name', required: true }, { name: 'code', label: 'Code' },
      { name: 'head', label: 'Head of Department', type: 'select', optionsFrom: sel('/teachers') },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },
  courses: {
    endpoint: '/courses', noun: 'course', addLabel: 'Add Course', searchPlaceholder: 'Search courses...',
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Course' },
      { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
      { key: 'durationSemesters', label: 'Semesters' },
    ],
    fields: [
      { name: 'name', label: 'Course Name', required: true }, { name: 'code', label: 'Course Code', required: true },
      { name: 'department', label: 'Department', type: 'select', optionsFrom: sel('/departments') },
      { name: 'durationSemesters', label: 'Duration (semesters)', type: 'number', min: 1, default: 8 },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
    ],
    filters: [{ name: 'department', label: 'All departments', optionsFrom: sel('/departments') }],
  },
  classes: {
    endpoint: '/classes', noun: 'class', addLabel: 'Add Class', searchPlaceholder: 'Search classes...',
    columns: [
      { key: 'name', label: 'Class' }, { key: 'course', label: 'Course', render: (r) => r.course?.name || '—' },
      { key: 'semester', label: 'Sem', render: (r) => r.semester || '—' }, { key: 'section', label: 'Section', render: (r) => r.section || '—' },
      { key: 'classTeacher', label: 'Class Teacher', render: (r) => r.classTeacher?.name || '—' },
      { key: 'room', label: 'Room', render: (r) => r.room || '—' }, { key: 'capacity', label: 'Capacity' },
    ],
    fields: [
      { name: 'name', label: 'Class Name (e.g. BSCS-3A)', required: true },
      { name: 'course', label: 'Course', type: 'select', optionsFrom: sel('/courses', (o) => `${o.name} (${o.code})`) },
      { name: 'semester', label: 'Semester', type: 'number', min: 1 }, { name: 'section', label: 'Section' },
      { name: 'classTeacher', label: 'Class Teacher', type: 'select', optionsFrom: sel('/teachers') },
      { name: 'room', label: 'Room' }, { name: 'capacity', label: 'Capacity', type: 'number', min: 1, default: 50 },
    ],
    filters: [{ name: 'course', label: 'All courses', optionsFrom: sel('/courses') }],
  },
  subjects: {
    endpoint: '/subjects', noun: 'subject', addLabel: 'Add Subject', searchPlaceholder: 'Search subjects...',
    columns: [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Subject' },
      { key: 'course', label: 'Course', render: (r) => r.course?.name || '—' },
      { key: 'semester', label: 'Sem', render: (r) => r.semester || '—' }, { key: 'creditHours', label: 'Credits' },
      { key: 'teacher', label: 'Teacher', render: (r) => r.teacher?.name || '—' },
    ],
    fields: [
      { name: 'name', label: 'Subject Name', required: true }, { name: 'code', label: 'Subject Code', required: true },
      { name: 'course', label: 'Course', type: 'select', optionsFrom: sel('/courses', (o) => `${o.name} (${o.code})`) },
      { name: 'semester', label: 'Semester', type: 'number', min: 1 },
      { name: 'creditHours', label: 'Credit Hours', type: 'number', min: 1, default: 3 },
      { name: 'teacher', label: 'Assigned Teacher', type: 'select', optionsFrom: sel('/teachers') },
    ],
    filters: [{ name: 'course', label: 'All courses', optionsFrom: sel('/courses') }],
  },
};

// Student enrollment: put students into classes (capacity is enforced by the server)
function Enrollment() {
  const notify = useToast();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [enrolled, setEnrolled] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/classes', { limit: 500 }).then((d) => setClasses(d.items)); }, []);

  const cls = classes.find((c) => c._id === classId);

  const load = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const [inClass, others] = await Promise.all([
        api.get('/students', { classSection: classId, limit: 500 }),
        api.get('/students', { course: cls?.course?._id, limit: 500 }),
      ]);
      setEnrolled(inClass.items);
      setAvailable(others.items.filter((s) => !s.classSection));
    } catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [classId]); // eslint-disable-line

  const change = async (student, value) => {
    try {
      await api.put(`/students/${student._id}`, { classSection: value });
      notify(value ? 'Student enrolled' : 'Student removed from class');
      load();
    } catch (e) { notify(e.message, 'error'); }
  };

  return (
    <Card>
      <div className="toolbar">
        <select className="filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select a class...</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {cls && <span className="muted">Seats: {enrolled.length} / {cls.capacity}</span>}
      </div>
      {!classId ? <p className="muted">Choose a class to manage its enrolled students.</p> : loading ? <Loader /> : (
        <div className="two-col">
          <div>
            <h4>Enrolled ({enrolled.length})</h4>
            {enrolled.length === 0 ? <p className="muted">No students enrolled.</p> : (
              <ul className="activity-list">
                {enrolled.map((s) => (
                  <li key={s._id} className="row-between">
                    <span>{s.name} <small className="muted">{s.admissionNo}</small></span>
                    <Button variant="outline" className="btn-sm" onClick={() => change(s, '')}>Remove</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4>Unassigned students of this course ({available.length})</h4>
            {available.length === 0 ? <p className="muted">No unassigned students.</p> : (
              <ul className="activity-list">
                {available.map((s) => (
                  <li key={s._id} className="row-between">
                    <span>{s.name} <small className="muted">{s.admissionNo}</small></span>
                    <Button className="btn-sm" onClick={() => change(s, classId)}>Enroll</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Academics() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const tabs = [
    { key: 'departments', label: 'Departments' }, { key: 'courses', label: 'Courses' },
    { key: 'classes', label: 'Classes & Sections' }, { key: 'subjects', label: 'Subjects' },
    ...(isAdmin ? [{ key: 'enrollment', label: 'Enrollment' }] : []),
  ];
  const [tab, setTab] = useState('departments');

  return (
    <>
      <PageHeader title="Courses, Classes & Subjects" subtitle="Academic structure of the campus" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'enrollment' ? <Enrollment /> : (
        <ResourcePage key={tab} embedded {...configs[tab]} canCreate={isAdmin} canEdit={isAdmin} canDelete={isAdmin} />
      )}
    </>
  );
}
