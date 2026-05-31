const DEFAULT_API_BASE_URL = "http://localhost:5000";
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
const AUTH_STORAGE_KEY = "tourconnect_auth";
const LEGACY_USER_KEY = "toorconnect_user";

export const getAuthData = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  const legacyUserRaw = localStorage.getItem(LEGACY_USER_KEY);
  if (legacyUserRaw) {
    try {
      const user = JSON.parse(legacyUserRaw);
      return { user, token: null };
    } catch {
      localStorage.removeItem(LEGACY_USER_KEY);
    }
  }

  return null;
};

export const saveAuthData = (authData) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const clearAuthData = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

const buildHeaders = (token, customHeaders = {}) => {
  const headers = { ...customHeaders };
  if (!headers["Content-Type"] && !(customHeaders instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const apiRequest = async (path, { method = "GET", body, token, headers } = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(token, headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach SafarisCon API at ${API_BASE_URL}. Check VITE_API_BASE_URL, backend hosting, HTTPS, and CORS. Original error: ${error.message}`
    );
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    try {
      const fallbackText = await response.text();
      payload = fallbackText ? { message: fallbackText } : {};
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
};

export const uploadRequest = async (path, { method = "POST", formData, token } = {}) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.message || "Upload failed.");
  }

  return payload;
};

export const pingBackend = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-cache",
    });
  } catch (error) {
    // Ignore ping failures; this is only to keep the backend awake if reachable.
    console.warn("Backend ping failed:", error);
  }
};

export const authApi = {
  login: (email, password) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (userData) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: userData,
    }),
  completeHotelRegistration: (payload) =>
    apiRequest("/api/auth/hotel/complete-registration", {
      method: "POST",
      body: payload,
    }),
};

export const adminApi = {
  getStats: (token) => apiRequest("/api/admin/dashboard-stats", { token }),
  getBusinesses: (token) => apiRequest("/api/admin/businesses", { token }),
  getHotels: (token) => apiRequest("/api/admin/hotels", { token }),
  getUsers: (token) => apiRequest("/api/admin/users", { token }),
  getBookings: (token) => apiRequest("/api/admin/bookings", { token }),
  approveBooking: (token, bookingId, payload = {}) =>
    apiRequest(`/api/admin/bookings/${bookingId}/approve`, {
      method: "PUT",
      token,
      body: payload,
    }),
  verifyBooking: (token, lookup) => apiRequest(`/api/admin/booking-verification/${encodeURIComponent(lookup)}`, { token }),
  getServices: (token) => apiRequest("/api/admin/services", { token }),
  getTransactions: (token) => apiRequest("/api/admin/transactions", { token }),
  createSeller: (token, payload) =>
    apiRequest("/api/admin/sellers", {
      method: "POST",
      token,
      body: payload,
    }),
  updateAnnouncement: (token, payload) =>
    apiRequest("/api/admin/announcement", {
      method: "PUT",
      token,
      body: payload,
    }),
  updateBusinessVerification: (token, businessId, status) =>
    apiRequest(`/api/admin/businesses/${businessId}/verification`, {
      method: "PUT",
      token,
      body: { status },
    }),
  getRooms: (token) => apiRequest("/api/admin/rooms", { token }),
  getHotelRooms: (token, hotelId) =>
    apiRequest(`/api/admin/hotels/${hotelId}/rooms`, { token }),
  getHotelStatus: (token, hotelId) =>
    apiRequest(`/api/admin/hotels/${hotelId}/status`, { token }),
  uploadImage: (token, file) => {
    const formData = new FormData();
    formData.append("image", file);

    return uploadRequest("/api/admin/uploads/image", {
      method: "POST",
      token,
      formData,
    });
  },
  registerBusiness: (token, payload) =>
    apiRequest("/api/admin/register-business", {
      method: "POST",
      token,
      body: payload,
    }),
  registerHotel: (token, payload) =>
    apiRequest("/api/admin/register-hotel", {
      method: "POST",
      token,
      body: payload,
    }),
  connectTour: (token, payload) =>
    apiRequest("/api/admin/connect-tour", {
      method: "POST",
      token,
      body: payload,
    }),
  acknowledgeRequest: (token, payload) =>
    apiRequest("/api/admin/acknowledge-request", {
      method: "POST",
      token,
      body: payload,
    }),
  deleteHotel: (token, hotelId) =>
    apiRequest(`/api/admin/hotels/${hotelId}`, {
      method: "DELETE",
      token,
    }),
  deleteUser: (token, userId) =>
    apiRequest(`/api/admin/users/${userId}`, {
      method: "DELETE",
      token,
    }),
  deleteUsers: (token, userIds) =>
    apiRequest("/api/admin/users/bulk", {
      method: "DELETE",
      token,
      body: { userIds },
    }),
  deleteBusiness: (token, businessId) =>
    apiRequest(`/api/admin/businesses/${businessId}`, {
      method: "DELETE",
      token,
    }),
  purgeVisitors: (token) =>
    apiRequest("/api/admin/users/visitors/purge", {
      method: "DELETE",
      token,
    }),
};

export const hotelApi = {
  getOverview: (token) => apiRequest("/api/hotel/overview", { token }),
  getMyBookings: (token) => apiRequest("/api/hotel/bookings", { token }),
  getMyRooms: (token) => apiRequest("/api/hotel/rooms", { token }),
  updateBookingStatus: (token, bookingId, payload) =>
    apiRequest(`/api/hotel/bookings/${bookingId}/status`, {
      method: "PUT",
      token,
      body: payload,
    }),
  getMyServices: (token) => apiRequest("/api/hotel/services", { token }),
  uploadServiceImages: (token, files = []) => {
    const formData = new FormData();
    files.slice(0, 3).forEach((file) => formData.append("images", file));
    return uploadRequest("/api/hotel/uploads/images", {
      method: "POST",
      token,
      formData,
    });
  },
  createRoom: (token, payload) =>
    apiRequest("/api/hotel/rooms", {
      method: "POST",
      token,
      body: payload,
    }),
  updateRoom: (token, roomId, payload) =>
    apiRequest(`/api/hotel/rooms/${roomId}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  createService: (token, payload) =>
    apiRequest("/api/hotel/services", {
      method: "POST",
      token,
      body: payload,
    }),
  updateService: (token, serviceId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  deleteService: (token, serviceId) =>
    apiRequest(`/api/hotel/services/${serviceId}`, {
      method: "DELETE",
      token,
    }),
  deleteRoom: (token, roomId) =>
    apiRequest(`/api/hotel/rooms/${roomId}`, {
      method: "DELETE",
      token,
    }),
};

export const bookingApi = {
  requestBooking: (token, payload) =>
    apiRequest("/api/bookings/request", {
      method: "POST",
      token,
      body: payload,
    }),
  verifyBooking: (token, lookup) => apiRequest(`/api/hotel/booking-verification/${encodeURIComponent(lookup)}`, { token }),
  bookService: (token, payload) =>
    apiRequest("/api/bookings/request", {
      method: "POST",
      token,
      body: {
        hotelId: payload.serviceId,
        quantity: payload.quantity,
        guests: payload.quantity,
        checkIn: payload.startDate,
        checkOut: payload.endDate,
        totalPrice: payload.bookingDetails?.totalPrice || payload.totalPrice || 0,
        destinationPlace: payload.destinationPlace,
        destinationLocation: payload.destinationLocation,
        bookingDetails: payload.bookingDetails,
      },
    }),
  getMyBookings: (token) => apiRequest("/api/bookings/my", { token }),
  payBooking: (token, bookingId, payload) =>
    apiRequest(`/api/bookings/${bookingId}/pay`, {
      method: "POST",
      token,
      body: payload,
    }),
  getReceiptUrl: (bookingOrToken) =>
    bookingOrToken ? `${API_BASE_URL}/api/receipt/${encodeURIComponent(bookingOrToken)}` : "",
  getVerifyUrl: (token) => `${window.location.origin}/verify/${encodeURIComponent(token)}`,
  getQrImageUrl: (token) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(`${window.location.origin}/verify/${token}`)}`,
};

export const publicApi = {
  getHotels: () => apiRequest("/api/hotels"),
  getAnnouncement: () => apiRequest("/api/announcement"),
  verifyBooking: (token) => apiRequest(`/api/verify/${token}`),
};

export { API_BASE_URL };
