import type { CapabilityTable, ConvertTargetId } from '../capabilities/types';
import {
  findRow,
  findRowByCodec,
  isPlayable,
  normalizeCodec,
  resolveConvertTo,
} from '../capabilities/lookup';
import type {
  ItemMedia,
  OutputState,
  PlaybackDecision,
  PlayMethod,
  SubtitleInfo,
} from './types';

const BURN_IN_SUBS = new Set([
  'ass',
  'ssa',
  'pgs',
  'pgssub',
  'hdmv_pgs_subtitle',
  'dvb',
  'dvbsub',
  'dvdsub',
  'vobsub',
  'xsub',
]);

const TEXT_SUBS = new Set(['srt', 'subrip', 'vtt', 'webvtt', 'sub', 'text']);

export function decidePlayback(
  media: ItemMedia,
  table: CapabilityTable,
  convertPreference?: 'auto' | ConvertTargetId,
): PlaybackDecision {
  const container = normalizeCodec(media.container);
  const videoCodec = normalizeCodec(media.video.codec);
  const isDovi = media.video.range === 'dovi' || Boolean(media.video.doviProfile);
  const doviProfile = media.video.doviProfile;
  const mkv = container === 'mkv' || container === 'matroska';
  const ts = container === 'ts' || container === 'm2ts' || container === 'mpegts';
  const mp4 = container === 'mp4' || container === 'm4v' || container === 'mov';

  const audioRow = findRowByCodec(table, 'audio', media.audio.codec);
  const videoRow = videoRowFor(table, videoCodec, doviProfile);
  const burnSubtitles = needsBurnIn(media.subtitle);

  const audioPlays = audioRow ? isPlayable(audioRow.status) : false;
  const audioUntested = audioRow?.status === 'untested';
  const mustConvertAudio = !audioPlays || audioUntested;

  // P7 is "plays as HDR10" — the HEVC base layer is a direct play, not a transcode.
  const p7AsHdr10 = isDovi && doviProfile === 7;
  const doviNeedsRemux = isDovi && !p7AsHdr10 && mkv;
  const videoCodecPlays = videoRow
    ? p7AsHdr10
      ? isPlayable(findRowByCodec(table, 'video', 'hevc')?.status ?? 'direct')
      : isPlayable(videoRow.status) || videoRow.status === 'repackaged'
    : false;

  const containerOk = !doviNeedsRemux && (mkv || ts || mp4);
  const convertAudioTo = mustConvertAudio
    ? resolveConvertTo(table, convertPreference ?? audioRow?.convertTo ?? 'auto')
    : undefined;

  let videoAction: 'copy' | 'transcode' = videoCodecPlays ? 'copy' : 'transcode';
  if (p7AsHdr10) videoAction = 'copy';

  const audioAction: 'copy' | 'convert' = mustConvertAudio ? 'convert' : 'copy';
  const containerAction: 'keep' | 'remux' = doviNeedsRemux || !containerOk ? 'remux' : 'keep';
  const remuxTo: 'ts' | 'mp4' | undefined =
    containerAction === 'remux' ? (videoCodec === 'av1' ? 'mp4' : 'ts') : undefined;

  if (burnSubtitles) {
    videoAction = 'transcode';
  }

  let output: OutputState;
  let playMethod: PlayMethod;
  const reasons: string[] = [];

  if (mustConvertAudio) {
    const label = audioRow?.label ?? media.audio.codec;
    reasons.push(
      audioUntested
        ? `${label} is untested on this setup, so the server converts it to ${targetName(convertAudioTo)} until the receiver test confirms it.`
        : `${audioRow?.reason ?? `${label} cannot play on this TV.`} Converted to ${targetName(convertAudioTo)}.`,
    );
  }
  if (doviNeedsRemux) {
    const row = findRow(table, 'container.mkv+dovi') ?? findRow(table, 'container.mkv+dovi.webos22');
    reasons.push(
      row?.reason ??
        'Dolby Vision in MKV is not supported on webOS 22, so the server remuxes to TS without touching the picture or the sound.',
    );
  }
  if (p7AsHdr10) {
    reasons.push(
      'Dolby Vision profile 7 plays as HDR10 at best. The TV uses the HEVC base layer and ignores the enhancement layer.',
    );
  }
  if (burnSubtitles) {
    const codec = media.subtitle?.codec ?? 'this subtitle';
    reasons.push(
      `${codec.toUpperCase()} subtitles can't be drawn by the TV player, so they are burned in.`,
    );
  }
  if (videoAction === 'transcode' && !burnSubtitles) {
    reasons.push(
      `${media.video.codec} cannot be decoded on this TV, so the server converts the picture.`,
    );
  }

  if (videoAction === 'transcode' || audioAction === 'convert' || burnSubtitles) {
    output = 'converted';
    playMethod = 'Transcode';
  } else if (containerAction === 'remux') {
    output = 'repackaged';
    playMethod = 'DirectStream';
  } else {
    output = 'direct';
    playMethod = 'DirectPlay';
    reasons.push(
      reasons.length
        ? reasons[0]!
        : directReason(media, audioRow?.status === 'sent_to_receiver'),
    );
  }

  return {
    playMethod,
    output,
    reason: reasons.filter(Boolean).join(' '),
    videoAction,
    audioAction,
    containerAction,
    remuxTo,
    convertAudioTo,
    burnSubtitles,
    preferProgressive: true,
    avoidHls: true,
  };
}

export function needsBurnIn(sub: SubtitleInfo | undefined): boolean {
  if (!sub) return false;
  const c = normalizeCodec(sub.codec);
  if (TEXT_SUBS.has(c)) return false;
  if (BURN_IN_SUBS.has(c)) return true;
  // Unknown image / advanced formats: burn in rather than guess.
  return !TEXT_SUBS.has(c);
}

function videoRowFor(table: CapabilityTable, codec: string, dovi?: number) {
  if (dovi === 5) return findRow(table, 'video.dovi.p5');
  if (dovi === 7) return findRow(table, 'video.dovi.p7');
  if (dovi === 8) return findRow(table, 'video.dovi.p8');
  return findRowByCodec(table, 'video', codec);
}

function targetName(id: ConvertTargetId | undefined): string {
  if (id === 'pcm') return 'lossless PCM';
  if (id === 'ac3') return 'Dolby Digital';
  return 'Dolby Digital Plus';
}

function directReason(media: ItemMedia, toReceiver: boolean | undefined): string {
  const audio = media.audio.isAtmos
    ? `${media.audio.codec} Atmos`
    : media.audio.codec;
  const dest = toReceiver ? 'sent to the receiver untouched' : 'plays as-is';
  return `${media.video.codec.toUpperCase()} · ${audio} ${dest}.`;
}

export function outputStateTitle(output: OutputState): string {
  switch (output) {
    case 'direct':
      return 'Direct';
    case 'repackaged':
      return 'Repackaged';
    case 'converted':
      return 'Converted';
    default:
      return output;
  }
}
