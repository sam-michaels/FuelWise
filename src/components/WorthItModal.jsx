'use client';

import { useState, useMemo, useEffect } from 'react';
import { compareStations, formatDollarsSigned } from '@/lib/worthIt';

const FUEL_ECONOMY_PRESETS = [
  { label: 'Compact car', value: 7.5 },
  { label: 'Midsize sedan', value: 8.5 },
  { label: 'SUV / Crossover', value: 10.5 },
  { label: 'Pickup truck', value: 13.0 },
  { label: 'Hybrid', value: 5.5 },
];

export default function WorthItModal({ closer, farther, fuelType, onClose }) {
  const [fillupL, setFillupL] = useState(40);
  const [economy, setEconomy] = useState(8.5);
  const [includeTime, setIncludeTime] = useState(false);
  const [hourly, setHourly] = useState(25);
  const [detourMin, setDetourMin] = useState(6);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const result = useMemo(() => {
    return compareStations({
      closer,
      farther,
      fillupLitres: fillupL,
      fuelEconomyLper100km: economy,
      fuelType,
      includeTime,
      hourlyValueDollars: hourly,
      detourTimeMinutes: detourMin,
    });
  }, [closer, farther, fillupL, economy, fuelType, includeTime, hourly, detourMin]);

  if (result.error) return null;

  const verdictCopy = {
    farther_wins: {
      headline: 'The detour pays off.',
      sub: `Drive to ${farther.name}.`,
      tone: 'gain',
    },
    closer_wins: {
      headline: 'Stay closer.',
      sub: `${closer.name} is the better play.`,
      tone: 'loss',
    },
    wash: {
      headline: 'It\'s a wash.',
      sub: 'Within 25¢ either way — pick whichever\'s easier.',
      tone: 'neutral',
    },
  }[result.verdict];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-bone hairline shadow-2xl my-8"
      >
        {/* Top header bar */}
        <div className="flex items-center justify-between p-5 border-b border-ink/10 bg-ink text-bone">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/60">
              Worth-it analysis · {fuelType}
            </p>
            <h2 className="font-display text-2xl mt-1">
              {closer.name} <span className="text-bone/40">vs.</span> {farther.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-bone/60 hover:text-signal transition-colors"
          >
            CLOSE ✕
          </button>
        </div>

        {/* Big verdict */}
        <div className={`p-6 lg:p-8 border-b border-ink/10 ${
          verdictCopy.tone === 'gain' ? 'bg-gain/5' :
          verdictCopy.tone === 'loss' ? 'bg-loss/5' : 'bg-bone-soft'
        }`}>
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50 mb-2">
                The verdict
              </p>
              <h3 className={`font-display text-4xl lg:text-5xl leading-[0.95] ${
                verdictCopy.tone === 'gain' ? 'text-gain' :
                verdictCopy.tone === 'loss' ? 'text-loss' : 'text-ink'
              }`}>
                {verdictCopy.headline}
              </h3>
              <p className="text-ink/70 mt-2">{verdictCopy.sub}</p>
            </div>
            <div className="lg:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
                Net savings
              </p>
              <div className={`font-display text-5xl lg:text-6xl tabular leading-none mt-1 ${
                result.netSavings >= 0 ? 'text-gain' : 'text-loss'
              }`}>
                {formatDollarsSigned(result.netSavings)}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Per fillup of {fillupL} L
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-6 lg:p-8 grid md:grid-cols-2 gap-x-8 gap-y-5 border-b border-ink/10">
          <BreakdownRow
            label="Price gap"
            value={`${(closer.prices[fuelType].cpl - farther.prices[fuelType].cpl).toFixed(1)}¢/L`}
            sub={`${closer.prices[fuelType].cpl.toFixed(1)} → ${farther.prices[fuelType].cpl.toFixed(1)}`}
          />
          <BreakdownRow
            label="Savings on fillup"
            value={formatDollarsSigned(result.savingsOnFillup)}
            sub={`${fillupL} L × price difference`}
            tone={result.savingsOnFillup >= 0 ? 'gain' : 'loss'}
          />
          <BreakdownRow
            label="Extra distance"
            value={`${result.extraDistanceKm.toFixed(1)} km`}
            sub="round-trip detour"
          />
          <BreakdownRow
            label="Fuel burned getting there"
            value={`${result.extraFuelL.toFixed(2)} L`}
            sub={`${formatDollarsSigned(-result.extraFuelCost)} at pump price`}
            tone="loss"
          />
          {includeTime && (
            <BreakdownRow
              label="Time cost"
              value={formatDollarsSigned(-result.timeCost)}
              sub={`${detourMin} min × $${hourly}/h`}
              tone="loss"
            />
          )}
          {result.breakEvenLitres != null && (
            <BreakdownRow
              label="Break-even fillup"
              value={`${result.breakEvenLitres.toFixed(1)} L`}
              sub="fillup size where detour is neutral"
            />
          )}
        </div>

        {/* Knobs */}
        <div className="p-6 lg:p-8 space-y-5 bg-bone-soft">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
            Tune the math
          </p>

          <Slider
            label="Fillup size"
            value={fillupL}
            onChange={setFillupL}
            min={5}
            max={80}
            step={1}
            unit="L"
          />

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-sm font-medium">Fuel economy</label>
              <span className="font-mono text-sm tabular">{economy.toFixed(1)} L/100km</span>
            </div>
            <input
              type="range"
              min={4}
              max={20}
              step={0.5}
              value={economy}
              onChange={(e) => setEconomy(parseFloat(e.target.value))}
              className="w-full accent-signal"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {FUEL_ECONOMY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setEconomy(p.value)}
                  className={`text-xs px-2 py-1 hairline hover:bg-ink hover:text-bone transition-colors ${
                    economy === p.value ? 'bg-ink text-bone' : 'bg-bone'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-ink/10 pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="accent-signal"
              />
              <span className="text-sm font-medium">Factor in the value of my time</span>
            </label>
            {includeTime && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Slider
                  label="My time is worth"
                  value={hourly}
                  onChange={setHourly}
                  min={5}
                  max={100}
                  step={1}
                  unit="$/h"
                />
                <Slider
                  label="Extra time"
                  value={detourMin}
                  onChange={setDetourMin}
                  min={0}
                  max={30}
                  step={1}
                  unit="min"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ink/10 flex justify-between items-center text-xs text-ink/50">
          <span>
            Prices are crowdsourced & may be stale. Verify at the pump.
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink hover:text-signal transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, sub, tone }) {
  const toneClass = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : 'text-ink';
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-ink/50 mt-0.5">{sub}</div>}
      </div>
      <div className={`font-mono font-semibold text-lg tabular ${toneClass}`}>{value}</div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, unit }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-sm font-medium">{label}</label>
        <span className="font-mono text-sm tabular">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-signal"
      />
    </div>
  );
}
