import { secondsToTicks } from '../jellyfin/progress';
import type {
  CatalogItem,
  HomeModel,
  MediaStreamLite,
  MediaVersion,
  PublicServer,
} from '../media-server/types';
import type {
  PlexConnection,
  PlexDirectory,
  PlexHub,
  PlexMedia,
  PlexMetadata,
  PlexResource,
  PlexStream,
} from './types';

export const PLEX_LINK_URL = 'https://plex.tv/link';

export function plexMsToTicks(ms: number | undefined): number | undefined {
  if (ms == null || !Number.isFinite(ms)) return undefined;
  return secondsToTicks(ms / 1000);
}

export function normalizePlexCodec(codec?: string, profile?: string): string {
  const c = (codec ?? '').toLowerCase();
  const p = (profile ?? '').toLowerCase();
  if (c === 'dca' || c === 'dts' || c === 'dca-ma') {
    if (p.includes('ma') || p.includes('hra') || c === 'dca-ma') return 'dtshd';
    if (p.includes('x') || p.includes('dts:x') || p.includes('dtsx')) return 'dtsx';
    return 'dts';
  }
  if (c === 'eac3' || c === 'e-ac-3' || c === 'eac-3') return 'eac3';
  if (c === 'ac3' || c === 'ac-3') return 'ac3';
  if (c === 'truehd' || c === 'true-hd') return 'truehd';
  if (c === 'dovi' || c === 'dolbyvision') return c;
  return c;
}

export function plexVideoRangeType(stream: PlexStream): string | undefined {
  if (stream.DOVIPresent || (stream.DOVIProfile ?? stream.doviProfile ?? 0) > 0) return 'DOVI';
  const bits = [stream.hdr, stream.colorTrc, stream.displayTitle, stream.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (bits.includes('dovi') || bits.includes('dolby vision') || bits.includes('dolbyvision')) {
    return 'DOVI';
  }
  if (bits.includes('hdr10+') || bits.includes('hdr10plus')) return 'HDR10Plus';
  if (bits.includes('hlg') || bits === 'arib-std-b67') return 'HLG';
  if (bits.includes('hdr') || bits.includes('smpte2084') || bits.includes('pq')) return 'HDR10';
  return undefined;
}

export function plexAudioDisplayTitle(stream: PlexStream): string {
  if (stream.displayTitle) return stream.displayTitle;
  const lang = stream.language ?? stream.languageCode ?? '';
  const codec = (stream.codec ?? '').toUpperCase();
  const layout = stream.audioChannelLayout ?? (stream.channels ? `${stream.channels}ch` : '');
  const title = stream.title ?? '';
  return [lang, codec, layout, title].filter(Boolean).join(' · ');
}

export function mapStream(stream: PlexStream): MediaStreamLite {
  const type =
    stream.streamType === 1
      ? 'Video'
      : stream.streamType === 2
        ? 'Audio'
        : stream.streamType === 3
          ? 'Subtitle'
          : String(stream.streamType ?? '');
  const dovi = stream.DOVIProfile ?? stream.doviProfile;
  return {
    index: stream.index ?? stream.id ?? 0,
    type,
    codec: normalizePlexCodec(stream.codec, stream.profile),
    language: stream.languageCode ?? stream.language,
    displayTitle: type === 'Audio' ? plexAudioDisplayTitle(stream) : stream.displayTitle,
    channels: stream.channels,
    isDefault: stream.default,
    isForced: stream.forced,
    videoRangeType: type === 'Video' ? plexVideoRangeType(stream) : undefined,
    profile: stream.profile ?? (dovi != null ? `Profile ${dovi}` : undefined),
    width: stream.width,
    height: stream.height,
  };
}

export function mapMediaVersion(media: PlexMedia): MediaVersion {
  const part = media.Part?.[0];
  const streams = (part?.Stream ?? []).map(mapStream);
  const res = media.videoResolution ? `${media.videoResolution}` : undefined;
  return {
    id: String(media.id ?? part?.id ?? ''),
    label: [res, media.videoCodec, media.audioCodec, media.container].filter(Boolean).join(' · ') || undefined,
    container: media.container ?? part?.container,
    partKey: part?.key,
    streams,
  };
}

export function plexItemType(type?: string): string {
  const t = (type ?? '').toLowerCase();
  if (t === 'movie') return 'Movie';
  if (t === 'show') return 'Series';
  if (t === 'season') return 'Season';
  if (t === 'episode') return 'Episode';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Movie';
}

export function mapMetadata(meta: PlexMetadata): CatalogItem {
  const versions = (meta.Media ?? []).map(mapMediaVersion);
  const streams = versions[0]?.streams ?? [];
  const firstPart = meta.Media?.[0]?.Part?.[0];
  return {
    id: String(meta.ratingKey ?? ''),
    name: meta.title ?? '',
    type: plexItemType(meta.type),
    overview: meta.summary || undefined,
    year: meta.year,
    runtimeTicks: plexMsToTicks(meta.duration),
    officialRating: meta.contentRating || undefined,
    communityRating: meta.audienceRating ?? meta.rating,
    genres: meta.Genre?.map((g) => g.tag).filter((t): t is string => Boolean(t)),
    seriesName: meta.grandparentTitle ?? (meta.type === 'season' ? meta.parentTitle : undefined),
    seasonName: meta.type === 'episode' ? meta.parentTitle : meta.type === 'season' ? meta.title : undefined,
    indexNumber: meta.index,
    parentIndexNumber: meta.parentIndex,
    imageTag: meta.thumb || meta.parentThumb || meta.grandparentThumb || undefined,
    backdropTag: meta.art || undefined,
    container: versions[0]?.container ?? firstPart?.container,
    mediaStreams: streams,
    versions,
    userData: {
      positionTicks: plexMsToTicks(meta.viewOffset),
      played: (meta.viewCount ?? 0) > 0 && !meta.viewOffset,
    },
  };
}

function hubBucket(hub: PlexHub): 'resume' | 'next' | 'library' | 'skip' {
  const id = `${hub.hubIdentifier ?? ''} ${hub.context ?? ''} ${hub.title ?? ''} ${hub.key ?? ''}`.toLowerCase();
  if (id.includes('continue')) return 'resume';
  if (id.includes('ondeck') || id.includes('on deck') || /\bnext\b/.test(id)) return 'next';
  if (id.includes('recent') || id.includes('newest') || hub.type === 'movie' || hub.type === 'show') {
    return 'library';
  }
  return 'skip';
}

export function mapHubsToHome(hubs: PlexHub[], sections?: PlexDirectory[]): HomeModel {
  const resume: CatalogItem[] = [];
  const nextUp: CatalogItem[] = [];
  const libraries: HomeModel['libraries'] = [];
  const sectionName = new Map(
    (sections ?? []).map((s) => [String(s.key ?? ''), s.title ?? 'Library'] as const),
  );

  for (const hub of hubs) {
    const items = (hub.Metadata ?? []).map(mapMetadata);
    if (!items.length) continue;
    const bucket = hubBucket(hub);
    if (bucket === 'resume') resume.push(...items);
    else if (bucket === 'next') nextUp.push(...items);
    else if (bucket === 'library') {
      const sid = String(hub.librarySectionID ?? hub.hubIdentifier ?? hub.title ?? libraries.length);
      const name =
        hub.librarySectionTitle ??
        sectionName.get(String(hub.librarySectionID ?? '')) ??
        hub.title ??
        'Library';
      const existing = libraries.find((l) => l.id === sid);
      if (existing) existing.items.push(...items);
      else libraries.push({ id: sid, name, items });
    }
  }

  return { resume, nextUp, libraries };
}

export function connectionUri(connection: PlexConnection): string | undefined {
  if (connection.uri) return connection.uri.replace(/\/+$/, '');
  if (!connection.address || !connection.port) return undefined;
  const proto = connection.protocol || 'http';
  return `${proto}://${connection.address}:${connection.port}`;
}

export function scoreConnection(connection: PlexConnection): number {
  let score = 0;
  if (connection.local) score += 100;
  if (!connection.relay) score += 50;
  if (!connection.IPv6) score += 10;
  if (connection.local && (connection.protocol === 'http' || !connection.protocol)) score += 5;
  if (connectionUri(connection)) score += 1;
  return score;
}

/** Prefer local, then remote, then relay. Skip IPv6 when an IPv4 twin exists. */
export function pickBestConnection(connections: PlexConnection[] | undefined): PlexConnection | undefined {
  const usable = (connections ?? []).filter((c) => connectionUri(c));
  if (!usable.length) return undefined;
  return [...usable].sort((a, b) => scoreConnection(b) - scoreConnection(a))[0];
}

export function mapResourcesToServers(resources: PlexResource[]): PublicServer[] {
  const out: PublicServer[] = [];
  for (const resource of resources) {
    const provides = resource.provides ?? '';
    if (!provides.split(',').map((s) => s.trim()).includes('server')) continue;
    const best = pickBestConnection(resource.connections);
    const address = best ? connectionUri(best) : undefined;
    if (!address || !resource.clientIdentifier) continue;
    out.push({
      id: resource.clientIdentifier,
      name: resource.name ?? 'Plex',
      address,
      version: resource.productVersion ?? '',
      supported: true,
      kind: 'plex',
      local: best?.local,
      relay: best?.relay,
      token: resource.accessToken,
    });
  }
  return out;
}

export function directPlayUrl(address: string, partKey: string, token: string): string {
  const base = address.replace(/\/+$/, '');
  const key = partKey.startsWith('/') ? partKey : `/${partKey}`;
  const url = new URL(key, `${base}/`);
  url.searchParams.set('X-Plex-Token', token);
  return url.toString();
}

export function imageTranscodeUrl(
  address: string,
  token: string,
  path: string,
  w: number,
  h: number,
): string {
  const base = address.replace(/\/+$/, '');
  const params = new URLSearchParams({
    url: path,
    width: String(w),
    height: String(h),
    minSize: '1',
    'X-Plex-Token': token,
  });
  return `${base}/photo/:/transcode?${params.toString()}`;
}

export function firstPart(item: CatalogItem): { partKey?: string; mediaId: string } {
  const version = item.versions?.[0];
  return { partKey: version?.partKey, mediaId: version?.id || item.id };
}
