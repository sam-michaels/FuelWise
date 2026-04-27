'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import StationList from '@/components/StationList';
import LocationButton from '@/components/LocationButton';
import WorthItModal from '@/components/WorthItModal';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#e9e4d8] text-ink/60 text-sm">
      Loading map…
    </div>
  ),
});

const DEFAULT_CENTER = { lat: 42.9849, lng: -81.2453, label: 'London, ON' };

export default function Home() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fuelType, setFuelType] = useState('regular');
  const [sortBy, setSortBy] = useState('price');
  const [selectedId, setSelectedId] = useState(null);
  const [comparing, setComparing] = useState(null);

  const fetchStations = useCallback(async ({ lat, lng }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stations/nearby?lat=${lat}&lng=${lng}&radius=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStations(data.stations);
    } catch (err) {
      setError(err.message || 'Could not load stations');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever center moves. Drag updates and search updates both
  // pass through this single useEffect.
  useEffect(() => {
    fetchStations(center);
  }, [center.lat, center.lng, fetchStations]);

  const sortedStations = useMemo(() => {
    const copy = [...stations];
    if (sortBy === 'price') {
      copy.sort((a, b) => {
        const pa = a.prices?.[fuelType]?.cpl ?? Infinity;
        const pb = b.prices?.[fuelType]?.cpl ?? Infinity;
        return pa - pb;
      });
    } else {
      copy.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return copy;
  }, [stations, sortBy, fuelType]);

  const cheapest = useMemo(() => {
    return [...stations].sort((a, b) => {
      const pa = a.prices?.[fuelType]?.cpl ?? Infinity;
      const pb = b.prices?.[fuelType]?.cpl ?? Infinity;
      return pa - pb;
    })[0];
  }, [stations, fuelType]);

  const closest = useMemo(() => {
    return [...stations].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [stations]);

  const startComparison = useCallback(() => {
    if (cheapest && closest && cheapest.id !== closest.id) {
      if (closest.distanceKm <= cheapest.distanceKm) {
        setComparing({ closer: closest, farther: cheapest });
      } else {
        setComparing({ closer: cheapest, farther: closest });
      }
    }
  }, [cheapest, closest]);

  return (
    <main className="relative min-h-screen">
      <Header />

      <section className="relative z-10 border-b border-ink/10 bg-bone">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50 mb-4">
              Canadian fuel intelligence · v0.3
            </p>
            <h1 className="font-display text-5xl lg:text-7xl leading-[0.95] tracking-tight">
              Cheaper gas <span className="italic font-light">isn't</span><br />
              always cheaper.
            </h1>
            <p className="mt-6 text-ink/70 max-w-xl text-lg leading-relaxed">
              Find every station near you, search any address, drag the pin
              to refine. We'll do the math on whether the cheaper place is
              actually worth the drive.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            <LocationButton
              center={center}
              onLocationChange={setCenter}
              loading={loading}
            />
            {cheapest && closest && cheapest.id !== closest.id && (
              <button
                onClick={startComparison}
                className="group w-full text-left p-5 bg-ink text-bone hairline hover:bg-ink-soft transition-colors"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/60">
                    Quick compare
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/60 group-hover:text-signal transition-colors">
                    Run →
                  </span>
                </div>
                <div className="font-display text-2xl leading-tight">
                  Closest vs. cheapest:<br />
                  <span className="text-signal-soft">is the detour worth it?</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Fuel</span>
            <div className="flex hairline">
              {['regular', 'premium', 'diesel'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFuelType(f)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    fuelType === f ? 'bg-ink text-bone' : 'bg-transparent text-ink/70 hover:text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Sort</span>
            <div className="flex hairline">
              <button
                onClick={() => setSortBy('price')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'price' ? 'bg-ink text-bone' : 'text-ink/70 hover:text-ink'
                }`}
              >
                Price
              </button>
              <button
                onClick={() => setSortBy('distance')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'distance' ? 'bg-ink text-bone' : 'text-ink/70 hover:text-ink'
                }`}
              >
                Distance
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 h-[520px] hairline overflow-hidden">
          <MapView
            center={center}
            stations={stations}
            fuelType={fuelType}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCenterChange={setCenter}
          />
        </div>

        <div className="lg:col-span-5">
          {error && (
            <div className="p-4 mb-4 hairline bg-loss/10 text-loss text-sm">
              Couldn't load stations: {error}
            </div>
          )}
          <StationList
            stations={sortedStations}
            fuelType={fuelType}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCompare={(closer, farther) => setComparing({ closer, farther })}
            cheapestId={cheapest?.id}
            closestId={closest?.id}
            loading={loading}
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-ink/10 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-wrap justify-between gap-4 text-xs text-ink/50 font-mono uppercase tracking-[0.15em]">
          <span>Stations: OpenStreetMap. Geocoding: Nominatim.</span>
          <span>Map data © OpenStreetMap contributors.</span>
        </div>
      </footer>

      {comparing && (
        <WorthItModal
          closer={comparing.closer}
          farther={comparing.farther}
          fuelType={fuelType}
          onClose={() => setComparing(null)}
        />
      )}
    </main>
  );
}
