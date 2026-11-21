import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

export const Announcement = mongoose.model('Announcement', new Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  message: { type: String, required: [true, 'Message is required'] },
  audience: { type: String, enum: ['all', 'students', 'teachers'], default: 'all' },
  priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  createdBy: ref('User'),
}, { timestamps: true }));

export const Message = mongoose.model('Message', new Schema({
  from: { ...ref('User'), required: true },
  to: { ...ref('User'), required: true },
  subject: { type: String, trim: true },
  body: { type: String, required: [true, 'Message cannot be empty'] },
  read: { type: Boolean, default: false },
}, { timestamps: true }));

export const Notification = mongoose.model('Notification', new Schema({
  user: { ...ref('User'), required: true },
  title: { type: String, required: true },
  message: String,
  link: String,
  read: { type: Boolean, default: false },
}, { timestamps: true }));
