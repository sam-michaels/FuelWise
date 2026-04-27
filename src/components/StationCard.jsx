'use client';

import { useState } from 'react';
import { freshnessScore, freshnessLabel, relativeTime } from '@/lib/freshness';

const TONE_CLASSES = {
  gain: 'text-gain',
  neutral: 'text-ink/60',
  warn: 'text-amber-700',
  loss: 'text-loss',
};

export default function StationCard({
  station,
  fuelType,
  isSelected,
  isCheapest,
  isClosest,
  onSelect,
  onCompare,
  allStations,
  rank,
}) {
  const [showCompare, setShowCompare] = useState(false);
  const priceData = station.prices?.[fuelType];
  const cpl = priceData?.cpl;
  const fScore = priceData ? freshnessScore(priceData.reportedAt) : 0;
  const fLabel = freshnessLabel(fScore);

  // Build a Google Maps URL for navigation
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&destination_place_id=`;

  return (
    <div
      onClick={onSelect}
      className={`fade-up group relative p-4 hairline cursor-pointer transition-all ${
        isSelected ? 'bg-ink text-bone' : 'bg-bone-soft hover:bg-bone'
      }`}
      style={{ animationDelay: `${rank * 40}ms` }}
    >
      {/* Top row: name + price */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg leading-tight truncate">{station.name}</h3>
            {isCheapest && (
              <span className={`font-mono text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 ${
                isSelected ? 'bg-bone text-ink' : 'bg-gain text-bone'
              }`}>
                Cheapest
              </span>
            )}
            {isClosest && !isCheapest && (
              <span className={`font-mono text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 ${
                isSelected ? 'bg-bone text-ink' : 'bg-ink text-bone'
              }`}>
                Closest
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold text-2xl tabular leading-none">
            {cpl != null ? cpl.toFixed(1) : '—'}
            <span className={`text-xs ml-0.5 ${isSelected ? 'text-bone/60' : 'text-ink/40'}`}>¢/L</span>
          </div>
          {priceData ? (
            <div className={`font-mono text-[10px] uppercase tracking-[0.15em] mt-1 ${
              isSelected ? 'text-bone/60' : TONE_CLASSES[fLabel.tone]
            }`}>
              {fLabel.label} · {relativeTime(priceData.reportedAt)}
            </div>
          ) : (
            <div className={`font-mono text-[10px] uppercase tracking-[0.15em] mt-1 ${
              isSelected ? 'text-bone/60' : 'text-ink/40'
            }`}>
              No price data
            </div>
          )}
        </div>
      </div>

      {/* Address — now its own line, more prominent */}
      {station.address ? (
        <div className={`mt-2 text-sm flex items-start gap-1.5 ${
          isSelected ? 'text-bone/80' : 'text-ink/70'
        }`}>
          <PinIconSmall className="mt-0.5 shrink-0 opacity-50" />
          <span className="leading-snug">{station.address}</span>
        </div>
      ) : (
        <div className={`mt-2 text-xs italic ${isSelected ? 'text-bone/50' : 'text-ink/40'}`}>
          Address not available
        </div>
      )}

      {/* Bottom row: distance + actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-current/10">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs tabular">
            <span className={isSelected ? 'text-bone/60' : 'text-ink/50'}>↗</span>{' '}
            {station.distanceKm?.toFixed(1)} km
          </span>
          {station.amenities?.length > 0 && (
            <span className={`text-xs ${isSelected ? 'text-bone/60' : 'text-ink/50'}`}>
              {station.amenities.slice(0, 2).map(formatAmenity).join(' · ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`font-mono text-[10px] uppercase tracking-[0.18em] hover:text-signal transition-colors ${
              isSelected ? 'text-bone/70' : 'text-ink/50'
            }`}
          >
            Directions ↗
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCompare(!showCompare);
            }}
            className={`font-mono text-[10px] uppercase tracking-[0.18em] hover:text-signal transition-colors ${
              isSelected ? 'text-bone/70' : 'text-ink/50'
            }`}
          >
            Compare ↔
          </button>
        </div>
      </div>

      {/* Inline compare picker */}
      {showCompare && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`mt-3 pt-3 border-t border-current/10 ${isSelected ? 'text-bone' : 'text-ink'}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2 opacity-60">
            Compare {station.name} vs.
          </div>
          <div className="flex flex-wrap gap-1">
            {allStations
              .filter((s) => s.id !== station.id)
              .slice(0, 6)
              .map((other) => (
                <button
                  key={other.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    const closer = station.distanceKm <= other.distanceKm ? station : other;
                    const farther = closer === station ? other : station;
                    onCompare(closer, farther);
                    setShowCompare(false);
                  }}
                  className={`text-xs px-2 py-1 hairline hover:bg-signal hover:text-bone transition-colors ${
                    isSelected ? 'bg-ink-soft' : 'bg-bone'
                  }`}
                >
                  {other.name}{' '}
                  <span className="opacity-60">
                    {other.prices?.[fuelType]?.cpl ? `(${other.prices[fuelType].cpl.toFixed(1)})` : '(—)'}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatAmenity(a) {
  return a.replace(/_/g, ' ');
}

function PinIconSmall({ className = '' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M6 1.5c-2 0-3.5 1.5-3.5 3.5S6 10.5 6 10.5 9.5 6 9.5 5 8 1.5 6 1.5z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="5" r="1.2" fill="currentColor" />
    </svg>
  );
}
