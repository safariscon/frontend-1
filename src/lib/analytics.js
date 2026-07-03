import { analyticsApi, getAuthData } from './api';

export const ANALYTICS_EVENTS = {
  APP_VISIT: 'APP_VISIT',
  SERVICE_VIEW: 'SERVICE_VIEW',
  BOOKING_FORM_OPENED: 'BOOKING_FORM_OPENED',
  BOOKING_SUBMITTED: 'BOOKING_SUBMITTED',
  PAY_DEPOSIT_CLICKED: 'PAY_DEPOSIT_CLICKED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
};

const SESSION_KEY = 'safariscon_analytics_session';

export const getAnalyticsSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = globalThis.crypto?.randomUUID?.() || 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

export const trackAnalytics = (eventType, data = {}) => {
  const token = getAuthData()?.token;
  const payload = {
    eventType,
    sessionId: getAnalyticsSessionId(),
    pageUrl: window.location.pathname + window.location.search,
    serviceId: data.serviceId || undefined,
    bookingId: data.bookingId || undefined,
    paymentId: data.paymentId || undefined,
  };
  analyticsApi.track(payload, token).catch(() => {});
};
