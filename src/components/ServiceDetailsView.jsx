import { useEffect, useState } from 'react';
import { formatRwf } from '../lib/currency';
import { serviceApprovalStatus } from '../lib/dashboard';
import loadLeaflet, { leafletMarkerIcon } from '../lib/leafletMap';
import { useLanguage } from '../context/LanguageContext';
import { t, translateCategory } from '../lib/translations';
import { categorySupportsOptions } from '../lib/serviceSchema';
import { isStayCategory } from '../features/domain/registry';
import OptionAvailabilityPanel from './OptionAvailabilityPanel';
import { getAuthData } from '../lib/api';
import {
  BATHROOM_AMENITIES,
  BED_TYPES,
  ID_TYPES,
  PROPERTY_AMENITIES,
  PROPERTY_KINDS,
  ROOM_AMENITY_GROUPS,
  STAR_RATINGS,
  UNIT_TYPES,
} from '../features/accommodation/contract';

const ROOM_AMENITIES = ROOM_AMENITY_GROUPS.flatMap((group) => group.items);
const DAY_LABELS = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const POLICY_LABELS = {
  yes: 'Yes',
  no: 'No',
  upon_request: 'Upon request',
  asap: 'As soon as possible',
  date: 'On a specific date',
  PAY_AT_ARRIVAL: 'Pay remaining at arrival',
  PAY_AT_CHECKOUT: 'Pay remaining at checkout',
};

export default function ServiceDetailsView({
  service,
  showProvider = true,
  showPrivateFields = false,
  manageAvailability = false,
  onAvailabilitySaved,
}) {
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
  const listing = service.listingAttributes || {};
  const units = collectUnits(service);
  const rooms = Array.isArray(service.rooms) ? service.rooms : [];
  const nestedServices = Array.isArray(service.nestedServices) ? service.nestedServices : [];
  const inventoryTitle = service.inventoryLabel === 'rooms' || listing.propertyKind
    ? t('serviceView.roomsUnits', language)
    : t('serviceView.optionsPrices', language);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${approval === 'approved' ? 'bg-emerald-50 text-emerald-700' : approval === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          {approval}
        </span>
        {service.domain || service.subtype ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
            {[service.domain, service.subtype].filter(Boolean).join(' · ')}
          </span>
        ) : null}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.listing', language)}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label={t('serviceView.serviceName', language)} value={service.title || service.name} />
          <Info label={t('serviceView.category', language)} value={translateCategory(service.category || service.serviceType, language)} />
          <Info label={t('serviceView.availability', language)} value={service.availabilityText || service.status || service.availableQuantity} />
          <Info label={t('serviceView.bookingMode', language)} value={service.bookingMode || t('admin.manual', language)} />
          <Info label={t('serviceView.price', language)} value={service.priceText || (basePrice > 0 ? formatRwf(basePrice) : '-')} />
          <Info label={t('serviceView.cancelWindow', language)} value={service.cancelWindowHours ? t('details.hours', language, { n: service.cancelWindowHours }) : service.cancellationPolicy?.windowHours ? t('details.hours', language, { n: service.cancellationPolicy.windowHours }) : '-'} />
          <Info label={t('serviceView.cancelPenalty', language)} value={service.cancelPenaltyPercent != null ? `${service.cancelPenaltyPercent}%` : service.cancellationPolicy?.penaltyPercent != null ? `${service.cancellationPolicy.penaltyPercent}%` : '-'} />
          <Info label={t('serviceView.commission', language)} value={service.platformCommissionPercent != null || service.commissionPercentage != null ? `${service.platformCommissionPercent ?? service.commissionPercentage}%` : '-'} />
        </dl>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{service.description || t('serviceView.noDescription', language)}</p>
        {Array.isArray(service.amenities) && service.amenities.length && !Array.isArray(listing.amenities) ? (
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.amenities', language)}</p>
            <ChipList items={service.amenities.map(amenityLabel)} />
          </div>
        ) : null}
      </section>

      <ListingAttributesSection listing={listing} service={service} showPrivateFields={showPrivateFields} language={language} />

      <PoliciesSection service={service} language={language} />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.images', language)}</h2>
        {primaryImage ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.coverPhoto', language)}</p>
            <img src={primaryImage.url} alt={primaryImage.alt} className="h-64 w-full rounded-xl object-cover" />
          </div>
        ) : null}
        {additionalImages.length ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.additionalPhotos', language)}</p>
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
            <Info label={t('serviceView.phone', language)} value={provider.phone || service.contactDetails?.phoneE164 || service.contactDetails?.phone} />
            <Info label={t('serviceView.sellerId', language)} value={provider.sellerId || service.sellerId} />
          </dl>
        </section>
      )}

      {service.availability ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.listingAvailability', language)}</h2>
          <AvailabilityFacts availability={service.availability} language={language} />
        </section>
      ) : null}

      {units.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{inventoryTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {units.length === 1
              ? t('serviceView.optionsCount', language, { n: units.length })
              : t('serviceView.optionsCountPlural', language, { n: units.length })}
          </p>
          {manageAvailability ? (
            <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-950">
              {t('serviceView.availabilityActionHint', language)}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            {units.map((unit, index) => (
              <UnitCard
                key={unit.id || unit._id || index}
                unit={unit}
                index={index}
                optionFieldSchema={service.schemaSnapshot?.optionFieldSchema || service.category?.optionFieldSchema || []}
                language={language}
                manageAvailability={manageAvailability}
                serviceId={service._id || service.id}
                stayMode={isStayCategory(service)}
                availabilityPolicy={service.schemaSnapshot?.availabilityPolicy || service.category?.availabilityPolicy}
                onAvailabilitySaved={onAvailabilitySaved}
              />
            ))}
          </div>
        </section>
      )}

      {!units.length && supportsOptions && service.availabilityTable?.rows?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.optionsPrices', language)}</h2>
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

      {!supportsOptions && !units.length && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.price', language)}</h2>
          <p className="mt-3 text-2xl font-black text-primary">{basePrice > 0 ? formatRwf(basePrice) : '—'}</p>
        </section>
      )}

      {rooms.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.legacyRooms', language)}</h2>
          <div className="mt-4 grid gap-4">
            {rooms.map((room) => (
              <article key={room.id || room._id || room.roomNumber} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-black text-slate-950">{room.roomNumber || room.type || t('serviceView.room', language)}</h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Info label={t('serviceView.roomType', language)} value={room.roomType || room.type} />
                  <Info label={t('serviceView.price', language)} value={room.pricePerNight || room.price ? formatRwf(room.pricePerNight || room.price) : '-'} />
                  <Info label={t('serviceView.adults', language)} value={room.capacity?.adults} />
                  <Info label={t('serviceView.children', language)} value={room.capacity?.children} />
                  <Info label={t('serviceView.status', language)} value={room.status} />
                </dl>
                {Array.isArray(room.amenities) && room.amenities.length ? (
                  <ChipList items={room.amenities.map(amenityLabel)} />
                ) : null}
                {Array.isArray(room.availabilityCalendar) && room.availabilityCalendar.length ? (
                  <div className="mt-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.calendar', language)}</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {room.availabilityCalendar.slice(0, 12).map((slot, index) => (
                        <li key={index}>
                          {formatDateRange(slot.startDate || slot.date, slot.endDate)}
                          {slot.isAvailable === false ? ` · ${t('serviceView.unavailable', language)}` : ` · ${t('serviceView.available', language)}`}
                          {slot.inventory != null ? ` · ${t('serviceView.inventory', language)}: ${slot.inventory}` : ''}
                          {slot.note ? ` · ${slot.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}

      {nestedServices.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.nestedPackages', language)}</h2>
          <div className="mt-4 grid gap-3">
            {nestedServices.map((item) => (
              <article key={item.id || item._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-950">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.description || item.category || ''}</p>
                <p className="mt-2 font-bold text-primary">{item.price ? formatRwf(item.price) : '—'}</p>
              </article>
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

function ListingAttributesSection({ listing, service, showPrivateFields, language }) {
  if (!listing || !Object.keys(listing).length) return null;
  const identity = listing.hostIdentity || {};
  const plans = listing.ratePlans || {};
  const amenities = Array.isArray(listing.amenities) ? listing.amenities : Array.isArray(service.amenities) ? service.amenities : [];
  const hasIdentity = Boolean(identity.legalName || identity.companyName || identity.idNumber);

  return (
    <>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">{t('serviceView.propertyDetails', language)}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label={t('serviceView.propertyKind', language)} value={lookupLabel(PROPERTY_KINDS, listing.propertyKind)} />
          <Info label={t('serviceView.starRating', language)} value={lookupLabel(STAR_RATINGS, listing.starRating)} />
          <Info label={t('serviceView.listingScale', language)} value={listing.listingScale === 'multiple' ? t('serviceView.multipleListings', language) : listing.listingScale ? t('serviceView.singleListing', language) : ''} />
          <Info label={t('serviceView.managementCompany', language)} value={yesNo(listing.isManagementCompany, language)} />
          <Info label={t('serviceView.checkIn', language)} value={timeRange(listing.checkInFrom || listing.checkInTime, listing.checkInUntil)} />
          <Info label={t('serviceView.checkOut', language)} value={timeRange(listing.checkOutFrom, listing.checkOutUntil || listing.checkOutTime)} />
          <Info label={t('serviceView.allowsChildren', language)} value={policyLabel(listing.allowsChildren)} />
          <Info label={t('serviceView.allowsPets', language)} value={policyLabel(listing.allowsPets)} />
          <Info label={t('serviceView.childrenStayFree', language)} value={yesNo(listing.childrenStayFree, language)} />
          <Info label={t('serviceView.excludeInfants', language)} value={yesNo(listing.excludeInfantsFromOccupancy, language)} />
        </dl>
        {amenities.length ? (
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.amenities', language)}</p>
            <ChipList items={amenities.map(amenityLabel)} />
          </div>
        ) : null}
      </section>

      {(plans.nonRefundable || plans.weekly || listing.firstCheckInMode || listing.availabilityHorizonDays || listing.calendarImportUrl) && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.ratesAvailability', language)}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label={t('serviceView.nonRefundable', language)} value={plans.nonRefundable?.enabled ? `${plans.nonRefundable.discountPercent}% ${t('serviceView.off', language)}` : t('serviceView.notOffered', language)} />
            <Info label={t('serviceView.weeklyRate', language)} value={plans.weekly?.enabled ? `${plans.weekly.discountPercent}% ${t('serviceView.off', language)}, ${t('serviceView.minNights', language, { n: plans.weekly.minNights })}` : t('serviceView.notOffered', language)} />
            <Info label={t('serviceView.firstCheckIn', language)} value={listing.firstCheckInMode === 'date' ? listing.firstCheckInDate : policyLabel(listing.firstCheckInMode)} />
            <Info label={t('serviceView.horizon', language)} value={listing.availabilityHorizonDays ? t('serviceView.daysCount', language, { n: listing.availabilityHorizonDays }) : ''} />
            <Info label={t('serviceView.longStays', language)} value={listing.allowLongStays ? t('serviceView.upToNights', language, { n: listing.maxStayNights || 90 }) : t('serviceView.maxThirtyNights', language)} />
            <Info label={t('serviceView.calendarImport', language)} value={listing.calendarImportUrl} />
          </dl>
        </section>
      )}

      {hasIdentity && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{t('serviceView.hostIdentity', language)}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label={t('serviceView.legalName', language)} value={identity.legalName} />
            <Info label={t('serviceView.hostType', language)} value={identity.isCompany ? t('serviceView.company', language) : t('serviceView.individual', language)} />
            <Info label={t('serviceView.companyName', language)} value={identity.companyName} />
            <Info label={t('serviceView.idType', language)} value={lookupLabel(ID_TYPES, identity.idType)} />
            {showPrivateFields ? <Info label={t('serviceView.idNumber', language)} value={identity.idNumber} /> : <Info label={t('serviceView.idOnFile', language)} value={identity.idNumber || identity.hasIdentityDocument ? t('serviceView.yes', language) : t('serviceView.no', language)} />}
            <Info label={t('serviceView.billingAddress', language)} value={identity.billingSameAsProperty === false ? identity.billingAddress : t('serviceView.sameAsProperty', language)} />
          </dl>
        </section>
      )}
    </>
  );
}

function PoliciesSection({ service, language }) {
  const payment = service.paymentPolicy || {};
  const cancel = service.cancellationPolicy || {};
  if (!payment.depositPercentage && !payment.remainingPaymentMethod && !cancel.type && !cancel.freeCancellationUntilHours) return null;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{t('serviceView.policies', language)}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label={t('serviceView.deposit', language)} value={payment.depositPercentage != null ? `${payment.depositPercentage}%` : ''} />
        <Info label={t('serviceView.remainingPayment', language)} value={policyLabel(payment.remainingPaymentMethod)} />
        <Info label={t('serviceView.cancellationType', language)} value={cancel.type} />
        <Info label={t('serviceView.freeCancelUntil', language)} value={cancel.freeCancellationUntilHours != null ? t('details.hours', language, { n: cancel.freeCancellationUntilHours }) : ''} />
        <Info label={t('serviceView.depositRefundable', language)} value={yesNo(cancel.depositRefundable, language)} />
      </dl>
    </section>
  );
}

function UnitCard({
  unit,
  index,
  optionFieldSchema = [],
  language,
  manageAvailability = false,
  serviceId,
  stayMode = false,
  availabilityPolicy = null,
  onAvailabilitySaved,
}) {
  const attributes = unit.attributes || {};
  const name = unit.name || attributes.unitName || t('serviceView.optionN', language, { n: index + 1 });
  const price = Number(unit.price || 0);
  const publicSchema = (optionFieldSchema || []).filter((field) => (field.visibility || 'public') === 'public');
  const schemaFacts = publicSchema
    .map((field) => {
      const value = attributes[field.id];
      if (!hasValue(value)) return null;
      return { id: field.id, label: field.label || field.id, value: formatAttrValue(value) };
    })
    .filter(Boolean);
  const beds = Array.isArray(attributes.beds) ? attributes.beds.filter((bed) => bed?.type && Number(bed.count) > 0) : [];
  const pricingMode = attributes.pricingMode === 'per_guest' ? 'per_guest' : 'unit';

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-primary">{t('serviceView.optionN', language, { n: index + 1 })}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{name}</h3>
          {unit.details ? <p className="mt-2 text-sm text-slate-600">{unit.details}</p> : null}
        </div>
        <div className="rounded-2xl bg-white px-5 py-3 shadow-sm sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('serviceView.price', language)}</p>
          <p className="mt-1 text-2xl font-black text-primary">{price ? formatRwf(price) : '—'}</p>
          {unit.priceType ? <p className="mt-1 text-xs font-semibold text-slate-500">{unit.priceType}</p> : null}
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {pricingMode === 'per_guest' ? t('serviceView.pricingModePerGuest', language) : t('serviceView.pricingModeUnit', language)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Info label={t('serviceView.unitType', language)} value={lookupLabel(UNIT_TYPES, attributes.unitType)} />
        <Info label={t('serviceView.maxGuests', language)} value={attributes.maxGuests} />
        <Info label={t('serviceView.bedrooms', language)} value={attributes.bedrooms} />
        <Info label={t('serviceView.quantity', language)} value={attributes.quantity || unit.capacity} />
        <Info label={t('serviceView.capacity', language)} value={unit.capacity} />
        <Info label={t('serviceView.privateBathroom', language)} value={yesNo(attributes.bathroomPrivate, language)} />
        <Info label={t('serviceView.excludeInfants', language)} value={yesNo(attributes.excludeInfants, language)} />
        <Info label={t('serviceView.status', language)} value={unit.isActive === false ? t('serviceView.inactive', language) : t('serviceView.active', language)} />
      </dl>

      {beds.length ? (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.beds', language)}</p>
          <ChipList items={beds.map((bed) => `${bed.count} × ${lookupLabel(BED_TYPES, bed.type)}`)} />
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.pricingMode', language)}</p>
        <p className="mt-1 font-semibold">
          {pricingMode === 'per_guest' ? t('serviceView.pricingModePerGuestHint', language) : t('serviceView.pricingModeUnitHint', language)}
        </p>
      </div>

      {Array.isArray(attributes.roomAmenities) && attributes.roomAmenities.length ? (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.roomAmenities', language)}</p>
          <ChipList items={attributes.roomAmenities.map(amenityLabel)} />
        </div>
      ) : null}

      {Array.isArray(attributes.bathroomAmenities) && attributes.bathroomAmenities.length ? (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.bathroomAmenities', language)}</p>
          <ChipList items={attributes.bathroomAmenities.map(amenityLabel)} />
        </div>
      ) : null}

      {schemaFacts.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {schemaFacts.map((fact) => <Fact key={fact.id} label={fact.label} value={fact.value} />)}
        </div>
      )}

      <AvailabilityFacts availability={unit.availability} option={unit} language={language} />

      {manageAvailability && (unit._id || unit.id) ? (
        <ManageOptionAvailability
          serviceId={serviceId}
          optionId={unit._id || unit.id}
          stayMode={stayMode}
          quantity={Number(attributes.quantity || unit.capacity || 1)}
          language={language}
          availabilityPolicy={availabilityPolicy}
          onSaved={onAvailabilitySaved}
        />
      ) : null}
    </article>
  );
}

function ManageOptionAvailability({ serviceId, optionId, stayMode, quantity, language, availabilityPolicy, onSaved }) {
  const [open, setOpen] = useState(false);
  const token = getAuthData()?.token;
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl border border-primary bg-blue-50 px-4 py-2.5 text-sm font-bold text-primary"
      >
        {open ? t('serviceView.hideAvailability', language) : t('serviceView.updateAvailability', language)}
      </button>
      {open && token ? (
        <OptionAvailabilityPanel
          token={token}
          serviceId={serviceId}
          optionId={optionId}
          stayMode={stayMode}
          quantity={quantity}
          availabilityPolicy={availabilityPolicy}
          onSaved={onSaved}
        />
      ) : null}
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

function AvailabilityFacts({ availability, option, language }) {
  const source = availability || {};
  const from = source.windowStartDate || option?.availableFrom;
  const to = source.windowEndDate || option?.availableTo;
  const days = source.daysOfWeek?.length ? source.daysOfWeek : option?.availableDays;
  const startTime = source.dayStartTime || option?.availableStartTime;
  const endTime = source.dayEndTime || option?.availableEndTime;
  const hasAny = source.isAnytime || from || to || (Array.isArray(days) && days.length) || startTime || endTime || source.capacityTotal || source.capacityRemaining;
  if (!hasAny) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('serviceView.availability', language)}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <Info label={t('serviceView.anytime', language)} value={source.isAnytime ? t('serviceView.yes', language) : ''} />
        <Info label={t('serviceView.availableFrom', language)} value={from} />
        <Info label={t('serviceView.availableUntil', language)} value={to} />
        <Info label={t('serviceView.availableDays', language)} value={Array.isArray(days) && days.length ? days.map((day) => DAY_LABELS[day] || day).join(', ') : ''} />
        <Info label={t('serviceView.startTime', language)} value={startTime} />
        <Info label={t('serviceView.endTime', language)} value={endTime} />
        <Info label={t('serviceView.capacityTotal', language)} value={source.capacityTotal} />
        <Info label={t('serviceView.capacityRemaining', language)} value={source.capacityRemaining} />
        <Info label={t('serviceView.timezone', language)} value={source.timezone} />
      </dl>
    </div>
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
  if (!hasValue(value)) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function ChipList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">{item}</span>
      ))}
    </div>
  );
}

function collectUnits(service) {
  const fromOptions = Array.isArray(service.options) && service.options.length ? service.options : [];
  if (fromOptions.length) return fromOptions;
  if (Array.isArray(service.units) && service.units.length) return service.units;
  if (Array.isArray(service.serviceOptions) && service.serviceOptions.length && service.serviceOptions[0]?.price != null) {
    return service.serviceOptions;
  }
  return [];
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

function amenityLabel(id) {
  return lookupLabel(PROPERTY_AMENITIES, id) || lookupLabel(ROOM_AMENITIES, id) || lookupLabel(BATHROOM_AMENITIES, id) || humanize(id);
}

function lookupLabel(list, id) {
  if (!id) return '';
  const match = (list || []).find((item) => item.id === id);
  return match?.label || humanize(id);
}

function policyLabel(value) {
  if (!value) return '';
  return POLICY_LABELS[value] || humanize(value);
}

function yesNo(value, language) {
  if (value === true) return t('serviceView.yes', language);
  if (value === false) return t('serviceView.no', language);
  return '';
}

function timeRange(start, end) {
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

function formatDateRange(start, end) {
  const from = start ? String(start).slice(0, 10) : '';
  const to = end ? String(end).slice(0, 10) : '';
  if (from && to && from !== to) return `${from} → ${to}`;
  return from || to || '';
}

function formatAttrValue(value) {
  if (Array.isArray(value)) return value.map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : amenityLabel(item))).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function humanize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hasValue(value) {
  if (value === undefined || value === null || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value).trim().toLowerCase();
  return text !== '' && text !== '-' && text !== 'none' && text !== 'not set';
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
