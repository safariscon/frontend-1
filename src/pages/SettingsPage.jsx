import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import InstallButton from '../components/InstallButton';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supportedLanguages } from '../lib/translations';

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const { isInstalled } = useInstall();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Workspace preferences</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-slate-50">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Manage your application preferences from one place.
            </p>
          </div>

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
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Add SafarisCon to this device for quick access.
                  </p>
                </div>
                {isInstalled ? (
                  <span className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                    App installed
                  </span>
                ) : (
                  <InstallButton variant="desktop" />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">Account</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <SettingInfo label="Name" value={user.name || 'User'} />
                <SettingInfo label="Email" value={user.email || '-'} />
                <SettingInfo label="Role" value={String(user.role || 'user').replace(/[-_]/g, ' ')} />
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">About SafarisCon</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Read how we authenticate, handle data, take payments, and refund. These pages match the live product.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link to="/how-it-works" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:border-primary hover:text-primary">How it works</Link>
                <Link to="/terms" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:border-primary hover:text-primary">Terms of use</Link>
                <Link to="/privacy" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:border-primary hover:text-primary">Privacy policy</Link>
                <Link to="/payments" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:border-primary hover:text-primary">Payments & cancellations</Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
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
