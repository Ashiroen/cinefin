/** Assume http:// and a default port when the user types a bare host. */
export function normalizeServerAddress(raw: string, defaultHttpPort = '8096'): string {
  let value = raw.trim();
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }
  try {
    const url = new URL(value);
    if (!url.port && url.protocol === 'http:') {
      url.port = defaultHttpPort;
    }
    // Drop a trailing slash so SDK paths join cleanly.
    return url.origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

export function deviceIdKey(installId: string, serverId: string, userId: string): string {
  return `${installId}:${serverId}:${userId}`;
}

export function randomId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
