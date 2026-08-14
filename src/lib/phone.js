export const PHONE_COUNTRIES = [
  { iso: 'RW', name: 'Rwanda', dial: '250', min: 9, max: 9 },
  { iso: 'KE', name: 'Kenya', dial: '254', min: 9, max: 9 },
  { iso: 'UG', name: 'Uganda', dial: '256', min: 9, max: 9 },
  { iso: 'TZ', name: 'Tanzania', dial: '255', min: 9, max: 9 },
  { iso: 'BI', name: 'Burundi', dial: '257', min: 8, max: 8 },
  { iso: 'CD', name: 'DR Congo', dial: '243', min: 9, max: 9 },
  { iso: 'SS', name: 'South Sudan', dial: '211', min: 9, max: 9 },
  { iso: 'ET', name: 'Ethiopia', dial: '251', min: 9, max: 9 },
  { iso: 'ZA', name: 'South Africa', dial: '27', min: 9, max: 9 },
  { iso: 'NG', name: 'Nigeria', dial: '234', min: 10, max: 10 },
  { iso: 'GH', name: 'Ghana', dial: '233', min: 9, max: 9 },
  { iso: 'US', name: 'United States', dial: '1', min: 10, max: 10 },
  { iso: 'CA', name: 'Canada', dial: '1', min: 10, max: 10 },
  { iso: 'GB', name: 'United Kingdom', dial: '44', min: 10, max: 10 },
  { iso: 'BE', name: 'Belgium', dial: '32', min: 8, max: 9 },
  { iso: 'FR', name: 'France', dial: '33', min: 9, max: 9 },
  { iso: 'DE', name: 'Germany', dial: '49', min: 10, max: 11 },
  { iso: 'NL', name: 'Netherlands', dial: '31', min: 9, max: 9 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', min: 9, max: 9 },
  { iso: 'IN', name: 'India', dial: '91', min: 10, max: 10 },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export const countryByIso = (iso) =>
  PHONE_COUNTRIES.find((item) => item.iso === iso) || DEFAULT_PHONE_COUNTRY;

export const flagUrl = (iso) => `https://flagcdn.com/w40/${String(iso || 'rw').toLowerCase()}.png`;

export const toNationalNumber = (raw, country = DEFAULT_PHONE_COUNTRY) => {
  let digits = digitsOnly(raw);
  if (!digits) return '';
  if (digits.startsWith(country.dial)) digits = digits.slice(country.dial.length);
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  return digits.slice(0, country.max);
};

export const toE164 = (national, country = DEFAULT_PHONE_COUNTRY) => {
  const local = toNationalNumber(national, country);
  return local ? `+${country.dial}${local}` : '';
};

export const detectPhoneCountry = (raw) => {
  const digits = digitsOnly(raw);
  if (!digits) return DEFAULT_PHONE_COUNTRY;
  const matches = PHONE_COUNTRIES.filter((country) => digits.startsWith(country.dial));
  if (matches.length) {
    return matches.sort((a, b) => b.dial.length - a.dial.length)[0];
  }
  if (digits.startsWith('07') || digits.startsWith('7')) return countryByIso('RW');
  return DEFAULT_PHONE_COUNTRY;
};

export const isValidPhoneNumber = (raw, country) => {
  const selected = country || detectPhoneCountry(raw);
  const national = toNationalNumber(raw, selected);
  return national.length >= selected.min && national.length <= selected.max;
};

export const phoneValidationMessage = (country = DEFAULT_PHONE_COUNTRY) => {
  if (country.iso === 'RW') return 'Enter a valid Rwandan number such as 078XXXXXXX.';
  if (country.min === country.max) {
    return `Enter a valid ${country.name} number (${country.min} digits after +${country.dial}).`;
  }
  return `Enter a valid ${country.name} number (${country.min}–${country.max} digits after +${country.dial}).`;
};
