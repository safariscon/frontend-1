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
import HotelCompleteRegistrationPage from './pages/HotelCompleteRegistrationPage';
import UserDashboard from './pages/UserDashboard';
import HotelDashboard from './pages/HotelDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InstallBanner from './components/InstallBanner';
import InstallModal from './components/InstallModal';
import MobileFloatingInstall from './components/MobileFloatingInstall';

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
    const interval = setInterval(() => {
      pingBackend();
    }, 14000);

    return () => clearInterval(interval);
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
            <Route path="/hotel-register" element={<HotelCompleteRegistrationPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/dashboard/seller" element={<SellerDashboard />} />
            <Route path="/hotel-dashboard" element={<HotelDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
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
