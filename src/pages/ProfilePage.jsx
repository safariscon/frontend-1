import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi, getAuthData, hotelApi, paymentsApi } from '../lib/api';
import { isSellerRole } from '../lib/dashboard';
import { t } from '../lib/translations';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const token = getAuthData()?.token;
  const [payout, setPayout] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ method: 'momo', providerId: '', accountName: '', accountNumber: '' });
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
    else setProfileForm({ name: user.name || '', phone: user.phone || '' });
  }, [navigate, user]);

  useEffect(() => {
    if (!user || !isSellerRole(user.role) || !token) return undefined;
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
    hotelApi.getPayoutDetails(token).then((response) => {
      const details = response.payoutDetails || null;
      setPayout(details);
      setPayoutForm({
        method: details?.method === 'bank' ? 'bank' : 'momo',
        providerId: details?.providerId || '',
        accountName: details?.accountName || user.name || '',
        accountNumber: details?.accountNumber || details?.msisdn || '',
      });
    }).catch(() => setPayout(null));
  }, [token, user]);

  if (!user) return null;

  const sendResetCode = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await authApi.forgotPassword(user.email);
      setOtpSent(true);
      setMessage(t('profilePage.resetCodeEmailed', language));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (passwordForm.newPassword.length < 8) {
      setError(t('profilePage.passwordMin8', language));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }
    setBusy(true);
    try {
      if (otpSent && passwordForm.otp) {
        await authApi.resetPassword(user.email, passwordForm.otp, passwordForm.newPassword);
        setMessage(t('profilePage.passwordUpdatedNext', language));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
        setOtpSent(false);
      } else {
        await authApi.changePassword(token, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        });
        setMessage(t('profilePage.passwordUpdated', language));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      }
    } catch (requestError) {
      setError(requestError.message || t('profilePage.passwordUpdateFailed', language));
    } finally {
      setBusy(false);
    }
  };

  const savePayout = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await hotelApi.savePayoutDetails(token, payoutForm);
      setMessage(response.message || t('profilePage.payoutSavedMsg', language));
      setPayout(response.payoutDetails || payoutForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const providers = payoutForm.method === 'bank' ? catalog?.bankProviders || [] : catalog?.mobileMoneyProviders || [];

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('profilePage.account', language)}</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">{t('profilePage.title', language)}</h1>
            <p className="mt-2 text-sm text-slate-600">{t('profilePage.lead', language)}</p>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">{t('profilePage.information', language)}</h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-xl font-black text-white">
                  {String(user.name || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">{t('profilePage.photo', language)}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block text-sm"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !token) return;
                    setBusy(true);
                    setError('');
                    setMessage('');
                    try {
                      const response = await authApi.uploadAvatar(token, file);
                      updateUser(response.user || { avatarUrl: response.url });
                      setMessage(response.message || t('profilePage.photoUpdated', language));
                    } catch (requestError) {
                      setError(requestError.message);
                    } finally {
                      setBusy(false);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError('');
                setMessage('');
                try {
                  const response = await authApi.updateProfile(token, profileForm);
                  updateUser(response.user);
                  setMessage(response.message || t('profilePage.profileUpdated', language));
                } catch (requestError) {
                  setError(requestError.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">{t('profilePage.name', language)}</span>
                <input required value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">{t('profilePage.phone', language)}</span>
                <input value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <Info label={t('profilePage.email', language)} value={user.email || '-'} />
              <Info label={t('profilePage.role', language)} value={isSellerRole(user.role) ? t('serviceProviderRole', language) : String(user.role || 'user').replace(/[-_]/g, ' ')} />
              {user.sellerId && <Info label={t('profilePage.sellerId', language)} value={user.sellerId} />}
              <div className="sm:col-span-2">
                <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? t('savingEllipsis', language) : t('profilePage.saveProfile', language)}</button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">{t('profilePage.password', language)}</h2>
            <p className="mt-1 text-sm text-slate-600">{t('profilePage.passwordLead', language)}</p>
            <form onSubmit={savePassword} className="mt-4 grid gap-3">
              {!otpSent && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('profilePage.currentPassword', language)}</span>
                  <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              )}
              {otpSent && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('profilePage.emailCode', language)}</span>
                  <input required value={passwordForm.otp} onChange={(event) => setPasswordForm((prev) => ({ ...prev, otp: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">{t('profilePage.newPassword', language)}</span>
                <input required minLength={8} type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">{t('profilePage.confirmNewPassword', language)}</span>
                <input required minLength={8} type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? t('savingEllipsis', language) : t('profilePage.updatePassword', language)}</button>
                <button type="button" disabled={busy} onClick={sendResetCode} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{t('profilePage.sendResetCode', language)}</button>
              </div>
            </form>
          </section>

          {isSellerRole(user.role) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">{t('profilePage.paymentInfo', language)}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('profilePage.paymentLead', language)}</p>
              <form onSubmit={savePayout} className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('profilePage.payoutMethod', language)}</span>
                  <select value={payoutForm.method} onChange={(event) => setPayoutForm((prev) => ({ ...prev, method: event.target.value, providerId: '' }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="momo">{t('mobileMoney', language)}</option>
                    <option value="bank">{t('bank', language)}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('profilePage.provider', language)}</span>
                  <select required value={payoutForm.providerId} onChange={(event) => setPayoutForm((prev) => ({ ...prev, providerId: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">{t('profilePage.selectProvider', language)}</option>
                    {providers.map((provider) => {
                      const id = String(provider.id || provider.providerId || provider.code || '');
                      return <option key={id || provider.name} value={id}>{provider.name}</option>;
                    })}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{t('profilePage.accountName', language)}</span>
                  <input required value={payoutForm.accountName} onChange={(event) => setPayoutForm((prev) => ({ ...prev, accountName: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{payoutForm.method === 'bank' ? t('profilePage.accountNumber', language) : t('profilePage.momoNumber', language)}</span>
                  <input required value={payoutForm.accountNumber} onChange={(event) => setPayoutForm((prev) => ({ ...prev, accountNumber: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                {payout?.accountNumber || payout?.msisdn ? <p className="text-xs font-semibold text-emerald-700">{t('profilePage.payoutSaved', language)}</p> : <p className="text-xs font-semibold text-amber-800">{t('profilePage.noPayout', language)}</p>}
                <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? t('savingEllipsis', language) : t('profilePage.savePayout', language)}</button>
              </form>
              <p className="mt-3 text-sm text-slate-500">
                {t('profilePage.commissionHint', language, { link: '___LINK___' }).split('___LINK___')[0]}
                <Link to="/settings?doc=payments" className="font-bold text-primary">{t('profilePage.settingsPayments', language)}</Link>
                {t('profilePage.commissionHint', language, { link: '___LINK___' }).split('___LINK___')[1]}
              </p>
            </section>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black text-slate-900">{value}</dd>
    </div>
  );
}
