import { Router } from 'express';
import { asyncHandler, httpError, esc } from './helpers.js';
import { protect, authorize } from '../middleware/auth.js';

// '' -> undefined so empty form fields unset optional values; drop dangerous keys
const clean = (body) => {
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (k === '_id' || k === '__v' || k.startsWith('$')) continue;
    out[k] = v === '' ? undefined : v;
  }
  return out;
};

/**
 * Generic CRUD handlers for a Mongoose model.
 * Options: populate, searchFields, sort, scope(req), validate(req, body, doc),
 *          beforeCreate(req, body), afterCreate(req, doc),
 *          beforeDelete(req, doc), afterDelete(req, doc)
 */
export function crud(Model, opts = {}) {
  const {
    populate, searchFields = [], sort = '-createdAt', scope,
    validate, beforeCreate, afterCreate, beforeDelete, afterDelete,
  } = opts;
  const withPop = (q) => (populate ? q.populate(populate) : q);

  const list = asyncHandler(async (req, res) => {
    const { search, page = '1', limit = '200', ...filters } = req.query;
    const q = {};
    for (const [k, v] of Object.entries(filters)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      if (typeof v === 'string' && v !== '') q[k] = v;
    }
    if (typeof search === 'string' && search && searchFields.length) {
      const rx = new RegExp(esc(search), 'i');
      q.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    if (scope) Object.assign(q, scope(req));
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(500, Math.max(1, parseInt(limit, 10) || 200));
    const [items, total] = await Promise.all([
      withPop(Model.find(q).sort(sort).skip((p - 1) * l).limit(l)),
      Model.countDocuments(q),
    ]);
    res.json({ items, total, page: p });
  });

  const getOne = asyncHandler(async (req, res) => {
    const filter = { _id: req.params.id, ...(scope ? scope(req) : {}) };
    const doc = await withPop(Model.findOne(filter));
    if (!doc) throw httpError(404, 'Record not found');
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    let body = clean(req.body);
    if (validate) await validate(req, body, null);
    if (beforeCreate) body = await beforeCreate(req, body);
    const doc = await Model.create(body);
    if (afterCreate) await afterCreate(req, doc);
    res.status(201).json(await withPop(Model.findById(doc._id)));
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw httpError(404, 'Record not found');
    const body = clean(req.body);
    if (validate) await validate(req, body, doc);
    doc.set(body);
    await doc.save();
    res.json(await withPop(Model.findById(doc._id)));
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw httpError(404, 'Record not found');
    if (beforeDelete) await beforeDelete(req, doc);
    await doc.deleteOne();
    if (afterDelete) await afterDelete(req, doc);
    res.json({ message: 'Deleted' });
  });

  return { list, getOne, create, update, remove };
}

/**
 * Builds a router from crud handlers.
 *  read:  roles allowed to GET ([] = any logged-in user)
 *  write: roles allowed to POST/PUT/DELETE (null = no write routes)
 *  extra: (router) => void  - custom routes, registered BEFORE '/:id'
 */
export function mountCrud(c, { read = [], write = ['admin'], extra } = {}) {
  const router = Router();
  router.use(protect);
  const canRead = read.length ? [authorize(...read)] : [];
  if (extra) extra(router);
  router.get('/', ...canRead, c.list);
  router.get('/:id', ...canRead, c.getOne);
  if (write) {
    router.post('/', authorize(...write), c.create);
    router.put('/:id', authorize(...write), c.update);
    router.delete('/:id', authorize(...write), c.remove);
  }
  return router;
}

// Blocks deletion when other records still reference this one
export const guardInUse = (checks) => async (req, doc) => {
  for (const { model, field, label } of checks) {
    const n = await model.countDocuments({ [field]: doc._id });
    if (n > 0) throw httpError(409, `Cannot delete: used by ${n} ${label}`);
  }
};
