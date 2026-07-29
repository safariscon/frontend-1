import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const storageKey = 'safariscon_sidebar_collapsed';

export default function DashboardLayout({ children }) {
  const { user, logout, isAdmin, isSeller, isCustomer, dashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed]);

  const navItems = useMemo(() => {
    const items = [
      { to: dashboardRoute || '/dashboard', label: 'Dashboard', icon: 'dashboard', match: ['/dashboard'] },
      { to: '/services', label: 'Browse services', icon: 'services', match: ['/services', '/hotels', '/hotel/', '/business/'] },
    ];

    if (isCustomer) {
      items[0] = { to: '/dashboard', label: 'My bookings', icon: 'bookings', match: ['/dashboard'] };
    }

    if (isSeller) {
      items[0] = { to: dashboardRoute || '/hotel-dashboard', label: 'Business dashboard', icon: 'briefcase', match: ['/hotel-dashboard', '/dashboard/seller'] };
    }

    if (isAdmin) {
      items[0] = { to: '/admin-dashboard', label: 'Admin dashboard', icon: 'shield', match: ['/admin-dashboard'] };
    }

    items.push({ to: '/settings', label: 'Settings', icon: 'settings', match: ['/settings'] });
    return items;
  }, [dashboardRoute, isAdmin, isCustomer, isSeller]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const activeLabel = navItems.find((item) => isActivePath(location.pathname, item))?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <aside className={`fixed inset-y-0 left-0 z-50 hidden border-r border-slate-200 bg-white shadow-sm transition-all duration-200 lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-72'}`}>
        <SidebarContent
          collapsed={collapsed}
          navItems={navItems}
          pathname={location.pathname}
          user={user}
          onToggle={() => setCollapsed((value) => !value)}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-80 max-w-[86vw] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <SidebarContent
              collapsed={false}
              navItems={navItems}
              pathname={location.pathname}
              user={user}
              onToggle={() => setMobileOpen(false)}
              onLogout={handleLogout}
              mobile
            />
          </aside>
        </div>
      )}

      <div className={`min-h-screen transition-all duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden" aria-label="Open sidebar">
                <Icon name="menu" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{activeLabel}</p>
                <h1 className="truncate text-lg font-black text-slate-950 sm:text-xl">{getGreeting(user)}</h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{formatRole(user?.role)}</span>
              <Link to="/settings" className={`rounded-xl border px-4 py-2 text-sm font-bold ${location.pathname === '/settings' ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:text-primary'}`}>
                Settings
              </Link>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function SidebarContent({ collapsed, navItems, pathname, user, onToggle, onLogout, mobile = false }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-white shadow-sm">S</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight text-slate-950">safariscon</p>
              <p className="truncate text-xs font-semibold text-slate-500">Professional dashboard</p>
            </div>
          )}
        </Link>
        <button type="button" onClick={onToggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary" aria-label={mobile ? 'Close sidebar' : 'Toggle sidebar'}>
          <Icon name={mobile ? 'close' : collapsed ? 'panelOpen' : 'panelClose'} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-primary'}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center"><Icon name={item.icon} /></span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className={`mb-3 rounded-xl bg-slate-50 p-3 ${collapsed ? 'text-center' : ''}`}>
          <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-black text-white">
            {getInitials(user?.name || user?.email)}
          </div>
          {!collapsed && (
            <div className="mt-2 min-w-0 text-center">
              <p className="truncate text-sm font-black text-slate-900">{user?.name || 'User'}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{user?.email}</p>
            </div>
          )}
        </div>
        <button type="button" onClick={onLogout} className={`flex w-full items-center justify-center gap-3 rounded-xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-200 ${collapsed ? '' : 'justify-start'}`}>
          <Icon name="logout" />
          {!collapsed && <span>Logout</span>}
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
    briefcase: 'M10 6V5a2 2 0 012-2h0a2 2 0 012 2v1m-9 0h10a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2z',
    shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z',
    settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7-3.5l2-1-2-3-2 .5a8 8 0 00-2-1L14.5 5h-5L9 7.5a8 8 0 00-2 1L5 8l-2 3 2 1a8 8 0 000 2l-2 1 2 3 2-.5a8 8 0 002 1l.5 2.5h5l.5-2.5a8 8 0 002-1l2 .5 2-3-2-1a8 8 0 000-2z',
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
  return item.match.some((match) => match === pathname || (match.endsWith('/') && pathname.startsWith(match)));
}

function getGreeting(user) {
  const firstName = user?.name?.split(' ')?.[0];
  return firstName ? `Welcome, ${firstName}` : 'Welcome back';
}

function formatRole(role) {
  return String(role || 'user').replace(/[-_]/g, ' ');
}

function getInitials(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'U').toUpperCase();
}
