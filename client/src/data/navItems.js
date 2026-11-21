import {
  LayoutDashboard, GraduationCap, Users, BookOpen, CalendarCheck, Wallet, FileText,
  Clock, Megaphone, MessageSquare, BarChart3, UserCog, Settings,
} from 'lucide-react';

const ALL = ['admin', 'teacher', 'student'];

export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { path: '/students', label: 'Students', icon: GraduationCap, roles: ['admin', 'teacher'] },
  { path: '/teachers', label: 'Teachers & Staff', icon: Users, roles: ['admin', 'teacher'] },
  { path: '/academics', label: 'Courses & Classes', icon: BookOpen, roles: ALL },
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL },
  { path: '/fees', label: 'Fees & Payments', icon: Wallet, roles: ['admin', 'student'] },
  { path: '/exams', label: 'Exams & Results', icon: FileText, roles: ALL },
  { path: '/timetable', label: 'Timetable', icon: Clock, roles: ALL },
  { path: '/announcements', label: 'Announcements', icon: Megaphone, roles: ALL },
  { path: '/messages', label: 'Messages', icon: MessageSquare, roles: ALL },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'teacher'] },
  { path: '/users', label: 'User Management', icon: UserCog, roles: ['admin'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ALL },
];
