import Timetable from '../models/Timetable.js';
import { Subject } from '../models/Academic.js';
import { crud, mountCrud } from '../utils/crud.js';
import { httpError } from '../utils/helpers.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const c = crud(Timetable, {
  populate: [
    { path: 'classSection', select: 'name' },
    { path: 'subject', select: 'name code' },
    { path: 'teacher', select: 'name' },
  ],
  sort: 'startTime',
  validate: async (req, body, doc) => {
    const cur = doc ? doc.toObject() : {};
    const m = { ...cur, ...body };
    if (!m.classSection || !m.subject || !m.day || !m.startTime || !m.endTime) {
      throw httpError(400, 'Class, subject, day, start time and end time are required');
    }
    if (!TIME.test(m.startTime) || !TIME.test(m.endTime)) throw httpError(400, 'Time must be in HH:MM format');
    if (m.startTime >= m.endTime) throw httpError(400, 'End time must be after start time');

    // default to the subject's teacher
    if (!m.teacher) {
      const sub = await Subject.findById(m.subject).select('teacher');
      if (sub?.teacher) { body.teacher = sub.teacher; m.teacher = sub.teacher; }
    }

    const overlap = { day: m.day, startTime: { $lt: m.endTime }, endTime: { $gt: m.startTime } };
    if (doc) overlap._id = { $ne: doc._id };
    const checks = [{ ...overlap, classSection: m.classSection }];
    if (m.teacher) checks.push({ ...overlap, teacher: m.teacher });
    if (m.room) checks.push({ ...overlap, room: m.room });
    const labels = ['This class already has a lecture at that time'];
    if (m.teacher) labels.push('This teacher is already teaching another class at that time');
    if (m.room) labels.push('This room is already booked at that time');
    for (let i = 0; i < checks.length; i += 1) {
      if (await Timetable.exists(checks[i])) throw httpError(409, labels[i]);
    }
  },
});

export default mountCrud(c, { read: [], write: ['admin'] });
