'use client';

import StationCard from './StationCard';

export default function StationList({
  stations,
  fuelType,
  selectedId,
  onSelect,
  onCompare,
  cheapestId,
  closestId,
  loading,
}) {
  if (loading && stations.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 hairline bg-bone-soft animate-pulse" />
        ))}
      </div>
    );
  }

  if (!loading && stations.length === 0) {
    return (
      <div className="p-8 hairline bg-bone-soft text-center">
        <p className="font-display text-xl mb-2">No stations within range</p>
        <p className="text-sm text-ink/60">
          Try expanding your search radius or moving the center location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-2xl">Stations</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
          {stations.length} found
        </span>
      </div>
      {stations.map((s, i) => (
        <StationCard
          key={s.id}
          station={s}
          fuelType={fuelType}
          isSelected={s.id === selectedId}
          isCheapest={s.id === cheapestId}
          isClosest={s.id === closestId}
          onSelect={() => onSelect && onSelect(s.id)}
          onCompare={onCompare}
          allStations={stations}
          rank={i}
        />
      ))}
    </div>
  );
}
