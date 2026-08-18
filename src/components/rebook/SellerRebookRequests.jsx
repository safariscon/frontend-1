import { useCallback, useEffect, useState } from 'react';
import { getAuthData, rebookApi } from '../../lib/api';
import RebookStatusBadge from './RebookStatusBadge';
import { REALTIME_EVENTS, subscribeToRealtime } from '../../lib/realtime';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

const displayDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function SellerRebookRequests() {
  const { language } = useLanguage();
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
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 className="text-xl font-black text-slate-950">{t('rebook.sellerTitle', language)}</h2><p className="mt-1 text-sm text-slate-500">{t('rebook.sellerLead', language)}</p></div><button onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">{t('refresh', language)}</button></div>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {loading && <p className="p-6 text-slate-500">{t('rebook.loadingSeller', language)}</p>}
    {!loading && !requests.length && <p className="p-6 text-slate-500">{t('rebook.emptySeller', language)}</p>}
    <div className="mt-4 grid gap-4">
      {requests.map((request) => {
        const booking = request.originalBookingId;
        const deadlinePassed = request.deadlineAt && new Date(request.deadlineAt) < new Date();
        return <article key={request._id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="font-black text-slate-950">{request.customerId?.name || t('rebook.customer', language)} · {request.serviceId?.name || request.serviceId?.businessName || t('verify.service', language)}</h3><p className="mt-1 text-xs text-slate-500">{t('rebook.originalBookingId', language)}: {booking?.bookingCode || booking?._id}</p></div><RebookStatusBadge status={request.status} /></div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4"><Field label={t('rebook.requestType', language)} value={request.requestType === 'rebook' ? t('rebook.rebook', language) : t('rebook.cancel', language)} /><Field label={t('rebook.requestDate', language)} value={displayDate(request.createdAt)} /><Field label={t('rebook.deadline', language)} value={deadlinePassed ? t('rebook.deadlinePassed', language) : t('rebook.withinDeadline', language, { date: displayDate(request.deadlineAt) })} /><Field label={t('rebook.rebookId', language)} value={request.rebookId || t('rebook.notGenerated', language)} /><Field label={t('rebook.reason', language)} value={request.reason} /><Field label={t('rebook.sellerConfirmation', language)} value={request.sellerConfirmedUnavailable ? t('rebook.unavailableConfirmed', language) : t('rebook.awaitingConfirmation', language)} /></div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => window.alert(`${request.reason}\n\n${t('rebook.submitted', language)}: ${displayDate(request.createdAt)}`)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">{t('booking.viewDetails', language)}</button>{!request.sellerConfirmedUnavailable && ['pending', 'cancel_requested'].includes(request.status) && <button type="button" onClick={() => confirmUnavailable(request._id)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">{t('rebook.confirmUnavailable', language)}</button>}<a href={`mailto:support@safariscon.com?subject=${encodeURIComponent(`Booking change ${booking?.bookingCode || request._id}`)}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{t('rebook.messageAdmin', language)}</a></div>
        </article>;
      })}
    </div>
  </div>;
}

function Field({ label, value }) {
  const { language } = useLanguage();
  return <div className={label === t('rebook.reason', language) ? 'md:col-span-3' : ''}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-slate-700">{value || '-'}</p></div>;
}
