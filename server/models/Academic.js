import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

export const Department = mongoose.model('Department', new Schema({
  name: { type: String, required: [true, 'Department name is required'], unique: true, trim: true },
  code: { type: String, trim: true },
  head: ref('Teacher'),
  description: String,
}, { timestamps: true }));

export const Course = mongoose.model('Course', new Schema({
  name: { type: String, required: [true, 'Course name is required'], trim: true },
  code: { type: String, required: [true, 'Course code is required'], unique: true, trim: true, uppercase: true },
  department: ref('Department'),
  durationSemesters: { type: Number, default: 8, min: 1 },
  description: String,
}, { timestamps: true }));

export const ClassSection = mongoose.model('ClassSection', new Schema({
  name: { type: String, required: [true, 'Class name is required'], unique: true, trim: true },
  course: ref('Course'),
  semester: { type: Number, min: 1 },
  section: { type: String, trim: true },
  classTeacher: ref('Teacher'),
  room: { type: String, trim: true },
  capacity: { type: Number, default: 50, min: 1 },
}, { timestamps: true }));

export const Subject = mongoose.model('Subject', new Schema({
  name: { type: String, required: [true, 'Subject name is required'], trim: true },
  code: { type: String, required: [true, 'Subject code is required'], unique: true, trim: true, uppercase: true },
  course: ref('Course'),
  semester: { type: Number, min: 1 },
  creditHours: { type: Number, default: 3, min: 1 },
  teacher: ref('Teacher'),
}, { timestamps: true }));
