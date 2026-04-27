import { NextResponse } from 'next/server';
import { getStationProvider } from '@/lib/stationProviders';
import { getPriceProvider } from '@/lib/priceProviders';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const radiusKm = parseFloat(searchParams.get('radius')) || 10;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query params are required' },
      { status: 400 }
    );
  }

  try {
    // 1. Find ALL stations near the point (from OSM by default)
    const stationProvider = getStationProvider();
    const stations = await stationProvider.getStationsNear({ lat, lng, radiusKm });

    // 2. Decorate them with prices from whatever price provider is configured
    const priceProvider = getPriceProvider();
    const priceMap = await priceProvider.getPricesForStations(stations);

    const enriched = stations.map((s) => ({
      ...s,
      prices: priceMap.get(s.id) || s.prices || {},
    }));

    return NextResponse.json({
      stations: enriched,
      center: { lat, lng },
      counts: {
        total: enriched.length,
        withPrices: enriched.filter((s) => Object.keys(s.prices).length > 0).length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
