import seedData from '@/data/stations.json';
import { haversineKm, estimatedRoadKm } from '@/lib/geo.js';

const seedProvider = {
  async getStationsNear({ lat, lng, radiusKm = 15 }) {
    const here = { lat, lng };
    return seedData.stations
      .map((s) => ({
        ...s,
        distanceKm: estimatedRoadKm(here, { lat: s.lat, lng: s.lng }),
        crowKm: haversineKm(here, { lat: s.lat, lng: s.lng }),
      }))
      .filter((s) => s.crowKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  async getStation(id) {
    return seedData.stations.find((s) => s.id === id) || null;
  },

  async submitReport({ stationId, fuelType, cpl }) {
    // Stub: in a real implementation, write to Postgres, run sanity checks,
    // update freshness, etc. For seed mode we just echo the report back.
    return {
      ok: true,
      stationId,
      fuelType,
      cpl,
      reportedAt: new Date().toISOString(),
      note: 'Seed mode: report not persisted. Wire up DATABASE_URL to enable.',
    };
  },
};

export default seedProvider;
