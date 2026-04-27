# FuelWise — Canadian Gas Price Tracker (v0.2)

A web app that shows nearby gas stations on a map, lets users compare prices, and calculates whether driving farther for cheaper gas is actually worth it once you account for the fuel burned getting there.

Built with Next.js 14, OpenStreetMap, Leaflet, and Tailwind. Deploys to Vercel in minutes.

---

## Architecture: stations and prices are separate

The single most important architectural decision in this app is that **station discovery** and **price data** come from different sources and are kept separate in the code. This is because they're different problems.

```
┌─────────────────┐     ┌─────────────────┐
│ StationProvider │     │  PriceProvider  │
│  (the "where")  │     │  (the "what")   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
            ┌────────────────┐
            │  API Route     │
            │  /stations/    │
            │  nearby        │
            └────────────────┘
```

### Station providers (where the stations are)

`src/lib/stationProviders/`

| Provider | Coverage | Notes |
|---|---|---|
| **`osm`** (default) | All of Canada | Uses OpenStreetMap's Overpass API. Free, no API key, returns every commercially-mapped gas station within radius. |
| `seed` | London, ON only | Reads from `data/stations.json`. For offline dev. |

OSM coverage of Canadian gas stations is essentially complete in cities and very good in rural areas. If a station near you is missing, [add it to OSM](https://www.openstreetmap.org/edit) — it'll appear in your app within ~24 hours.

### Price providers (what they cost)

`src/lib/priceProviders/`

| Provider | Coverage | Notes |
|---|---|---|
| **`seed`** (default) | London, ON area only | Illustrative seed prices. |
| **`quebec`** | All of Quebec | Régie de l'énergie open feed. Real, live, mandated by law (April 2026). **Requires endpoint discovery — see provider source comments.** |
| `null` | None | Stations render with no prices. Honest fallback for provinces without a feed. |
| `crowdsource` | TODO | Build it; wire up Postgres. |
| `gasbuddy` | TODO | Requires paid contract. |

### Why this matters

The original v0.1 conflated these. Result: only the ~10 stations in the seed JSON appeared, and stations the user actually knew were missing. Splitting these means:

- The map will show **every** OSM-known station near you (typically 20-50 in a Canadian city), even ones with no price data.
- You can integrate a real price feed for one province (Quebec) without breaking the rest of the country.
- Provinces without a free feed gracefully degrade to "stations only, no prices."

---

## Canadian gas price data — a survey

There is no public, free, Canada-wide real-time price API. As of April 2026, the landscape:

- **Quebec** is the lone bright spot. As of April 1, 2026, retailers must report prices to `regieessencequebec.ca` within 5 minutes of any change. ~2,700 stations covered. Data is downloadable. *This is the first such system in Canada.*
- **New Brunswick / Nova Scotia / PEI / Newfoundland & Labrador**: regulated weekly maximum prices published by provincial Energy and Utilities Boards. Slow but free and authoritative.
- **Ontario / Alberta / BC / MB / SK**: no regulated feed. Prices are fully market-driven and not centrally collected. Options are crowdsource (build like GasBuddy did), pay GasBuddy, scrape big-box websites, or surface Statistics Canada weekly city averages as an overlay.

If your home province isn't Quebec, **you should expect to start with crowdsourced data** and the explicit "we don't have prices" experience for any station that hasn't been reported yet.

---

## What's built

- 🗺️ Leaflet map showing **all OSM-mapped stations** within radius
- 📋 List view sorted by price or distance
- 🧮 "Worth it?" comparator with vehicle fuel economy presets and time-cost toggle
- 📍 Browser geolocation with manual fallback
- 🔌 Pluggable station and price providers
- 🌐 Stations cached in memory for 6 hours per (lat, lng) tile
- 📱 Responsive UI

## What still needs to be built

- **Quebec feed endpoint discovery.** Open `regieessencequebec.ca` in Chrome DevTools (Network tab) and grab the URL the map uses to load stations. Put it in `QUEBEC_REGIE_FEED_URL`. The provider has defensive normalizers for several likely response shapes.
- **Crowdsourced reports.** UI is wired but reports aren't persisted — add Postgres (Neon free tier recommended) and a `submit-price` endpoint.
- **Reporter trust scoring.** Combine time decay (already in `lib/freshness.js`), corroboration count, and median deviation.
- **Maritime province scrapers.** EUB sites publish weekly max prices in predictable HTML — straightforward to scrape and add as price providers.

---

## Quick start

```bash
npm install
npm run dev
```

Default config: OSM stations + seed prices. You'll see every gas station near your location, with seed prices on the few that match the seed file by brand/proximity.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel project settings as needed (see `.env.local.example`).

---

## Project layout

```
src/
  app/
    layout.jsx, page.jsx, globals.css
    api/stations/nearby/route.js     # combines stations + prices

  components/                          # UI

  lib/
    geo.js                            # Haversine, road-factor
    worthIt.js                        # The comparison math
    freshness.js                      # Price report decay scoring

    stationProviders/                 # WHERE stations are
      index.js
      osmStationProvider.js           # OSM Overpass API (default)
      seedStationProvider.js          # local JSON (dev)

    priceProviders/                   # WHAT they cost
      index.js
      seedPriceProvider.js            # local JSON
      quebecPriceProvider.js          # Régie de l'énergie (stub)
      nullPriceProvider.js            # no prices

  data/
    stations.json                     # Seed data
```

---

## v0.3 changes

- **Geolocation now uses high-accuracy mode** (`enableHighAccuracy: true`). On desktop you'll typically get Wi-Fi triangulation accuracy (±50–200 m) instead of IP-based location (±2–10 km). The accuracy is shown in the UI as `±Xm · GPS / Wi-Fi / approx / IP-based`.
- **Address search** with autocomplete (Canada-only by default). Powered by Nominatim (free, OSM-based) via two new API routes: `/api/geocode/search` and `/api/geocode/reverse`. Results are cached server-side and rate-limited to 1 req/sec per Nominatim's policy.
- **Draggable user pin.** The red user marker on the map can now be dragged anywhere — drop it to recenter the search. The accuracy circle disappears on drag (drag = manual placement, not GPS).
- **Reverse-geocoded addresses.** When OSM doesn't have `addr:*` tags for a station, the OSM provider now backfills via Nominatim reverse geocoding for the closest 5 stations per request. Tunable via `MAX_REVERSE_GEOCODE_PER_REQUEST` in `osmStationProvider.js`.
- **Address line is its own row in station cards** with a pin icon and a "Directions ↗" link that opens Google Maps.

## Nominatim usage policy reminder

Per [the OSMF policy](https://operations.osmfoundation.org/policies/nominatim/):
- 1 req/sec maximum (enforced in `lib/geocoding.js`)
- Descriptive User-Agent (set; update before going to production)
- No bulk imports
- For production with real traffic, **run your own Nominatim instance** or use a paid alternative — the public endpoint is for development and small-scale use.
