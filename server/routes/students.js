import Student from '../models/Student.js';
import { ClassSection } from '../models/Academic.js';
import Attendance from '../models/Attendance.js';
import { FeeRecord, Payment } from '../models/Finance.js';
import { Result } from '../models/Exam.js';
import { crud, mountCrud } from '../utils/crud.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, httpError, oid } from '../utils/helpers.js';
import { studentSnapshot } from '../utils/snapshot.js';

async function nextAdmissionNo() {
  const prefix = `CT-${new Date().getFullYear()}-`;
  const last = await Student.findOne({ admissionNo: new RegExp(`^${prefix}`) }).sort('-admissionNo');
  const n = last ? parseInt(last.admissionNo.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(n).padStart(4, '0');
}

const populate = [
  { path: 'course', select: 'name code' },
  { path: 'classSection', select: 'name' },
];

const c = crud(Student, {
  populate,
  searchFields: ['name', 'admissionNo', 'email', 'phone', 'fatherName'],
  sort: 'admissionNo',
  validate: async (req, body, doc) => {
    if (body.email) body.email = String(body.email).toLowerCase();
    // Enrollment rules: class must exist and have free seats
    if (body.classSection && (!doc || String(doc.classSection) !== String(body.classSection))) {
      const cls = await ClassSection.findById(body.classSection);
      if (!cls) throw httpError(400, 'Selected class does not exist');
      const count = await Student.countDocuments({ classSection: cls._id });
      if (cls.capacity && count >= cls.capacity) throw httpError(400, `Class ${cls.name} is full (${cls.capacity} seats)`);
      if (!body.course && !(doc && doc.course)) body.course = cls.course;
    }
  },
  beforeCreate: async (req, body) => {
    if (!body.admissionNo) body.admissionNo = await nextAdmissionNo();
    return body;
  },
  beforeDelete: async (req, doc) => {
    const payments = await Payment.countDocuments({ student: doc._id });
    if (payments > 0) throw httpError(409, 'This student has payment records. Mark the student as inactive instead of deleting.');
  },
  afterDelete: async (req, doc) => {
    await Promise.all([
      Attendance.deleteMany({ student: doc._id }),
      FeeRecord.deleteMany({ student: doc._id }),
      Result.deleteMany({ student: doc._id }),
    ]);
  },
});

export default mountCrud(c, {
  read: ['admin', 'teacher'],
  write: ['admin'],
  extra: (router) => {
    // Logged-in student's own record
    router.get('/me', authorize('student'), asyncHandler(async (req, res) => {
      if (!req.studentId) throw httpError(404, 'No student record is linked to your account yet. Please contact the administrator.');
      res.json(await Student.findById(req.studentId).populate(populate));
    }));

    // Full student profile with attendance / fees / academic summary
    router.get('/:id/profile', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
      const sid = oid(req.params.id, 'student');
      const student = await Student.findById(sid).populate(populate);
      if (!student) throw httpError(404, 'Student not found');
      const snapshot = await studentSnapshot(sid, req.user.role === 'admin');
      res.json({ student, ...snapshot });
    }));
  },
});
