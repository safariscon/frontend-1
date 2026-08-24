import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDisplayRole } from '../lib/dashboard';
import { t } from '../lib/translations';
import AnnouncementBar from './AnnouncementBar';
import SeoHead from './SeoHead';
import { noindexSeo } from '../lib/seo';

const storageKey = 'safariscon_sidebar_collapsed';

export default function DashboardLayout({ children }) {
  const { user, logout, isAdmin, isSeller, isCustomer, dashboardRoute } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed]);

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/admin-dashboard', label: t('dash.analytics', language), icon: 'dashboard', match: ['/admin-dashboard'], exact: true },
        { to: '/admin-dashboard/users', label: t('dash.users', language), icon: 'user', match: ['/admin-dashboard/users'] },
        { to: '/admin-dashboard/services', label: t('dash.services', language), icon: 'services', match: ['/admin-dashboard/services'] },
        { to: '/admin-dashboard/service-categories', label: 'Categories', icon: 'grid', match: ['/admin-dashboard/service-categories'] },
        { to: '/admin-dashboard/bookings', label: t('dash.bookings', language), icon: 'bookings', match: ['/admin-dashboard/bookings'] },
        { to: '/admin-dashboard/revenue', label: t('dash.revenue', language), icon: 'revenue', match: ['/admin-dashboard/revenue'] },
        { to: '/services', label: t('dash.browseServices', language), icon: 'grid', match: ['/services', '/hotels', '/hotel/', '/business/', '/booking/'] },
        { to: '/profile', label: t('dash.profile', language), icon: 'user', match: ['/profile'] },
        { to: '/notifications', label: t('dash.notifications', language), icon: 'bell', match: ['/notifications'] },
        { to: '/settings', label: t('dash.settings', language), icon: 'settings', match: ['/settings'] },
      ];
    }

    if (isSeller) {
      return [
        { to: dashboardRoute || '/dashboard/seller', label: t('dash.analytics', language), icon: 'dashboard', match: ['/dashboard/seller', '/hotel-dashboard'], exact: true },
        { to: `${dashboardRoute || '/dashboard/seller'}/services`, label: t('dash.services', language), icon: 'services', match: ['/dashboard/seller/services', '/hotel-dashboard/services'] },
        { to: `${dashboardRoute || '/dashboard/seller'}/bookings`, label: t('dash.bookings', language), icon: 'bookings', match: ['/dashboard/seller/bookings', '/hotel-dashboard/bookings'] },
        { to: `${dashboardRoute || '/dashboard/seller'}/finance`, label: t('dash.finance', language), icon: 'revenue', match: ['/dashboard/seller/finance', '/hotel-dashboard/finance'] },
        { to: '/services', label: t('dash.browseServices', language), icon: 'grid', match: ['/services', '/hotels', '/hotel/', '/business/', '/booking/'] },
        { to: '/profile', label: t('dash.profile', language), icon: 'user', match: ['/profile'] },
        { to: '/notifications', label: t('dash.notifications', language), icon: 'bell', match: ['/notifications'] },
        { to: '/settings', label: t('dash.settings', language), icon: 'settings', match: ['/settings'] },
      ];
    }

    const items = [
      { to: '/dashboard', label: isCustomer ? t('dash.myBookings', language) : t('dash.dashboard', language), icon: isCustomer ? 'bookings' : 'dashboard', match: ['/dashboard'], exact: true },
      { to: '/services', label: t('dash.browseServices', language), icon: 'grid', match: ['/services', '/hotels', '/hotel/', '/business/', '/booking/'] },
      { to: '/profile', label: t('dash.profile', language), icon: 'user', match: ['/profile'] },
      { to: '/notifications', label: t('dash.notifications', language), icon: 'bell', match: ['/notifications'] },
      { to: '/settings', label: t('dash.settings', language), icon: 'settings', match: ['/settings'] },
    ];
    return items;
  }, [dashboardRoute, isAdmin, isCustomer, isSeller, language]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const activeLabel = navItems.find((item) => isActivePath(location.pathname, item))?.label || t('dash.dashboard', language);
  const isPublicCatalogPath = /^(?:\/services|\/hotels|\/hotel\/|\/business\/|\/booking\/)/.test(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      {!isPublicCatalogPath && (
        <SeoHead
          {...noindexSeo({
            title: t('dash.seoTitle', language, { label: activeLabel }),
            description: t('dash.seoDescription', language),
            path: location.pathname,
          })}
        />
      )}
      <AnnouncementBar />
      <aside className={`fixed bottom-0 left-0 top-8 z-50 hidden border-r border-slate-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-72'}`}>
        <SidebarContent collapsed={collapsed} navItems={navItems} pathname={location.pathname} onToggle={() => setCollapsed((value) => !value)} onLogout={handleLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 top-8 z-50 bg-slate-950/45 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-80 max-w-[86vw] bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <SidebarContent collapsed={false} navItems={navItems} pathname={location.pathname} onToggle={() => setMobileOpen(false)} onLogout={handleLogout} mobile />
          </aside>
        </div>
      )}

      <div className={`min-h-[calc(100vh-2rem)] transition-all duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden" aria-label={t('openSidebar', language)}>
                <Icon name="menu" />
              </button>
              <h1 className="truncate text-lg font-black text-slate-950 dark:text-slate-50 sm:text-xl">{activeLabel}</h1>
            </div>
            <Link to="/profile" className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-right hover:bg-slate-50 dark:hover:bg-slate-900" title={t('openProfile', language)}>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-slate-50">{user?.name || t('userFallback', language)}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{formatDisplayRole(user?.role)}</p>
              </div>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white">
                  {getInitials(user?.name)}
                </div>
              )}
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function SidebarContent({ collapsed, navItems, pathname, onToggle, onLogout, mobile = false }) {
  const { language } = useLanguage();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-white shadow-sm">S</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">safariscon</p>
              <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{t('professionalDashboard', language)}</p>
            </div>
          )}
        </Link>
        <button type="button" onClick={onToggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-300" aria-label={mobile ? t('closeSidebar', language) : t('toggleSidebar', language)}>
          <Icon name={mobile ? 'close' : collapsed ? 'panelOpen' : 'panelClose'} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300'}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center"><Icon name={item.icon} /></span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button type="button" onClick={onLogout} className={`flex w-full items-center justify-center gap-3 rounded-xl bg-red-50 px-3 py-3 text-sm font-black text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70 ${collapsed ? '' : 'justify-start'}`}>
          <Icon name="logout" />
          {!collapsed && <span>{t('logout', language)}</span>}
        </button>
      </div>
    </div>
  );
}

export function Icon({ name }) {
  const paths = {
    dashboard: 'M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z',
    bookings: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z',
    services: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
    grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
    briefcase: 'M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 0h10a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z',
    shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z',
    settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7-3.5l2-1-2-3-2 .5a8 8 0 00-2-1L14.5 5h-5L9 7.5a8 8 0 00-2 1L5 8l-2 3 2 1a8 8 0 000 2l-2 1 2 3 2-.5a8 8 0 002 1l.5 2.5h5l.5-2.5a8 8 0 002-1l2 .5 2-3-2-1a8 8 0 000-2z',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM6 20a6 6 0 0112 0',
    bell: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0',
    revenue: 'M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6',
    logout: 'M15 17l5-5-5-5M20 12H9m3 8H5a1 1 0 01-1-1V5a1 1 0 011-1h7',
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'M6 18L18 6M6 6l12 12',
    panelClose: 'M15 6l-6 6 6 6M4 5h16v14H4z',
    panelOpen: 'M9 6l6 6-6 6M4 5h16v14H4z',
  };

  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] || paths.dashboard} />
    </svg>
  );
}

function isActivePath(pathname, item) {
  if (item.exact) {
    return item.match.some((match) => pathname === match);
  }
  return item.match.some((match) => pathname === match || pathname.startsWith(`${match}/`) || (match.endsWith('/') && pathname.startsWith(match)));
}

function getInitials(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'U').toUpperCase();
}
