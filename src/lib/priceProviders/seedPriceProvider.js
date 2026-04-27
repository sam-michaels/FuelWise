/**
 * Seed price provider.
 *
 * Reads prices from the same seed JSON that used to back the seed station
 * provider. Now the prices are looked up by matching real stations (from OSM)
 * to seed entries by brand + proximity. Useful for demos and offline dev.
 */

import seedData from '@/data/stations.json';
import { haversineKm } from '@/lib/geo';

const MATCH_RADIUS_KM = 0.3; // 300m — close enough to be the same station

const seedPriceProvider = {
  async getPricesForStations(stations) {
    const out = new Map();
    for (const s of stations) {
      const match = findMatch(s);
      if (match) {
        out.set(s.id, match.prices);
      }
    }
    return out;
  },
};

function findMatch(station) {
  // Try brand-or-name + proximity match
  const candidates = seedData.stations.filter((seed) => {
    const brandMatch =
      (seed.brand || '').toLowerCase() === (station.brand || '').toLowerCase() ||
      (seed.name || '').toLowerCase() === (station.name || '').toLowerCase();
    return brandMatch;
  });
  for (const c of candidates) {
    const d = haversineKm(
      { lat: station.lat, lng: station.lng },
      { lat: c.lat, lng: c.lng }
    );
    if (d <= MATCH_RADIUS_KM) return c;
  }
  return null;
}

export default seedPriceProvider;
