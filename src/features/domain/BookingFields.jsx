import { Field, FieldGrid } from './Field';
import LicencePhotoField from './LicencePhotoField';
import {
  domainCopy,
  joinDateTimeValue,
  licenceClassOptions,
  motorbikeCategoryOptions,
  resolveDomain,
  resolveRentalLocations,
  resolveSubtype,
  splitDateTimeValue,
} from './registry';
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
    const listingDetails = listing?.listingAttributes || {};
    const copy = domainCopy(category || listing);
    const pickupHours = listingDetails.pickupTime || '08:00';
    const returnHours = listingDetails.returnTime || '18:00';
    const minDays = Number(listingDetails.minRentalDays) || 1;
    const maxDays = Number(listingDetails.maxRentalDays) || 30;
    const pickup = splitDateTimeValue(values.pickupDateTime);
    const ret = splitDateTimeValue(values.returnDateTime);
    const returnMin = pickup.date ? addDaysIso(pickup.date, 1) : (dateMin ? addDaysIso(dateMin, 1) : undefined);
    const lastPickup = dateMax ? addDaysIso(dateMax, -1) : undefined;
    const pickupMax = lastPickup && dateMin && lastPickup < dateMin ? dateMin : lastPickup;
    const patchDateTime = (key, date, time) => set(key, joinDateTimeValue(date, time));

    const needsLicence = subtype === 'car-rental' || subtype === 'motorbike';
    const requireLicencePhotos = listingDetails.requireLicenceUpload !== false;
    const rentalLocations = resolveRentalLocations(listing);
    const allowedClasses = Array.isArray(listingDetails.allowedLicenceClasses) && listingDetails.allowedLicenceClasses.length
      ? licenceClassOptions(subtype, language).filter((option) => listingDetails.allowedLicenceClasses.includes(option.value))
      : licenceClassOptions(subtype, language);

    return (
      <FieldGrid title={t('domain.transport.rentalDetailsTitle', language)} hint={t('domain.transport.rentalDetailsHint', language)}>
        <StayValidityPanel
          listing={listing}
          option={option}
          availability={availability}
          dateMin={dateMin}
          dateMax={dateMax}
          remaining={remaining}
          quantity={quantity}
          checkIn={pickup.date}
          checkOut={ret.date}
          copy={copy}
          rentalLocations={rentalLocations}
        />
        {subtype === 'motorbike' ? (
          <Field
            label={t('domain.transport.moto.selectedCategory', language)}
            type="radio"
            wide
            options={motorbikeCategoryOptions(language)}
            value={values.selectedCategory || ''}
            error={errors.selectedCategory}
            help={t('domain.transport.moto.selectedCategoryHelp', language)}
            onChange={(value) => set('selectedCategory', value)}
          />
        ) : null}
        <Field
          label={t('domain.transport.pickupDate', language)}
          type="date"
          required
          min={dateMin}
          max={pickupMax || dateMax}
          value={pickup.date}
          error={errors.pickupDateTime}
          help={dateMin ? `Earliest pickup: ${formatDisplayDate(dateMin)}` : ''}
          onChange={(value) => {
            const nextReturn = !ret.date || ret.date <= value ? addDaysIso(value, Math.max(1, minDays)) : ret.date;
            onChange({
              ...values,
              pickupDateTime: joinDateTimeValue(value, pickup.time || pickupHours),
              returnDateTime: joinDateTimeValue(nextReturn, ret.time || returnHours),
            });
          }}
        />
        <Field
          label="Pickup time"
          type="time"
          required
          min={pickupHours}
          value={pickup.time || pickupHours}
          error={errors.pickupDateTime}
          help={`Desk opens at ${pickupHours}.`}
          onChange={(value) => patchDateTime('pickupDateTime', pickup.date, value)}
        />
        <Field
          label="Return date"
          type="date"
          required
          min={returnMin}
          max={dateMax}
          value={ret.date}
          error={errors.returnDateTime}
          help={`Minimum ${minDays} day${minDays === 1 ? '' : 's'}${maxDays ? `, maximum ${maxDays} days` : ''}.`}
          onChange={(value) => patchDateTime('returnDateTime', value, ret.time || returnHours)}
        />
        <Field
          label="Return time"
          type="time"
          required
          max={returnHours}
          value={ret.time || returnHours}
          error={errors.returnDateTime}
          help={`Return by ${returnHours}.`}
          onChange={(value) => patchDateTime('returnDateTime', ret.date, value)}
        />
        {subtype === 'car-rental' ? (
          <>
            <Field label={t('domain.transport.driverAge', language)} type="number" required min="18" value={values.driverAge} error={errors.driverAge} onChange={(value) => set('driverAge', value)} />
            <Field label={t('domain.transport.numberOfDrivers', language)} type="number" required min="1" value={values.numberOfDrivers} onChange={(value) => set('numberOfDrivers', value)} />
          </>
        ) : null}
        {subtype === 'motorbike' ? (
          <Field
            label={t('domain.transport.moto.riderAge', language)}
            type="number"
            required
            min={Number(listingDetails.minimumDriverAge) || 16}
            value={values.driverAge}
            error={errors.driverAge}
            onChange={(value) => set('driverAge', value)}
          />
        ) : null}
        {needsLicence ? (
          <>
            <Field
              label={t('domain.transport.licence.number', language)}
              required
              value={values.driverLicenseNumber}
              error={errors.driverLicenseNumber}
              help={t('domain.transport.licence.numberHelp', language)}
              onChange={(value) => set('driverLicenseNumber', String(value || '').toUpperCase())}
            />
            <Field
              label={t('domain.transport.licence.class', language)}
              type="select"
              required
              options={allowedClasses}
              value={values.licenceClass}
              error={errors.licenceClass}
              help={t('domain.transport.licence.classHelp', language)}
              onChange={(value) => set('licenceClass', value)}
            />
            {requireLicencePhotos ? (
              <>
                <LicencePhotoField
                  label={t('domain.transport.licence.front', language)}
                  help={t('domain.transport.licence.frontHelp', language)}
                  required
                  value={values.licenceImageFront}
                  error={errors.licenceImageFront}
                  onChange={(value) => set('licenceImageFront', value)}
                />
                <LicencePhotoField
                  label={t('domain.transport.licence.back', language)}
                  help={t('domain.transport.licence.backHelp', language)}
                  required
                  value={values.licenceImageBack}
                  error={errors.licenceImageBack}
                  onChange={(value) => set('licenceImageBack', value)}
                />
              </>
            ) : null}
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
