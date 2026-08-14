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

export function needsTermsAcceptance(user) {
  return Boolean(user) && user.role !== 'admin' && user.termsAccepted !== true;
}

export function getPostAuthRoute(user) {
  if (needsTermsAcceptance(user)) return '/terms';
  return getDashboardRoute(user);
}
