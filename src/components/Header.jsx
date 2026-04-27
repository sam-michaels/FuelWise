export default function Header() {
  return (
    <header className="relative z-20 border-b border-ink/10 bg-bone">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="font-display text-lg font-semibold tracking-tight">FuelWise</span>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40 ml-3 pl-3 border-l border-ink/10">
            🇨🇦 Canada
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
          <a href="#map" className="hover:text-ink">Map</a>
          <a href="#about" className="hover:text-ink">How it works</a>
          <a href="https://github.com" className="hover:text-ink">Source</a>
        </nav>
      </div>
    </header>
  );
}

function Mark() {
  // Simple geometric pump-shape mark
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="11" height="18" stroke="#0e1014" strokeWidth="1.6" />
      <path d="M14 7h3.5a2 2 0 0 1 2 2v8a1.5 1.5 0 0 1-3 0v-3.5a1.5 1.5 0 0 0-1.5-1.5H14" stroke="#0e1014" strokeWidth="1.6" />
      <path d="M6 8h5M6 11h5" stroke="#d94f30" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
