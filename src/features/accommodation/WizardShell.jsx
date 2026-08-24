import { WIZARD_STEPS } from './contract';

export default function WizardShell({
  title,
  subtitle,
  stepIndex,
  onStepClick,
  children,
  footer,
}) {
  const current = WIZARD_STEPS[stepIndex] || WIZARD_STEPS[0];
  const progress = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Stay onboarding</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">Step {stepIndex + 1} of {WIZARD_STEPS.length}</p>
        <ol className="mt-4 space-y-1">
          {WIZARD_STEPS.map((step, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left ${
                    active ? 'bg-blue-50 text-primary' : done ? 'text-slate-800' : 'text-slate-500'
                  }`}
                >
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                    done ? 'bg-emerald-600 text-white' : active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {done ? '✓' : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{step.title}</span>
                    <span className="block text-[11px] font-medium text-slate-500">{step.scope === 'global' ? 'Reusable later' : 'Stays only'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{current.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle || current.hint}</p>
        </div>
        <div className="px-5 py-6 sm:px-7">{children}</div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
          {footer}
        </div>
      </section>
    </div>
  );
}

export function ChoiceCard({ selected, title, description, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 text-left transition ${
        selected ? 'border-primary bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {badge ? <span className="mb-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">{badge}</span> : null}
      <span className="block text-base font-black text-slate-950">{title}</span>
      {description ? <span className="mt-1 block text-sm text-slate-600">{description}</span> : null}
    </button>
  );
}

export function ChipGroup({ options, values = [], onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              selected ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, min = 0, max = 20, onChange }) {
  const current = Number(value || 0);
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white">
      <button type="button" className="px-3 py-2 text-lg font-black text-slate-600" onClick={() => onChange(Math.max(min, current - 1))}>−</button>
      <span className="min-w-[2.5rem] border-x border-slate-200 px-2 py-2 text-center text-sm font-bold">{current}</span>
      <button type="button" className="px-3 py-2 text-lg font-black text-slate-600" onClick={() => onChange(Math.min(max, current + 1))}>+</button>
    </div>
  );
}

export function ErrorText({ error }) {
  if (!error) return null;
  return <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>;
}
