import { Field, FieldGrid } from './Field';
import { resolveDomain, resolveSubtype } from './registry';
import { addDaysIso } from '../../lib/staySearch';
import { formatDisplayDate } from '../../lib/availability';
import { stayBookingFacts } from '../../lib/stayDisplay';
import StayValidityPanel from '../../components/listing/StayValidityPanel';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

const addDay = (iso) => addDaysIso(iso, 1);

export default function BookingFields({
  category,
  listing,
  option,
  availability,
  remaining,
  quantity,
  values = {},
  onChange,
  errors = {},
  dateMin,
  dateMax,
}) {
  const domain = resolveDomain(category || listing);
  const subtype = resolveSubtype(category || listing);
  const { language } = useLanguage();
  const set = (key, value) => onChange({ ...values, [key]: value });

  if (domain === 'accommodation') {
    const listingDetails = listing?.listingAttributes || {};
    const plans = listingDetails.ratePlans || {};
    const rateOptions = ['standard'];
    if (plans.nonRefundable?.enabled) rateOptions.push('non_refundable');
    if (plans.weekly?.enabled) rateOptions.push('weekly');
    const facts = stayBookingFacts({
      listing,
      option,
      availability,
      dateMin,
      dateMax,
      remaining,
      quantity,
    });
    const checkoutMin = values.checkIn && dateMin && values.checkIn >= dateMin
      ? addDay(values.checkIn)
      : (dateMin ? addDay(dateMin) : undefined);
    const lastCheckIn = dateMax ? addDaysIso(dateMax, -1) : undefined;
    const checkInMax = lastCheckIn && dateMin && lastCheckIn < dateMin ? dateMin : lastCheckIn;
    return (
      <FieldGrid title={t('booking.stayRules.formTitle', language)} hint={t('booking.stayRules.lead', language)}>
        <StayValidityPanel
          listing={listing}
          option={option}
          availability={availability}
          dateMin={dateMin}
          dateMax={dateMax}
          remaining={remaining}
          quantity={quantity}
          checkIn={values.checkIn}
          checkOut={values.checkOut}
        />
        <Field
          label={t('searchBar.checkIn', language)}
          type="date"
          required
          min={dateMin}
          max={checkInMax || dateMax}
          value={values.checkIn}
          error={errors.checkIn}
          help={dateMin ? t('booking.stayRules.checkInHelp', language, { date: formatDisplayDate(dateMin) }) : ''}
          onChange={(value) => set('checkIn', value)}
        />
        <Field
          label={t('searchBar.checkOut', language)}
          type="date"
          required
          min={checkoutMin}
          max={dateMax}
          value={values.checkOut}
          error={errors.checkOut}
          help={dateMax ? t('booking.stayRules.checkOutHelp', language, { date: formatDisplayDate(dateMax) }) : t('booking.stayRules.noEndDate', language, { n: facts.maxStayNights })}
          onChange={(value) => set('checkOut', value)}
        />
        <Field
          label={t('booking.stayRules.guests', language)}
          type="number"
          required
          min="1"
          max={facts.maxGuests || undefined}
          value={values.guests}
          error={errors.guests}
          help={facts.maxGuests ? t('booking.stayRules.guestsHelp', language, { n: facts.maxGuests }) : ''}
          onChange={(value) => {
            const next = Number(value);
            if (facts.maxGuests && next > facts.maxGuests) set('guests', facts.maxGuests);
            else set('guests', value);
          }}
        />
        {rateOptions.length > 1 ? (
          <Field
            label="Rate plan"
            type="select"
            value={values.ratePlan || 'standard'}
            options={rateOptions}
            onChange={(value) => set('ratePlan', value)}
            help={plans.weekly?.enabled ? `Weekly rate needs at least ${plans.weekly.minNights || 7} nights.` : ''}
          />
        ) : null}
        <Field label="Special requests" type="textarea" value={values.specialRequests} onChange={(value) => set('specialRequests', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'transport' && subtype === 'taxi') {
    return (
      <FieldGrid title="Trip details">
        <Field label="Pickup location" required value={values.pickupLocation} error={errors.pickupLocation} onChange={(value) => set('pickupLocation', value)} />
        <Field label="Drop-off location" required value={values.dropoffLocation} error={errors.dropoffLocation} onChange={(value) => set('dropoffLocation', value)} />
        <Field label="Pickup date/time" type="datetime-local" required value={values.pickupDateTime} error={errors.pickupDateTime} onChange={(value) => set('pickupDateTime', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'transport') {
    return (
      <FieldGrid title="Rental details">
        <Field label="Pickup location" required value={values.pickupLocation} error={errors.pickupLocation} onChange={(value) => set('pickupLocation', value)} />
        <Field label="Return location" required value={values.returnLocation} error={errors.returnLocation} onChange={(value) => set('returnLocation', value)} />
        <Field label="Pickup date/time" type="datetime-local" required value={values.pickupDateTime} error={errors.pickupDateTime} onChange={(value) => set('pickupDateTime', value)} />
        <Field label="Return date/time" type="datetime-local" required value={values.returnDateTime} error={errors.returnDateTime} onChange={(value) => set('returnDateTime', value)} />
        {subtype === 'car-rental' ? (
          <>
            <Field label="Driver age" type="number" required min="18" value={values.driverAge} error={errors.driverAge} onChange={(value) => set('driverAge', value)} />
            <Field label="Driver license number" required value={values.driverLicenseNumber} error={errors.driverLicenseNumber} onChange={(value) => set('driverLicenseNumber', value)} />
            <Field label="Number of drivers" type="number" required min="1" value={values.numberOfDrivers} onChange={(value) => set('numberOfDrivers', value)} />
          </>
        ) : null}
      </FieldGrid>
    );
  }

  if (domain === 'experiences') {
    return (
      <FieldGrid title="Experience details">
        <Field label="Preferred date" type="date" required value={values.preferredDate} error={errors.preferredDate} onChange={(value) => set('preferredDate', value)} />
        <Field label="Participants" type="number" required min="1" value={values.participants} error={errors.participants} onChange={(value) => set('participants', value)} />
        <Field label="Adults" type="number" min="0" value={values.adults} onChange={(value) => set('adults', value)} />
        <Field label="Children" type="number" min="0" value={values.children} onChange={(value) => set('children', value)} />
        <Field label="Preferred language" value={values.language} onChange={(value) => set('language', value)} />
        <Field label="Need pickup" type="boolean" value={values.pickupRequired} onChange={(value) => set('pickupRequired', value)} />
        <Field label="Special requirements" type="textarea" value={values.specialRequirements} onChange={(value) => set('specialRequirements', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'dining') {
    return (
      <FieldGrid title="Reservation">
        <Field label="Reservation date/time" type="datetime-local" required value={values.reservationDateTime} error={errors.reservationDateTime} onChange={(value) => set('reservationDateTime', value)} />
        <Field label="Party size" type="number" required min="1" value={values.partySize} error={errors.partySize} onChange={(value) => set('partySize', value)} />
        {subtype === 'restaurant' ? (
          <Field label="Allergies" type="textarea" value={values.allergies} onChange={(value) => set('allergies', value)} />
        ) : null}
        <Field label="Special requests" type="textarea" value={values.specialRequests} onChange={(value) => set('specialRequests', value)} />
      </FieldGrid>
    );
  }

  return (
    <FieldGrid title="Event details">
      <Field label="Event date" type="date" required value={values.eventDate} error={errors.eventDate} onChange={(value) => set('eventDate', value)} />
      <Field label="Start time" type="time" required value={values.startTime} error={errors.startTime} onChange={(value) => set('startTime', value)} />
      <Field label="End time" type="time" required value={values.endTime} error={errors.endTime} onChange={(value) => set('endTime', value)} />
      <Field label="Attendees" type="number" required min="1" value={values.attendees} error={errors.attendees} onChange={(value) => set('attendees', value)} />
      <Field label="Setup style" value={values.setupStyle} placeholder="Theatre, banquet, U-shape" onChange={(value) => set('setupStyle', value)} />
      <Field label="AV needs" type="textarea" value={values.avNeeds} onChange={(value) => set('avNeeds', value)} />
      <Field label="Catering" type="textarea" value={values.catering} onChange={(value) => set('catering', value)} />
    </FieldGrid>
  );
}
