import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function TermsCheckbox({ checked, onChange, error }) {
  const { language } = useLanguage();
  return (
    <div>
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span>
          {t('acceptTermsPrefix', language)}{' '}
          <Link to="/terms" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
            {t('termsOfUse', language)}
          </Link>{' '}
          {t('and', language)}{' '}
          <Link to="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
            {t('privacyPolicy', language)}
          </Link>
          .
        </span>
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
