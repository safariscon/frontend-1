import { useCallback, useEffect, useState } from 'react';
import { getAuthData, rebookApi } from '../../lib/api';
import { formatRwf } from '../../lib/currency';
import RebookStatusBadge from './RebookStatusBadge';

const displayDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function AdminRebookRequests() {
  const token = getAuthData()?.token;
  const [requests, setRequests] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const requestResponse = await rebookApi.getAdminRequests(token);
      setRequests(requestResponse.requests || []);
      setOverview(requestResponse.overview || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const run = async (id, action) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const response = await action();
      setMessage(response.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId('');
    }
  };

  const reject = (request) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason?.trim()) run(request._id, () => rebookApi.reject(token, request._id, reason));
  };

  return <div>
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start"><div><h2 className="text-xl font-black text-slate-950">Manage Re-book Requests</h2><p className="mt-1 text-sm text-slate-500">Review eligibility, one-time IDs, cancellations, refunds, and audit history.</p></div></div>
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">{[['Pending review', overview.pending], ['Approved Re-book', overview.approvedRebook], ['Used', overview.used], ['Cancelled', overview.cancelled], ['Expired', overview.expired], ['Refunded', overview.refunded]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-primary">{value || 0}</p></div>)}</div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {loading && <p className="p-6 text-slate-500">Loading requests...</p>}
    {!loading && !requests.length && <p className="p-6 text-slate-500">No booking change requests.</p>}
    <div className="mt-4 grid gap-4">
      {requests.map((request) => {
        const booking = request.originalBookingId;
        const paid = Number(booking?.amountPaid || booking?.depositAmount || booking?.totalPrice || 0);
        const refundPreview = Number(request.refundAmount || Math.round(paid * 0.8));
        const eligible = request.eligibilitySnapshot || {};
        return <article key={request._id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="font-black text-slate-950">{request.customerId?.name || 'Customer'} · {request.serviceId?.name || request.serviceId?.businessName || 'Service'}</h3><p className="mt-1 text-xs text-slate-500">Seller: {request.sellerId?.name || request.sellerId?.email || 'Unassigned'} · Booking: {booking?.bookingCode || booking?._id}</p></div><RebookStatusBadge status={request.status} /></div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4"><Field label="Original booking date" value={displayDate(booking?.bookingDetails?.bookingDate || booking?.checkIn)} /><Field label="Requested action" value={request.requestType === 'rebook' ? 'Re-book' : 'Cancel'} /><Field label="Submitted" value={displayDate(request.createdAt)} /><Field label="Re-book ID" value={request.rebookId || 'Not generated'} /><Field label="Reason / message" value={request.reason} wide /><Field label="Seller notification" value={request.sellerNotified ? `Notified ${displayDate(request.sellerNotifiedAt)}` : 'Not notified'} /><Field label="Eligibility check" value={eligible.bookingExists && eligible.belongsToCustomer && eligible.depositPaid && eligible.beforeDeadline ? 'Eligible' : 'Review required'} /><Field label="Refund eligibility" value={request.requestType === 'cancel' ? `${formatRwf(refundPreview)} guest refund of paid amount` : 'Not applicable'} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {request.requestType === 'rebook' && request.status === 'pending' && <button disabled={busyId === request._id} onClick={() => run(request._id, () => rebookApi.approve(token, request._id))} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve re-book</button>}
            {request.requestType === 'cancel' && request.status === 'cancel_requested' && <button disabled={busyId === request._id} onClick={() => run(request._id, () => rebookApi.approve(token, request._id))} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve cancel</button>}
            {['pending', 'cancel_requested', 'refund_requested'].includes(request.status) && <button disabled={busyId === request._id} onClick={() => reject(request)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Reject request</button>}
            {request.status === 'refund_requested' && <button disabled={busyId === request._id} onClick={() => run(request._id, () => rebookApi.approveRefund(token, request._id))} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve refund</button>}
            {!request.sellerNotified && <button disabled={busyId === request._id} onClick={() => run(request._id, () => rebookApi.markSellerNotified(token, request._id))} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">Mark seller notified</button>}
          </div>
          <details className="mt-4 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-600">Audit timeline</summary><ol className="mt-3 space-y-2">{(request.auditLogs || []).map((item, index) => <li key={`${item.event}-${index}`} className="text-xs text-slate-600"><strong className="capitalize text-slate-800">{item.event.replace(/_/g, ' ')}</strong> · {displayDate(item.at)}{item.message ? ` · ${item.message}` : ''}</li>)}</ol></details>
        </article>;
      })}
    </div>
  </div>;
}

function Field({ label, value, wide = false }) { return <div className={wide ? 'md:col-span-2' : ''}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-slate-700">{value || '-'}</p></div>; }
