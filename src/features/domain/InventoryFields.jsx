import { Field, FieldGrid } from './Field';
import { domainCopy, motorbikeCategoryOptions, resolveDomain, resolveSubtype } from './registry';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

export default function InventoryFields({ category, values = {}, onChange, errors = {} }) {
  const domain = resolveDomain(category);
  const subtype = resolveSubtype(category);
  const copy = domainCopy(category);
  const { language } = useLanguage();
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

  if (domain === 'transport' && subtype === 'motorbike') {
    return (
      <FieldGrid title={t('domain.transport.moto.fleetTitle', language)} hint={t('domain.transport.moto.fleetHint', language)}>
        <Field
          label={t('domain.transport.moto.make', language)}
          value={values.make}
          placeholder={t('domain.transport.moto.makePlaceholder', language)}
          onChange={(value) => set('make', value)}
        />
        <Field
          label={t('domain.transport.moto.model', language)}
          value={values.model}
          placeholder={t('domain.transport.moto.modelPlaceholder', language)}
          onChange={(value) => set('model', value)}
        />
        <Field
          label={t('domain.transport.moto.plateNumber', language)}
          required
          value={values.plateNumber}
          error={errors.plateNumber}
          placeholder={t('domain.transport.moto.platePlaceholder', language)}
          help={t('domain.transport.moto.plateHelp', language)}
          onChange={(value) => set('plateNumber', String(value || '').toUpperCase())}
        />
        <Field
          label={t('domain.transport.moto.chassisNumber', language)}
          value={values.chassisNumber}
          error={errors.chassisNumber}
          help={t('domain.transport.moto.chassisHelp', language)}
          onChange={(value) => set('chassisNumber', String(value || '').toUpperCase())}
        />
        <Field
          label={t('domain.transport.moto.category', language)}
          type="select"
          required
          options={motorbikeCategoryOptions(language)}
          value={values.motoCategory || 'scooter'}
          error={errors.motoCategory}
          onChange={(value) => set('motoCategory', value)}
        />
        <Field
          label={t('domain.transport.moto.engineCc', language)}
          type="number"
          required
          min="30"
          value={values.engineCc}
          error={errors.engineCc}
          help={t('domain.transport.moto.engineCcHelp', language)}
          onChange={(value) => set('engineCc', value)}
        />
        <Field
          label={t('domain.transport.moto.insuranceExpiry', language)}
          type="date"
          required
          min={new Date().toISOString().slice(0, 10)}
          value={values.insuranceExpiry}
          error={errors.insuranceExpiry}
          help={t('domain.transport.moto.insuranceExpiryHelp', language)}
          onChange={(value) => set('insuranceExpiry', value)}
        />
        <Field
          label={t('domain.transport.moto.helmetsProvided', language)}
          type="number"
          min="0"
          value={values.helmetsProvided ?? 1}
          onChange={(value) => set('helmetsProvided', value)}
        />
        <Field
          label={copy.capacityLabel}
          type="number"
          min="1"
          value={values.quantity ?? 1}
          error={errors.quantity}
          help={t('domain.transport.moto.quantityHelp', language)}
          onChange={(value) => set('quantity', value)}
        />
      </FieldGrid>
    );
  }

  if (domain === 'transport') {
    return (
      <FieldGrid title={t('domain.transport.car.fleetTitle', language)}>
        <Field label={t('domain.transport.car.make', language)} value={values.make} placeholder="Toyota" onChange={(value) => set('make', value)} />
        <Field label={t('domain.transport.car.model', language)} value={values.model} placeholder="RAV4" onChange={(value) => set('model', value)} />
        <Field label={t('domain.transport.car.seats', language)} type="number" min="1" value={values.seats} error={errors.seats} onChange={(value) => set('seats', value)} />
        <Field label={t('domain.transport.car.luggage', language)} value={values.luggage} onChange={(value) => set('luggage', value)} />
        <Field label={t('domain.transport.car.ac', language)} type="boolean" value={values.ac} onChange={(value) => set('ac', value)} />
        <Field label={copy.capacityLabel} type="number" min="1" value={values.quantity ?? 1} error={errors.quantity} onChange={(value) => set('quantity', value)} help={t('domain.transport.car.quantityHelp', language)} />
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
