import mongoose from 'mongoose';

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const httpError = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const oid = (v, label = 'id') => {
  if (typeof v !== 'string' && !(v instanceof mongoose.Types.ObjectId)) throw httpError(400, `Invalid ${label}`);
  if (!mongoose.Types.ObjectId.isValid(v)) throw httpError(400, `Invalid ${label}`);
  return new mongoose.Types.ObjectId(String(v));
};

export const round1 = (n) => Math.round(n * 10) / 10;
