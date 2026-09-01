const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary';

const toDateInputValue = (value) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const toInputValue = (type, value) => {
  if (type === 'date') return toDateInputValue(value);
  if (type === 'time') return String(value || '').slice(0, 5);
  if (type === 'datetime-local') {
    if (!value) return '';
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
    const date = toDateInputValue(value);
    return date ? `${date}T00:00` : '';
  }
  if (value == null) return '';
  if (typeof value === 'object') return '';
  return value;
};

function normalizeOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => {
      const optionValue = option && typeof option === 'object' ? (option.value ?? option.id ?? '') : option;
      const optionLabel = option && typeof option === 'object' ? (option.label ?? option.value ?? option.id ?? '') : option;
      return { value: String(optionValue ?? ''), label: String(optionLabel ?? '') };
    })
    .filter((option) => option.value !== '');
}

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
  const helpNode = help != null && help !== '' && typeof help !== 'object' ? <p className="mt-1 text-xs text-slate-500">{String(help)}</p> : null;
  const errorNode = error != null && error !== '' && typeof error !== 'object' ? <p className="mt-1 text-xs font-semibold text-red-600">{String(error)}</p> : null;

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
          value={toInputValue('text', value)}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        {helpNode}
        {errorNode}
      </label>
    );
  }

  if (type === 'radio' || type === 'multiselect') {
    const selected = type === 'multiselect' ? (Array.isArray(value) ? value.map(String) : []) : [];
    const toggle = (optionValue) => {
      if (type === 'radio') {
        onChange(optionValue);
        return;
      }
      onChange(selected.includes(optionValue)
        ? selected.filter((item) => item !== optionValue)
        : [...selected, optionValue]);
    };
    return (
      <div className={`block ${wide ? 'md:col-span-2' : ''}`}>
        {labelNode}
        <div className="mt-2 flex flex-wrap gap-2">
          {normalizeOptions(options).map((option) => {
            const active = type === 'radio'
              ? String(value ?? '') === option.value
              : selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {helpNode}
        {errorNode}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
        {labelNode}
        <select required={required} value={toInputValue('text', value)} onChange={(event) => onChange(event.target.value)} className={inputClass}>
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
        min={type === 'date' ? toDateInputValue(min) || undefined : min}
        max={type === 'date' ? toDateInputValue(max) || undefined : max}
        value={toInputValue(type, value)}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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
      {title && typeof title !== 'object' ? <h3 className="font-black text-slate-950">{String(title)}</h3> : null}
      {hint && typeof hint !== 'object' ? <p className="mt-1 text-sm text-slate-500">{String(hint)}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}
