import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { authApi, getAuthData, hotelApi, paymentsApi } from '../lib/api';
import { isSellerRole } from '../lib/dashboard';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = getAuthData()?.token;
  const [payout, setPayout] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ method: 'momo', providerId: '', accountName: '', accountNumber: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
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
      setMessage('We emailed a reset code. Enter it with your new password.');
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
      setError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (otpSent && passwordForm.otp) {
        await authApi.resetPassword(user.email, passwordForm.otp, passwordForm.newPassword);
        setMessage('Password updated. Use it the next time you sign in.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
        setOtpSent(false);
      } else {
        await authApi.changePassword(token, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        });
        setMessage('Password updated.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      }
    } catch (requestError) {
      setError(requestError.message || 'Password could not be updated. Send an email code and reset with OTP.');
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
      setMessage(response.message || 'Payout details saved.');
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
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Account</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Profile</h1>
            <p className="mt-2 text-sm text-slate-600">Update your password and review the details on this account. Account summary also stays in Settings.</p>
          </div>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Profile information</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Name" value={user.name || '-'} />
              <Info label="Email" value={user.email || '-'} />
              <Info label="Phone" value={user.phone || 'Not set'} />
              <Info label="Role" value={isSellerRole(user.role) ? 'Service provider' : String(user.role || 'user').replace(/[-_]/g, ' ')} />
              {user.sellerId && <Info label="Seller ID" value={user.sellerId} />}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Password</h2>
            <p className="mt-1 text-sm text-slate-600">Change your password here, or send an email code if you do not remember the current one.</p>
            <form onSubmit={savePassword} className="mt-4 grid gap-3">
              {!otpSent && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Current password</span>
                  <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              )}
              {otpSent && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email code</span>
                  <input required value={passwordForm.otp} onChange={(event) => setPasswordForm((prev) => ({ ...prev, otp: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">New password</span>
                <input required minLength={8} type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Confirm new password</span>
                <input required minLength={8} type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Update password'}</button>
                <button type="button" disabled={busy} onClick={sendResetCode} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Send reset code</button>
              </div>
            </form>
          </section>

          {isSellerRole(user.role) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Payment info</h2>
              <p className="mt-1 text-sm text-slate-600">MoMo or bank details used to pay you after the guest cancel window. Customers never see this. You can also edit this on the Payout account tab.</p>
              <form onSubmit={savePayout} className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Payout method</span>
                  <select value={payoutForm.method} onChange={(event) => setPayoutForm((prev) => ({ ...prev, method: event.target.value, providerId: '' }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="momo">Mobile Money</option>
                    <option value="bank">Bank</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Provider</span>
                  <select required value={payoutForm.providerId} onChange={(event) => setPayoutForm((prev) => ({ ...prev, providerId: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="">Select provider</option>
                    {providers.map((provider) => {
                      const id = String(provider.id || provider.providerId || provider.code || '');
                      return <option key={id || provider.name} value={id}>{provider.name}</option>;
                    })}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Account name</span>
                  <input required value={payoutForm.accountName} onChange={(event) => setPayoutForm((prev) => ({ ...prev, accountName: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">{payoutForm.method === 'bank' ? 'Account number' : 'MoMo number'}</span>
                  <input required value={payoutForm.accountNumber} onChange={(event) => setPayoutForm((prev) => ({ ...prev, accountNumber: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                {payout?.accountNumber || payout?.msisdn ? <p className="text-xs font-semibold text-emerald-700">A payout account is already saved.</p> : <p className="text-xs font-semibold text-amber-800">No payout account yet. Customers cannot pay until this is saved.</p>}
                <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Save payout details'}</button>
              </form>
              <p className="mt-3 text-sm text-slate-500">Commission terms live in <Link to="/settings?doc=payments" className="font-bold text-primary">Settings → Payments</Link>.</p>
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
