import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import AvatarCropModal from '../components/AvatarCropModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi, getAuthData, hotelApi, paymentsApi } from '../lib/api';
import { isSellerRole } from '../lib/dashboard';
import { t } from '../lib/translations';
import { isUploadWithinLimit, MAX_UPLOAD_FILE_SIZE_MB } from '../lib/uploads';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const token = getAuthData()?.token;
  const [payout, setPayout] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ method: 'momo', providerId: '', accountName: '', accountNumber: '' });
  const [payoutPreview, setPayoutPreview] = useState(null);
  const [profileForm, setProfileForm] = useState(() => ({ name: user?.name || '', phone: user?.phone || '' }));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const fileInputRef = useRef(null);
  const [cropSrc, setCropSrc] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropState, setCropState] = useState({ zoom: 1, offset: { x: 0, y: 0 } });
  const [pendingPreview, setPendingPreview] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const cropSrcRef = useRef('');
  const pendingPreviewRef = useRef('');

  useEffect(() => {
    cropSrcRef.current = cropSrc;
    pendingPreviewRef.current = pendingPreview;
  }, [cropSrc, pendingPreview]);

  useEffect(() => () => {
    if (cropSrcRef.current) URL.revokeObjectURL(cropSrcRef.current);
    if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
  }, []);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  const profileUserKey = user?._id || user?.id || user?.email || '';
  const [syncedProfileUser, setSyncedProfileUser] = useState(profileUserKey);
  if (user && profileUserKey !== syncedProfileUser) {
    setSyncedProfileUser(profileUserKey);
    setProfileForm({ name: user.name || '', phone: user.phone || '' });
  }

  useEffect(() => {
    if (!user || !token) return undefined;
    let cancelled = false;
    authApi.getAccountDeletionStatus(token)
      .then((status) => {
        if (!cancelled) setDeletionStatus(status);
      })
      .catch(() => {
        if (!cancelled) setDeletionStatus(null);
      });
    return () => { cancelled = true; };
  }, [token, user]);

  useEffect(() => {
    if (!user || !isSellerRole(user.role) || !token) return undefined;
    paymentsApi.getMethods().then(setCatalog).catch(() => setCatalog(null));
    hotelApi.getPayoutDetails(token).then((response) => {
      const details = response.payoutDetails || null;
      setPayout(details);
      setPayoutForm({
        method: details?.method === 'bank' ? 'bank' : 'momo',
        providerId: details?.providerId || '',
        accountName: details?.accountName || '',
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
        await authApi.changePassword({
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
    setPayoutPreview(null);
    try {
      const response = await hotelApi.savePayoutDetails(token, payoutForm);
      setMessage(response.message || t('profilePage.payoutSavedMsg', language));
      setPayout(response.payoutDetails || payoutForm);
      if (response.gatewayPreview) setPayoutPreview(response.gatewayPreview);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const previewPayout = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await hotelApi.previewPayoutDetails(token, payoutForm);
      setPayoutPreview(response.preview || null);
      setMessage(response.message || 'Payout account preview ready.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const providers = payoutForm.method === 'bank' ? catalog?.bankProviders || [] : catalog?.mobileMoneyProviders || [];
  const displayAvatar = pendingPreview || user.avatarUrl;

  const openPhotoPicker = () => fileInputRef.current?.click();

  const onPhotoSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setError(t('profilePage.photoInvalid', language));
      return;
    }
    if (!isUploadWithinLimit(file)) {
      setError(t('profilePage.photoTooLarge', language, { size: MAX_UPLOAD_FILE_SIZE_MB }));
      return;
    }
    setError('');
    setMessage('');
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropState({ zoom: 1, offset: { x: 0, y: 0 } });
    setCropOpen(true);
  };

  const closeCropper = () => setCropOpen(false);

  const confirmCrop = ({ file, zoom, offset }) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setCropState({ zoom, offset });
    setCropOpen(false);
    setMessage(t('profilePage.photoReady', language));
  };

  const discardPendingPhoto = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview('');
    setPendingFile(null);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (pendingFile) {
        const photoResponse = await authApi.uploadAvatar(token, pendingFile);
        updateUser(photoResponse.user || { avatarUrl: photoResponse.url });
      }
      const response = await authApi.updateProfile(token, profileForm);
      updateUser(response.user);
      discardPendingPhoto();
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc);
        setCropSrc('');
      }
      setMessage(response.message || t('profilePage.profileUpdated', language));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

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
              <button
                type="button"
                onClick={openPhotoPicker}
                className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ${pendingFile ? 'ring-primary' : 'ring-slate-100'}`}
                aria-label={t('profilePage.choosePhoto', language)}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-primary text-2xl font-black text-white">
                    {String(user.name || 'U').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{t('profilePage.photo', language)}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t('profilePage.photoHint', language)}</p>
                {pendingFile ? <p className="mt-1 text-sm font-semibold text-emerald-700">{t('profilePage.photoReady', language)}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={openPhotoPicker} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
                    {displayAvatar ? t('profilePage.changePhoto', language) : t('profilePage.choosePhoto', language)}
                  </button>
                  {cropSrc ? (
                    <button type="button" onClick={() => setCropOpen(true)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
                      {t('profilePage.adjustPhoto', language)}
                    </button>
                  ) : null}
                  {pendingFile ? (
                    <button type="button" onClick={discardPendingPhoto} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">
                      {t('profilePage.discardPhoto', language)}
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoSelected}
                />
              </div>
            </div>
            <form
              onSubmit={saveProfile}
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
                {payout?.verifiedAccountName ? (
                  <p className="text-xs font-semibold text-emerald-700">
                    Verified MoMo name: {payout.verifiedAccountName}
                  </p>
                ) : null}
                {payout?.accountNumber || payout?.msisdn ? <p className="text-xs font-semibold text-emerald-700">{t('profilePage.payoutSaved', language)}</p> : <p className="text-xs font-semibold text-amber-800">{t('profilePage.noPayout', language)}</p>}
                {payoutPreview ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-bold text-slate-900">Sent to XentriPay on payout</p>
                    <p className="mt-1">Name: <span className="font-semibold">{payoutPreview.recipientName}</span></p>
                    <p>MoMo: <span className="font-semibold">{payoutPreview.localMsisdn || payoutPreview.msisdn}</span> ({payoutPreview.providerName || 'provider'})</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={previewPayout} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
                    Check payout format
                  </button>
                  <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? t('savingEllipsis', language) : t('profilePage.savePayout', language)}</button>
                </div>
              </form>
              <p className="mt-3 text-sm text-slate-500">
                {t('profilePage.commissionHint', language, { link: '___LINK___' }).split('___LINK___')[0]}
                <Link to="/settings?doc=payments" className="font-bold text-primary">{t('profilePage.settingsPayments', language)}</Link>
                {t('profilePage.commissionHint', language, { link: '___LINK___' }).split('___LINK___')[1]}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm">
            <h2 className="text-lg font-black text-rose-900">Delete account</h2>
            <p className="mt-1 text-sm text-rose-800/90">
              Permanently remove your SafarisCon account. This cannot be undone.
            </p>
            {deletionStatus ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{deletionStatus.message}</p>
                {deletionStatus.blockers?.services > 0 ? (
                  <p className="mt-2">Services still listed: {deletionStatus.blockers.services}</p>
                ) : null}
                {deletionStatus.blockers?.pendingBookings > 0 ? (
                  <p className="mt-1">Pending bookings: {deletionStatus.blockers.pendingBookings}</p>
                ) : null}
                {deletionStatus.blockers?.paidBookings > 0 ? (
                  <p className="mt-1">Paid / unlocked bookings: {deletionStatus.blockers.paidBookings}</p>
                ) : null}
                {deletionStatus.blockers?.unpaidBookings > 0 && deletionStatus.canDelete ? (
                  <p className="mt-1 text-amber-800">
                    Unpaid bookings that will be marked failed: {deletionStatus.blockers.unpaidBookings}
                  </p>
                ) : null}
              </div>
            ) : null}

            {deletionStatus?.redirect === 'seller_services' || deletionStatus?.code === 'PROVIDER_MUST_DELETE_SERVICES' ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard/seller')}
                className="mt-4 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
              >
                Go to my services
              </button>
            ) : null}

            {user?.role === 'admin' ? (
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Admin accounts cannot be self-deleted.
              </p>
            ) : (
              <form
                className="mt-4 grid gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError('');
                  setMessage('');
                  if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
                    setError('Type DELETE to confirm.');
                    return;
                  }
                  if (deletionStatus && !deletionStatus.canDelete) {
                    if (deletionStatus.redirect === 'seller_services' || deletionStatus.code === 'PROVIDER_MUST_DELETE_SERVICES') {
                      navigate('/dashboard/seller');
                      return;
                    }
                    setError(deletionStatus.message || 'Account cannot be deleted yet.');
                    return;
                  }
                  setDeletingAccount(true);
                  try {
                    await authApi.deleteAccount(token, 'DELETE');
                    setMessage('Account deleted.');
                    await logout();
                    navigate('/login', { replace: true });
                  } catch (requestError) {
                    const details = requestError?.payload?.details || requestError?.details;
                    if (details) setDeletionStatus(details);
                    if (requestError?.payload?.code === 'PROVIDER_MUST_DELETE_SERVICES' || requestError?.code === 'PROVIDER_MUST_DELETE_SERVICES' || details?.redirect === 'seller_services') {
                      navigate('/dashboard/seller');
                    }
                    setError(requestError.message || 'Could not delete account.');
                  } finally {
                    setDeletingAccount(false);
                  }
                }}
              >
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Type DELETE to confirm</span>
                  <input
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-rose-300 px-4 py-3"
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </label>
                <button
                  disabled={deletingAccount || busy || (deletionStatus && !deletionStatus.canDelete && deletionStatus.role === 'admin')}
                  className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {deletingAccount ? 'Deleting…' : 'Delete my account'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
      {cropOpen && cropSrc ? (
        <AvatarCropModal
          src={cropSrc}
          initialZoom={cropState.zoom}
          initialOffset={cropState.offset}
          onCancel={closeCropper}
          onConfirm={confirmCrop}
        />
      ) : null}
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
