import { useEffect, useState } from 'react';
import { formatRwf } from '../lib/currency';
import { serviceApprovalStatus } from '../lib/dashboard';
import loadLeaflet, { leafletMarkerIcon } from '../lib/leafletMap';
import { useLanguage } from '../context/LanguageContext';
import { t, translateCategory } from '../lib/translations';
import { categorySupportsOptions } from '../lib/serviceSchema';

export default function ServiceDetailsView({ service, showProvider = true }) {
  const { language } = useLanguage();
  if (!service) return null;

  const images = collectImages(service, language);
  const primaryUrl = service.primaryImage || images[0]?.url || '';
  const primaryImage = images.find((image) => image.url === primaryUrl) || images[0] || null;
  const additionalImages = images.filter((image) => image.url !== primaryImage?.url);
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
  const supportsOptions = categorySupportsOptions(
    service.supportsOptions,
    service.schemaSnapshot?.supportsOptions,
    service.category?.supportsOptions
  );
  const basePrice = Number(service.basePrice ?? service.pricing?.amount ?? 0);

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
        {primaryImage ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Cover photo</p>
            <img src={primaryImage.url} alt={primaryImage.alt} className="h-64 w-full rounded-xl object-cover" />
          </div>
        ) : null}
        {additionalImages.length ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Additional photos</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {additionalImages.map((image) => (
                <img key={image.url} src={image.url} alt={image.alt} className="h-40 w-full rounded-xl object-cover" />
              ))}
            </div>
          </div>
        ) : null}
        {!primaryImage && !additionalImages.length && (
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

      {supportsOptions && service.availabilityTable?.rows?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.optionsPrices', language)}</h2>
          <p className="mt-1 text-sm text-slate-500">{service.availabilityTable.rows.length === 1 ? t('serviceView.optionsCount', language, { n: service.availabilityTable.rows.length }) : t('serviceView.optionsCountPlural', language, { n: service.availabilityTable.rows.length })}</p>
          <div className="mt-4 grid gap-4">
            {service.availabilityTable.rows.map((row, index) => (
              <OptionCard
                key={row.id || index}
                row={row}
                index={index}
                optionFieldSchema={service.schemaSnapshot?.optionFieldSchema || service.category?.optionFieldSchema || []}
              />
            ))}
          </div>
        </section>
      )}

      {!supportsOptions && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.price', language)}</h2>
          <p className="mt-3 text-2xl font-black text-primary">{basePrice > 0 ? formatRwf(basePrice) : '—'}</p>
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

function OptionCard({ row, index, optionFieldSchema = [] }) {
  const { language } = useLanguage();
  const cells = row.cells || {};
  const attributes = row.attributes || cells.attributes || {};
  const name = cells.service || cells.name || cells.option || t('serviceView.optionN', language, { n: index + 1 });
  const price = Number(cells.price || 0);
  const publicSchema = (optionFieldSchema || []).filter((field) => (field.visibility || 'public') === 'public');

  const facts = publicSchema
    .map((field) => {
      const value = attributes[field.id] ?? cells[field.id];
      if (!hasValue(value)) return null;
      return {
        id: field.id,
        label: field.label || field.id,
        value: Array.isArray(value) ? value.join(', ') : String(value),
      };
    })
    .filter(Boolean);

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
        </div>
      </div>
      {facts.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {facts.map((fact) => <Fact key={fact.id} label={fact.label} value={fact.value} />)}
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
  const fallbackAlt = service.title || t('serviceView.serviceImage', language);
  const fromArray = Array.isArray(service.images) && service.images.length
    ? service.images
      .map((image) => (typeof image === 'string' ? { url: image, alt: fallbackAlt } : { url: image.url, alt: image.alt || fallbackAlt }))
      .filter((image) => image.url)
    : (service.imageUrls || []).map((url) => ({ url, alt: fallbackAlt }));
  if (service.primaryImage && !fromArray.some((image) => image.url === service.primaryImage)) {
    return [{ url: service.primaryImage, alt: fallbackAlt }, ...fromArray];
  }
  return fromArray;
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value).trim().toLowerCase();
  return text !== '' && text !== '-' && text !== 'none' && text !== 'not set' && text !== 'false';
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
