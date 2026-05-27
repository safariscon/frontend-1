import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { adminApi, getAuthData } from '../lib/api';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';

const EMPTY_BUSINESS_FORM = {
  ownerName: '',
  ownerEmail: '',
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
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('businesses');
  const [loading, setLoading] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [onboardingCredentials, setOnboardingCredentials] = useState(null);
  const [businessForm, setBusinessForm] = useState(EMPTY_BUSINESS_FORM);
  const token = getAuthData()?.token;

  const loadData = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError('');
    setInfo('');
    try {
      const [statsResp, businessResp, serviceResp, bookingResp, userResp] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getBusinesses(token),
        adminApi.getServices(token),
        adminApi.getBookings(token),
        adminApi.getUsers(token),
      ]);
      setStats(statsResp);
      setBusinesses(businessResp.businesses || businessResp.hotels || []);
      setServices(serviceResp.services || []);
      setBookings(bookingResp.bookings || []);
      setUsers(userResp.users || []);
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
            {['businesses', 'register-business', 'users', 'services', 'bookings', 'revenue', 'activity'].map((tab) => (
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
            {!loading && activeTab === 'businesses' && <BusinessTable businesses={businesses} onReview={reviewBusiness} />}
            {!loading && activeTab === 'register-business' && <AdminBusinessForm form={businessForm} setForm={setBusinessForm} onSubmit={registerBusiness} saving={savingService} />}
            {!loading && activeTab === 'users' && <UserGroups users={users} />}
            {!loading && activeTab === 'services' && <ServiceTable services={services} />}
            {!loading && activeTab === 'bookings' && <BookingTable bookings={bookings} />}
            {!loading && activeTab === 'revenue' && <RevenueList revenueByType={revenueByType} />}
            {!loading && activeTab === 'activity' && <ActivityFeed bookings={bookings} services={services} businesses={businesses} />}
          </section>
        </div>
      </main>
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

function BusinessTable({ businesses, onReview }) {
  return <SimpleTable rows={businesses} columns={['Business', 'Type', 'Location', 'Status', 'Actions']} map={(business) => [
    business.businessName || business.name,
    business.businessType || business.type,
    business.location,
    business.approvalStatus || business.verificationStatus || 'pending',
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onReview(business._id || business.id, 'approved')} className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Post</button>
      <button onClick={() => onReview(business._id || business.id, 'rejected')} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
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

function UserGroups({ users }) {
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
      {['Business Users', 'Admin Users', 'Other Users'].map((group) => (
        <section key={group}>
          <h2 className="mb-2 text-lg font-bold text-gray-900">{group}</h2>
          <SimpleTable rows={grouped[group] || []} columns={['Name', 'Email', 'Role', 'Business']} map={(user) => [
            user.name,
            user.email,
            user.role,
            user.businessName || user.hotelId?.businessName || user.hotelId?.name || user.hotelId || '-',
          ]} />
        </section>
      ))}
    </div>
  );
}

function BookingTable({ bookings }) {
  return <SimpleTable rows={bookings} columns={['Code', 'Customer', 'Service', 'Business', 'Status', 'Total']} map={(booking) => [
    booking.bookingCode || booking._id?.slice(-8),
    booking.userId?.name || booking.touristId?.name || booking.userId?.email || booking.touristId?.email || 'Customer',
    booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace,
    booking.businessId?.businessName || booking.businessId?.name || '-',
    booking.status,
    `$${booking.totalPrice || 0}`,
  ]} />;
}

function RevenueList({ revenueByType }) {
  const entries = Object.entries(revenueByType);
  if (entries.length === 0) return <p className="p-4 text-gray-600">No revenue yet.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([type, total]) => (
        <div key={type} className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">{type}</p>
          <p className="text-primary font-bold">${total}</p>
        </div>
      ))}
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
