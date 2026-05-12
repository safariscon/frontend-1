/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const InstallContext = createContext();

export function InstallProvider({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const isIosDevice = /iPad|iPhone|iPod/i.test(userAgent);
    const isAndroidDevice = /android/i.test(userAgent);
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(userAgent);

    // Detect if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect mobile device
    const isMobileDevice = isAndroidDevice || isIosDevice ||
      (window.innerWidth <= 768 && 'ontouchstart' in window);
    setIsMobile(isMobileDevice);
    setPlatform(isIosDevice && isSafariBrowser ? 'ios-safari' : isAndroidDevice ? 'android' : 'other');

    // Capture beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (isMobileDevice) {
        const bannerDismissed = localStorage.getItem('install_banner_dismissed');
        const bannerTimestamp = localStorage.getItem('install_banner_timestamp');

        if (!bannerDismissed) {
          setShowBanner(true);
        } else if (bannerTimestamp) {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (parseInt(bannerTimestamp) < sevenDaysAgo) {
            setShowBanner(true);
          }
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
      setShowBanner(false);
      localStorage.setItem('install_banner_dismissed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('install_banner_dismissed', 'true');
    localStorage.setItem('install_banner_timestamp', Date.now().toString());
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      setShowModal(true);
      return false;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowModal(false);
    setShowBanner(false);

    if (outcome === 'accepted') {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    return outcome === 'accepted';
  };

  const value = {
    isMobile,
    platform,
    isInstalled,
    showBanner,
    showModal,
    dismissBanner,
    openModal,
    closeModal,
    triggerInstall,
    canInstall: !!deferredPrompt,
  };

  return (
    <InstallContext.Provider value={value}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error('useInstall must be used within an InstallProvider');
  }
  return context;
}
