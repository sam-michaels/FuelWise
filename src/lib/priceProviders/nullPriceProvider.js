/**
 * Null price provider — returns no prices.
 *
 * Use this when you only want station discovery and don't yet have a price
 * source. Stations will render on the map but with "—" for price. This is
 * an honest fallback for provinces without official feeds (ON, AB, BC, etc.).
 */

const nullPriceProvider = {
  async getPricesForStations(_stations) {
    return new Map();
  },
};

export default nullPriceProvider;
