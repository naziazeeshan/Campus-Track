import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

export const FeeStructure = mongoose.model('FeeStructure', new Schema({
  name: { type: String, required: [true, 'Fee name is required'], trim: true },
  course: ref('Course'),
  semester: { type: Number, min: 1 },
  amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
  description: String,
}, { timestamps: true }));

const feeRecordSchema = new Schema({
  student: { ...ref('Student'), required: true },
  structure: ref('FeeStructure'),
  title: { type: String, required: [true, 'Fee title is required'], trim: true },
  amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  dueDate: Date,
  status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
}, { timestamps: true });

feeRecordSchema.virtual('balance').get(function () {
  return Math.max(0, (this.amount || 0) - (this.discount || 0) - (this.amountPaid || 0));
});
feeRecordSchema.pre('save', function () {
  const net = (this.amount || 0) - (this.discount || 0);
  if (this.amountPaid >= net) this.status = 'paid';
  else if (this.amountPaid > 0) this.status = 'partial';
  else this.status = 'pending';
});
feeRecordSchema.set('toJSON', { virtuals: true });
export const FeeRecord = mongoose.model('FeeRecord', feeRecordSchema);

export const Payment = mongoose.model('Payment', new Schema({
  feeRecord: { ...ref('FeeRecord'), required: true },
  student: { ...ref('Student'), required: true },
  amount: { type: Number, required: true, min: 1 },
  method: { type: String, enum: ['cash', 'bank', 'online', 'cheque'], default: 'cash' },
  receiptNo: { type: String, unique: true, required: true },
  paidOn: { type: Date, default: Date.now },
  receivedBy: ref('User'),
  note: String,
}, { timestamps: true }));
