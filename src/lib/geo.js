// Earth radius in km. WGS-84 mean.
const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two lat/lng points, in kilometres.
 * This is "as the crow flies" — real driving distance is typically
 * 1.2–1.4× higher in urban Canadian grids. The worth-it calc accounts
 * for that with a default `roadFactor` multiplier.
 */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Convert crow-flies km to estimated road km. Tune for your region. */
export const ROAD_FACTOR = 1.3;

export function estimatedRoadKm(a, b, factor = ROAD_FACTOR) {
  return haversineKm(a, b) * factor;
}
