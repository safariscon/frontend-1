import { useInstall } from '../context/InstallContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function InstallModal() {
  const { showModal, closeModal, triggerInstall, canInstall, platform } = useInstall();
  const { language } = useLanguage();

  if (!showModal) return null;

  const handleInstallClick = async () => {
    await triggerInstall();
  };

  const manualSteps = platform === 'ios-safari'
    ? [
        {
          number: 1,
          title: t('tapShare', language),
          description: t('tapShareDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v3a3 3 0 003 3h10a3 3 0 003-3v-3" />
            </svg>
          ),
        },
        {
          number: 2,
          title: t('chooseAddToHomeScreen', language),
          description: t('chooseAddToHomeScreenDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a2 2 0 012-2h4v4H4V5zm10-2h4a2 2 0 012 2v2h-6V3zM4 11h6v10H6a2 2 0 01-2-2V11zm10 0h6v8a2 2 0 01-2 2h-4V11z" />
            </svg>
          ),
        },
        {
          number: 3,
          title: t('tapAdd', language),
          description: t('tapAddDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        },
      ]
    : [
        {
          number: 1,
          title: t('openBrowserMenu', language),
          description: t('openBrowserMenuDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          ),
        },
        {
          number: 2,
          title: t('tapInstall', language),
          description: t('tapInstallDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          ),
        },
        {
          number: 3,
          title: t('confirm', language),
          description: t('confirmInstallDesc', language),
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-slide-up-modal">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            {canInstall ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('installApp', language)}</h2>
                <p className="text-gray-600 text-sm">
                  {t('installPromptText', language)}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('howToInstall', language)}</h2>
                <p className="text-gray-600 text-sm">
                  {t('manualInstallText', language)}
                </p>
              </>
            )}
          </div>

          {canInstall ? (
            // Simple install button when prompt is available
            <div className="space-y-4">
              <button
                onClick={handleInstallClick}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span className="text-lg">{t('installTourConnectAction', language)}</span>
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                {t('installedHomeScreen', language)}
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {manualSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {step.number}
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shrink-0">
                    {step.icon}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div className="bg-primary bg-opacity-5 rounded-xl p-4 mb-6 border border-primary border-opacity-20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-primary mb-0.5">{t('quickAccess', language)}</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {t('quickAccessDesc', language)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              {t('close', language)}
            </button>
            {!canInstall && (
              <button
                onClick={() => window.open('https://support.google.com/chrome/answer/9658361', '_blank')}
                className="flex-1 py-3 bg-secondary hover:bg-blue-700 text-white font-semibold rounded-xl transition"
              >
                {t('help', language)}
              </button>
            )}
          </div>
        </div>

        {/* Safe area padding for modern phones */}
        <div className="h-safe-bottom bg-white rounded-b-3xl" />
      </div>
    </div>
  );
}
