import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    admissionNo: { type: String, unique: true, required: true },
    name: { type: String, required: [true, 'Student name is required'], trim: true },
    fatherName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: Date,
    address: String,
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection' },
    admissionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Student', studentSchema);
