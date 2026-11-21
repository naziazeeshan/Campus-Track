// Run once:  npm run seed
// Creates demo users + a little sample data (only if the database is empty).
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Teacher from './models/Teacher.js';
import Student from './models/Student.js';
import Setting from './models/Setting.js';
import { Department, Course, ClassSection, Subject } from './models/Academic.js';
import { FeeStructure } from './models/Finance.js';

await connectDB();

const ensureUser = async (name, email, password, role) => {
  if (await User.findOne({ email })) return false;
  await User.create({ name, email, password, role });
  return true;
};

await ensureUser('Administrator', 'admin@campus.com', 'Admin@123', 'admin');
await ensureUser('Demo Teacher', 'teacher@campus.com', 'Teacher@123', 'teacher');
await ensureUser('Demo Student', 'student@campus.com', 'Student@123', 'student');
if (!(await Setting.findOne())) await Setting.create({});

if ((await Department.countDocuments()) === 0) {
  const dept = await Department.create({ name: 'Computer Science', code: 'CS' });
  const teacher = await Teacher.create({
    employeeId: 'EMP-0001', name: 'Demo Teacher', email: 'teacher@campus.com',
    department: dept._id, designation: 'Lecturer', category: 'teacher',
  });
  const course = await Course.create({ name: 'BS Computer Science', code: 'BSCS', department: dept._id, durationSemesters: 8 });
  const cls = await ClassSection.create({ name: 'BSCS-1A', course: course._id, semester: 1, section: 'A', classTeacher: teacher._id, room: 'R-101', capacity: 40 });
  await Subject.create({ name: 'Programming Fundamentals', code: 'CS101', course: course._id, semester: 1, creditHours: 3, teacher: teacher._id });
  await Subject.create({ name: 'Calculus', code: 'MT101', course: course._id, semester: 1, creditHours: 3 });
  await FeeStructure.create({ name: 'Semester 1 Tuition Fee', course: course._id, semester: 1, amount: 45000 });

  const names = [
    ['Demo Student', 'student@campus.com'], ['Ali Raza'], ['Sara Khan'], ['Hamza Ahmed'], ['Ayesha Noor'],
  ];
  let n = 1;
  for (const [name, email] of names) {
    await Student.create({
      admissionNo: `CT-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`,
      name, email, course: course._id, classSection: cls._id, gender: n % 2 ? 'Male' : 'Female',
    });
    n += 1;
  }
  console.log('Sample data created.');
}

console.log('\nSeed complete. Demo logins:');
console.log('  admin@campus.com   / Admin@123');
console.log('  teacher@campus.com / Teacher@123');
console.log('  student@campus.com / Student@123\n');
await mongoose.disconnect();
