import { useEffect, useState } from 'react';
import { formatRwf } from '../lib/currency';
import { serviceApprovalStatus } from '../lib/dashboard';
import loadLeaflet, { leafletMarkerIcon } from '../lib/leafletMap';
import { useLanguage } from '../context/LanguageContext';
import { t, translateCategory } from '../lib/translations';

export default function ServiceDetailsView({ service, showProvider = true }) {
  const { language } = useLanguage();
  if (!service) return null;

  const images = collectImages(service, language);
  const map = service.map || {};
  const provider = service.provider || {};
  const latitude = Number(map.latitude ?? service.serviceLocation?.latitude);
  const longitude = Number(map.longitude ?? service.serviceLocation?.longitude);
  const location = {
    latitude,
    longitude,
    formattedAddress: map.formattedAddress || service.serviceLocation?.formattedAddress || service.serviceLocation?.fullAddress || '',
    googleMapsUrl: map.googleMapsUrl || (Number.isFinite(latitude) && Number.isFinite(longitude) ? `https://www.google.com/maps?q=${latitude},${longitude}` : ''),
    osmUrl: map.osmUrl || (Number.isFinite(latitude) && Number.isFinite(longitude) ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}` : ''),
  };
  const approval = serviceApprovalStatus(service);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${approval === 'approved' ? 'bg-emerald-50 text-emerald-700' : approval === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          {approval}
        </span>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.listing', language)}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label={t('serviceView.serviceName', language)} value={service.title || service.name} />
          <Info label={t('serviceView.category', language)} value={translateCategory(service.category || service.serviceType, language)} />
          <Info label={t('serviceView.availability', language)} value={service.availabilityText || service.status || service.availableQuantity} />
          <Info label={t('serviceView.bookingMode', language)} value={service.bookingMode || t('admin.manual', language)} />
          <Info label={t('serviceView.price', language)} value={service.priceText || (service.pricing?.amount != null ? formatRwf(service.pricing.amount) : '-')} />
          <Info label={t('serviceView.cancelWindow', language)} value={service.cancelWindowHours ? t('details.hours', language, { n: service.cancelWindowHours }) : service.cancellationPolicy?.windowHours ? t('details.hours', language, { n: service.cancellationPolicy.windowHours }) : '-'} />
          <Info label={t('serviceView.cancelPenalty', language)} value={service.cancelPenaltyPercent != null ? `${service.cancelPenaltyPercent}%` : service.cancellationPolicy?.penaltyPercent != null ? `${service.cancellationPolicy.penaltyPercent}%` : '-'} />
        </dl>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{service.description || t('serviceView.noDescription', language)}</p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.images', language)}</h2>
        {images.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {images.map((image) => (
              <img key={image.url} src={image.url} alt={image.alt} className="h-44 w-full rounded-xl object-cover" />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">{t('serviceView.noImages', language)}</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.location', language)}</h2>
        <p className="mt-2 text-sm text-slate-600">{location.formattedAddress || t('serviceView.noAddress', language)}</p>
        <ReadOnlyMap location={location} />
        <div className="mt-3 flex flex-wrap gap-2">
          {location.googleMapsUrl && <a href={location.googleMapsUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">{t('serviceView.openGoogle', language)}</a>}
          {location.osmUrl && <a href={location.osmUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">{t('serviceView.openOsm', language)}</a>}
        </div>
      </section>

      {showProvider && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.provider', language)}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label={t('serviceView.name', language)} value={provider.name || service.providerName} />
            <Info label={t('serviceView.email', language)} value={provider.email} />
            <Info label={t('serviceView.phone', language)} value={provider.phone || service.contactDetails?.phone} />
            <Info label={t('serviceView.sellerId', language)} value={provider.sellerId || service.sellerId} />
          </dl>
        </section>
      )}

      {service.availabilityTable?.rows?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.optionsPrices', language)}</h2>
          <p className="mt-1 text-sm text-slate-500">{service.availabilityTable.rows.length === 1 ? t('serviceView.optionsCount', language, { n: service.availabilityTable.rows.length }) : t('serviceView.optionsCountPlural', language, { n: service.availabilityTable.rows.length })}</p>
          <div className="mt-4 grid gap-4">
            {service.availabilityTable.rows.map((row, index) => (
              <OptionCard key={row.id || index} row={row} index={index} />
            ))}
          </div>
        </section>
      )}

      {service.bookingForm?.fields?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.bookingForm', language)}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {service.bookingForm.fields.map((field) => (
              <li key={field.id || field.label} className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-bold">{field.label}</span>
                <span className="ml-2 text-slate-500">{field.type}{field.required ? ` · ${t('serviceView.required', language)}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OptionCard({ row, index }) {
  const { language } = useLanguage();
  const cells = row.cells || {};
  const name = cells.service || cells.name || cells.option || t('serviceView.optionN', language, { n: index + 1 });
  const price = Number(cells.price || 0);
  const pricing = [
    [t('serviceView.priceType', language), pretty(cells.priceType)],
    [t('serviceView.calculatedBy', language), pretty(cells.calculationField)],
    [t('serviceView.durationUnit', language), pretty(cells.durationUnit)],
    [t('serviceView.maximumDuration', language), cells.maximumDuration],
  ].filter(([, value]) => hasValue(value));
  const availability = [
    [t('serviceView.capacity', language), cells.availability],
    [t('serviceView.availableFrom', language), formatDateValue(cells.availableFrom)],
    [t('serviceView.availableUntil', language), formatDateValue(cells.availableTo)],
    [t('serviceView.availableDays', language), pretty(cells.availableDays)],
    [t('serviceView.startTime', language), cells.availableStartTime],
    [t('serviceView.endTime', language), cells.availableEndTime],
    [t('serviceView.timeRequired', language), pretty(cells.requiresTime)],
  ].filter(([, value]) => hasValue(value));
  const extras = Object.entries(cells).filter(([key, value]) => (
    !['service', 'name', 'option', 'price', 'priceType', 'calculationField', 'durationUnit', 'maximumDuration', 'availability', 'availableFrom', 'availableTo', 'availableDays', 'availableStartTime', 'availableEndTime', 'requiresTime', 'details', 'amenities'].includes(key)
    && hasValue(value)
  ));

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-primary">{t('serviceView.optionN', language, { n: index + 1 })}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{name}</h3>
        </div>
        <div className="rounded-2xl bg-white px-5 py-3 shadow-sm sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('serviceView.price', language)}</p>
          <p className="mt-1 text-2xl font-black text-primary">{price ? formatRwf(price) : '—'}</p>
          {cells.priceType && <p className="text-sm font-semibold capitalize text-slate-500">{pretty(cells.priceType)}</p>}
        </div>
      </div>
      {pricing.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.pricingRules', language)}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {pricing.map(([label, value]) => <Fact key={label} label={label} value={value} />)}
          </div>
        </div>
      )}
      {availability.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.availability', language)}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {availability.map(([label, value]) => <Fact key={label} label={label} value={value} />)}
          </div>
        </div>
      )}
      {extras.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {extras.map(([key, value]) => <Fact key={key} label={pretty(key)} value={pretty(value)} />)}
        </div>
      )}
      {(cells.details || cells.amenities) && (
        <div className="mt-4 rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('serviceView.details', language)}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{cells.details || cells.amenities}</p>
        </div>
      )}
    </article>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold capitalize text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value || '-'}</dd>
    </div>
  );
}

function collectImages(service, language) {
  if (!service) return [];
  if (Array.isArray(service.images) && service.images.length) {
    return service.images
      .map((image) => (typeof image === 'string' ? { url: image, alt: service.title || t('serviceView.serviceImage', language) } : { url: image.url, alt: image.alt || service.title || t('serviceView.serviceImage', language) }))
      .filter((image) => image.url);
  }
  return (service.imageUrls || []).map((url) => ({ url, alt: service.title || t('serviceView.serviceImage', language) }));
}

function pretty(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatDateValue(value) {
  if (!hasValue(value)) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ReadOnlyMap({ location }) {
  const { language } = useLanguage();
  const [node, setNode] = useState(null);
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);

  useEffect(() => {
    if (!node || !hasPin) return undefined;
    let map;
    loadLeaflet().then((leaflet) => {
      map = leaflet.map(node).setView([latitude, longitude], 15);
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      leaflet.marker([latitude, longitude], { icon: leafletMarkerIcon(leaflet) }).addTo(map);
    });
    return () => {
      map?.remove();
    };
  }, [hasPin, latitude, longitude, node]);

  if (!hasPin) {
    return <p className="mt-3 text-sm text-slate-500">{t('serviceView.noMapPin', language)}</p>;
  }

  return <div ref={setNode} className="mt-4 h-80 w-full overflow-hidden rounded-xl border border-slate-200" />;
}
