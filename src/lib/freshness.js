/**
 * Price freshness — how much do we trust this report?
 *
 * Returns 0 (stale, untrusted) → 1 (fresh, trusted), using exponential decay:
 *   score = 0.5 ^ (ageHours / halfLifeHours)
 *
 * Default half-life is 12h: a report 12h old has score 0.5; a report 24h old
 * has 0.25; etc. Tune this once you have actual reporting cadence data.
 *
 * In production you'd combine this with reporter trust score, # of corroborating
 * reports near the same timestamp, and price-vs-regional-median sanity checks.
 */

const DEFAULT_HALF_LIFE_HOURS = 12;

export function freshnessScore(reportedAt, now = new Date(), halfLifeHours = DEFAULT_HALF_LIFE_HOURS) {
  if (!reportedAt) return 0;
  const reported = reportedAt instanceof Date ? reportedAt : new Date(reportedAt);
  const ageHours = Math.max(0, (now - reported) / 36e5);
  return Math.pow(0.5, ageHours / halfLifeHours);
}

export function freshnessLabel(score) {
  if (score >= 0.85) return { label: 'Fresh', tone: 'gain' };
  if (score >= 0.5)  return { label: 'Recent', tone: 'neutral' };
  if (score >= 0.2)  return { label: 'Aging', tone: 'warn' };
  return { label: 'Stale', tone: 'loss' };
}

export function relativeTime(reportedAt, now = new Date()) {
  if (!reportedAt) return 'unknown';
  const reported = reportedAt instanceof Date ? reportedAt : new Date(reportedAt);
  const ageMin = Math.floor((now - reported) / 60000);
  if (ageMin < 1) return 'just now';
  if (ageMin < 60) return `${ageMin} min ago`;
  const ageH = Math.floor(ageMin / 60);
  if (ageH < 24) return `${ageH}h ago`;
  const ageD = Math.floor(ageH / 24);
  return `${ageD}d ago`;
}
