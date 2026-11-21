import mongoose from 'mongoose';
const { Schema } = mongoose;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default mongoose.model('Timetable', new Schema({
  classSection: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'Teacher' },
  day: { type: String, enum: DAYS, required: true },
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true },
  room: { type: String, trim: true },
}, { timestamps: true }));
