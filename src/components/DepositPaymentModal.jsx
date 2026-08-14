import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatRwf } from '../lib/currency';
import { paymentsApi } from '../lib/api';
import { amountDueNow, remainingAtVenue, toCollectionMethod } from '../lib/payments';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';

export default function DepositPaymentModal({ booking, customer, onClose, onConfirm }) {
  const [catalog, setCatalog] = useState(null);
  const [method, setMethod] = useState('momo');
  const [account, setAccount] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [name, setName] = useState(customer?.name || '');
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [error, setError] = useState('');
  const serviceId = booking.hotelId?._id || booking.hotelId || booking.preferredHotelId?._id || booking.preferredHotelId || booking.priceSnapshot?.serviceId;
  const closeAsCancelled = useCallback(() => {
    trackAnalytics(ANALYTICS_EVENTS.PAYMENT_FAILED, { serviceId, bookingId: booking._id });
    onClose();
  }, [booking._id, onClose, serviceId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) closeAsCancelled();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeAsCancelled, submitting]);

  useEffect(() => {
    trackAnalytics(ANALYTICS_EVENTS.PAY_DEPOSIT_CLICKED, { serviceId, bookingId: booking._id });
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
  }, [booking._id, serviceId]);

  const due = amountDueNow(booking);
  const remaining = remainingAtVenue(booking);
  const serviceName = booking.priceSnapshot?.name || booking.bookingDetails?.requestedService || booking.destinationPlace || 'Selected service';
  const people = booking.bookingDetails?.numberOfPeople ?? booking.numberOfPeople ?? booking.priceSnapshot?.people ?? 1;
  const quantity = booking.quantity ?? booking.bookingDetails?.quantity ?? booking.priceSnapshot?.quantity ?? 1;
  const totalUnits = booking.totalConsumptionUnits ?? booking.bookingDetails?.totalConsumptionUnits ?? Number(people || 1) * Number(quantity || 1);
  const methods = catalog?.collectionMethods?.length
    ? catalog.collectionMethods
    : [
        { id: 'momo', name: 'Mobile Money' },
        { id: 'cc', name: 'Card' },
      ];

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const pmethod = toCollectionMethod(method);
    if (pmethod === 'momo' && !/^07\d{8}$/.test(account.replace(/\D/g, '').replace(/^250/, '0').slice(-10).replace(/^7/, '07'))) {
      const digits = account.replace(/\D/g, '');
      const normalized = digits.startsWith('250') ? `0${digits.slice(3, 12)}` : digits.length === 9 ? `0${digits}` : digits.slice(-10);
      if (!/^07\d{8}$/.test(normalized)) {
        setError('Enter a 10-digit Mobile Money number such as 07XXXXXXXX.');
        setSubmitting(false);
        return;
      }
    }
    try {
      setStatusNote(pmethod === 'cc' ? 'Opening card checkout…' : 'Ask the customer to approve the prompt on their phone.');
      await onConfirm({
        paymentMethod: pmethod,
        pmethod,
        senderAccount: account.trim(),
        cnumber: account.trim(),
        email: email.trim(),
        cname: name.trim(),
      });
    } catch (requestError) {
      trackAnalytics(ANALYTICS_EVENTS.PAYMENT_FAILED, { serviceId, bookingId: booking._id });
      setError(requestError.message || 'Payment could not be completed.');
      setStatusNote('');
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="deposit-payment-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) closeAsCancelled(); }}>
      <form onSubmit={submit} className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.4)]">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl">▣</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Secure booking payment</p>
                <h2 id="deposit-payment-title" className="mt-1 text-2xl font-black">Pay in full</h2>
              </div>
            </div>
            <button type="button" disabled={submitting} onClick={closeAsCancelled} aria-label="Close payment" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xl font-bold hover:bg-white/25 disabled:opacity-50">×</button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Booking summary</p>
            <h3 className="mt-1 font-black text-blue-950">{serviceName}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <PaymentAmount label="Pay now" value={formatRwf(due)} primary />
              <PaymentAmount label="Remaining at venue" value={formatRwf(remaining)} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <PaymentAmount label="People" value={people} />
              <PaymentAmount label="Quantity" value={quantity} />
              <PaymentAmount label="Total units" value={totalUnits} />
            </div>
          </div>

          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            You pay the full amount now. Money is held until the cancel window ends. See{' '}
            <Link to="/payments" className="font-bold text-primary hover:underline">Payments & refunds</Link>.
          </p>

          {booking.paymentReason && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{booking.paymentReason}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Payment method
              <select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {methods.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Name on payment
              <input required value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">{toCollectionMethod(method) === 'cc' ? 'Phone' : 'MoMo number (07XXXXXXXX)'}
              <input required autoFocus value={account} onChange={(event) => setAccount(event.target.value)} placeholder="0780371519" className="rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>

          {statusNote && <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">{statusNote}</p>}
          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            <span aria-hidden="true">▣</span>{submitting ? 'Processing payment…' : `Pay ${formatRwf(due)} securely`}
          </button>
          <p className="mt-3 text-center text-xs font-medium text-slate-500">Provider details, booking PDF, and QR confirmation unlock only after successful payment. The hotel is not paid at this moment.</p>
        </div>
      </form>
    </div>,
    document.body
  );
}

function PaymentAmount({ label, value, primary = false }) {
  return <div className={`rounded-xl p-3 ${primary ? 'bg-primary text-white' : 'bg-white text-slate-900'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${primary ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
