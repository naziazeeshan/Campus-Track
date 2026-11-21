import { httpError } from '../utils/helpers.js';

export const notFound = (req, res, next) =>
  next(httpError(404, `Route not found: ${req.originalUrl}`));

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `Duplicate ${field}: this ${field} already exists`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Server error';
  }
  res.status(status).json({ message });
};
