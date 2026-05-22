import { useInstall } from '../context/InstallContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import InstallButton from './InstallButton';

export default function InstallBanner() {
  const { showBanner, dismissBanner, triggerInstall } = useInstall();
  const { language } = useLanguage();

  if (!showBanner) return null;

  const handleInstallClick = async () => {
    const installed = await triggerInstall();
    // If install prompt wasn't available, modal will open automatically via triggerInstall
    if (!installed) {
      // triggerInstall already opened modal, nothing needed
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden transition-opacity"
        onClick={dismissBanner}
      />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
        <div className="bg-white shadow-2xl rounded-t-3xl p-6 border-t border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {/* App icon placeholder */}
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t('installTourConnect', language)}</h3>
                  <p className="text-xs text-gray-500">{t('rwandaTourismApp', language)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                {t('installBannerText', language)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('installNow', language)}
                </button>
                <button
                  onClick={dismissBanner}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
                  aria-label={t('dismiss', language)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Safe area padding for modern phones */}
        <div className="h-safe-bottom bg-white" />
      </div>
    </>
  );
}
