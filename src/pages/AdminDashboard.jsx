import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { adminApi, bookingApi, getAuthData, publicApi } from '../lib/api';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { SERVICE_CATEGORY_TUPLES as BUSINESS_TYPE_GROUPS } from '../data/serviceCategories';
import AdminRebookRequests from '../components/rebook/AdminRebookRequests';

const EMPTY_PROVIDER_FORM = {
  providerName: '',
  providerEmail: '',
};

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  intervalSeconds: 5,
  items: [{ text: 'Niba ushaka guhindura ururimi kanda ahanditse English', linkUrl: '', linkLabel: '' }],
};

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
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER_FORM);
  const [announcementForm, setAnnouncementForm] = useState(DEFAULT_ANNOUNCEMENT);
  const [marketplaceSettings, setMarketplaceSettings] = useState({ defaultCommissionPercentage: 10, bookingMode: 'manual', bookingRules: [] });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingModeId, setUpdatingModeId] = useState('');
  const [modeErrors, setModeErrors] = useState({});
  const [storageOverview, setStorageOverview] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState('');
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
        const [announcementResp, settingsResp] = await Promise.all([
          publicApi.getAnnouncement(),
          publicApi.getMarketplaceSettings(),
        ]);
        const items = announcementResp.announcements?.length
          ? announcementResp.announcements
          : announcementResp.announcement?.text
            ? [announcementResp.announcement]
            : DEFAULT_ANNOUNCEMENT.items;
        setAnnouncementForm({
          enabled: announcementResp.enabled ?? announcementResp.announcement?.enabled ?? true,
          intervalSeconds: announcementResp.intervalSeconds || 5,
          items: items.slice(0, 5),
        });
        setMarketplaceSettings(settingsResp.settings || { defaultCommissionPercentage: 10, bookingMode: 'manual', bookingRules: [] });
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

  const approveBooking = async (booking, decision) => {
    if (!token) return;
    const businessId = booking.preferredHotelId?._id || booking.hotelId?._id || booking.businessId?._id;
    if (!businessId) {
      setError('This booking has no selected business. Connect it to a business before approval.');
      return;
    }
    setError('');
    setInfo('');
    try {
      const response = await adminApi.approveBooking(token, booking._id || booking.id, {
        businessId,
        totalPrice: Number(decision.totalPrice),
        commissionPercentage: Number(decision.commissionPercentage),
        paymentReason: decision.paymentReason,
      });
      setInfo(response.message);
      setSelectedBooking(null);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const rejectBooking = async (booking, reason) => {
    if (!token) return;
    setError('');
    setInfo('');
    try {
      const response = await adminApi.rejectBooking(token, booking._id || booking.id, { reason });
      setInfo(response.message);
      setSelectedBooking(null);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const loadStorageOverview = async () => {
    if (!token) return;
    setStorageLoading(true);
    setStorageError('');
    try {
      const response = await adminApi.getStorageOverview(token);
      setStorageOverview(response);
    } catch (requestError) {
      setStorageError(requestError.message);
    } finally {
      setStorageLoading(false);
    }
  };

  const saveMarketplaceSettings = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await adminApi.updateMarketplaceSettings(token, marketplaceSettings);
      setMarketplaceSettings(response.settings);
      setInfo(response.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveGlobalBookingMode = async (bookingMode) => {
    const nextSettings = { ...marketplaceSettings, bookingMode };
    setMarketplaceSettings(nextSettings);
    setError('');
    try {
      const response = await adminApi.updateMarketplaceSettings(token, nextSettings);
      setMarketplaceSettings(response.settings);
      await loadData({ silent: true });
      setInfo(response.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateServiceBookingMode = async (service, bookingMode) => {
    const serviceId = service._id || service.id;
    const previousMode = service.bookingMode || 'manual';
    setUpdatingModeId(serviceId);
    setModeErrors((previous) => ({ ...previous, [serviceId]: '' }));
    setServices((previous) => previous.map((item) => String(item._id || item.id) === String(serviceId) ? { ...item, bookingMode } : item));
    try {
      const response = await adminApi.updateServiceBookingMode(token, serviceId, bookingMode);
      setMarketplaceSettings((previous) => ({ ...previous, bookingMode: response.globalBookingMode || 'service-level' }));
      await loadData({ silent: true });
      setInfo(response.message);
    } catch (requestError) {
      setServices((previous) => previous.map((item) => String(item._id || item.id) === String(serviceId) ? { ...item, bookingMode: previousMode } : item));
      setModeErrors((previous) => ({ ...previous, [serviceId]: requestError.message }));
      setError(requestError.message);
    } finally {
      setUpdatingModeId('');
    }
  };

  const markCommissionCollected = async (transaction) => {
    if (!token) return;
    try {
      const response = await adminApi.updateCommissionStatus(token, transaction._id, 'collected');
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

  const createProvider = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSavingService(true);
    setError('');
    setInfo('');
    try {
      const response = await adminApi.createSeller(token, {
        providerName: providerForm.providerName,
        providerEmail: providerForm.providerEmail,
      });
      setOnboardingCredentials(response.credentials);
      setProviderForm(EMPTY_PROVIDER_FORM);
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
              <button onClick={() => { setActiveTab('register-business'); setProviderForm(EMPTY_PROVIDER_FORM); }} className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Create Provider</button>
              <button onClick={() => activeTab === 'storage' ? loadStorageOverview() : loadData()} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold">Refresh</button>
            </div>
          </div>

          {(error || info) && <div className="mb-4 space-y-2">{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</p>}</div>}
          {onboardingCredentials?.generatedPassword && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-bold">Provider onboarding credentials</h2>
                <button
                  type="button"
                  onClick={() => setOnboardingCredentials(null)}
                  className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
                >
                  Hide
                </button>
              </div>
              <p>Give these details to the service provider. The generated password is shown only after account creation.</p>
              <dl className="mt-3 grid gap-2 md:grid-cols-2">
                <Credential label="Provider Name" value={onboardingCredentials.providerName} />
                <Credential label="Provider Email" value={onboardingCredentials.providerEmail} />
                <Credential label="Provider ID" value={onboardingCredentials.sellerId} />
                <Credential label="Generated Password" value={onboardingCredentials.generatedPassword} />
              </dl>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Metric label="Users" value={stats?.totalUsers ?? users.length} />
            <Metric label="Businesses" value={stats?.totalBusinesses ?? businesses.length} />
            <Metric label="Services" value={stats?.totalServices ?? services.length} />
            <Metric label="Bookings" value={stats?.totalBookings ?? bookings.length} />
            <Metric label="Revenue" value={`${Number(stats?.totalRevenue ?? 0).toLocaleString()} RWF`} />
            <Metric label="Pending" value={stats?.pendingApprovals ?? 0} />
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto">
            {['businesses', 'announcement', 'booking-rules', 'register-business', 'users', 'services', 'bookings', 'rebook-requests', 'verification', 'revenue', 'analytics', 'storage', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'storage' && !storageOverview) loadStorageOverview(); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
              >
                {tab === 'register-business' ? 'Create Provider' : tab === 'rebook-requests' ? 'Manage Re-book Requests' : tab === 'storage' ? 'Storage Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm p-4">
            {loading ? <p className="p-4 text-gray-600">Loading dashboard...</p> : null}
            {!loading && activeTab === 'businesses' && <BusinessTable businesses={businesses} onReview={reviewBusiness} onDelete={deleteBusiness} onView={setSelectedBusiness} />}
            {!loading && activeTab === 'announcement' && <AnnouncementForm form={announcementForm} setForm={setAnnouncementForm} onSubmit={saveAnnouncement} />}
            {!loading && activeTab === 'booking-rules' && <MarketplaceSettingsForm form={marketplaceSettings} setForm={setMarketplaceSettings} onSubmit={saveMarketplaceSettings} onModeChange={saveGlobalBookingMode} />}
            {!loading && activeTab === 'register-business' && <AdminProviderForm form={providerForm} setForm={setProviderForm} onSubmit={createProvider} saving={savingService} />}
            {!loading && activeTab === 'users' && (
              <UserGroups
                users={users}
                selectedUserIds={selectedUserIds}
                setSelectedUserIds={setSelectedUserIds}
                onDeleteSelected={deleteSelectedUsers}
                onDeleteOne={deleteOneUser}
              />
            )}
            {!loading && activeTab === 'services' && <ServiceTable services={services} onModeChange={updateServiceBookingMode} globalBookingMode={marketplaceSettings.bookingMode || 'manual'} updatingModeId={updatingModeId} modeErrors={modeErrors} />}
            {!loading && activeTab === 'bookings' && <BookingTable bookings={bookings} onView={setSelectedBooking} />}
            {!loading && activeTab === 'rebook-requests' && <AdminRebookRequests />}
            {!loading && activeTab === 'verification' && <BookingVerification token={token} verify={adminApi.verifyBooking} />}
            {!loading && activeTab === 'revenue' && <RevenueList revenueByType={revenueByType} transactions={transactions} summary={transactionSummary} onCollect={markCommissionCollected} />}
            {!loading && activeTab === 'analytics' && <AnalyticsDashboard token={token} />}
            {!loading && activeTab === 'storage' && <StorageOverview data={storageOverview} loading={storageLoading} error={storageError} onRefresh={loadStorageOverview} />}
            {!loading && activeTab === 'activity' && <ActivityFeed bookings={bookings} services={services} businesses={businesses} />}
          </section>
        </div>
      </main>
      {selectedBusiness && <BusinessDetailModal business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />}
      {selectedBooking && <AdminBookingDetailModal booking={selectedBooking} defaultCommission={marketplaceSettings.defaultCommissionPercentage} onApprove={approveBooking} onReject={rejectBooking} onClose={() => setSelectedBooking(null)} />}
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

function ServiceTable({ services, onModeChange, globalBookingMode, updatingModeId, modeErrors }) {
  return <SimpleTable rows={services} columns={['Business Item', 'Type', 'Availability', 'Booking mode', 'Status']} map={(service) => [
    service.title || service.name,
    service.serviceType || service.category,
    service.availabilityText || (service.availableQuantity ?? 0),
    <div key={`${service._id}-mode`} className="grid gap-1">
      <select disabled={String(updatingModeId) === String(service._id || service.id)} value={service.bookingMode || 'manual'} onChange={(event) => onModeChange(service, event.target.value)} className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-bold text-blue-950 disabled:opacity-60">
        <option value="manual">Manual</option>
        <option value="automatic">Automatic</option>
      </select>
      <span className="text-[10px] font-semibold text-slate-500">{String(updatingModeId) === String(service._id || service.id) ? 'Saving mode…' : globalBookingMode === 'service-level' ? 'Effective for this service' : `Global override: ${globalBookingMode}`}</span>
      {modeErrors[service._id || service.id] && <span className="max-w-56 text-[10px] font-semibold leading-4 text-red-600">{modeErrors[service._id || service.id]}</span>}
    </div>,
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
          <SimpleTable rows={grouped[group] || []} columns={['Select', 'Name', 'Email', 'Provider ID', 'Role', 'Business', 'Actions']} map={(user) => [
            <input
              type="checkbox"
              checked={selectedSet.has(user._id || user.id)}
              onChange={() => toggleUser(user._id || user.id)}
              aria-label={`Select ${user.name}`}
            />,
            user.name,
            user.email,
            user.sellerId || '-',
            ['hotel', 'supplier'].includes(user.role) ? 'Provider' : user.role,
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

function BookingTable({ bookings, onView }) {
  return <SimpleTable rows={bookings} columns={['Booking ID', 'Code', 'Customer', 'Service', 'Business', 'Status', 'Payment', 'Completed', 'Actions']} map={(booking) => [
    booking._id,
    booking.bookingCode || booking._id?.slice(-8),
    booking.userId?.name || booking.touristId?.name || booking.userId?.email || booking.touristId?.email || 'Customer',
    booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace,
    booking.businessId?.businessName || booking.businessId?.name || booking.hotelId?.name || booking.preferredHotelId?.name || '-',
    booking.status,
    booking.paymentStatus || 'unpaid',
    booking.completedAt ? new Date(booking.completedAt).toLocaleString() : '-',
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onView(booking)} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">View</button>
    </div>,
  ]} />;
}

function RevenueList({ revenueByType, transactions, summary, onCollect }) {
  const entries = Object.entries(revenueByType);
  if (entries.length === 0 && transactions.length === 0) return <p className="p-4 text-gray-600">No revenue yet.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900">Total received</p>
        <p className="text-primary font-bold">{Number(summary?.totalReceived || 0).toLocaleString()} RWF</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-semibold text-gray-900">Commission earned</p>
        <p className="text-primary font-bold">{Number(summary?.commissionEarned || 0).toLocaleString()} RWF</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold text-amber-950">Commission still due from sellers</p>
        <p className="font-bold text-amber-800">{Number(summary?.commissionDue || 0).toLocaleString()} RWF</p>
      </div>
      {entries.map(([type, total]) => (
        <div key={type} className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">{type}</p>
          <p className="text-primary font-bold">{Number(total || 0).toLocaleString()} RWF</p>
        </div>
      ))}
      <div className="md:col-span-2">
        <SimpleTable rows={transactions} columns={['Transaction', 'Booking', 'User', 'Seller', 'Seller account', 'Payment', 'Deposit', 'Commission', 'Collection']} map={(tx) => [
          tx.transactionId,
          tx.bookingId?.bookingCode || tx.bookingId?._id || '-',
          tx.userId?.name || tx.userId?.email || '-',
          tx.businessId?.name || tx.sellerId?.name || tx.sellerId?.email || '-',
          tx.businessId?.payoutDetails?.accountNumber || '-',
          tx.paymentMethod,
          `${Number(tx.amount || 0).toLocaleString()} RWF`,
          `${Number(tx.commissionAmount || 0).toLocaleString()} RWF`,
          tx.commissionStatus === 'collected'
            ? 'Collected'
            : <button type="button" onClick={() => onCollect(tx)} className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Mark collected</button>,
        ]} />
      </div>
    </div>
  );
}

function StorageOverview({ data, loading, error, onRefresh }) {
  if (loading && !data) return <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading storage information…</div>;
  if (error && !data) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5"><p className="font-bold text-red-800">{error}</p><button type="button" onClick={onRefresh} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white">Try again</button></div>;

  const mongodb = data?.mongodb || {};
  const cloudinary = data?.cloudinary || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Admin only</p><h2 className="mt-1 text-2xl font-black text-slate-950">Storage Overview</h2><p className="mt-1 text-sm text-slate-500">Read-only MongoDB and Cloudinary usage. No files can be deleted here.</p></div>
        <button type="button" disabled={loading} onClick={onRefresh} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-primary disabled:opacity-60">{loading ? 'Refreshing…' : 'Refresh storage'}</button>
      </div>

      {mongodb.message && <StorageNotice message={mongodb.message} />}
      <StorageSection title="MongoDB Storage" subtitle={mongodb.databaseName ? `Database: ${mongodb.databaseName}` : 'Database usage'} usage={mongodb.usagePercent}>
        <StorageMetric label="Used" value={formatMongoStorage(mongodb.storageUsedBytes, mongodb.storageUsedMB)} />
        <StorageMetric label="Limit" value={`${formatStorageNumber(mongodb.storageLimitMB)} MB`} />
        <StorageMetric label="Remaining" value={`${formatStorageNumber(mongodb.remainingStorageMB)} MB`} />
        <StorageMetric label="Documents" value={Number(mongodb.totalDocuments || 0).toLocaleString()} />
      </StorageSection>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">MongoDB Collections</h3><p className="text-sm text-slate-500">{mongodb.numberOfCollections ?? mongodb.collections?.length ?? 0} collections</p></div></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Collection name</th><th className="px-3 py-3 text-right">Documents</th></tr></thead><tbody>{(mongodb.collections || []).map((collection) => <tr key={collection.name} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold text-slate-800">{collection.name}</td><td className="px-3 py-3 text-right font-bold text-slate-700">{Number(collection.documents || 0).toLocaleString()}</td></tr>)}</tbody></table>{!mongodb.collections?.length && <p className="py-6 text-center text-sm text-slate-500">No collection information available.</p>}</div>
      </div>

      {!cloudinary.configured && cloudinary.message && <StorageNotice message={cloudinary.message} />}
      <StorageSection title="Cloudinary Storage" subtitle={cloudinary.configured ? 'Media storage usage' : 'Using configured fallback limits'} usage={cloudinary.usagePercent}>
        <StorageMetric label="Used" value={`${formatStorageNumber(cloudinary.storageUsedGB)} GB`} />
        <StorageMetric label="Limit" value={`${formatStorageNumber(cloudinary.storageLimitGB)} GB`} />
        <StorageMetric label="Remaining" value={`${formatStorageNumber(cloudinary.remainingStorageGB)} GB`} />
        <StorageMetric label="Usage" value={`${formatStorageNumber(cloudinary.usagePercent)}%`} />
      </StorageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-950">Cloudinary Files</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><StorageMetric label="Total files" value={Number(cloudinary.totalFiles || 0).toLocaleString()} /><StorageMetric label="Images" value={Number(cloudinary.images || 0).toLocaleString()} /><StorageMetric label="PDFs" value={Number(cloudinary.pdfs || 0).toLocaleString()} /></div></div>
        <StorageSection title="Cloudinary Bandwidth" subtitle="Current usage" usage={cloudinary.bandwidthUsagePercent} compact>
          <StorageMetric label="Used" value={`${formatStorageNumber(cloudinary.bandwidthUsedGB)} GB`} />
          <StorageMetric label="Limit" value={`${formatStorageNumber(cloudinary.bandwidthLimitGB)} GB`} />
          <StorageMetric label="Remaining" value={`${formatStorageNumber(cloudinary.remainingBandwidthGB)} GB`} />
        </StorageSection>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ token }) {
  const [range, setRange] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    if (!token || (range === 'custom' && (!startDate || !endDate))) return undefined;
    let active = true;
    const query = range === 'custom'
      ? '?range=custom&startDate=' + encodeURIComponent(startDate) + '&endDate=' + encodeURIComponent(endDate)
      : '?range=' + encodeURIComponent(range);
    Promise.resolve().then(() => {
      if (!active) return null;
      setLoading(true);
      setAnalyticsError('');
      return Promise.all([
        adminApi.getAnalyticsOverview(token, query),
        adminApi.getAnalyticsServices(token, query),
        adminApi.getAnalyticsPayments(token, query),
      ]);
    }).then((responses) => {
      if (!responses) return;
      const [overview, services, payments] = responses;
      if (active) setData({ overview, services: services.services || [], payments });
    }).catch((requestError) => {
      if (active) setAnalyticsError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token, range, startDate, endDate]);

  const summary = data?.overview?.summary || {};
  const trends = data?.overview?.trends || [];
  const funnel = data?.overview?.funnel || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Admin only</p><h2 className="mt-1 text-2xl font-black text-slate-950">Analytics Dashboard</h2><p className="mt-1 text-sm text-slate-500">Visits, service interest, booking actions, and deposit conversion.</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-bold text-slate-600">Date filter<select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option></select></label>
          {range === 'custom' && <><label className="grid gap-1 text-xs font-bold text-slate-600">From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" /></label><label className="grid gap-1 text-xs font-bold text-slate-600">To<input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" /></label></>}
        </div>
      </div>

      {analyticsError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{analyticsError}</p>}
      {loading && !data ? <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading analytics…</div> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AnalyticsMetric label="Total visits" value={summary.totalVisits} />
          <AnalyticsMetric label="Unique visitors" value={summary.uniqueVisitors} />
          <AnalyticsMetric label="Service views" value={summary.serviceViews} />
          <AnalyticsMetric label="Booking forms opened" value={summary.bookingFormsOpened} />
          <AnalyticsMetric label="Bookings submitted" value={summary.bookingsSubmitted} />
          <AnalyticsMetric label="Pay deposit clicks" value={summary.payDepositClicks} />
          <AnalyticsMetric label="Successful payments" value={summary.successfulPayments} success />
          <AnalyticsMetric label="Failed payments" value={summary.failedPayments} danger />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsMiniChart title="Visits per day" data={trends} dataKey="visits" color="bg-blue-600" />
          <AnalyticsMiniChart title="Service views per day" data={trends} dataKey="serviceViews" color="bg-cyan-500" />
          <AnalyticsMiniChart title="Pay deposit clicks per day" data={trends} dataKey="payClicks" color="bg-amber-500" />
          <AnalyticsMiniChart title="Successful payments per day" data={trends} dataKey="paymentSuccess" color="bg-emerald-500" />
        </div>

        <AnalyticsFunnel funnel={funnel} />

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black text-slate-950">Most viewed services</h3><p className="text-sm text-slate-500">Top services and their booking conversion actions.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Payment conversion {formatAnalyticsPercent(data?.payments?.conversionPercent)}%</span></div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Service</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Seller</th><th className="px-3 py-3 text-right">Views</th><th className="px-3 py-3 text-right">Form opened</th><th className="px-3 py-3 text-right">Submitted</th><th className="px-3 py-3 text-right">Pay clicked</th><th className="px-3 py-3 text-right">Paid</th></tr></thead>
              <tbody>{(data?.services || []).map((service) => <tr key={service.serviceId} className="border-b border-slate-100"><td className="px-3 py-3 font-bold text-slate-900">{service.serviceName}</td><td className="px-3 py-3 capitalize text-slate-600">{String(service.category || '').replace(/-/g, ' ')}</td><td className="px-3 py-3 text-slate-600">{service.seller}</td><AnalyticsNumber value={service.views} /><AnalyticsNumber value={service.bookingFormOpened} /><AnalyticsNumber value={service.bookingSubmitted} /><AnalyticsNumber value={service.payDepositClicked} /><AnalyticsNumber value={service.paymentSuccess} /></tr>)}</tbody>
            </table>
            {!data?.services?.length && <p className="py-8 text-center text-sm text-slate-500">No service activity in this date range yet.</p>}
          </div>
        </div>
      </>}
    </div>
  );
}

function AnalyticsMetric({ label, value, success = false, danger = false }) {
  const color = success ? 'text-emerald-600' : danger ? 'text-red-600' : 'text-blue-950';
  return <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={'mt-2 text-2xl font-black ' + color}>{Number(value || 0).toLocaleString()}</p></div>;
}

function AnalyticsMiniChart({ title, data, dataKey, color }) {
  const maximum = Math.max(1, ...data.map((item) => Number(item[dataKey] || 0)));
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-950">{title}</h3><div className="mt-5 flex h-40 items-end gap-2">{data.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-bold text-slate-500">{item[dataKey] || 0}</span><div title={item.date + ': ' + (item[dataKey] || 0)} className={'w-full min-w-2 rounded-t-md ' + color} style={{ height: Math.max(3, (Number(item[dataKey] || 0) / maximum) * 110) }} /><span className="max-w-full truncate text-[9px] text-slate-400">{item.date?.slice(5)}</span></div>)}</div>{!data.length && <p className="mt-5 text-sm text-slate-500">No daily activity yet.</p>}</div>;
}

function AnalyticsFunnel({ funnel }) {
  const steps = [
    ['Service view', funnel.serviceViews],
    ['Booking form opened', funnel.bookingFormsOpened],
    ['Booking submitted', funnel.bookingsSubmitted],
    ['Pay deposit clicked', funnel.payDepositClicks],
    ['Payment success', funnel.successfulPayments],
  ];
  const maximum = Math.max(1, Number(steps[0][1] || 0));
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-950">Payment funnel</h3><p className="mt-1 text-sm text-slate-500">Where customers stop before completing the deposit.</p><div className="mt-5 space-y-3">{steps.map(([label, value], index) => { const width = Math.max(4, (Number(value || 0) / maximum) * 100); const previous = index ? Number(steps[index - 1][1] || 0) : 0; const conversion = previous ? (Number(value || 0) / previous) * 100 : index === 0 ? 100 : 0; return <div key={label} className="grid gap-2 sm:grid-cols-[170px_1fr_110px] sm:items-center"><span className="text-sm font-bold text-slate-700">{label}</span><div className="h-9 overflow-hidden rounded-lg bg-slate-100"><div className="flex h-full items-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-400 px-3 text-xs font-black text-white" style={{ width: width + '%' }}>{Number(value || 0).toLocaleString()}</div></div><span className="text-right text-xs font-bold text-slate-500">{index === 0 ? 'Starting point' : formatAnalyticsPercent(conversion) + '% retained'}</span></div>; })}</div></div>;
}

function AnalyticsNumber({ value }) {
  return <td className="px-3 py-3 text-right font-bold text-slate-700">{Number(value || 0).toLocaleString()}</td>;
}

function formatAnalyticsPercent(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function StorageSection({ title, subtitle, usage, children, compact = false }) {
  const tone = storageTone(usage);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{title}</h3><p className="text-sm text-slate-500">{subtitle}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}>{tone.label}</span></div><div className={`mt-4 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>{children}</div><div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>Usage</span><span>{formatStoragePercent(usage)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.min(100, Math.max(0, Number(usage || 0)))}%` }} /></div></div></section>;
}

function StorageMetric({ label, value }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black text-slate-900">{value}</p></div>;
}

function StorageNotice({ message }) {
  return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p>;
}

function storageTone(usage) {
  const value = Number(usage || 0);
  if (value >= 90) return { label: 'Danger', badge: 'bg-red-100 text-red-700', bar: 'bg-red-600' };
  if (value >= 70) return { label: 'Warning', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' };
  return { label: 'Normal', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
}

function formatStorageNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatMongoStorage(bytes, megabytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${formatStorageNumber(value / (1024 * 1024))} MB`;
  if (value >= 1024) return `${formatStorageNumber(value / 1024)} KB`;
  if (value > 0) return `${Math.round(value)} bytes`;
  const fallbackMB = Number(megabytes || 0);
  return fallbackMB > 0 ? `${formatStorageNumber(fallbackMB * 1024)} KB` : '0 bytes';
}

function formatStoragePercent(value) {
  const usage = Number(value || 0);
  if (usage > 0 && usage < 0.01) return '<0.01%';
  return `${formatStorageNumber(usage)}%`;
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
  const items = Array.isArray(form.items) ? form.items : [];
  const updateItem = (index, key, value) => setForm((previous) => ({
    ...previous,
    items: previous.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
  const addItem = () => {
    if (items.length >= 5) return;
    set('items', [...items, { text: '', linkUrl: '', linkLabel: '' }]);
  };

  const removeItem = (index) => set('items', items.filter((_, itemIndex) => itemIndex !== index));
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="rounded-xl border border-yellow-300 bg-[#ffc928] p-4 text-center text-sm text-slate-950">
        <span className="inline-flex items-center justify-center gap-2">
          <span className="text-sky-600" aria-hidden="true">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
            </svg>
          </span>
          <span>{items[0]?.text || 'Your announcement text will appear here.'} {items[0]?.linkUrl && <strong>{items[0]?.linkLabel || 'Learn more'}</strong>}</span>
        </span>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input type="checkbox" checked={form.enabled} onChange={(event) => set('enabled', event.target.checked)} />
        Show announcement bar on every page
      </label>
      <div className="grid gap-2 md:max-w-xs">
        <label className="text-sm font-semibold text-gray-700">Seconds before showing the next announcement</label>
        <input type="number" min="1" max="3600" value={form.intervalSeconds || 5} onChange={(event) => set('intervalSeconds', Number(event.target.value) || 1)} className="rounded-xl border border-gray-300 px-4 py-3" />
      </div>
      <div className="grid gap-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold text-gray-900">Announcement {index + 1}</h3>
              {items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="text-sm font-semibold text-red-600">Remove</button>}
            </div>
            <div className="grid gap-4">
              <AdminTextArea label="Message" value={item.text} onChange={(value) => updateItem(index, 'text', value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <AdminInput label="Optional Link URL" value={item.linkUrl} onChange={(value) => updateItem(index, 'linkUrl', value)} />
                <AdminInput label="Link Text" value={item.linkLabel} onChange={(value) => updateItem(index, 'linkLabel', value)} />
              </div>
            </div>
          </div>
        ))}
        {items.length < 5 && <button type="button" onClick={addItem} className="rounded-xl border border-primary px-5 py-3 font-semibold text-primary md:w-fit">Add announcement ({items.length}/5)</button>}
      </div>
      <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white md:w-fit">
        Update Announcement
      </button>
    </form>
  );
}

function MarketplaceSettingsForm({ form, setForm, onSubmit, onModeChange }) {
  const rulesText = (form.bookingRules || []).join('\n');
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Manual remains the safe default. Automatic booking creates the exact quote and allows the customer to pay the 30% deposit immediately when all option rules are complete.
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Global booking mode</span>
        <select value={form.bookingMode || 'manual'} onChange={(event) => onModeChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
          <option value="manual">All services use manual booking</option>
          <option value="automatic">All services use automatic booking</option>
          <option value="service-level">Use service-level booking mode</option>
        </select>
      </label>
      <AdminInput label="Default commission percentage" type="number" value={form.defaultCommissionPercentage} onChange={(value) => setForm((prev) => ({ ...prev, defaultCommissionPercentage: Number(value) }))} required />
      <label className="block md:col-span-2">
        <span className="text-sm font-semibold text-gray-700">Global booking rules — one rule per line</span>
        <textarea value={rulesText} onChange={(event) => setForm((prev) => ({ ...prev, bookingRules: event.target.value.split('\n') }))} rows={7} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" />
      </label>
      <p className="text-xs font-semibold text-blue-700">Global booking mode saves immediately when selected.</p>
      <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white md:w-fit">Save commission and booking rules</button>
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
        'Amount paid': `${Number(booking.amountPaid || 0).toLocaleString()} RWF`,
        'Remaining paid to seller': `${Number(booking.remainingAmount || 0).toLocaleString()} RWF`,
        'Completed at': booking.completedAt ? new Date(booking.completedAt).toLocaleString() : '-',
        'Completed by seller': booking.completedBySeller?.name || booking.completedBySeller?.email || '-',
        'Booking code used': booking.bookingCodeUsed ? 'Yes' : 'No',
        'Payment purpose': booking.paymentReason || '-',
      }} />
      {token && <img src={bookingApi.getQrImageUrl(token)} alt="Booking QR code" className="mt-4 h-40 w-40 rounded-xl border border-gray-200 p-2" />}
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
        Commission: `${business.commissionPercentage ?? 10}%`,
        'Payout method': business.payoutDetails?.method || '-',
        'Payout account': business.payoutDetails?.accountNumber || '-',
        Inventory: business.quantityRemaining ?? business.availableQuantity ?? '-',
      }} />
      {Array.isArray(business.images) && business.images.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3">{business.images.slice(0, 3).map((image) => <img key={image} src={image} alt={business.name} className="h-28 w-full rounded-xl object-cover" />)}</div>}
      <ResponseBlock title="Availability Table" responses={business.availabilityTable?.rows?.map((row) => row.cells) || []} />
      <ResponseBlock title="Booking Form Fields" responses={business.bookingForm?.fields || []} />
    </Modal>
  );
}

function AdminBookingDetailModal({ booking, defaultCommission, onApprove, onReject, onClose }) {
  const [decision, setDecision] = useState({ totalPrice: booking.totalPrice || booking.bookingDetails?.listedPriceRwf || '', commissionPercentage: booking.commissionPercentage || defaultCommission || 10, paymentReason: booking.paymentReason || '' });
  const [reason, setReason] = useState('');
  const canDecide = ['pending', 'reviewing'].includes(booking.status);
  return (
    <Modal title="Review Booking Request" onClose={onClose}>
      <InlineBookingDetails booking={booking} />
      {canDecide && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-bold text-blue-950">Admin decision</h3>
          <p className="mt-1 text-sm text-blue-800">Enter the exact agreed price. The customer will pay 30% now; provider details unlock after confirmation.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AdminInput label="Exact service price (RWF)" type="number" value={decision.totalPrice} onChange={(value) => setDecision((prev) => ({ ...prev, totalPrice: value }))} required />
            <AdminInput label="Commission percentage" type="number" value={decision.commissionPercentage} onChange={(value) => setDecision((prev) => ({ ...prev, commissionPercentage: value }))} required />
          </div>
          <div className="mt-4">
            <AdminTextArea label="Reason or purpose for customer payment" value={decision.paymentReason} onChange={(value) => setDecision((prev) => ({ ...prev, paymentReason: value }))} required maxLength={500} />
            <p className="mt-1 text-xs text-blue-800">The customer, seller, admin, and booking PDF will all see this reason.</p>
          </div>
          {decision.totalPrice && <p className="mt-3 text-sm font-semibold text-blue-950">Customer deposit: {Math.round(Number(decision.totalPrice || 0) * 0.3).toLocaleString()} RWF</p>}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={!Number(decision.totalPrice) || Number(decision.commissionPercentage) < 0 || !decision.paymentReason.trim()} onClick={() => onApprove(booking, decision)} className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Approve and send quote</button>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3" />
            <button type="button" onClick={() => onReject(booking, reason)} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Reject</button>
          </div>
        </div>
      )}
    </Modal>
  );
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

function AdminProviderForm({ form, setForm, onSubmit, saving }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <AdminInput label="Provider Name" value={form.providerName} onChange={(value) => set('providerName', value)} required />
      <AdminInput label="Provider Email" type="email" value={form.providerEmail} onChange={(value) => set('providerEmail', value)} required />
      <button disabled={saving} className="md:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving...' : 'Generate Provider Credentials'}
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

function AdminTextArea({ label, value, onChange, required = false, maxLength }) {
  return <label className="block md:col-span-2"><span className="text-sm font-semibold text-gray-700">{label}</span><textarea required={required} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
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
