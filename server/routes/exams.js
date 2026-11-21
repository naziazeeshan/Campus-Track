import { Exam, Result } from '../models/Exam.js';
import Student from '../models/Student.js';
import { crud, mountCrud } from '../utils/crud.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, httpError, oid } from '../utils/helpers.js';
import { gradeFor, summarizeResults } from '../utils/grade.js';

const examCrud = crud(Exam, {
  populate: [{ path: 'classSection', select: 'name' }, { path: 'subject', select: 'name code' }],
  searchFields: ['name'],
  sort: '-date',
  validate: async (req, body, doc) => {
    const total = body.totalMarks !== undefined ? Number(body.totalMarks) : doc?.totalMarks;
    const pass = body.passingMarks !== undefined ? Number(body.passingMarks) : doc?.passingMarks;
    if (pass > total) throw httpError(400, 'Passing marks cannot be more than total marks');
  },
  beforeDelete: async (req, doc) => {
    const n = await Result.countDocuments({ exam: doc._id });
    if (n) throw httpError(409, 'Marks are already entered for this exam');
  },
});

export const exams = mountCrud(examCrud, {
  read: [],
  write: ['admin', 'teacher'],
  extra: (router) => {
    // Marks entry sheet
    router.get('/:id/sheet', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
      const exam = await Exam.findById(req.params.id).populate([{ path: 'classSection', select: 'name' }, { path: 'subject', select: 'name' }]);
      if (!exam) throw httpError(404, 'Exam not found');
      const students = await Student.find({ classSection: exam.classSection._id, status: 'active' }).sort('name').select('name admissionNo');
      const results = await Result.find({ exam: exam._id });
      const map = new Map(results.map((r) => [String(r.student), r]));
      res.json({
        exam,
        rows: students.map((s) => {
          const r = map.get(String(s._id));
          return { student: s._id, name: s.name, admissionNo: s.admissionNo, marksObtained: r ? r.marksObtained : '', grade: r?.grade || '' };
        }),
      });
    }));

    // Save marks (grade + GPA calculated automatically)
    router.post('/:id/results', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
      const exam = await Exam.findById(req.params.id);
      if (!exam) throw httpError(404, 'Exam not found');
      const { records } = req.body;
      if (!Array.isArray(records)) throw httpError(400, 'records must be an array');
      const entries = records.filter((r) => r.marksObtained !== '' && r.marksObtained !== null && r.marksObtained !== undefined);
      const ids = entries.map((r) => oid(r.student, 'student'));
      const valid = await Student.countDocuments({ _id: { $in: ids }, classSection: exam.classSection });
      if (valid !== ids.length) throw httpError(400, 'Some students do not belong to this exam\'s class');
      const ops = entries.map((r, i) => {
        const m = Number(r.marksObtained);
        if (!Number.isFinite(m) || m < 0 || m > exam.totalMarks) throw httpError(400, `Marks must be between 0 and ${exam.totalMarks}`);
        const percentage = Math.round((m / exam.totalMarks) * 1000) / 10;
        const { grade, gradePoint } = gradeFor(percentage);
        return {
          updateOne: {
            filter: { exam: exam._id, student: ids[i] },
            update: { $set: { marksObtained: m, percentage, grade, gradePoint, remarks: String(r.remarks || '') } },
            upsert: true,
          },
        };
      });
      if (ops.length) await Result.bulkWrite(ops);
      res.json({ saved: ops.length });
    }));
  },
});

// Results list + result card
const scope = (req) => (req.user.role === 'student' ? { student: req.studentId || null } : {});
const examPop = { path: 'exam', select: 'name type totalMarks passingMarks date subject', populate: { path: 'subject', select: 'name code creditHours' } };

export const results = mountCrud(
  crud(Result, { populate: [{ path: 'student', select: 'name admissionNo' }, examPop], scope, sort: '-createdAt' }),
  {
    read: [],
    write: null,
    extra: (router) => {
      router.get('/card/:studentId', asyncHandler(async (req, res) => {
        const sid = oid(req.params.studentId, 'student');
        if (req.user.role === 'student' && String(req.studentId) !== String(sid)) throw httpError(403, 'You can only view your own result card');
        const student = await Student.findById(sid).populate([{ path: 'course', select: 'name' }, { path: 'classSection', select: 'name' }]);
        if (!student) throw httpError(404, 'Student not found');
        const list = await Result.find({ student: sid }).populate(examPop).sort('createdAt');
        res.json({ student, results: list, summary: summarizeResults(list) });
      }));
    },
  }
);
