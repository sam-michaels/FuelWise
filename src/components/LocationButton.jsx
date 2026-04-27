'use client';

import { useState } from 'react';
import AddressSearch from './AddressSearch';

export default function LocationButton({ center, onLocationChange, loading }) {
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setDenied(true);
      setErrorMsg('Your browser does not support geolocation.');
      return;
    }
    setRequesting(true);
    setErrorMsg(null);

    // High accuracy: tells the browser to use GPS / WiFi triangulation when
    // available. Without this, desktop browsers default to IP-based location
    // which can be off by km.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          label: 'Your location',
        });
        setRequesting(false);
        setDenied(false);
      },
      (err) => {
        setRequesting(false);
        setDenied(true);
        const msgs = {
          1: 'Location permission denied. Use the search above or drag the pin on the map.',
          2: 'Location unavailable right now. Use the search above or drag the pin on the map.',
          3: 'Location request timed out. Use the search above or drag the pin on the map.',
        };
        setErrorMsg(msgs[err.code] || 'Could not get your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const accuracyLabel = formatAccuracy(center.accuracyM);

  return (
    <div className="p-5 bg-bone-soft hairline space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
          Search center
        </span>
        {loading && (
          <span className="dot-pulse text-ink/40 font-mono text-xs">
            <span>·</span><span>·</span><span>·</span>
          </span>
        )}
      </div>

      {/* Address search input */}
      <AddressSearch onSelect={onLocationChange} />

      <div className="flex items-center gap-3 text-xs text-ink/50">
        <div className="flex-1 h-px bg-ink/10" />
        <span className="font-mono uppercase tracking-[0.18em]">or</span>
        <div className="flex-1 h-px bg-ink/10" />
      </div>

      {/* Use my location */}
      <button
        onClick={requestLocation}
        disabled={requesting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-bone hover:bg-ink-soft disabled:opacity-60 transition-colors font-mono text-xs uppercase tracking-[0.18em]"
      >
        {requesting ? (
          <>
            <Spinner /> Locating…
          </>
        ) : (
          <>
            <PinIcon /> Use my location
          </>
        )}
      </button>

      {/* Current location display */}
      <div className="pt-1 border-t border-ink/10">
        <div className="font-display text-xl truncate">
          {center.label || 'Custom location'}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-[11px] text-ink/40 tabular">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
          {accuracyLabel && (
            <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${accuracyLabel.tone}`}>
              {accuracyLabel.text}
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink/50 mt-2 leading-snug">
          Not quite right? <strong className="text-ink/70">Drag the pin</strong> on the map or
          search a specific address above.
        </div>
      </div>

      {errorMsg && (
        <div className="text-xs text-loss">{errorMsg}</div>
      )}
    </div>
  );
}

function formatAccuracy(m) {
  if (!Number.isFinite(m)) return null;
  if (m < 50) return { text: `±${Math.round(m)}m · GPS`, tone: 'text-gain' };
  if (m < 500) return { text: `±${Math.round(m)}m · Wi-Fi`, tone: 'text-ink/50' };
  if (m < 5000) return { text: `±${(m / 1000).toFixed(1)}km · approx`, tone: 'text-amber-700' };
  return { text: `±${Math.round(m / 1000)}km · IP-based`, tone: 'text-loss' };
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5c-2 0-3.5 1.5-3.5 3.5S6 10.5 6 10.5 9.5 6 9.5 5 8 1.5 6 1.5z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M10.5 6a4.5 4.5 0 0 0-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
