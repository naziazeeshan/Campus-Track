import mongoose from 'mongoose';

export default mongoose.model('Setting', new mongoose.Schema({
  institutionName: { type: String, default: 'Campus Track' },
  address: String,
  phone: String,
  email: String,
  academicYear: { type: String, default: '2026-2027' },
  currency: { type: String, default: 'Rs' },
  attendanceThreshold: { type: Number, default: 75, min: 0, max: 100 },
}, { timestamps: true }));
