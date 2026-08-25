import { Component, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DashboardLayout from '../components/DashboardLayout';
import BookingForm from '../components/BookingForm';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import { ANALYTICS_EVENTS, trackAnalytics } from '../lib/analytics';
import { getDashboardRoute, isSellerRole } from '../lib/dashboard';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';

class BookingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || '' };
  }

  componentDidCatch(error) {
    console.error('Booking form failed to render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl bg-white p-6 text-center shadow-xl">
          <h2 className="text-xl font-black text-slate-950">This booking page could not load</h2>
          <p className="mt-2 text-sm text-slate-600">Go back to the listing and try Continue to book again.</p>
          {this.state.message ? <p className="mt-2 break-words text-xs text-slate-500">{this.state.message}</p> : null}
          <button
            type="button"
            onClick={() => this.props.onBack?.()}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Back to listing
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CatalogShell({ authenticated, children }) {
  if (authenticated) return <DashboardLayout>{children}</DashboardLayout>;
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

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

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(`/business/${hotelId}`);
  };

  if (!user) {
    return (
      <CatalogShell authenticated={false}>
        <SeoHead
          {...noindexSeo({
            title: t('booking.loginTitle', language),
            description: t('booking.loginDescription', language),
            path: `/booking/${hotelId}`,
          })}
        />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold">{t('pleaseLoginToBook', language)}</h2>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { afterRedirect: `/booking/${hotelId}${window.location.search}` } })}
              className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-dark"
            >
              {t('goLogin', language)}
            </button>
          </div>
        </main>
      </CatalogShell>
    );
  }

  return (
    <CatalogShell authenticated>
      <SeoHead
        {...noindexSeo({
          title: t('booking.completeTitle', language),
          description: t('booking.completeDescription', language),
          path: `/booking/${hotelId}`,
        })}
      />
      <main className="min-h-[70vh] bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4">
          <button type="button" onClick={goBack} className="mb-4 text-sm font-semibold text-primary">
            ← Back to listing
          </button>
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('completeBooking', language)}</h1>
            <p className="text-gray-600">{t('selectServiceAndDate', language)}</p>
          </div>
          <BookingErrorBoundary key={hotelId} onBack={goBack}>
            <BookingForm
              hotelId={hotelId}
              onClose={goBack}
              onSuccess={handleBookingSuccess}
            />
          </BookingErrorBoundary>
        </div>
      </main>
    </CatalogShell>
  );
}
