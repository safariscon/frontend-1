import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InstallProvider } from './context/InstallContext';
import { useTheme } from './context/ThemeContext';
import { useEffect } from 'react';
import { pingBackend } from './lib/api';
import HomePage from './pages/HomePage';
import HotelsPage from './pages/HotelsPage';
import HotelDetailsPage from './pages/HotelDetailsPage';
import BookingPage from './pages/BookingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProviderCompleteRegistrationPage from './pages/ProviderCompleteRegistrationPage';
import BusinessRegisterPage from './pages/BusinessRegisterPage';
import UserDashboard from './pages/UserDashboard';
import HotelDashboard from './pages/HotelDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VerificationPage from './pages/VerificationPage';
import InstallBanner from './components/InstallBanner';
import InstallModal from './components/InstallModal';
import MobileFloatingInstall from './components/MobileFloatingInstall';
import { ANALYTICS_EVENTS, trackAnalytics } from './lib/analytics';

function AppContent() {
  const { darkMode } = useTheme();
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    pingBackend();
    trackAnalytics(ANALYTICS_EVENTS.APP_VISIT);
  }, []);

  return (
    <AuthProvider>
      <InstallProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<HotelsPage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/hotel/:id" element={<HotelDetailsPage />} />
            <Route path="/business/:id" element={<HotelDetailsPage />} />
            <Route path="/booking/:hotelId" element={<BookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/provider-register" element={<ProviderCompleteRegistrationPage />} />
            <Route path="/business-register" element={<BusinessRegisterPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/dashboard/seller" element={<SellerDashboard />} />
            <Route path="/hotel-dashboard" element={<HotelDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/verify/:token" element={<VerificationPage />} />
          </Routes>
        </Router>
        
        {/* Install-related components (global) */}
        <InstallBanner />
        <InstallModal />
        <MobileFloatingInstall />
      </InstallProvider>
    </AuthProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
