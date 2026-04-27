/**
 * Station provider factory.
 *
 * Every station provider exposes:
 *   getStationsNear({ lat, lng, radiusKm }): Promise<Station[]>
 *   getStation(id): Promise<Station | null>
 *
 * Stations from this layer have NO prices — prices are layered on by the
 * price provider in src/lib/priceProviders. This separation matters because
 * "where stations are" and "what they cost" come from totally different
 * sources with totally different freshness, coverage, and reliability.
 */

import osmStationProvider from './osmStationProvider';
import seedStationProvider from './seedStationProvider';

const providers = {
  osm: osmStationProvider,
  seed: seedStationProvider,
};

export function getStationProvider() {
  const name = process.env.STATION_PROVIDER || 'osm';
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown STATION_PROVIDER: ${name}`);
  return provider;
}
