/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { adminApi, getAuthData } from '../lib/api';
import { locations } from '../data/mockData';
import { normalizeHotels } from '../lib/hotelMapper';
import { formatRwf } from '../lib/currency';
import { REALTIME_EVENTS, getRealtimeSocket, subscribeToRealtime } from '../lib/realtime';

const AUTO_REFRESH_MS = 15000;
const BUSINESS_TYPE_OPTIONS = [
  { value: 'hotels-and-resorts', label: 'Hotels & Resorts' },
  { value: 'homestays-and-guesthouses', label: 'Homestays & Guesthouses' },
  { value: 'tent-rentals-and-camping-sites', label: 'Tent Rentals & Camping Sites' },
  { value: 'vacation-rentals-and-apartments', label: 'Vacation Rentals & Apartments' },
  { value: 'car-rentals', label: 'Car Rentals' },
  { value: 'motorbike-and-scooter-rentals', label: 'Motorbike & Scooter Rentals' },
  { value: 'taxi-and-ride-services', label: 'Taxi & Ride Services' },
  { value: 'bus-and-minivan-charters', label: 'Bus & Minivan Charters' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'bars-and-pubs', label: 'Bars & Pubs' },
  { value: 'coffee-shops-and-cafes', label: 'Coffee Shops & Cafes' },
  { value: 'food-trucks-and-street-food-stalls', label: 'Food Trucks & Street Food Stalls' },
  { value: 'conference-event-halls-mice', label: 'Conference / Event Halls (MICE)' },
  { value: 'wedding-venues', label: 'Wedding Venues' },
  { value: 'tour-and-activity-operators', label: 'Tour & Activity Operators' },
  { value: 'entertainment-venues', label: 'Entertainment Venues' },
  { value: 'souvenir-shops-and-craft-markets', label: 'Souvenir Shops & Craft Markets' },
  { value: 'gear-rentals', label: 'Gear Rentals' },
  { value: 'spas-and-wellness-centers', label: 'Spas & Wellness Centers' },
  { value: 'childcare-services', label: 'Childcare Services' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hotels');
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedHelperIds, setSelectedHelperIds] = useState([]);
  const [customAckMessage, setCustomAckMessage] = useState('');
  const [acknowledgingBookingId, setAcknowledgingBookingId] = useState('');
  const [metricView, setMetricView] = useState('total-hotels');
  const [hotelStatus, setHotelStatus] = useState(null);
  const [hotelStatusLoading, setHotelStatusLoading] = useState(false);
  const [hotelStatusError, setHotelStatusError] = useState('');
  const [statusHotelId, setStatusHotelId] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isRegisteringBusiness, setIsRegisteringBusiness] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'hotels-and-resorts',
    ownerName: '',
    ownerEmail: '',
    location: '',
    description: '',
    basePrice: '',
    services: '',
  });

  const token = getAuthData()?.token;
  const adminSections = [
    { id: 'hotels', label: 'Business Status', hint: 'View businesses and open full business status' },
    { id: 'trips', label: 'Trips Management', hint: 'View trip details and helper assignments' },
    { id: 'connect', label: 'Connect Visitor', hint: 'Analyze accommodation availability before assignment' },
    { id: 'users', label: 'Users', hint: 'Manage business owners, helpers and visitors' },
  ];

  const loadAdminData = async ({ silent = false } = {}) => {
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const [statsResp, hotelsResp, bookingsResp, usersResp] = await Promise.allSettled([
        adminApi.getStats(token),
        adminApi.getBusinesses(token),
        adminApi.getBookings(token),
        adminApi.getUsers(token),
      ]);

      if (statsResp.status === 'fulfilled') {
        setStats(statsResp.value);
      }
      if (hotelsResp.status === 'fulfilled') {
        setHotels(normalizeHotels(hotelsResp.value.businesses || hotelsResp.value.hotels || []));
      }
      if (usersResp.status === 'fulfilled') {
        setUsers(usersResp.value.users || []);
      }
      if (bookingsResp.status === 'fulfilled') {
        setBookings(bookingsResp.value.bookings || []);
      }

      const failedResponses = [statsResp, hotelsResp, bookingsResp, usersResp].filter(
        (response) => response.status === 'rejected'
      );

      if (failedResponses.length > 0) {
        setError('Some dashboard data could not be loaded right now. Please refresh and try again.');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadHotelStatus = async (hotelId, { silent = false } = {}) => {
    if (!token || !hotelId) return;
    if (!silent) setHotelStatusLoading(true);
    setHotelStatusError('');
    try {
      const response = await adminApi.getHotelStatus(token, hotelId);
      setHotelStatus(response);
      setStatusHotelId(hotelId);
    } catch (requestError) {
      setHotelStatusError(requestError.message);
    } finally {
      if (!silent) setHotelStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || !token) return undefined;

    const intervalId = window.setInterval(() => {
      loadAdminData({ silent: true });
      if (statusHotelId) {
        loadHotelStatus(statusHotelId, { silent: true });
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, statusHotelId]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || !token) return undefined;
    getRealtimeSocket().emit('admin:join');

    return subscribeToRealtime(
      [
        REALTIME_EVENTS.CATALOG_CHANGED,
        REALTIME_EVENTS.HOTEL_CHANGED,
        REALTIME_EVENTS.BOOKING_CHANGED,
        REALTIME_EVENTS.ROOM_CHANGED,
        REALTIME_EVENTS.SERVICE_CHANGED,
      ],
      () => {
        loadAdminData({ silent: true });
        if (statusHotelId) {
          loadHotelStatus(statusHotelId, { silent: true });
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, statusHotelId]);

  useEffect(() => {
    if (selectedHotelId) {
      loadHotelStatus(selectedHotelId);
    } else {
      setHotelStatus(null);
      setStatusHotelId('');
      setSelectedRoomId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelId]);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings]
  );

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview('');
      setImageFile(null);
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const availableInventoryList = useMemo(
    () =>
      hotels
        .filter((hotel) => Number(hotel.availableInventory || 0) > 0)
        .map((hotel) => ({
          id: hotel.id,
          businessId: hotel.id,
          hotelId: hotel.id,
          businessName: hotel.name,
          businessType: hotel.type || 'hotel',
          type: formatBusinessType(hotel.type || 'hotel'),
          location: hotel.location || '-',
          hotelLocation: hotel.location || '-',
          availableInventory: hotel.availableInventory || 0,
          totalInventory: hotel.totalInventory || 0,
          price: hotel.basePrice || 0,
          inventoryLabel: hotel.inventoryLabel || getInventoryMeta(hotel.type).inventoryLabel,
          services: Array.isArray(hotel.services) ? hotel.services : [],
        })),
    [hotels]
  );

  const allHotelsList = useMemo(
    () =>
      hotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        type: hotel.type || 'hotel',
        location: hotel.location,
        availableInventory: hotel.availableInventory || 0,
        totalInventory: hotel.totalInventory || 0,
        inventoryLabel: hotel.inventoryLabel || getInventoryMeta(hotel.type).inventoryLabel,
      })),
    [hotels]
  );

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking._id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  const rankedHotels = useMemo(() => {
    if (!selectedBooking) {
      return [...hotels].sort((a, b) => (b.availableInventory || 0) - (a.availableInventory || 0));
    }

    const destination = (selectedBooking.destinationLocation || '').toLowerCase();
    return [...hotels].sort((a, b) => {
      const aScore =
        (a.location?.toLowerCase().includes(destination) ? 100 : 0) + (a.availableInventory || 0);
      const bScore =
        (b.location?.toLowerCase().includes(destination) ? 100 : 0) + (b.availableInventory || 0);
      return bScore - aScore;
    });
  }, [hotels, selectedBooking]);

  const summaryMetrics = useMemo(
    () => [
      {
        id: 'total-hotels',
        label: 'Total Businesses',
        value: stats?.totalBusinesses ?? stats?.totalHotels ?? hotels.length,
        hint: 'Click to show all businesses',
      },
      {
        id: 'available-rooms',
        label: 'Available Services',
        value: stats?.availableInventory ?? availableInventoryList.length,
        hint: 'Click to show active availability across marketplace businesses',
      },
      {
        id: 'total-bookings',
        label: 'Total Bookings',
        value: stats?.totalBookings ?? bookings.length,
        hint: 'Click to show all bookings',
      },
    ],
    [availableInventoryList.length, bookings.length, hotels.length, stats]
  );

  const metricItems = useMemo(() => {
    if (metricView === 'available-rooms') return availableInventoryList;
    if (metricView === 'total-bookings') return bookings;
    return allHotelsList;
  }, [allHotelsList, availableInventoryList, bookings, metricView]);

  const handleRegisterBusiness = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setInfo('');
    setRegistrationDetails(null);

    const payload = {
      businessName: formData.businessName.trim(),
      businessType: formData.businessType,
      ownerName: formData.ownerName.trim(),
      ownerEmail: formData.ownerEmail.trim().toLowerCase(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      basePrice: Number(formData.basePrice),
      images: [],
      services: formData.services
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const missingFields = [];
    if (!payload.businessName) missingFields.push('business name');
    if (!payload.businessType) missingFields.push('business type');
    if (!payload.location) missingFields.push('location');
    if (!payload.description) missingFields.push('description');
    if (!imageFile) missingFields.push('image');
    if (payload.services.length === 0) missingFields.push('services');
    if (!Number.isFinite(payload.basePrice)) payload.basePrice = 0;
    if ((payload.ownerName && !payload.ownerEmail) || (!payload.ownerName && payload.ownerEmail)) {
      missingFields.push('owner name + owner email together');
    }

    if (missingFields.length > 0) {
      setError(`Please fill: ${missingFields.join(', ')}.`);
      return;
    }

    try {
      setIsRegisteringBusiness(true);
      const uploadResponse = await adminApi.uploadImage(token, imageFile);
      payload.images = [uploadResponse.url];
      const response = await adminApi.registerBusiness(token, payload);
      const createdBusiness = response.business || response.hotel;
      setInfo(`Business "${createdBusiness?.name || payload.businessName}" was added successfully.`);
      setRegistrationDetails({
        businessName: createdBusiness?.name || payload.businessName,
        businessType: createdBusiness?.type || payload.businessType,
        ownerName: response.ownerName || payload.ownerName,
        ownerEmail: response.ownerEmail || payload.ownerEmail,
        registrationPath: response.registrationPath || '',
        registrationLink:
          response.registrationPath && (response.ownerName || payload.ownerName) && (response.ownerEmail || payload.ownerEmail)
            ? `${response.registrationPath}?name=${encodeURIComponent(
                response.ownerName || payload.ownerName
              )}&email=${encodeURIComponent(response.ownerEmail || payload.ownerEmail)}`
            : '',
      });
      setShowRegisterModal(false);
      setFormData({
        businessName: '',
        businessType: 'hotels-and-resorts',
        ownerName: '',
        ownerEmail: '',
        location: '',
        description: '',
        basePrice: '',
        services: '',
      });
      setImagePreview('');
      setImageFile(null);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsRegisteringBusiness(false);
    }
  };

  const handleConnectTour = async () => {
    if (!token) return;
    if (!selectedBookingId || !selectedHotelId || !selectedRoomId) {
      setError('Please select trip, business, and room after reviewing business status.');
      return;
    }
    if (selectedHelperIds.length === 0) {
      setError('Please select at least one tour helper for this trip.');
      return;
    }

    setError('');
    setInfo('');
    try {
      const response = await adminApi.connectTour(token, {
        bookingId: selectedBookingId,
        hotelId: selectedHotelId,
        roomId: selectedRoomId,
        helperIds: selectedHelperIds,
      });
      setInfo(response.message);
      setSelectedBookingId('');
      setSelectedHotelId('');
      setSelectedRoomId('');
      setSelectedHelperIds([]);
      setHotelStatus(null);
      setStatusHotelId('');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteHotel = async (hotelId) => {
    if (!token) return;
    if (!window.confirm('Delete this business? This removes linked owner access, rooms, and related assignments.')) {
      return;
    }

    setError('');
    setInfo('');
    try {
      const response = await adminApi.deleteHotel(token, hotelId);
      setInfo(response.message);
      if (statusHotelId === hotelId) {
        setHotelStatus(null);
        setStatusHotelId('');
      }
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!token) return;
    if (!window.confirm('Delete this user from the system?')) {
      return;
    }

    setError('');
    setInfo('');
    try {
      const response = await adminApi.deleteUser(token, userId);
      setInfo(response.message);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleAcknowledgeRequest = async (bookingId) => {
    if (!token) return;
    setError('');
    setInfo('');
    setAcknowledgingBookingId(bookingId);
    try {
      await adminApi.acknowledgeRequest(token, {
        bookingId,
        message: customAckMessage.trim(),
      });
      setInfo('Request confirmation sent to user.');
      setCustomAckMessage('');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAcknowledgingBookingId('');
    }
  };

  const handlePurgeVisitors = async () => {
    if (!token) return;
    if (!window.confirm('Delete all visitor users from dashboard and database? Admin and hotel owners will remain.')) {
      return;
    }

    setError('');
    setInfo('');
    try {
      const response = await adminApi.purgeVisitors(token);
      setInfo(response.message);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleHelperSelection = (helperId) => {
    setSelectedHelperIds((prev) =>
      prev.includes(helperId) ? prev.filter((id) => id !== helperId) : [...prev, helperId]
    );
  };

  if (!user || user.role !== 'admin') return null;

  const hotelOwners = users.filter((appUser) => appUser.role === 'hotel');
  const visitors = users.filter((appUser) => appUser.role === 'tourist');
  const helperUsers = users.filter((appUser) => appUser.role === 'tourHelper');
  const availableRoomsForSelectedHotel =
    hotelStatus?.rooms?.filter((room) => room.status === 'available') || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Realtime operations
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    Multi-service marketplace
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Admin Dashboard</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                  Register hotels, restaurants, transport, tours, venues, shops, wellness services, and other businesses. Each owner receives their dashboard through the registered email, while availability and bookings sync live.
                </p>
              </div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition"
            >
              Register New Business
            </button>
            </div>
          </div>

          {(error || info) && (
            <div className="mb-6 space-y-2">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
              {info && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{info}</div>}
            </div>
          )}

          {registrationDetails && (
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
              <h2 className="text-lg font-bold text-green-900 mb-2">Business added successfully</h2>
              <p className="text-sm text-green-800 mb-3">
                {registrationDetails.registrationLink
                  ? 'Give these details to the business owner so they can complete registration and access the dashboard.'
                  : 'This business was saved successfully. No owner onboarding link was created for this entry.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <InfoTile label="Business name" value={registrationDetails.businessName} />
                <InfoTile label="Business type" value={formatBusinessType(registrationDetails.businessType)} />
                <InfoTile label="Owner name" value={registrationDetails.ownerName} />
                <InfoTile label="Owner email" value={registrationDetails.ownerEmail} />
                <InfoTile label="Registration page" value={registrationDetails.registrationPath || 'Not created'} />
              </div>
              {registrationDetails.registrationLink && (
                <div className="mt-3 rounded-xl bg-white p-3 border border-green-100 text-sm">
                  <p className="text-gray-500">Prefilled registration link</p>
                  <p className="font-semibold text-gray-900 break-all">{registrationDetails.registrationLink}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Metric label="Businesses" value={stats?.totalBusinesses ?? stats?.totalHotels ?? 0} />
            <Metric label="Rooms" value={stats?.totalRooms ?? 0} />
            <Metric label="Available Inventory" value={stats?.availableInventory ?? 0} />
            <Metric label="Bookings" value={stats?.totalBookings ?? 0} />
            <Metric label="Revenue" value={formatRwf(stats?.revenue ?? 0)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {summaryMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                onClick={() => setMetricView(metric.id)}
                className={`rounded-2xl p-5 text-left border transition ${
                  metricView === metric.id
                    ? 'border-primary bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-primary/50'
                }`}
              >
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                <p className="text-xs text-gray-600 mt-2">{metric.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {adminSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveTab(section.id)}
                className={`rounded-2xl p-5 text-left border transition ${
                  activeTab === section.id
                    ? 'border-primary bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-primary/50'
                }`}
              >
                <p className="text-base font-bold text-gray-900">{section.label}</p>
                <p className="text-sm text-gray-600 mt-2">{section.hint}</p>
              </button>
            ))}
          </div>

          <div className="mb-8 bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{metricTitle(metricView)}</h2>
                <p className="text-sm text-gray-600">Click any business from the list to inspect live availability and booking status.</p>
              </div>
              <button
                type="button"
                onClick={() => loadAdminData()}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
              >
                Refresh Now
              </button>
            </div>
            <MetricDrilldown
              metricView={metricView}
              items={metricItems}
              onViewHotel={(hotelId) => {
                setActiveTab('hotels');
                loadHotelStatus(hotelId);
              }}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto">
                {adminSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`px-6 py-4 font-medium capitalize border-b-2 transition whitespace-nowrap ${
                      activeTab === section.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <p className="text-gray-600">Loading dashboard...</p>
              ) : (
                <>
                  {activeTab === 'hotels' && (
                    <div className="space-y-6">
                      {hotels.length === 0 && (
                        <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
                          No businesses found yet. Register a business, then use the View button to inspect full business status.
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2">Image</th>
                              <th className="text-left py-3 px-2">Business</th>
                              <th className="text-left py-3 px-2">Type</th>
                              <th className="text-left py-3 px-2">Location</th>
                              <th className="text-left py-3 px-2">Services</th>
                              <th className="text-left py-3 px-2">Available</th>
                              <th className="text-left py-3 px-2">Total</th>
                              <th className="text-left py-3 px-2">Inventory Type</th>
                              <th className="text-left py-3 px-2">Can Accept Visitor</th>
                              <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hotels.map((hotel) => (
                              <tr key={hotel.id} className="border-b border-gray-100">
                                <td className="py-3 px-2">
                                  <img
                                    src={hotel.images?.[0] || hotel.image}
                                    alt={hotel.name}
                                    className="h-12 w-16 rounded-lg object-cover border border-gray-200"
                                  />
                                </td>
                                <td className="py-3 px-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">{hotel.name}</p>
                                    <p className="text-xs text-gray-500">{hotel.ownerEmail}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-2">{formatBusinessType(hotel.type)}</td>
                                <td className="py-3 px-2">{hotel.location}</td>
                                <td className="py-3 px-2">{hotel.services?.join(', ') || '-'}</td>
                                <td className="py-3 px-2">{hotel.availableInventory ?? 0}</td>
                                <td className="py-3 px-2">{hotel.totalInventory ?? 0}</td>
                                <td className="py-3 px-2">{hotel.inventoryLabel || getInventoryMeta(hotel.type).inventoryLabel}</td>
                                <td className="py-3 px-2">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                      hotel.canAcceptVisitors
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {hotel.canAcceptVisitors ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex justify-end gap-3 text-sm">
                                    <button
                                      onClick={() => {
                                        setActiveTab('hotels');
                                        loadHotelStatus(hotel.id);
                                      }}
                                      className="text-primary hover:underline"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => handleDeleteHotel(hotel.id)}
                                      className="text-red-600 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <HotelStatusPanel
                        status={hotelStatus}
                        loading={hotelStatusLoading}
                        error={hotelStatusError}
                        onChooseForConnect={(hotelId) => {
                          setSelectedHotelId(hotelId);
                          setActiveTab('connect');
                        }}
                      />
                    </div>
                  )}

                  {activeTab === 'trips' && (
                    <div className="space-y-6">
                      {bookings.length === 0 && (
                        <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
                          No trips/bookings found yet. Once visitors create requests, they will appear here for review.
                        </div>
                      )}
                      <div className="rounded-2xl border border-gray-200 p-5">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Final Organized Feature Update</h2>
                        <p className="text-sm text-gray-600">
                          Trips Management lets admin review each trip, open full details, and assign one or many tour helpers together with the hotel and room.
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2">User</th>
                              <th className="text-left py-3 px-2">Destination</th>
                              <th className="text-left py-3 px-2">Location</th>
                              <th className="text-left py-3 px-2">Status</th>
                              <th className="text-left py-3 px-2">Business</th>
                              <th className="text-left py-3 px-2">Tour Helpers</th>
                              <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map((booking) => (
                              <tr key={booking._id} className="border-b border-gray-100">
                                <td className="py-3 px-2">{booking.touristId?.name || booking.touristId?.email || 'Unknown'}</td>
                                <td className="py-3 px-2">{booking.destinationPlace || '-'}</td>
                                <td className="py-3 px-2">{booking.destinationLocation || '-'}</td>
                                <td className="py-3 px-2">{booking.status === 'confirmed' ? 'Assigned' : 'Pending'}</td>
                                <td className="py-3 px-2">{booking.hotelId?.name || booking.preferredHotelId?.name || '-'}</td>
                                <td className="py-3 px-2">
                                  {booking.tourHelpers?.length > 0
                                    ? booking.tourHelpers.map((helper) => helper.name).join(', ')
                                    : '-'}
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex justify-end gap-3 text-sm">
                                    <button
                                      onClick={() => {
                                        setSelectedBookingId(booking._id);
                                        setSelectedHelperIds(booking.tourHelpers?.map((helper) => helper._id) || []);
                                        setActiveTab('trips');
                                      }}
                                      className="text-primary hover:underline"
                                    >
                                      View
                                    </button>
                                    {booking.isAcknowledgedByAdmin ? (
                                      <span className="text-green-700">Acknowledged</span>
                                    ) : (
                                      <button
                                        onClick={() => handleAcknowledgeRequest(booking._id)}
                                        disabled={acknowledgingBookingId === booking._id}
                                        className="text-primary hover:underline disabled:opacity-50"
                                      >
                                        {acknowledgingBookingId === booking._id ? 'Sending...' : 'Confirm'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {selectedBooking && (
                        <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">Trip Details</h3>
                              <p className="text-sm text-gray-600">View complete trip information before assignment.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('connect')}
                              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm"
                            >
                              Assign Business And Helpers
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <InfoTile
                              label="User information"
                              value={`${selectedBooking.touristId?.name || 'Unknown'}${selectedBooking.touristId?.email ? ` - ${selectedBooking.touristId.email}` : ''}`}
                            />
                            <InfoTile
                              label="Destination"
                              value={`${selectedBooking.destinationPlace || '-'} (${selectedBooking.destinationLocation || '-'})`}
                            />
                            <InfoTile
                              label="Business"
                              value={
                                selectedBooking.hotelId
                                  ? `${selectedBooking.hotelId.name} - ${selectedBooking.hotelId.location}`
                                  : selectedBooking.preferredHotelId
                                    ? `${selectedBooking.preferredHotelId.name} - ${selectedBooking.preferredHotelId.location}`
                                    : 'Business not assigned'
                              }
                            />
                            <InfoTile
                              label="Trip status"
                              value={selectedBooking.status === 'confirmed' ? 'Assigned' : 'Pending'}
                            />
                          </div>

                          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Tour Helpers</h4>
                            {selectedBooking.tourHelpers?.length > 0 ? (
                              <div className="space-y-2">
                                {selectedBooking.tourHelpers.map((helper) => (
                                  <p key={helper._id} className="text-sm text-gray-700">
                                    {helper.name} - {helper.phone || helper.email}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No tour helpers assigned yet.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'connect' && (
                    <div className="space-y-6">
                      {pendingBookings.length === 0 && (
                        <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
                          No pending trips are waiting for connection right now. When a visitor booking request arrives, you can assign hotel, room and helpers here.
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Confirmation Message To User
                        </label>
                        <textarea
                          value={customAckMessage}
                          onChange={(e) => setCustomAckMessage(e.target.value)}
                          placeholder="Admin received your request and is reviewing suitable hotels."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                          <div className="rounded-2xl border border-gray-200 p-4">
                            <h3 className="font-bold text-gray-900 mb-3">1. Select Trip</h3>
                            <select
                              value={selectedBookingId}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                setSelectedBookingId(nextId);
                                const trip = bookings.find((booking) => booking._id === nextId);
                                setSelectedHelperIds(trip?.tourHelpers?.map((helper) => helper._id) || []);
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                            >
                              <option value="">Select pending trip</option>
                              {pendingBookings.map((booking) => (
                                <option key={booking._id} value={booking._id}>
                                  {booking._id.slice(-8)} - {booking.touristId?.name || 'Tourist'}
                                </option>
                              ))}
                            </select>
                            {selectedBooking && (
                              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                                <p>
                                  <strong>{selectedBooking.destinationPlace}</strong> in{' '}
                                  <strong>{selectedBooking.destinationLocation}</strong>
                                </p>
                                <p>Tourist: {selectedBooking.touristId?.name || selectedBooking.touristId?.email || 'Unknown'}</p>
                                <p>Guests: {selectedBooking.guests || 1}</p>
                                <p>Preferred hotel: {selectedBooking.preferredHotelId?.name || 'None selected'}</p>
                                <p>Check-in: {formatDate(selectedBooking.checkIn)}</p>
                                <p>Check-out: {formatDate(selectedBooking.checkOut)}</p>
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-gray-200 p-4">
                            <h3 className="font-bold text-gray-900 mb-3">2. Analyze Businesses</h3>
                            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                              {rankedHotels.map((hotel) => (
                                <button
                                  key={hotel.id}
                                  type="button"
                                  onClick={() => setSelectedHotelId(hotel.id)}
                                  className={`w-full rounded-xl border p-4 text-left transition ${
                                    selectedHotelId === hotel.id
                                      ? 'border-primary bg-blue-50'
                                      : 'border-gray-200 hover:border-primary/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-gray-900">{hotel.name}</p>
                                      <p className="text-sm text-gray-600">{hotel.location}</p>
                                    </div>
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                        hotel.canAcceptVisitors
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {hotel.canAcceptVisitors ? 'Available' : 'Full'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                                    <div>Available: {hotel.availableInventory ?? 0}</div>
                                    <div>Total: {hotel.totalInventory ?? 0}</div>
                                    <div>Base price: {formatRwf(hotel.basePrice)}</div>
                                    <div>Type: {formatBusinessType(hotel.type)}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                          <div className="rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-900 mb-3">3. Assign Tour Helpers</h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Select one or many helpers for the same trip using checkboxes.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {helperUsers.map((helper) => (
                                <label
                                  key={helper._id}
                                  className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer ${
                                    selectedHelperIds.includes(helper._id)
                                      ? 'border-primary bg-blue-50'
                                      : 'border-gray-200'
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold text-gray-900">{helper.name}</p>
                                    <p className="text-sm text-gray-600">{helper.phone || helper.email}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedHelperIds.includes(helper._id)}
                                    onChange={() => toggleHelperSelection(helper._id)}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div>
                                <h3 className="font-bold text-gray-900">4. Review Selected Business Status</h3>
                                <p className="text-sm text-gray-600">Business room status updates automatically every {AUTO_REFRESH_MS / 1000} seconds.</p>
                              </div>
                              {selectedHotelId && (
                                <button
                                  type="button"
                                  onClick={() => loadHotelStatus(selectedHotelId)}
                                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Refresh Business
                                </button>
                              )}
                            </div>

                            <HotelStatusPanel status={hotelStatus} loading={hotelStatusLoading} error={hotelStatusError} compact />
                          </div>

                          <div className="rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-900 mb-3">5. Choose Available Room</h3>
                            {!selectedHotelId ? (
                              <p className="text-sm text-gray-600">Choose a business first to see the free room numbers.</p>
                            ) : availableRoomsForSelectedHotel.length === 0 ? (
                              <p className="text-sm text-red-600">This business has no available rooms right now.</p>
                            ) : (
                              <div className="space-y-3">
                                {availableRoomsForSelectedHotel.map((room) => (
                                  <label
                                    key={room._id}
                                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer ${
                                      selectedRoomId === room._id ? 'border-primary bg-blue-50' : 'border-gray-200'
                                    }`}
                                  >
                                    <div>
                                      <p className="font-semibold text-gray-900">Room {room.roomNumber}</p>
                                      <p className="text-sm text-gray-600">{room.type} room</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-semibold text-gray-900">${room.price}</span>
                                      <input
                                        type="radio"
                                        name="selectedRoom"
                                        checked={selectedRoomId === room._id}
                                        onChange={() => setSelectedRoomId(room._id)}
                                      />
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={handleConnectTour}
                              className="mt-5 w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl"
                            >
                              Connect Visitor To Selected Business Room
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="space-y-8">
                      {users.length === 0 && (
                        <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
                          No users were returned from the server yet.
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          onClick={handlePurgeVisitors}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          Delete All Visitors
                        </button>
                      </div>

      <UserTable
        title="Business Owners"
        rows={hotelOwners}
        onDelete={handleDeleteUser}
      />

                      <UserTable
                        title="Tour Helpers"
                        rows={helperUsers}
                        onDelete={handleDeleteUser}
                      />

                      <UserTable
                        title="Visitors"
                        rows={visitors}
                        onDelete={handleDeleteUser}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Register New Business</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700">
                X
              </button>
            </div>

            <form onSubmit={handleRegisterBusiness} className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
                Admin now creates a business first. Accommodation businesses stay compatible with the existing room and booking flow, while all businesses are saved with a business type, images, and services.
              </div>

              <input
                type="text"
                required
                placeholder="Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <select
                required
                value={formData.businessType}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessType: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              >
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Owner Name (optional)"
                value={formData.ownerName}
                onChange={(e) => setFormData((prev) => ({ ...prev, ownerName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <input
                type="email"
                placeholder="Owner Email (optional)"
                value={formData.ownerEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <select
                required
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <textarea
                required
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <input
                type="number"
                placeholder="Starting Price / Base Price"
                value={formData.basePrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, basePrice: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Business Image</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Business preview"
                    className="h-40 w-full rounded-xl object-cover border border-gray-200"
                  />
                )}
              </div>
              <textarea
                required
                placeholder="Services (one per line or comma separated)"
                value={formData.services}
                onChange={(e) => setFormData((prev) => ({ ...prev, services: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                rows={3}
              />

              <button
                type="submit"
                disabled={isRegisteringBusiness}
                className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRegisteringBusiness ? 'Uploading Image...' : 'Register Business'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HotelStatusPanel({ status, loading, error, onChooseForConnect, compact = false }) {
  const [detailView, setDetailView] = useState('free');

  if (loading) {
    return <p className="text-sm text-gray-600">Loading business status...</p>;
  }

  if (error) {
    return <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>;
  }

  if (!status) {
    return <p className="text-sm text-gray-600">Click "View" on a business to see live availability, listed services, and booking status.</p>;
  }

  const inventoryMeta = getInventoryMeta(status.hotel?.type);
  const supportsRooms = status.stats?.supportsRooms ?? inventoryMeta.supportsRooms;
  const availableRooms = status.rooms?.filter((room) => room.status === 'available') || [];
  const occupiedRooms = status.rooms?.filter((room) => room.status === 'occupied') || [];
  const bookings = status.bookings || [];
  const serviceList = status.stats?.services || status.hotel?.services || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{status.hotel?.name}</h3>
          <p className="text-sm text-gray-600">{formatBusinessType(status.hotel?.type || 'hotel')}</p>
          <p className="text-sm text-gray-600">{status.hotel?.location}</p>
          <p className="text-sm text-gray-600 mt-1">{status.hotel?.description || 'No description provided.'}</p>
        </div>
        {onChooseForConnect && supportsRooms && (
          <button
            type="button"
            onClick={() => onChooseForConnect(status.hotel?._id)}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark text-sm"
          >
            Use For Visitor Assignment
          </button>
        )}
      </div>

      <div className={`grid ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-4'} gap-4`}>
        <InfoTile label={`Total ${status.stats?.inventoryLabel || inventoryMeta.inventoryLabel}`} value={status.stats?.totalInventory ?? 0} />
        <button
          type="button"
          onClick={() => setDetailView('free')}
          className={`rounded-xl border p-3 text-left ${detailView === 'free' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-gray-500">{supportsRooms ? 'Free rooms' : 'Available services'}</p>
          <p className="font-semibold text-gray-900">{status.stats?.availableInventory ?? status.stats?.availableRooms ?? 0}</p>
        </button>
        {supportsRooms ? (
          <button
            type="button"
            onClick={() => setDetailView('occupied')}
            className={`rounded-xl border p-3 text-left ${detailView === 'occupied' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}
          >
            <p className="text-gray-500">Occupied rooms</p>
            <p className="font-semibold text-gray-900">{status.stats?.occupiedRooms ?? 0}</p>
          </button>
        ) : (
          <InfoTile label="Listed services" value={serviceList.length} />
        )}
        <button
          type="button"
          onClick={() => setDetailView('bookings')}
          className={`rounded-xl border p-3 text-left ${detailView === 'bookings' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-gray-500">Bookings</p>
          <p className="font-semibold text-gray-900">{status.stats?.assignedBookings ?? 0}</p>
        </button>
      </div>

      {supportsRooms ? (
        <div className="rounded-xl bg-green-50 border border-green-100 p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Available room numbers</p>
          {availableRooms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableRooms.map((room) => (
                <span key={room._id} className="px-3 py-1 rounded-full bg-white border border-green-200 text-green-900 text-sm">
                  Room {room.roomNumber} - ${room.price}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-900">No free rooms right now.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 border border-green-100 p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Available services</p>
          {serviceList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {serviceList.map((service) => (
                <span key={service} className="px-3 py-1 rounded-full bg-white border border-green-200 text-green-900 text-sm">
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-900">No active services listed right now.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h4 className="font-semibold text-gray-900">
              {supportsRooms ? (detailView === 'occupied' ? 'Occupied Rooms' : 'Room Status List') : 'Service List'}
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {supportsRooms ? (
                    <>
                      <th className="text-left py-3 px-4">Room</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Price</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-3 px-4">Service</th>
                      <th className="text-left py-3 px-4">Business Type</th>
                      <th className="text-left py-3 px-4">Base Price</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {supportsRooms
                  ? (detailView === 'occupied' ? occupiedRooms : availableRooms.length > 0 ? availableRooms : status.rooms || []).map((room) => (
                      <tr key={room._id} className="border-b border-gray-100">
                        <td className="py-3 px-4">{room.roomNumber}</td>
                        <td className="py-3 px-4">{room.type}</td>
                        <td className="py-3 px-4">${room.price}</td>
                        <td className="py-3 px-4">{room.status}</td>
                      </tr>
                    ))
                  : serviceList.map((service) => (
                      <tr key={service} className="border-b border-gray-100">
                        <td className="py-3 px-4">{service}</td>
                        <td className="py-3 px-4">{formatBusinessType(status.hotel?.type || 'service')}</td>
                        <td className="py-3 px-4">${status.hotel?.basePrice || 0}</td>
                        <td className="py-3 px-4">active</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h4 className="font-semibold text-gray-900">
              {detailView === 'bookings' ? 'Booking List' : supportsRooms ? 'Occupied Room Booking Details' : 'Business Booking Details'}
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Tourist</th>
                  <th className="text-left py-3 px-4">Hotel</th>
                  <th className="text-left py-3 px-4">Destination</th>
                  <th className="text-left py-3 px-4">Room</th>
                  <th className="text-left py-3 px-4">Check-in</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b border-gray-100">
                    <td className="py-3 px-4">{booking.touristId?.name || booking.touristId?.email || 'Unknown'}</td>
                    <td className="py-3 px-4">{status.hotel?.name || '-'}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p>{booking.destinationPlace || '-'}</p>
                        <p className="text-xs text-gray-500">{booking.destinationLocation || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{booking.roomId?.roomNumber || '-'}</td>
                    <td className="py-3 px-4">{formatDate(booking.checkIn)}</td>
                    <td className="py-3 px-4">{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricDrilldown({ metricView, items, onViewHotel }) {
  if (items.length === 0) {
    if (metricView === 'available-rooms') {
      return <p className="text-sm text-gray-600">No businesses have active availability right now.</p>;
    }
    if (metricView === 'total-bookings') {
      return <p className="text-sm text-gray-600">There are no bookings in the system yet.</p>;
    }
    return <p className="text-sm text-gray-600">No businesses are registered yet.</p>;
  }

  if (metricView === 'available-rooms') {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-gray-200 p-4">
            <div>
              <p className="font-semibold text-gray-900">
                {item.businessName}
              </p>
              <p className="text-sm text-gray-600">
                {item.hotelLocation} • {item.type} • ${item.price}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => onViewHotel(item.businessId)} className="text-primary hover:underline text-sm">
                View Business
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (metricView === 'total-bookings') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">Booking ID</th>
              <th className="text-left py-3 px-2">Tourist</th>
              <th className="text-left py-3 px-2">Destination</th>
              <th className="text-left py-3 px-2">Hotel</th>
              <th className="text-left py-3 px-2">Room</th>
              <th className="text-left py-3 px-2">Check-in</th>
              <th className="text-left py-3 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((booking) => (
              <tr key={booking._id} className="border-b border-gray-100">
                <td className="py-3 px-2 text-xs">{booking._id}</td>
                <td className="py-3 px-2">{booking.touristId?.name || booking.touristId?.email || 'Unknown'}</td>
                <td className="py-3 px-2">
                  {booking.destinationPlace} <span className="text-gray-500">({booking.destinationLocation})</span>
                </td>
                <td className="py-3 px-2">{booking.hotelId?.name || booking.preferredHotelId?.name || '-'}</td>
                <td className="py-3 px-2">{booking.roomId?.roomNumber || '-'}</td>
                <td className="py-3 px-2">{formatDate(booking.checkIn)}</td>
                <td className="py-3 px-2">{booking.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((hotel) => (
        <div key={hotel.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-gray-200 p-4">
          <div>
            <p className="font-semibold text-gray-900">{hotel.name}</p>
            <p className="text-sm text-gray-600">{hotel.location}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-700">{hotel.availableInventory} {hotel.inventoryLabel} available</p>
            <button onClick={() => onViewHotel(hotel.id)} className="text-primary hover:underline text-sm">
              View Business
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserTable({ title, rows, onDelete }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">Name</th>
              <th className="text-left py-3 px-2">Email</th>
              <th className="text-left py-3 px-2">Phone</th>
              <th className="text-left py-3 px-2">Role</th>
              <th className="text-left py-3 px-2">Joined</th>
              <th className="text-right py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((appUser) => (
              <tr key={appUser._id} className="border-b border-gray-100">
                <td className="py-3 px-2">{appUser.name}</td>
                <td className="py-3 px-2">{appUser.email}</td>
                <td className="py-3 px-2">{appUser.phone || '-'}</td>
                <td className="py-3 px-2">{appUser.role}</td>
                <td className="py-3 px-2">{new Date(appUser.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-2 text-right">
                  <button onClick={() => onDelete(appUser._id)} className="text-red-600 hover:underline text-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 border border-gray-100">
      <p className="text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function metricTitle(metricView) {
  if (metricView === 'available-rooms') return 'Available Services List';
  if (metricView === 'total-bookings') return 'All Bookings List';
  return 'All Businesses List';
}

function formatBusinessType(value) {
  return String(value || 'hotel')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInventoryMeta(type) {
  const normalizedType = String(type || 'hotel')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[ /]+/g, '-');

  if (
    [
      'hotel',
      'hotels-and-resorts',
      'homestays-and-guesthouses',
      'tent-rentals-and-camping-sites',
      'vacation-rentals-and-apartments',
    ].includes(normalizedType)
  ) {
    return { supportsRooms: true, inventoryLabel: 'rooms' };
  }

  if (
    [
      'car-rentals',
      'motorbike-and-scooter-rentals',
      'taxi-and-ride-services',
      'bus-and-minivan-charters',
    ].includes(normalizedType)
  ) {
    return { supportsRooms: false, inventoryLabel: 'vehicles' };
  }

  return { supportsRooms: false, inventoryLabel: 'services' };
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}
