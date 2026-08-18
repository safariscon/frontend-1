import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supportedLanguages, t } from '../lib/translations';
import InstallButton from './InstallButton';
import AnnouncementBar from './AnnouncementBar';

const PUBLIC_LINK_KEYS = [
  ['navigation.home', '/'],
  ['navigation.services', '/services'],
  ['navigation.about', '/about'],
  ['navigation.contact', '/contact'],
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { logout, isAuthenticated, isCustomer, isSeller, isAdmin, dashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isInstalled } = useInstall();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsOpen(false);
  };

  return (
    <nav className="site-nav sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <AnnouncementBar />

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex min-h-20 items-center justify-between gap-4">
          <Link to="/" className="brand-mark flex items-center gap-3" aria-label={t('navigation.brandHome', language)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-base font-black text-white shadow-sm">S</span>
            <span className="text-lg font-black tracking-tight text-slate-950 dark:text-white">safariscon</span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {PUBLIC_LINK_KEYS.map(([key, to]) => (
              <Link key={to} to={to} className={`nav-link ${isActive(location.pathname, to) ? 'nav-link-active' : ''}`}>
                {t(key, language)}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} />
            <LanguageSelect language={language} onChange={setLanguage} id="desktop-language-select" />

            {isAuthenticated ? (
              <>
                {isAdmin && <HeaderLink to="/admin-dashboard" label={t('adminDashboard', language)} />}
                {isCustomer && <HeaderLink to="/dashboard" label={t('myBookings', language)} />}
                {isSeller && <HeaderLink to={dashboardRoute} label={t('sellerDashboard', language)} />}
                <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  {t('logout', language)}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300">
                  {t('login', language)}
                </Link>
                <Link to="/register" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-primary-dark">
                  {t('register', language)}
                </Link>
              </>
            )}

            {!isAuthenticated && !isMobile && !isInstalled && <InstallButton variant="desktop" />}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="nav-icon-button grid h-11 w-11 place-items-center text-slate-700 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden"
            aria-label={t('openNavigation', language)}
            type="button"
          >
            {isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {isOpen && (
          <div className="mobile-menu border-t border-slate-200 py-4 dark:border-slate-800 md:hidden">
            <div className="grid gap-2">
              {PUBLIC_LINK_KEYS.map(([key, to]) => (
                <Link key={to} to={to} onClick={closeMenu} className={`mobile-nav-link ${isActive(location.pathname, to) ? 'mobile-nav-link-active' : ''}`}>
                  {t(key, language)}
                </Link>
              ))}

              <div className="mt-2 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} showLabel fullWidth />
                <LanguageSelect language={language} onChange={setLanguage} id="mobile-language-select" fullWidth />
              </div>

              {isAuthenticated ? (
                <div className="grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  {isAdmin && <MobileActionLink to="/admin-dashboard" label={t('adminDashboard', language)} onClick={closeMenu} />}
                  {isCustomer && <MobileActionLink to="/dashboard" label={t('myBookings', language)} onClick={closeMenu} />}
                  {isSeller && <MobileActionLink to={dashboardRoute} label={t('sellerDashboard', language)} onClick={closeMenu} />}
                  <button type="button" onClick={handleLogout} className="rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {t('logout', language)}
                  </button>
                </div>
              ) : (
                <div className="grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <Link to="/login" onClick={closeMenu} className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {t('login', language)}
                  </Link>
                  <Link to="/register" onClick={closeMenu} className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-black text-white">
                    {t('register', language)}
                  </Link>
                </div>
              )}

              {!isAuthenticated && isMobile && !isInstalled && (
                <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                  <InstallButton variant="compact" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[65] grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 dark:border-slate-800 dark:bg-slate-950 md:hidden">
        <MobileBottomLink to="/" label={t('navigation.home', language)} icon="home" active={location.pathname === '/'} />
        <MobileBottomLink to="/services" label={t('services', language)} icon="grid" active={['/services', '/hotels'].includes(location.pathname)} />
        <MobileBottomLink to={isAuthenticated ? dashboardRoute : '/login'} label={t('dashboard', language)} icon="calendar" active={location.pathname.includes('dashboard')} />
        {isAuthenticated ? (
          <MobileBottomLink to="/settings" label={t('settings', language)} icon="user" active={location.pathname === '/settings'} />
        ) : (
          <button type="button" onClick={() => setSettingsOpen(true)} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${settingsOpen ? 'text-primary' : 'text-slate-500 dark:text-blue-300'}`}>
            <SettingsIcon />
            {t('settings', language)}
          </button>
        )}
      </div>

      {!isAuthenticated && settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 md:hidden" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('preferences', language)}</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{t('settings', language)}</h2>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{t('close', language)}</button>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('language', language)}</p>
                <LanguageSelect language={language} onChange={setLanguage} id="settings-language-select" fullWidth />
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('displayMode', language)}</p>
                <ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} showLabel fullWidth />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeaderLink({ to, label }) {
  return <Link to={to} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300">{label}</Link>;
}

function MobileActionLink({ to, label, onClick }) {
  return <Link to={to} onClick={onClick} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{label}</Link>;
}

function LanguageSelect({ language, onChange, id, fullWidth = false }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>{t('chooseLanguage', language)}</label>
      <select
        id={id}
        value={language}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${fullWidth ? 'w-full' : 'max-w-44'}`}
        aria-label={t('chooseLanguage', language)}
        title={t('chooseLanguage', language)}
      >
        {supportedLanguages.map((supportedLanguage) => (
          <option key={supportedLanguage.code} value={supportedLanguage.code}>
            {supportedLanguage.shortLabel} - {supportedLanguage.label}
          </option>
        ))}
      </select>
    </>
  );
}

function ThemeButton({ darkMode, language, onClick, showLabel = false, fullWidth = false }) {
  const label = darkMode ? t('lightMode', language) : t('darkMode', language);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${fullWidth ? 'w-full justify-start' : ''}`}
      aria-label={label}
      title={label}
    >
      {darkMode ? <SunIcon /> : <MoonIcon />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

function MobileBottomLink({ to, label, icon, active }) {
  const paths = {
    home: 'M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8.5z',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    calendar: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  };
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={paths[icon]} /></svg>
      {label}
    </Link>
  );
}

function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function MenuIcon() {
  return <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}

function CloseIcon() {
  return <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}

function SettingsIcon() {
  return <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7-3.5l2-1-2-3-2 .5a8 8 0 00-2-1L14.5 5h-5L9 7.5a8 8 0 00-2 1L5 8l-2 3 2 1a8 8 0 000 2l-2 1 2 3 2-.5a8 8 0 002 1l.5 2.5h5l.5-2.5a8 8 0 002-1l2 .5 2-3-2-1a8 8 0 000-2z" /></svg>;
}

function SunIcon() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.25M12 18.75V21M4.72 4.72l1.59 1.59M17.69 17.69l1.59 1.59M3 12h2.25M18.75 12H21M4.72 19.28l1.59-1.59M17.69 6.31l1.59-1.59M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z" /></svg>;
}

function MoonIcon() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3c-.01.24-.01.48-.01.72A9 9 0 0021 12.79z" /></svg>;
}
