import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import TermsCheckbox from '../components/TermsCheckbox';

export default function ProviderCompleteRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [form, setForm] = useState({
    providerName: location.state?.providerName || searchParams.get('providerName') || '',
    providerEmail: location.state?.providerEmail || searchParams.get('providerEmail') || '',
    sellerId: location.state?.sellerId || searchParams.get('sellerId') || '',
    newPassword: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('You must accept the Terms of use and Privacy policy before creating an account.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }

    setLoading(true);
    try {
      await authApi.completeProviderRegistration({
        providerName: form.providerName,
        providerEmail: form.providerEmail,
        sellerId: form.sellerId,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
        acceptedTerms: true,
      });
      navigate('/verify-email', {
        state: {
          email: form.providerEmail,
          message: t('providerRegistrationCompleted', language),
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('providerOnboardingTitle', language)}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('providerOnboardingInstructions', language)}
          </p>
          <div className="mb-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
            {t('adminProviderDetails', language)}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required placeholder={t('providerName', language)} value={form.providerName} onChange={updateField('providerName')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="email" required placeholder={t('providerEmail', language)} value={form.providerEmail} onChange={updateField('providerEmail')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="text" required autoCapitalize="characters" placeholder={t('providerId', language)} value={form.sellerId} onChange={updateField('sellerId')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="password" required minLength={8} placeholder={t('createPassword', language)} value={form.newPassword} onChange={updateField('newPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="password" required minLength={8} placeholder={t('confirmPassword', language)} value={form.confirmPassword} onChange={updateField('confirmPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />
            <button type="submit" disabled={loading || !acceptedTerms} className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50">
              {loading ? t('submitting', language) : t('completeProviderRegistration', language)}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            {t('alreadyCompleted', language)}{' '}
            <Link to="/login" className="text-primary hover:underline">{t('loginHere', language)}</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
