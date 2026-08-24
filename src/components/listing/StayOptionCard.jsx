import { formatRwf } from '../../lib/currency';
import {
  amenityLabel,
  bedSummary,
  hasValue,
  leftLabel,
  occupancyRows,
  optionLeft,
  unitTypeLabel,
} from '../../lib/stayDisplay';

export default function StayOptionCard({
  option,
  selected = false,
  selectable = false,
  onSelect,
  ctaLabel = 'Select',
  languageNote = '',
}) {
  const attributes = option?.attributes || {};
  const left = optionLeft(option);
  const soldOut = left <= 0;
  const beds = bedSummary(attributes.beds);
  const occupancy = occupancyRows(attributes.occupancyPrices);
  const roomAmenities = Array.isArray(attributes.roomAmenities) ? attributes.roomAmenities : [];
  const bathroomAmenities = Array.isArray(attributes.bathroomAmenities) ? attributes.bathroomAmenities : [];

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.7fr)_minmax(11rem,0.6fr)]">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Stay option</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{option.name}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${soldOut ? 'bg-red-50 text-red-700' : left <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
              {leftLabel(option)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
            {hasValue(attributes.maxGuests) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">Sleeps {attributes.maxGuests}</span>}
            {hasValue(unitTypeLabel(attributes.unitType)) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{unitTypeLabel(attributes.unitType)}</span>}
            {hasValue(attributes.bedrooms) && <span className="rounded-lg bg-slate-50 px-2.5 py-1">{attributes.bedrooms} bedroom{Number(attributes.bedrooms) === 1 ? '' : 's'}</span>}
            {attributes.bathroomPrivate !== false && <span className="rounded-lg bg-slate-50 px-2.5 py-1">Private bathroom</span>}
          </div>

          {beds.length ? (
            <p className="mt-3 text-sm font-semibold text-slate-800">{beds.join(' · ')}</p>
          ) : null}

          {hasValue(option.details) && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{option.details}</p>
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
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Your choices</p>
          {occupancy.length ? (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {occupancy.map((row) => (
                <li key={row.guests} className="flex justify-between gap-3">
                  <span>{row.guests} guest{row.guests === 1 ? '' : 's'}</span>
                  <span className="font-bold">{formatRwf(row.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Price shown is for this unit as listed by the provider.</p>
          )}
          {languageNote ? <p className="mt-3 text-xs font-semibold text-slate-500">{languageNote}</p> : null}
        </div>

        <div className="flex flex-col justify-between border-t border-slate-100 p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Price</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{option.price ? formatRwf(option.price) : '—'}</p>
            {option.priceType ? <p className="mt-1 text-xs font-semibold capitalize text-slate-500">{String(option.priceType).replace(/-/g, ' ')}</p> : null}
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
