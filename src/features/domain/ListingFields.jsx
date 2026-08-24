import { Field, FieldGrid } from './Field';
import { resolveDomain, resolveSubtype } from './registry';

export default function ListingFields({ category, values = {}, onChange, errors = {} }) {
  const domain = resolveDomain(category);
  const subtype = resolveSubtype(category);
  const set = (key, value) => onChange({ ...values, [key]: value });

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
        <Field label="Fuel policy" type="select" options={['Full-to-full', 'Same-to-same', 'Prepaid']} value={values.fuelPolicy} onChange={(value) => set('fuelPolicy', value)} />
        <Field label="Minimum driver age" type="number" required min="18" value={values.minimumDriverAge} error={errors.minimumDriverAge} onChange={(value) => set('minimumDriverAge', value)} />
        <Field label="With driver" type="boolean" value={values.withDriver} onChange={(value) => set('withDriver', value)} />
        <Field label="Insurance included" type="boolean" value={values.insuranceIncluded} onChange={(value) => set('insuranceIncluded', value)} />
        <Field label="Security deposit note" type="textarea" value={values.depositNote} onChange={(value) => set('depositNote', value)} />
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
      <FieldGrid title="Motorbike details">
        <Field label="Helmet included" type="boolean" value={values.helmetIncluded} onChange={(value) => set('helmetIncluded', value)} />
        <Field label="Minimum rider age" type="number" min="18" value={values.minimumDriverAge} onChange={(value) => set('minimumDriverAge', value)} />
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
