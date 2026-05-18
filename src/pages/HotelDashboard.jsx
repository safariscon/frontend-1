/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, isSellerRole } from '../lib/dashboard';
import { getAuthData, hotelApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { REALTIME_EVENTS, joinRealtimeRoom, subscribeToRealtime } from '../lib/realtime';

const AUTO_REFRESH_MS = 15000;

const BUSINESS_GROUPS = {
  accommodation: new Set([
    'hotel',
    'hotels-and-resorts',
    'homestays-and-guesthouses',
    'tent-rentals-and-camping-sites',
    'vacation-rentals-and-apartments',
  ]),
  transport: new Set([
    'transport-service',
    'car-rentals',
    'motorbike-and-scooter-rentals',
    'taxi-and-ride-services',
    'bus-and-minivan-charters',
  ]),
  food: new Set([
    'restaurant-cafe',
    'restaurants',
    'bars-and-pubs',
    'coffee-shops-and-cafes',
    'food-trucks-and-street-food-stalls',
  ]),
  events: new Set([
    'event-hall',
    'conference-event-halls-mice',
    'wedding-venues',
    'entertainment-venues',
  ]),
  tours: new Set([
    'tours-experiences',
    'tour-and-activity-operators',
    'gear-rentals',
  ]),
  wellness: new Set(['spas-and-wellness-centers', 'childcare-services']),
  retail: new Set(['souvenir-shops-and-craft-markets']),
};

function normalizeBusinessType(value) {
  return String(value || 'hotel')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[ /]+/g, '-');
}

function resolveBusinessGroup(type) {
  const normalized = normalizeBusinessType(type);
  const foundGroup = Object.entries(BUSINESS_GROUPS).find(([, values]) =>
    values.has(normalized)
  );
  return foundGroup?.[0] || 'general';
}

function getSellerConfig(type) {
  const normalizedType = normalizeBusinessType(type);
  const group = resolveBusinessGroup(normalizedType);

  const shared = {
    type: normalizedType,
    group,
    typeLabel: formatBusinessType(normalizedType),
    pricingUnit: 'service',
    availabilityLabel: 'Availability',
    inventoryLabel: 'Listings',
    inventoryItemLabel: 'listing',
    managementLabel: 'Listings Management',
    bookingLabel: 'Reservations',
    bookingDescription: 'Track reservations and respond to customer requests.',
    metricLabel: 'Active Listings',
    listingCategoryLabel: 'Category',
    supportsRooms: false,
  };

  if (group === 'accommodation') {
    return {
      ...shared,
      pricingUnit: 'night',
      availabilityLabel: 'Night Availability',
      inventoryLabel: 'Rooms',
      inventoryItemLabel: 'room',
      managementLabel: 'Room Management',
      bookingLabel: 'Bookings',
      bookingDescription: 'Manage room bookings and live room availability.',
      metricLabel: 'Available Rooms',
      listingCategoryLabel: 'Room category',
      supportsRooms: true,
    };
  }

  if (group === 'transport') {
    return {
      ...shared,
      pricingUnit: 'day',
      availabilityLabel: 'Vehicle Availability',
      inventoryLabel: 'Vehicles',
      inventoryItemLabel: 'vehicle',
      managementLabel: 'Vehicle Management',
      bookingLabel: 'Reservations',
      bookingDescription: 'Manage vehicle rentals, transfers, and dispatch requests.',
      metricLabel: 'Active Vehicles',
      listingCategoryLabel: 'Vehicle type',
    };
  }

  if (group === 'food') {
    return {
      ...shared,
      pricingUnit: 'table',
      availabilityLabel: 'Table / Order Availability',
      inventoryLabel: 'Menu & Tables',
      inventoryItemLabel: 'menu item',
      managementLabel: 'Menu Management',
      bookingLabel: 'Orders / Reservations',
      bookingDescription: 'Handle reservations, menu items, and customer orders.',
      metricLabel: 'Active Menu Items',
      listingCategoryLabel: 'Menu section',
    };
  }

  if (group === 'events') {
    return {
      ...shared,
      pricingUnit: 'event',
      availabilityLabel: 'Venue Availability',
      inventoryLabel: 'Venues & Packages',
      inventoryItemLabel: 'venue package',
      managementLabel: 'Venue Management',
      bookingLabel: 'Venue Bookings',
      bookingDescription: 'Manage event space bookings, packages, and schedules.',
      metricLabel: 'Active Venue Packages',
      listingCategoryLabel: 'Venue package type',
    };
  }

  if (group === 'tours') {
    return {
      ...shared,
      pricingUnit: 'person',
      availabilityLabel: 'Activity Schedule',
      inventoryLabel: 'Activities',
      inventoryItemLabel: 'activity',
      managementLabel: 'Activity Management',
      bookingLabel: 'Activity Reservations',
      bookingDescription: 'Manage scheduled activities, departure times, and reservations.',
      metricLabel: 'Scheduled Activities',
      listingCategoryLabel: 'Activity category',
    };
  }

  if (group === 'wellness') {
    return {
      ...shared,
      pricingUnit: 'hour',
      availabilityLabel: 'Session Availability',
      inventoryLabel: 'Sessions & Services',
      inventoryItemLabel: 'session',
      managementLabel: 'Session Management',
      bookingLabel: 'Reservations',
      bookingDescription: 'Manage sessions, appointments, and reservations.',
      metricLabel: 'Active Sessions',
      listingCategoryLabel: 'Session type',
    };
  }

  return {
    ...shared,
    pricingUnit: 'use',
    availabilityLabel: 'Availability',
    inventoryLabel: 'Listings',
    inventoryItemLabel: 'listing',
    managementLabel: 'Listings Management',
    bookingLabel: 'Reservations',
    bookingDescription: 'Manage listings and reservations relevant to this business.',
    metricLabel: 'Active Listings',
    listingCategoryLabel: 'Listing category',
  };
}

export default function HotelDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [metricView, setMetricView] = useState('available');
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    type: 'standard',
    price: '',
    status: 'available',
  });
  const [serviceForm, setServiceForm] = useState({
    category: '',
    name: '',
    description: '',
    price: '',
    unit: '',
    inventory: '1',
    isActive: true,
  });

  const token = getAuthData()?.token;
  const businessType = overview?.hotel?.type || user?.businessType || 'hotel';
  const sellerConfig = useMemo(() => getSellerConfig(businessType), [businessType]);

  const loadData = async ({ silent = false } = {}) => {
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError('');

    try {
      const requests = [
        hotelApi.getOverview(token),
        hotelApi.getMyBookings(token),
        hotelApi.getMyServices(token),
      ];

      if (sellerConfig.supportsRooms) {
        requests.push(hotelApi.getMyRooms(token));
      }

      const [overviewResp, bookingsResp, servicesResp, roomsResp] = await Promise.all(requests);

      setOverview(overviewResp);
      setBookings(bookingsResp.bookings || []);
      setServices(servicesResp.services || []);
      setRooms(sellerConfig.supportsRooms ? roomsResp?.rooms || [] : []);
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

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !isSellerRole(user.role) || !token) return undefined;
    const intervalId = window.setInterval(() => {
      loadData({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, sellerConfig.supportsRooms]);

  useEffect(() => {
    if (!user || !isSellerRole(user.role) || !token) return undefined;
    joinRealtimeRoom('hotel', user.businessId || user.hotelId);
    joinRealtimeRoom('user', user.id || user._id);

    return subscribeToRealtime(
      [
        REALTIME_EVENTS.BOOKING_CHANGED,
        REALTIME_EVENTS.ROOM_CHANGED,
        REALTIME_EVENTS.SERVICE_CHANGED,
        REALTIME_EVENTS.HOTEL_CHANGED,
      ],
      () => loadData({ silent: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, sellerConfig.supportsRooms]);

  useEffect(() => {
    if (activeTab === 'rooms' && !sellerConfig.supportsRooms) {
      setActiveTab('listings');
    }
  }, [activeTab, sellerConfig.supportsRooms]);

  const revenue = useMemo(
    () =>
      bookings
        .filter((booking) => ['confirmed', 'completed'].includes(booking.status))
        .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
    [bookings]
  );

  const availableRooms = useMemo(
    () => rooms.filter((room) => room.status === 'available'),
    [rooms]
  );
  const maintenanceRooms = useMemo(
    () => rooms.filter((room) => room.status === 'maintenance'),
    [rooms]
  );
  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['confirmed', 'pending'].includes(booking.status)),
    [bookings]
  );
  const activeServices = useMemo(
    () => services.filter((service) => service.isActive !== false),
    [services]
  );
  const registeredServices = useMemo(
    () => overview?.hotel?.services || [],
    [overview]
  );
  const businessImage = overview?.hotel?.images?.[0] || null;

  const summaryMetrics = useMemo(() => {
    const items = [
      {
        id: 'available',
        label: sellerConfig.metricLabel,
        value: sellerConfig.supportsRooms ? availableRooms.length : activeServices.length,
        hint: sellerConfig.supportsRooms
          ? 'Live inventory that can be booked right now'
          : 'Listings currently available to customers',
      },
      {
        id: 'bookings',
        label: sellerConfig.bookingLabel,
        value: activeBookings.length,
        hint: 'Pending and confirmed customer requests',
      },
      {
        id: 'services',
        label: sellerConfig.inventoryLabel,
        value: sellerConfig.supportsRooms ? rooms.length : services.length,
        hint: sellerConfig.supportsRooms
          ? 'Total managed units in this business'
          : 'Total active service or listing entries',
      },
    ];

    if (sellerConfig.supportsRooms) {
      items.push({
        id: 'maintenance',
        label: 'Maintenance',
        value: maintenanceRooms.length,
        hint: 'Units unavailable for booking',
      });
    } else {
      items.push({
        id: 'pricing',
        label: 'Pricing',
        value: `${services.filter((service) => service.priceModel?.amount > 0).length}`,
        hint: `Listings with per-${sellerConfig.pricingUnit} pricing configured`,
      });
    }

    return items;
  }, [
    activeBookings.length,
    activeServices.length,
    availableRooms.length,
    maintenanceRooms.length,
    rooms.length,
    sellerConfig,
    services,
  ]);

  const metricItems = useMemo(() => {
    if (metricView === 'bookings') return activeBookings;
    if (metricView === 'maintenance') return maintenanceRooms;
    if (metricView === 'pricing') return services;
    if (metricView === 'services') return sellerConfig.supportsRooms ? rooms : services;
    return sellerConfig.supportsRooms ? availableRooms : activeServices;
  }, [
    activeBookings,
    activeServices,
    availableRooms,
    maintenanceRooms,
    metricView,
    rooms,
    sellerConfig.supportsRooms,
    services,
  ]);

  const tabs = useMemo(() => {
    const items = [
      { id: 'overview', label: 'Overview' },
      {
        id: sellerConfig.supportsRooms ? 'rooms' : 'listings',
        label: sellerConfig.managementLabel,
      },
      { id: 'bookings', label: sellerConfig.bookingLabel },
    ];

    if (sellerConfig.supportsRooms) {
      items.push({ id: 'listings', label: 'Services' });
    }

    return items;
  }, [sellerConfig]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.createRoom(token, {
        roomNumber: roomForm.roomNumber,
        type: roomForm.type,
        price: Number(roomForm.price),
        status: roomForm.status,
      });
      setInfo(response.message);
      setRoomForm({
        roomNumber: '',
        type: 'standard',
        price: '',
        status: 'available',
      });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleRoomStatusChange = async (roomId, status) => {
    if (!token) return;
    setError('');
    setInfo('');
    try {
      const response = await hotelApi.updateRoom(token, roomId, { status });
      setInfo(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!token || !window.confirm(`Delete this ${sellerConfig.inventoryItemLabel}?`)) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.deleteRoom(token, roomId);
      setInfo(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.createService(token, {
        category: serviceForm.category || sellerConfig.group,
        name: serviceForm.name,
        description: serviceForm.description,
        priceModel: {
          type: 'fixed',
          amount: Number(serviceForm.price) || 0,
          currency: 'USD',
          unit: serviceForm.unit || sellerConfig.pricingUnit,
        },
        availabilitySchedule: {
          timezone: 'Africa/Johannesburg',
          inventory: Number(serviceForm.inventory) || 1,
          notes: sellerConfig.availabilityLabel,
        },
        isActive: serviceForm.isActive,
      });
      setInfo(response.message);
      setServiceForm({
        category: '',
        name: '',
        description: '',
        price: '',
        unit: '',
        inventory: '1',
        isActive: true,
      });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleToggleService = async (service) => {
    if (!token) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.updateService(token, service._id, {
        category: service.category,
        name: service.name,
        description: service.description,
        priceModel: service.priceModel,
        availabilitySchedule: service.availabilitySchedule,
        isActive: service.isActive === false,
      });
      setInfo(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!token || !window.confirm(`Delete this ${sellerConfig.inventoryItemLabel}?`)) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.deleteService(token, serviceId);
      setInfo(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleBookingStatusChange = async (bookingId, status) => {
    if (!token) return;

    setError('');
    setInfo('');
    try {
      const response = await hotelApi.updateBookingStatus(token, bookingId, { status });
      setInfo(response.message);
      await loadData();
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
          <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Live business dashboard
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {sellerConfig.typeLabel}
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {overview?.hotel?.name || user?.businessName || 'Business Dashboard'}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                  Manage customer requests, availability, pricing, and listings for this {sellerConfig.typeLabel.toLowerCase()} business. Updates sync in real time across admin, customer, and seller screens.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <InfoPill label="Location" value={overview?.hotel?.location || '-'} />
                  <InfoPill label="Base price" value={formatRwf(overview?.hotel?.basePrice || 0)} />
                  <InfoPill label="Contact" value={overview?.hotel?.contactInfo || overview?.hotel?.ownerEmail || '-'} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {registeredServices.length > 0 ? (
                    registeredServices.slice(0, 8).map((service) => (
                      <span
                        key={service}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Add services from Listings Management
                    </span>
                  )}
                </div>
              </div>

              <div className="relative min-h-[240px] bg-slate-900">
                {businessImage ? (
                  <img
                    src={businessImage}
                    alt={overview?.hotel?.name || 'Business'}
                    className="absolute inset-0 h-full w-full object-cover opacity-80"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-slate-900 to-sky-800" />
                )}
                <div className="absolute inset-0 bg-slate-950/30" />
                <div className="relative flex h-full flex-col justify-end p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Realtime status</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <HeroStat label={sellerConfig.bookingLabel} value={overview?.stats?.bookings ?? bookings.length} />
                    <HeroStat
                      label={sellerConfig.supportsRooms ? 'Available rooms' : 'Active listings'}
                      value={sellerConfig.supportsRooms ? overview?.stats?.availableRooms ?? 0 : activeServices.length}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadData()}
                    className="mt-5 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Refresh Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {(error || info) && (
            <div className="mb-6 space-y-2">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
              {info && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{info}</div>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Metric label="Business Type" value={sellerConfig.typeLabel} />
            <Metric label={sellerConfig.bookingLabel} value={overview?.stats?.bookings ?? bookings.length} />
            <Metric label="Revenue" value={formatRwf(revenue)} />
            <Metric
              label={sellerConfig.supportsRooms ? 'Available Rooms' : sellerConfig.metricLabel}
              value={sellerConfig.supportsRooms ? overview?.stats?.availableRooms ?? 0 : activeServices.length}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {sellerMetricTitle(metricView, sellerConfig)}
                </h2>
                <p className="text-sm text-gray-600">
                  Seller data refreshes automatically every {AUTO_REFRESH_MS / 1000} seconds.
                </p>
              </div>
            </div>
            <SellerMetricDrilldown
              metricView={metricView}
              items={metricItems}
              supportsRooms={sellerConfig.supportsRooms}
              inventoryItemLabel={sellerConfig.inventoryItemLabel}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <p className="text-gray-600">Loading seller dashboard...</p>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business profile</p>
                          <h3 className="mt-2 text-2xl font-black text-slate-950">{overview?.hotel?.name}</h3>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{overview?.hotel?.description || 'No description added yet.'}</p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoPill label="Type" value={sellerConfig.typeLabel} />
                            <InfoPill label="Location" value={overview?.hotel?.location || '-'} />
                            <InfoPill label="Starting price" value={formatRwf(overview?.hotel?.basePrice || 0)} />
                            <InfoPill label="Contact" value={overview?.hotel?.contactInfo || '-'} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered customer services</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {registeredServices.length > 0 ? (
                              registeredServices.map((service) => (
                                <span
                                  key={service}
                                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800"
                                >
                                  {service}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-slate-600">No services were registered for this business yet.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                        <h4 className="font-bold text-blue-900 mb-2">Business-ready tools</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                          <FeatureCard title="Listings Management" description={`Create, update, and remove ${sellerConfig.inventoryItemLabel}s.`} />
                          <FeatureCard title={sellerConfig.availabilityLabel} description={`Control availability by ${sellerConfig.pricingUnit}.`} />
                          <FeatureCard title="Pricing Management" description={`Set per-${sellerConfig.pricingUnit} pricing for each listing.`} />
                          <FeatureCard title={sellerConfig.bookingLabel} description={sellerConfig.bookingDescription} />
                        </div>
                      </div>

                      {sellerConfig.supportsRooms ? (
                        <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
                          <h4 className="font-bold text-green-900 mb-2">Free room numbers available now</h4>
                          {availableRooms.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {availableRooms.map((room) => (
                                <span
                                  key={room._id}
                                  className="px-3 py-1 rounded-full bg-white border border-green-200 text-green-900 text-sm"
                                >
                                  Room {room.roomNumber} - {formatRwf(room.price)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-green-900">No free rooms right now.</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                          <h4 className="font-bold text-amber-900 mb-2">{sellerConfig.availabilityLabel}</h4>
                          <p className="text-sm text-amber-900">
                            Manage schedules and inventory from the {sellerConfig.managementLabel.toLowerCase()} tab.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'rooms' && sellerConfig.supportsRooms && (
                    <div className="space-y-8">
                      <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <input
                          type="text"
                          required
                          placeholder="Room Number"
                          value={roomForm.roomNumber}
                          onChange={(e) => setRoomForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="text"
                          placeholder="Type"
                          value={roomForm.type}
                          onChange={(e) => setRoomForm((prev) => ({ ...prev, type: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="number"
                          required
                          placeholder="Price per night"
                          value={roomForm.price}
                          onChange={(e) => setRoomForm((prev) => ({ ...prev, price: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <select
                          value={roomForm.status}
                          onChange={(e) => setRoomForm((prev) => ({ ...prev, status: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        >
                          <option value="available">available</option>
                          <option value="occupied">occupied</option>
                          <option value="maintenance">maintenance</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark"
                        >
                          Add Room
                        </button>
                      </form>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2">Room #</th>
                              <th className="text-left py-3 px-2">Type</th>
                              <th className="text-left py-3 px-2">Price</th>
                              <th className="text-left py-3 px-2">Status</th>
                              <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rooms.map((room) => (
                              <tr key={room._id} className="border-b border-gray-100">
                                <td className="py-3 px-2">{room.roomNumber}</td>
                                <td className="py-3 px-2">{room.type}</td>
                                <td className="py-3 px-2">{formatRwf(room.price)}</td>
                                <td className="py-3 px-2">
                                  <select
                                    value={room.status}
                                    onChange={(e) => handleRoomStatusChange(room._id, e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="available">available</option>
                                    <option value="occupied">occupied</option>
                                    <option value="maintenance">maintenance</option>
                                  </select>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => handleDeleteRoom(room._id)}
                                    className="text-red-600 hover:underline text-sm"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'listings' && (
                    <div className="space-y-8">
                      <form onSubmit={handleCreateService} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder={sellerConfig.listingCategoryLabel}
                          value={serviceForm.category}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, category: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="text"
                          required
                          placeholder={`Name your ${sellerConfig.inventoryItemLabel}`}
                          value={serviceForm.name}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="number"
                          placeholder={`Price per ${sellerConfig.pricingUnit}`}
                          value={serviceForm.price}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="text"
                          placeholder={`Pricing unit (${sellerConfig.pricingUnit})`}
                          value={serviceForm.unit}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, unit: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Inventory"
                          value={serviceForm.inventory}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, inventory: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl"
                        />
                        <label className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={serviceForm.isActive}
                            onChange={(e) => setServiceForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                          />
                          Active listing
                        </label>
                        <textarea
                          required
                          placeholder="Description"
                          value={serviceForm.description}
                          onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="md:col-span-2 xl:col-span-3 px-4 py-3 border border-gray-300 rounded-xl"
                          rows={3}
                        />
                        <button
                          type="submit"
                          className="md:col-span-2 xl:col-span-3 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark"
                        >
                          Add {capitalize(sellerConfig.inventoryItemLabel)}
                        </button>
                      </form>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2">Name</th>
                              <th className="text-left py-3 px-2">{sellerConfig.listingCategoryLabel}</th>
                              <th className="text-left py-3 px-2">Price</th>
                              <th className="text-left py-3 px-2">{sellerConfig.availabilityLabel}</th>
                              <th className="text-left py-3 px-2">Status</th>
                              <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {services.map((service) => (
                              <tr key={service._id} className="border-b border-gray-100">
                                <td className="py-3 px-2">
                                  <div>
                                    <p className="font-medium text-gray-900">{service.name}</p>
                                    <p className="text-xs text-gray-500">{service.description || '-'}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-2">{service.category || '-'}</td>
                                <td className="py-3 px-2">
                                  {formatRwf(service.priceModel?.amount || 0)} / {service.priceModel?.unit || sellerConfig.pricingUnit}
                                </td>
                                <td className="py-3 px-2">
                                  {service.availabilitySchedule?.inventory ?? 1} units
                                </td>
                                <td className="py-3 px-2">{service.isActive === false ? 'inactive' : 'active'}</td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex items-center justify-end gap-4">
                                    <button
                                      onClick={() => handleToggleService(service)}
                                      className="text-primary hover:underline text-sm"
                                    >
                                      {service.isActive === false ? 'Activate' : 'Pause'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteService(service._id)}
                                      className="text-red-600 hover:underline text-sm"
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
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-2">Customer</th>
                            <th className="text-left py-3 px-2">Destination</th>
                            <th className="text-left py-3 px-2">Reservation Details</th>
                            <th className="text-left py-3 px-2">Dates</th>
                            <th className="text-left py-3 px-2">Status</th>
                            <th className="text-right py-3 px-2">Total</th>
                            <th className="text-right py-3 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking._id} className="border-b border-gray-100">
                              <td className="py-3 px-2">{booking.touristId?.name || booking.touristId?.email || 'Unknown'}</td>
                              <td className="py-3 px-2">
                                {booking.destinationPlace} ({booking.destinationLocation})
                              </td>
                              <td className="py-3 px-2">
                                {sellerConfig.supportsRooms
                                  ? `Room ${booking.roomId?.roomNumber || '-'}`
                                  : `${sellerConfig.inventoryItemLabel} reservation`}
                              </td>
                              <td className="py-3 px-2">
                                {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                              </td>
                              <td className="py-3 px-2">{booking.status}</td>
                              <td className="py-3 px-2 text-right">{formatRwf(booking.totalPrice || 0)}</td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => handleBookingStatusChange(booking._id, 'confirmed')}
                                    className="text-green-700 hover:underline text-sm"
                                    disabled={booking.status === 'confirmed'}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleBookingStatusChange(booking._id, 'cancelled')}
                                    className="text-red-600 hover:underline text-sm"
                                    disabled={booking.status === 'cancelled'}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SellerMetricDrilldown({ metricView, items, supportsRooms, inventoryItemLabel }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-600">No records to show for this section yet.</p>;
  }

  if (metricView === 'bookings') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2">Customer</th>
              <th className="text-left py-3 px-2">Destination</th>
              <th className="text-left py-3 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((booking) => (
              <tr key={booking._id} className="border-b border-gray-100">
                <td className="py-3 px-2">{booking.touristId?.name || booking.touristId?.email || 'Unknown'}</td>
                <td className="py-3 px-2">
                  {booking.destinationPlace} <span className="text-gray-500">({booking.destinationLocation})</span>
                </td>
                <td className="py-3 px-2">{booking.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (supportsRooms) {
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((room) => (
          <div key={room._id} className="rounded-xl border border-gray-200 p-4 min-w-[200px]">
            <p className="font-semibold text-gray-900">Room {room.roomNumber}</p>
            <p className="text-sm text-gray-600">{room.type}</p>
            <p className="text-sm text-gray-700 mt-1">{formatRwf(room.price)}</p>
            <p className="text-xs text-gray-500 mt-2">Status: {room.status}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((service) => (
        <div key={service._id} className="rounded-xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-900">{service.name || capitalize(inventoryItemLabel)}</p>
          <p className="text-sm text-gray-600">{service.category || '-'}</p>
          <p className="text-sm text-gray-700 mt-1">
            {formatRwf(service.priceModel?.amount || 0)} / {service.priceModel?.unit || 'use'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Inventory: {service.availabilitySchedule?.inventory ?? 1}
          </p>
        </div>
      ))}
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

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-xl bg-white border border-blue-100 p-4">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-gray-600 mt-1">{description}</p>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
      <p className="text-xs text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function sellerMetricTitle(metricView, sellerConfig) {
  if (metricView === 'bookings') return `${sellerConfig.bookingLabel} List`;
  if (metricView === 'maintenance') return 'Maintenance List';
  if (metricView === 'pricing') return 'Pricing Setup List';
  if (metricView === 'services') return `${sellerConfig.inventoryLabel} List`;
  return sellerConfig.supportsRooms ? 'Available Room List' : `${sellerConfig.metricLabel} List`;
}

function formatBusinessType(value) {
  return String(value || 'hotel')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function capitalize(value) {
  return String(value || '')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}
