import { resolveRentalLocations } from '../../lib/rentalLocations';
import { stayBookingFacts, stayNights } from '../../lib/stayDisplay';
import { formatDisplayDate } from '../../lib/availability';
import { domainCopy } from '../../features/domain/registry';
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
  copy: copyProp,
  rentalLocations: rentalLocationsProp,
}) {
  const { language } = useLanguage();
  const copy = copyProp || domainCopy(listing);
  const rentalLocations = rentalLocationsProp || (copy.kind === 'rental' ? resolveRentalLocations(listing) : null);
  const facts = stayBookingFacts({ listing, option, availability, dateMin, dateMax, remaining, quantity });
  const nights = stayNights(checkIn, checkOut);
  const rental = copy.kind === 'rental';
  const selectedDays = rental ? nights : nights;
  const maxDays = rental
    ? (facts.maxRentalDays || facts.maxStayNights)
    : facts.maxStayNights;
  const remainingLabel = rental
    ? (facts.remaining <= 0
      ? 'None left'
      : facts.units
        ? `${facts.remaining} of ${facts.units} ${facts.units === 1 ? copy.unitNoun : copy.unitNounPlural}`
        : String(facts.remaining))
    : (facts.remaining <= 0
      ? t('booking.stayRules.noneLeft', language)
      : facts.units
        ? t('booking.stayRules.leftOf', language, { left: facts.remaining, total: facts.units })
        : String(facts.remaining));

  return (
    <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <p className="text-xs font-black uppercase tracking-wide text-primary">
        {rental ? 'Rental rules' : t('booking.stayRules.title', language)}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {rental
          ? t('domain.transport.rentalRulesLead', language)
          : t('booking.stayRules.lead', language)}
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rental && rentalLocations?.pickupLocation ? (
          <Fact label={t('domain.transport.pickupLocation', language)} value={rentalLocations.pickupLocation} />
        ) : null}
        {rental && rentalLocations?.returnLocation ? (
          <Fact label={t('domain.transport.returnLocation', language)} value={rentalLocations.returnLocation} />
        ) : null}
        <Fact
          label={rental ? copy.startFromLabel : t('booking.stayRules.openFrom', language)}
          value={facts.anytime ? (rental ? 'Open calendar' : t('booking.stayRules.openAnytime', language)) : formatDisplayDate(facts.checkInFrom)}
        />
        <Fact
          label={rental ? copy.lastEndLabel : t('booking.stayRules.lastCheckout', language)}
          value={facts.lastCheckOut ? formatDisplayDate(facts.lastCheckOut) : (rental ? `Up to ${facts.maxRentalDays || facts.maxStayNights} days` : t('booking.stayRules.noEndDate', language, { n: facts.maxStayNights }))}
        />
        {rental ? (
          <>
            <Fact label="Minimum rental" value={`${facts.minRentalDays} day${facts.minRentalDays === 1 ? '' : 's'}`} />
            <Fact label="Maximum rental" value={facts.maxRentalDays ? `${facts.maxRentalDays} days` : `${facts.maxStayNights} days`} />
            {facts.pickupHours ? <Fact label={copy.hoursStartLabel} value={facts.pickupHours} /> : null}
            {facts.returnHours ? <Fact label={copy.hoursEndLabel} value={facts.returnHours} /> : null}
          </>
        ) : (
          <>
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
            {facts.allowsChildren ? <Fact label={t('booking.stayRules.children', language)} value={facts.allowsChildren} /> : null}
            {facts.allowsPets ? <Fact label={t('booking.stayRules.pets', language)} value={facts.allowsPets} /> : null}
          </>
        )}
        {facts.remaining != null ? (
          <Fact
            label={rental ? copy.capacityLabel : t('booking.stayRules.left', language)}
            value={remainingLabel}
          />
        ) : null}
      </dl>
      {selectedDays > 0 ? (
        <p className={`mt-3 text-sm font-bold ${selectedDays > maxDays ? 'text-red-700' : 'text-slate-800 dark:text-slate-100'}`}>
          {rental
            ? `${selectedDays} day${selectedDays === 1 ? '' : 's'} selected · max ${maxDays} days`
            : t('booking.stayRules.nightsSelected', language, { nights: selectedDays, maxNights: facts.maxStayNights })}
        </p>
      ) : null}
    </div>
  );
}
