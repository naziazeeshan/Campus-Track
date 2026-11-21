import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Academics from './pages/Academics.jsx';
import Attendance from './pages/Attendance.jsx';
import Fees from './pages/Fees.jsx';
import Exams from './pages/Exams.jsx';
import Timetable from './pages/Timetable.jsx';
import Announcements from './pages/Announcements.jsx';
import Messages from './pages/Messages.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

const STAFF = ['admin', 'teacher'];
const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={guard(STAFF, <Students />)} />
        <Route path="/teachers" element={guard(STAFF, <Teachers />)} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/fees" element={guard(['admin', 'student'], <Fees />)} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/reports" element={guard(STAFF, <Reports />)} />
        <Route path="/users" element={guard(['admin'], <Users />)} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
