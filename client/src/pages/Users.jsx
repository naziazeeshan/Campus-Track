import ResourcePage from '../components/ResourcePage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate, cap } from '../utils/format.js';

const roleType = { admin: 'danger', teacher: 'info', student: 'success' };

const fields = [
  { name: 'name', label: 'Full Name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'role', label: 'Role', type: 'select', required: true, default: 'teacher', options: ['admin', 'teacher', 'student'].map((v) => ({ value: v, label: cap(v) })) },
  { name: 'isActive', label: 'Account Status', type: 'select', required: true, default: 'true', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }] },
  { name: 'password', label: 'Password (leave empty to keep current)', type: 'password', requiredOnCreate: true, full: true },
];

export default function Users() {
  const { user } = useAuth();
  const columns = [
    { key: 'name', label: 'Name', render: (r) => <strong>{r.name}{r._id === user._id ? ' (you)' : ''}</strong> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => <Badge type={roleType[r.role]}>{cap(r.role)}</Badge> },
    { key: 'isActive', label: 'Status', render: (r) => <Badge type={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Deactivated'}</Badge> },
    { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
  ];
  return (
    <ResourcePage
      title="User Management" subtitle="Create and manage login accounts (Admin / Teacher / Student)"
      endpoint="/users" noun="user" addLabel="Add User" searchPlaceholder="Search name or email..."
      columns={columns} fields={fields}
      filters={[{ name: 'role', label: 'All roles', options: ['admin', 'teacher', 'student'].map((v) => ({ value: v, label: cap(v) })) }]}
    />
  );
}
