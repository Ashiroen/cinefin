import { normalizeContainer } from '../capabilities/lookup';
import type { ItemMedia } from '../playback/types';
import type { CatalogItem } from './types';

/** Shared CatalogItem → decision-engine media. Used by every backend. */
export function itemToMedia(
  item: CatalogItem,
  audioIndex?: number,
  subtitleIndex?: number,
): ItemMedia | null {
  const streams = item.mediaStreams ?? [];
  const video = streams.find((s) => s.type === 'Video');
  const audios = streams.filter((s) => s.type === 'Audio');
  const audio =
    (audioIndex !== undefined ? audios.find((s) => s.index === audioIndex) : undefined) ??
    audios[0];
  const subs = streams.filter((s) => s.type === 'Subtitle');
  const sub =
    subtitleIndex !== undefined ? subs.find((s) => s.index === subtitleIndex) : undefined;
  if (!video || !audio) return null;
  const range = (video.videoRangeType ?? '').toLowerCase();
  let doviProfile: 5 | 7 | 8 | 10 | undefined;
  const prof = (video.profile ?? '').toLowerCase();
  if (prof.includes('05') || prof.includes('profile 5')) doviProfile = 5;
  if (prof.includes('07') || prof.includes('profile 7')) doviProfile = 7;
  if (prof.includes('08') || prof.includes('profile 8')) doviProfile = 8;
  if (prof.includes('10') || prof.includes('profile 10')) doviProfile = 10;
  return {
    container: normalizeContainer(item.container ?? 'mkv'),
    video: {
      codec: video.codec ?? 'hevc',
      range: range.includes('dovi') || range.includes('dolby')
        ? 'dovi'
        : range.includes('hdr10+') || range.includes('hdr10plus')
          ? 'hdr10plus'
          : range.includes('hlg')
            ? 'hlg'
            : range.includes('hdr')
              ? 'hdr10'
              : 'sdr',
      doviProfile,
      width: video.width,
      height: video.height,
    },
    audio: {
      codec: audio.codec ?? 'aac',
      channels: audio.channels,
      isAtmos: (audio.displayTitle ?? '').toLowerCase().includes('atmos'),
    },
    subtitle: sub ? { codec: sub.codec ?? 'srt', forced: sub.isForced } : undefined,
  };
}
