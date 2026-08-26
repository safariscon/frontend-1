import { getBookingDetailSections, hasBookingDetailSections } from '../lib/bookingDetailDisplay';

function FieldGrid({ rows }) {
  if (!rows?.length) return null;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="rounded-xl bg-slate-50 p-3">
          <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{row.label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function BookingDetailCards({ details, title = 'Submitted details' }) {
  const sections = getBookingDetailSections(details);
  if (!hasBookingDetailSections(sections)) return null;

  return (
    <div className="mt-4 space-y-4">
      {sections.fields.length ? (
        <SectionCard title={title}>
          <FieldGrid rows={sections.fields} />
        </SectionCard>
      ) : null}

      {sections.stay.length ? (
        <SectionCard title="Stay details">
          <FieldGrid rows={sections.stay} />
        </SectionCard>
      ) : null}

      {sections.location.length ? (
        <SectionCard title="Customer location">
          <FieldGrid rows={sections.location} />
        </SectionCard>
      ) : null}

      {sections.consumption.length ? (
        <SectionCard title="Schedule">
          <FieldGrid rows={sections.consumption} />
        </SectionCard>
      ) : null}

      {sections.rules.length ? (
        <SectionCard title="Provider rules">
          <ul className="space-y-2">
            {sections.rules.map((rule, index) => (
              <li key={`${rule}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                {rule}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {sections.custom.length ? (
        <SectionCard title="Form answers">
          <FieldGrid rows={sections.custom} />
        </SectionCard>
      ) : null}
    </div>
  );
}
