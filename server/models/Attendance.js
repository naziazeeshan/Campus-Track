import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], default: 'present' },
    remarks: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classSection: 1, date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
