import type { CapabilityTable } from './types';

/**
 * Seed table for the owner's C2 + eARC + Onkyo TX-NR7100.
 * Statuses are data — the wizard and Settings mutate a copy.
 * Official jellyfin-webos forces DTS→AC-3 for every LG. This table does not.
 */
export const LG_C2_WEBOS22: CapabilityTable = {
  profileId: 'lg-c2-webos22',
  displayName: 'LG C2 · webOS 22',
  rows: [
    {
      id: 'audio.ac3',
      kind: 'audio',
      label: 'Dolby Digital',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['ac3', 'ac-3'],
    },
    {
      id: 'audio.eac3',
      kind: 'audio',
      label: 'Dolby Digital Plus',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['eac3', 'eac-3', 'ec-3'],
    },
    {
      id: 'audio.truehd',
      kind: 'audio',
      label: 'TrueHD Atmos',
      status: 'untested',
      source: 'lg_spec',
      reason:
        'eARC can carry TrueHD from an HDMI source, but the webOS 22 format table does not list TrueHD and TV apps usually cannot bitstream it. Confirm with the receiver test.',
      convertTo: 'auto',
      codecs: ['truehd', 'mlp'],
    },
    {
      id: 'audio.dts',
      kind: 'audio',
      label: 'DTS',
      status: 'converted',
      source: 'detected_by_tv',
      reason:
        '2022 LG TVs have no DTS license — no decode and no passthrough. The server converts it.',
      convertTo: 'auto',
      codecs: ['dts', 'dca'],
    },
    {
      id: 'audio.dtshd',
      kind: 'audio',
      label: 'DTS-HD MA',
      status: 'converted',
      source: 'detected_by_tv',
      reason:
        'Your C2 has no DTS decoder (LG removed it in 2022). The server converts it.',
      convertTo: 'auto',
      codecs: ['dtshd', 'dts-hd', 'dca-hd'],
    },
    {
      id: 'audio.dtsx',
      kind: 'audio',
      label: 'DTS:X',
      status: 'converted',
      source: 'detected_by_tv',
      reason:
        'DTS:X needs a DTS decoder the C2 does not have. The server converts it.',
      convertTo: 'auto',
      codecs: ['dtsx', 'dts-x', 'dts:x'],
    },
    {
      id: 'audio.aac',
      kind: 'audio',
      label: 'AAC',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['aac', 'mp4a'],
    },
    {
      id: 'audio.pcm',
      kind: 'audio',
      label: 'PCM',
      status: 'direct',
      source: 'lg_spec',
      reason:
        'LG lists PCM for MKV/TS. Multichannel PCM over eARC from an HTML5 app is untested — confirm before using it as a convert-to target.',
      codecs: ['pcm', 'lpcm'],
    },
    {
      id: 'audio.flac',
      kind: 'audio',
      label: 'FLAC',
      status: 'direct',
      source: 'lg_spec',
      reason: 'LG lists FLAC as 2 channels only. Not offered as a surround convert-to target.',
      codecs: ['flac'],
    },
    {
      id: 'video.h264',
      kind: 'video',
      label: 'H.264',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['h264', 'avc'],
    },
    {
      id: 'video.hevc',
      kind: 'video',
      label: 'HEVC',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['hevc', 'h265'],
    },
    {
      id: 'video.av1',
      kind: 'video',
      label: 'AV1',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['av1'],
    },
    {
      id: 'video.vp9',
      kind: 'video',
      label: 'VP9',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['vp9'],
    },
    {
      id: 'video.hdr10',
      kind: 'video',
      label: 'HDR10',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['hdr10'],
    },
    {
      id: 'video.hdr10plus',
      kind: 'video',
      label: 'HDR10+',
      status: 'untested',
      source: 'lg_spec',
      reason: 'If dynamic metadata is dropped it still plays as HDR10.',
      codecs: ['hdr10plus', 'hdr10+'],
    },
    {
      id: 'video.dovi.p5',
      kind: 'video',
      label: 'Dolby Vision profile 5',
      status: 'direct',
      source: 'lg_spec',
      reason: 'Direct in MP4 or TS. MKV is a container remux — see MKV + Dolby Vision.',
      codecs: ['dovi-p5', 'dvhe.05'],
    },
    {
      id: 'video.dovi.p7',
      kind: 'video',
      label: 'Dolby Vision profile 7',
      status: 'converted',
      source: 'lg_spec',
      reason:
        'Not supported. Plays as HDR10 at best (HEVC base layer). The enhancement layer is ignored.',
      codecs: ['dovi-p7', 'dvhe.07'],
    },
    {
      id: 'video.dovi.p8',
      kind: 'video',
      label: 'Dolby Vision profile 8',
      status: 'direct',
      source: 'lg_spec',
      reason: 'Direct in MP4 or TS. MKV is a container remux — see MKV + Dolby Vision.',
      codecs: ['dovi-p8', 'dvhe.08'],
    },
    {
      id: 'container.mkv',
      kind: 'container',
      label: 'MKV',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['mkv', 'matroska'],
    },
    {
      id: 'container.mp4',
      kind: 'container',
      label: 'MP4',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['mp4', 'm4v', 'mov'],
    },
    {
      id: 'container.ts',
      kind: 'container',
      label: 'TS / M2TS',
      status: 'direct',
      source: 'lg_spec',
      codecs: ['ts', 'm2ts', 'mpegts'],
    },
    {
      id: 'container.mkv+dovi',
      kind: 'container',
      label: 'MKV + Dolby Vision',
      status: 'repackaged',
      source: 'lg_spec',
      reason:
        'webOS 22 does not support Dolby Vision in MKV, so the server remuxes to TS without touching the picture or the sound.',
      codecs: ['mkv+dovi'],
    },
    {
      id: 'container.mkv+dovi.webos22',
      kind: 'container',
      label: 'MKV + Dolby Vision (webOS 22)',
      status: 'repackaged',
      source: 'lg_spec',
      reason:
        "webOS 22 doesn't support Dolby Vision in MKV, so the server repackages it without touching the picture.",
      codecs: ['mkv+dovi'],
    },
  ],
};

export function cloneTable(table: CapabilityTable): CapabilityTable {
  return {
    profileId: table.profileId,
    displayName: table.displayName,
    rows: table.rows.map((row) => ({ ...row, codecs: row.codecs ? [...row.codecs] : undefined })),
  };
}
