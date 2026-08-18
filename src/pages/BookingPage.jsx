import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DashboardLayout from '../components/DashboardLayout';
import BookingForm from '../components/BookingForm';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { useEffect } from 'react';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';
import { getDashboardRoute, isSellerRole } from '../lib/dashboard';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';

export default function BookingPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (user) trackAnalytics(ANALYTICS_EVENTS.BOOKING_FORM_OPENED, { serviceId: hotelId });
  }, [hotelId, user]);

  const handleBookingSuccess = () => {
    alert(t('bookingSuccess', language));
    if (user?.role === 'admin') navigate('/admin-dashboard/bookings');
    else if (isSellerRole(user?.role)) navigate(`${getDashboardRoute(user)}/bookings`);
    else navigate('/dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SeoHead
          {...noindexSeo({
            title: t('booking.loginTitle', language),
            description: t('booking.loginDescription', language),
            path: `/booking/${hotelId}`,
          })}
        />
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">{t('pleaseLoginToBook', language)}</h2>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              {t('goLogin', language)}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <SeoHead
        {...noindexSeo({
            title: t('booking.completeTitle', language),
            description: t('booking.completeDescription', language),
          path: `/booking/${hotelId}`,
        })}
      />
      <main className="py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('completeBooking', language)}</h1>
            <p className="text-gray-600">
              {t('selectServiceAndDate', language)}
            </p>
          </div>
          <BookingForm
            hotelId={hotelId}
            onClose={() => navigate(-1)}
            onSuccess={handleBookingSuccess}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}
