import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthData, rebookApi } from '../../lib/api';
import { formatRwf } from '../../lib/currency';
import RebookStatusBadge from './RebookStatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

const formatDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const remaining = (value, language) => {
  if (!value) return '-';
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return t('rebook.expired', language);
  const hours = Math.ceil(milliseconds / 3600000);
  return hours < 48 ? t('rebook.hoursRemaining', language, { n: hours }) : t('rebook.daysRemaining', language, { n: Math.ceil(hours / 24) });
};

export default function CustomerChangeRequests({ refreshKey = 0 }) {
  const { language } = useLanguage();
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
      <div className="border-b border-slate-200 p-6"><h2 className="text-xl font-black text-slate-950">{t('rebook.myRequests', language)}</h2><p className="mt-1 text-sm text-slate-500">{t('rebook.myRequestsLead', language)}</p></div>
      {loading && <p className="p-6 text-slate-500">{t('rebook.loading', language)}</p>}
      {error && <p className="m-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && !error && !requests.length && <p className="p-6 text-slate-500">{t('rebook.empty', language)}</p>}
      <div className="grid gap-4 p-4 md:p-6">
        {requests.map((request) => {
          const service = request.serviceId;
          const booking = request.originalBookingId;
          const canUse = request.status === 'rebook_id_generated' && request.rebookId;
          return <article key={request._id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="font-black text-slate-950">{service?.name || service?.businessName || t('verify.service', language)}</h3><p className="mt-1 text-xs text-slate-500">{t('rebook.originalBookingId', language)}: {booking?.bookingCode || booking?._id}</p></div><RebookStatusBadge status={request.status} /></div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Info label={t('rebook.originalDate', language)} value={formatDate(booking?.bookingDetails?.bookingDate || booking?.checkIn)} />
              <Info label={t('rebook.requestedAction', language)} value={request.requestType === 'rebook' ? t('rebook.rebook', language) : t('rebook.cancel', language)} />
              <Info label={t('rebook.validUntil', language)} value={request.expiresAt ? `${formatDate(request.expiresAt)} · ${remaining(request.expiresAt, language)}` : formatDate(request.deadlineAt)} />
              <Info label={t('rebook.reason', language)} value={request.reason} />
              <Info label={t('rebook.rebookId', language)} value={request.rebookId || t('rebook.notGenerated', language)} mono />
              <Info label={t('rebook.refundStatus', language)} value={request.requestType === 'cancel' ? `${String(request.refundStatus || 'pending').replace(/_/g, ' ')}${request.refundAmount ? ` · ${formatRwf(request.refundAmount)}` : ''}` : t('rebook.notApplicable', language)} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {request.rebookId && <button type="button" onClick={() => navigator.clipboard?.writeText(request.rebookId)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700">{t('rebook.copyId', language)}</button>}
              {canUse && <Link to={`/booking/${service?._id}?rebookId=${encodeURIComponent(request.rebookId)}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">{t('rebook.useRebook', language)}</Link>}
              <a href="mailto:support@safariscon.com" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{t('rebook.messageSupport', language)}</a>
              {request.requestType === 'cancel' && <button type="button" onClick={() => window.alert(t('rebook.refundAlert', language, { amount: formatRwf(request.refundAmount || 0), reference: request.refundReference || t('rebook.pendingRef', language) }))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{t('rebook.viewRefund', language)}</button>}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{t('rebook.timeline', language)}</p><ol className="mt-3 grid gap-2 sm:grid-cols-5">{(request.auditLogs || []).map((item, index) => <li key={`${item.event}-${index}`} className="rounded-lg bg-slate-50 p-2 text-xs"><strong className="block capitalize text-slate-800">{item.event.replace(/_/g, ' ')}</strong><span className="text-slate-500">{formatDate(item.at)}</span></li>)}</ol></div>
          </article>;
        })}
      </div>
      <p className="m-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700 md:m-6">{t('rebook.oneTimeNote', language)}</p>
    </section>
  );
}

function Info({ label, value, mono = false }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className={`mt-1 text-slate-700 ${mono ? 'font-mono font-bold' : ''}`}>{value || '-'}</dd></div>;
}
