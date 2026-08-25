const isoDate = (value) => {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const addDaysIso = (iso, days = 1) => {
  const start = isoDate(iso);
  if (!start) return "";
  const date = new Date(`${start}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

export const staySearchFromParams = (searchParams) => ({
  location: String(searchParams?.get?.("location") || "").trim(),
  lat: String(searchParams?.get?.("lat") || "").trim(),
  lng: String(searchParams?.get?.("lng") || "").trim(),
  radiusKm: String(searchParams?.get?.("radiusKm") || "").trim(),
  checkIn: isoDate(searchParams?.get?.("checkIn")),
  checkOut: isoDate(searchParams?.get?.("checkOut")),
});

export const withStaySearch = (path, { location, lat, lng, radiusKm, checkIn, checkOut, optionId } = {}, extra = {}) => {
  const params = new URLSearchParams();
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  if (location) params.set("location", location);
  if (lat) params.set("lat", lat);
  if (lng) params.set("lng", lng);
  if (radiusKm) params.set("radiusKm", radiusKm);
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (optionId) params.set("optionId", optionId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};
