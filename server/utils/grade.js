import { round1 } from './helpers.js';

// Percentage -> grade + grade point (4.0 scale)
export function gradeFor(pct) {
  if (pct >= 90) return { grade: 'A+', gradePoint: 4.0 };
  if (pct >= 80) return { grade: 'A', gradePoint: 3.5 };
  if (pct >= 70) return { grade: 'B', gradePoint: 3.0 };
  if (pct >= 60) return { grade: 'C', gradePoint: 2.0 };
  if (pct >= 50) return { grade: 'D', gradePoint: 1.0 };
  return { grade: 'F', gradePoint: 0.0 };
}

// results must have `exam` populated (passingMarks) and exam.subject.creditHours
export function summarizeResults(results) {
  const valid = results.filter((r) => r.exam);
  if (!valid.length) {
    return { totalExams: 0, averagePercentage: null, gpa: null, passed: 0, failed: 0 };
  }
  let points = 0, credits = 0, pctSum = 0, passed = 0;
  valid.forEach((r) => {
    const credit = r.exam.subject?.creditHours || 1;
    points += (r.gradePoint || 0) * credit;
    credits += credit;
    pctSum += r.percentage || 0;
    if (r.marksObtained >= r.exam.passingMarks) passed += 1;
  });
  return {
    totalExams: valid.length,
    averagePercentage: round1(pctSum / valid.length),
    gpa: Math.round((points / credits) * 100) / 100,
    passed,
    failed: valid.length - passed,
  };
}
