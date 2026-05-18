import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInstall } from '../context/InstallContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import InstallButton from './InstallButton';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isAuthenticated, isCustomer, isSeller, isAdmin, dashboardRoute } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isInstalled } = useInstall();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">U</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">safarisconn</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-gray-700 hover:text-primary transition font-medium">
              {t('home', language)}
            </Link>
            <Link to="/services" className="text-gray-700 hover:text-primary transition font-medium">
              {t('services', language)}
            </Link>
<button
               type="button"
               onClick={toggleDarkMode}
               className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition font-medium"
               aria-label={darkMode ? t('lightMode', language) : t('darkMode', language)}
               title={darkMode ? t('lightMode', language) : t('darkMode', language)}
             >
               {darkMode ? <SunIcon /> : <MoonIcon />}
               <span>{darkMode ? t('lightMode', language) : t('darkMode', language)}</span>
             </button>
             <button
               type="button"
               onClick={toggleLanguage}
               className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition font-medium"
               aria-label="Switch language"
               title="Switch language"
             >
               <span className="text-lg">{language === 'en' ? '🇬🇧' : '🇷🇼'}</span>
               <span className="uppercase">{language === 'en' ? 'EN' : 'RW'}</span>
             </button>
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
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary transition font-medium"
                >
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
            
            {/* Install button - desktop (only if not installed) */}
            {!isMobile && !isInstalled && <InstallButton variant="desktop" />}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="text-gray-700 hover:text-primary focus:outline-none p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-700 hover:text-primary focus:outline-none p-2"
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

{/* Mobile Navigation */}
         {isOpen && (
           <div className="md:hidden py-4 border-t border-gray-100">
             <div className="flex flex-col space-y-3">
               <Link
                 to="/"
                 onClick={() => setIsOpen(false)}
                 className="text-gray-700 hover:text-primary transition font-medium"
               >
                 {t('home', language)}
               </Link>
               <Link
                 to="/services"
                 onClick={() => setIsOpen(false)}
                 className="text-gray-700 hover:text-primary transition font-medium"
               >
                 {t('services', language)}
               </Link>
<button
                  type="button"
                  onClick={toggleDarkMode}
                  className="text-left bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition font-medium flex items-center gap-2"
                >
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                  {darkMode ? t('lightMode', language) : t('darkMode', language)}
                </button>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="text-left bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <span className="text-lg">{language === 'en' ? '🇬🇧' : '🇷🇼'}</span>
                  <span className="uppercase">{language === 'en' ? 'EN' : 'RW'}</span>
                </button>
               {isAuthenticated ? (
                 <>
                   {isAdmin && (
                     <Link
                       to="/admin-dashboard"
                       onClick={() => setIsOpen(false)}
                       className="text-gray-700 hover:text-primary transition font-medium"
                     >
                       {t('adminDashboard', language)}
                     </Link>
                   )}
                   {isCustomer && (
                     <Link
                       to="/dashboard"
                       onClick={() => setIsOpen(false)}
                       className="text-gray-700 hover:text-primary transition font-medium"
                     >
                       {t('myBookings', language)}
                     </Link>
                   )}
                   {isSeller && (
                     <Link
                       to={dashboardRoute}
                       onClick={() => setIsOpen(false)}
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
                   <Link
                     to="/login"
                     onClick={() => setIsOpen(false)}
                     className="text-gray-700 hover:text-primary transition font-medium"
                   >
                     {t('login', language)}
                   </Link>
                   <Link
                     to="/register"
                     onClick={() => setIsOpen(false)}
                     className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition font-medium text-center"
                   >
                     {t('register', language)}
                   </Link>
                 </>
               )}
              
              {/* Mobile install button in menu */}
              {isMobile && !isInstalled && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <InstallButton variant="compact" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
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
