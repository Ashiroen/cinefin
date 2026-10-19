/** Minimum Jellyfin server Cinefin will talk to. Fills `[min version]` chips. */
export const MIN_SERVER_VERSION = '12.0.0';

/** Display form used on boards ("Needs Jellyfin 12.0+"). */
export const MIN_SERVER_VERSION_LABEL = '12.0';

export const CLIENT_NAME = 'Cinefin';
export const CLIENT_VERSION = '0.1.0';

/**
 * Compare dotted versions. Returns negative if a < b, 0 if equal, positive if a > b.
 * Ignores a leading 'v' and any "+build" / "-preview" suffix on a segment past the
 * numeric parts (so "12.0.0-rc1" still compares as 12.0.0 against the numeric tuple).
 */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

export function isServerSupported(version: string | undefined | null): boolean {
  if (!version) return false;
  return compareVersions(version, MIN_SERVER_VERSION) >= 0;
}

function parse(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((part) => {
      const m = part.match(/^(\d+)/);
      return m ? Number(m[1]) : 0;
    });
}
