import { useEffect, useState } from 'react';
import ResourcePage from '../components/ResourcePage.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';
import Loader from '../components/ui/Loader.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fmtDate, fmtMoney, cap } from '../utils/format.js';

const statusType = { active: 'success', inactive: 'danger', graduated: 'info' };

const fields = [
  { name: 'admissionNo', label: 'Admission No', placeholder: 'Auto-generated if empty' },
  { name: 'name', label: 'Full Name', required: true },
  { name: 'fatherName', label: "Father's Name" },
  { name: 'email', label: 'Email (used for student login)', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'].map((v) => ({ value: v, label: v })) },
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  { name: 'admissionDate', label: 'Admission Date', type: 'date' },
  { name: 'course', label: 'Course', type: 'select', optionsFrom: { endpoint: '/courses', label: (o) => `${o.name} (${o.code})` } },
  { name: 'classSection', label: 'Class / Section', type: 'select', optionsFrom: { endpoint: '/classes' } },
  { name: 'status', label: 'Status', type: 'select', default: 'active', options: ['active', 'inactive', 'graduated'].map((v) => ({ value: v, label: cap(v) })) },
  { name: 'address', label: 'Address', type: 'textarea', full: true },
];

const columns = [
  { key: 'admissionNo', label: 'Admission No' },
  { key: 'name', label: 'Name', render: (r) => <div><strong>{r.name}</strong><div className="muted small">{r.email || ''}</div></div> },
  { key: 'course', label: 'Course', render: (r) => r.course?.name || '—' },
  { key: 'classSection', label: 'Class', render: (r) => r.classSection?.name || '—' },
  { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
  { key: 'status', label: 'Status', render: (r) => <Badge type={statusType[r.status]}>{cap(r.status)}</Badge> },
];

const filters = [
  { name: 'course', label: 'All courses', optionsFrom: { endpoint: '/courses' } },
  { name: 'classSection', label: 'All classes', optionsFrom: { endpoint: '/classes' } },
  { name: 'status', label: 'All statuses', options: ['active', 'inactive', 'graduated'].map((v) => ({ value: v, label: cap(v) })) },
];

function ProfileModal({ id, onClose, isAdmin }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/students/${id}/profile`).then(setP).catch((e) => setError(e.message)); }, [id]);

  return (
    <Modal title="Student Profile" onClose={onClose} wide>
      {error && <div className="alert alert-error">{error}</div>}
      {!p && !error && <Loader />}
      {p && (
        <>
          <div className="profile-head">
            <div className="avatar big">{p.student.name.charAt(0)}</div>
            <div>
              <h2>{p.student.name}</h2>
              <p className="muted">{p.student.admissionNo} · {p.student.course?.name || 'No course'} · {p.student.classSection?.name || 'No class'}</p>
            </div>
          </div>
          <div className="detail-grid">
            <div><small>Father's Name</small><p>{p.student.fatherName || '—'}</p></div>
            <div><small>Email</small><p>{p.student.email || '—'}</p></div>
            <div><small>Phone</small><p>{p.student.phone || '—'}</p></div>
            <div><small>Gender</small><p>{p.student.gender || '—'}</p></div>
            <div><small>Date of Birth</small><p>{fmtDate(p.student.dob)}</p></div>
            <div><small>Admission Date</small><p>{fmtDate(p.student.admissionDate)}</p></div>
            <div className="span-2"><small>Address</small><p>{p.student.address || '—'}</p></div>
          </div>
          <div className="mini-stats">
            <div><strong>{p.attendance.percentage === null ? '—' : `${p.attendance.percentage}%`}</strong><small>Attendance</small></div>
            <div><strong>{p.academic.gpa ?? '—'}</strong><small>GPA</small></div>
            <div><strong>{p.academic.averagePercentage === null ? '—' : `${p.academic.averagePercentage}%`}</strong><small>Avg. marks</small></div>
            {isAdmin && p.fees && <div><strong>{fmtMoney(p.fees.balance)}</strong><small>Fee balance</small></div>}
          </div>
        </>
      )}
    </Modal>
  );
}

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [profileId, setProfileId] = useState(null);

  return (
    <>
      <ResourcePage
        title="Students"
        subtitle="Student registration, profiles and records"
        endpoint="/students"
        noun="student"
        addLabel="Add Student"
        searchPlaceholder="Search name, admission no, phone..."
        columns={columns}
        fields={fields}
        filters={filters}
        canCreate={isAdmin}
        canEdit={isAdmin}
        canDelete={isAdmin}
        rowActions={[{ label: 'Profile', onClick: (row) => setProfileId(row._id) }]}
      />
      {profileId && <ProfileModal id={profileId} isAdmin={isAdmin} onClose={() => setProfileId(null)} />}
    </>
  );
}
