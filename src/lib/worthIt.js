/**
 * "Is it worth driving farther for cheaper gas?"
 *
 * The simple model:
 *   savings on the fillup  =  fillupL × (price_close − price_far)
 *   cost of extra driving  =  2 × (dist_far − dist_close) × (econ/100) × price_far
 *   net savings            =  savings − extra_cost
 *
 * `2 ×` because we drive there and back. Distances are road-km, not crow-flies.
 *
 * Caveats this version intentionally ignores:
 *   • The fuel in your tank was bought at some prior price (we use price_far
 *     as the price of fuel-while-driving, which is the marginal cost if you
 *     refill anyway).
 *   • Time value. If your time costs $30/h and the detour takes 10 min extra,
 *     that's $5 the simple model misses. Toggle includeTime to factor it in.
 *   • Traffic, idling, terrain.
 *
 * Inputs use cents/L (cpl) for prices because that's how Canadian pumps display.
 * Outputs are in dollars.
 */

export function compareStations({
  closer,
  farther,
  fillupLitres,
  fuelEconomyLper100km,
  fuelType = 'regular',
  includeTime = false,
  hourlyValueDollars = 0,
  detourTimeMinutes = 0,
}) {
  const priceCloseCpl = closer.prices?.[fuelType]?.cpl;
  const priceFarCpl = farther.prices?.[fuelType]?.cpl;

  if (priceCloseCpl == null || priceFarCpl == null) {
    return { error: `Missing ${fuelType} price for one of the stations.` };
  }

  // cents → dollars
  const priceCloseDpl = priceCloseCpl / 100;
  const priceFarDpl = priceFarCpl / 100;

  const distCloseKm = closer.distanceKm ?? 0;
  const distFarKm = farther.distanceKm ?? 0;

  // Round-trip extra distance to the farther station vs the closer one.
  const extraDistanceKm = 2 * Math.max(0, distFarKm - distCloseKm);
  const extraFuelL = extraDistanceKm * (fuelEconomyLper100km / 100);
  const extraFuelCost = extraFuelL * priceFarDpl;

  const savingsOnFillup = fillupLitres * (priceCloseDpl - priceFarDpl);

  const timeCost = includeTime
    ? (detourTimeMinutes / 60) * hourlyValueDollars
    : 0;

  const netSavings = savingsOnFillup - extraFuelCost - timeCost;

  // Break-even fillup size: how many litres make the detour neutral?
  // savings(L) - extraCost = 0  →  L = extraCost / (priceClose - priceFar)
  // Only meaningful when farther is cheaper.
  const priceGapDpl = priceCloseDpl - priceFarDpl;
  const breakEvenLitres =
    priceGapDpl > 0 ? (extraFuelCost + timeCost) / priceGapDpl : null;

  return {
    closer: { id: closer.id, name: closer.name, priceCpl: priceCloseCpl, distanceKm: distCloseKm },
    farther: { id: farther.id, name: farther.name, priceCpl: priceFarCpl, distanceKm: distFarKm },
    extraDistanceKm,
    extraFuelL,
    extraFuelCost,
    savingsOnFillup,
    timeCost,
    netSavings,
    breakEvenLitres,
    verdict:
      netSavings > 0.25 ? 'farther_wins' :
      netSavings < -0.25 ? 'closer_wins' : 'wash',
  };
}

/** Pretty-format dollars with sign */
export function formatDollarsSigned(n) {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
