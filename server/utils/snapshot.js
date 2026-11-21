import Attendance from '../models/Attendance.js';
import { FeeRecord } from '../models/Finance.js';
import { Result } from '../models/Exam.js';
import { summarizeResults } from './grade.js';

// Quick performance summary of one student (used by profile + student dashboard)
export async function studentSnapshot(sid, includeFees = true) {
  const [att] = await Attendance.aggregate([
    { $match: { student: sid } },
    { $group: { _id: null, total: { $sum: 1 }, ok: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
  ]);
  const out = {
    attendance: {
      total: att?.total || 0,
      percentage: att?.total ? Math.round((att.ok / att.total) * 1000) / 10 : null,
    },
  };
  if (includeFees) {
    const [f] = await FeeRecord.aggregate([
      { $match: { student: sid } },
      { $group: { _id: null, billed: { $sum: { $subtract: ['$amount', '$discount'] } }, paid: { $sum: '$amountPaid' } } },
    ]);
    const billed = f?.billed || 0;
    const paid = f?.paid || 0;
    out.fees = { billed, paid, balance: Math.max(0, billed - paid) };
  }
  const results = await Result.find({ student: sid }).populate({
    path: 'exam', select: 'passingMarks', populate: { path: 'subject', select: 'creditHours' },
  });
  out.academic = summarizeResults(results);
  return out;
}
