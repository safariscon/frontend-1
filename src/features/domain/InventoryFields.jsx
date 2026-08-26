import { Field, FieldGrid } from './Field';
import { domainCopy, resolveDomain } from './registry';

export default function InventoryFields({ category, values = {}, onChange, errors = {} }) {
  const domain = resolveDomain(category);
  const copy = domainCopy(category);
  const set = (key, value) => onChange({ ...values, [key]: value });

  if (domain === 'accommodation') {
    return (
      <FieldGrid title="Room details">
        <Field label="Max guests" type="number" required min="1" value={values.maxGuests} error={errors.maxGuests} onChange={(value) => set('maxGuests', value)} />
        <Field label="Bed type" value={values.bedType} placeholder="Example: King" onChange={(value) => set('bedType', value)} />
        <Field label="Number of beds" type="number" min="1" value={values.numberOfBeds} onChange={(value) => set('numberOfBeds', value)} />
        <Field label="Bedrooms" type="number" min="1" value={values.bedrooms} onChange={(value) => set('bedrooms', value)} />
        <Field label={copy.capacityLabel} type="number" min="1" value={values.quantity} onChange={(value) => set('quantity', value)} />
        <Field label="Bathroom private" type="boolean" value={values.bathroomPrivate !== false} onChange={(value) => set('bathroomPrivate', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'transport') {
    return (
      <FieldGrid title="Vehicle details">
        <Field label="Make" value={values.make} placeholder="Toyota" onChange={(value) => set('make', value)} />
        <Field label="Model" value={values.model} placeholder="RAV4" onChange={(value) => set('model', value)} />
        <Field label="Seats" type="number" min="1" value={values.seats} error={errors.seats} onChange={(value) => set('seats', value)} />
        <Field label="Luggage" value={values.luggage} onChange={(value) => set('luggage', value)} />
        <Field label="Air conditioning" type="boolean" value={values.ac} onChange={(value) => set('ac', value)} />
        <Field label={copy.capacityLabel} type="number" min="1" value={values.quantity ?? 1} error={errors.quantity} onChange={(value) => set('quantity', value)} help="How many cars of this make and model you can rent at the same time." />
      </FieldGrid>
    );
  }

  if (domain === 'experiences') {
    return (
      <FieldGrid title="Package">
        <Field label="Package type" type="select" options={['Adult', 'Child', 'Family']} value={values.packageType} onChange={(value) => set('packageType', value)} />
      </FieldGrid>
    );
  }

  if (domain === 'venues') {
    return (
      <FieldGrid title="Package">
        <Field label="Package name" value={values.packageName} placeholder="Half-day, Full-day, Evening" onChange={(value) => set('packageName', value)} />
      </FieldGrid>
    );
  }

  return null;
}
