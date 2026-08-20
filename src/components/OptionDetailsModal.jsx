import { availabilityFacts, parseOptionAvailability } from '../lib/availability';
import { formatRwf } from '../lib/currency';

export default function OptionDetailsModal({ row, listing, onClose }) {
  const option = parseOptionAvailability(row, listing);
  const facts = availabilityFacts(option);
  const attributes = row?.attributes || row?.cells?.attributes || {};
  const schema = listing?.schemaSnapshot?.optionFieldSchema
    || listing?.category?.optionFieldSchema
    || [];
  const publicAttrs = schema
    .filter((field) => (field.visibility || 'public') === 'public')
    .map((field) => {
      const value = attributes[field.id];
      if (value === undefined || value === null || String(value).trim() === '') return null;
      return [field.label || field.id, Array.isArray(value) ? value.join(', ') : String(value)];
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Option details & availability</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{option.name}</h3>
            {option.price > 0 && <p className="mt-1 font-bold text-primary">{formatRwf(option.price)}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-gray-500" aria-label="Close">×</button>
        </div>

        {(facts.length > 0 || publicAttrs.length > 0) && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {[...facts, ...publicAttrs].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
          Choose a booking date{option.requiresEndDate ? ' and end date' : ''}
          {option.availableFrom || option.availableTo ? ' inside this window' : ''}.
          {option.requiresTime
            ? ` Start and end times are required${option.openTime && option.closeTime ? ` between ${facts.find(([label]) => label === 'Hours')?.[1]}` : ''}.`
            : ''}
        </p>

        <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-primary px-4 py-2 font-bold text-white">Close</button>
      </div>
    </div>
  );
}
