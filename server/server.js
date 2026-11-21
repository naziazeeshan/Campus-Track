import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import { departments, courses, classes, subjects } from './routes/academic.js';
import attendanceRoutes from './routes/attendance.js';
import { feeStructures, fees, payments } from './routes/fees.js';
import { exams, results } from './routes/exams.js';
import timetableRoutes from './routes/timetable.js';
import { announcements, messages, notifications } from './routes/comms.js';
import settingsRoutes from './routes/settings.js';
import reportRoutes from './routes/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));

// Brute-force protection on login/register
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/departments', departments);
app.use('/api/courses', courses);
app.use('/api/classes', classes);
app.use('/api/subjects', subjects);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fee-structures', feeStructures);
app.use('/api/fees', fees);
app.use('/api/payments', payments);
app.use('/api/exams', exams);
app.use('/api/results', results);
app.use('/api/timetable', timetableRoutes);
app.use('/api/announcements', announcements);
app.use('/api/messages', messages);
app.use('/api/notifications', notifications);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// Production: serve the built React app from the same server
const dist = path.resolve(__dirname, '../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) =>
    req.path.startsWith('/api') ? next() : res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
try {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}
