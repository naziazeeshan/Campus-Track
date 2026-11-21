import { Router } from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler, httpError, esc } from '../utils/helpers.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/', asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const q = {};
  if (typeof role === 'string' && role) q.role = role;
  if (typeof search === 'string' && search) {
    const rx = new RegExp(esc(search), 'i');
    q.$or = [{ name: rx }, { email: rx }];
  }
  const items = await User.find(q).sort('-createdAt');
  res.json({ items, total: items.length });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, role, isActive } = req.body;
  const user = await User.create({
    name, email, password: password ? String(password) : undefined,
    role, isActive: isActive === undefined || isActive === '' ? true : isActive,
  });
  res.status(201).json(user);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  const { name, email, password, role, isActive } = req.body;
  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && ((role && role !== user.role) || String(isActive) === 'false')) {
    throw httpError(400, 'You cannot change your own role or deactivate yourself');
  }
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (isActive !== undefined && isActive !== '') user.isActive = isActive;
  if (password) user.password = String(password);
  await user.save();
  res.json(user);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw httpError(400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  await user.deleteOne();
  res.json({ message: 'Deleted' });
}));

export default router;
