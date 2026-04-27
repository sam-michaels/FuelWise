/**
 * OpenStreetMap station provider.
 *
 * Uses the Overpass API to query OSM for all `amenity=fuel` features near a
 * coordinate. For stations missing structured addresses, we backfill via
 * Nominatim reverse geocoding (rate-limited to 1 req/sec).
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 *       https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dfuel
 */

import { haversineKm, estimatedRoadKm } from '@/lib/geo';
import { geocodeReverse } from '@/lib/geocoding';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

// How many missing-address stations should we backfill per request?
// Each takes ~1.1s (Nominatim rate limit), so 5 = ~5.5s extra latency on
// first uncached fetch. Tune based on UX appetite.
const MAX_REVERSE_GEOCODE_PER_REQUEST = 5;

function cacheKey(lat, lng, radiusKm) {
  const r2 = (n) => Math.round(n * 100) / 100;
  return `${r2(lat)}_${r2(lng)}_${radiusKm}`;
}

function buildQuery(lat, lng, radiusMeters) {
  return `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `.trim();
}

function osmElementToStation(el) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const brand = tags.brand || tags.operator || tags.name || 'Gas Station';
  const name = tags.name || brand;

  const addrParts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    tags['addr:state'] || tags['addr:province'],
  ].filter(Boolean);
  const address = addrParts.join(', ') || tags['addr:full'] || '';

  const amenities = [];
  if (tags.car_wash === 'yes') amenities.push('car_wash');
  if (tags.shop === 'convenience' || tags.shop === 'yes') amenities.push('convenience_store');
  if (tags.atm === 'yes') amenities.push('atm');
  if (tags.compressed_air === 'yes') amenities.push('air_pump');
  if (tags.self_service === 'yes') amenities.push('self_service');
  if (tags['fuel:diesel'] === 'yes') amenities.push('diesel_available');

  return {
    id: `osm-${el.type}-${el.id}`,
    osmId: `${el.type}/${el.id}`,
    name,
    brand,
    address,
    addressFromOSM: !!address,
    lat,
    lng,
    prices: {},
    amenities,
    source: 'openstreetmap',
  };
}

const osmStationProvider = {
  async getStationsNear({ lat, lng, radiusKm = 10 }) {
    const key = cacheKey(lat, lng, radiusKm);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return decorate(cached.stations, { lat, lng });
    }

    const radiusMeters = Math.round(radiusKm * 1000);
    const query = buildQuery(lat, lng, radiusMeters);

    let lastErr = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FuelWise/0.3 (https://github.com/yourname/fuelwise)',
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) {
          lastErr = new Error(`Overpass ${endpoint}: HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        let stations = (data.elements || [])
          .map(osmElementToStation)
          .filter(Boolean);

        // Backfill addresses for the closest stations missing them
        stations = await backfillAddresses(stations, { lat, lng });

        cache.set(key, { stations, timestamp: Date.now() });
        return decorate(stations, { lat, lng });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('All Overpass endpoints failed');
  },

  async getStation(id) {
    for (const { stations } of cache.values()) {
      const hit = stations.find((s) => s.id === id);
      if (hit) return hit;
    }
    return null;
  },
};

async function backfillAddresses(stations, here) {
  // Sort by distance, take stations missing an address, fill the closest ones
  const decorated = stations.map((s) => ({
    ...s,
    _d: haversineKm(here, { lat: s.lat, lng: s.lng }),
  }));
  decorated.sort((a, b) => a._d - b._d);

  let budget = MAX_REVERSE_GEOCODE_PER_REQUEST;
  for (const s of decorated) {
    if (budget <= 0) break;
    if (s.address) continue; // already has one from OSM tags
    try {
      const geo = await geocodeReverse(s.lat, s.lng);
      if (geo?.address) {
        s.address = geo.address;
        s.addressFromOSM = false;
      } else if (geo?.label) {
        s.address = geo.label.split(',').slice(0, 3).join(',').trim();
        s.addressFromOSM = false;
      }
    } catch {
      // Silent — Nominatim hiccups shouldn't fail the whole request
    }
    budget--;
  }

  // Strip the temp _d field
  return decorated.map(({ _d, ...rest }) => rest);
}

function decorate(stations, here) {
  return stations
    .map((s) => ({
      ...s,
      distanceKm: estimatedRoadKm(here, { lat: s.lat, lng: s.lng }),
      crowKm: haversineKm(here, { lat: s.lat, lng: s.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export default osmStationProvider;
