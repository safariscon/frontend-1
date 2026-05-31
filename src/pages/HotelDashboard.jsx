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
  location: 'Rwanda',
  category: 'hotels-and-resorts',
  price: '',
  status: 'available',
  customAvailability: '',
  remainingQuantity: '',
  existingImages: [],
  imageFiles: [],
  availabilityTable: {
    columns: [
      { id: 'service', label: 'Service' },
      { id: 'availability', label: 'Availability' },
      { id: 'price', label: 'Price' },
    ],
    rows: [{ id: 'row_1', cells: { service: '', availability: '', price: '' } }],
  },
  bookingForm: {
    title: 'Booking Request',
    description: '',
    isPublished: true,
    fields: [
      { id: 'field_name', type: 'text', label: 'Full Name', placeholder: 'Your full name', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
      { id: 'field_phone', type: 'tel', label: 'Phone Number', placeholder: '078xxxxxxx', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
      { id: 'field_date', type: 'date', label: 'Booking Date', placeholder: '', helpText: '', defaultValue: '', required: true, enabled: true, options: [], validation: {} },
    ],
  },
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

const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const normalizeTableForForm = (table) => {
  const columns = Array.isArray(table?.columns) && table.columns.length
    ? table.columns.map((column, index) => ({
        id: column.id || `col_${index + 1}`,
        label: column.label || `Column ${index + 1}`,
      }))
    : EMPTY_FORM.availabilityTable.columns;
  const rows = Array.isArray(table?.rows) && table.rows.length
    ? table.rows.map((row, index) => ({
        id: row.id || `row_${index + 1}`,
        cells: { ...(row.cells || {}) },
      }))
    : [{ id: 'row_1', cells: {} }];

  return { columns, rows, updatedAt: table?.updatedAt || null };
};

const validateImageFiles = (files) => {
  const maxSize = 5 * 1024 * 1024;
  const accepted = files.filter((file) => file.type.startsWith('image/') && file.size <= maxSize);
  return {
    accepted: accepted.slice(0, 3),
    rejected: files.length !== accepted.length || files.length > 3,
  };
};

const FIELD_TYPES = [
  ['text', 'Short answer'],
  ['textarea', 'Long answer'],
  ['number', 'Number'],
  ['email', 'Email address'],
  ['tel', 'Phone number'],
  ['date', 'Date'],
  ['time', 'Time'],
  ['datetime-local', 'Date and time'],
  ['select', 'Dropdown menu'],
  ['radio', 'Choose one option'],
  ['checkbox', 'Choose multiple options'],
  ['file', 'Upload a file'],
  ['url', 'Website link'],
];

const FORM_TEMPLATES = [
  {
    id: 'general',
    label: 'Simple Booking',
    description: 'Good for most services.',
    fields: [
      { type: 'text', label: 'Full Name', placeholder: 'Customer name', required: true },
      { type: 'tel', label: 'Phone Number', placeholder: '078xxxxxxx', required: true },
      { type: 'date', label: 'Booking Date', placeholder: '', required: true },
      { type: 'textarea', label: 'Special Requests', placeholder: 'Anything we should know?', required: false },
    ],
  },
  {
    id: 'transport',
    label: 'Car / Transport',
    description: 'Pickup, return, passengers, and driver option.',
    fields: [
      { type: 'text', label: 'Pickup Location', placeholder: 'Where should pickup happen?', required: true },
      { type: 'text', label: 'Return Location', placeholder: 'Where should drop-off happen?', required: true },
      { type: 'date', label: 'Pickup Date', required: true },
      { type: 'time', label: 'Pickup Time', required: true },
      { type: 'number', label: 'Number of Passengers', placeholder: 'Example: 4', required: true },
      { type: 'radio', label: 'Driver Needed?', required: true, options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'hotel',
    label: 'Hotel / Rooms',
    description: 'Check-in, check-out, guests, and room preference.',
    fields: [
      { type: 'date', label: 'Check-in Date', required: true },
      { type: 'date', label: 'Check-out Date', required: true },
      { type: 'number', label: 'Number of Guests', placeholder: 'Example: 2', required: true },
      { type: 'select', label: 'Room Type', required: false, options: ['Standard', 'Deluxe', 'Suite'] },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Reservation date, time, table size, and notes.',
    fields: [
      { type: 'date', label: 'Reservation Date', required: true },
      { type: 'time', label: 'Reservation Time', required: true },
      { type: 'number', label: 'Number of Guests', required: true },
      { type: 'textarea', label: 'Food allergies or notes', required: false },
    ],
  },
];

const QUICK_QUESTIONS = [
  {
    group: 'Customer Details',
    items: [
      { label: 'Customer name', type: 'text', placeholder: 'Full name', required: true },
      { label: 'Phone number', type: 'tel', placeholder: '078xxxxxxx', required: true },
      { label: 'Email address', type: 'email', placeholder: 'name@example.com', required: false },
    ],
  },
  {
    group: 'Date, Time, and Quantity',
    items: [
      { label: 'Booking date', type: 'date', required: true },
      { label: 'Preferred time', type: 'time', required: false },
      { label: 'Start date and time', type: 'datetime-local', required: false },
      { label: 'Number of people', type: 'number', placeholder: 'Example: 2', required: true, validation: { min: 1 } },
    ],
  },
  {
    group: 'Choices',
    items: [
      { label: 'Service type', type: 'select', placeholder: 'Choose service', required: true, options: ['Standard', 'Premium', 'VIP'] },
      { label: 'Preferred contact method', type: 'radio', required: false, options: ['Phone', 'Email', 'WhatsApp'] },
      { label: 'Extra services needed', type: 'checkbox', required: false, options: ['Transport', 'Guide', 'Food', 'Photos'] },
    ],
  },
  {
    group: 'Extra Information',
    items: [
      { label: 'Special requests', type: 'textarea', placeholder: 'Write any extra details here', required: false },
      { label: 'Upload document', type: 'file', required: false, validation: { maxFileSizeMb: 5, acceptedFileTypes: 'image/*,.pdf' } },
      { label: 'Website or reference link', type: 'url', placeholder: 'https://example.com', required: false },
    ],
  },
];

const normalizeBookingFormForForm = (bookingForm) => ({
  title: bookingForm?.title || 'Booking Request',
  description: bookingForm?.description || '',
  isPublished: bookingForm?.isPublished !== false,
  fields: Array.isArray(bookingForm?.fields) && bookingForm.fields.length
    ? bookingForm.fields.map((field, index) => ({
        id: field.id || `field_${index + 1}`,
        type: field.type || 'text',
        label: field.label || `Field ${index + 1}`,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        defaultValue: field.defaultValue || '',
        required: Boolean(field.required),
        enabled: field.enabled !== false,
        options: Array.isArray(field.options) ? field.options : [],
        validation: field.validation || {},
      }))
    : EMPTY_FORM.bookingForm.fields,
});

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
      location: service.location || 'Rwanda',
      category: service.category || service.serviceType || 'hotels-and-resorts',
      price: service.priceText || '',
      status: service.status === 'unavailable' ? 'unavailable' : service.availabilityText ? 'custom' : 'available',
      customAvailability: service.availabilityText || '',
      remainingQuantity: service.availabilityText || '',
      existingImages: Array.isArray(service.images) ? service.images.filter(Boolean).slice(0, 3) : [],
      imageFiles: [],
      availabilityTable: normalizeTableForForm(service.availabilityTable),
      bookingForm: normalizeBookingFormForForm(service.bookingForm),
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
      location: form.location,
      serviceType: 'rental',
      category: form.category,
      pricing: { amount: 0, unit: 'service', currency: 'RWF' },
      priceText: form.price,
      availableQuantity: quantityMatch ? Number(quantityMatch[0]) : normalizedStatus === 'available' ? 1 : 0,
      availabilityText,
      status: normalizedStatus,
      images: [...(form.existingImages || []), ...uploadedImageUrls].slice(0, 3),
      availabilityTable: form.availabilityTable,
      bookingForm: form.bookingForm,
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
      location: service.location || 'Rwanda',
      serviceType: service.serviceType || 'rental',
      category: service.category,
      pricing: service.pricing,
      priceText: service.priceText || '',
      availableQuantity: status === 'available' ? 1 : 0,
      availabilityText: service.availabilityText || '',
      status,
      images: service.images || [],
      availabilityTable: service.availabilityTable || EMPTY_FORM.availabilityTable,
      bookingForm: service.bookingForm || EMPTY_FORM.bookingForm,
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
            <div className="flex gap-2">
              <button onClick={() => loadData()} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold">Refresh</button>
              <button onClick={() => { resetForm(); setActiveTab('edit'); }} className="px-5 py-3 rounded-xl bg-primary text-white font-semibold">Add Business</button>
            </div>
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
            {['services', 'bookings', 'verification', 'analytics', 'edit'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                {tab === 'services' ? 'Businesses' : tab === 'edit' ? (editingService ? 'Edit Business' : 'Add Business') : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-white rounded-2xl shadow-sm p-4">
            {loading ? <p className="p-4 text-gray-600">Loading dashboard...</p> : null}
            {!loading && activeTab === 'services' && <ServiceGrid services={services} onEdit={startEdit} onDelete={deleteService} onStatus={updateStatus} />}
            {!loading && activeTab === 'bookings' && <BookingList bookings={bookings} onStatus={updateBookingStatus} />}
            {!loading && activeTab === 'verification' && <SellerBookingVerification token={token} />}
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
          {service.availabilityTable?.columns?.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-gray-500">
              Availability table: {service.availabilityTable.rows?.length || 0} rows, {service.availabilityTable.columns.length} columns
            </p>
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  if (!bookings.length) return <p className="p-4 text-gray-600">No bookings yet.</p>;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200"><th className="py-3 px-2 text-left">Code</th><th className="py-3 px-2 text-left">Customer</th><th className="py-3 px-2 text-left">Service</th><th className="py-3 px-2 text-left">Quantity</th><th className="py-3 px-2 text-left">Status</th><th className="py-3 px-2 text-right">Actions</th></tr></thead>
          <tbody>{bookings.map((booking) => <tr key={booking._id} className="border-b border-gray-100"><td className="py-3 px-2">{booking.bookingCode}</td><td className="py-3 px-2">{booking.userId?.name || booking.touristId?.name || 'Customer'}</td><td className="py-3 px-2">{booking.serviceId?.title || booking.assignmentLabel || booking.destinationPlace}</td><td className="py-3 px-2">{booking.quantity || 1}</td><td className="py-3 px-2">{booking.status}</td><td className="py-3 px-2 text-right space-x-2"><button onClick={() => setSelectedBooking(booking)} className="text-primary hover:underline">View</button>{['confirmed', 'active', 'completed', 'cancelled'].map((status) => <button key={status} onClick={() => onStatus(booking._id, status)} className="text-primary hover:underline">{status}</button>)}</td></tr>)}</tbody>
        </table>
      </div>
      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </>
  );
}

function Analytics({ stats, services }) {
  const low = services.filter((service) => Number(service.availableQuantity || 0) <= 2);
  return <div className="grid gap-4 md:grid-cols-2"><Metric label="Active Bookings" value={stats.activeBookings} /><Metric label="Completed" value={stats.completedBookings} /><Metric label="Cancellation Rate" value={`${stats.cancellationRate}%`} /><Metric label="Low Availability" value={low.length} /></div>;
}

function ServiceForm({ form, setForm, onSubmit, saving, editing }) {
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateTable = (updater) => setForm((prev) => ({ ...prev, availabilityTable: updater(prev.availabilityTable) }));
  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Input label="Business Name" value={form.title} onChange={(value) => set('title', value)} required />
      <CategorySelect value={form.category} onChange={(value) => set('category', value)} />
      <Input label="Location" value={form.location} onChange={(value) => set('location', value)} placeholder="Example: Kigali, Rwanda" required />
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
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            const { accepted, rejected } = validateImageFiles(files);
            const remainingSlots = Math.max(0, 3 - form.existingImages.length);
            set('imageFiles', accepted.slice(0, remainingSlots));
            if (rejected || accepted.length > remainingSlots) {
              event.target.value = '';
              window.alert('Please choose up to 3 image files. Each image must be 5 MB or smaller.');
            }
          }}
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3"
        />
        <span className="mt-1 block text-xs text-gray-500">Upload 1, 2, or 3 image files. Maximum 5 MB each.</span>
      </label>
      {(form.existingImages.length > 0 || form.imageFiles.length > 0) && (
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          {form.existingImages.map((image) => (
            <div key={image} className="relative">
              <img src={image} alt="Business" className="h-24 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => set('existingImages', form.existingImages.filter((item) => item !== image))}
                className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          {form.imageFiles.map((file) => (
            <div key={`${file.name}-${file.size}`} className="rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-600">
              New photo: {file.name}
            </div>
          ))}
        </div>
      )}
      <AvailabilityTableBuilder table={form.availabilityTable} updateTable={updateTable} />
      <BookingFormBuilder bookingForm={form.bookingForm} setBookingForm={(bookingForm) => set('bookingForm', bookingForm)} />
      <button disabled={saving} className="md:col-span-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update Business' : 'Create Business'}</button>
    </form>
  );
}

function BookingFormBuilder({ bookingForm, setBookingForm }) {
  const update = (patch) => setBookingForm({ ...bookingForm, ...patch });
  const makeField = (question = {}) => ({
    id: makeId('field'),
    type: question.type || 'text',
    label: question.label || 'New Question',
    placeholder: question.placeholder || '',
    helpText: question.helpText || '',
    defaultValue: question.defaultValue || '',
    required: Boolean(question.required),
    enabled: true,
    options: question.options || [],
    validation: question.type === 'file'
      ? { maxFileSizeMb: 5, acceptedFileTypes: 'image/*,.pdf', ...(question.validation || {}) }
      : question.validation || {},
  });
  const updateField = (fieldId, patch) => update({
    fields: bookingForm.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field),
  });
  const addField = () => update({
    fields: [...bookingForm.fields, makeField({ label: 'New Question' })],
  });
  const addQuickQuestion = (question) => update({
    fields: [...bookingForm.fields, makeField(question)],
  });
  const deleteField = (fieldId) => update({ fields: bookingForm.fields.filter((field) => field.id !== fieldId) });
  const duplicateField = (field) => update({ fields: [...bookingForm.fields, { ...field, id: makeId('field'), label: `${field.label} Copy` }] });
  const moveField = (fieldId, direction) => {
    const index = bookingForm.fields.findIndex((field) => field.id === fieldId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= bookingForm.fields.length) return;
    const fields = [...bookingForm.fields];
    const [field] = fields.splice(index, 1);
    fields.splice(nextIndex, 0, field);
    update({ fields });
  };
  const applyTemplate = (template) => {
    const confirmed = bookingForm.fields.length <= 1 || window.confirm('Replace the current form questions with this template?');
    if (!confirmed) return;
    update({
      title: `${template.label} Request`,
      description: template.description,
      isPublished: true,
      fields: template.fields.map((fieldItem, index) => ({
        id: makeId(`field_${index + 1}`),
        type: fieldItem.type,
        label: fieldItem.label,
        placeholder: fieldItem.placeholder || '',
        helpText: '',
        defaultValue: '',
        required: Boolean(fieldItem.required),
        enabled: true,
        options: fieldItem.options || [],
        validation: {},
      })),
    });
  };

  return (
    <div className="md:col-span-2 rounded-xl border border-gray-200 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Customer Booking Questions</h3>
          <p className="text-sm text-gray-500">Choose what customers must answer before they send a booking request. Start with a template, then edit the questions.</p>
        </div>
        <button type="button" onClick={addField} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Add Field</button>
      </div>
      <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-bold">How to use this</p>
        <p className="mt-1">Pick a starter form below, change the question names, mark important questions as required, then save the business. Customers will see the preview on the right when they book.</p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {FORM_TEMPLATES.map((template) => (
          <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-primary">
            <span className="block font-bold text-gray-900">{template.label}</span>
            <span className="mt-1 block text-xs text-gray-500">{template.description}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">Add questions from the field library</p>
        <p className="mt-1 text-sm text-gray-500">Click what you need. Each question is added below and can be changed anytime.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {QUICK_QUESTIONS.map((group) => (
            <div key={group.group} className="rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-900">{group.group}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((question) => (
                  <button key={question.label} type="button" onClick={() => addQuickQuestion(question)} className="rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700 shadow-sm hover:text-primary">
                    + {question.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Input label="Form Name" value={bookingForm.title} onChange={(value) => update({ title: value })} placeholder="Example: Car Rental Request" />
          <TextArea label="Short Message Above Form" value={bookingForm.description} onChange={(value) => update({ description: value })} />
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={bookingForm.isPublished} onChange={(event) => update({ isPublished: event.target.checked })} />
            Show this form to customers
          </label>
          {bookingForm.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-gray-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">Question {index + 1}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${field.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{field.enabled ? 'Visible' : 'Hidden'}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input label="Question" value={field.label} onChange={(value) => updateField(field.id, { label: value })} />
                <Select label="Answer Type" value={field.type} onChange={(value) => updateField(field.id, { type: value })} options={FIELD_TYPES} />
                <Input label="Example Answer" value={field.placeholder} onChange={(value) => updateField(field.id, { placeholder: value })} />
                <Input label="Pre-filled Answer" value={field.defaultValue} onChange={(value) => updateField(field.id, { defaultValue: value })} />
              </div>
              <TextArea label="Small Help Note" value={field.helpText} onChange={(value) => updateField(field.id, { helpText: value })} />
              {['select', 'radio', 'checkbox'].includes(field.type) && (
                <Input label="Choices" value={(field.options || []).join(', ')} onChange={(value) => updateField(field.id, { options: value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Example: Haircut, Hair Coloring, Beard Trim" />
              )}
              {field.type === 'file' && (
                <div className="grid gap-2 md:grid-cols-2">
                  <Input label="Accepted File Types" value={field.validation?.acceptedFileTypes || ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), acceptedFileTypes: value } })} placeholder="image/*,.pdf" />
                  <Input label="Max File Size MB" type="number" value={field.validation?.maxFileSizeMb || 5} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), maxFileSizeMb: value } })} />
                </div>
              )}
              <details className="mt-3 rounded-lg bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">More settings</summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {field.type === 'number' && (
                    <>
                      <Input label="Minimum Number" type="number" value={field.validation?.min ?? ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), min: value } })} />
                      <Input label="Maximum Number" type="number" value={field.validation?.max ?? ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), max: value } })} />
                    </>
                  )}
                  {['text', 'email', 'tel', 'url'].includes(field.type) && (
                    <Input label="Validation Pattern" value={field.validation?.pattern || ''} onChange={(value) => updateField(field.id, { validation: { ...(field.validation || {}), pattern: value } })} placeholder="Optional advanced rule" />
                  )}
                </div>
              </details>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} />Customer must answer this</label>
                <label className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"><input type="checkbox" checked={field.enabled} onChange={(event) => updateField(field.id, { enabled: event.target.checked })} />Show this question</label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={index === 0} onClick={() => moveField(field.id, -1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Move earlier</button>
                <button type="button" disabled={index === bookingForm.fields.length - 1} onClick={() => moveField(field.id, 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Move later</button>
                <button type="button" onClick={() => duplicateField(field)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Copy question</button>
                <button type="button" onClick={() => deleteField(field.id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Remove question</button>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="mb-3 rounded-lg bg-white p-3 text-sm text-gray-600">
            <p className="font-bold text-gray-900">Customer Preview</p>
            <p>This is what customers will see when they click Book.</p>
          </div>
          <h4 className="font-bold text-gray-900">{bookingForm.title || 'Booking Request'}</h4>
          {bookingForm.description && <p className="mt-1 text-sm text-gray-600">{bookingForm.description}</p>}
          <div className="mt-4 grid gap-3">
            {bookingForm.fields.filter((field) => field.enabled).map((field) => <PreviewField key={field.id} field={field} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field }) {
  const common = "mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 bg-white";
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-700">{field.label}{field.required ? ' *' : ''}</span>
      {field.helpText && <span className="block text-xs text-gray-500">{field.helpText}</span>}
      {field.type === 'textarea' ? <textarea disabled placeholder={field.placeholder} className={common} /> : ['select', 'radio', 'checkbox'].includes(field.type) ? (
        <select disabled className={common}><option>{field.options?.[0] || field.placeholder || 'Option'}</option></select>
      ) : <input disabled type={field.type === 'file' ? 'text' : field.type} placeholder={field.placeholder} className={common} />}
    </label>
  );
}

function AvailabilityTableBuilder({ table, updateTable }) {
  const columns = table?.columns || [];
  const rows = table?.rows || [];

  const addColumn = () => updateTable((current) => {
    const column = { id: makeId('col'), label: `Column ${(current.columns?.length || 0) + 1}` };
    return {
      ...current,
      columns: [...(current.columns || []), column],
      rows: (current.rows || []).map((row) => ({ ...row, cells: { ...(row.cells || {}), [column.id]: '' } })),
    };
  });

  const renameColumn = (columnId, label) => updateTable((current) => ({
    ...current,
    columns: current.columns.map((column) => column.id === columnId ? { ...column, label } : column),
  }));

  const moveColumn = (columnId, direction) => updateTable((current) => {
    const index = current.columns.findIndex((column) => column.id === columnId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.columns.length) return current;
    const columnsCopy = [...current.columns];
    const [column] = columnsCopy.splice(index, 1);
    columnsCopy.splice(nextIndex, 0, column);
    return { ...current, columns: columnsCopy };
  });

  const deleteColumn = (columnId) => updateTable((current) => ({
    ...current,
    columns: current.columns.filter((column) => column.id !== columnId),
    rows: current.rows.map((row) => {
      const cells = { ...(row.cells || {}) };
      delete cells[columnId];
      return { ...row, cells };
    }),
  }));

  const addRow = () => updateTable((current) => ({
    ...current,
    rows: [...(current.rows || []), { id: makeId('row'), cells: {} }],
  }));

  const deleteRow = (rowId) => updateTable((current) => ({
    ...current,
    rows: current.rows.filter((row) => row.id !== rowId),
  }));

  const updateCell = (rowId, columnId, value) => updateTable((current) => ({
    ...current,
    rows: current.rows.map((row) => row.id === rowId
      ? { ...row, cells: { ...(row.cells || {}), [columnId]: value } }
      : row),
  }));

  return (
    <div className="md:col-span-2 rounded-xl border border-gray-200 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Availability Table</h3>
          <p className="text-sm text-gray-500">Create the schedule, inventory, room, car, ticket, or service table customers will see.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addColumn} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Add Column</button>
          <button type="button" onClick={addRow} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold">Add Row</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={column.id} className="min-w-44 border border-gray-200 bg-gray-50 p-2 align-top">
                  <input
                    value={column.label}
                    onChange={(event) => renameColumn(column.id, event.target.value)}
                    className="mb-2 w-full rounded-lg border border-gray-300 px-2 py-1 font-semibold"
                  />
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => moveColumn(column.id, -1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Back</button>
                    <button type="button" disabled={index === columns.length - 1} onClick={() => moveColumn(column.id, 1)} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Next</button>
                    <button type="button" onClick={() => deleteColumn(column.id)} className="rounded bg-red-50 px-2 py-1 text-red-700">Delete</button>
                  </div>
                </th>
              ))}
              <th className="w-24 border border-gray-200 bg-gray-50 p-2">Rows</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.id} className="border border-gray-200 p-2">
                    <input
                      value={row.cells?.[column.id] || ''}
                      onChange={(event) => updateCell(row.id, column.id, event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2"
                      placeholder={column.label}
                    />
                  </td>
                ))}
                <td className="border border-gray-200 p-2">
                  <button type="button" onClick={() => deleteRow(row.id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!columns.length && <p className="mt-3 text-sm text-gray-500">Add a column to start building the table.</p>}
    </div>
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

function BookingDetailModal({ booking, onClose }) {
  const qrToken = booking.verificationToken;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">Close</button>
        </div>
        <DetailGrid data={{
          'Booking ID': booking._id,
          Code: booking.bookingCode,
          Customer: booking.touristId?.name || booking.userId?.name || 'Customer',
          Email: booking.touristId?.email || booking.userId?.email || '-',
          Business: booking.hotelId?.name || booking.preferredHotelId?.name || booking.destinationPlace,
          Status: booking.status,
          Payment: booking.paymentStatus || 'unpaid',
          Quantity: booking.quantity || booking.guests || 1,
          Date: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-',
        }} />
        {qrToken && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(`${window.location.origin}/verify/${qrToken}`)}`} alt="Booking QR code" className="mt-4 h-40 w-40 rounded-xl border border-gray-200 p-2" />}
        <ResponseList responses={booking.bookingDetails} />
      </div>
    </div>
  );
}

function SellerBookingVerification({ token }) {
  const [lookup, setLookup] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!lookup.trim()) return;
    setError('');
    setBooking(null);
    try {
      const response = await hotelApi.verifyBooking(token, lookup.trim().replace(/^.*\/verify\//, ''));
      setBooking(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row">
        <input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="Enter Booking ID, code, or QR verification token" className="flex-1 rounded-xl border border-gray-300 px-4 py-3" />
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">Verify Booking</button>
      </form>
      <p className="text-sm text-gray-500">Staff can paste a scanned QR verification URL or enter the booking ID/code.</p>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {booking && <div className="rounded-xl border border-gray-200 p-4"><BookingDetailBody booking={booking} /></div>}
    </div>
  );
}

function BookingDetailBody({ booking }) {
  const qrToken = booking.verificationToken;
  return (
    <>
      <DetailGrid data={{
        'Booking ID': booking._id,
        Code: booking.bookingCode,
        Customer: booking.touristId?.name || booking.userId?.name || 'Customer',
        Email: booking.touristId?.email || booking.userId?.email || '-',
        Business: booking.hotelId?.name || booking.preferredHotelId?.name || booking.destinationPlace,
        Status: booking.status,
        Payment: booking.paymentStatus || 'unpaid',
        Quantity: booking.quantity || booking.guests || 1,
        Date: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-',
      }} />
      {qrToken && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(`${window.location.origin}/verify/${qrToken}`)}`} alt="Booking QR code" className="mt-4 h-40 w-40 rounded-xl border border-gray-200 p-2" />}
      <ResponseList responses={booking.bookingDetails?.customResponses?.length ? Object.fromEntries(booking.bookingDetails.customResponses.map((item) => [item.label, item.value])) : booking.bookingDetails} />
    </>
  );
}

function DetailGrid({ data }) {
  return <dl className="grid gap-3 md:grid-cols-2">{Object.entries(data).map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt><dd className="mt-1 break-all text-sm font-semibold text-gray-900">{String(value || '-')}</dd></div>)}</dl>;
}

function ResponseList({ responses }) {
  const entries = Object.entries(responses || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return <p className="mt-4 text-sm text-gray-500">No form responses saved.</p>;
  return <div className="mt-4"><h3 className="font-bold text-gray-900">Form Responses</h3><div className="mt-2 grid gap-2">{entries.map(([key, value]) => <div key={key} className="rounded-lg border border-gray-200 p-3"><p className="text-xs font-semibold uppercase text-gray-500">{key}</p><p className="break-all text-sm text-gray-800">{Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}</p></div>)}</div></div>;
}
