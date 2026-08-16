export const SELLER_ROLES = ['hotel', 'supplier'];
export const CUSTOMER_ROLES = ['tourist', 'customer'];

export function isSellerRole(role) {
  return SELLER_ROLES.includes(role);
}

export function isCustomerRole(role) {
  return CUSTOMER_ROLES.includes(role);
}

export function getDashboardRoute(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin-dashboard';
  if (isSellerRole(user.role)) return '/dashboard/seller';
  return '/dashboard';
}

export function formatDisplayRole(role) {
  if (role === 'hotel' || role === 'supplier') return 'Service provider';
  if (role === 'admin') return 'Admin';
  if (role === 'tourist' || role === 'customer') return 'Customer';
  return String(role || 'user').replace(/[-_]/g, ' ');
}

export const isDraftStatus = (value) => String(value || '').toLowerCase() === 'draft';

export function isDraftService(item) {
  if (!item) return false;
  return ['approvalStatus', 'listingStatus', 'publicationStatus', 'moderationStatus'].some((key) => isDraftStatus(item[key]))
    || isDraftStatus(item.status);
}

export const serviceApprovalStatus = (item) => {
  const status = String(item?.approvalStatus || item?.verificationStatus || item?.moderationStatus || '').toLowerCase();
  if (status === 'approved' || status === 'posted' || status === 'live') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'pending' || status === 'in-review' || status === 'review') return 'pending';
  if (item?.isApproved === true || item?.isPosted === true) return 'approved';
  return 'pending';
};

export function withoutDrafts(items) {
  return (Array.isArray(items) ? items : []).filter((item) => !isDraftService(item));
}

export function needsTermsAcceptance(user) {
  return Boolean(user) && user.role !== 'admin' && user.termsAccepted !== true;
}

export function getPostAuthRoute(user) {
  if (needsTermsAcceptance(user)) return '/terms';
  return getDashboardRoute(user);
}

export function getSafeRedirectPath(value) {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return '';
  try {
    const url = new URL(raw, 'http://safariscon.local');
    if (url.username || url.password || url.host !== 'safariscon.local') return '';
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (path === '/dashboard/bookings' || path.startsWith('/dashboard/bookings?') || path.startsWith('/dashboard/bookings#')) {
      return path.replace('/dashboard/bookings', '/dashboard');
    }
    return path;
  } catch {
    return '';
  }
}

export function withQueryParam(path, key, value) {
  if (!path || !value) return path;
  try {
    const url = new URL(path, 'http://safariscon.local');
    if (!url.searchParams.get(key)) url.searchParams.set(key, value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
}

export function findBookingByFocusId(bookings, focusId) {
  const id = String(focusId || '').trim();
  if (!id) return null;
  return (Array.isArray(bookings) ? bookings : []).find((booking) => (
    String(booking?._id || '') === id
    || String(booking?.id || '') === id
    || String(booking?.bookingCode || '') === id
  )) || null;
}
