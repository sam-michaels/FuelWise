# FuelWise — Canadian Gas Price Tracker

A web app that shows nearby gas stations on a map, lets users compare prices, and calculates whether driving farther for cheaper gas is actually worth it once you account for the fuel burned getting there.

Built with Next.js 14 (App Router), Leaflet/OpenStreetMap, and Tailwind. Designed to deploy to Vercel + a managed Postgres in under 15 minutes.

---

## The single most important thing to read before you build further

**Real-time gas prices are not free in Canada.** There is no public Canadian API equivalent to Germany's MTS-K or the UK's CMA feed. Every approach has tradeoffs:

| Source                                                                    | Coverage         | Freshness                    | Cost                       | Risk                                    |
| ------------------------------------------------------------------------- | ---------------- | ---------------------------- | -------------------------- | --------------------------------------- |
| **Crowdsourced reports** (this app's default)                             | Grows with users | Variable; depends on reports | Free                       | Cold-start problem                      |
| **GasBuddy Business API**                                                 | National         | Live                         | $$$$ (enterprise contract) | Cost barrier                            |
| **Provincial regulators** (NB EUB, NL PUB, NS UARB, PEI IRAC, RDÉ Québec) | 5 provinces only | Daily/weekly max             | Free                       | Excludes ON, AB, BC, etc.               |
| **Web scraping** (GasBuddy, Costco, etc.)                                 | National         | Live                         | Free-ish                   | ToS violation, breaks often, legal risk |

### The architecture decision

This app is built around a **`PriceProvider` interface** in `src/lib/priceProviders/`. The default implementation uses seed data + a crowdsourced report endpoint with freshness scoring. To switch to a paid API or a scraper later, you implement one interface and swap it in. **The rest of the app does not change.**

I'd start with:

1. Crowdsourced reporting (built into this template) for your home city
2. Add the regulated-province feeds where they exist (free, easy wins)
3. Only consider the GasBuddy contract once you have meaningful traffic

---

## What's built

- 🗺️ Leaflet map with stations clustered around the user's geolocation
- 📋 List view sorted by distance or price
- 🧮 "Worth it?" calculator: compares two stations, factors in vehicle fuel economy and round-trip distance, tells you the actual savings (or loss) in dollars
- 📍 Browser geolocation with manual override
- 🌗 Pluggable price-data provider (seed JSON by default; swap in your real source)
- 📱 Responsive — works as a PWA-able web app on phones

## What's stubbed and needs you to finish it

- **Price reporting submission** — UI is wired; you need to add a database (Neon/Supabase recommended) and persist reports
- **Authentication** — none, for simplicity. Add Auth.js when you want trust levels for reporters
- **Price decay/freshness** — algorithm is in `src/lib/freshness.js`, called everywhere prices are read; tune the half-life constant for your needs
- **Scraping the regulated provinces** — `src/lib/priceProviders/` has the interface; implementations are TODO

---

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts. Free tier is plenty until you grow. When you add a database:

- **Neon** (recommended): https://neon.tech — generous free tier, native Postgres
- **Supabase**: also great, includes auth if you want it later
- Set `DATABASE_URL` in Vercel project settings

## Project layout

```
src/
  app/
    layout.jsx           # Root layout, fonts, theme
    page.jsx             # Main app shell
    globals.css          # Tailwind + custom CSS
    api/
      stations/
        nearby/route.js  # GET nearby stations + prices
  components/
    MapView.jsx          # Leaflet map (dynamic import — no SSR)
    StationList.jsx      # Sorted list of stations
    StationCard.jsx      # Individual station row
    WorthItModal.jsx     # The comparison calculator
    LocationButton.jsx   # Geolocate / manual entry
    Header.jsx
  lib/
    geo.js               # Haversine distance
    worthIt.js           # The savings calculation
    freshness.js         # Price report decay scoring
    priceProviders/
      index.js           # Provider interface + factory
      seedProvider.js    # Default: reads from seed JSON
  data/
    stations.json        # Seed data (London, ON area)
```

## The "worth it" calculation

Given two stations, the question is: _do I save more on the cheaper gas than I burn driving extra distance to get it?_

```
extraDistanceKm   = 2 * (distanceFar - distanceClose)        # round trip
extraFuelLitres   = extraDistanceKm * (fuelEconomy / 100)
extraFuelCost     = extraFuelLitres * priceFar               # gas you'll burn
savingsOnFillup   = fillupLitres * (priceClose - priceFar)
netSavings        = savingsOnFillup - extraFuelCost
```

If `netSavings > 0`, the farther station wins. The UI also shows break-even fillup size.

There's a more sophisticated version that accounts for the price of fuel you've already paid for in your tank, time value, and traffic — see comments in `src/lib/worthIt.js`. The simple version above is what the UI uses by default.

---

## Legal / ethical notes

- **Don't scrape GasBuddy.** Their ToS is clear and they do enforce it.
- **Crowdsourced data can be wrong.** Build in confidence scoring (distance from last report, time decay, number of corroborating reports) before you publish prices to a wide audience.
- **Privacy.** Geolocation should be opt-in and never persisted server-side without consent. This template requests permission and keeps location client-side.
