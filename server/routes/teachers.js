import Teacher from '../models/Teacher.js';
import { Department, ClassSection, Subject } from '../models/Academic.js';
import Timetable from '../models/Timetable.js';
import { crud, mountCrud, guardInUse } from '../utils/crud.js';
import { authorize } from '../middleware/auth.js';
import { asyncHandler, httpError, oid } from '../utils/helpers.js';

async function nextEmployeeId() {
  const last = await Teacher.findOne({ employeeId: /^EMP-/ }).sort('-employeeId');
  const n = last ? parseInt(last.employeeId.slice(4), 10) + 1 : 1;
  return `EMP-${String(n).padStart(4, '0')}`;
}

const c = crud(Teacher, {
  populate: { path: 'department', select: 'name' },
  searchFields: ['name', 'employeeId', 'email', 'phone', 'designation'],
  sort: 'employeeId',
  validate: async (req, body) => { if (body.email) body.email = String(body.email).toLowerCase(); },
  beforeCreate: async (req, body) => {
    if (!body.employeeId) body.employeeId = await nextEmployeeId();
    return body;
  },
  beforeDelete: guardInUse([
    { model: Subject, field: 'teacher', label: 'subject(s)' },
    { model: ClassSection, field: 'classTeacher', label: 'class(es)' },
    { model: Department, field: 'head', label: 'department(s)' },
    { model: Timetable, field: 'teacher', label: 'timetable slot(s)' },
  ]),
});

export default mountCrud(c, {
  read: ['admin', 'teacher'],
  write: ['admin'],
  extra: (router) => {
    router.get('/me', authorize('teacher'), asyncHandler(async (req, res) => {
      const t = await Teacher.findOne({ email: req.user.email }).populate('department', 'name');
      if (!t) throw httpError(404, 'No teacher record is linked to your account yet.');
      res.json(t);
    }));

    // Subjects + classes assigned to a teacher
    router.get('/:id/assignments', authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
      const id = oid(req.params.id, 'teacher');
      const [subjects, classes] = await Promise.all([
        Subject.find({ teacher: id }).populate('course', 'name').sort('name'),
        ClassSection.find({ classTeacher: id }).populate('course', 'name').sort('name'),
      ]);
      res.json({ subjects, classes });
    }));
  },
});
