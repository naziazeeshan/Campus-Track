import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fields = [
  { name: 'classSection', label: 'Class', type: 'select', required: true, optionsFrom: { endpoint: '/classes' } },
  { name: 'subject', label: 'Subject', type: 'select', required: true, optionsFrom: { endpoint: '/subjects', label: (o) => `${o.name} (${o.code})` } },
  { name: 'teacher', label: 'Teacher (defaults to subject teacher)', type: 'select', optionsFrom: { endpoint: '/teachers' } },
  { name: 'day', label: 'Day', type: 'select', required: true, options: DAYS.map((d) => ({ value: d, label: d })) },
  { name: 'startTime', label: 'Start Time', type: 'time', required: true },
  { name: 'endTime', label: 'End Time', type: 'time', required: true },
  { name: 'room', label: 'Room' },
];

const columns = [
  { key: 'day', label: 'Day' },
  { key: 'time', label: 'Time', render: (r) => `${r.startTime} - ${r.endTime}` },
  { key: 'classSection', label: 'Class', render: (r) => r.classSection?.name || '—' },
  { key: 'subject', label: 'Subject', render: (r) => r.subject?.name || '—' },
  { key: 'teacher', label: 'Teacher', render: (r) => r.teacher?.name || '—' },
  { key: 'room', label: 'Room', render: (r) => r.room || '—' },
];

function WeeklyGrid() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [mode, setMode] = useState(user.role === 'teacher' ? 'teacher' : 'class');
  const [value, setValue] = useState('');
  const [slots, setSlots] = useState(null);
  const [note, setNote] = useState('');

  // Pre-select: student -> own class, teacher -> own teacher record
  useEffect(() => {
    api.get('/classes', { limit: 500 }).then((d) => setClasses(d.items)).catch(() => {});
    if (user.role !== 'student') api.get('/teachers', { limit: 500 }).then((d) => setTeachers(d.items)).catch(() => {});
    if (user.role === 'student') {
      api.get('/students/me').then((s) => (s.classSection ? setValue(s.classSection._id) : setNote('You are not enrolled in a class yet.'))).catch((e) => setNote(e.message));
    }
    if (user.role === 'teacher') {
      api.get('/teachers/me').then((t) => setValue(t._id)).catch((e) => setNote(e.message));
    }
  }, [user.role]);

  useEffect(() => {
    if (!value) { setSlots(null); return; }
    setSlots(undefined);
    api.get('/timetable', { [mode === 'class' ? 'classSection' : 'teacher']: value, limit: 500 })
      .then((d) => setSlots(d.items)).catch(() => setSlots([]));
  }, [mode, value]);

  const canPick = user.role !== 'student';
  const options = mode === 'class' ? classes : teachers;

  return (
    <Card>
      {canPick && (
        <div className="toolbar">
          <div className="toolbar-left">
            <select className="filter-select" value={mode} onChange={(e) => { setMode(e.target.value); setValue(''); }}>
              <option value="class">By class</option>
              <option value="teacher">By teacher</option>
            </select>
            <select className="filter-select" value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Select {mode}...</option>
              {options.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      )}
      {note && <p className="muted">{note}</p>}
      {!value && !note && <p className="muted">Select a {mode} to view its weekly timetable.</p>}
      {slots === undefined && <Loader />}
      {slots && (
        <div className="tt-grid">
          {DAYS.map((day) => {
            const list = slots.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={day} className="tt-col">
                <div className="tt-day">{day}</div>
                {list.length === 0 ? <div className="tt-empty">—</div> : list.map((s) => (
                  <div key={s._id} className="tt-slot">
                    <strong>{s.startTime} - {s.endTime}</strong>
                    <span>{s.subject?.name}</span>
                    <small>{mode === 'class' ? (s.teacher?.name || 'No teacher') : s.classSection?.name}{s.room ? ` · ${s.room}` : ''}</small>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('view');
  return (
    <>
      <PageHeader title="Timetable" subtitle="Class schedules, teacher timetables and room allocation" />
      {isAdmin && <Tabs tabs={[{ key: 'view', label: 'Weekly View' }, { key: 'manage', label: 'Manage Slots' }]} active={tab} onChange={setTab} />}
      {tab === 'view' || !isAdmin ? <WeeklyGrid /> : (
        <ResourcePage
          embedded endpoint="/timetable" noun="slot" addLabel="Add Slot" searchable={false}
          columns={columns} fields={fields}
          filters={[
            { name: 'classSection', label: 'All classes', optionsFrom: { endpoint: '/classes' } },
            { name: 'day', label: 'All days', options: DAYS.map((d) => ({ value: d, label: d })) },
          ]}
        />
      )}
    </>
  );
}
