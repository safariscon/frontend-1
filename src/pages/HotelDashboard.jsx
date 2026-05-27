import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, isSellerRole } from '../lib/dashboard';
import { getAuthData, hotelApi } from '../lib/api';
import { REALTIME_EVENTS, joinRealtimeChannel, subscribeToRealtime } from '../lib/realtime';
import { formatRwf } from '../lib/currency';

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'hotels-and-resorts',
  price: '',
  status: 'available',
  customAvailability: '',
  remainingQuantity: '',
  existingImages: [],
  imageFiles: [],
};

const SERVICE_CATEGORIES = [
  ['Accommodation Services', [['hotels-and-resorts', 'Hotels & Resorts'], ['homestays-and-guesthouses', 'Homestays & Guesthouses'], ['tent-rentals-and-camping-sites', 'Tent Rentals & Camping Sites'], ['vacation-rentals-and-apartments', 'Vacation Rentals & Apartments']]],
  ['Transport & Mobility Services', [['car-rentals', 'Car Rentals'], ['motorbike-and-scooter-rentals', 'Motorbike & Scooter Rentals'], ['taxi-and-ride-services', 'Taxi & Ride Services'], ['bus-and-minivan-charters', 'Bus & Minivan Charters']]],
  ['Food & Beverage Services', [['restaurants', 'Restaurants'], ['bars-and-pubs', 'Bars & Pubs'], ['coffee-shops-and-cafes', 'Coffee Shops & Cafes'], ['food-trucks-and-street-food-stalls', 'Food Trucks & Street Food']]],
  ['Events & Venue Services', [['conference-event-halls-mice', 'Conference & Event Halls'], ['wedding-venues', 'Wedding Venues']]],
  ['Travel & Experience Services', [['tour-and-activity-operators', 'Tours & Activities'], ['entertainment-venues', 'Entertainment Venues'], ['gear-rentals', 'Gear Rentals']]],
  ['Shopping & Local Market Services', [['souvenir-shops-and-craft-markets', 'Souvenir Shops & Craft Markets']]],
  ['Wellness & Personal Care Services', [['spas-and-wellness-centers', 'Spas & Wellness Centers']]],
  ['Personal Support Services', [['childcare-services', 'Childcare Services']]],
];

export default function HotelDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const token = getAuthData()?.token;

  const loadData = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [overviewResp, servicesResp, bookingsResp] = await Promise.all([
        hotelApi.getOverview(token),
        hotelApi.getMyServices(token),
        hotelApi.getMyBookings(token),
      ]);
      setOverview(overviewResp);
      setServices(servicesResp.services || []);
      setBookings(bookingsResp.bookings || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isSellerRole(user.role)) {
      navigate(getDashboardRoute(user));
      return;
    }
    Promise.resolve().then(() => loadData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (!token || !user || !isSellerRole(user.role)) return undefined;
    joinRealtimeChannel('business', user.businessId || user.hotelId);
    joinRealtimeChannel('user', user.id || user._id);
    return subscribeToRealtime(
      [REALTIME_EVENTS.SERVICE_CHANGED, REALTIME_EVENTS.BOOKING_CHANGED, 'newBooking', 'serviceUpdated', 'bookingStatusChanged'],
      () => loadData({ silent: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const stats = useMemo(() => {
    const activeServices = services.filter((service) => service.status === 'available' && service.isActive !== false);
    const completedBookings = bookings.filter((booking) => booking.status === 'completed');
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled');
    const revenue = bookings
      .filter((booking) => ['confirmed', 'active', 'completed'].includes(booking.status))
      .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      totalBookings: bookings.length,
      activeBookings: bookings.filter((booking) => ['pending', 'confirmed', 'active'].includes(booking.status)).length,
      completedBookings: completedBookings.length,
      cancellationRate: bookings.length ? Math.round((cancelledBookings.length / bookings.length) * 100) : 0,
      revenue,
      availableQuantity: services.length,
    };
  }, [services, bookings]);

  const startEdit = (service) => {
    setEditingService(service);
    setForm({
      title: service.title || service.name || '',
      description: service.description || '',
      category: service.category || service.serviceType || 'hotels-and-resorts',
      price: service.priceText || '',
      status: service.status === 'unavailable' ? 'unavailable' : service.availabilityText ? 'custom' : 'available',
      customAvailability: service.availabilityText || '',
      remainingQuantity: service.availabilityText || '',
      existingImages: Array.isArray(service.images) ? service.images.filter(Boolean).slice(0, 3) : [],
      imageFiles: [],
    });
    setActiveTab('edit');
  };

  const resetForm = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setInfo('');
    let uploadedImageUrls = [];
    try {
      if (form.imageFiles?.length) {
        const uploadResponse = await hotelApi.uploadServiceImages(token, form.imageFiles);
        uploadedImageUrls = uploadResponse.urls || [];
      }
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
      return;
    }

    const normalizedStatus = form.status === 'unavailable' ? 'unavailable' : 'available';
    const availabilityText = form.status === 'custom' ? form.customAvailability : form.remainingQuantity;
    const quantityMatch = String(form.remainingQuantity || form.customAvailability || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
    const payload = {
      title: form.title,
      description: form.description,
      serviceType: 'rental',
      category: form.category,
      pricing: { amount: 0, unit: 'service', currency: 'RWF' },
      priceText: form.price,
      availableQuantity: quantityMatch ? Number(quantityMatch[0]) : normalizedStatus === 'available' ? 1 : 0,
      availabilityText,
      status: normalizedStatus,
      images: (uploadedImageUrls.length ? uploadedImageUrls : form.existingImages || []).slice(0, 3),
      isActive: true,
    };
    try {
      const response = editingService
        ? await hotelApi.updateService(token, editingService._id, payload)
        : await hotelApi.createService(token, payload);
      setInfo(response.message);
      resetForm();
      setActiveTab('services');
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (service, status) => {
    startEdit(service);
    const payload = {
      title: service.title || service.name,
      description: service.description,
      serviceType: service.serviceType || 'rental',
      category: service.category,
      pricing: service.pricing,
      priceText: service.priceText || '',
      availableQuantity: status === 'available' ? 1 : 0,
      availabilityText: service.availabilityText || '',
      status,
      images: service.images || [],
      isActive: true,
    };
    try {
      const response = await hotelApi.updateService(token, service._id, payload);
      setInfo(response.message);
      resetForm();
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this business item?')) return;
    try {
      const response = await hotelApi.deleteService(token, serviceId);
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await hotelApi.updateBookingStatus(token, bookingId, { status });
      setInfo(response.message);
      await loadData({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user || !isSellerRole(user.role)) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
              <p className="text-gray-600">Manage {overview?.business?.businessName || overview?.business?.name || 'your business'} listings and bookings.</p>
            </div>
            <button onClick={() => { resetForm(); setActiveTab('edit'); }} className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Add Business</button>
          </div>

          {(error || info) && <div className="mb-4 space-y-2">{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</p>}</div>}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Metric label="Businesses" value={stats.totalServices} />
            <Metric label="Active" value={stats.activeServices} />
            <Metric label="Bookings" value={stats.totalBookings} />
            <Metric label="Revenue" value={formatRwf(stats.revenue)} />
            <Metric label="Listings" value={stats.availableQuantity} />
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto">
            {['services', 'bookings', 'analytics', 'edit'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                {tab === 'services' ? 'Businesses' : tab === 'edit' ? (editingService ? 'Edit Business' : 'Add Business') : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm p-4">
            {loading ? <p className="p-4 text-gray-600">Loading dashboard...</p> : null}
            {!loading && activeTab === 'services' && <ServiceGrid services={services} onEdit={startEdit} onDelete={deleteService} onStatus={updateStatus} />}
            {!loading && activeTab === 'bookings' && <BookingList bookings={bookings} onStatus={updateBookingStatus} />}
            {!loading && activeTab === 'analytics' && <Analytics stats={stats} services={services} />}
            {activeTab === 'edit' && <ServiceForm form={form} setForm={setForm} onSubmit={saveService} saving={saving} editing={Boolean(editingService)} />}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-primary">{value}</p></div>;
}

function ServiceGrid({ services, onEdit, onDelete, onStatus }) {
  if (!services.length) return <p className="p-4 text-gray-600">No businesses yet. Add your first business listing.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <div key={service._id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">{service.title || service.name}</h3>
              <p className="text-sm text-gray-600">{service.serviceType || service.category}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{service.availabilityText || formatStatus(service.status)}</span>
          </div>
          <p className="mt-3 text-sm text-gray-600">{service.description || 'No description.'}</p>
          <p className="mt-3 font-semibold text-primary">{service.priceText || 'Price on request'}</p>
          {Array.isArray(service.images) && service.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {service.images.slice(0, 3).map((image) => (
                <img key={image} src={image} alt={service.title || service.name} className="h-20 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => onEdit(service)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Edit</button>
            <button onClick={() => onStatus(service, service.status === 'available' ? 'unavailable' : 'available')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">{service.status === 'available' ? 'Set Not Available' : 'Set Available'}</button>
            <button onClick={() => onDelete(service._id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingList({ bookings, onStatus }) {
  if (!bookings.length) return <p className="p-4 text-gray-600">No bookings yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200"><th className="py-3 px-2 text-left">Code</th><th className="py-3 px-2 text-left">Customer</th><th className="py-3 px-2 text-left">Service</th><th className="py-3 px-2 text-left">Quantity</th><th className="py-3 px-2 text-left">Status</th><th className="py-3 px-2 text-right">Actions</th></tr></thead>
        <tbody>{bookings.map((booking) => <tr key={booking._id} className="border-b border-gray-100"><td className="py-3 px-2">{booking.bookingCode}</td><td className="py-3 px-2">{booking.userId?.name || booking.touristId?.name || 'Customer'}</td><td className="py-3 px-2">{booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace}</td><td className="py-3 px-2">{booking.quantity || 1}</td><td className="py-3 px-2">{booking.status}</td><td className="py-3 px-2 text-right space-x-2">{['confirmed', 'active', 'completed', 'cancelled'].map((status) => <button key={status} onClick={() => onStatus(booking._id, status)} className="text-primary hover:underline">{status}</button>)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Analytics({ stats, services }) {
  const low = services.filter((service) => Number(service.availableQuantity || 0) <= 2);
  return <div className="grid gap-4 md:grid-cols-2"><Metric label="Active Bookings" value={stats.activeBookings} /><Metric label="Completed" value={stats.completedBookings} /><Metric label="Cancellation Rate" value={`${stats.cancellationRate}%`} /><Metric label="Low Availability" value={low.length} /></div>;
}

function ServiceForm({ form, setForm, onSubmit, saving, editing }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Input label="Business Name" value={form.title} onChange={(value) => set('title', value)} required />
      <CategorySelect value={form.category} onChange={(value) => set('category', value)} />
      <Input label="Price" value={form.price} onChange={(value) => set('price', value)} placeholder="Example: 100 per hour" required />
      <Select label="Availability" value={form.status} onChange={(value) => set('status', value)} options={[['available', 'Available'], ['unavailable', 'Not Available'], ['custom', 'Custom']]} />
      {form.status === 'custom' ? (
        <Input label="Custom Availability" value={form.customAvailability} onChange={(value) => set('customAvailability', value)} placeholder="Example: Weekends only" required />
      ) : (
        <Input label="Remaining Quantity" value={form.remainingQuantity} onChange={(value) => set('remainingQuantity', value)} placeholder="Example: 5 cars left" />
      )}
      <TextArea label="Description" value={form.description} onChange={(value) => set('description', value)} required />
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">Photos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => set('imageFiles', Array.from(event.target.files || []).slice(0, 3))}
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3"
        />
        <span className="mt-1 block text-xs text-gray-500">Maximum 3 photos.</span>
      </label>
      <button disabled={saving} className="md:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update Business' : 'Create Business'}</button>
    </form>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="block"><span className="text-sm font-semibold text-gray-700">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">{options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}</select></label>;
}

function CategorySelect({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">Category</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3">
        {SERVICE_CATEGORIES.map(([group, options]) => (
          <optgroup key={group} label={group}>
            {options.map(([categoryValue, label]) => <option key={categoryValue} value={categoryValue}>{label}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, required = false }) {
  return <label className="block md:col-span-2"><span className="text-sm font-semibold text-gray-700">{label}</span><textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3" /></label>;
}

function formatStatus(status) {
  return status === 'unavailable' ? 'Not Available' : 'Available';
}
