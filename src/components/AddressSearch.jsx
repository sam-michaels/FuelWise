'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function AddressSearch({ onSelect, placeholder = 'Search any Canadian address…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceTimer = useRef(null);
  const requestSeq = useRef(0);

  // Fetch with debounce
  const fetchResults = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const mySeq = ++requestSeq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      // Ignore stale responses (user has typed more since this request fired)
      if (mySeq !== requestSeq.current) return;
      setResults(data.results || []);
      setOpen(true);
      setActiveIdx(-1);
    } catch {
      if (mySeq === requestSeq.current) setResults([]);
    } finally {
      if (mySeq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchResults(query), 300);
    return () => debounceTimer.current && clearTimeout(debounceTimer.current);
  }, [query, fetchResults]);

  // Click-outside to close
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (r) => {
    onSelect({
      lat: r.lat,
      lng: r.lng,
      label: r.address || shortenLabel(r.label),
    });
    setQuery(r.address || shortenLabel(r.label));
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const onKey = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length === 0 && query.trim().length >= 2) {
        fetchResults(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeIdx >= 0 ? activeIdx : 0;
      if (results[idx]) choose(results[idx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 bg-bone hairline font-sans text-sm focus:outline-none focus:ring-2 focus:ring-signal/50 focus:bg-bone-soft transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <span className="dot-pulse text-ink/40 font-mono text-xs">
              <span>·</span><span>·</span><span>·</span>
            </span>
          ) : (
            <SearchIcon />
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-bone hairline shadow-lg max-h-72 overflow-auto">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => choose(r)}
                className={`w-full text-left px-4 py-2.5 border-b border-ink/5 last:border-b-0 transition-colors ${
                  activeIdx === i ? 'bg-ink text-bone' : 'hover:bg-bone-soft'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {r.address || shortenLabel(r.label)}
                </div>
                <div className={`text-xs truncate ${activeIdx === i ? 'text-bone/70' : 'text-ink/50'}`}>
                  {r.label}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-bone hairline shadow-lg px-4 py-3 text-sm text-ink/60">
          No matches in Canada. Try a more specific address.
        </div>
      )}
    </div>
  );
}

function shortenLabel(label) {
  if (!label) return '';
  return label.split(',').slice(0, 3).join(',').trim();
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" className="text-ink/40" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-ink/40" />
    </svg>
  );
}
