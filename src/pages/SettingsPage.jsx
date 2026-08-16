import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import InstallButton from '../components/InstallButton';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supportedLanguages } from '../lib/translations';
import { isSellerRole } from '../lib/dashboard';
import { adminApi, getAuthData, hotelApi, publicApi } from '../lib/api';
import { HowItWorksPage, PaymentsPolicyPage, PrivacyPage, TermsPage } from './PolicyPages';
import { AnnouncementForm, MarketplaceSettingsForm } from './AdminDashboard';
import { DEFAULT_ANNOUNCEMENT } from '../lib/announcementDefaults';

const DOCS = [
  ['how-it-works', 'How it works'],
  ['terms', 'Terms of use'],
  ['privacy', 'Privacy policy'],
  ['payments', 'Payments & cancellations'],
];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const { isInstalled } = useInstall();
  const [commission, setCommission] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(DEFAULT_ANNOUNCEMENT);
  const [marketplaceSettings, setMarketplaceSettings] = useState({ defaultCommissionPercentage: 10, bookingMode: 'manual', bookingRules: [] });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const doc = DOCS.some(([id]) => id === searchParams.get('doc')) ? searchParams.get('doc') : 'how-it-works';
  const token = getAuthData()?.token;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  useEffect(() => {
    if (!user || !isSellerRole(user.role)) return undefined;
    hotelApi.getOverview(getAuthData()?.token).then((overview) => {
      setCommission(overview?.business || overview);
    }).catch(() => setCommission(null));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    Promise.all([
      publicApi.getAnnouncement().catch(() => DEFAULT_ANNOUNCEMENT),
      publicApi.getMarketplaceSettings().catch(() => ({ settings: { defaultCommissionPercentage: 10, bookingMode: 'manual', bookingRules: [] } })),
    ]).then(([announcementResp, settingsResp]) => {
      const items = announcementResp.announcements?.length
        ? announcementResp.announcements
        : announcementResp.announcement?.text
          ? [announcementResp.announcement]
          : announcementResp.items || DEFAULT_ANNOUNCEMENT.items;
      setAnnouncementForm({
        enabled: announcementResp.enabled ?? announcementResp.announcement?.enabled ?? true,
        intervalSeconds: announcementResp.intervalSeconds || 5,
        items: items.slice(0, 5),
      });
      setMarketplaceSettings(settingsResp.settings || { defaultCommissionPercentage: 10, bookingMode: 'manual', bookingRules: [] });
    });
  }, [isAdmin]);

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSettingsError('');
    try {
      const response = await adminApi.updateAnnouncement(token, announcementForm);
      setSettingsMessage(response.message || 'Announcement updated.');
    } catch (requestError) {
      setSettingsError(requestError.message);
    }
  };

  const saveMarketplaceSettings = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSettingsError('');
    try {
      const response = await adminApi.updateMarketplaceSettings(token, marketplaceSettings);
      setMarketplaceSettings(response.settings || marketplaceSettings);
      setSettingsMessage(response.message || 'Booking rules saved.');
    } catch (requestError) {
      setSettingsError(requestError.message);
    }
  };

  const saveGlobalBookingMode = async (bookingMode) => {
    const nextSettings = { ...marketplaceSettings, bookingMode };
    setMarketplaceSettings(nextSettings);
    if (!token) return;
    setSettingsError('');
    try {
      const response = await adminApi.updateMarketplaceSettings(token, nextSettings);
      setMarketplaceSettings(response.settings || nextSettings);
      setSettingsMessage(response.message || 'Booking mode saved.');
    } catch (requestError) {
      setSettingsError(requestError.message);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-950 dark:text-slate-50">Settings</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage workspace preferences.</p>
          </div>
          {(settingsMessage || settingsError) && (
            <div className="mb-4 space-y-2">
              {settingsError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{settingsError}</p>}
              {settingsMessage && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{settingsMessage}</p>}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Language</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Choose the language used across the app.</p>
              <label className="mt-4 block">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Display language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                >
                  {supportedLanguages.map((supportedLanguage) => (
                    <option key={supportedLanguage.code} value={supportedLanguage.code}>
                      {supportedLanguage.shortLabel} - {supportedLanguage.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Theme</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Switch between light and dark display modes.</p>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>{darkMode ? 'Dark mode is on' : 'Light mode is on'}</span>
                <span className={`relative h-7 w-12 rounded-full transition ${darkMode ? 'bg-primary' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${darkMode ? 'left-6' : 'left-1'}`} />
                </span>
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Install app</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Add SafarisCon to this device for quick access.</p>
                </div>
                {isInstalled ? (
                  <span className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">App installed</span>
                ) : (
                  <InstallButton variant="desktop" />
                )}
              </div>
            </section>

            {isAdmin && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
                  <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Booking rules</h2>
                  <p className="mt-1 text-sm text-slate-600">Marketplace booking mode, commission, and global rules.</p>
                  <div className="mt-4">
                    <MarketplaceSettingsForm form={marketplaceSettings} setForm={setMarketplaceSettings} onSubmit={saveMarketplaceSettings} onModeChange={saveGlobalBookingMode} />
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
                  <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Announcement</h2>
                  <p className="mt-1 text-sm text-slate-600">Shown at the top of the site.</p>
                  <div className="mt-4">
                    <AnnouncementForm form={announcementForm} setForm={setAnnouncementForm} onSubmit={saveAnnouncement} />
                  </div>
                </section>
              </>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Account</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <SettingInfo label="Name" value={user.name || 'User'} />
                <SettingInfo label="Email" value={user.email || '-'} />
                <SettingInfo label="Role" value={isSellerRole(user.role) ? 'Service provider' : String(user.role || 'user').replace(/[-_]/g, ' ')} />
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">About SafarisCon</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Read how we authenticate, handle data, take payments, and refund. These stay on this settings screen.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DOCS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSearchParams({ doc: id })}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${doc === id ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-800 hover:border-primary hover:text-primary'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                {doc === 'payments' && isSellerRole(user.role) && <CommissionTermsCard item={commission} />}
                {doc === 'how-it-works' && <HowItWorksPage embedded />}
                {doc === 'terms' && <TermsPage embedded />}
                {doc === 'privacy' && <PrivacyPage embedded />}
                {doc === 'payments' && <PaymentsPolicyPage embedded />}
              </div>
            </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function CommissionTermsCard({ item }) {
  const terms = item?.commissionTerms;
  const percentage = item?.commissionPercentage ?? terms?.percentage;
  if (!terms && (percentage === undefined || percentage === null)) {
    return (
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Platform commission terms</p>
        <p className="mt-1 text-sm">Your commission terms appear here after SafarisCon approves your listing. Guests never see this number.</p>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <p className="text-xs font-black uppercase tracking-wide text-blue-700">Platform commission terms</p>
      <h2 className="mt-1 font-black">{terms?.label || `${Number(percentage || 0).toLocaleString()}% platform commission`}</h2>
      <p className="mt-1 text-sm text-blue-800">{terms?.description || 'SafarisCon takes this commission from the full paid booking after the cancellation window closes. If the customer cancels in time, commission is half that rate on the cancellation fee only.'}</p>
    </div>
  );
}

function SettingInfo({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:border dark:border-slate-700 dark:bg-slate-950">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black capitalize text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
