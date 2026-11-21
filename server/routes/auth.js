import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../utils/helpers.js';

const router = Router();
const sign = (u) =>
  jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Public registration always creates a STUDENT account.
// Admin/Teacher accounts are created by an admin from the Users page.
router.post('/register', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.findOne({ email })) throw httpError(409, 'This email is already registered');
  const user = await User.create({ name, email, password, role: 'student' });
  res.status(201).json({ token: sign(user), user });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw httpError(401, 'Invalid email or password');
  if (!user.isActive) throw httpError(403, 'Your account is deactivated. Contact the administrator.');
  res.json({ token: sign(user), user });
}));

router.get('/me', protect, (req, res) => res.json(req.user));

router.put('/password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) throw httpError(400, 'New password must be at least 6 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(String(currentPassword || '')))) throw httpError(400, 'Current password is incorrect');
  user.password = String(newPassword);
  await user.save();
  res.json({ message: 'Password updated' });
}));

export default router;
