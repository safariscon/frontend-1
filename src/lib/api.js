const DEFAULT_API_BASE_URL = "http://localhost:5000";
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
const AUTH_STORAGE_KEY = "tourconnect_auth";
const LEGACY_USER_KEY = "toorconnect_user";
const AUTH_EXPIRED_EVENT = "auth:expired";
const AUTH_REFRESH_SKIP_PREFIXES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/email/",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/provider/",
];

let memorySession = null;
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload || {};
    this.code = payload?.code;
  }
}

const normalizeSession = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const accessToken = raw.accessToken || raw.token || null;
  const refreshToken = raw.refreshToken || null;
  return {
    user: raw.user || null,
    token: accessToken,
    accessToken,
    refreshToken,
    rememberMe: Boolean(raw.rememberMe ?? refreshToken),
    accessTokenExpiresIn: raw.accessTokenExpiresIn,
    refreshTokenExpiresIn: raw.refreshTokenExpiresIn,
  };
};

const readStoredSession = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    try {
      return normalizeSession(JSON.parse(raw));
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  const legacyUserRaw = localStorage.getItem(LEGACY_USER_KEY);
  if (legacyUserRaw) {
    try {
      const user = JSON.parse(legacyUserRaw);
      return normalizeSession({ user, token: null });
    } catch {
      localStorage.removeItem(LEGACY_USER_KEY);
    }
  }

  return null;
};

export const getAuthData = () => {
  if (memorySession) return memorySession;
  memorySession = readStoredSession();
  return memorySession;
};

export const persistAuthSession = (result = {}, { rememberMe } = {}) => {
  const previous = getAuthData() || {};
  const isAuthTokenResponse =
    result.accessToken != null || result.token != null || Object.prototype.hasOwnProperty.call(result, "refreshToken");

  const accessToken = isAuthTokenResponse
    ? result.accessToken || result.token || null
    : result.accessToken || result.token || previous.accessToken || null;
  const refreshToken = isAuthTokenResponse
    ? result.refreshToken || null
    : previous.refreshToken || null;

  const explicitRememberMe = rememberMe ?? result.rememberMe;
  const persistToStorage =
    explicitRememberMe === true ||
    (explicitRememberMe !== false && Boolean(accessToken || result.user || refreshToken));

  const session = normalizeSession({
    user: result.user || previous.user || null,
    accessToken,
    token: accessToken,
    refreshToken,
    rememberMe: Boolean(explicitRememberMe === true || (persistToStorage && refreshToken)),
    accessTokenExpiresIn: result.accessTokenExpiresIn ?? previous.accessTokenExpiresIn,
    refreshTokenExpiresIn: result.refreshTokenExpiresIn ?? previous.refreshTokenExpiresIn,
  });

  memorySession = session;

  if (persistToStorage) {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: session.user,
        token: session.token,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        rememberMe: session.rememberMe,
      })
    );
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  localStorage.removeItem(LEGACY_USER_KEY);
  return session;
};

export const saveAuthData = (authData) => persistAuthSession(authData);

export const clearAuthData = () => {
  memorySession = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const expireAuthSession = () => {
  clearAuthData();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
};

const shouldSkipAuthRefresh = (path) =>
  AUTH_REFRESH_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));

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

const parseResponsePayload = async (response) => {
  try {
    return await response.json();
  } catch {
    try {
      const fallbackText = await response.text();
      return fallbackText ? { message: fallbackText } : {};
    } catch {
      return {};
    }
  }
};

export const refreshSession = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const current = getAuthData();
    if (!current?.refreshToken) {
      throw new ApiError("No refresh token.", { status: 401 });
    }

    const result = await apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: current.refreshToken },
      skipAuthRefresh: true,
      token: null,
    });

    return persistAuthSession(
      {
        ...result,
        user: result.user || current.user,
      },
      { rememberMe: true }
    );
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const retryAfterRefresh = async (path, options, error) => {
  const canRefresh =
    error.status === 401 &&
    !options.skipAuthRefresh &&
    !shouldSkipAuthRefresh(path) &&
    Boolean(getAuthData()?.refreshToken);

  if (!canRefresh) return null;

  try {
    await refreshSession();
    return apiRequest(path, {
      ...options,
      token: getAuthData()?.token,
      skipAuthRefresh: true,
    });
  } catch {
    expireAuthSession();
    return null;
  }
};

export const apiRequest = async (path, { method = "GET", body, token, headers, skipAuthRefresh = false } = {}) => {
  const accessToken = token === undefined ? getAuthData()?.token ?? null : token;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(accessToken, headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach SafarisCon API at ${API_BASE_URL}. Check VITE_API_BASE_URL, backend hosting, HTTPS, and CORS. Original error: ${error.message}`
    );
  }

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    const error = new ApiError(payload.message || "Request failed.", {
      status: response.status,
      payload,
    });
    const retried = await retryAfterRefresh(
      path,
      { method, body, headers, skipAuthRefresh },
      error
    );
    if (retried) return retried;
    if (error.status === 403 && error.code === "TERMS_NOT_ACCEPTED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:terms-required", { detail: error.payload }));
      }
    } else if (error.status === 401 && !shouldSkipAuthRefresh(path) && getAuthData()) {
      expireAuthSession();
    }
    throw error;
  }

  return payload;
};

export const uploadRequest = async (path, { method = "POST", formData, token, skipAuthRefresh = false } = {}) => {
  const accessToken = token === undefined ? getAuthData()?.token ?? null : token;
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
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
    const error = new ApiError(payload.message || "Upload failed.", {
      status: response.status,
      payload,
    });
    const canRefresh =
      error.status === 401 &&
      !skipAuthRefresh &&
      !shouldSkipAuthRefresh(path) &&
      Boolean(getAuthData()?.refreshToken);

    if (canRefresh) {
      try {
        await refreshSession();
        return uploadRequest(path, {
          method,
          formData,
          token: getAuthData()?.token,
          skipAuthRefresh: true,
        });
      } catch {
        expireAuthSession();
      }
    } else if (error.status === 403 && error.code === "TERMS_NOT_ACCEPTED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:terms-required", { detail: error.payload }));
      }
    } else if (error.status === 401 && getAuthData()) {
      expireAuthSession();
    }

    throw error;
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
  login: (email, password, rememberMe = false) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password, rememberMe: Boolean(rememberMe) },
      skipAuthRefresh: true,
    }),
  resendLoginOtp: (email) =>
    apiRequest("/api/auth/login/resend-otp", {
      method: "POST",
      body: { email },
      skipAuthRefresh: true,
    }),
  verifyLoginOtp: (email, otp) =>
    apiRequest("/api/auth/login/verify-otp", {
      method: "POST",
      body: { email, otp },
      skipAuthRefresh: true,
    }),
  refresh: (refreshToken) =>
    apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuthRefresh: true,
      token: null,
    }),
  logout: (refreshToken) =>
    apiRequest("/api/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
      skipAuthRefresh: true,
      token: null,
    }),
  register: (userData) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: userData,
      skipAuthRefresh: true,
    }),
  resendEmailVerificationOtp: (email) =>
    apiRequest("/api/auth/email/resend-verification-otp", {
      method: "POST",
      body: { email },
      skipAuthRefresh: true,
    }),
  verifyEmailOtp: (email, otp) =>
    apiRequest("/api/auth/email/verify-otp", {
      method: "POST",
      body: { email, otp },
      skipAuthRefresh: true,
    }),
  forgotPassword: (email) =>
    apiRequest("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
      skipAuthRefresh: true,
    }),
  resetPassword: (email, otp, newPassword) =>
    apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: { email, otp, newPassword },
      skipAuthRefresh: true,
    }),
  changePassword: (token, payload) =>
    apiRequest("/api/auth/change-password", {
      method: "POST",
      token,
      body: payload,
    }),
  completeProviderRegistration: (payload) => {
    const businessName = String(payload?.businessName || payload?.providerName || '').trim();
    const payoutDetails = payload?.payoutDetails || {};
    const method = payoutDetails.method === 'bank' ? 'bank' : 'momo';
    const accountNumber = String(payoutDetails.accountNumber || payoutDetails.msisdn || '').trim();
    return apiRequest("/api/auth/provider/complete-registration", {
      method: "POST",
      body: {
        sellerId: payload.sellerId,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
        acceptedTerms: true,
        providerName: businessName || undefined,
        providerEmail: payload.providerEmail,
        businessName,
        payoutMethod: method,
        payoutDetails: {
          method,
          providerId: String(payoutDetails.providerId || '').trim(),
          accountName: String(payoutDetails.accountName || businessName).trim(),
          accountNumber,
          ...(method === 'momo' ? { msisdn: accountNumber } : {}),
        },
      },
      skipAuthRefresh: true,
    });
  },
  getProviderOnboarding: (sellerId) => {
    const id = encodeURIComponent(String(sellerId || "").trim());
    return apiRequest(`/api/auth/provider/onboarding?sellerId=${id}`, {
      skipAuthRefresh: true,
      token: null,
    }).catch((error) => {
      if (error?.status !== 404 && error?.status !== 400) throw error;
      return apiRequest(`/api/auth/provider/onboarding/${id}`, {
        skipAuthRefresh: true,
        token: null,
      });
    });
  },
  acceptTerms: () =>
    apiRequest("/api/auth/accept-terms", {
      method: "POST",
      body: { acceptedTerms: true },
    }),
};

const buildQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
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
  rejectBooking: (token, bookingId, payload = {}) =>
    apiRequest(`/api/admin/bookings/${bookingId}/reject`, {
      method: "PUT",
      token,
      body: payload,
    }),
  updateMarketplaceSettings: (token, payload) =>
    apiRequest("/api/admin/marketplace-settings", { method: "PUT", token, body: payload }),
  updateServiceBookingMode: (token, businessId, bookingMode) =>
    apiRequest(`/api/admin/businesses/${businessId}/booking-mode`, { method: "PUT", token, body: { bookingMode } }),
  verifyBooking: (token, lookup) => apiRequest(`/api/admin/booking-verification/${encodeURIComponent(lookup)}`, { token }),
  getServices: (token, query = {}) =>
    apiRequest("/api/admin/services" + (typeof query === "string" ? query : buildQueryString(query)), { token }),
  getService: (token, serviceId) =>
    apiRequest(`/api/admin/services/${serviceId}`, { token }),
  updateServiceApproval: (token, serviceId, payload) =>
    apiRequest(`/api/admin/services/${serviceId}/approval`, {
      method: "PUT",
      token,
      body: typeof payload === "string" ? { status: payload } : payload,
    }),
  getTransactions: (token, query = "") => apiRequest("/api/admin/transactions" + query, { token }),
  getStorageOverview: (token) => apiRequest("/api/admin/storage/overview", { token }),
  getMongoStorage: (token) => apiRequest("/api/admin/storage/mongodb", { token }),
  getCloudinaryStorage: (token) => apiRequest("/api/admin/storage/cloudinary", { token }),
  getAnalyticsOverview: (token, query = "") => apiRequest("/api/admin/analytics/overview" + query, { token }),
  getAnalyticsServices: (token, query = "") => apiRequest("/api/admin/analytics/services" + query, { token }),
  getAnalyticsPayments: (token, query = "") => apiRequest("/api/admin/analytics/payments" + query, { token }),
  updateCommissionStatus: (token, transactionId, commissionStatus) =>
    apiRequest(`/api/admin/transactions/${transactionId}/commission`, {
      method: "PUT",
      token,
      body: { commissionStatus },
    }),
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
  updateBusinessVerification: (token, businessId, payloadOrStatus) =>
    apiRequest(`/api/admin/businesses/${businessId}/approval`, {
      method: "PUT",
      token,
      body: typeof payloadOrStatus === "string" ? { status: payloadOrStatus } : payloadOrStatus,
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
  getFinance: (token) => apiRequest("/api/admin/finance", { token }),
  getPayouts: (token, query = "") => apiRequest("/api/admin/payouts" + query, { token }),
  syncPayout: (token, transactionId) =>
    apiRequest(`/api/admin/payouts/${transactionId}/sync`, {
      method: "POST",
      token,
    }),
};

export const analyticsApi = {
  track: (payload, token) => apiRequest("/api/analytics/track", { method: "POST", token, body: payload }),
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
  verifyBookingCode: (token, code) =>
    apiRequest("/api/seller/bookings/verify-code", {
      method: "POST",
      token,
      body: { code },
    }),
  completeVerifiedBooking: (token, payload) =>
    apiRequest("/api/seller/bookings/complete-verified", {
      method: "POST",
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
  getPayoutDetails: (token) => apiRequest("/api/hotel/payout-details", { token }),
  savePayoutDetails: (token, payoutDetails) =>
    apiRequest("/api/hotel/payout-details", {
      method: "PUT",
      token,
      body: { payoutDetails },
    }),
  getFinance: (token) => apiRequest("/api/hotel/finance", { token }),
  verifyBooking: (token, lookup) =>
    apiRequest(`/api/hotel/booking-verification/${encodeURIComponent(lookup)}`, { token }),
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
        rebookId: payload.rebookId || undefined,
        quantity: payload.quantity,
        numberOfPeople: payload.numberOfPeople,
        guests: payload.numberOfPeople,
        totalConsumptionUnits: payload.totalConsumptionUnits,
        checkIn: payload.startDate,
        checkOut: payload.endDate,
        bookingDate: payload.startDate,
        endBookingDate: payload.endBookingDate || payload.endDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        totalPrice: payload.bookingDetails?.totalPrice || payload.totalPrice || 0,
        destinationPlace: payload.destinationPlace,
        destinationLocation: payload.destinationLocation,
        customerLocation: payload.customerLocation,
        customerLocationDetails: payload.customerLocationDetails,
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
  getPaymentStatus: (token, bookingId) =>
    apiRequest(`/api/bookings/${bookingId}/payment-status`, { token }),
  cancelBooking: (token, bookingId, reason) =>
    apiRequest(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      token,
      body: { reason, cancellationReason: reason },
    }),
  getReceiptUrl: (bookingOrToken) =>
    bookingOrToken ? `${API_BASE_URL}/api/receipt/${encodeURIComponent(bookingOrToken)}` : "",
  getPrintableReceiptUrl: (bookingOrToken) =>
    bookingOrToken ? `${API_BASE_URL}/api/receipt/${encodeURIComponent(bookingOrToken)}?print=1` : "",
  getVerifyUrl: (token) => `${window.location.origin}/verify/${encodeURIComponent(token)}`,
  getQrImageUrl: (token) =>
    `${API_BASE_URL}/api/qr/${encodeURIComponent(token)}`,
};

export const rebookApi = {
  createRequest: (token, payload) => apiRequest("/api/rebook/request", { method: "POST", token, body: payload }),
  getCustomerRequests: (token, page = 1) => apiRequest(`/api/rebook/customer?page=${page}`, { token }),
  getSellerRequests: (token, page = 1) => apiRequest(`/api/rebook/seller?page=${page}`, { token }),
  getAdminRequests: (token, page = 1, status = "") => apiRequest(`/api/rebook/admin?page=${page}${status ? `&status=${encodeURIComponent(status)}` : ""}`, { token }),
  approve: (token, id) => apiRequest(`/api/rebook/${id}/approve`, { method: "POST", token }),
  reject: (token, id, reason) => apiRequest(`/api/rebook/${id}/reject`, { method: "POST", token, body: { reason } }),
  approveRefund: (token, id) => apiRequest(`/api/rebook/${id}/refund`, { method: "POST", token }),
  confirmUnavailable: (token, id) => apiRequest(`/api/rebook/${id}/confirm-unavailable`, { method: "POST", token }),
  markSellerNotified: (token, id) => apiRequest(`/api/rebook/${id}/mark-seller-notified`, { method: "POST", token }),
  verifyId: (token, rebookId, serviceId) => apiRequest("/api/rebook/verify-id", { method: "POST", token, body: { rebookId, serviceId } }),
  getSettings: (token) => apiRequest("/api/rebook/settings", { token }),
  updateSettings: (token, payload) => apiRequest("/api/rebook/settings", { method: "PUT", token, body: payload }),
};

export const paymentsApi = {
  getMethods: () => apiRequest("/api/payments/methods", { skipAuthRefresh: true, token: null }),
  getProviders: () => apiRequest("/api/payments/providers", { skipAuthRefresh: true, token: null }),
};

export const publicApi = {
  getHotels: (query = {}) => apiRequest("/api/hotels" + buildQueryString(query)),
  getAnnouncement: () => apiRequest("/api/announcement"),
  getMarketplaceSettings: () => apiRequest("/api/marketplace-settings"),
  verifyBooking: (token) => apiRequest(`/api/verify/${token}`),
};

export const geoApi = {
  searchPlaces: (query) =>
    apiRequest("/api/geo/search" + buildQueryString({ q: query, country: "rw" }), { skipAuthRefresh: true, token: null }),
  reverseGeocode: (latitude, longitude) =>
    apiRequest("/api/geo/reverse" + buildQueryString({ lat: latitude, lng: longitude }), { skipAuthRefresh: true, token: null }),
  getRoute: (from, to) =>
    apiRequest("/api/geo/route" + buildQueryString({
      fromLat: from.latitude,
      fromLng: from.longitude,
      toLat: to.latitude,
      toLng: to.longitude,
    }), { skipAuthRefresh: true, token: null }),
};

export { API_BASE_URL };
