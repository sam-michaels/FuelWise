/**
 * Price provider factory.
 *
 * Every price provider exposes:
 *   getPricesForStations(stations): Promise<Map<stationId, PriceRecord>>
 *
 * where PriceRecord = { regular?: { cpl, reportedAt, source }, premium?, diesel? }
 *
 * The API route fetches stations from the StationProvider, then asks the
 * PriceProvider to enrich them. Providers should silently return nothing
 * for stations they don't have prices for — that's expected, not an error.
 */

import seedPriceProvider from './seedPriceProvider';
import quebecPriceProvider from './quebecPriceProvider';
import nullPriceProvider from './nullPriceProvider';

const providers = {
  seed: seedPriceProvider,         // illustrative seed JSON
  quebec: quebecPriceProvider,     // Régie de l'énergie open data (stub)
  null: nullPriceProvider,         // returns nothing — stations without prices
  // crowdsource: yourCrowdsourceProvider, // wire up your DB
  // gasbuddy:    gasbuddyProvider,        // contract required
};

export function getPriceProvider() {
  const name = process.env.PRICE_PROVIDER || 'seed';
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown PRICE_PROVIDER: ${name}`);
  return provider;
}
