'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';

function makePinIcon({ priceCpl, isCheapest, isSelected, color }) {
  const fill = color || '#0e1014';
  const stroke = isSelected ? '#d94f30' : '#0e1014';
  const strokeW = isSelected ? 2.5 : 1.4;
  const labelBg = isCheapest ? '#1f8a4c' : '#0e1014';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="58" viewBox="0 0 44 58">
      <path d="M22 1c11.6 0 21 9.2 21 20.6 0 14-21 35.4-21 35.4S1 35.6 1 21.6C1 10.2 10.4 1 22 1z"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
      <rect x="6" y="11" width="32" height="18" rx="2" fill="${labelBg}" />
      <text x="22" y="23" text-anchor="middle" fill="#f4f1ea"
            font-family="ui-monospace, monospace" font-size="10" font-weight="700">
        ${priceCpl != null ? priceCpl.toFixed(1) : '—'}
      </text>
    </svg>`;

  return L.divIcon({
    className: 'fw-marker',
    html: svg,
    iconSize: [44, 58],
    iconAnchor: [22, 56],
    popupAnchor: [0, -50],
  });
}

// User marker — visually emphasised as draggable with a target/crosshair shape
function userIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <defs>
        <filter id="sh" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#sh)">
        <circle cx="18" cy="18" r="14" fill="#d94f30" fill-opacity="0.18" stroke="#d94f30" stroke-width="1" stroke-dasharray="2 2"/>
        <circle cx="18" cy="18" r="8" fill="#d94f30" stroke="#f4f1ea" stroke-width="2.5"/>
        <circle cx="18" cy="18" r="2" fill="#f4f1ea"/>
      </g>
    </svg>`;
  return L.divIcon({
    className: 'fw-marker fw-user-marker',
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.6 });
  }, [center.lat, center.lng, map]);
  return null;
}

function colourForPrice(cpl, min, max) {
  if (cpl == null || min == null || max == null || max === min) return '#0e1014';
  const t = (cpl - min) / (max - min);
  if (t <= 0.15) return '#1f8a4c';
  if (t >= 0.85) return '#c43a3a';
  return '#0e1014';
}

export default function MapView({
  center,
  stations,
  fuelType,
  selectedId,
  onSelect,
  onCenterChange,
}) {
  const prices = stations.map((s) => s.prices?.[fuelType]?.cpl).filter((p) => p != null);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const cheapestId = stations.find((s) => s.prices?.[fuelType]?.cpl === minPrice)?.id;

  // Show accuracy circle if we know the accuracy (from geolocation)
  const accuracyM = center.accuracyM;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo center={center} />

      {/* GPS accuracy circle, when known */}
      {Number.isFinite(accuracyM) && (
        <Circle
          center={[center.lat, center.lng]}
          radius={accuracyM}
          pathOptions={{
            color: '#d94f30',
            weight: 1,
            opacity: 0.4,
            fillColor: '#d94f30',
            fillOpacity: 0.06,
          }}
        />
      )}

      {/* Draggable user marker */}
      <Marker
        position={[center.lat, center.lng]}
        icon={userIcon()}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const ll = e.target.getLatLng();
            onCenterChange?.({
              lat: ll.lat,
              lng: ll.lng,
              label: 'Custom location',
              // Drop accuracyM — drag = manual placement, not GPS
            });
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -16]} opacity={0.9} permanent={false}>
          Drag me to refine
        </Tooltip>
        <Popup>
          You are here<br />
          <span style={{ fontSize: 11, color: '#888' }}>Drag this pin to move the search center</span>
        </Popup>
      </Marker>

      {stations.map((s) => {
        const cpl = s.prices?.[fuelType]?.cpl;
        const fill = colourForPrice(cpl, minPrice, maxPrice);
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={makePinIcon({
              priceCpl: cpl,
              isCheapest: s.id === cheapestId,
              isSelected: s.id === selectedId,
              color: fill,
            })}
            eventHandlers={{
              click: () => onSelect && onSelect(s.id),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: 220 }}>
                <strong>{s.name}</strong>
                <br />
                {s.address && (
                  <>
                    <span style={{ fontSize: 12, color: '#666' }}>{s.address}</span>
                    <br />
                  </>
                )}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                  {cpl != null ? `${cpl.toFixed(1)}¢/L ${fuelType}` : '— price unknown'}
                </span>
                <br />
                <span style={{ fontSize: 11, color: '#888' }}>
                  {s.distanceKm?.toFixed(1)} km away
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
