import { listingCancelHours, listingCancelPenalty } from './payments';

/** Outdated deposit copy that should never surface on the booking form. */
export const OUTDATED_BOOKING_RULE = /30%|remaining balance is paid|advance money is not refunded|pay the 30%/i;

/**
 * Default marketplace rules (English). Admins edit these in Settings → Booking rules.
 * Placeholders {hours}, {penalty}, {refund} are filled from the listing cancel policy.
 */
export const DEFAULT_MARKETPLACE_BOOKING_RULES = [
  'Provide accurate booking information.',
  'Pay the full listing price in the app (Mobile Money or card). There is no 30% deposit and no remaining balance at the venue.',
  'Payment goes to the SafarisCon wallet. The provider is paid after the cancel window ends — not at the moment you pay.',
  'You may cancel until {hours} hours before the service. If you cancel in time, you get {refund}% back and {penalty}% is a cancellation fee. This listing may use different hours or %.',
  'After the deadline, Cancel is hidden and the booking stays valid. Show your booking code at the venue. There is no second payment on arrival.',
];

export const normalizeBookingRules = (rules = []) =>
  (Array.isArray(rules) ? rules : String(rules || '').split('\n'))
    .map((rule) => String(rule || '').trim())
    .filter((rule) => rule && !OUTDATED_BOOKING_RULE.test(rule));

export const interpolateBookingRule = (rule, listing) => {
  const hours = listingCancelHours(listing);
  const penalty = listingCancelPenalty(listing);
  const refund = Math.max(0, 100 - penalty);
  return String(rule || '')
    .replace(/\{hours\}/gi, String(hours))
    .replace(/\{penalty\}/gi, String(penalty))
    .replace(/\{refund\}/gi, String(refund));
};

/**
 * Rules shown on the customer booking form.
 * Prefer admin marketplace settings; fall back to translated built-ins when settings are empty.
 */
export const resolveCustomerBookingRules = ({ marketplaceRules, listing, fallbackRules = [] }) => {
  const fromSettings = normalizeBookingRules(marketplaceRules)
    .map((rule) => interpolateBookingRule(rule, listing));
  if (fromSettings.length) return fromSettings;
  return (fallbackRules || []).filter(Boolean);
};
