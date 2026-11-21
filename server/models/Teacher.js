import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true },
    category: { type: String, enum: ['teacher', 'staff'], default: 'teacher' },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designation: { type: String, trim: true },
    qualification: { type: String, trim: true },
    joiningDate: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Teacher', teacherSchema);
