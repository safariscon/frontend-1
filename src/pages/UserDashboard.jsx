import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { bookingApi, getAuthData } from '../lib/api';
import { formatRwf } from '../lib/currency';
import DepositPaymentModal from '../components/DepositPaymentModal';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import CustomerChangeRequestCard from '../components/rebook/CustomerChangeRequestCard';
import CustomerChangeRequests from '../components/rebook/CustomerChangeRequests';

const statusStyle = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [changeBookingId, setChangeBookingId] = useState('');
  const [changeRequestsVersion, setChangeRequestsVersion] = useState(0);
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

  const refreshBookings = async () => {
    const authData = getAuthData();
    if (!authData?.token) return;
    setLoading(true);
    try {
      const response = await bookingApi.getMyBookings(authData.token);
      setBookings(response.bookings || []);
    } finally {
      setLoading(false);
    }
  };

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const payBooking = async (bookingId, paymentDetails = {}) => {
    const authData = getAuthData();
    if (!authData?.token) return;
    setMessage('');
    try {
      await bookingApi.payBooking(authData.token, bookingId, {
        paymentMethod: paymentDetails.paymentMethod || 'simulation-mobile-money',
        senderAccount: paymentDetails.senderAccount || user?.email,
      });
      setMessage('Deposit recorded successfully. Provider details, QR verification, and Booking PDF are now unlocked.');
      setPaymentBooking(null);
      const response = await bookingApi.getMyBookings(authData.token);
      setBookings(response.bookings || []);
    } catch (error) {
      setMessage(error.message);
      throw error;
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
            <button onClick={refreshBookings} className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Refresh
            </button>
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
                  const depositPaid = ['deposit-paid', 'paid'].includes(booking.paymentStatus);

                  return (
                    <details key={booking._id} className="group border-b border-slate-200 bg-white transition open:bg-slate-50">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">Booked {formatCreatedDate(booking.createdAt)}</p>
                          <h3 className="mt-1 truncate font-black text-slate-900">{serviceToShow?.title || serviceToShow?.name || businessToShow?.businessName || businessToShow?.name || booking.destinationPlace}</h3>
                          <p className="mt-1 text-xs text-slate-500">{booking.bookingCode || booking._id}</p>
                          {booking.promotionSnapshot?.title && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">Promotion applied</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {depositPaid && !['completed', 'cancelled', 'rejected'].includes(booking.status) && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setChangeBookingId(booking._id); }} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">Request change</button>}
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>{booking.status}</span>
                          <span className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white group-open:bg-slate-700">View</span>
                        </div>
                      </summary>
                      <div className="border-t border-slate-200 p-5 md:p-6">
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
                          {booking.promotionSnapshot?.title && (
                            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                              <p className="text-xs font-black uppercase tracking-wide text-amber-700">Promotion active when this booking was made</p>
                              <h4 className="mt-1 font-black text-amber-800">{booking.promotionSnapshot.title}</h4>
                              <p className="mt-1 text-sm text-slate-800">{booking.promotionSnapshot.description}</p>
                              <p className="mt-2 text-xs font-semibold text-orange-600">Valid {formatCreatedDate(booking.promotionSnapshot.startAt)} – {formatCreatedDate(booking.promotionSnapshot.endAt)}</p>
                            </div>
                          )}
                          <div className="mt-4 grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2">
                            <Detail label="Booking ID" value={booking._id} />
                            <Detail label="Booking code" value={booking.bookingCode || booking._id} />
                            <Detail label="Payment status" value={booking.paymentStatus || 'unpaid'} />
                            <Detail label="Amount paid" value={formatRwf(booking.amountPaid || 0)} />
                            <Detail label="Remaining balance" value={formatRwf(Math.max(0, Number(booking.totalPrice || 0) - Number(booking.amountPaid || 0)))} />
                            <Detail label="Quantity" value={booking.quantity || booking.guests || 1} />
                            <Detail label="Booking status" value={booking.status} />
                            <Detail label="Payment purpose" value={booking.paymentReason} />
                          </div>
                          {depositPaid && booking.bookingCode && (
                            <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                              Give this Booking Code to the seller only when you arrive and pay the remaining 70%.
                            </p>
                          )}
                          {depositPaid && <CustomerChangeRequestCard booking={booking} open={changeBookingId === booking._id} onClose={() => setChangeBookingId('')} onSubmitted={() => { setChangeRequestsVersion((value) => value + 1); setMessage('Booking change request submitted successfully.'); }} />}
                          <BookingRequestDetails details={booking.bookingDetails} />
                          {booking.providerDetailsUnlocked && businessToShow && (
                            <UnlockedProvider business={businessToShow} />
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                            {t(`${booking.status}Status`, language)}
                          </span>
                          <p className="text-xl font-bold text-primary mt-2">{formatRwf(booking.totalPrice || 0)}</p>
                          <div className="mt-3 flex flex-col gap-2">
                            {['confirmed', 'waiting-for-payment'].includes(booking.status) && !depositPaid && (
                              <div className="min-w-64 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Payment required before documents</p>
                                <p className="mt-1 text-sm text-blue-950">Pay the simulated 30% deposit to receive the QR code and booking PDF.</p>
                                <p className="mt-2 text-lg font-black text-primary">{formatRwf(booking.depositAmount || Math.round(Number(booking.totalPrice || 0) * 0.3))}</p>
                                <p className="mt-1 text-xs text-blue-800">{booking.paymentReason || 'Approved booking deposit'}</p>
                                <button onClick={() => setPaymentBooking(booking)} className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                                  Pay 30% Deposit
                                </button>
                              </div>
                            )}
                            {depositPaid && booking.verificationToken && (
                              <>
                                <img
                                  src={bookingApi.getQrImageUrl(booking.verificationToken)}
                                  alt="Booking QR code"
                                  className="ml-auto h-28 w-28 rounded-lg border border-gray-200 bg-white p-2"
                                />
                                <a href={bookingApi.getReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                  Download PDF
                                </a>
                                <a href={bookingApi.getPrintableReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                  Print PDF
                                </a>
                                <a href={bookingApi.getQrImageUrl(booking.verificationToken)} download={`booking-${booking.bookingCode || booking._id}-qr.png`} className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                  Download QR
                                </a>
                                <Link to={`/verify/${booking.verificationToken}`} className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                  Verify Booking
                                </Link>
                              </>
                            )}
                            {depositPaid && !booking.verificationToken && (
                              <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                Receipt is being prepared. Refresh after payment.
                              </span>
                            )}
                            {booking.verificationCode && (
                              <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-mono text-gray-700">{booking.verificationCode}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    </details>
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
          <CustomerChangeRequests refreshKey={changeRequestsVersion} />
        </div>
      </main>

      {paymentBooking && (
        <DepositPaymentModal
          booking={paymentBooking}
          customer={user}
          onClose={() => setPaymentBooking(null)}
          onConfirm={(paymentDetails) => payBooking(paymentBooking._id, paymentDetails)}
        />
      )}

      <Footer />
    </div>
  );
}

function Detail({ label, value }) {
  return <p className="rounded-lg border border-blue-100 bg-white p-2.5 shadow-sm"><span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">{label}</span><span className="mt-0.5 block font-bold capitalize text-slate-900">{value || '-'}</span></p>;
}

function formatCreatedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'date unavailable';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function BookingRequestDetails({ details }) {
  if (!details || typeof details !== 'object') return null;
  const rows = Object.entries(details).flatMap(([key, value]) => {
    if (['totalPrice', 'providerRules'].includes(key) || value === undefined || value === null || value === '') return [];
    if (key === 'customResponses' && Array.isArray(value)) {
      return value.map((item) => [item.label || item.name || 'Response', item.value]);
    }
    if (typeof value === 'object' && !Array.isArray(value)) return [];
    const display = Array.isArray(value) ? value.filter((item) => typeof item !== 'object').join(', ') : String(value);
    return display ? [[key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), display]] : [];
  });
  if (!rows.length) return null;
  return (
    <details className="mt-3 rounded-xl border border-gray-200 p-4 text-sm">
      <summary className="cursor-pointer font-bold text-gray-800">View submitted booking details</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value], index) => <Detail key={`${label}-${index}`} label={label} value={value} />)}
      </div>
    </details>
  );
}

function UnlockedProvider({ business }) {
  const contacts = business.contactDetails || {};
  const email = contacts.email || business.sellerContactEmail || business.ownerEmail || '';
  const phone = contacts.phone || '';
  const whatsapp = contacts.whatsapp || phone;
  const address = formatFullLocation(business.locationDetails, contacts.exactAddress || business.location);
  const mapUrl = contacts.googleMapsUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '');
  const socialLinks = [
    ['Website', contacts.website], ['Facebook', contacts.facebook], ['Instagram', contacts.instagram], ['X', contacts.x], ['TikTok', contacts.tiktok],
  ].filter(([, url]) => url);
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <div className="flex items-center gap-3">
        {business.images?.[0] && <img src={business.images[0]} alt={`${business.name} logo`} className="h-12 w-12 rounded-xl object-cover" />}
        <p className="font-bold">Provider details unlocked</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Detail label="Business" value={business.name} />
        <Detail label="Full location" value={address} />
        <Detail label="Phone / WhatsApp" value={[phone, contacts.whatsapp].filter(Boolean).join(' / ')} />
        <Detail label="Email" value={email} />
        {(contacts.latitude || contacts.longitude) && <Detail label="GPS" value={`${contacts.latitude || '-'}, ${contacts.longitude || '-'}`} />}
        {contacts.registrationDetails && <Detail label="Registration" value={contacts.registrationDetails} />}
      </div>
      {business.description && <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm leading-6">{business.description}</p>}
      {business.images?.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {business.images.slice(0, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${business.name} ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />)}
        </div>
      )}
      {business.availabilityTable?.rows?.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead><tr>{business.availabilityTable.columns.map((column) => <th key={column.id} className="border-b px-3 py-2 text-left">{column.label}</th>)}</tr></thead>
            <tbody>{business.availabilityTable.rows.map((row) => <tr key={row.id}>{business.availabilityTable.columns.map((column) => <td key={column.id} className="border-b px-3 py-2">{row.cells?.[column.id] || '-'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && <a href={`tel:${phone}`} className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-800">Call provider</a>}
        {email && <a href={`mailto:${email}`} className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-800">Email provider</a>}
        {whatsapp && <a href={`https://wa.me/${normalizeWhatsApp(whatsapp)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white">Chat on WhatsApp</a>}
        {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-800">Open map</a>}
        {socialLinks.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 font-semibold text-emerald-800">{label}</a>)}
      </div>
    </div>
  );
}

function formatFullLocation(locationDetails, fallback) {
  const details = locationDetails || {};
  const rows = [
    ['District', details.district],
    ['Sector', details.sector],
    ['Cell', details.cell],
    ['Village', details.village],
  ].filter(([, value]) => value);
  return rows.length ? rows.map(([label, value]) => `${label}: ${value}`).join(', ') : fallback;
}

function normalizeWhatsApp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('0') ? `250${digits.slice(1)}` : digits;
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
