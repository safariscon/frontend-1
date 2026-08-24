import { listingCancelHours, listingCancelPenalty } from './payments';

/** Outdated 30% / pay-in-full copy that should never surface on the booking form. */
export const OUTDATED_BOOKING_RULE = /30%|pay the 30%|pay the full listing price|no remaining balance at the venue|no 30% deposit/i;

/**
 * Default marketplace rules (English). Admins edit these in Settings → Booking rules.
 * Placeholders {hours}, {penalty}, {refund} are filled from the listing cancel policy.
 */
export const DEFAULT_MARKETPLACE_BOOKING_RULES = [
  'Provide accurate booking information.',
  'Pay the listing deposit in the app (Mobile Money or card). The remaining balance is due at arrival or checkout according to the provider payment policy.',
  'The deposit goes to the SafarisCon wallet. SafarisCon keeps 10% commission. The provider share is paid after the cancel window ends.',
  'You may cancel until {hours} hours before the service. Deposit refunds follow this listing\'s cancellation policy ({refund}% refund / {penalty}% fee).',
  'After the deadline, Cancel is hidden and the booking stays valid. Show your booking code at the venue.',
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
