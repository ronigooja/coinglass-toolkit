/**
 * Fetch a URL and return the parsed JSON body. HTTP error statuses do not throw,
 * because venues report "unknown market" as an error body that adapters interpret.
 * Network failures and non-JSON bodies throw.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

/** @param {Array<[string|number, string|number]>} levels @param {number} mult */
export function toLevels(levels, mult = 1) {
  return levels.map(([p, q]) => [Number(p), Number(q) * mult]);
}
