import { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';
import {
  BOOKING_RULES_PREVIEW_LISTING,
  CANCEL_RULE_TOKENS,
  DEFAULT_CANCEL_BOOKING_RULE,
  DEFAULT_MARKETPLACE_BOOKING_RULES,
  DEFAULT_STATIC_BOOKING_RULES,
  composeBookingRules,
  parseBookingRulesForAdmin,
  resolveCustomerBookingRules,
} from '../../lib/bookingRules';

const TOKEN_LABELS = {
  '{hours}': 'cancelTokenHours',
  '{penalty}': 'cancelTokenPenalty',
  '{refund}': 'cancelTokenRefund',
};

export default function BookingRulesEditor({ bookingRules = [], onChange }) {
  const { language } = useLanguage();
  const { staticRules, cancelRule } = useMemo(
    () => parseBookingRulesForAdmin(bookingRules),
    [bookingRules],
  );

  const previewRules = useMemo(() => (
    resolveCustomerBookingRules({
      marketplaceRules: composeBookingRules({ staticRules, cancelRule }),
      listing: BOOKING_RULES_PREVIEW_LISTING,
      fallbackRules: [],
    })
  ), [staticRules, cancelRule]);

  const updateStaticRule = (index, value) => {
    const next = staticRules.map((rule, ruleIndex) => (ruleIndex === index ? value : rule));
    onChange(composeBookingRules({ staticRules: next, cancelRule }));
  };

  const addStaticRule = () => {
    onChange(composeBookingRules({ staticRules: [...staticRules, ''], cancelRule }));
  };

  const removeStaticRule = (index) => {
    onChange(composeBookingRules({
      staticRules: staticRules.filter((_, ruleIndex) => ruleIndex !== index),
      cancelRule,
    }));
  };

  const updateCancelRule = (value) => {
    onChange(composeBookingRules({ staticRules, cancelRule: value }));
  };

  const insertCancelToken = (token) => {
    updateCancelRule(`${cancelRule || ''}${token}`);
  };

  const loadDefaultRules = () => {
    onChange([...DEFAULT_MARKETPLACE_BOOKING_RULES]);
  };

  return (
    <div className="grid gap-5">
      <div>
        <span className="text-sm font-semibold text-gray-700">{t('admin.globalRules', language)}</span>
        <p className="mt-1 text-xs text-gray-500">{t('admin.globalRulesHelp', language)}</p>
        <div className="mt-3 space-y-3">
          {staticRules.map((rule, index) => (
            <div key={`rule-${index}`} className="flex gap-2">
              <input
                type="text"
                value={rule}
                onChange={(event) => updateStaticRule(index, event.target.value)}
                placeholder={DEFAULT_STATIC_BOOKING_RULES[index] || t('admin.rulePlaceholder', language)}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm"
              />
              {staticRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStaticRule(index)}
                  className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  {t('admin.remove', language)}
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addStaticRule} className="mt-3 text-sm font-bold text-primary hover:underline">
          {t('admin.addRule', language)}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-gray-800">{t('admin.cancelRuleTitle', language)}</p>
        <p className="mt-1 text-xs text-gray-600">{t('admin.cancelRuleHelp', language)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CANCEL_RULE_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertCancelToken(token)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary"
            >
              {t(`admin.${TOKEN_LABELS[token]}`, language)}
            </button>
          ))}
        </div>
        <textarea
          value={cancelRule}
          onChange={(event) => updateCancelRule(event.target.value)}
          rows={3}
          placeholder={DEFAULT_CANCEL_BOOKING_RULE}
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
        />
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-950">{t('admin.rulesPreviewTitle', language)}</p>
        <p className="mt-1 text-xs text-blue-800">{t('admin.rulesPreviewSample', language)}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-950">
          {previewRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={loadDefaultRules} className="text-sm font-bold text-primary hover:underline md:w-fit">
        {t('admin.loadDefaultRules', language)}
      </button>
    </div>
  );
}
