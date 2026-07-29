import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { bookingApi, getAuthData } from '../lib/api';
import { formatRwf } from '../lib/currency';
import DepositPaymentModal from '../components/DepositPaymentModal';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import CustomerChangeRequestCard from '../components/rebook/CustomerChangeRequestCard';
import CustomerChangeRequests from '../components/rebook/CustomerChangeRequests';
import UnlockedServiceMap from '../components/UnlockedServiceMap';

const statusStyle = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  'waiting-for-payment': 'bg-blue-100 text-blue-800',
  'provider-details-unlocked': 'bg-emerald-100 text-emerald-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

const DEPOSIT_PAID_STATUSES = ['deposit_paid', 'deposit-paid', 'paid'];
const PAYABLE_BOOKING_STATUSES = ['confirmed', 'waiting-for-payment'];
const RETRYABLE_PAYMENT_STATUSES = ['unpaid', 'pending', 'failed', ''];

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
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
      const paymentResponse = await bookingApi.payBooking(authData.token, bookingId, {
        paymentMethod: paymentDetails.paymentMethod || 'simulation-mobile-money',
        senderAccount: paymentDetails.senderAccount || user?.email,
      });
      setMessage('Deposit recorded successfully. Provider details, QR verification, and Booking PDF are now unlocked.');
      setPaymentBooking(null);
      const response = await bookingApi.getMyBookings(authData.token);
      setBookings(response.bookings || []);
      setSelectedBooking((current) => {
        if (current?._id !== bookingId) return current;
        return response.bookings?.find((booking) => booking._id === bookingId) || paymentResponse.booking || current;
      });
    } catch (error) {
      setMessage(error.message);
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <main className="py-6 sm:py-8">
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
                  const depositPaid = hasDepositPaid(booking);
                  const canPay = canPayDeposit(booking);
                  const providerUnlocked = Boolean(booking.providerDetailsUnlocked || booking.detailsUnlocked || depositPaid);
                  const title = serviceToShow?.title || serviceToShow?.name || businessToShow?.businessName || businessToShow?.name || booking.destinationPlace || t('serviceProviderPendingAssignment', language);
                  const remainingBalance = Math.max(0, Number(booking.remainingBalance ?? Number(booking.totalPrice || 0) - Number(booking.amountPaid || 0)));
                  const selected = selectedBooking?._id === booking._id;
                  const showInlineDetails = false;

                  return (
                    <article key={booking._id} className={`border-b border-slate-200 bg-white transition ${selected ? 'opacity-70 ring-2 ring-blue-300' : 'hover:bg-slate-50'}`}>
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">Booked {formatCreatedDate(booking.createdAt)}</p>
                          <h3 className="mt-1 truncate font-black text-slate-900">{title}</h3>
                          <p className="mt-1 text-xs text-slate-500">{booking.bookingCode || booking._id}</p>
                          {booking.promotionSnapshot?.title && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">Promotion applied</span>}
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-3">
                          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedBooking(booking); }} className="col-span-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white sm:col-span-1">View</button>
                          {canPay && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPaymentBooking(booking); }} className="rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white">Pay 30% Deposit</button>}
                          {depositPaid && !['completed', 'cancelled', 'rejected'].includes(booking.status) && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setChangeBookingId(booking._id); }} className="rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-bold text-blue-700">Request change</button>}
                          <span className={`flex min-h-10 items-center justify-center rounded-full px-3 py-1 text-center text-[11px] font-bold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>{formatStatus(booking.status)}</span>
                        </div>
                      </div>
                      {showInlineDetails && (
                      <div className="hidden border-t border-blue-100 p-4 md:p-6">
                      <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm md:p-5">
                      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
                        <div className="min-w-0">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Booking information</p>
                              <h3 className="mt-1 text-lg font-black text-slate-950">{title}</h3>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{booking.bookingCode || booking._id}</p>
                            </div>
                            {providerUnlocked ? (
                              <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-700">Details unlocked</span>
                            ) : (
                              <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-700">Locked until deposit</span>
                            )}
                          </div>
                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <Detail label="Destination" value={formatDestination(booking)} tone="blue" />
                            <Detail label="Schedule" value={formatBookingSchedule(booking, language)} tone="slate" />
                            <Detail label={getBookingQuantityLabel(booking, language)} value={booking.bookingDetails?.quantity || booking.guests || booking.quantity || 1} tone="slate" />
                            <Detail label="Booking ID" value={booking._id} tone="blue" />
                          </div>
                          {waiting && (
                            <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
                              {t('pleaseWaitForAdmin', language)}
                            </p>
                          )}
                          {booking.isAcknowledgedByAdmin && booking.status === 'pending' && (
                            <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                              {t('adminConfirmedReceipt', language)}
                            </p>
                          )}
                          {booking.adminResponseMessage && (
                            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                              {booking.adminResponseMessage}
                            </p>
                          )}
                          {assignedBusiness && (
                            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
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
                          <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                            <Detail label="Booking code" value={booking.bookingCode || booking._id} tone="blue" />
                            <Detail label="Payment status" value={formatStatus(booking.paymentStatus || 'unpaid')} tone={depositPaid ? 'green' : 'amber'} />
                            <Detail label="Amount paid" value={formatRwf(booking.amountPaid || 0)} tone="green" />
                            <Detail label="Remaining balance" value={formatRwf(remainingBalance)} tone="amber" />
                            <Detail label="Booking status" value={formatStatus(booking.status)} tone="blue" />
                            <Detail label="Payment purpose" value={booking.paymentReason} tone="slate" />
                          </div>
                          {depositPaid && booking.bookingCode && (
                            <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                              Give this Booking Code to the seller only when you arrive and pay the remaining 70%.
                            </p>
                          )}
                          {depositPaid && <CustomerChangeRequestCard booking={booking} open={changeBookingId === booking._id} onClose={() => setChangeBookingId('')} onSubmitted={() => { setChangeRequestsVersion((value) => value + 1); setMessage('Booking change request submitted successfully.'); }} />}
                          <BookingRequestDetails details={booking.bookingDetails} />
                          {providerUnlocked && businessToShow ? (
                            <UnlockedProvider business={businessToShow} />
                          ) : (
                            <LockedProviderNotice booking={booking} />
                          )}
                        </div>
                        <aside className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-blue-700">Payment summary</p>
                              <p className="mt-1 text-2xl font-black text-primary">{formatRwf(booking.totalPrice || 0)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                              {formatStatus(booking.status)}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <SummaryRow label="Deposit" value={formatRwf(booking.depositAmount || Math.round(Number(booking.totalPrice || 0) * 0.3))} />
                            <SummaryRow label="Paid" value={formatRwf(booking.amountPaid || 0)} strong={depositPaid} />
                            <SummaryRow label="Balance" value={formatRwf(remainingBalance)} />
                          </div>
                          <div className="mt-3 flex flex-col gap-2">
                            {['confirmed', 'waiting-for-payment'].includes(booking.status) && !depositPaid && (
                              <div className="rounded-xl border border-blue-200 bg-white p-4">
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
                                  className="mx-auto h-28 w-28 rounded-lg border border-gray-200 bg-white p-2"
                                />
                                <a href={bookingApi.getReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-bold text-white">
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
                        </aside>
                      </div>
                      </div>
                      </div>
                      )}
                    </article>
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

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          language={language}
          changeOpen={changeBookingId === selectedBooking._id}
          onClose={() => setSelectedBooking(null)}
          onPay={() => setPaymentBooking(selectedBooking)}
          onRequestChange={() => setChangeBookingId(selectedBooking._id)}
          onCloseChange={() => setChangeBookingId('')}
          onChangeSubmitted={() => {
            setChangeRequestsVersion((value) => value + 1);
            setMessage('Booking change request submitted successfully.');
          }}
        />
      )}

    </DashboardLayout>
  );
}

function Detail({ label, value, tone = 'blue' }) {
  const toneStyle = {
    blue: 'border-blue-100 text-blue-600',
    green: 'border-emerald-100 text-emerald-600',
    amber: 'border-amber-100 text-amber-600',
    slate: 'border-slate-200 text-slate-500',
  }[tone] || 'border-blue-100 text-blue-600';
  return <p className={`rounded-lg border bg-white p-2.5 shadow-sm ${toneStyle}`}><span className="block text-[10px] font-bold uppercase tracking-wide">{label}</span><span className="mt-0.5 block break-words font-bold capitalize text-slate-900">{value || '-'}</span></p>;
}

function BookingDetailModal({ booking, language, changeOpen, onClose, onPay, onRequestChange, onCloseChange, onChangeSubmitted }) {
  const assignedBusiness = booking.businessId || booking.hotelId;
  const preferredBusiness = booking.preferredBusinessId || booking.preferredHotelId;
  const business = assignedBusiness || preferredBusiness;
  const service = booking.serviceId;
  const depositPaid = hasDepositPaid(booking);
  const canPay = canPayDeposit(booking);
  const providerUnlocked = Boolean(booking.providerDetailsUnlocked || booking.detailsUnlocked || depositPaid);
  const locationUnlocked = booking.locationUnlocked === true && booking.depositPaid === true;
  const title = service?.title || service?.name || business?.businessName || business?.name || booking.destinationPlace || 'Booking';
  const remainingBalance = Math.max(0, Number(booking.remainingBalance ?? Number(booking.totalPrice || 0) - Number(booking.amountPaid || 0)));
  const depositAmount = booking.depositAmount || Math.round(Number(booking.totalPrice || 0) * 0.3);
  const contacts = providerUnlocked ? business?.contactDetails || {} : {};
  const serviceLocation = business?.serviceLocation || business?.publicLocation || {};
  const address = locationUnlocked ? serviceLocation.fullAddress || formatFullLocation(business?.locationDetails, contacts.exactAddress || business?.location) : 'Pay 30% deposit to unlock exact location and directions.';
  const submittedRows = getBookingDetailRows(booking.bookingDetails);
  const summaryLocation = locationUnlocked
    ? address
    : [serviceLocation.province, serviceLocation.district, serviceLocation.sector].filter(Boolean).join(', ') || formatDestination(booking);

  return (
    <Modal title="Booking Details" onClose={onClose}>
      <DetailGrid data={{
        Name: title,
        Type: formatStatus(booking.bookingModel || booking.bookingDetails?.bookingType || business?.type || 'service'),
        Location: summaryLocation,
        Status: formatStatus(booking.status),
        'Payment status': formatStatus(booking.paymentStatus || 'unpaid'),
        'Booking code': booking.bookingCode || booking._id,
        'Total price': formatRwf(booking.totalPrice || 0),
        '30% deposit': formatRwf(depositAmount),
        'Amount paid': formatRwf(booking.amountPaid || 0),
        'Remaining balance': formatRwf(remainingBalance),
        Schedule: formatBookingSchedule(booking, language),
        [getBookingQuantityLabel(booking, language)]: booking.bookingDetails?.quantity || booking.guests || booking.quantity || 1,
      }} />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={`rounded-xl p-3 ${providerUnlocked ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <p className={`text-xs font-semibold uppercase ${providerUnlocked ? 'text-emerald-700' : 'text-amber-700'}`}>{providerUnlocked ? 'Unlocked details' : 'Locked details'}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{providerUnlocked ? 'Provider details, QR, and PDF are available.' : canPay ? `Use simulated payment to pay ${formatRwf(depositAmount)} and unlock provider contacts and documents.` : `Pay ${formatRwf(depositAmount)} after this booking is approved for payment.`}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">Payment purpose</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{booking.paymentReason || '-'}</p>
        </div>
      </div>

      {booking.adminResponseMessage && <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{booking.adminResponseMessage}</div>}

      {booking.promotionSnapshot?.title && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase text-amber-700">Promotion</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{booking.promotionSnapshot.title}</p>
          {booking.promotionSnapshot.description && <p className="mt-1 text-sm text-gray-700">{booking.promotionSnapshot.description}</p>}
        </div>
      )}

      <h3 className="mt-5 font-bold text-gray-900">Provider Information</h3>
      <DetailGrid data={{
        Business: providerUnlocked ? business?.businessName || business?.name || '-' : business?.anonymousName || booking.anonymousBusinessName || 'Hidden until deposit',
        Province: serviceLocation.province || business?.locationDetails?.province || '-',
        District: serviceLocation.district || business?.locationDetails?.district || '-',
        Sector: serviceLocation.sector || business?.locationDetails?.sector || '-',
        ...(locationUnlocked ? {
          'Full address / place name': address,
          Village: serviceLocation.village || business?.locationDetails?.village || '-',
        } : {
          Message: 'Pay 30% deposit to unlock exact location and directions.',
        }),
        'Phone / WhatsApp': providerUnlocked ? [contacts.phone, contacts.whatsapp].filter(Boolean).join(' / ') || '-' : 'Locked',
        Email: providerUnlocked ? contacts.email || business?.sellerContactEmail || business?.ownerEmail || '-' : 'Locked',
        Approval: providerUnlocked ? business?.approvalStatus || business?.verificationStatus || business?.status || '-' : 'Locked',
      }} />

      {locationUnlocked && <UnlockedServiceMap location={serviceLocation} />}

      {providerUnlocked && business?.images?.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {business.images.slice(0, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${business.name || title} ${index + 1}`} className="h-28 w-full rounded-xl object-cover" />)}
        </div>
      )}

      {submittedRows.length > 0 && (
        <>
          <h3 className="mt-5 font-bold text-gray-900">Submitted Booking Details</h3>
          <DetailGrid data={Object.fromEntries(submittedRows)} />
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {canPay && <button type="button" onClick={onPay} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Pay 30% Deposit (Simulation)</button>}
        {depositPaid && !['completed', 'cancelled', 'rejected'].includes(booking.status) && <button type="button" onClick={onRequestChange} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700">Request change</button>}
        {depositPaid && booking.verificationToken && <a href={bookingApi.getReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Download PDF</a>}
        {depositPaid && booking.verificationToken && <a href={bookingApi.getPrintableReceiptUrl(booking.verificationToken)} target="_blank" rel="noreferrer" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800">Print PDF</a>}
        {depositPaid && booking.verificationToken && <Link to={`/verify/${booking.verificationToken}`} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800">Verify Booking</Link>}
      </div>

      {depositPaid && booking.verificationToken && <img src={bookingApi.getQrImageUrl(booking.verificationToken)} alt="Booking QR code" className="mt-4 h-32 w-32 rounded-xl border border-gray-200 bg-white p-2" />}
      {depositPaid && booking.bookingCode && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">Give this Booking Code to the seller only when you arrive and pay the remaining 70%.</p>}
      {depositPaid && <CustomerChangeRequestCard booking={booking} open={changeOpen} onClose={onCloseChange} onSubmitted={onChangeSubmitted} />}
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailGrid({ data }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{String(value || '-')}</dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="font-semibold text-slate-600">{label}</span><span className={strong ? 'font-black text-emerald-700' : 'font-black text-slate-950'}>{value}</span></div>;
}

function hasDepositPaid(booking) {
  return Boolean(booking?.detailsUnlocked) || DEPOSIT_PAID_STATUSES.includes(booking?.paymentStatus);
}

function canPayDeposit(booking) {
  if (!booking || hasDepositPaid(booking)) return false;
  const paymentStatus = booking.paymentStatus || 'unpaid';
  return (
    PAYABLE_BOOKING_STATUSES.includes(booking.status) &&
    RETRYABLE_PAYMENT_STATUSES.includes(paymentStatus) &&
    Number(booking.totalPrice || 0) > 0
  );
}

function formatStatus(value) {
  return String(value || '-').replace(/[_-]/g, ' ');
}

function formatDestination(booking) {
  return [booking.destinationPlace, booking.destinationLocation].filter(Boolean).join(' - ') || '-';
}

function getBookingDetailRows(details) {
  if (!details || typeof details !== 'object') return [];
  return Object.entries(details).flatMap(([key, value]) => {
    if (['totalPrice', 'providerRules'].includes(key) || value === undefined || value === null || value === '') return [];
    if (key === 'customResponses' && Array.isArray(value)) {
      return value.flatMap((item) => {
        const answer = item.value ?? item.answer;
        return answer === undefined || answer === null || answer === '' ? [] : [[item.label || item.name || 'Response', answer]];
      });
    }
    if (typeof value === 'object' && !Array.isArray(value)) return [];
    const display = Array.isArray(value) ? value.filter((item) => typeof item !== 'object').join(', ') : String(value);
    return display ? [[key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), display]] : [];
  });
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
        {rows.map(([label, value], index) => <Detail key={`${label}-${index}`} label={label} value={value} tone="slate" />)}
      </div>
    </details>
  );
}

function LockedProviderNotice({ booking }) {
  const required = booking.lockedDetails?.visible?.depositAmountRequired || booking.depositAmount || Math.round(Number(booking.totalPrice || 0) * 0.3);
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-black">Provider details are locked</p>
      <p className="mt-1 leading-6">Pay the 30% deposit ({formatRwf(required)}) to unlock phone, exact address, map, QR verification, and booking PDF.</p>
    </div>
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
