import { Router } from 'express';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import { Course, ClassSection } from '../models/Academic.js';
import Attendance from '../models/Attendance.js';
import { FeeRecord, Payment } from '../models/Finance.js';
import { Exam, Result } from '../models/Exam.js';
import { Announcement } from '../models/Comms.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler, ymd } from '../utils/helpers.js';
import { studentSnapshot } from '../utils/snapshot.js';

const router = Router();
router.use(protect);

const lastMonths = (n) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'short' }), start: d };
  });
};

const paymentsByMonth = async (months) => {
  const rows = await Payment.aggregate([
    { $match: { paidOn: { $gte: months[0].start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidOn' } }, total: { $sum: '$amount' } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.total]));
  return months.map((m) => ({ month: m.label, collected: map.get(m.key) || 0 }));
};

// ---- Dashboard (admin + teacher) ----
router.get('/dashboard', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
  const dayKeys = days.map(ymd);

  const [students, teachers, staff, courses, classes, attRows, announcements] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Teacher.countDocuments({ category: 'teacher', status: 'active' }),
    Teacher.countDocuments({ category: 'staff', status: 'active' }),
    Course.countDocuments(),
    ClassSection.countDocuments(),
    Attendance.aggregate([
      { $match: { date: { $in: dayKeys } } },
      { $group: { _id: '$date', total: { $sum: 1 }, ok: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    ]),
    Announcement.find(req.user.role === 'teacher' ? { audience: { $in: ['all', 'teachers'] } } : {}).sort('-createdAt').limit(3).populate('createdBy', 'name'),
  ]);

  const attMap = new Map(attRows.map((r) => [r._id, r]));
  const attendance = days.map((d, i) => {
    const r = attMap.get(dayKeys[i]);
    return { day: d.toLocaleString('en', { weekday: 'short' }), rate: r && r.total ? Math.round((r.ok / r.total) * 1000) / 10 : 0 };
  });
  const recentStudents = await Student.find().sort('-createdAt').limit(5).select('name admissionNo createdAt');

  const out = { counts: { students, teachers, staff, courses, classes }, attendance, recentStudents, announcements };

  if (isAdmin) {
    const months = lastMonths(6);
    const [tot] = await FeeRecord.aggregate([
      { $group: { _id: null, billed: { $sum: { $subtract: ['$amount', '$discount'] } }, collected: { $sum: '$amountPaid' } } },
    ]);
    out.fees = { billed: tot?.billed || 0, collected: tot?.collected || 0, pending: Math.max(0, (tot?.billed || 0) - (tot?.collected || 0)) };
    out.feesByMonth = await paymentsByMonth(months);
    out.recentPayments = await Payment.find().sort('-paidOn').limit(5).populate('student', 'name').select('amount paidOn receiptNo student');
  }
  res.json(out);
}));

// ---- Student dashboard ----
router.get('/my-summary', authorize('student'), asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ audience: { $in: ['all', 'students'] } }).sort('-createdAt').limit(3).populate('createdBy', 'name');
  if (!req.studentId) return res.json({ linked: false, announcements });
  res.json({ linked: true, ...(await studentSnapshot(req.studentId, true)), announcements });
}));

// ---- Student report ----
router.get('/students', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
  const countBy = async (field, lookupModel) => {
    const stages = [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];
    if (lookupModel) {
      stages.push(
        { $lookup: { from: lookupModel.collection.name, localField: '_id', foreignField: '_id', as: 'x' } },
        { $project: { _id: 0, name: { $ifNull: [{ $arrayElemAt: ['$x.name', 0] }, 'Unassigned'] }, count: 1 } }
      );
    } else {
      stages.push({ $project: { _id: 0, name: { $ifNull: ['$_id', 'Unspecified'] }, count: 1 } });
    }
    return Student.aggregate(stages);
  };
  const [byCourse, byStatus, byGender, byClass] = await Promise.all([
    countBy('course', Course), countBy('status'), countBy('gender'), countBy('classSection', ClassSection),
  ]);
  res.json({ byCourse, byStatus, byGender, byClass, total: await Student.countDocuments() });
}));

// ---- Fee report ----
router.get('/fees', authorize('admin'), asyncHandler(async (req, res) => {
  const [tot] = await FeeRecord.aggregate([
    { $group: { _id: null, billed: { $sum: { $subtract: ['$amount', '$discount'] } }, collected: { $sum: '$amountPaid' } } },
  ]);
  const billed = tot?.billed || 0;
  const collected = tot?.collected || 0;
  const byStatus = await FeeRecord.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
  ]);
  const defaulters = await FeeRecord.aggregate([
    { $match: { status: { $ne: 'paid' } } },
    { $group: { _id: '$student', balance: { $sum: { $subtract: [{ $subtract: ['$amount', '$discount'] }, '$amountPaid'] } } } },
    { $match: { balance: { $gt: 0 } } },
    { $lookup: { from: Student.collection.name, localField: '_id', foreignField: '_id', as: 's' } },
    { $unwind: '$s' },
    { $project: { _id: 0, name: '$s.name', admissionNo: '$s.admissionNo', phone: '$s.phone', balance: 1 } },
    { $sort: { balance: -1 } },
    { $limit: 50 },
  ]);
  res.json({
    totals: { billed, collected, pending: Math.max(0, billed - collected) },
    byStatus, byMonth: await paymentsByMonth(lastMonths(6)), defaulters,
  });
}));

// ---- Academic report ----
router.get('/academic', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
  const lookupExam = [
    { $lookup: { from: Exam.collection.name, localField: 'exam', foreignField: '_id', as: 'e' } },
    { $unwind: '$e' },
  ];
  const passed = { $sum: { $cond: [{ $gte: ['$marksObtained', '$e.passingMarks'] }, 1, 0] } };
  const [gradeDistribution, examRows, overall] = await Promise.all([
    Result.aggregate([{ $group: { _id: '$grade', count: { $sum: 1 } } }, { $project: { _id: 0, grade: '$_id', count: 1 } }, { $sort: { grade: 1 } }]),
    Result.aggregate([
      ...lookupExam,
      { $group: { _id: '$exam', name: { $first: '$e.name' }, date: { $first: '$e.date' }, avg: { $avg: '$percentage' }, count: { $sum: 1 }, passed } },
      { $sort: { date: -1 } }, { $limit: 10 },
    ]),
    Result.aggregate([...lookupExam, { $group: { _id: null, total: { $sum: 1 }, passed } }]),
  ]);
  res.json({
    gradeDistribution,
    examAverages: examRows.map((r) => ({ name: r.name, average: Math.round(r.avg * 10) / 10, count: r.count, passed: r.passed })),
    passRate: overall[0]?.total ? Math.round((overall[0].passed / overall[0].total) * 1000) / 10 : null,
    totalResults: overall[0]?.total || 0,
  });
}));

export default router;
