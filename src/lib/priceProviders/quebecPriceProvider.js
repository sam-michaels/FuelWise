/**
 * Quebec — Régie essence Québec price provider.
 *
 * BACKGROUND (April 2026):
 * As of April 1, 2026, every fuel retailer in Quebec is legally required to
 * report their pump prices to the Régie de l'énergie within 5 minutes of any
 * change. The data is published on regieessencequebec.ca and made available
 * for download. This is the first government-operated, real-time, mandatory
 * gas price feed in Canada — and it covers ~2,700 stations.
 *
 * Source: https://regieessencequebec.ca
 * Press: https://www.regie-energie.qc.ca/fr/nouvelles/communiques/...
 * Legal basis: Loi sur les produits pétroliers, art. 67.1 (RLRQ, c. P-30.01)
 *
 * ─── HOW TO COMPLETE THIS PROVIDER ──────────────────────────────────────
 *
 * The site publishes its data via a download endpoint and an internal JSON
 * API that powers the map. The exact URLs aren't publicly documented as of
 * this writing — find them by:
 *
 *   1. Opening regieessencequebec.ca in Chrome/Firefox
 *   2. DevTools → Network tab → Filter "Fetch/XHR"
 *   3. Loading the map; you'll see a request to something like
 *      `/api/stations` or `/data/prices.json` returning all stations
 *   4. Inspect Response. If JSON, that's your endpoint. If a file download,
 *      switch to the "Télécharger" button on the site and grab that URL.
 *
 * Then replace `fetchAllQuebecPrices` below to call that endpoint, parse
 * the response, and emit a Map<key, PriceRecord>.
 *
 * Because the dataset is province-wide (~2,700 stations), the right
 * caching strategy is: fetch the whole feed every ~5 minutes server-side,
 * keep it in memory or Redis, and serve from cache. Don't re-fetch per
 * user request.
 *
 * MATCHING REGIE STATIONS TO OSM STATIONS:
 * Régie publishes its own station IDs that don't match OSM IDs. To join
 * them you'll match on (lat, lng) within ~100m, with brand/name as a
 * tiebreaker. There's a tested helper at the bottom of this file.
 * ────────────────────────────────────────────────────────────────────────
 */

import { haversineKm } from '@/lib/geo';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STATION_MATCH_RADIUS_KM = 0.1; // 100m

let cache = { stations: [], fetchedAt: 0, error: null };

async function fetchAllQuebecPrices() {
  // TODO: Replace this URL with the real endpoint discovered via DevTools.
  const url = process.env.QUEBEC_REGIE_FEED_URL;

  if (!url) {
    throw new Error(
      'QUEBEC_REGIE_FEED_URL not set. Find the endpoint via Chrome DevTools ' +
      'on regieessencequebec.ca and put it in your .env.local. ' +
      'See the comment block at the top of quebecPriceProvider.js for instructions.'
    );
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'FuelWise/0.1 (educational)',
      Accept: 'application/json',
    },
    // Next.js fetch caching — server-side caches identical URLs for 5 min
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Régie feed: HTTP ${res.status}`);
  const raw = await res.json();

  // The exact response shape depends on the endpoint you find.
  // Below is a defensive normalizer that handles a few likely shapes.
  // Adjust once you know the real shape.
  return normalizeRegieResponse(raw);
}

/**
 * Normalize whatever the Régie returns into:
 *   [{ lat, lng, brand, name, address, prices: { regular, premium, diesel } }]
 *
 * Each price = { cpl: number, reportedAt: ISOString }
 */
function normalizeRegieResponse(raw) {
  // Hypothetical shape #1: { features: [{ geometry, properties }] } (GeoJSON)
  if (raw?.features) {
    return raw.features.map((f) => ({
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
      brand: f.properties?.banniere || f.properties?.brand,
      name: f.properties?.nom || f.properties?.name,
      address: f.properties?.adresse,
      prices: extractPrices(f.properties),
    })).filter((s) => s.lat && s.lng);
  }

  // Hypothetical shape #2: { stations: [...] }
  if (Array.isArray(raw?.stations)) {
    return raw.stations.map((s) => ({
      lat: s.latitude || s.lat,
      lng: s.longitude || s.lng,
      brand: s.banniere || s.brand,
      name: s.nom || s.name,
      address: s.adresse || s.address,
      prices: extractPrices(s),
    })).filter((s) => s.lat && s.lng);
  }

  // Hypothetical shape #3: array of records directly
  if (Array.isArray(raw)) {
    return raw.map((s) => ({
      lat: s.latitude || s.lat,
      lng: s.longitude || s.lng,
      brand: s.banniere || s.brand,
      name: s.nom || s.name,
      address: s.adresse || s.address,
      prices: extractPrices(s),
    })).filter((s) => s.lat && s.lng);
  }

  console.warn('Unknown Régie response shape; returning empty array.');
  return [];
}

function extractPrices(props) {
  if (!props) return {};
  const out = {};
  // Régie tracks: essence ordinaire (regular), super (premium), diesel
  const reportedAt = props.dateMaj || props.lastUpdate || props.reportedAt || new Date().toISOString();

  const regular = props.prixOrdinaire ?? props.prix_ordinaire ?? props.regular;
  const premium = props.prixSuper ?? props.prix_super ?? props.premium;
  const diesel  = props.prixDiesel ?? props.prix_diesel ?? props.diesel;

  if (regular != null) out.regular = { cpl: toCpl(regular), reportedAt, source: 'regie' };
  if (premium != null) out.premium = { cpl: toCpl(premium), reportedAt, source: 'regie' };
  if (diesel  != null) out.diesel  = { cpl: toCpl(diesel),  reportedAt, source: 'regie' };
  return out;
}

// Régie publishes prices in $/L (e.g. 1.659). Our app uses ¢/L (e.g. 165.9).
function toCpl(price) {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (Number.isNaN(n)) return null;
  return n < 10 ? n * 100 : n; // crude unit detection
}

async function ensureCache() {
  const age = Date.now() - cache.fetchedAt;
  if (cache.stations.length > 0 && age < REFRESH_INTERVAL_MS) return;
  try {
    cache = { stations: await fetchAllQuebecPrices(), fetchedAt: Date.now(), error: null };
  } catch (err) {
    cache.error = err.message;
    // Keep stale data on failure rather than going empty
  }
}

const quebecPriceProvider = {
  async getPricesForStations(stations) {
    await ensureCache();
    const out = new Map();
    for (const s of stations) {
      const match = findClosestRegieStation(s, cache.stations);
      if (match) out.set(s.id, match.prices);
    }
    return out;
  },
};

function findClosestRegieStation(station, regieStations) {
  let best = null;
  let bestDist = Infinity;
  for (const r of regieStations) {
    const d = haversineKm(
      { lat: station.lat, lng: station.lng },
      { lat: r.lat, lng: r.lng }
    );
    if (d < bestDist && d <= STATION_MATCH_RADIUS_KM) {
      best = r;
      bestDist = d;
    }
  }
  return best;
}

export default quebecPriceProvider;
