import { describe, expect, it } from 'vitest';
import {
  LG_C2_WEBOS22,
  applyOverrides,
  cloneTable,
  decidePlayback,
  needsBurnIn,
  resolveConvertTo,
  type ItemMedia,
  type ReceiverOverrides,
} from '../src/index';

function hevcMovie(over: Partial<ItemMedia> & { audio?: ItemMedia['audio']; video?: Partial<ItemMedia['video']> }): ItemMedia {
  return {
    container: over.container ?? 'mkv',
    video: {
      codec: 'hevc',
      range: 'hdr10',
      ...over.video,
    },
    audio: over.audio ?? { codec: 'eac3', channels: 8, isAtmos: true },
    subtitle: over.subtitle,
  };
}

describe('decidePlayback · LG C2 webOS 22', () => {
  const table = LG_C2_WEBOS22;

  it('plays HEVC + TrueHD Atmos only after the wizard confirms it (untested → convert)', () => {
    const media = hevcMovie({ audio: { codec: 'truehd', channels: 8, isAtmos: true } });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('converted');
    expect(decision.playMethod).toBe('Transcode');
    expect(decision.audioAction).toBe('convert');
    expect(decision.videoAction).toBe('copy');
    expect(decision.convertAudioTo).toBe('eac3');
    expect(decision.avoidHls).toBe(true);
    expect(decision.preferProgressive).toBe(true);
  });

  it('sends TrueHD Atmos untouched once the wizard confirms it', () => {
    const overrides: ReceiverOverrides = {
      confirmed: { 'audio.truehd': 'sent_to_receiver' },
    };
    const confirmed = applyOverrides(cloneTable(table), overrides);
    const media = hevcMovie({ audio: { codec: 'truehd', channels: 8, isAtmos: true } });
    const decision = decidePlayback(media, confirmed);
    expect(decision.output).toBe('direct');
    expect(decision.playMethod).toBe('DirectPlay');
    expect(decision.audioAction).toBe('copy');
    expect(decision.convertAudioTo).toBeUndefined();
  });

  it.each([
    ['dts', 'DTS'],
    ['dtshd', 'DTS-HD MA'],
    ['dtsx', 'DTS:X'],
    ['dts-hd', 'DTS-HD hyphen'],
  ])('converts %s on the C2 to Auto (E-AC-3), never a hard-coded AC-3', (codec) => {
    const media = hevcMovie({ audio: { codec, channels: 8 } });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('converted');
    expect(decision.audioAction).toBe('convert');
    expect(decision.videoAction).toBe('copy');
    expect(decision.convertAudioTo).toBe('eac3');
    expect(decision.reason.toLowerCase()).toMatch(/dts|convert/);
  });

  it('uses confirmed PCM as Auto when the wizard says so', () => {
    const overrides: ReceiverOverrides = {
      confirmed: { 'audio.pcm': 'direct' },
    };
    const confirmed = applyOverrides(cloneTable(table), overrides);
    expect(resolveConvertTo(confirmed, 'auto')).toBe('pcm');
    const media = hevcMovie({ audio: { codec: 'dts', channels: 6 } });
    const decision = decidePlayback(media, confirmed, 'auto');
    expect(decision.convertAudioTo).toBe('pcm');
  });

  it('remuxes DV P5 in MKV (container only)', () => {
    const media = hevcMovie({
      container: 'mkv',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 5 },
      audio: { codec: 'eac3', channels: 6, isAtmos: true },
    });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('repackaged');
    expect(decision.playMethod).toBe('DirectStream');
    expect(decision.videoAction).toBe('copy');
    expect(decision.audioAction).toBe('copy');
    expect(decision.containerAction).toBe('remux');
    expect(decision.remuxTo).toBe('ts');
    expect(decision.avoidHls).toBe(true);
  });

  it('remuxes DV P8 in MKV to TS, not HLS', () => {
    const media = hevcMovie({
      container: 'mkv',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 8 },
      audio: { codec: 'eac3', channels: 8, isAtmos: true },
    });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('repackaged');
    expect(decision.remuxTo).toBe('ts');
    expect(decision.playMethod).toBe('DirectStream');
  });

  it('direct-plays DV P5 in MP4', () => {
    const media = hevcMovie({
      container: 'mp4',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 5 },
      audio: { codec: 'eac3', channels: 6 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('direct');
    expect(decision.playMethod).toBe('DirectPlay');
    expect(decision.containerAction).toBe('keep');
  });

  it('direct-plays DV P8 in TS', () => {
    const media = hevcMovie({
      container: 'ts',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 8 },
      audio: { codec: 'eac3', channels: 6 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('direct');
    expect(decision.playMethod).toBe('DirectPlay');
  });

  it('plays DV P7 in MKV as HDR10 (copy, not a video transcode)', () => {
    const media = hevcMovie({
      container: 'mkv',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 7 },
      audio: { codec: 'eac3', channels: 6 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.videoAction).toBe('copy');
    expect(decision.output).toBe('direct');
    expect(decision.reason).toMatch(/HDR10/i);
  });

  it('plays DV P7 in MP4 as HDR10 without remuxing', () => {
    const media = hevcMovie({
      container: 'mp4',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 7 },
      audio: { codec: 'ac3', channels: 6 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.containerAction).toBe('keep');
    expect(decision.videoAction).toBe('copy');
    expect(decision.output).toBe('direct');
  });

  it('direct-plays HEVC HDR10', () => {
    const media = hevcMovie({
      video: { codec: 'hevc', range: 'hdr10' },
      audio: { codec: 'eac3', channels: 8 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.playMethod).toBe('DirectPlay');
    expect(decision.output).toBe('direct');
  });

  it('direct-plays AV1', () => {
    const media = hevcMovie({
      container: 'mp4',
      video: { codec: 'av1', range: 'sdr' },
      audio: { codec: 'aac', channels: 2 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.playMethod).toBe('DirectPlay');
    expect(decision.output).toBe('direct');
  });

  it('remuxes AV1 + DV in MKV to MP4 (TS cannot carry AV1)', () => {
    const media = hevcMovie({
      container: 'mkv',
      video: { codec: 'av1', range: 'dovi', doviProfile: 10 },
      audio: { codec: 'eac3', channels: 6 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.containerAction).toBe('remux');
    expect(decision.remuxTo).toBe('mp4');
  });

  it.each(['pgs', 'pgssub', 'ass', 'ssa', 'dvbsub'])(
    'burns in %s subtitles (forces convert even when A/V would direct play)',
    (codec) => {
      const media = hevcMovie({
        audio: { codec: 'eac3', channels: 6 },
        subtitle: { codec },
      });
      expect(needsBurnIn(media.subtitle)).toBe(true);
      const decision = decidePlayback(media, table);
      expect(decision.burnSubtitles).toBe(true);
      expect(decision.output).toBe('converted');
      expect(decision.playMethod).toBe('Transcode');
      expect(decision.reason).toMatch(/burn/i);
    },
  );

  it.each(['srt', 'subrip', 'vtt', 'webvtt'])(
    'does not burn in %s',
    (codec) => {
      const media = hevcMovie({
        audio: { codec: 'aac', channels: 2 },
        subtitle: { codec },
      });
      expect(needsBurnIn(media.subtitle)).toBe(false);
      const decision = decidePlayback(media, table);
      expect(decision.burnSubtitles).toBe(false);
      expect(decision.output).toBe('direct');
    },
  );

  it('when DTS and DV-in-MKV both apply, the badge is Converted (audio wins) and we still remux', () => {
    const media = hevcMovie({
      container: 'mkv',
      video: { codec: 'hevc', range: 'dovi', doviProfile: 8 },
      audio: { codec: 'dtshd', channels: 8 },
    });
    const decision = decidePlayback(media, table);
    expect(decision.output).toBe('converted');
    expect(decision.containerAction).toBe('remux');
    expect(decision.audioAction).toBe('convert');
    expect(decision.convertAudioTo).toBe('eac3');
  });
});
