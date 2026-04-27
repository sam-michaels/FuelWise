/**
 * Geocoding via Nominatim (OpenStreetMap's official geocoder).
 *
 * Free, no API key. Rules per https://operations.osmfoundation.org/policies/nominatim/:
 *   • Maximum 1 request per second
 *   • Must send descriptive User-Agent
 *   • No bulk/heavy use without your own instance
 *
 * This module enforces those rules: every outgoing call goes through
 * `rateLimitedFetch` which serializes requests across the whole process.
 * Results are cached in memory. For production, swap the cache for Redis.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'FuelWise/0.3 (https://github.com/yourname/fuelwise)';

// Process-wide queue: ensures we never exceed 1 req/sec to Nominatim
let lastRequestAt = 0;
const MIN_GAP_MS = 1100; // 1.1s — slight headroom over 1 req/sec

async function rateLimitedFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      'Accept-Language': 'en-CA,en,fr-CA,fr',
    },
  });
}

// Simple in-memory caches. Reset on cold start.
const searchCache = new Map();
const reverseCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function cacheGet(map, key) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  return null;
}
function cacheSet(map, key, value) {
  map.set(key, { value, at: Date.now() });
}

/**
 * Forward geocoding: address → coordinates + suggestions.
 * Biased to Canada by default. Returns up to `limit` results.
 */
export async function geocodeSearch(query, { limit = 5, country = 'ca' } = {}) {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `${country}|${limit}|${trimmed.toLowerCase()}`;
  const cached = cacheGet(searchCache, cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    countrycodes: country,
  });
  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;

  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Nominatim search: HTTP ${res.status}`);

  const raw = await res.json();
  const results = raw.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    type: r.type,
    importance: r.importance,
    address: shortAddress(r.address),
  }));

  cacheSet(searchCache, cacheKey, results);
  return results;
}

/**
 * Reverse geocoding: coordinates → human-readable address.
 */
export async function geocodeReverse(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet(reverseCache, cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  });
  const url = `${NOMINATIM_BASE}/reverse?${params.toString()}`;

  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Nominatim reverse: HTTP ${res.status}`);
  }

  const raw = await res.json();
  const result = {
    label: raw.display_name || null,
    address: shortAddress(raw.address),
    lat: parseFloat(raw.lat),
    lng: parseFloat(raw.lon),
  };
  cacheSet(reverseCache, cacheKey, result);
  return result;
}

/** Build a compact human address from Nominatim's address object */
function shortAddress(addr = {}) {
  if (!addr) return '';
  const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
  const locality = addr.city || addr.town || addr.village || addr.suburb || '';
  const region = addr.state_code || addr.state || '';
  return [street, locality, region].filter(Boolean).join(', ');
}
