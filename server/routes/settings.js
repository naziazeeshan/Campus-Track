import { Router } from 'express';
import Setting from '../models/Setting.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();
router.use(protect);

const getSettings = async () => (await Setting.findOne()) || (await Setting.create({}));

router.get('/', asyncHandler(async (req, res) => res.json(await getSettings())));

router.put('/', authorize('admin'), asyncHandler(async (req, res) => {
  const s = await getSettings();
  ['institutionName', 'address', 'phone', 'email', 'academicYear', 'currency', 'attendanceThreshold'].forEach((k) => {
    if (req.body[k] !== undefined) s[k] = req.body[k] === '' ? undefined : req.body[k];
  });
  await s.save();
  res.json(s);
}));

export default router;
