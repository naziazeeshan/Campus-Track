import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { protect, authorize } from '../middleware/auth.js';
import { crud } from '../utils/crud.js';
import { asyncHandler, httpError, oid, isDate } from '../utils/helpers.js';

const router = Router();
router.use(protect);

const STATUSES = ['present', 'absent', 'late', 'leave'];
const scope = (req) => (req.user.role === 'student' ? { student: req.studentId || null } : {});

// Attendance sheet of a class for a date (existing marks merged with class roster)
router.get('/sheet', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
  const classSection = oid(req.query.classSection, 'class');
  const { date } = req.query;
  if (!isDate(date)) throw httpError(400, 'Valid date (YYYY-MM-DD) is required');
  const students = await Student.find({ classSection, status: 'active' }).sort('name').select('name admissionNo');
  const existing = await Attendance.find({ classSection, date });
  const map = new Map(existing.map((a) => [String(a.student), a]));
  res.json(students.map((s) => {
    const a = map.get(String(s._id));
    return {
      student: s._id, name: s.name, admissionNo: s.admissionNo,
      status: a ? a.status : 'present', remarks: a?.remarks || '', marked: !!a,
    };
  }));
}));

// Save a whole class sheet at once
router.post('/bulk', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
  const classSection = oid(req.body.classSection, 'class');
  const { date, records } = req.body;
  if (!isDate(date)) throw httpError(400, 'Valid date (YYYY-MM-DD) is required');
  if (!Array.isArray(records) || !records.length) throw httpError(400, 'No attendance records provided');
  const ids = records.map((r) => oid(r.student, 'student'));
  const inClass = await Student.countDocuments({ _id: { $in: ids }, classSection });
  if (inClass !== ids.length) throw httpError(400, 'Some students do not belong to this class');
  const ops = records.map((r, i) => {
    if (!STATUSES.includes(r.status)) throw httpError(400, `Invalid status: ${r.status}`);
    return {
      updateOne: {
        filter: { student: ids[i], date },
        update: { $set: { student: ids[i], classSection, date, status: r.status, remarks: String(r.remarks || ''), markedBy: req.user._id } },
        upsert: true,
      },
    };
  });
  await Attendance.bulkWrite(ops);
  res.json({ saved: ops.length });
}));

// Per-student attendance percentage (students automatically see only their own)
router.get('/summary', asyncHandler(async (req, res) => {
  const { classSection, student, from, to } = req.query;
  const match = {};
  if (req.user.role === 'student') match.student = req.studentId || null;
  else if (student) match.student = oid(student, 'student');
  if (classSection) match.classSection = oid(classSection, 'class');
  const range = {};
  if (isDate(from)) range.$gte = from;
  if (isDate(to)) range.$lte = to;
  if (Object.keys(range).length) match.date = range;

  const cnt = (s) => ({ $sum: { $cond: [{ $eq: ['$status', s] }, 1, 0] } });
  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$student', total: { $sum: 1 }, present: cnt('present'), late: cnt('late'), absent: cnt('absent'), leave: cnt('leave') } },
    { $lookup: { from: Student.collection.name, localField: '_id', foreignField: '_id', as: 's' } },
    { $unwind: '$s' },
    { $project: { _id: 0, student: '$_id', name: '$s.name', admissionNo: '$s.admissionNo', total: 1, present: 1, late: 1, absent: 1, leave: 1 } },
    { $sort: { name: 1 } },
  ]);
  const items = rows.map((r) => ({
    ...r,
    percentage: r.total ? Math.round(((r.present + r.late) / r.total) * 1000) / 10 : 0,
  }));
  const total = items.reduce((a, r) => a + r.total, 0);
  const ok = items.reduce((a, r) => a + r.present + r.late, 0);
  res.json({ items, overall: { total, percentage: total ? Math.round((ok / total) * 1000) / 10 : null } });
}));

// History list (date desc). Students see only their own records.
const c = crud(Attendance, {
  populate: [{ path: 'student', select: 'name admissionNo' }, { path: 'classSection', select: 'name' }],
  scope,
  sort: '-date',
});
router.get('/', c.list);

export default router;
