import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthData, rebookApi } from '../../lib/api';
import { formatRwf } from '../../lib/currency';
import RebookStatusBadge from './RebookStatusBadge';

const formatDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const remaining = (value) => {
  if (!value) return '-';
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'Expired';
  const hours = Math.ceil(milliseconds / 3600000);
  return hours < 48 ? `${hours} hours remaining` : `${Math.ceil(hours / 24)} days remaining`;
};

export default function CustomerChangeRequests({ refreshKey = 0 }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setLoading(true);
      return rebookApi.getCustomerRequests(getAuthData()?.token);
    }).then((response) => { if (active) setRequests(response.requests || []); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6"><h2 className="text-xl font-black text-slate-950">My Booking Change Requests</h2><p className="mt-1 text-sm text-slate-500">Track Re-book IDs, cancellations, deadlines, and refunds.</p></div>
      {loading && <p className="p-6 text-slate-500">Loading change requests...</p>}
      {error && <p className="m-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && !requests.length && <p className="p-6 text-slate-500">No booking change requests yet.</p>}
      <div className="grid gap-4 p-4 md:p-6">
        {requests.map((request) => {
          const service = request.serviceId;
          const booking = request.originalBookingId;
          const canUse = request.status === 'rebook_id_generated' && request.rebookId;
          return <article key={request._id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="font-black text-slate-950">{service?.name || service?.businessName || 'Service'}</h3><p className="mt-1 text-xs text-slate-500">Booking ID: {booking?.bookingCode || booking?._id}</p></div><RebookStatusBadge status={request.status} /></div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Info label="Original date" value={formatDate(booking?.bookingDetails?.bookingDate || booking?.checkIn)} />
              <Info label="Requested action" value={request.requestType === 'rebook' ? 'Re-book' : 'Cancel'} />
              <Info label="Valid until / remaining" value={request.expiresAt ? `${formatDate(request.expiresAt)} · ${remaining(request.expiresAt)}` : formatDate(request.deadlineAt)} />
              <Info label="Reason / message" value={request.reason} />
              <Info label="Re-book ID" value={request.rebookId || 'Not generated'} mono />
              <Info label="Refund status" value={request.requestType === 'cancel' ? `${String(request.refundStatus || 'pending').replace(/_/g, ' ')}${request.refundAmount ? ` · ${formatRwf(request.refundAmount)}` : ''}` : 'Not applicable'} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {request.rebookId && <button type="button" onClick={() => navigator.clipboard?.writeText(request.rebookId)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">Copy ID</button>}
              {canUse && <Link to={`/booking/${service?._id}?rebookId=${encodeURIComponent(request.rebookId)}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Use re-book</Link>}
              <a href="mailto:support@safariscon.com" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Message support</a>
              {request.requestType === 'cancel' && <button type="button" onClick={() => window.alert(`Refund: ${formatRwf(request.refundAmount || 0)}. Refunds usually arrive after a short processing time. Reference: ${request.refundReference || 'Pending'}`)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">View refund details</button>}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Request timeline</p><ol className="mt-3 grid gap-2 sm:grid-cols-5">{(request.auditLogs || []).map((item, index) => <li key={`${item.event}-${index}`} className="rounded-lg bg-slate-50 p-2 text-xs"><strong className="block capitalize text-slate-800">{item.event.replace(/_/g, ' ')}</strong><span className="text-slate-500">{formatDate(item.at)}</span></li>)}</ol></div>
          </article>;
        })}
      </div>
      <p className="m-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700 md:m-6">Re-book IDs are one-time use only and cannot be transferred or reused.</p>
    </section>
  );
}

function Info({ label, value, mono = false }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 text-slate-700 ${mono ? 'font-mono font-bold' : ''}`}>{value || '-'}</dd></div>;
}
