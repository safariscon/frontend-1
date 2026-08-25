const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary';

export function Field({
  label,
  required,
  help,
  error,
  type = 'text',
  value,
  onChange,
  options = [],
  min,
  max,
  placeholder,
  wide = false,
}) {
  const labelNode = (
    <span className="text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
  const helpNode = help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null;
  const errorNode = error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null;

  if (type === 'boolean') {
    return (
      <label className={`flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 ${wide ? 'md:col-span-2' : ''}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </label>
    );
  }

  if (type === 'textarea') {
    return (
      <label className="block md:col-span-2">
        {labelNode}
        <textarea
          required={required}
          rows={3}
          value={value || ''}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        {helpNode}
        {errorNode}
      </label>
    );
  }

  if (type === 'select') {
    return (
      <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
        {labelNode}
        <select required={required} value={value || ''} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          <option value="">{placeholder || 'Select'}</option>
          {(Array.isArray(options) ? options : []).map((option) => {
            const value = option && typeof option === 'object' ? (option.value ?? option.id ?? '') : option;
            const label = option && typeof option === 'object' ? (option.label ?? option.value ?? option.id ?? '') : option;
            if (value === undefined || value === null || value === '') return null;
            return <option key={String(value)} value={String(value)}>{String(label)}</option>;
          })}
        </select>
        {helpNode}
        {errorNode}
      </label>
    );
  }

  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      {labelNode}
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(type === 'number' ? event.target.value : event.target.value)}
        className={inputClass}
      />
      {helpNode}
      {errorNode}
    </label>
  );
}

export function FieldGrid({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      {title ? <h3 className="font-black text-slate-950">{title}</h3> : null}
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}
