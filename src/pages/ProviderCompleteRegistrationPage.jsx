import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi, paymentsApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import TermsCheckbox from '../components/TermsCheckbox';
import { t } from '../lib/translations';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getProviderRegisterSeo } from '../lib/seo';

export default function ProviderCompleteRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const querySellerId = (searchParams.get('sellerId') || location.state?.sellerId || '').trim();
  const [form, setForm] = useState({
    providerName: location.state?.providerName || searchParams.get('providerName') || '',
    providerEmail: location.state?.providerEmail || searchParams.get('providerEmail') || '',
    sellerId: querySellerId,
    newPassword: '',
    confirmPassword: '',
  });
  const [payout, setPayout] = useState({
    method: 'momo',
    providerId: '',
    accountName: '',
    accountNumber: '',
  });
  const [catalog, setCatalog] = useState(null);
  const [lockedProfile, setLockedProfile] = useState(false);
  const [lookupStatus, setLookupStatus] = useState(querySellerId ? 'loading' : 'idle');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  const updateField = (field) => (event) => {
    const value = field === 'sellerId' ? event.target.value.toUpperCase() : event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const loadOnboarding = async (sellerId, { redirectIfDone = true } = {}) => {
    const id = String(sellerId || '').trim();
    if (!id) {
      setLookupStatus('idle');
      setLockedProfile(false);
      return;
    }
    setLookupStatus('loading');
    setError('');
    try {
      const response = await authApi.getProviderOnboarding(id);
      const autocomplete = response.autocomplete || {};
      const fields = response.fields || {};
      setForm((previous) => ({
        ...previous,
        sellerId: autocomplete.sellerId || fields.sellerId?.value || response.sellerId || id,
        providerName: autocomplete.providerName || fields.providerName?.value || response.providerName || previous.providerName,
        providerEmail: autocomplete.providerEmail || fields.providerEmail?.value || response.providerEmail || previous.providerEmail,
      }));
      setPayout((previous) => ({
        ...previous,
        accountName: autocomplete.providerName || response.providerName || previous.accountName,
      }));
      setLockedProfile(true);
      setLookupStatus('ready');
    } catch (requestError) {
      if (requestError.code === 'ONBOARDING_ALREADY_COMPLETED' || requestError.status === 409) {
        if (redirectIfDone) {
          navigate('/login', {
            replace: true,
          state: { message: t('providerAlreadyCompleted', language) },
          });
        }
        return;
      }
      setLockedProfile(false);
      setLookupStatus('error');
      if (requestError.status === 404) {
        setError(t('sellerIdNotFound', language));
        return;
      }
      if (requestError.status === 400) {
        setError(t('enterSellerIdInvite', language));
        return;
      }
      setError(requestError.message);
    }
  };

  useEffect(() => {
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (!querySellerId) return undefined;
    const timer = window.setTimeout(() => loadOnboarding(querySellerId), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once from the invite URL
  }, [querySellerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError(t('mustAcceptTerms', language));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t('passwordMinLength8', language));
      return;
    }
    const businessName = form.providerName.trim();
    const accountName = payout.accountName.trim() || businessName;
    const accountNumber = payout.accountNumber.replace(/\s/g, '');
    const providerId = String(payout.providerId || '').trim();
    const method = payout.method === 'bank' ? 'bank' : 'momo';
    if (!businessName || !method || !providerId || !accountName || !accountNumber) {
      setError(t('payoutRequired', language));
      return;
    }

    setLoading(true);
    try {
      const payoutDetails = {
        method,
        providerId,
        accountName,
        accountNumber,
        ...(method === 'momo' ? { msisdn: accountNumber } : {}),
      };
      await authApi.completeProviderRegistration({
        sellerId: form.sellerId.trim(),
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
        acceptedTerms: true,
        providerName: businessName,
        businessName,
        providerEmail: form.providerEmail.trim() || undefined,
        payoutMethod: method,
        payoutDetails,
      });
      navigate('/verify-email', {
        state: {
          email: form.providerEmail,
          message: t('providerRegistrationCompleted', language),
        },
      });
    } catch (requestError) {
      if (requestError.code === 'ONBOARDING_ALREADY_COMPLETED' || requestError.status === 409) {
        navigate('/login', {
          replace: true,
          state: { message: t('providerAlreadyCompleted', language) },
        });
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const payoutProviders = payout.method === 'bank' ? catalog?.bankProviders || [] : catalog?.mobileMoneyProviders || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SeoHead {...getProviderRegisterSeo(language)} />
      <Navbar />
      <SeoBreadcrumbs items={[{ label: t('navigation.home', language), to: '/' }, { label: t('becomeAProvider', language) }]} />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('providerOnboardingTitle', language)}
          </h1>
          <div className="mb-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
            {querySellerId
              ? t('inviteWithPayout', language)
              : t('adminProviderDetails', language)}
          </div>

          {lookupStatus === 'loading' && (
            <p className="mb-4 text-sm font-semibold text-blue-800">{t('loadingInvite', language)}</p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('providerName', language)}</span>
              <input
                type="text"
                readOnly={lockedProfile}
                placeholder={t('providerName', language)}
                value={form.providerName}
                onChange={updateField('providerName')}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${lockedProfile ? 'bg-gray-100 text-gray-700' : 'bg-white'}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('providerEmail', language)}</span>
              <input
                type="email"
                readOnly={lockedProfile}
                placeholder={t('providerEmail', language)}
                value={form.providerEmail}
                onChange={updateField('providerEmail')}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${lockedProfile ? 'bg-gray-100 text-gray-700' : 'bg-white'}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{t('providerId', language)} *</span>
              <input
                type="text"
                required
                autoCapitalize="characters"
                placeholder={t('providerId', language)}
                value={form.sellerId}
                onChange={updateField('sellerId')}
                onBlur={() => {
                  if (lockedProfile && form.sellerId.trim() === querySellerId) return;
                  loadOnboarding(form.sellerId, { redirectIfDone: true });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <span className="mt-1 block text-xs text-gray-500">{t('sellerIdHint', language)}</span>
            </label>
            <input type="password" required minLength={8} placeholder={t('createPassword', language)} value={form.newPassword} onChange={updateField('newPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="password" required minLength={8} placeholder={t('confirmPassword', language)} value={form.confirmPassword} onChange={updateField('confirmPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />

            <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
              <legend className="px-1 text-sm font-bold text-gray-900">{t('payoutDetailsLegend', language)}</legend>
              <p className="text-xs text-gray-600">{t('payoutDetailsHelp', language)}</p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{t('payoutMethod', language)}</span>
                <select
                  required
                  value={payout.method}
                  onChange={(event) => setPayout((previous) => ({ ...previous, method: event.target.value, providerId: '' }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option value="momo">{t('mobileMoney', language)}</option>
                  <option value="bank">{t('bank', language)}</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{t('providerLabel', language)}</span>
                <select
                  required
                  value={payout.providerId}
                  onChange={(event) => setPayout((previous) => ({ ...previous, providerId: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option value="">{t('selectProvider', language)}</option>
                  {payoutProviders.map((provider) => {
                    const id = String(provider.id || provider.providerId || provider.code || '');
                    return <option key={id || provider.name} value={id}>{provider.name}</option>;
                  })}
                </select>
              </label>
              <input
                type="text"
                required
                placeholder={t('accountName', language)}
                value={payout.accountName}
                onChange={(event) => setPayout((previous) => ({ ...previous, accountName: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder={payout.method === 'bank' ? t('accountNumber', language) : t('payment.momoNumber', language)}
                value={payout.accountNumber}
                onChange={(event) => setPayout((previous) => ({ ...previous, accountNumber: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
            </fieldset>

            <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />
            <button type="submit" disabled={loading || !acceptedTerms || lookupStatus === 'loading'} className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50">
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
