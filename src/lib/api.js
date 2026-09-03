const DEFAULT_API_BASE_URL = "http://localhost:5000";
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");
const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
const AUTH_STORAGE_KEY = "tourconnect_auth";
const AUTH_TAB_STORAGE_KEY = "tourconnect_auth_tab";
const LEGACY_USER_KEY = "toorconnect_user";
const AUTH_EXPIRED_EVENT = "auth:expired";
const AUTH_ANONYMOUS_PREFIXES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/register",
  "/api/auth/email/",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/provider/",
];
const AUTH_REFRESH_SKIP_PREFIXES = AUTH_ANONYMOUS_PREFIXES;

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

const readJsonSession = (raw) => {
  if (!raw) return null;
  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    return null;
  }
};

const safeStorageGet = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore quota / private-mode failures */
  }
};

const safeStorageRemove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const readStoredSession = () => {
  try {
    const localSession = readJsonSession(safeStorageGet(localStorage, AUTH_STORAGE_KEY));
    if (localSession?.token || localSession?.refreshToken || localSession?.user) {
      return localSession;
    }
    safeStorageRemove(localStorage, AUTH_STORAGE_KEY);

    const tabSession = readJsonSession(safeStorageGet(sessionStorage, AUTH_TAB_STORAGE_KEY));
    if (tabSession?.token || tabSession?.user) {
      return tabSession;
    }
    safeStorageRemove(sessionStorage, AUTH_TAB_STORAGE_KEY);

    const legacyUserRaw = safeStorageGet(localStorage, LEGACY_USER_KEY);
    if (legacyUserRaw) {
      try {
        const user = JSON.parse(legacyUserRaw);
        return normalizeSession({ user, token: null });
      } catch {
        safeStorageRemove(localStorage, LEGACY_USER_KEY);
      }
    }
  } catch {
    return null;
  }

  return null;
};

const sessionPayload = (session) => JSON.stringify({
  user: session.user,
  token: session.token,
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  rememberMe: session.rememberMe,
  accessTokenExpiresIn: session.accessTokenExpiresIn,
  refreshTokenExpiresIn: session.refreshTokenExpiresIn,
});

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
    : result.accessToken || result.token || previous.accessToken || previous.token || null;
  const refreshToken = isAuthTokenResponse
    ? result.refreshToken || null
    : previous.refreshToken || null;

  const explicitRememberMe = rememberMe ?? result.rememberMe;
  const persistToLocal =
    explicitRememberMe === true ||
    Boolean(refreshToken && explicitRememberMe !== false);

  const session = normalizeSession({
    user: result.user || previous.user || null,
    accessToken,
    token: accessToken,
    refreshToken,
    rememberMe: Boolean(persistToLocal),
    accessTokenExpiresIn: result.accessTokenExpiresIn ?? previous.accessTokenExpiresIn,
    refreshTokenExpiresIn: result.refreshTokenExpiresIn ?? previous.refreshTokenExpiresIn,
  });

  memorySession = session;
  safeStorageRemove(localStorage, LEGACY_USER_KEY);

  if (!session || (!session.token && !session.user)) {
    safeStorageRemove(localStorage, AUTH_STORAGE_KEY);
    safeStorageRemove(sessionStorage, AUTH_TAB_STORAGE_KEY);
    return session;
  }

  if (persistToLocal) {
    safeStorageSet(localStorage, AUTH_STORAGE_KEY, sessionPayload(session));
    safeStorageRemove(sessionStorage, AUTH_TAB_STORAGE_KEY);
  } else {
    safeStorageSet(sessionStorage, AUTH_TAB_STORAGE_KEY, sessionPayload(session));
    safeStorageRemove(localStorage, AUTH_STORAGE_KEY);
  }

  return session;
};

export const saveAuthData = (authData) => persistAuthSession(authData);

export const clearAuthData = () => {
  memorySession = null;
  safeStorageRemove(localStorage, AUTH_STORAGE_KEY);
  safeStorageRemove(sessionStorage, AUTH_TAB_STORAGE_KEY);
  safeStorageRemove(localStorage, LEGACY_USER_KEY);
};

export const expireAuthSession = () => {
  clearAuthData();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
};

const shouldSkipAuthRefresh = (path) =>
  AUTH_REFRESH_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));

const AUTH_SESSION_ERROR_CODES = new Set([
  "UNAUTHENTICATED",
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "JWT_EXPIRED",
  "ACCESS_TOKEN_EXPIRED",
  "SESSION_EXPIRED",
  "AUTH_REQUIRED",
  "AUTH_UNAUTHORIZED",
]);

const isPaymentOrGatewayPath = (path) =>
  path.startsWith("/api/payments/") ||
  /\/pay(?:ment)?(?:-status)?(?:\/|$|\?)/.test(path) ||
  path.includes("/payment-status");

const isJwtAuthError = (error) => {
  const code = String(error?.code || error?.payload?.code || "").toUpperCase();
  if (AUTH_SESSION_ERROR_CODES.has(code)) return true;
  const message = String(error?.message || error?.payload?.message || "").toLowerCase();
  return /jwt|jsonwebtoken|access token|refresh token|token expired|token missing|invalid token|malformed token|not authenticated|authentication required|please (log|sign) in|session expired/.test(
    message
  );
};

const shouldAttachSessionToken = (path, anonymous) => {
  if (anonymous) return false;
  return !AUTH_ANONYMOUS_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const sessionAccessToken = () => {
  const session = getAuthData();
  return session?.token || session?.accessToken || null;
};

const resolveAccessToken = (path, { token, anonymous } = {}) => {
  if (!shouldAttachSessionToken(path, anonymous)) return null;
  return token || sessionAccessToken() || null;
};

const shouldEndSessionOn401 = (path, options, error) => {
  if (options?.skipAuthRefresh || shouldSkipAuthRefresh(path) || !getAuthData()) return false;
  if (isPaymentOrGatewayPath(path) && !isJwtAuthError(error)) return false;
  return isJwtAuthError(error);
};

const readPreferredLanguage = () => {
  try {
    const saved = localStorage.getItem("preferredLanguage");
    if (["en", "rw", "fr", "sw"].includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "en";
};

const buildHeaders = (token, customHeaders = {}) => {
  const headers = { ...customHeaders };
  if (!headers["Content-Type"] && !(customHeaders instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const language = readPreferredLanguage();
  if (!headers["Accept-Language"]) headers["Accept-Language"] = language;
  if (!headers["X-App-Language"]) headers["X-App-Language"] = language;
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
      { rememberMe: current.rememberMe !== false }
    );
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const retryAfterRefresh = async (path, options, error) => {
  const canRetryAuth =
    error.status === 401 &&
    !options.skipAuthRefresh &&
    !shouldSkipAuthRefresh(path) &&
    (!isPaymentOrGatewayPath(path) || isJwtAuthError(error));

  if (!canRetryAuth) return null;

  const sessionToken = sessionAccessToken();
  if (error.code === "TOKEN_MISSING" && sessionToken && !options.token) {
    try {
      return await apiRequest(path, {
        ...options,
        token: sessionToken,
        skipAuthRefresh: true,
      });
    } catch {
      // Fall through to refresh when Remember me issued a refresh token.
    }
  }

  if (!getAuthData()?.refreshToken) return null;

  try {
    await refreshSession();
    return apiRequest(path, {
      ...options,
      token: sessionAccessToken(),
      skipAuthRefresh: true,
    });
  } catch {
    expireAuthSession();
    return null;
  }
};

export const apiRequest = async (path, { method = "GET", body, token, headers, skipAuthRefresh = false, anonymous = false } = {}) => {
  const accessToken = resolveAccessToken(path, { token, anonymous });
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
      { method, body, headers, skipAuthRefresh, anonymous, token },
      error
    );
    if (retried) return retried;
    if (error.status === 403 && error.code === "TERMS_NOT_ACCEPTED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:terms-required", { detail: error.payload }));
      }
    } else if (error.status === 401 && shouldEndSessionOn401(path, { skipAuthRefresh }, error)) {
      expireAuthSession();
    }
    throw error;
  }

  return payload;
};

export const uploadRequest = async (path, { method = "POST", formData, token, skipAuthRefresh = false, anonymous = false } = {}) => {
  const accessToken = resolveAccessToken(path, { token, anonymous });
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
          token: sessionAccessToken(),
          skipAuthRefresh: true,
        });
      } catch {
        expireAuthSession();
      }
    } else if (error.status === 403 && error.code === "TERMS_NOT_ACCEPTED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:terms-required", { detail: error.payload }));
      }
    } else if (error.status === 401 && shouldEndSessionOn401(path, { skipAuthRefresh }, error)) {
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
  changePassword: (payload) =>
    apiRequest("/api/auth/change-password", {
      method: "POST",
      body: payload,
    }),
  acceptTerms: () =>
    apiRequest("/api/auth/accept-terms", {
      method: "POST",
      body: { acceptedTerms: true },
    }),
  updateProfile: (token, payload) =>
    apiRequest("/api/auth/profile", {
      method: "PUT",
      token,
      body: payload,
    }),
  uploadAvatar: (token, file) => {
    const formData = new FormData();
    formData.append("image", file);
    return uploadRequest("/api/auth/profile/avatar", {
      method: "POST",
      token,
      formData,
    });
  },
  getAccountDeletionStatus: (token) =>
    apiRequest("/api/auth/account/deletion-status", { token }),
  deleteAccount: (token, confirm = "DELETE") =>
    apiRequest("/api/auth/account", {
      method: "DELETE",
      token,
      body: { confirm },
    }),
  uploadDocuments: (token, files = []) => {
    const formData = new FormData();
    files.slice(0, 2).forEach((file) => formData.append("documents", file));
    return uploadRequest("/api/auth/documents", {
      method: "POST",
      token,
      formData,
    });
  },
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
      anonymous: true,
    });
  },
  getProviderOnboarding: (sellerId) => {
    const id = encodeURIComponent(String(sellerId || "").trim());
    return apiRequest(`/api/auth/provider/onboarding?sellerId=${id}`, {
      skipAuthRefresh: true,
      anonymous: true,
    }).catch((error) => {
      if (error?.status !== 404 && error?.status !== 400) throw error;
      return apiRequest(`/api/auth/provider/onboarding/${id}`, {
        skipAuthRefresh: true,
        anonymous: true,
      });
    });
  },
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
  getServiceCategories: (token) => apiRequest("/api/admin/service-categories", { token }),
  getServiceCategory: async (token, idOrSlug) => {
    const key = encodeURIComponent(idOrSlug);
    // Backend guide documents list/CRUD, but not always GET-by-id on admin.
    // Prefer public detail (full schemas), then admin list lookup, then admin GET.
    try {
      const publicDetail = await apiRequest(`/api/service-categories/${key}`);
      if (publicDetail?.category || publicDetail?._id || publicDetail?.slug) {
        return { category: publicDetail.category || publicDetail };
      }
    } catch {
      /* continue */
    }
    try {
      const list = await apiRequest("/api/admin/service-categories", { token });
      const category = (list.categories || []).find(
        (item) => String(item._id) === String(idOrSlug) || item.slug === idOrSlug
      );
      if (category) return { category };
    } catch {
      /* continue */
    }
    return apiRequest(`/api/admin/service-categories/${key}`, { token });
  },
  createServiceCategory: (token, payload) =>
    apiRequest("/api/admin/service-categories", { method: "POST", token, body: payload }),
  updateServiceCategory: (token, id, payload) =>
    apiRequest(`/api/admin/service-categories/${id}`, { method: "PUT", token, body: payload }),
  updateServiceCategoryFields: (token, id, payload) =>
    apiRequest(`/api/admin/service-categories/${id}/fields`, { method: "PUT", token, body: payload }),
  deleteServiceCategory: (token, id) =>
    apiRequest(`/api/admin/service-categories/${id}`, { method: "DELETE", token }),
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
  triggerPayout: (token, transactionId) =>
    apiRequest(`/api/admin/payouts/${transactionId}/trigger`, {
      method: "POST",
      token,
      body: { force: true },
    }),
  triggerAllEligiblePayouts: (token) =>
    apiRequest("/api/admin/payouts/trigger-all", {
      method: "POST",
      token,
      body: { force: true },
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
  getMyServices: (token, query = {}) =>
    apiRequest("/api/hotel/services" + buildQueryString(query), { token }),
  getService: (token, serviceId) => apiRequest(`/api/hotel/services/${serviceId}`, { token }),
  getServiceCategories: () => apiRequest("/api/service-categories"),
  uploadServiceImages: (token, files = []) => {
    const formData = new FormData();
    files.slice(0, 5).forEach((file) => formData.append("images", file));
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
  getServiceOptions: (token, serviceId) =>
    apiRequest(`/api/hotel/services/${serviceId}/options`, { token }),
  createServiceOption: (token, serviceId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}/options`, {
      method: "POST",
      token,
      body: payload,
    }),
  updateServiceOption: (token, serviceId, optionId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  deleteServiceOption: (token, serviceId, optionId) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}`, {
      method: "DELETE",
      token,
    }),
  getServiceAvailability: (token, serviceId, optionId) =>
    apiRequest(
      `/api/hotel/services/${serviceId}/availability${optionId ? `?optionId=${encodeURIComponent(optionId)}` : ""}`,
      { token }
    ),
  saveServiceAvailability: (token, serviceId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}/availability`, {
      method: "PUT",
      token,
      body: payload,
    }),
  saveOptionAvailability: (token, serviceId, optionId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}/availability`, {
      method: "PUT",
      token,
      body: payload,
    }),
  listOptionBlocks: (token, serviceId, optionId) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}/blocks`, { token }),
  createOptionBlock: (token, serviceId, optionId, payload) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}/blocks`, {
      method: "POST",
      token,
      body: payload,
    }),
  deleteOptionBlock: (token, serviceId, optionId, blockId) =>
    apiRequest(`/api/hotel/services/${serviceId}/options/${optionId}/blocks/${blockId}`, {
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
  previewPayoutDetails: (token, payoutDetails) =>
    apiRequest("/api/hotel/payout-details/preview", {
      method: "POST",
      token,
      body: { payoutDetails },
    }),
  getFinance: (token) => apiRequest("/api/hotel/finance", { token }),
  verifyBooking: (token, lookup) =>
    apiRequest(`/api/hotel/booking-verification/${encodeURIComponent(lookup)}`, { token }),
};

export const categoriesApi = {
  list: () => apiRequest("/api/service-categories", { anonymous: true }),
  get: (idOrSlug) => apiRequest(`/api/service-categories/${encodeURIComponent(idOrSlug)}`, { anonymous: true }),
};

export const bookingApi = {
  requestBooking: (token, payload) =>
    apiRequest("/api/bookings/request", {
      method: "POST",
      token,
      body: payload,
    }),
  verifyBooking: (token, lookup) => apiRequest(`/api/hotel/booking-verification/${encodeURIComponent(lookup)}`, { token }),
  bookService: (token, payload) => {
    const isAccommodation = payload.domain === 'accommodation';
    return apiRequest("/api/bookings/request", {
      method: "POST",
      token,
      body: {
        hotelId: payload.serviceId,
        optionId: payload.optionId || undefined,
        rebookId: payload.rebookId || undefined,
        quantity: payload.quantity,
        numberOfPeople: payload.numberOfPeople,
        guests: payload.numberOfPeople,
        totalConsumptionUnits: payload.totalConsumptionUnits,
        ...(isAccommodation ? {
          checkIn: payload.startDate,
          checkOut: payload.endDate,
        } : {}),
        bookingDate: payload.startDate,
        endBookingDate: payload.endBookingDate || payload.endDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        totalPrice: payload.bookingDetails?.totalPrice || payload.totalPrice || 0,
        destinationPlace: payload.destinationPlace,
        destinationLocation: payload.destinationLocation,
        customerLocation: payload.customerLocation,
        customerLocationDetails: payload.customerLocationDetails,
        bookingAttributes: payload.bookingAttributes || undefined,
        bookingDetails: payload.bookingDetails,
      },
    });
  },
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
  getMethods: () => apiRequest("/api/payments/methods", { skipAuthRefresh: true }),
  getProviders: () => apiRequest("/api/payments/providers", { skipAuthRefresh: true }),
};

export const publicApi = {
  getHotels: (query = {}) => apiRequest("/api/hotels" + buildQueryString(query), { anonymous: true }),
  getHotel: (hotelId, query = {}) => apiRequest(`/api/hotels/${encodeURIComponent(hotelId)}` + buildQueryString(query), { anonymous: true }),
  getReviews: (hotelId) => apiRequest(`/api/hotels/${encodeURIComponent(hotelId)}/reviews`, { anonymous: true }),
  saveReview: (token, hotelId, payload) =>
    apiRequest(`/api/hotels/${encodeURIComponent(hotelId)}/reviews`, {
      method: "POST",
      token,
      body: payload,
    }),
  getServiceAvailability: (hotelId, optionId, query = {}) =>
    apiRequest(
      `/api/hotels/${encodeURIComponent(hotelId)}/availability` +
        buildQueryString({ optionId: optionId || undefined, ...query }),
      { anonymous: true }
    ),
  getAnnouncement: () => apiRequest("/api/announcement", { anonymous: true }),
  getMarketplaceSettings: () => apiRequest("/api/marketplace-settings", { anonymous: true }),
  verifyBooking: (token) => apiRequest(`/api/verify/${token}`),
};

export const geoApi = {
  searchPlaces: (query, { country } = {}) =>
    apiRequest("/api/geo/search" + buildQueryString({ q: query, country: country || undefined }), { skipAuthRefresh: true, anonymous: true }),
  reverseGeocode: (latitude, longitude) =>
    apiRequest("/api/geo/reverse" + buildQueryString({ lat: latitude, lng: longitude }), { skipAuthRefresh: true, anonymous: true }),
  getRoute: (from, to) =>
    apiRequest("/api/geo/route" + buildQueryString({
      fromLat: from.latitude,
      fromLng: from.longitude,
      toLat: to.latitude,
      toLng: to.longitude,
    }), { skipAuthRefresh: true, anonymous: true }),
};

export { API_BASE_URL };
