import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { supportedLanguages, t } from '../lib/translations';
import InstallButton from './InstallButton';
import { publicApi } from '../lib/api';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';

const DEFAULT_ANNOUNCEMENTS = [
  {
    text: 'Welcome to SafarisCon, the best way to get services anywhere you want across Rwanda destinations.',
    linkUrl: '/services',
    linkLabel: 'Browse services',
  },
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
  const [announcementFeed, setAnnouncementFeed] = useState({ enabled: true, items: DEFAULT_ANNOUNCEMENTS, intervalSeconds: 5 });
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const response = await publicApi.getAnnouncement();
        const receivedItems = Array.isArray(response.announcements) && response.announcements.length
          ? response.announcements
          : response.announcement?.text
            ? [response.announcement]
            : [];
        const backendItems = response.enabled === false ? [] : receivedItems;
        const items = [...DEFAULT_ANNOUNCEMENTS, ...backendItems].filter(
          (item, index, all) => item?.text && all.findIndex((entry) => entry?.text === item.text) === index
        );
        setAnnouncementFeed({
          enabled: true,
          items: items.slice(0, 5),
          intervalSeconds: Math.max(1, Number(response.intervalSeconds) || 5),
        });
      } catch {
        setAnnouncementFeed({ enabled: true, items: DEFAULT_ANNOUNCEMENTS, intervalSeconds: 5 });
      }
    };
    loadAnnouncement();
    return subscribeToRealtime([REALTIME_EVENTS.CATALOG_CHANGED, 'catalogChanged'], loadAnnouncement);
  }, []);

  useEffect(() => {
    if (!announcementFeed.enabled || announcementFeed.items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcementFeed.items.length);
    }, announcementFeed.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [announcementFeed]);

  const announcement = announcementFeed.items[announcementIndex] || null;

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="site-nav bg-white sticky top-0 z-50">
      {announcementFeed.enabled && announcement?.text && (
        <div className="announcement-bar border-b border-blue-500 bg-primary text-white">
          <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-center gap-1.5 px-4 py-1 text-center text-xs font-medium">
            <BellIcon />
            <span>
              {announcement.text}
              {announcement.linkUrl && (
                <>
                  {' '}
                  <a href={announcement.linkUrl} className="font-extrabold underline decoration-2 underline-offset-2">
                    {announcement.linkLabel || 'hano'}
                  </a>
                </>
              )}
            </span>
            {announcementFeed.items.length > 1 && (
              <span className="whitespace-nowrap text-xs text-blue-100">
                {announcementIndex + 1}/{announcementFeed.items.length}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="brand-mark flex items-center gap-2.5" aria-label="safariscon home">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-xlg font-extrabold tracking-tight text-gray-900">safariscon</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}>
              {t('home', language)}
            </Link>
            <Link to="/services" className={`nav-link ${['/services', '/hotels'].includes(location.pathname) ? 'nav-link-active' : ''}`}>
              {t('services', language)}
            </Link>
            {!isAuthenticated && (
              <>
                <ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} showLabel />
                <LanguageSelect language={language} onChange={setLanguage} id="desktop-language-select" />
              </>
            )}

            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link to="/admin-dashboard" className="text-gray-700 hover:text-primary transition font-medium">
                    {t('adminDashboard', language)}
                  </Link>
                )}
                {isCustomer && (
                  <Link to="/dashboard" className="text-gray-700 hover:text-primary transition font-medium">
                    {t('myBookings', language)}
                  </Link>
                )}
                {isSeller && (
                  <Link to={dashboardRoute} className="text-gray-700 hover:text-primary transition font-medium">
                    {t('sellerDashboard', language)}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition font-medium"
                >
                  {t('logout', language)}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary transition font-medium">
                  {t('login', language)}
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition font-medium"
                >
                  {t('register', language)}
                </Link>
              </>
            )}

            {!isAuthenticated && !isMobile && !isInstalled && <InstallButton variant="desktop" />}
          </div>

          <div className="md:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="nav-icon-button text-gray-700 hover:text-primary focus:outline-none p-2"
                aria-label={t('openNavigation', language)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="mobile-menu md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={closeMenu} className="mobile-nav-link">
                {t('home', language)}
              </Link>
              <Link
                to="/services"
                onClick={closeMenu}
                className="mobile-nav-link"
              >
                {t('services', language)}
              </Link>
              {!isAuthenticated && (
                <>
                  <ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} showLabel fullWidth />
                  <LanguageSelect language={language} onChange={setLanguage} id="mobile-language-select" fullWidth />
                </>
              )}

              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin-dashboard"
                      onClick={closeMenu}
                      className="text-gray-700 hover:text-primary transition font-medium"
                    >
                      {t('adminDashboard', language)}
                    </Link>
                  )}
                  {isCustomer && (
                    <Link
                      to="/dashboard"
                      onClick={closeMenu}
                      className="text-gray-700 hover:text-primary transition font-medium"
                    >
                      {t('myBookings', language)}
                    </Link>
                  )}
                  {isSeller && (
                    <Link
                      to={dashboardRoute}
                      onClick={closeMenu}
                      className="text-gray-700 hover:text-primary transition font-medium"
                    >
                      {t('sellerDashboard', language)}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-left bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition font-medium"
                  >
                    {t('logout', language)}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMenu} className="text-gray-700 hover:text-primary transition font-medium">
                    {t('login', language)}
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition font-medium text-center"
                  >
                    {t('register', language)}
                  </Link>
                </>
              )}

              {!isAuthenticated && isMobile && !isInstalled && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <InstallButton variant="compact" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[65] grid grid-cols-4 border-t border-slate-200 bg-white px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <MobileBottomLink to="/" label="Home" icon="home" active={location.pathname === '/'} />
        <MobileBottomLink to="/services" label="Services" icon="grid" active={['/services', '/hotels'].includes(location.pathname)} />
        <MobileBottomLink to={isAuthenticated ? dashboardRoute : '/login'} label="Dashboard" icon="calendar" active={location.pathname.includes('dashboard')} />
        {isAuthenticated ? (
          <MobileBottomLink to="/settings" label="Settings" icon="user" active={location.pathname === '/settings'} />
        ) : (
          <button type="button" onClick={() => setSettingsOpen(true)} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${settingsOpen ? 'text-primary' : 'text-slate-500'}`}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7-3.5l2-1-2-3-2 .5a8 8 0 00-2-1L14.5 5h-5L9 7.5a8 8 0 00-2 1L5 8l-2 3 2 1a8 8 0 000 2l-2 1 2 3 2-.5a8 8 0 002 1l.5 2.5h5l.5-2.5a8 8 0 002-1l2 .5 2-3-2-1a8 8 0 000-2z" /></svg>
            Settings
          </button>
        )}
      </div>
      {!isAuthenticated && settingsOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/45 md:hidden" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-x-3 bottom-20 rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Preferences</p><h2 className="text-xl font-black text-slate-900">Settings</h2></div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Close</button>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold uppercase text-slate-500">Language</p><LanguageSelect language={language} onChange={setLanguage} id="settings-language-select" fullWidth /></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold uppercase text-slate-500">Display mode</p><ThemeButton darkMode={darkMode} language={language} onClick={toggleDarkMode} showLabel fullWidth /></div>
            </div>
          </div>
        </div>
      )}
    </nav>
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
    <Link to={to} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${active ? 'text-primary' : 'text-slate-500'}`}>
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={paths[icon]} /></svg>
      {label}
    </Link>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
    </svg>
  );
}

function LanguageSelect({ language, onChange, id, fullWidth = false }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {t('chooseLanguage', language)}
      </label>
      <select
        id={id}
        value={language}
        onChange={(event) => onChange(event.target.value)}
        className={`bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition font-medium ${
          fullWidth ? 'w-full' : ''
        }`}
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
      className={`inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition font-medium ${
        fullWidth ? 'w-full justify-start' : ''
      }`}
      aria-label={label}
      title={label}
    >
      {darkMode ? <SunIcon /> : <MoonIcon />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.25M12 18.75V21M4.72 4.72l1.59 1.59M17.69 17.69l1.59 1.59M3 12h2.25M18.75 12H21M4.72 19.28l1.59-1.59M17.69 6.31l1.59-1.59M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3c-.01.24-.01.48-.01.72A9 9 0 0021 12.79z" />
    </svg>
  );
}
