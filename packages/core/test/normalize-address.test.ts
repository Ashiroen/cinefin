import { describe, expect, it } from 'vitest';
import { normalizeServerAddress } from '../src/jellyfin/normalize-address';
import { normalizePlexAddress } from '../src/plex/server';

describe('normalizeServerAddress', () => {
  it('keeps the Jellyfin default port', () => {
    expect(normalizeServerAddress('192.168.1.20')).toBe('http://192.168.1.20:8096');
  });
});

describe('normalizePlexAddress', () => {
  it('uses 32400 on bare hosts', () => {
    expect(normalizePlexAddress('192.168.1.20')).toBe('http://192.168.1.20:32400');
  });
});
