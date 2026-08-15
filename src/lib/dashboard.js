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
