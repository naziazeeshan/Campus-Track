import { FeeStructure, FeeRecord, Payment } from '../models/Finance.js';
import Student from '../models/Student.js';
import { crud, mountCrud } from '../utils/crud.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, httpError, oid } from '../utils/helpers.js';

const studentScope = (req) => (req.user.role === 'student' ? { student: req.studentId || null } : {});

// Fee structures (templates)
export const feeStructures = mountCrud(crud(FeeStructure, {
  populate: { path: 'course', select: 'name code' },
  searchFields: ['name'],
  sort: 'name',
  beforeDelete: async (req, doc) => {
    const n = await FeeRecord.countDocuments({ structure: doc._id });
    if (n) throw httpError(409, `Cannot delete: ${n} student fee record(s) use this structure`);
  },
}), { read: ['admin'], write: ['admin'] });

// Student fee records
const feeCrud = crud(FeeRecord, {
  populate: [{ path: 'student', select: 'name admissionNo' }],
  scope: studentScope,
  sort: '-createdAt',
  validate: async (req, body) => { delete body.amountPaid; delete body.status; }, // changed only via payments
  beforeDelete: async (req, doc) => {
    const n = await Payment.countDocuments({ feeRecord: doc._id });
    if (n) throw httpError(409, 'Payments exist for this fee record, it cannot be deleted');
  },
});

export const fees = mountCrud(feeCrud, {
  read: ['admin', 'student'],
  write: ['admin'],
  extra: (router) => {
    // Assign a fee structure to all active students of a class / course
    router.post('/assign', authorize('admin'), asyncHandler(async (req, res) => {
      const { structure, classSection, course, dueDate } = req.body;
      const st = await FeeStructure.findById(oid(structure, 'fee structure'));
      if (!st) throw httpError(404, 'Fee structure not found');
      const filter = { status: 'active' };
      if (classSection) filter.classSection = oid(classSection, 'class');
      else if (course) filter.course = oid(course, 'course');
      else if (st.course) filter.course = st.course;
      else throw httpError(400, 'Choose a class or a course');
      const students = await Student.find(filter).select('_id');
      const existing = new Set(
        (await FeeRecord.find({ structure: st._id, student: { $in: students.map((s) => s._id) } }).select('student'))
          .map((f) => String(f.student))
      );
      const docs = students
        .filter((s) => !existing.has(String(s._id)))
        .map((s) => ({ student: s._id, structure: st._id, title: st.name, amount: st.amount, dueDate: dueDate || undefined }));
      if (docs.length) await FeeRecord.insertMany(docs);
      res.json({ created: docs.length, skipped: students.length - docs.length });
    }));
  },
});

// Payments + receipts
const payPopulate = [
  { path: 'student', select: 'name admissionNo' },
  { path: 'feeRecord', select: 'title amount discount amountPaid' },
  { path: 'receivedBy', select: 'name' },
];
const payCrud = crud(Payment, { populate: payPopulate, scope: studentScope, sort: '-paidOn' });

const receiptNo = () =>
  `RCP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

export const payments = mountCrud(payCrud, {
  read: ['admin', 'student'],
  write: null,
  extra: (router) => {
    router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
      const feeId = oid(req.body.feeRecord, 'fee record');
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Enter a valid payment amount');
      const method = ['cash', 'bank', 'online', 'cheque'].includes(req.body.method) ? req.body.method : 'cash';

      // Atomic update: only succeeds if the payment does not exceed the balance
      const fee = await FeeRecord.findOneAndUpdate(
        { _id: feeId, $expr: { $lte: [{ $add: ['$amountPaid', amount] }, { $subtract: ['$amount', '$discount'] }] } },
        { $inc: { amountPaid: amount } },
        { new: true }
      );
      if (!fee) {
        const exists = await FeeRecord.exists({ _id: feeId });
        throw httpError(exists ? 400 : 404, exists ? 'Payment is more than the remaining balance' : 'Fee record not found');
      }
      await fee.save(); // recalculates status (pending/partial/paid)

      const payment = await Payment.create({
        feeRecord: fee._id, student: fee.student, amount, method,
        receiptNo: receiptNo(), receivedBy: req.user._id, note: req.body.note,
      });
      res.status(201).json(await Payment.findById(payment._id).populate(payPopulate));
    }));
  },
});
