import { useState } from 'react';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  countryByIso,
  detectPhoneCountry,
  flagUrl,
  phoneValidationMessage,
  toE164,
  toNationalNumber,
} from '../lib/phone';

const FIELD_CLASS = 'rounded-xl border border-gray-300 bg-white px-4 py-3';

export default function PhoneNumberField({
  label = 'Phone number',
  value,
  onChange,
  required = false,
  disabled = false,
}) {
  const [iso, setIso] = useState(() => detectPhoneCountry(value).iso);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value) {
      const nextIso = detectPhoneCountry(value).iso;
      if (nextIso !== iso) setIso(nextIso);
    }
  }
  const country = countryByIso(iso);
  const national = toNationalNumber(value, country);

  const emit = (nextIso, nextNational) => {
    const nextCountry = countryByIso(nextIso);
    onChange(toE164(nextNational, nextCountry));
  };

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex min-w-0 items-stretch gap-2">
        <span className={`inline-flex min-w-[7.5rem] items-center gap-2 ${FIELD_CLASS} pr-2`}>
          <img src={flagUrl(country.iso)} alt="" className="h-4 w-5 shrink-0 rounded-sm object-cover" />
          <select
            aria-label="Country code"
            disabled={disabled}
            value={iso}
            onChange={(event) => {
              setIso(event.target.value);
              emit(event.target.value, national);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none"
          >
            {PHONE_COUNTRIES.map((item) => (
              <option key={item.iso} value={item.iso}>
                {item.iso} +{item.dial}
              </option>
            ))}
          </select>
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={national}
          onChange={(event) => emit(iso, event.target.value)}
          placeholder={country.iso === 'RW' ? '078XXXXXXX' : `+${country.dial} number`}
          className={`min-w-0 flex-1 ${FIELD_CLASS}`}
        />
      </div>
      <span className="mt-1 block min-h-[2.5rem] text-xs leading-5 text-gray-500">{phoneValidationMessage(country)}</span>
    </label>
  );
}

export { DEFAULT_PHONE_COUNTRY };
