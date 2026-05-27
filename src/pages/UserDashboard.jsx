import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { bookingApi, getAuthData } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const statusStyle = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { language } = useLanguage();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return undefined;
    }

    const authData = getAuthData();
    if (!authData?.token) {
      Promise.resolve().then(() => setLoading(false));
      return undefined;
    }

    const loadData = async () => {
      try {
        const response = await bookingApi.getMyBookings(authData.token);
        setBookings(response.bookings || []);
      } finally {
        setLoading(false);
      }
    };

    Promise.resolve().then(() => loadData());
    joinRealtimeChannel('user', authData.user?.id || authData.user?._id || user.id || user._id);
    return subscribeToRealtime(REALTIME_EVENTS.BOOKING_CHANGED, loadData);
  }, [user, navigate]);

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const payBooking = async (bookingId) => {
    const authData = getAuthData();
    if (!authData?.token) return;
    setMessage('');
    try {
      await bookingApi.payBooking(authData.token, bookingId, {
        paymentMethod: 'mobile-money',
        senderAccount: user?.email,
      });
      setMessage('Payment recorded. QR verification and receipt are ready.');
      const response = await bookingApi.getMyBookings(authData.token);
      setBookings(response.bookings || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {t('liveCustomerDashboard', language)}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {t('welcomeBackUser', language, { name: user?.name?.split(' ')[0] || '' })}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              {t('trackBookings', language)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label={t('confirmed', language)} value={confirmedCount} />
            <StatCard label={t('pending', language)} value={pendingCount} />
            <StatCard label={t('completed', language)} value={completedCount} />
          </div>
          {message && <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('myBookingsTitle', language)}</h2>
            </div>

            {loading ? (
              <div className="p-8 text-gray-600">{t('loadingBookings', language)}</div>
            ) : bookings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const assignedBusiness = booking.businessId || booking.hotelId;
                  const preferredBusiness = booking.preferredBusinessId || booking.preferredHotelId;
                  const businessToShow = assignedBusiness || preferredBusiness;
                  const serviceToShow = booking.serviceId;
                  const waiting = booking.status === 'pending' && !assignedBusiness;

                  return (
                    <div key={booking._id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {serviceToShow?.title || serviceToShow?.name || businessToShow?.businessName || businessToShow?.name || t('serviceProviderPendingAssignment', language)}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1">
                            {t('destination', language)} {booking.destinationPlace} ({booking.destinationLocation})
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatBookingSchedule(booking, language)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getBookingQuantityLabel(booking, language)} {booking.bookingDetails?.quantity || booking.guests || booking.quantity || 1}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{t('bookingId', language)} {booking._id}</p>
                          {waiting && (
                            <p className="text-sm text-yellow-700 mt-2">
                              {t('pleaseWaitForAdmin', language)}
                            </p>
                          )}
                          {booking.isAcknowledgedByAdmin && booking.status === 'pending' && (
                            <p className="text-sm text-blue-700 mt-2">
                              {t('adminConfirmedReceipt', language)}
                            </p>
                          )}
                          {booking.adminResponseMessage && (
                            <p className="text-sm text-green-700 mt-2">
                              {booking.adminResponseMessage}
                            </p>
                          )}
                          {assignedBusiness && (
                            <p className="text-sm text-gray-700 mt-2">
                              {t('assignedProvider', language)} {assignedBusiness.businessName || assignedBusiness.name} - {assignedBusiness.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                            {t(`${booking.status}Status`, language)}
                          </span>
                          <p className="text-xl font-bold text-primary mt-2">{formatRwf(booking.totalPrice || 0)}</p>
                          <div className="mt-3 flex flex-col gap-2">
                            {booking.status === 'confirmed' && booking.paymentStatus !== 'paid' && (
                              <button onClick={() => payBooking(booking._id)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                                Pay Your Booking
                              </button>
                            )}
                            {booking.paymentStatus === 'paid' && (
                              <a href={bookingApi.getReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                Download PDF
                              </a>
                            )}
                            {booking.verificationCode && (
                              <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-mono text-gray-700">{booking.verificationCode}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('noBookingsYet', language)}</h3>
                <p className="text-gray-500 mb-4">{t('startExploringServices', language)}</p>
                <Link to="/services" className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                  {t('browseServices', language)}
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function formatBookingSchedule(booking, language) {
  if (booking.checkIn) {
    return `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`;
  }
  if (booking.reservationDate) {
    const date = new Date(booking.reservationDate).toLocaleDateString();
    return booking.reservationTime ? `${date} at ${booking.reservationTime}` : date;
  }
  return t('datesNotProvided', language);
}

function getBookingQuantityLabel(booking, language) {
  if (booking.bookingModel === 'restaurant') return `${t('tableSize', language)}:`;
  if (booking.bookingModel === 'transport') return `${t('passengers', language)}:`;
  if (booking.bookingModel === 'event') return `${t('attendeeCount', language)}:`;
  if (booking.bookingModel === 'activity') return `${t('participantCount', language)}:`;
  if (booking.bookingModel === 'childcare') return `${t('childCount', language)}:`;
  return `${t('guestsCount', language)}`;
}
