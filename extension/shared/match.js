// Match WebExtension URL patterns against a page URL.
export function matchesUrl(pattern, url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (pattern === '<all_urls>') {
    return ['http:', 'https:', 'ws:', 'wss:', 'ftp:', 'file:'].includes(parsed.protocol)
  }
  const parts = /^(\*|http|https|ws|wss|ftp|file):\/\/([^/]*)(\/.*)$/.exec(pattern)
  if (!parts) return false
  const [, scheme, host, path] = parts
  if (scheme === '*' ? !['http:', 'https:'].includes(parsed.protocol) : parsed.protocol !== `${scheme}:`) return false
  if (host !== '*' && !(host.startsWith('*.') && (parsed.hostname === host.slice(2) || parsed.hostname.endsWith(`.${host.slice(2)}`))) && parsed.hostname !== host) return false
  const expression = path.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  return new RegExp(`^${expression}$`).test(parsed.pathname + parsed.search)
}
