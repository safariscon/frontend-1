import { useState, useEffect } from 'react';
import { useInstall } from '../context/InstallContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function InstallButton({ variant = 'desktop' }) {
  const { openModal, triggerInstall, canInstall, isInstalled } = useInstall();
  const { language } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);

  const isMobileVariant = variant === 'mobile';
  const isCompact = variant === 'compact';

  useEffect(() => {
    // Show tooltip only once on first visit (desktop only, not mobile)
    if (variant === 'desktop' && !isInstalled) {
      const tooltipShown = localStorage.getItem('install_tooltip_shown');
      if (!tooltipShown) {
        // Show tooltip after a short delay
        const timer = setTimeout(() => {
          setShowTooltip(true);
          // Auto-hide after 4 seconds
          setTimeout(() => {
            setShowTooltip(false);
            localStorage.setItem('install_tooltip_shown', 'true');
          }, 4000);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [variant, isInstalled]);

  const handleClick = async () => {
    // If install prompt is available, trigger it directly
    if (canInstall) {
      await triggerInstall();
    } else {
      // Otherwise show modal with instructions
      openModal();
    }
    // Hide tooltip and mark as shown
    setShowTooltip(false);
    if (variant === 'desktop') {
      localStorage.setItem('install_tooltip_shown', 'true');
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 w-48 animate-fade-in">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <p className="font-medium mb-1">{t('installThisApp', language)}</p>
            <p className="text-gray-300 text-xs">{t('installAppQuickAccess', language)}</p>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}

      {/* Button */}
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center gap-2
          ${isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm font-medium'}
          bg-primary hover:bg-primary-dark text-white rounded-xl transition-all
          ${isMobileVariant ? 'shadow-lg' : ''}
          animate-pulse-subtle
        `}
        aria-label={t('installApp', language)}
      >
        {/* Download Icon */}
        <svg
          className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
        <span>{isCompact ? t('install', language) : t('installApp', language)}</span>
      </button>
    </div>
  );
}
