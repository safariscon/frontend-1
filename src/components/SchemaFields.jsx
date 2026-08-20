import PhoneNumberField from './PhoneNumberField';
import { sortSchemaFields } from '../lib/serviceSchema';

export default function SchemaFields({
  schema = [],
  values = {},
  onChange,
  errors = {},
  filterVisibility,
}) {
  const fields = sortSchemaFields(schema).filter((field) => {
    if (!filterVisibility) return true;
    return filterVisibility.includes(field.visibility || 'public');
  });

  if (!fields.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <SchemaField
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[field.id]}
          onChange={(next) => onChange({ ...values, [field.id]: next })}
        />
      ))}
    </div>
  );
}

function SchemaField({ field, value, onChange, error }) {
  const label = (
    <span className="text-sm font-semibold text-slate-700">
      {field.label}
      {field.required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
  const help = field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null;
  const err = error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null;
  const common = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary';

  if (field.type === 'textarea') {
    return (
      <label className="block md:col-span-2">
        {label}
        <textarea
          required={field.required}
          rows={3}
          value={value || ''}
          placeholder={field.placeholder || ''}
          onChange={(event) => onChange(event.target.value)}
          className={common}
        />
        {help}{err}
      </label>
    );
  }

  if (field.type === 'select' || field.type === 'radio') {
    const options = Array.isArray(field.options) ? field.options : [];
    return (
      <label className="block">
        {label}
        <select
          required={field.required}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className={common}
        >
          <option value="">{field.placeholder || 'Select'}</option>
          {options.map((option) => (
            <option key={String(option)} value={String(option)}>{String(option)}</option>
          ))}
        </select>
        {help}{err}
      </label>
    );
  }

  if (field.type === 'checkbox') {
    const options = Array.isArray(field.options) ? field.options : [];
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-semibold text-slate-700">{field.label}{field.required ? <span className="text-red-500"> *</span> : null}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <label key={String(option)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])}
                />
                {String(option)}
              </label>
            );
          })}
        </div>
        {help}{err}
      </fieldset>
    );
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span className="text-sm font-semibold text-slate-700">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'tel') {
    return (
      <div>
        <PhoneNumberField
          label={field.label}
          value={value || ''}
          required={field.required}
          onChange={onChange}
        />
        {help}{err}
      </div>
    );
  }

  const inputType = ['number', 'email', 'url', 'date', 'time', 'datetime-local', 'file'].includes(field.type)
    ? field.type
    : 'text';

  return (
    <label className="block">
      {label}
      <input
        type={inputType}
        required={field.required}
        value={inputType === 'file' ? undefined : (value ?? '')}
        placeholder={field.placeholder || ''}
        min={field.validation?.min}
        max={field.validation?.max}
        pattern={field.validation?.pattern || undefined}
        onChange={(event) => {
          if (inputType === 'file') {
            onChange(event.target.files?.[0] || null);
            return;
          }
          onChange(event.target.value);
        }}
        className={common}
      />
      {help}{err}
    </label>
  );
}
