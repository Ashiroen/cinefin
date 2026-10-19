import {
  MIN_SERVER_VERSION_LABEL,
  buildDeviceProfile,
  isServerSupported,
  normalizeServerAddress,
  randomId,
  secondsToTicks,
  type CapabilityTable,
  type ItemMedia,
  type PlaybackDecision,
  normalizeContainer,
} from '@cinefin/core';
import { Jellyfin } from '@jellyfin/sdk';
import { getSystemApi } from '@jellyfin/sdk/lib/utils/api/system-api';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { getAuthenticationApi } from '@jellyfin/sdk/lib/utils/api/authentication-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { getUserViewApi } from '@jellyfin/sdk/lib/utils/api/user-view-api';
import {
  BaseItemKind,
  ItemFields,
  type BaseItemDto,
  type DeviceProfile as JellyfinDeviceProfile,
} from '@jellyfin/sdk/lib/generated-client/models';
import { clientInfo, deviceName, getSession } from './session';

export interface PublicServer {
  id: string;
  name: string;
  address: string;
  version: string;
  supported: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  primaryImageTag?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  type: string;
  overview?: string;
  year?: number;
  runtimeTicks?: number;
  officialRating?: string;
  communityRating?: number;
  genres?: string[];
  seriesName?: string;
  seasonName?: string;
  indexNumber?: number;
  parentIndexNumber?: number;
  imageTag?: string;
  backdropTag?: string;
  badges?: string[];
  container?: string;
  mediaStreams?: MediaStreamLite[];
  userData?: { positionTicks?: number; played?: boolean };
}

export interface MediaStreamLite {
  index: number;
  type: 'Audio' | 'Video' | 'Subtitle' | string;
  codec?: string;
  language?: string;
  displayTitle?: string;
  channels?: number;
  isDefault?: boolean;
  isForced?: boolean;
  videoRangeType?: string;
  profile?: string;
  width?: number;
  height?: number;
}

export interface HomeModel {
  resume: CatalogItem[];
  nextUp: CatalogItem[];
  libraries: Array<{ id: string; name: string; items: CatalogItem[] }>;
}

function sdk(deviceId: string) {
  return new Jellyfin({
    clientInfo: clientInfo(),
    deviceInfo: { name: deviceName(), id: deviceId },
  });
}

export async function fetchPublicServer(address: string): Promise<PublicServer> {
  const url = normalizeServerAddress(address);
  const api = sdk(getSession().installId).createApi(url);
  const { data } = await getSystemApi(api).getPublicSystemInfo();
  const version = data.Version ?? '';
  return {
    id: data.Id ?? url,
    name: data.ServerName ?? 'Jellyfin',
    address: url,
    version,
    supported: isServerSupported(version),
  };
}

export async function fetchPublicUsers(address: string): Promise<PublicUser[]> {
  const api = sdk(getSession().installId).createApi(address);
  const { data } = await getUserApi(api).getPublicUsers();
  return (data ?? []).map((u) => ({
    id: u.Id ?? '',
    name: u.Name ?? 'User',
    primaryImageTag: u.PrimaryImageTag ?? undefined,
  }));
}

export async function startQuickConnect(address: string): Promise<{ code: string; secret: string }> {
  const api = sdk(getSession().installId).createApi(address);
  const { data } = await getAuthenticationApi(api).initiateQuickConnect();
  return { code: data.Code ?? '', secret: data.Secret ?? '' };
}

export async function pollQuickConnect(
  address: string,
  secret: string,
): Promise<{ authenticated: boolean }> {
  const api = sdk(getSession().installId).createApi(address);
  const { data } = await getAuthenticationApi(api).getQuickConnectState({ secret });
  return { authenticated: Boolean(data.Authenticated) };
}

export async function finishQuickConnect(address: string, secret: string, deviceId: string) {
  const api = sdk(deviceId).createApi(address);
  const { data } = await getAuthenticationApi(api).authenticateWithQuickConnect({
    quickConnectDto: { Secret: secret },
  });
  return data;
}

export async function loginByName(
  address: string,
  username: string,
  password: string,
  deviceId: string,
) {
  const api = sdk(deviceId).createApi(address);
  const { data } = await getAuthenticationApi(api).authenticateUserByName({
    authenticateUserByName: { Username: username, Pw: password },
  });
  return data;
}

function authedApi() {
  const s = getSession();
  if (!s.account) throw new Error('Not signed in');
  const api = sdk(s.account.deviceId).createApi(s.account.address, s.account.token);
  return { api, account: s.account };
}

function mapItem(item: BaseItemDto): CatalogItem {
  const imageTag = item.ImageTags?.Primary ?? undefined;
  return {
    id: item.Id ?? '',
    name: item.Name ?? '',
    type: item.Type ?? 'Movie',
    overview: item.Overview ?? undefined,
    year: item.ProductionYear ?? undefined,
    runtimeTicks: item.RunTimeTicks ?? undefined,
    officialRating: item.OfficialRating ?? undefined,
    communityRating: item.CommunityRating ?? undefined,
    genres: item.Genres ?? undefined,
    seriesName: item.SeriesName ?? undefined,
    seasonName: item.SeasonName ?? undefined,
    indexNumber: item.IndexNumber ?? undefined,
    parentIndexNumber: item.ParentIndexNumber ?? undefined,
    imageTag,
    backdropTag: item.BackdropImageTags?.[0] ?? undefined,
    container: item.Container ?? undefined,
    mediaStreams: (item.MediaStreams ?? []).map((s) => ({
      index: s.Index ?? 0,
      type: s.Type ?? '',
      codec: s.Codec ?? undefined,
      language: s.Language ?? undefined,
      displayTitle: s.DisplayTitle ?? undefined,
      channels: s.Channels ?? undefined,
      isDefault: s.IsDefault ?? undefined,
      isForced: s.IsForced ?? undefined,
      videoRangeType: s.VideoRangeType ?? undefined,
      profile: s.Profile ?? undefined,
      width: s.Width ?? undefined,
      height: s.Height ?? undefined,
    })),
    userData: {
      positionTicks: item.UserData?.PlaybackPositionTicks ?? undefined,
      played: item.UserData?.Played ?? undefined,
    },
  };
}

export async function loadHome(): Promise<HomeModel> {
  const { api, account } = authedApi();
  const lib = getLibraryApi(api);
  const shows = getShowApi(api);
  const views = getUserViewApi(api);
  const itemFields = [
    ItemFields.Overview,
    ItemFields.Genres,
    ItemFields.MediaStreams,
    ItemFields.MediaSources,
  ];

  const [resumeRes, nextRes, viewsRes] = await Promise.all([
    lib.getResumeItems({
      userId: account.userId,
      limit: 12,
      fields: itemFields,
    }),
    shows.getNextUp({
      userId: account.userId,
      limit: 12,
      fields: itemFields,
    }),
    views.getUserViews({ userId: account.userId }),
  ]);

  // Jellyfin 12: /Items?IncludeItemTypes=CollectionFolder returns nothing.
  // User views is the supported library list (Movies, Shows, …).
  let folders = (viewsRes.data.Items ?? []).filter(
    (f) => f.CollectionType && f.CollectionType !== 'playlists' && f.CollectionType !== 'boxsets',
  );
  if (!folders.length) {
    const root = await lib.getItems({ userId: account.userId, recursive: false });
    folders = (root.data.Items ?? []).filter((f) => f.Type === BaseItemKind.CollectionFolder);
  }

  const libraries = await Promise.all(
    folders.map(async (folder) => {
      const latest = await lib.getLatestMedia({
        userId: account.userId,
        parentId: folder.Id,
        limit: 16,
        fields: itemFields,
      });
      return {
        id: folder.Id ?? '',
        name: folder.Name ?? 'Library',
        items: (latest.data ?? []).map(mapItem),
      };
    }),
  );

  return {
    resume: (resumeRes.data.Items ?? []).map(mapItem),
    nextUp: (nextRes.data.Items ?? []).map(mapItem),
    libraries,
  };
}

export async function loadItem(id: string): Promise<CatalogItem> {
  const { api, account } = authedApi();
  const { data } = await getLibraryApi(api).getItem({ userId: account.userId, itemId: id });
  return mapItem(data);
}

export function imageUrl(
  itemId: string,
  options: { tag?: string; type?: string; w: number; h: number },
): string | undefined {
  const s = getSession().account;
  if (!s) return undefined;
  const type = options.type ?? 'Primary';
  const params = new URLSearchParams({
    fillWidth: String(options.w),
    fillHeight: String(options.h),
    quality: '85',
    api_key: s.token,
  });
  if (options.tag) params.set('tag', options.tag);
  return `${s.address}/Items/${itemId}/Images/${type}?${params.toString()}`;
}

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
        : range.includes('hdr10+')
          ? 'hdr10plus'
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

export async function openPlayback(
  itemId: string,
  table: CapabilityTable,
  audioStreamIndex?: number,
  subtitleStreamIndex?: number,
): Promise<{
  url: string;
  playSessionId: string;
  mediaSourceId: string;
  item: CatalogItem;
}> {
  const { api, account } = authedApi();
  const item = await loadItem(itemId);
  const profile = buildDeviceProfile(table);
  const { data } = await getMediaInfoApi(api).getPostedPlaybackInfo({
    itemId,
    playbackInfoDto: {
      UserId: account.userId,
      DeviceProfile: profile as JellyfinDeviceProfile,
      AutoOpenLiveStream: true,
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
      AudioStreamIndex: audioStreamIndex,
      SubtitleStreamIndex: subtitleStreamIndex,
    },
  });
  const source = data.MediaSources?.[0];
  if (!source) throw new Error('No media source');
  const playSessionId = data.PlaySessionId ?? randomId();
  const mediaSourceId = source.Id ?? itemId;
  const token = account.token;
  let path = source.TranscodingUrl;
  if (source.SupportsDirectPlay) {
    path = `/Videos/${itemId}/stream?static=true&mediaSourceId=${encodeURIComponent(mediaSourceId)}&playSessionId=${encodeURIComponent(playSessionId)}`;
  } else if (source.TranscodingUrl) {
    path = source.TranscodingUrl;
  }
  if (!path) {
    path = `/Videos/${itemId}/stream?static=true&mediaSourceId=${encodeURIComponent(mediaSourceId)}`;
  }
  const url = path.startsWith('http')
    ? appendKey(path, token)
    : appendKey(`${account.address}${path}`, token);
  return { url, playSessionId, mediaSourceId, item };
}

function appendKey(url: string, token: string): string {
  const u = new URL(url, window.location.href);
  if (!u.searchParams.get('api_key')) u.searchParams.set('api_key', token);
  return u.toString();
}

export async function reportPlaying(opts: {
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  positionSeconds: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  playMethod: PlaybackDecision['playMethod'];
  event: 'start' | 'progress' | 'stop' | 'pause';
}) {
  const { api } = authedApi();
  const body = {
    ItemId: opts.itemId,
    MediaSourceId: opts.mediaSourceId,
    PlaySessionId: opts.playSessionId,
    PositionTicks: secondsToTicks(opts.positionSeconds),
    AudioStreamIndex: opts.audioStreamIndex,
    SubtitleStreamIndex: opts.subtitleStreamIndex,
    PlayMethod: opts.playMethod,
  };
  const session = getSessionApi(api);
  if (opts.event === 'start') {
    await session.reportPlaybackStart({ playbackStartInfo: body });
  } else if (opts.event === 'stop') {
    await session.reportPlaybackStopped({ playbackStopInfo: body });
  } else {
    await session.reportPlaybackProgress({
      playbackProgressInfo: { ...body, IsPaused: opts.event === 'pause' },
    });
  }
}

export { MIN_SERVER_VERSION_LABEL };
