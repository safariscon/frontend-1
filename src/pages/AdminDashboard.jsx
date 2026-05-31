import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { adminApi, getAuthData, publicApi } from '../lib/api';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';

const EMPTY_BUSINESS_FORM = {
  ownerName: '',
  ownerEmail: '',
};

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  text: 'Umwaka wa mituweli 2026/2027 watangiye. Ishyurira umuryango wawe hano',
  linkUrl: '',
  linkLabel: 'hano',
};

const BUSINESS_TYPE_GROUPS = [
  ['Accommodation Services', [['hotels-and-resorts', 'Hotels & Resorts'], ['homestays-and-guesthouses', 'Homestays & Guesthouses'], ['tent-rentals-and-camping-sites', 'Tent Rentals & Camping Sites'], ['vacation-rentals-and-apartments', 'Vacation Rentals & Apartments']]],
  ['Transport & Mobility Services', [['car-rentals', 'Car Rentals'], ['motorbike-and-scooter-rentals', 'Motorbike & Scooter Rentals'], ['taxi-and-ride-services', 'Taxi & Ride Services'], ['bus-and-minivan-charters', 'Bus & Minivan Charters']]],
  ['Food & Beverage Services', [['restaurants', 'Restaurants'], ['bars-and-pubs', 'Bars & Pubs'], ['coffee-shops-and-cafes', 'Coffee Shops & Cafes'], ['food-trucks-and-street-food-stalls', 'Food Trucks & Street Food']]],
  ['Events & Venue Services', [['conference-event-halls-mice', 'Conference & Event Halls'], ['wedding-venues', 'Wedding Venues']]],
  ['Travel & Experience Services', [['tour-and-activity-operators', 'Tours & Activities'], ['entertainment-venues', 'Entertainment Venues'], ['gear-rentals', 'Gear Rentals']]],
  ['Shopping & Local Market Services', [['souvenir-shops-and-craft-markets', 'Souvenir Shops & Craft Markets']]],
  ['Wellness & Personal Care Services', [['spas-and-wellness-centers', 'Spas & Wellness Centers']]],
  ['Personal Support Services', [['childcare-services', 'Childcare Services']]],
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('businesses');
  const [loading, setLoading] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [onboardingCredentials, setOnboardingCredentials] = useState(null);
  const [businessForm, setBusinessForm] = useState(EMPTY_BUSINESS_FORM);
  const [announcementForm, setAnnouncementForm] = useState(DEFAULT_ANNOUNCEMENT);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const token = getAuthData()?.token;

  const loadData = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError('');
    setInfo('');
    try {
      const [statsResp, businessResp, serviceResp, bookingResp, userResp, transactionResp] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getBusinesses(token),
        adminApi.getServices(token),
        adminApi.getBookings(token),
        adminApi.getUsers(token),
        adminApi.getTransactions(token),
      ]);
      setStats(statsResp);
      setBusinesses(businessResp.businesses || businessResp.hotels || []);
      setServices(serviceResp.services || []);
      setBookings(bookingResp.bookings || []);
      setUsers(userResp.users || []);
      setTransactions(transactionResp.transactions || []);
      setTransactionSummary(transactionResp.summary || null);
      try {
        const announcementResp = await publicApi.getAnnouncement();
        setAnnouncementForm(announcementResp.announcement || DEFAULT_ANNOUNCEMENT);
      } catch {
        setAnnouncementForm(DEFAULT_ANNOUNCEMENT);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    Promise.resolve().then(() => loadData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return undefined;
    joinRealtimeChannel('admin', 'marketplace');
    return subscribeToRealtime(
      [REALTIME_EVENTS.BUSINESS_CHANGED, REALTIME_EVENTS.SERVICE_CHANGED, REALTIME_EVENTS.BOOKING_CHANGED, 'newBooking', 'serviceUpdated'],
      () => loadData({ silent: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  const revenueByType = useMemo(() => {
    return bookings.reduce((acc, booking) => {
      const type = booking.businessId?.businessType || booking.businessType || 'marketplace';
      acc[type] = (acc[type] || 0) + Number(booking.totalPrice || 0);
      return acc;
    }, {});
  }, [bookings]);

  const reviewBusiness = async (businessId, status) => {
    if (!token) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.updateBusinessVerification(token, businessId, status);
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteBusiness = async (businessId) => {
    if (!token || !window.confirm('Delete this business from the database?')) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.deleteBusiness(token, businessId);
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const approveBooking = async (booking) => {
    if (!token) return;
    const businessId = booking.preferredHotelId?._id || booking.hotelId?._id || booking.businessId?._id;
    if (!businessId) {
      setError('This booking has no selected business. Connect it to a business before approval.');
      return;
    }
    setError('');
    setInfo('');
    try {
      const response = await adminApi.approveBooking(token, booking._id || booking.id, { businessId });
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteSelectedUsers = async () => {
    if (!token || selectedUserIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedUserIds.length} selected user(s) from the database?`)) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.deleteUsers(token, selectedUserIds);
      setInfo(response.message);
      setSelectedUserIds([]);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteOneUser = async (userId) => {
    if (!token || !window.confirm('Delete this user from the database?')) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.deleteUser(token, userId);
      setInfo(response.message);
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const registerBusiness = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSavingService(true);
    setError('');
    setInfo('');
    try {
      const response = await adminApi.createSeller(token, {
        fullName: businessForm.ownerName,
        email: businessForm.ownerEmail,
      });
      setOnboardingCredentials(response.credentials);
      setBusinessForm(EMPTY_BUSINESS_FORM);
      setActiveTab('businesses');
      await loadData({ silent: true });
      setInfo(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingService(false);
    }
  };

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    if (!token) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.updateAnnouncement(token, announcementForm);
      setInfo(response.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketplace Admin</h1>
              <p className="text-gray-600">Control businesses, users, bookings, revenue, and live activity.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setActiveTab('register-business'); setBusinessForm(EMPTY_BUSINESS_FORM); }} className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Create Seller</button>
              <button onClick={() => loadData()} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold">Refresh</button>
            </div>
          </div>

          {(error || info) && <div className="mb-4 space-y-2">{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</p>}</div>}
          {onboardingCredentials?.password && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-bold">Owner onboarding credentials</h2>
                <button
                  type="button"
                  onClick={() => setOnboardingCredentials(null)}
                  className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
                >
                  Hide
                </button>
              </div>
              <p>Give these details to the seller. The generated password is shown only after account creation.</p>
              <dl className="mt-3 grid gap-2 md:grid-cols-2">
                <Credential label="Seller Name" value={onboardingCredentials.fullName} />
                <Credential label="Seller Email" value={onboardingCredentials.email} />
                <Credential label="Seller ID" value={onboardingCredentials.sellerId} />
                <Credential label="Generated Password" value={onboardingCredentials.password} />
              </dl>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Metric label="Users" value={stats?.totalUsers ?? users.length} />
            <Metric label="Businesses" value={stats?.totalBusinesses ?? businesses.length} />
            <Metric label="Services" value={stats?.totalServices ?? services.length} />
            <Metric label="Bookings" value={stats?.totalBookings ?? bookings.length} />
            <Metric label="Revenue" value={`$${stats?.totalRevenue ?? 0}`} />
            <Metric label="Pending" value={stats?.pendingApprovals ?? 0} />
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto">
            {['businesses', 'announcement', 'register-business', 'users', 'services', 'bookings', 'verification', 'revenue', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
              >
                {tab === 'register-business' ? 'Create Seller' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm p-4">
            {loading ? <p className="p-4 text-gray-600">Loading dashboard...</p> : null}
            {!loading && activeTab === 'businesses' && <BusinessTable businesses={businesses} onReview={reviewBusiness} onDelete={deleteBusiness} onView={setSelectedBusiness} />}
            {!loading && activeTab === 'announcement' && <AnnouncementForm form={announcementForm} setForm={setAnnouncementForm} onSubmit={saveAnnouncement} />}
            {!loading && activeTab === 'register-business' && <AdminBusinessForm form={businessForm} setForm={setBusinessForm} onSubmit={registerBusiness} saving={savingService} />}
            {!loading && activeTab === 'users' && (
              <UserGroups
                users={users}
                selectedUserIds={selectedUserIds}
                setSelectedUserIds={setSelectedUserIds}
                onDeleteSelected={deleteSelectedUsers}
                onDeleteOne={deleteOneUser}
              />
            )}
            {!loading && activeTab === 'services' && <ServiceTable services={services} />}
            {!loading && activeTab === 'bookings' && <BookingTable bookings={bookings} onApprove={approveBooking} onView={setSelectedBooking} />}
            {!loading && activeTab === 'verification' && <BookingVerification token={token} verify={adminApi.verifyBooking} />}
            {!loading && activeTab === 'revenue' && <RevenueList revenueByType={revenueByType} transactions={transactions} summary={transactionSummary} />}
            {!loading && activeTab === 'activity' && <ActivityFeed bookings={bookings} services={services} businesses={businesses} />}
          </section>
        </div>
      </main>
      {selectedBusiness && <BusinessDetailModal business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />}
      {selectedBooking && <AdminBookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
      <Footer />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

function Credential({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{label}</dt>
      <dd className="mt-1 break-all font-mono text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}

function BusinessTable({ businesses, onReview, onDelete, onView }) {
  return <SimpleTable rows={businesses} columns={['Business', 'Type', 'Location', 'Status', 'Actions']} map={(business) => [
    business.businessName || business.name,
    business.businessType || business.type,
    business.location,
    business.approvalStatus || business.verificationStatus || 'pending',
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onView(business)} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">View</button>
      <button onClick={() => onReview(business._id || business.id, 'approved')} className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Post</button>
      <button onClick={() => onReview(business._id || business.id, 'rejected')} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
      <button onClick={() => onDelete(business._id || business.id)} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Delete</button>
    </div>,
  ]} />;
}

function ServiceTable({ services }) {
  return <SimpleTable rows={services} columns={['Business Item', 'Type', 'Business', 'Availability', 'Status']} map={(service) => [
    service.title || service.name,
    service.serviceType || service.category,
    service.businessId?.businessName || service.businessId?.name || '-',
    service.availabilityText || (service.availableQuantity ?? 0),
    service.status,
  ]} />;
}

function UserGroups({ users, selectedUserIds, setSelectedUserIds, onDeleteSelected, onDeleteOne }) {
  const selectedSet = new Set(selectedUserIds);
  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };
  const grouped = users.reduce((acc, user) => {
    const role = String(user.role || '').toLowerCase();
    const key = role === 'admin'
      ? 'Admin Users'
      : ['supplier', 'hotel', 'business'].includes(role)
        ? 'Business Users'
        : 'Other Users';
    acc[key] = acc[key] || [];
    acc[key].push(user);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-700">{selectedUserIds.length} selected</p>
        <button
          type="button"
          disabled={selectedUserIds.length === 0}
          onClick={onDeleteSelected}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Delete selected users
        </button>
      </div>
      {['Business Users', 'Admin Users', 'Other Users'].map((group) => (
        <section key={group}>
          <h2 className="mb-2 text-lg font-bold text-gray-900">{group}</h2>
          <SimpleTable rows={grouped[group] || []} columns={['Select', 'Name', 'Email', 'Role', 'Business', 'Actions']} map={(user) => [
            <input
              type="checkbox"
              checked={selectedSet.has(user._id || user.id)}
              onChange={() => toggleUser(user._id || user.id)}
              aria-label={`Select ${user.name}`}
            />,
            user.name,
            user.email,
            user.role,
            user.businessName || user.hotelId?.businessName || user.hotelId?.name || user.hotelId || '-',
            <button
              type="button"
              onClick={() => onDeleteOne(user._id || user.id)}
              className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
            >
              Delete
            </button>,
          ]} />
        </section>
      ))}
    </div>
  );
}

function BookingTable({ bookings, onApprove, onView }) {
  return <SimpleTable rows={bookings} columns={['Code', 'Customer', 'Service', 'Business', 'Status', 'Paid', 'Total', 'Actions']} map={(booking) => [
    booking.bookingCode || booking._id?.slice(-8),
    booking.userId?.name || booking.touristId?.name || booking.userId?.email || booking.touristId?.email || 'Customer',
    booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace,
    booking.businessId?.businessName || booking.businessId?.name || booking.hotelId?.name || booking.preferredHotelId?.name || '-',
    booking.status,
    booking.paymentStatus || 'unpaid',
    `$${booking.totalPrice || 0}`,
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onView(booking)} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">View</button>
      {booking.status === 'pending' || booking.status === 'reviewing' ? (
      <button
        type="button"
        onClick={() => onApprove(booking)}
        className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
      >
        Approve
      </button>
      ) : null}
    </div>,
  ]} />;
}

function RevenueList({ revenueByType, transactions, summary }) {
  const entries = Object.entries(revenueByType);
  if (entries.length === 0 && transactions.length === 0) return <p className="p-4 text-gray-600">No revenue yet.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900">Total received</p>
        <p className="text-primary font-bold">${summary?.totalReceived || 0}</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900">Commission earned</p>
        <p className="text-primary font-bold">${summary?.commissionEarned || 0}</p>
      </div>
      {entries.map(([type, total]) => (
        <div key={type} className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">{type}</p>
          <p className="text-primary font-bold">${total}</p>
        </div>
      ))}
      <div className="md:col-span-2">
        <SimpleTable rows={transactions} columns={['Transaction', 'Booking', 'User', 'Seller', 'Method', 'Status', 'Amount']} map={(tx) => [
          tx.transactionId,
          tx.bookingId?.bookingCode || tx.bookingId?._id || '-',
          tx.userId?.name || tx.userId?.email || '-',
          tx.sellerId?.name || tx.sellerId?.email || '-',
          tx.paymentMethod,
          tx.status,
          `$${tx.amount || 0}`,
        ]} />
      </div>
    </div>
  );
}

function ActivityFeed({ bookings, services, businesses }) {
  const items = [
    ...bookings.slice(0, 5).map((booking) => ({ id: booking._id, text: `Booking ${booking.bookingCode || booking._id?.slice(-8)} is ${booking.status}` })),
    ...services.slice(0, 5).map((service) => ({ id: service._id, text: `Service updated: ${service.title || service.name}` })),
    ...businesses.slice(0, 5).map((business) => ({ id: business._id || business.id, text: `Business: ${business.businessName || business.name}` })),
  ];
  return <div className="space-y-2">{items.map((item) => <p key={item.id} className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{item.text}</p>)}</div>;
}

function AnnouncementForm({ form, setForm, onSubmit }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="rounded-xl border border-yellow-300 bg-[#ffc928] p-4 text-center text-sm text-slate-950">
        <span className="inline-flex items-center justify-center gap-2">
          <span className="text-sky-600" aria-hidden="true">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
            </svg>
          </span>
          <span>{form.text || 'Your announcement text will appear here.'} {form.linkUrl && <strong>{form.linkLabel || 'hano'}</strong>}</span>
        </span>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input type="checkbox" checked={form.enabled} onChange={(event) => set('enabled', event.target.checked)} />
        Show announcement bar on every page
      </label>
      <AdminTextArea label="Announcement Message" value={form.text} onChange={(value) => set('text', value)} />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminInput label="Optional Link URL" value={form.linkUrl} onChange={(value) => set('linkUrl', value)} />
        <AdminInput label="Link Text" value={form.linkLabel} onChange={(value) => set('linkLabel', value)} />
      </div>
      <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white md:w-fit">
        Update Announcement
      </button>
    </form>
  );
}

function BookingVerification({ token, verify }) {
  const [lookup, setLookup] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!lookup.trim()) return;
    setError('');
    setResult(null);
    try {
      const response = await verify(token, lookup.trim().replace(/^.*\/verify\//, ''));
      setResult(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row">
        <input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="Enter Booking ID, code, verification token, or QR token" className="flex-1 rounded-xl border border-gray-300 px-4 py-3" />
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">Verify Booking</button>
      </form>
      <p className="text-sm text-gray-500">When scanning a QR code, paste the token or full verification URL here.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {result && <InlineBookingDetails booking={result} />}
    </div>
  );
}

function InlineBookingDetails({ booking }) {
  const token = booking.verificationToken;
  const responses = booking.bookingDetails?.customResponses || [];
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <DetailGrid data={{
        'Booking ID': booking._id,
        Code: booking.bookingCode,
        Customer: booking.touristId?.name || 'Customer',
        Email: booking.touristId?.email || '-',
        Business: booking.hotelId?.name || booking.preferredHotelId?.name || booking.destinationPlace,
        Date: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-',
        Status: booking.status,
        Payment: booking.paymentStatus || 'unpaid',
      }} />
      {token && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(`${window.location.origin}/verify/${token}`)}`} alt="Booking QR code" className="mt-4 h-40 w-40 rounded-xl border border-gray-200 p-2" />}
      <ResponseBlock responses={responses.length ? responses : booking.bookingDetails} />
    </div>
  );
}

function BusinessDetailModal({ business, onClose }) {
  return (
    <Modal title="Business Details" onClose={onClose}>
      <DetailGrid data={{
        Name: business.businessName || business.name,
        Type: business.businessType || business.type,
        Location: business.location,
        Status: business.status,
        Approval: business.approvalStatus || business.verificationStatus,
        Seller: business.ownerUserId?.name || business.ownerEmail || 'Seller',
        Price: business.priceText || business.basePrice || '-',
        Inventory: business.quantityRemaining ?? business.availableQuantity ?? '-',
      }} />
      {Array.isArray(business.images) && business.images.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3">{business.images.slice(0, 3).map((image) => <img key={image} src={image} alt={business.name} className="h-28 w-full rounded-xl object-cover" />)}</div>}
      <ResponseBlock title="Availability Table" responses={business.availabilityTable?.rows?.map((row) => row.cells) || []} />
      <ResponseBlock title="Booking Form Fields" responses={business.bookingForm?.fields || []} />
    </Modal>
  );
}

function AdminBookingDetailModal({ booking, onClose }) {
  return <Modal title="Booking Details" onClose={onClose}><InlineBookingDetails booking={booking} /></Modal>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-gray-900">{title}</h2><button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">Close</button></div>{children}</div></div>;
}

function DetailGrid({ data }) {
  return <dl className="grid gap-3 md:grid-cols-2">{Object.entries(data).map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt><dd className="mt-1 break-all text-sm font-semibold text-gray-900">{String(value || '-')}</dd></div>)}</dl>;
}

function ResponseBlock({ title = 'Form Responses', responses }) {
  const entries = Array.isArray(responses) ? responses : Object.entries(responses || {}).map(([label, value]) => ({ label, value }));
  if (!entries.length) return <p className="mt-4 text-sm text-gray-500">No {title.toLowerCase()} available.</p>;
  return <div className="mt-4"><h3 className="font-bold text-gray-900">{title}</h3><div className="mt-2 grid gap-2">{entries.map((entry, index) => <div key={entry.fieldId || entry.id || index} className="rounded-lg border border-gray-200 p-3"><p className="text-xs font-semibold uppercase text-gray-500">{entry.label || entry.id || `Item ${index + 1}`}</p><p className="break-all text-sm text-gray-800">{typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value ?? JSON.stringify(entry))}</p></div>)}</div></div>;
}

function AdminBusinessForm({ form, setForm, onSubmit, saving }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <AdminInput label="Seller Full Name" value={form.ownerName} onChange={(value) => set('ownerName', value)} required />
      <AdminInput label="Seller Email" type="email" value={form.ownerEmail} onChange={(value) => set('ownerEmail', value)} required />
      <button disabled={saving} className="md:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving...' : 'Generate Seller Credentials'}
      </button>
    </form>
  );
}

function AdminInput({ label, value, onChange, type = 'text', required = false }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function AdminSelect({ label, value, onChange, options }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function AdminTextArea({ label, value, onChange }) {
  return <label className="block md:col-span-2"><span className="text-sm font-semibold text-gray-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function SimpleTable({ rows, columns, map }) {
  if (!rows.length) return <p className="p-4 text-gray-600">No records yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200">{columns.map((column) => <th key={column} className="py-3 px-2 text-left">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row._id || row.id} className="border-b border-gray-100">{map(row).map((value, index) => <td key={index} className="py-3 px-2">{value || '-'}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
