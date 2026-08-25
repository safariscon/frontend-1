import { formatDisplayDate } from '../../lib/availability';
import { stayBookingFacts, stayNights } from '../../lib/stayDisplay';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

function Fact({ label, value }) {
  if (value && typeof value === 'object') return null;
  if (!value && value !== 0) return null;
  return (
    <div className="rounded-lg bg-white/90 px-3 py-2 dark:bg-slate-950/70">
      <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{String(value)}</dd>
    </div>
  );
}

export default function StayValidityPanel({
  listing,
  option,
  availability,
  dateMin,
  dateMax,
  remaining,
  quantity,
  checkIn,
  checkOut,
}) {
  const { language } = useLanguage();
  const facts = stayBookingFacts({ listing, option, availability, dateMin, dateMax, remaining, quantity });
  const nights = stayNights(checkIn, checkOut);

  return (
    <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <p className="text-xs font-black uppercase tracking-wide text-primary">{t('booking.stayRules.title', language)}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('booking.stayRules.lead', language)}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <Fact
          label={t('booking.stayRules.openFrom', language)}
          value={facts.anytime ? t('booking.stayRules.openAnytime', language) : formatDisplayDate(facts.checkInFrom)}
        />
        <Fact
          label={t('booking.stayRules.lastCheckout', language)}
          value={facts.lastCheckOut ? formatDisplayDate(facts.lastCheckOut) : t('booking.stayRules.noEndDate', language, { n: facts.maxStayNights })}
        />
        <Fact
          label={t('booking.stayRules.maxStay', language)}
          value={t('booking.stayRules.nightsMax', language, { n: facts.maxStayNights })}
        />
        <Fact
          label={t('booking.stayRules.guests', language)}
          value={facts.maxGuests ? t('booking.stayRules.guestsRange', language, { n: facts.maxGuests }) : t('booking.stayRules.guestsAsk', language)}
        />
        <Fact
          label={t('booking.stayRules.firstCheckIn', language)}
          value={facts.firstCheckIn ? formatDisplayDate(facts.firstCheckIn) : t('booking.stayRules.openAnytime', language)}
        />
        {facts.horizonDays ? (
          <Fact
            label={t('booking.stayRules.horizon', language)}
            value={t('booking.stayRules.horizonDays', language, { n: facts.horizonDays })}
          />
        ) : null}
        {facts.checkInHours ? <Fact label={t('booking.stayRules.checkInHours', language)} value={facts.checkInHours} /> : null}
        {facts.checkOutHours ? <Fact label={t('booking.stayRules.checkOutHours', language)} value={facts.checkOutHours} /> : null}
        {facts.remaining != null ? (
          <Fact
            label={t('booking.stayRules.left', language)}
            value={
              facts.remaining <= 0
                ? t('booking.stayRules.noneLeft', language)
                : facts.units
                  ? t('booking.stayRules.leftOf', language, { left: facts.remaining, total: facts.units })
                  : String(facts.remaining)
            }
          />
        ) : null}
        {facts.allowsChildren ? <Fact label={t('booking.stayRules.children', language)} value={facts.allowsChildren} /> : null}
        {facts.allowsPets ? <Fact label={t('booking.stayRules.pets', language)} value={facts.allowsPets} /> : null}
      </dl>
      {nights > 0 ? (
        <p className={`mt-3 text-sm font-bold ${nights > facts.maxStayNights ? 'text-red-700' : 'text-slate-800 dark:text-slate-100'}`}>
          {t('booking.stayRules.nightsSelected', language, { nights, max: facts.maxStayNights })}
        </p>
      ) : null}
    </div>
  );
}
