import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InstallProvider } from './context/InstallContext';
import { useTheme } from './context/ThemeContext';
import { Component, useEffect } from 'react';
import { pingBackend } from './lib/api';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HotelsPage from './pages/HotelsPage';
import HotelDetailsPage from './pages/HotelDetailsPage';
import BookingPage from './pages/BookingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SettingsPage from './pages/SettingsPage';
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

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Customer dashboard failed to render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-black text-slate-950">Bookings could not load</h1>
            <p className="mt-2 text-sm text-slate-600">Refresh the page to load your booking dashboard again.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Refresh dashboard</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/services" element={<HotelsPage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/hotel/:id" element={<HotelDetailsPage />} />
            <Route path="/business/:id" element={<HotelDetailsPage />} />
            <Route path="/booking/:hotelId" element={<BookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/provider-register" element={<ProviderCompleteRegistrationPage />} />
            <Route path="/business-register" element={<BusinessRegisterPage />} />
            <Route path="/dashboard" element={<DashboardErrorBoundary><UserDashboard /></DashboardErrorBoundary>} />
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
