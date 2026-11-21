import { Department, Course, ClassSection, Subject } from '../models/Academic.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Timetable from '../models/Timetable.js';
import { Exam } from '../models/Exam.js';
import { crud, mountCrud, guardInUse } from '../utils/crud.js';

const opts = { read: [], write: ['admin'] };

export const departments = mountCrud(crud(Department, {
  populate: { path: 'head', select: 'name' },
  searchFields: ['name', 'code'],
  sort: 'name',
  beforeDelete: guardInUse([
    { model: Course, field: 'department', label: 'course(s)' },
    { model: Teacher, field: 'department', label: 'teacher(s)/staff' },
  ]),
}), opts);

export const courses = mountCrud(crud(Course, {
  populate: { path: 'department', select: 'name' },
  searchFields: ['name', 'code'],
  sort: 'name',
  beforeDelete: guardInUse([
    { model: ClassSection, field: 'course', label: 'class(es)' },
    { model: Subject, field: 'course', label: 'subject(s)' },
    { model: Student, field: 'course', label: 'student(s)' },
  ]),
}), opts);

export const classes = mountCrud(crud(ClassSection, {
  populate: [{ path: 'course', select: 'name code' }, { path: 'classTeacher', select: 'name' }],
  searchFields: ['name', 'room', 'section'],
  sort: 'name',
  beforeDelete: guardInUse([
    { model: Student, field: 'classSection', label: 'student(s)' },
    { model: Timetable, field: 'classSection', label: 'timetable slot(s)' },
    { model: Exam, field: 'classSection', label: 'exam(s)' },
  ]),
}), opts);

export const subjects = mountCrud(crud(Subject, {
  populate: [{ path: 'course', select: 'name code' }, { path: 'teacher', select: 'name' }],
  searchFields: ['name', 'code'],
  sort: 'name',
  beforeDelete: guardInUse([
    { model: Exam, field: 'subject', label: 'exam(s)' },
    { model: Timetable, field: 'subject', label: 'timetable slot(s)' },
  ]),
}), opts);
