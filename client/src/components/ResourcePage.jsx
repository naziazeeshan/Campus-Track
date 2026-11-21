import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from './ui/PageHeader.jsx';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Table from './ui/Table.jsx';
import Modal from './ui/Modal.jsx';
import Loader from './ui/Loader.jsx';
import FormField from './ui/FormField.jsx';

/**
 * Generic list + create/edit/delete screen driven by config.
 *
 * fields:  [{ name, label, type, required, requiredOnCreate, createOnly, full, options | optionsFrom:{endpoint,label(fn)} }]
 * filters: [{ name, label, options | optionsFrom }]   -> sent as query params
 * rowActions: [{ label, show?(row), onClick(row, reload) }]
 */
export default function ResourcePage({
  title, subtitle, endpoint, columns, fields = [], filters = [], params,
  canCreate = true, canEdit = true, canDelete = true, addLabel = 'Add New', noun = 'record',
  searchPlaceholder = 'Search...', rowActions = [], headerActions, embedded = false, searchable = true,
}) {
  const notify = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [optionMap, setOptionMap] = useState({});
  const [modal, setModal] = useState(null); // { mode, row }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const paramsKey = JSON.stringify(params || {});

  // Load dropdown options (for select fields + filters)
  useEffect(() => {
    const sources = [
      ...fields.filter((f) => f.optionsFrom).map((f) => ({ key: `field:${f.name}`, src: f.optionsFrom })),
      ...filters.filter((f) => f.optionsFrom).map((f) => ({ key: `filter:${f.name}`, src: f.optionsFrom })),
    ];
    sources.forEach(({ key, src }) => {
      api.get(src.endpoint, { limit: 500 }).then((d) => {
        const label = src.label || ((o) => o.name);
        setOptionMap((m) => ({ ...m, [key]: d.items.map((o) => ({ value: o._id, label: label(o) })) }));
      }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get(endpoint, { ...JSON.parse(paramsKey), ...filterVals, search });
      setItems(d.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, paramsKey, filterVals, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.default ?? ''])));
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    const v = {};
    fields.forEach((f) => {
      let val = row[f.name];
      if (val && typeof val === 'object' && val._id) val = val._id;
      if (f.type === 'date' && val) val = String(val).slice(0, 10);
      if (f.type === 'password') val = '';
      if (typeof val === 'boolean') val = String(val);
      v[f.name] = val ?? '';
    });
    setForm(v);
    setFormError('');
    setModal({ mode: 'edit', row });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const editing = modal.mode === 'edit';
    const payload = {};
    fields.forEach((f) => {
      if (editing && f.createOnly) return;
      if (editing && f.type === 'password' && !form[f.name]) return;
      payload[f.name] = f.type === 'number' && form[f.name] !== '' ? Number(form[f.name]) : form[f.name];
    });
    try {
      if (editing) await api.put(`${endpoint}/${modal.row._id}`, payload);
      else await api.post(endpoint, payload);
      notify(editing ? 'Changes saved' : `${addLabel.replace(/^Add /, '')} created`);
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return;
    try {
      await api.del(`${endpoint}/${row._id}`);
      notify('Deleted');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const hasActions = rowActions.length > 0 || canEdit || canDelete;
  const cols = hasActions
    ? [...columns, {
        key: '_actions', label: '',
        render: (row) => (
          <div className="row-actions">
            {rowActions.filter((a) => !a.show || a.show(row)).map((a) => (
              <button key={a.label} className="btn btn-outline btn-sm" onClick={() => a.onClick(row, load)}>{a.label}</button>
            ))}
            {canEdit && <button className="icon-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={16} /></button>}
            {canDelete && <button className="icon-btn danger" title="Delete" onClick={() => remove(row)}><Trash2 size={16} /></button>}
          </div>
        ),
      }]
    : columns;

  return (
    <>
      {!embedded && <PageHeader title={title} subtitle={subtitle} />}
      <Card>
        <div className="toolbar">
          <div className="toolbar-left">
            {searchable && (
              <div className="search-box inline">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} />
              </div>
            )}
            {filters.map((f) => (
              <select
                key={f.name}
                className="filter-select"
                value={filterVals[f.name] || ''}
                onChange={(e) => setFilterVals((v) => ({ ...v, [f.name]: e.target.value }))}
              >
                <option value="">{f.label}</option>
                {(f.options || optionMap[`filter:${f.name}`] || []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
          </div>
          <div className="toolbar-right">
            {headerActions}
            {canCreate && <Button icon={Plus} onClick={openCreate}>{addLabel}</Button>}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loader /> : <Table columns={cols} rows={items} />}
      </Card>

      {modal && (
        <Modal title={modal.mode === 'edit' ? `Edit ${noun}` : addLabel} onClose={() => setModal(null)}>
          <form onSubmit={submit}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="form-grid">
              {fields
                .filter((f) => !(modal.mode === 'edit' && f.createOnly))
                .map((f) => (
                  <FormField
                    key={f.name}
                    field={{ ...f, required: f.required || (f.requiredOnCreate && modal.mode === 'create') }}
                    value={form[f.name]}
                    options={optionMap[`field:${f.name}`]}
                    onChange={(name, val) => setForm((s) => ({ ...s, [name]: val }))}
                  />
                ))}
            </div>
            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
