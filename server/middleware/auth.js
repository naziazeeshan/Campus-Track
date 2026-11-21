import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { asyncHandler, httpError } from '../utils/helpers.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw httpError(401, 'Not authenticated');
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Session expired, please log in again');
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw httpError(401, 'Account not found or deactivated');
  req.user = user;
  if (user.role === 'student') {
    const s = await Student.findOne({ email: user.email }).select('_id');
    req.studentId = s ? s._id : null;
  }
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(httpError(403, 'You do not have permission to do this'));
  }
  next();
};
