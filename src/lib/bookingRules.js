import { listingCancelHours, listingCancelPenalty } from './payments';

/** Outdated 30% / pay-in-full copy that should never surface on the booking form. */
export const OUTDATED_BOOKING_RULE = /30%|pay the 30%|pay the full listing price|no remaining balance at the venue|no 30% deposit/i;

/** Internal commission copy — configured in admin commission %, not shown to customers. */
export const INTERNAL_BOOKING_RULE = /commission is \d+%|commission.*full booking price/i;

export const CANCEL_RULE_TOKENS = ['{hours}', '{penalty}', '{refund}'];

export const isCancelRuleTemplate = (rule) => /\{hours\}|\{penalty\}|\{refund\}/i.test(String(rule || ''));

export const isInternalBookingRule = (rule) => INTERNAL_BOOKING_RULE.test(String(rule || ''));

export const DEFAULT_STATIC_BOOKING_RULES = [
  'Provide accurate booking information.',
  'Pay the listing deposit in the app (Mobile Money or card). The remaining balance is due at arrival or checkout according to the provider payment policy.',
  'After the deadline, Cancel is hidden and the booking stays valid. Show your booking code at the venue.',
];

export const DEFAULT_CANCEL_BOOKING_RULE =
  'You may cancel until {hours} hours before the service. Deposit refunds follow this listing\'s cancellation policy ({refund}% refund / {penalty}% fee).';

/**
 * Default marketplace rules (English). Admins edit these in Settings → Booking rules.
 * Placeholders {hours}, {penalty}, {refund} are filled from the listing cancel policy.
 */
export const DEFAULT_MARKETPLACE_BOOKING_RULES = [
  DEFAULT_STATIC_BOOKING_RULES[0],
  DEFAULT_STATIC_BOOKING_RULES[1],
  DEFAULT_CANCEL_BOOKING_RULE,
  DEFAULT_STATIC_BOOKING_RULES[2],
];

/** Sample listing used in the admin preview panel. */
export const BOOKING_RULES_PREVIEW_LISTING = {
  cancelWindowHours: 48,
  cancelPenaltyPercent: 20,
};

export const parseBookingRulesForAdmin = (rules = []) => {
  const normalized = normalizeBookingRules(rules);
  const cancelRule = normalized.find(isCancelRuleTemplate) || DEFAULT_CANCEL_BOOKING_RULE;
  const staticRules = normalized.filter((rule) => !isCancelRuleTemplate(rule));
  return {
    staticRules: staticRules.length ? staticRules : DEFAULT_STATIC_BOOKING_RULES.filter((rule) => !isCancelRuleTemplate(rule)),
    cancelRule,
  };
};

export const composeBookingRules = ({ staticRules = [], cancelRule = DEFAULT_CANCEL_BOOKING_RULE } = {}) => {
  const cleanedStatic = (staticRules || [])
    .map((rule) => String(rule || '').trim())
    .filter((rule) => rule && !isCancelRuleTemplate(rule) && !isInternalBookingRule(rule) && !OUTDATED_BOOKING_RULE.test(rule));
  const cancel = String(cancelRule || DEFAULT_CANCEL_BOOKING_RULE).trim();
  const afterIdx = cleanedStatic.findIndex((rule) => /after the deadline/i.test(rule));
  if (afterIdx >= 0) return [...cleanedStatic.slice(0, afterIdx), cancel, ...cleanedStatic.slice(afterIdx)];
  return [...cleanedStatic, cancel];
};

export const normalizeBookingRules = (rules = []) =>
  (Array.isArray(rules) ? rules : String(rules || '').split('\n'))
    .map((rule) => String(rule || '').trim())
    .filter((rule) => rule && !OUTDATED_BOOKING_RULE.test(rule) && !isInternalBookingRule(rule));

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
