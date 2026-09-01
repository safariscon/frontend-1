import { bookingApi } from './api';

export const PAID_STATUSES = ['deposit_paid', 'deposit-paid', 'paid'];
export const PAYABLE_BOOKING_STATUSES = ['confirmed', 'waiting-for-payment'];
export const RETRYABLE_PAYMENT_STATUSES = ['unpaid', 'pending', 'failed', ''];

export const isPaid = (booking) =>
  booking?.depositPaid === true ||
  booking?.detailsUnlocked === true ||
  PAID_STATUSES.includes(booking?.paymentStatus);

export const amountDueNow = (booking) =>
  Number(
    booking?.depositAmount ||
      booking?.lockedDetails?.visible?.depositAmountRequired ||
      booking?.totalPrice ||
      0
  );

export const remainingAtVenue = (booking) =>
  Number(booking?.remainingBalance ?? booking?.remainingAmount ?? 0);

export const canPayBooking = (booking) => {
  if (!booking || isPaid(booking)) return false;
  const paymentStatus = booking.paymentStatus || 'unpaid';
  return (
    PAYABLE_BOOKING_STATUSES.includes(booking.status) &&
    RETRYABLE_PAYMENT_STATUSES.includes(paymentStatus) &&
    amountDueNow(booking) > 0
  );
};

export const listingCancelHours = (listing) =>
  Number(listing?.cancelWindowHours ?? listing?.cancellationTerms?.windowHours ?? 6);

export const listingCancelPenalty = (listing) =>
  Number(listing?.cancelPenaltyPercent ?? listing?.cancellationTerms?.penaltyPercent ?? 20);

export const guestCancelCopy = (listing) => {
  const hours = listingCancelHours(listing);
  const penalty = listingCancelPenalty(listing);
  return `Free to visit after you pay in the app. Cancel until ${hours} hours before. Cancellation fee ${penalty}%.`;
};

export const payoutStatusLabel = (status) =>
  ({
    held: 'Held',
    pending: 'Pending',
    successful: 'Paid',
    failed: 'Failed',
    reversed: 'Reversed',
    none: '—',
  }[status] || status || '—');

export const normalizeMomoPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length >= 12) return `0${digits.slice(3, 12)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `0${digits}`;
  return digits.slice(-10);
};

export const toCollectionMethod = (value) => {
  const method = String(value || 'momo').toLowerCase();
  if (['cc', 'card', 'credit-card', 'debit-card', 'bank-card'].includes(method)) return 'cc';
  return 'momo';
};

export const paymentErrorMessage = (error) => {
  const code = error?.code || error?.payload?.code;
  const message = error?.message || 'Payment could not be completed.';
  if (error?.status === 409 && /payout/i.test(message)) {
    return 'This listing cannot accept payment yet.';
  }
  if (error?.status === 401) {
    return message && !/unauthorized/i.test(message)
      ? message
      : 'Payment could not start. Check the Mobile Money number and try again. You are still signed in.';
  }
  if (code === 'PAYMENT_FAILED' || error?.status === 402) return message;
  return message;
};

export const formatCancelUntil = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pollPaymentStatus(token, bookingId, { timeoutMs = 180000, intervalMs = 5000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await bookingApi.getPaymentStatus(token, bookingId);
    const status = result.booking?.paymentStatus || result.status || result.code;
    if (result.code === 'PAYMENT_SUCCESS' || result.code === 'PAYMENT_ALREADY_RECORDED' || isPaid(result.booking)) {
      return result;
    }
    if (result.code === 'PAYMENT_FAILED' || status === 'failed') {
      const error = new Error(result.message || 'Payment failed. You can retry.');
      error.status = 402;
      error.code = 'PAYMENT_FAILED';
      throw error;
    }
    await sleep(intervalMs);
  }
  const timeout = new Error('Payment is still pending. Approve the prompt on your phone, then refresh.');
  timeout.code = 'PAYMENT_PENDING';
  throw timeout;
}

export async function completeBookingPayment(token, bookingId, details = {}) {
  const origin = window.location.origin;
  const pmethod = toCollectionMethod(details.paymentMethod || details.pmethod);
  const phone = normalizeMomoPhone(details.cnumber || details.phone || details.senderAccount);
  const payload = {
    pmethod,
    paymentMethod: pmethod === 'cc' ? 'card' : 'momo',
    method: pmethod,
    email: details.email,
    cname: details.cname || details.name,
    name: details.cname || details.name,
    cnumber: phone,
    phone,
    senderAccount: phone,
    redirecturl: details.redirecturl || `${origin}/dashboard`,
    returl: details.returl || `${origin}/dashboard`,
    gatewayRedirectUrl: details.redirecturl || `${origin}/dashboard`,
    customerFinalUrl: details.returl || `${origin}/dashboard`,
  };

  const result = await bookingApi.payBooking(token, bookingId, payload);
  if (result.code === 'PAYMENT_SUCCESS' || result.code === 'PAYMENT_ALREADY_RECORDED' || isPaid(result.booking)) {
    return result;
  }

  if (result.code === 'PAYMENT_PENDING') {
    const checkoutUrl = result.collection?.url || result.transaction?.checkoutUrl;
    if (checkoutUrl && (result.collection?.pmethod === 'cc' || pmethod === 'cc')) {
      window.location.assign(checkoutUrl);
      return result;
    }
    return pollPaymentStatus(token, bookingId);
  }

  if (result.code === 'PAYMENT_FAILED') {
    const error = new Error(result.message || 'Payment failed. You can retry.');
    error.status = 402;
    error.code = 'PAYMENT_FAILED';
    throw error;
  }

  return result;
}

export const paidSuccessCopy = (booking) => {
  const until = formatCancelUntil(booking?.cancellation?.refundableUntil);
  const penalty = Number(booking?.cancellation?.penaltyPercent ?? 20);
  const refund = 100 - penalty;
  return until
    ? `Paid in full. Show your booking code at the venue. You can cancel until ${until}. If you cancel before then, you get ${refund}% back and ${penalty}% is a cancellation fee.`
    : 'Paid in full. Show your booking code at the venue. Money is held in the SafarisCon wallet until the cancel window ends.';
};
