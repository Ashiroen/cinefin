import { describe, expect, it } from 'vitest';
import {
  MIN_SERVER_VERSION,
  MIN_SERVER_VERSION_LABEL,
  compareVersions,
  isServerSupported,
  normalizeServerAddress,
} from '../src/index';

describe('server version gate', () => {
  it('requires Jellyfin 12.0 and labels chips as 12.0', () => {
    expect(MIN_SERVER_VERSION).toBe('12.0.0');
    expect(MIN_SERVER_VERSION_LABEL).toBe('12.0');
  });

  it.each([
    ['12.0.0', true],
    ['12.1.0', true],
    ['10.11.0', false],
    ['10.10.7', false],
    ['11.0.0', false],
    ['v12.0.0-rc1', true],
    [undefined, false],
  ])('isServerSupported(%s) → %s', (version, ok) => {
    expect(isServerSupported(version)).toBe(ok);
  });

  it('orders versions', () => {
    expect(compareVersions('10.11.0', '12.0.0')).toBeLessThan(0);
    expect(compareVersions('12.0.0', '12.0.0')).toBe(0);
    expect(compareVersions('12.1.0', '12.0.9')).toBeGreaterThan(0);
  });
});

describe('normalizeServerAddress', () => {
  it('assumes http and port 8096', () => {
    expect(normalizeServerAddress('192.168.1.20')).toBe('http://192.168.1.20:8096');
    expect(normalizeServerAddress('192.168.1.20:8096')).toBe('http://192.168.1.20:8096');
    expect(normalizeServerAddress('http://192.168.1.20:8096')).toBe(
      'http://192.168.1.20:8096',
    );
  });

  it('keeps https as-is (no forced 8096 on 443)', () => {
    expect(normalizeServerAddress('https://media.example.com')).toBe(
      'https://media.example.com',
    );
  });
});
