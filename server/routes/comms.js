import { Router } from 'express';
import { Announcement, Message, Notification } from '../models/Comms.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { crud, mountCrud } from '../utils/crud.js';
import { asyncHandler, httpError, oid } from '../utils/helpers.js';

// ---------- Announcements ----------
const audienceScope = (req) => {
  if (req.user.role === 'student') return { audience: { $in: ['all', 'students'] } };
  if (req.user.role === 'teacher') return { audience: { $in: ['all', 'teachers'] } };
  return {};
};
const ownerOrAdmin = (req, doc) => {
  if (doc && req.user.role !== 'admin' && String(doc.createdBy) !== String(req.user._id)) {
    throw httpError(403, 'You can only change your own announcements');
  }
};

export const announcements = mountCrud(crud(Announcement, {
  populate: { path: 'createdBy', select: 'name role' },
  searchFields: ['title', 'message'],
  scope: audienceScope,
  validate: async (req, body, doc) => { ownerOrAdmin(req, doc); delete body.createdBy; },
  beforeCreate: async (req, body) => ({ ...body, createdBy: req.user._id }),
  beforeDelete: async (req, doc) => ownerOrAdmin(req, doc),
  afterCreate: async (req, doc) => {
    const roles = doc.audience === 'students' ? ['student'] : doc.audience === 'teachers' ? ['teacher'] : ['student', 'teacher', 'admin'];
    const users = await User.find({ isActive: true, role: { $in: roles }, _id: { $ne: req.user._id } }).select('_id');
    if (users.length) {
      await Notification.insertMany(users.map((u) => ({
        user: u._id, title: doc.title, message: doc.message.slice(0, 120), link: '/announcements',
      })));
    }
  },
}), { read: [], write: ['admin', 'teacher'] });

// ---------- Messages (student <-> teacher communication) ----------
export const messages = Router();
messages.use(protect);

messages.get('/contacts', asyncHandler(async (req, res) => {
  const q = { isActive: true, _id: { $ne: req.user._id } };
  if (req.user.role === 'student') q.role = { $in: ['teacher', 'admin'] };
  res.json({ items: await User.find(q).select('name role').sort('name') });
}));

messages.get('/inbox', asyncHandler(async (req, res) => {
  const items = await Message.find({ to: req.user._id }).populate('from', 'name role').sort('-createdAt').limit(100);
  res.json({ items, unread: items.filter((m) => !m.read).length });
}));

messages.get('/sent', asyncHandler(async (req, res) => {
  const items = await Message.find({ from: req.user._id }).populate('to', 'name role').sort('-createdAt').limit(100);
  res.json({ items });
}));

messages.post('/', asyncHandler(async (req, res) => {
  const to = await User.findById(oid(req.body.to, 'recipient'));
  if (!to || !to.isActive || String(to._id) === String(req.user._id)) throw httpError(400, 'Invalid recipient');
  if (req.user.role === 'student' && to.role === 'student') throw httpError(403, 'Students can only message teachers or admins');
  const body = String(req.body.body || '').trim();
  if (!body) throw httpError(400, 'Message cannot be empty');
  const subject = String(req.body.subject || '').trim();
  const msg = await Message.create({ from: req.user._id, to: to._id, subject, body });
  await Notification.create({
    user: to._id, title: `New message from ${req.user.name}`, message: subject || body.slice(0, 80), link: '/messages',
  });
  res.status(201).json(msg);
}));

messages.patch('/:id/read', asyncHandler(async (req, res) => {
  const m = await Message.findOneAndUpdate({ _id: req.params.id, to: req.user._id }, { read: true }, { new: true });
  if (!m) throw httpError(404, 'Message not found');
  res.json(m);
}));

// ---------- Notifications ----------
export const notifications = Router();
notifications.use(protect);

notifications.get('/', asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(20),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
}));

notifications.patch('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'ok' });
}));

notifications.patch('/:id/read', asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ message: 'ok' });
}));
