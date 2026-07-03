import { useCallback, useEffect, useState } from 'react';
import { getAuthData, rebookApi } from '../../lib/api';
import RebookStatusBadge from './RebookStatusBadge';
import { REALTIME_EVENTS, subscribeToRealtime } from '../../lib/realtime';

const displayDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function SellerRebookRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const token = getAuthData()?.token;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await rebookApi.getSellerRequests(token);
      setRequests(response.requests || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);
  useEffect(() => subscribeToRealtime([REALTIME_EVENTS.BOOKING_CHANGED, REALTIME_EVENTS.NOTIFICATION], () => load()), [load]);

  const confirmUnavailable = async (id) => {
    setError('');
    try {
      const response = await rebookApi.confirmUnavailable(token, id);
      setMessage(response.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div>
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 className="text-xl font-black text-slate-950">Re-book Requests</h2><p className="mt-1 text-sm text-slate-500">Only requests for your own services are shown.</p></div><button onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Refresh</button></div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {loading && <p className="p-6 text-slate-500">Loading Re-book requests...</p>}
    {!loading && !requests.length && <p className="p-6 text-slate-500">No Re-book or cancel requests yet.</p>}
    <div className="mt-4 grid gap-4">
      {requests.map((request) => {
        const booking = request.originalBookingId;
        const deadlinePassed = request.deadlineAt && new Date(request.deadlineAt) < new Date();
        return <article key={request._id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="font-black text-slate-950">{request.customerId?.name || 'Customer'} · {request.serviceId?.name || request.serviceId?.businessName || 'Service'}</h3><p className="mt-1 text-xs text-slate-500">Original Booking ID: {booking?.bookingCode || booking?._id}</p></div><RebookStatusBadge status={request.status} /></div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4"><Field label="Request type" value={request.requestType === 'rebook' ? 'Re-book' : 'Cancel'} /><Field label="Request date" value={displayDate(request.createdAt)} /><Field label="Deadline" value={deadlinePassed ? 'Deadline passed' : `Within deadline · ${displayDate(request.deadlineAt)}`} /><Field label="Re-book ID" value={request.rebookId || 'Not generated'} /><Field label="Reason / message" value={request.reason} /><Field label="Seller confirmation" value={request.sellerConfirmedUnavailable ? 'Unavailable confirmed' : 'Awaiting confirmation'} /></div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => window.alert(`${request.reason}\n\nSubmitted: ${displayDate(request.createdAt)}`)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">View details</button>{!request.sellerConfirmedUnavailable && ['pending', 'cancel_requested'].includes(request.status) && <button type="button" onClick={() => confirmUnavailable(request._id)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">Confirm unavailable</button>}<a href={`mailto:support@safariscon.com?subject=${encodeURIComponent(`Booking change ${booking?.bookingCode || request._id}`)}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Message admin</a></div>
        </article>;
      })}
    </div>
  </div>;
}

function Field({ label, value }) {
  return <div className={label === 'Reason / message' ? 'md:col-span-3' : ''}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-slate-700">{value || '-'}</p></div>;
}
