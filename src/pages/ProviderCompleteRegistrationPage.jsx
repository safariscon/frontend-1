import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi, paymentsApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import TermsCheckbox from '../components/TermsCheckbox';
import { t } from '../lib/translations';


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
            state: { message: 'This provider account is already completed. Sign in with your email and password.' },
          });
        }
        return;
      }
      setLockedProfile(false);
      setLookupStatus('error');
      if (requestError.status === 404) {
        setError('That seller ID was not found. Use the exact ID from your invite email.');
        return;
      }
      if (requestError.status === 400) {
        setError('Enter the seller ID from your invite email to load your provider details.');
        return;
      }
      setError(requestError.message);
    }
  };

  useEffect(() => {
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (querySellerId) loadOnboarding(querySellerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once from the invite URL
  }, [querySellerId]);

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
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const businessName = form.providerName.trim();
    const accountName = payout.accountName.trim() || businessName;
    const accountNumber = payout.accountNumber.replace(/\s/g, '');
    const providerId = String(payout.providerId || '').trim();
    const method = payout.method === 'bank' ? 'bank' : 'momo';
    if (!businessName || !method || !providerId || !accountName || !accountNumber) {
      setError('Add your business name and MoMo or bank payout details so this provider can receive booking payments.');
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
          state: { message: 'This provider account is already completed. Sign in with your email and password.' },
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
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('providerOnboardingTitle', language)}
          </h1>
          <div className="mb-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
            {querySellerId
              ? 'Confirm your seller ID, create a password, accept the terms, and add payout details. Name and email come from your admin invite.'
              : t('adminProviderDetails', language)}
          </div>

          {lookupStatus === 'loading' && (
            <p className="mb-4 text-sm font-semibold text-blue-800">Loading your invite details...</p>
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
              <span className="mt-1 block text-xs text-gray-500">Type the seller ID from your invite email to confirm it.</span>
            </label>
            <input type="password" required minLength={8} placeholder={t('createPassword', language)} value={form.newPassword} onChange={updateField('newPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
            <input type="password" required minLength={8} placeholder={t('confirmPassword', language)} value={form.confirmPassword} onChange={updateField('confirmPassword')} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />

            <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
              <legend className="px-1 text-sm font-bold text-gray-900">Payout details *</legend>
              <p className="text-xs text-gray-600">Required so SafarisCon can pay you after the guest cancel window. Customers never see these details.</p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Payout method</span>
                <select
                  required
                  value={payout.method}
                  onChange={(event) => setPayout((previous) => ({ ...previous, method: event.target.value, providerId: '' }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option value="momo">Mobile Money</option>
                  <option value="bank">Bank</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Provider</span>
                <select
                  required
                  value={payout.providerId}
                  onChange={(event) => setPayout((previous) => ({ ...previous, providerId: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option value="">Select provider</option>
                  {payoutProviders.map((provider) => {
                    const id = String(provider.id || provider.providerId || provider.code || '');
                    return <option key={id || provider.name} value={id}>{provider.name}</option>;
                  })}
                </select>
              </label>
              <input
                type="text"
                required
                placeholder="Account name"
                value={payout.accountName}
                onChange={(event) => setPayout((previous) => ({ ...previous, accountName: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder={payout.method === 'bank' ? 'Account number' : 'MoMo number'}
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
