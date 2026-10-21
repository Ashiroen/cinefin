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
import { CLIENT_NAME, CLIENT_VERSION, isServerSupported } from '../version';
import { buildDeviceProfile } from '../playback/device-profile';
import type { CapabilityTable } from '../capabilities/types';
import { secondsToTicks } from './progress';
import { normalizeServerAddress, randomId } from './normalize-address';
import type {
  CatalogItem,
  CodeSignIn,
  CodeSignInPoll,
  HomeModel,
  ImageUrlOptions,
  MediaServer,
  MediaServerAuth,
  MediaServerOptions,
  MediaStreamLite,
  MediaVersion,
  OpenedPlayback,
  ProgressReport,
  PublicServer,
  PublicUser,
} from '../media-server/types';

function mapItem(item: BaseItemDto): CatalogItem {
  const imageTag = item.ImageTags?.Primary ?? undefined;
  const versions: MediaVersion[] | undefined = item.MediaSources?.length
    ? item.MediaSources.map((source) => ({
        id: source.Id ?? item.Id ?? '',
        label: source.Name ?? source.Container ?? undefined,
        container: source.Container ?? item.Container ?? undefined,
        streams: (source.MediaStreams ?? item.MediaStreams ?? []).map(mapStream),
      }))
    : undefined;
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
    mediaStreams: (item.MediaStreams ?? []).map(mapStream),
    versions,
    userData: {
      positionTicks: item.UserData?.PlaybackPositionTicks ?? undefined,
      played: item.UserData?.Played ?? undefined,
    },
  };
}

function mapStream(s: NonNullable<BaseItemDto['MediaStreams']>[number]): MediaStreamLite {
  return {
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
  };
}

export class JellyfinServer implements MediaServer {
  readonly kind = 'jellyfin' as const;
  private auth: MediaServerAuth | null;

  constructor(private readonly opts: MediaServerOptions) {
    this.auth = opts.session ?? null;
  }

  bind(auth: MediaServerAuth) {
    this.auth = auth;
  }

  async probe(address: string): Promise<PublicServer> {
    const url = normalizeServerAddress(address);
    const api = this.sdk(this.opts.deviceId).createApi(url);
    const { data } = await getSystemApi(api).getPublicSystemInfo();
    const version = data.Version ?? '';
    return {
      id: data.Id ?? url,
      name: data.ServerName ?? 'Jellyfin',
      address: url,
      version,
      supported: isServerSupported(version),
      kind: 'jellyfin',
    };
  }

  async publicUsers(address: string): Promise<PublicUser[]> {
    const api = this.sdk(this.opts.deviceId).createApi(address);
    const { data } = await getUserApi(api).getPublicUsers();
    return (data ?? []).map((u) => ({
      id: u.Id ?? '',
      name: u.Name ?? 'User',
      primaryImageTag: u.PrimaryImageTag ?? undefined,
    }));
  }

  async startCodeSignIn(address?: string): Promise<CodeSignIn> {
    if (!address) throw new Error('Jellyfin Quick Connect needs a server address');
    const api = this.sdk(this.opts.deviceId).createApi(address);
    const { data } = await getAuthenticationApi(api).initiateQuickConnect();
    return {
      kind: 'jellyfin-quickconnect',
      code: data.Code ?? '',
      secret: data.Secret ?? '',
      address,
    };
  }

  async pollCodeSignIn(challenge: CodeSignIn): Promise<CodeSignInPoll> {
    if (!challenge.address) throw new Error('Missing server address');
    const api = this.sdk(this.opts.deviceId).createApi(challenge.address);
    const { data } = await getAuthenticationApi(api).getQuickConnectState({
      secret: challenge.secret,
    });
    return { authenticated: Boolean(data.Authenticated) };
  }

  async finishCodeSignIn(challenge: CodeSignIn, deviceId: string): Promise<MediaServerAuth> {
    if (!challenge.address) throw new Error('Missing server address');
    const api = this.sdk(deviceId).createApi(challenge.address);
    const { data } = await getAuthenticationApi(api).authenticateWithQuickConnect({
      quickConnectDto: { Secret: challenge.secret },
    });
    const info = await this.probe(challenge.address);
    return {
      kind: 'jellyfin',
      serverId: info.id,
      serverName: info.name,
      address: info.address,
      userId: data.User?.Id ?? '',
      userName: data.User?.Name ?? '',
      token: data.AccessToken ?? '',
      deviceId,
    };
  }

  async signInWithPassword(
    address: string,
    username: string,
    password: string,
    deviceId: string,
  ): Promise<MediaServerAuth> {
    const api = this.sdk(deviceId).createApi(address);
    const { data } = await getAuthenticationApi(api).authenticateUserByName({
      authenticateUserByName: { Username: username, Pw: password },
    });
    const info = await this.probe(address);
    return {
      kind: 'jellyfin',
      serverId: info.id,
      serverName: info.name,
      address: info.address,
      userId: data.User?.Id ?? '',
      userName: data.User?.Name ?? username,
      token: data.AccessToken ?? '',
      deviceId,
    };
  }

  async listRemoteServers(_token: string): Promise<PublicServer[]> {
    return [];
  }

  attachServer(auth: MediaServerAuth, server: PublicServer): MediaServerAuth {
    return {
      ...auth,
      serverId: server.id,
      serverName: server.name,
      address: server.address,
    };
  }

  async loadHome(): Promise<HomeModel> {
    const { api, account } = this.authed();
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

  async loadItem(id: string): Promise<CatalogItem> {
    const { api, account } = this.authed();
    const lib = getLibraryApi(api);
    const shows = getShowApi(api);
    const { data } = await lib.getItem({ userId: account.userId, itemId: id });
    const item = mapItem(data);
    if (data.Type === BaseItemKind.Series) {
      const seasons = await shows.getSeasons({ userId: account.userId, seriesId: id });
      item.seasons = (seasons.data.Items ?? []).map(mapItem);
    } else if (data.Type === BaseItemKind.Season) {
      const episodes = await shows.getEpisodes({ userId: account.userId, seriesId: data.SeriesId ?? id, seasonId: id });
      item.episodes = (episodes.data.Items ?? []).map(mapItem);
    }
    return item;
  }

  imageUrl(itemId: string, options: ImageUrlOptions): string | undefined {
    const s = this.auth;
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

  async openPlayback(
    itemId: string,
    table: CapabilityTable,
    audioStreamIndex?: number,
    subtitleStreamIndex?: number,
  ): Promise<OpenedPlayback> {
    const { api, account } = this.authed();
    const item = await this.loadItem(itemId);
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
      ? appendKey(path, token, account.address)
      : appendKey(`${account.address}${path}`, token, account.address);
    return { url, playSessionId, mediaSourceId, item };
  }

  async reportPlaying(opts: ProgressReport) {
    const { api } = this.authed();
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

  private sdk(deviceId: string) {
    return new Jellyfin({
      clientInfo: {
        name: this.opts.clientName ?? CLIENT_NAME,
        version: this.opts.clientVersion ?? CLIENT_VERSION,
      },
      deviceInfo: { name: this.opts.deviceName, id: deviceId },
    });
  }

  private authed() {
    if (!this.auth) throw new Error('Not signed in');
    const api = this.sdk(this.auth.deviceId).createApi(this.auth.address, this.auth.token);
    return { api, account: this.auth };
  }
}

function appendKey(url: string, token: string, base: string): string {
  const u = new URL(url, base.endsWith('/') ? base : `${base}/`);
  if (!u.searchParams.get('api_key')) u.searchParams.set('api_key', token);
  return u.toString();
}
