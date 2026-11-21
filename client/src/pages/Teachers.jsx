import { useEffect, useState } from 'react';
import ResourcePage from '../components/ResourcePage.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';
import Loader from '../components/ui/Loader.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate, cap } from '../utils/format.js';

const fields = [
  { name: 'employeeId', label: 'Employee ID', placeholder: 'Auto-generated if empty' },
  { name: 'name', label: 'Full Name', required: true },
  { name: 'category', label: 'Category', type: 'select', default: 'teacher', options: [{ value: 'teacher', label: 'Teacher' }, { value: 'staff', label: 'Staff' }] },
  { name: 'email', label: 'Email (used to link login)', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'].map((v) => ({ value: v, label: v })) },
  { name: 'department', label: 'Department', type: 'select', optionsFrom: { endpoint: '/departments' } },
  { name: 'designation', label: 'Designation', placeholder: 'e.g. Lecturer, Accountant' },
  { name: 'qualification', label: 'Qualification' },
  { name: 'joiningDate', label: 'Joining Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', default: 'active', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
];

const columns = [
  { key: 'employeeId', label: 'Emp. ID' },
  { key: 'name', label: 'Name', render: (r) => <div><strong>{r.name}</strong><div className="muted small">{r.email || ''}</div></div> },
  { key: 'category', label: 'Category', render: (r) => <Badge type={r.category === 'teacher' ? 'info' : 'warning'}>{cap(r.category)}</Badge> },
  { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
  { key: 'designation', label: 'Designation', render: (r) => r.designation || '—' },
  { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
  { key: 'status', label: 'Status', render: (r) => <Badge type={r.status === 'active' ? 'success' : 'danger'}>{cap(r.status)}</Badge> },
];

const filters = [
  { name: 'category', label: 'Teachers & staff', options: [{ value: 'teacher', label: 'Teachers' }, { value: 'staff', label: 'Staff' }] },
  { name: 'department', label: 'All departments', optionsFrom: { endpoint: '/departments' } },
];

function AssignmentsModal({ teacher, onClose }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/teachers/${teacher._id}/assignments`).then(setD).catch((e) => setError(e.message)); }, [teacher._id]);
  return (
    <Modal title={`Assignments - ${teacher.name}`} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      {!d && !error && <Loader />}
      {d && (
        <>
          <h4>Subjects taught</h4>
          {d.subjects.length === 0 ? <p className="muted">No subjects assigned.</p> : (
            <ul className="activity-list">{d.subjects.map((s) => <li key={s._id}>{s.name} <small className="muted">({s.code}) · {s.course?.name || ''}</small></li>)}</ul>
          )}
          <h4 style={{ marginTop: '1rem' }}>Class teacher of</h4>
          {d.classes.length === 0 ? <p className="muted">Not a class teacher.</p> : (
            <ul className="activity-list">{d.classes.map((c) => <li key={c._id}>{c.name} <small className="muted">{c.course?.name || ''}</small></li>)}</ul>
          )}
          {teacher.joiningDate && <p className="muted small" style={{ marginTop: '1rem' }}>Joined: {fmtDate(teacher.joiningDate)}</p>}
        </>
      )}
    </Modal>
  );
}

export default function Teachers() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [selected, setSelected] = useState(null);
  return (
    <>
      <ResourcePage
        title="Teachers & Staff"
        subtitle="Profiles, departments, designations and assignments"
        endpoint="/teachers"
        noun="record"
        addLabel="Add Teacher / Staff"
        searchPlaceholder="Search name, ID, designation..."
        columns={columns}
        fields={fields}
        filters={filters}
        canCreate={isAdmin}
        canEdit={isAdmin}
        canDelete={isAdmin}
        rowActions={[{ label: 'Assignments', show: (r) => r.category === 'teacher', onClick: (row) => setSelected(row) }]}
      />
      {selected && <AssignmentsModal teacher={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
