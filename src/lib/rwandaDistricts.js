/** The 30 districts of Rwanda, used for pickup / drop-off selection. */
export const RWANDA_DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi', 'Gisagara', 'Huye', 'Kamonyi', 'Karongi',
  'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga', 'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
  'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu', 'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana',
];

export function isRwandaDistrict(value) {
  const text = String(value || '').trim().toLowerCase();
  return RWANDA_DISTRICTS.some((district) => district.toLowerCase() === text);
}
