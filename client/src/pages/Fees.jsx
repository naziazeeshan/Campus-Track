import { useEffect, useState } from 'react';
import { Printer, Layers } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import FormField from '../components/ui/FormField.jsx';
import { fmtDate, fmtMoney, cap } from '../utils/format.js';

const feeStatus = { paid: 'success', partial: 'warning', pending: 'danger' };
const studentLabel = (s) => `${s.admissionNo} - ${s.name}`;

const structureFields = [
  { name: 'name', label: 'Fee Name', required: true, placeholder: 'e.g. Semester 1 Tuition' },
  { name: 'course', label: 'Course', type: 'select', optionsFrom: { endpoint: '/courses' } },
  { name: 'semester', label: 'Semester', type: 'number', min: 1 },
  { name: 'amount', label: 'Amount', type: 'number', min: 0, required: true },
  { name: 'description', label: 'Description', type: 'textarea', full: true },
];
const structureColumns = [
  { key: 'name', label: 'Fee' },
  { key: 'course', label: 'Course', render: (r) => r.course?.name || 'All' },
  { key: 'semester', label: 'Semester', render: (r) => r.semester || '—' },
  { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount) },
];

const recordFields = [
  { name: 'student', label: 'Student', type: 'select', required: true, createOnly: true, full: true, optionsFrom: { endpoint: '/students', label: studentLabel } },
  { name: 'title', label: 'Fee Title', required: true },
  { name: 'amount', label: 'Amount', type: 'number', min: 0, required: true },
  { name: 'discount', label: 'Discount', type: 'number', min: 0, default: 0 },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
];

function Receipt({ id, onClose }) {
  const [p, setP] = useState(null);
  const [inst, setInst] = useState({});
  useEffect(() => {
    api.get(`/payments/${id}`).then(setP).catch(() => {});
    api.get('/settings').then(setInst).catch(() => {});
  }, [id]);
  return (
    <Modal title="Payment Receipt" onClose={onClose}>
      {!p ? <p className="muted">Loading...</p> : (
        <>
          <div className="receipt print-area">
            <h2>{inst.institutionName || 'Campus Track'}</h2>
            {inst.address && <p className="muted">{inst.address}</p>}
            <hr />
            <div className="receipt-row"><span>Receipt No</span><strong>{p.receiptNo}</strong></div>
            <div className="receipt-row"><span>Date</span><strong>{fmtDate(p.paidOn)}</strong></div>
            <div className="receipt-row"><span>Student</span><strong>{p.student?.name} ({p.student?.admissionNo})</strong></div>
            <div className="receipt-row"><span>Fee</span><strong>{p.feeRecord?.title}</strong></div>
            <div className="receipt-row"><span>Method</span><strong>{cap(p.method)}</strong></div>
            <div className="receipt-row"><span>Received by</span><strong>{p.receivedBy?.name || '—'}</strong></div>
            <hr />
            <div className="receipt-total"><span>Amount Paid</span><strong>{fmtMoney(p.amount, inst.currency)}</strong></div>
            {p.feeRecord && (
              <div className="receipt-row"><span>Remaining balance</span>
                <strong>{fmtMoney(Math.max(0, p.feeRecord.amount - p.feeRecord.discount - p.feeRecord.amountPaid), inst.currency)}</strong>
              </div>
            )}
          </div>
          <div className="form-actions no-print">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button icon={Printer} onClick={() => window.print()}>Print</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function PayModal({ fee, onClose, onDone }) {
  const notify = useToast();
  const [form, setForm] = useState({ amount: fee.balance, method: 'cash', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const p = await api.post('/payments', { feeRecord: fee._id, ...form });
      notify('Payment recorded');
      onDone(p);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const set = (name, v) => setForm((f) => ({ ...f, [name]: v }));
  return (
    <Modal title={`Receive Payment - ${fee.student?.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <p className="muted">{fee.title} · Remaining balance: <strong>{fmtMoney(fee.balance)}</strong></p>
        <div className="form-grid">
          <FormField field={{ name: 'amount', label: 'Amount', type: 'number', min: 1, required: true }} value={form.amount} onChange={set} />
          <FormField field={{ name: 'method', label: 'Method', type: 'select', required: true, options: ['cash', 'bank', 'online', 'cheque'].map((v) => ({ value: v, label: cap(v) })) }} value={form.method} onChange={set} />
          <FormField field={{ name: 'note', label: 'Note', full: true }} value={form.note} onChange={set} />
        </div>
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Receive Payment'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ onClose }) {
  const notify = useToast();
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ structure: '', classSection: '', dueDate: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get('/fee-structures', { limit: 500 }).then((d) => setStructures(d.items));
    api.get('/classes', { limit: 500 }).then((d) => setClasses(d.items));
  }, []);
  const set = (name, v) => setForm((f) => ({ ...f, [name]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api.post('/fees/assign', form);
      notify(`Assigned to ${r.created} student(s)${r.skipped ? `, ${r.skipped} already had it` : ''}`);
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Assign Fee to Students" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <FormField field={{ name: 'structure', label: 'Fee Structure', type: 'select', required: true, full: true }} value={form.structure} onChange={set}
            options={structures.map((s) => ({ value: s._id, label: `${s.name} - ${fmtMoney(s.amount)}` }))} />
          <FormField field={{ name: 'classSection', label: 'Class (leave empty to use the structure\'s course)', type: 'select', full: true }} value={form.classSection} onChange={set}
            options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          <FormField field={{ name: 'dueDate', label: 'Due Date', type: 'date' }} value={form.dueDate} onChange={set} />
        </div>
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Assigning...' : 'Assign'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Fees() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('records');
  const [payFee, setPayFee] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [assign, setAssign] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const feeColumns = [
    ...(isAdmin ? [{ key: 'student', label: 'Student', render: (r) => (r.student ? `${r.student.admissionNo} - ${r.student.name}` : '—') }] : []),
    { key: 'title', label: 'Fee' },
    { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount) },
    { key: 'discount', label: 'Discount', render: (r) => fmtMoney(r.discount) },
    { key: 'amountPaid', label: 'Paid', render: (r) => fmtMoney(r.amountPaid) },
    { key: 'balance', label: 'Balance', render: (r) => <strong>{fmtMoney(r.balance)}</strong> },
    { key: 'dueDate', label: 'Due', render: (r) => fmtDate(r.dueDate) },
    { key: 'status', label: 'Status', render: (r) => <Badge type={feeStatus[r.status]}>{cap(r.status)}</Badge> },
  ];

  const payColumns = [
    { key: 'receiptNo', label: 'Receipt No' },
    { key: 'paidOn', label: 'Date', render: (r) => fmtDate(r.paidOn) },
    ...(isAdmin ? [{ key: 'student', label: 'Student', render: (r) => r.student?.name || '—' }] : []),
    { key: 'feeRecord', label: 'Fee', render: (r) => r.feeRecord?.title || '—' },
    { key: 'amount', label: 'Amount', render: (r) => fmtMoney(r.amount) },
    { key: 'method', label: 'Method', render: (r) => cap(r.method) },
  ];

  const tabs = isAdmin
    ? [{ key: 'records', label: 'Student Fees' }, { key: 'structures', label: 'Fee Structures' }, { key: 'payments', label: 'Payment History' }]
    : [{ key: 'records', label: 'My Fees' }, { key: 'payments', label: 'My Payments' }];

  return (
    <>
      <PageHeader title="Fees & Payments" subtitle="Fee structures, dues, payments and receipts" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'records' && (
        <ResourcePage
          key={`records-${refreshKey}`} embedded endpoint="/fees" noun="fee record" addLabel="Add Fee Record"
          searchable={false}
          columns={feeColumns} fields={recordFields}
          filters={isAdmin ? [{ name: 'status', label: 'All statuses', options: ['pending', 'partial', 'paid'].map((v) => ({ value: v, label: cap(v) })) }] : []}
          canCreate={isAdmin} canEdit={isAdmin} canDelete={isAdmin}
          headerActions={isAdmin && <Button variant="outline" icon={Layers} onClick={() => setAssign(true)}>Assign Fee to Class</Button>}
          rowActions={isAdmin ? [{ label: 'Receive Payment', show: (r) => r.balance > 0, onClick: (row) => setPayFee(row) }] : []}
        />
      )}
      {tab === 'structures' && isAdmin && (
        <ResourcePage key="structures" embedded endpoint="/fee-structures" noun="fee structure" addLabel="Add Fee Structure"
          columns={structureColumns} fields={structureFields} searchPlaceholder="Search fee structures..." />
      )}
      {tab === 'payments' && (
        <ResourcePage
          key="payments" embedded endpoint="/payments" noun="payment" searchable={false}
          columns={payColumns} canCreate={false} canEdit={false} canDelete={false}
          rowActions={[{ label: 'Receipt', onClick: (row) => setReceiptId(row._id) }]}
        />
      )}

      {payFee && (
        <PayModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onDone={(p) => { setPayFee(null); setRefreshKey((k) => k + 1); setReceiptId(p._id); }}
        />
      )}
      {assign && <AssignModal onClose={() => { setAssign(false); setRefreshKey((k) => k + 1); }} />}
      {receiptId && <Receipt id={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
}
