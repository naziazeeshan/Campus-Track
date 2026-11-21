import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

export const Exam = mongoose.model('Exam', new Schema({
  name: { type: String, required: [true, 'Exam name is required'], trim: true },
  type: { type: String, enum: ['midterm', 'final', 'quiz', 'assignment', 'other'], default: 'midterm' },
  classSection: { ...ref('ClassSection'), required: [true, 'Class is required'] },
  subject: { ...ref('Subject'), required: [true, 'Subject is required'] },
  date: Date,
  totalMarks: { type: Number, required: [true, 'Total marks required'], default: 100, min: 1 },
  passingMarks: { type: Number, default: 40, min: 0 },
}, { timestamps: true }));

const resultSchema = new Schema({
  exam: { ...ref('Exam'), required: true },
  student: { ...ref('Student'), required: true },
  marksObtained: { type: Number, required: true, min: 0 },
  percentage: Number,
  grade: String,
  gradePoint: Number,
  remarks: String,
}, { timestamps: true });
resultSchema.index({ exam: 1, student: 1 }, { unique: true });
export const Result = mongoose.model('Result', resultSchema);
