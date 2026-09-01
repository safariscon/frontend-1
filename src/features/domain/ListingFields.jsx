import { Field, FieldGrid } from './Field';
import { CAR_FUEL_TYPES, districtOptions, licenceClassOptions, resolveDomain, resolveSubtype } from './registry';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

export default function ListingFields({ category, values = {}, onChange, errors = {} }) {
  const domain = resolveDomain(category);
  const subtype = resolveSubtype(category);
  const { language } = useLanguage();
  const set = (key, value) => onChange({ ...values, [key]: value });

  const permitFields = (vehicleSubtype) => (
    <>
      <Field
        label={t('domain.transport.licence.allowedClasses', language)}
        type="multiselect"
        required
        wide
        options={licenceClassOptions(vehicleSubtype, language)}
        value={values.allowedLicenceClasses || []}
        error={errors.allowedLicenceClasses}
        help={t('domain.transport.licence.allowedClassesHelp', language)}
        onChange={(value) => set('allowedLicenceClasses', value)}
      />
      <Field
        label={t('domain.transport.pickupLocation', language)}
        required
        wide
        value={values.pickupLocation}
        error={errors.pickupLocation}
        help={t('domain.transport.pickupLocationProviderHelp', language)}
        onChange={(value) => set('pickupLocation', value)}
      />
      <Field
        label={t('domain.transport.returnLocation', language)}
        required
        wide
        value={values.returnLocation}
        error={errors.returnLocation}
        help={t('domain.transport.returnLocationProviderHelp', language)}
        onChange={(value) => set('returnLocation', value)}
      />
      <Field
        label={t('domain.transport.licence.requireUpload', language)}
        type="boolean"
        wide
        value={values.requireLicenceUpload !== false}
        onChange={(value) => set('requireLicenceUpload', value)}
      />
    </>
  );

  if (domain === 'accommodation') {
    return (
      <FieldGrid title="Property details" hint="These fields are required for hotels, apartments, and homestays.">
        <Field label="Check-in time" type="time" required value={values.checkInTime} error={errors.checkInTime} onChange={(value) => set('checkInTime', value)} />
        <Field label="Check-out time" type="time" required value={values.checkOutTime} error={errors.checkOutTime} onChange={(value) => set('checkOutTime', value)} />
        {subtype === 'hotel' ? (
          <Field
            label="Star rating"
            type="select"
            value={values.starRating}
            options={['unrated', '1-star', '2-star', '3-star', '4-star', '5-star']}
            onChange={(value) => set('starRating', value)}
          />
        ) : null}
        <Field label="Amenities" type="textarea" value={values.amenities} help="Comma-separated, for example WiFi, parking, breakfast" onChange={(value) => set('amenities', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'transport' && subtype === 'car-rental') {
    return (
      <FieldGrid title="Rental company details">
        <Field label="Vehicle class" type="select" required options={['Economy', 'Compact', 'SUV', 'Van', 'Luxury']} value={values.vehicleClass} error={errors.vehicleClass} onChange={(value) => set('vehicleClass', value)} />
        <Field label="Transmission" type="select" required options={['Automatic', 'Manual']} value={values.transmission} error={errors.transmission} onChange={(value) => set('transmission', value)} />
        <Field
          label="Fuel type"
          type="select"
          options={CAR_FUEL_TYPES}
          value={values.fuelType || 'Petrol'}
          onChange={(value) => set('fuelType', value)}
          help="Petrol for most cars, diesel for efficiency / torque, hybrid or electric for lower emissions."
        />
        <Field label="Fuel policy" type="select" options={['Full-to-full', 'Same-to-same', 'Prepaid']} value={values.fuelPolicy} onChange={(value) => set('fuelPolicy', value)} help="How the tank should be returned (separate from fuel type)." />
        <Field label="Minimum driver age" type="number" required min="18" value={values.minimumDriverAge} error={errors.minimumDriverAge} onChange={(value) => set('minimumDriverAge', value)} />
        <Field label="With driver" type="boolean" value={values.withDriver} onChange={(value) => set('withDriver', value)} />
        <Field label="Insurance included" type="boolean" value={values.insuranceIncluded} onChange={(value) => set('insuranceIncluded', value)} />
        <Field label="Pickup from" type="time" value={values.pickupTime || '08:00'} onChange={(value) => set('pickupTime', value)} help="Earliest time a customer can pick up a car." />
        <Field label="Return by" type="time" value={values.returnTime || '18:00'} onChange={(value) => set('returnTime', value)} help="Latest time a customer must return a car." />
        <Field label="Minimum rental (days)" type="number" min="1" value={values.minRentalDays ?? 1} error={errors.minRentalDays} onChange={(value) => set('minRentalDays', value)} />
        <Field label="Maximum rental (days)" type="number" min="1" value={values.maxRentalDays ?? 30} error={errors.maxRentalDays} onChange={(value) => set('maxRentalDays', value)} help="How long a customer can keep this car." />
        <Field label="Security deposit note" type="textarea" value={values.depositNote} onChange={(value) => set('depositNote', value)} />
        {permitFields('car-rental')}
      </FieldGrid>
    );
  }

  if (domain === 'transport' && subtype === 'taxi') {
    return (
      <FieldGrid title="Taxi details">
        <Field label="Vehicle type" required value={values.vehicleType} error={errors.vehicleType} onChange={(value) => set('vehicleType', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'transport' && subtype === 'motorbike') {
    return (
      <FieldGrid title={t('domain.transport.moto.listingTitle', language)} hint={t('domain.transport.moto.listingHint', language)}>
        <Field
          label={t('domain.transport.moto.helmetIncluded', language)}
          type="boolean"
          value={values.helmetIncluded !== false}
          onChange={(value) => set('helmetIncluded', value)}
        />
        <Field
          label={t('domain.transport.moto.minimumRiderAge', language)}
          type="number"
          min="16"
          value={values.minimumDriverAge ?? 18}
          error={errors.minimumDriverAge}
          onChange={(value) => set('minimumDriverAge', value)}
        />
        <Field
          label={t('domain.transport.pickupFrom', language)}
          type="time"
          value={values.pickupTime || '08:00'}
          help={t('domain.transport.pickupFromHelpMoto', language)}
          onChange={(value) => set('pickupTime', value)}
        />
        <Field
          label={t('domain.transport.returnBy', language)}
          type="time"
          value={values.returnTime || '18:00'}
          help={t('domain.transport.returnByHelpMoto', language)}
          onChange={(value) => set('returnTime', value)}
        />
        <Field
          label={t('domain.transport.minRentalDays', language)}
          type="number"
          min="1"
          value={values.minRentalDays ?? 1}
          error={errors.minRentalDays}
          onChange={(value) => set('minRentalDays', value)}
        />
        <Field
          label={t('domain.transport.maxRentalDays', language)}
          type="number"
          min="1"
          value={values.maxRentalDays ?? 30}
          error={errors.maxRentalDays}
          onChange={(value) => set('maxRentalDays', value)}
        />
        <Field
          label={t('domain.transport.depositNote', language)}
          type="textarea"
          value={values.depositNote}
          onChange={(value) => set('depositNote', value)}
        />
        {permitFields('motorbike')}
      </FieldGrid>
    );
  }

  if (domain === 'experiences') {
    return (
      <FieldGrid title={subtype === 'activity' ? 'Activity details' : 'Tour details'}>
        <Field label="Duration" required value={values.duration} error={errors.duration} placeholder="Example: 6 hours" onChange={(value) => set('duration', value)} />
        <Field label="Difficulty" type="select" options={['Easy', 'Moderate', 'Challenging']} value={values.difficulty} onChange={(value) => set('difficulty', value)} />
        <Field label="Meeting point" required={subtype === 'tour'} value={values.meetingPoint} onChange={(value) => set('meetingPoint', value)} />
        <Field label="What's included" type="textarea" value={values.included} onChange={(value) => set('included', value)} />
        <Field label="What's excluded" type="textarea" value={values.excluded} onChange={(value) => set('excluded', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'dining') {
    return (
      <FieldGrid title="Dining details">
        {subtype !== 'bar' ? (
          <Field label="Cuisine" required={subtype !== 'bar'} value={values.cuisine} error={errors.cuisine} onChange={(value) => set('cuisine', value)} />
        ) : (
          <Field label="Atmosphere" value={values.atmosphere} onChange={(value) => set('atmosphere', value)} />
        )}
        {subtype === 'restaurant' ? (
          <Field label="Dress code" value={values.dressCode} onChange={(value) => set('dressCode', value)} />
        ) : null}
        <Field label="Seating capacity" type="number" required min="1" value={values.seatingCapacity} error={errors.seatingCapacity} onChange={(value) => set('seatingCapacity', value)} />
        {subtype === 'restaurant' ? (
          <Field label="Average price (RWF)" type="number" min="0" value={values.averagePrice} onChange={(value) => set('averagePrice', value)} />
        ) : null}
        <Field label="Opening hours" type="textarea" value={values.openingHours} onChange={(value) => set('openingHours', value)} />
      </FieldGrid>
    );
  }

  return (
    <FieldGrid title="Venue details">
      <Field label="Max capacity" type="number" required min="1" value={values.maxCapacity} error={errors.maxCapacity} onChange={(value) => set('maxCapacity', value)} />
      <Field label="Catering available" type="boolean" value={values.cateringAvailable} onChange={(value) => set('cateringAvailable', value)} />
      <Field label="Amenities" type="textarea" value={values.amenities} onChange={(value) => set('amenities', value)} />
    </FieldGrid>
  );
}
