import { describe, expect, it } from 'vitest';
import { LG_C2_WEBOS22, buildDeviceProfile, resolveConvertTo } from '../src/index';

describe('buildDeviceProfile', () => {
  const profile = buildDeviceProfile(LG_C2_WEBOS22);

  it('does not advertise DTS in DirectPlayProfiles (C2 has no DTS)', () => {
    const audio = profile.DirectPlayProfiles.map((p) => p.AudioCodec ?? '').join(',');
    expect(audio).not.toMatch(/dts/i);
    expect(audio).toMatch(/eac3/);
    expect(audio).toMatch(/ac3/);
  });

  it('does not advertise TrueHD until confirmed', () => {
    const audio = profile.DirectPlayProfiles.map((p) => p.AudioCodec ?? '').join(',');
    expect(audio).not.toMatch(/truehd/i);
  });

  it('asks for progressive HTTP, never HLS', () => {
    for (const t of profile.TranscodingProfiles) {
      expect(t.Protocol).toBe('http');
    }
  });

  it('uses Auto convert-to (E-AC-3 on the C2 seed) instead of forcing AC-3', () => {
    expect(resolveConvertTo(LG_C2_WEBOS22, 'auto')).toBe('eac3');
    const audio = profile.TranscodingProfiles.map((p) => p.AudioCodec).join(',');
    expect(audio).toMatch(/eac3/);
  });

  it('blocks Dolby Vision inside MKV so the server remuxes', () => {
    const mkv = profile.ContainerProfiles.filter((p) => p.Container === 'mkv');
    expect(mkv.length).toBeGreaterThan(0);
    const values = mkv.flatMap((p) => p.Conditions.map((c) => c.Value));
    expect(values).toContain('DOVI');
  });

  it('burns in PGS/ASS and keeps SRT external', () => {
    const srt = profile.SubtitleProfiles.filter((s) => s.Format === 'srt').map((s) => s.Method);
    expect(srt).toContain('External');
    expect(profile.SubtitleProfiles.find((s) => s.Format === 'pgssub')?.Method).toBe('Encode');
    expect(profile.SubtitleProfiles.find((s) => s.Format === 'ass')?.Method).toBe('Encode');
  });
});
