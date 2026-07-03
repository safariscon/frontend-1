import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatRwf } from '../lib/currency';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';

export default function DepositPaymentModal({ booking, customer, onClose, onConfirm }) {
  const [method, setMethod] = useState('mobile-money');
  const [account, setAccount] = useState(customer?.phone || customer?.email || '');
  const [submitting, setSubmitting] = useState(false);
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
  }, [booking._id, serviceId]);

  const deposit = Number(booking.depositAmount || Math.round(Number(booking.totalPrice || 0) * 0.3));
  const total = Number(booking.totalPrice || booking.priceSnapshot?.totalPrice || 0);
  const remaining = Number(booking.remainingBalance ?? Math.max(0, total - deposit));
  const serviceName = booking.priceSnapshot?.name || booking.bookingDetails?.requestedService || booking.destinationPlace || 'Selected service';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onConfirm({ paymentMethod: method, senderAccount: account.trim() });
    } catch (requestError) {
      trackAnalytics(ANALYTICS_EVENTS.PAYMENT_FAILED, { serviceId, bookingId: booking._id });
      setError(requestError.message || 'Payment could not be completed.');
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
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Secure booking payment</p><h2 id="deposit-payment-title" className="mt-1 text-2xl font-black">Pay the 30% deposit</h2></div>
            </div>
            <button type="button" disabled={submitting} onClick={closeAsCancelled} aria-label="Close payment" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xl font-bold hover:bg-white/25 disabled:opacity-50">×</button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Booking summary</p>
            <h3 className="mt-1 font-black text-blue-950">{serviceName}</h3>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <PaymentAmount label="Full price" value={formatRwf(total)} />
              <PaymentAmount label="Pay now" value={formatRwf(deposit)} primary />
              <PaymentAmount label="Balance" value={formatRwf(remaining)} />
            </div>
          </div>

          {booking.paymentReason && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{booking.paymentReason}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Payment method
              <select value={method} onChange={(event) => setMethod(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="mobile-money">Mobile Money</option>
                <option value="bank-card">Bank card</option>
                <option value="bank-transfer">Bank transfer</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Phone or account
              <input required autoFocus value={account} onChange={(event) => setAccount(event.target.value)} placeholder="+250 7XX XXX XXX" className="rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            <span aria-hidden="true">▣</span>{submitting ? 'Processing payment…' : `Pay ${formatRwf(deposit)} securely`}
          </button>
          <p className="mt-3 text-center text-xs font-medium text-slate-500">Provider details, booking PDF, and QR confirmation unlock only after successful payment.</p>
        </div>
      </form>
    </div>,
    document.body
  );
}

function PaymentAmount({ label, value, primary = false }) {
  return <div className={`rounded-xl p-3 ${primary ? 'bg-primary text-white' : 'bg-white text-slate-900'}`}><p className={`text-[10px] font-bold uppercase tracking-wide ${primary ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
