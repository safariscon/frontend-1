import { useInstall } from '../context/InstallContext';
import InstallButton from './InstallButton';

export default function MobileFloatingInstall() {
  const { isMobile, showBanner, isInstalled } = useInstall();

  // Don't show on desktop, when banner is visible, or if already installed
  if (!isMobile || showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 md:hidden">
      <InstallButton variant="mobile" />
    </div>
  );
}
