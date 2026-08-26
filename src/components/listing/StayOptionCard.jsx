import { formatRwf } from '../../lib/currency';
import {
  amenityLabel,
  bedSummary,
  hasValue,
  leftLabel,
  optionLeft,
  optionPricingCopy,
  optionUnitPrice,
  unitTypeLabel,
} from '../../lib/stayDisplay';

export default function StayOptionCard({
  option,
  selected = false,
  selectable = false,
  onSelect,
  ctaLabel = 'Select',
  languageNote = '',
  guests,
  copy = null,
}) {
  const attributes = option?.attributes || {};
  const left = optionLeft(option);
  const soldOut = left <= 0;
  const beds = bedSummary(attributes.beds);
  const rental = copy?.kind === 'rental';
  const pricing = optionPricingCopy(option, guests, copy?.kind);
  const unitPrice = optionUnitPrice(option);
  const roomAmenities = Array.isArray(attributes.roomAmenities) ? attributes.roomAmenities : [];
  const bathroomAmenities = Array.isArray(attributes.bathroomAmenities) ? attributes.bathroomAmenities : [];
  const carsOfType = Number(attributes.quantity || option?.quantity || 0);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.7fr)_minmax(11rem,0.6fr)]">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                {rental ? (copy.optionNoun || 'Vehicle type') : 'Stay option'}
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{option?.name || (rental ? 'Vehicle' : 'Stay option')}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${soldOut ? 'bg-red-50 text-red-700' : left <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
              {leftLabel(option, copy)}
            </span>
          </div>

          {rental ? (
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
              {hasValue(attributes.make) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{attributes.make}{attributes.model ? ` ${attributes.model}` : ''}</span>}
              {hasValue(attributes.seats) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{attributes.seats} seats</span>}
              {attributes.ac != null && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{attributes.ac ? 'Air conditioning' : 'No A/C'}</span>}
              {hasValue(attributes.luggage) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">Luggage: {attributes.luggage}</span>}
              {carsOfType > 0 && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{carsOfType} {carsOfType === 1 ? copy.unitNoun : copy.unitNounPlural} of this type</span>}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
              {hasValue(attributes.maxGuests) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">Sleeps {attributes.maxGuests}</span>}
              {hasValue(unitTypeLabel(attributes.unitType)) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{unitTypeLabel(attributes.unitType)}</span>}
              {hasValue(attributes.bedrooms) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{attributes.bedrooms} bedroom{Number(attributes.bedrooms) === 1 ? '' : 's'}</span>}
              {attributes.bathroomPrivate !== false && <span className="rounded-lg bg-slate-50 px-2.5 py-1">Private bathroom</span>}
            </div>
          )}

          {beds.length ? (
            <p className="mt-3 text-sm font-semibold text-slate-800">{beds.join(' · ')}</p>
          ) : null}

          {hasValue(option.details) && typeof option.details !== 'object' && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(option.details)}</p>
          )}

          {roomAmenities.length ? (
            <ul className="mt-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
              {roomAmenities.slice(0, 10).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {amenityLabel(item)}
                </li>
              ))}
            </ul>
          ) : null}

          {bathroomAmenities.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {bathroomAmenities.slice(0, 8).map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{amenityLabel(item)}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 lg:border-l lg:border-t-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">How this price works</p>
          <p className="mt-3 text-sm font-black text-slate-950">{pricing.headline}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{pricing.detail}</p>
          {languageNote ? <p className="mt-3 text-xs font-semibold text-slate-500">{languageNote}</p> : null}
        </div>

        <div className="flex flex-col justify-between border-t border-slate-100 p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Price</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{unitPrice ? formatRwf(unitPrice) : '—'}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{pricing.priceCaption}</p>
          </div>
          {selectable ? (
            <button
              type="button"
              disabled={soldOut}
              onClick={() => onSelect?.(option)}
              className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black transition ${selected ? 'bg-primary text-white' : 'border border-slate-300 bg-white text-slate-900 hover:border-primary'} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
            >
              {soldOut ? 'Sold out' : selected ? 'Selected' : ctaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
