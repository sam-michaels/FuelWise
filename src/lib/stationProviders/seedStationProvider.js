/**
 * Seed station provider — reads stations from a local JSON file.
 *
 * Useful for offline development, tests, and as a fallback when OSM is
 * unreachable. Production should use osmStationProvider.
 */

import seedData from '@/data/stations.json';
import { haversineKm, estimatedRoadKm } from '@/lib/geo';

const seedStationProvider = {
  async getStationsNear({ lat, lng, radiusKm = 15 }) {
    const here = { lat, lng };
    return seedData.stations
      .map((s) => ({
        ...s,
        // Strip prices — those are the price provider's job now
        prices: {},
        source: 'seed',
        distanceKm: estimatedRoadKm(here, { lat: s.lat, lng: s.lng }),
        crowKm: haversineKm(here, { lat: s.lat, lng: s.lng }),
      }))
      .filter((s) => s.crowKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  async getStation(id) {
    return seedData.stations.find((s) => s.id === id) || null;
  },
};

export default seedStationProvider;
