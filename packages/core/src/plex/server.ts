import { CLIENT_NAME, CLIENT_VERSION } from '../version';
import { normalizeServerAddress, randomId } from '../jellyfin/normalize-address';
import type { CapabilityTable } from '../capabilities/types';
import type {
  CatalogItem,
  CodeSignIn,
  CodeSignInPoll,
  HomeModel,
  ImageUrlOptions,
  MediaServer,
  MediaServerAuth,
  MediaServerOptions,
  OpenedPlayback,
  ProgressReport,
  PublicServer,
  PublicUser,
} from '../media-server/types';
import { PlexClient } from './client';
import {
  PLEX_LINK_URL,
  directPlayUrl,
  firstPart,
  imageTranscodeUrl,
  mapHubsToHome,
  mapMetadata,
  mapResourcesToServers,
} from './map';
import type {
  PlexHub,
  PlexIdentity,
  PlexMediaContainer,
  PlexMetadata,
  PlexPin,
  PlexResource,
  PlexTvUser,
} from './types';

const PLEX_HTTP_PORT = '32400';

export function normalizePlexAddress(raw: string): string {
  return normalizeServerAddress(raw, PLEX_HTTP_PORT);
}

function unwrapContainer<T>(data: PlexMediaContainer<T> | T): PlexMediaContainer<T>['MediaContainer'] & T {
  if (data && typeof data === 'object' && 'MediaContainer' in data) {
    return (data as PlexMediaContainer<T>).MediaContainer as PlexMediaContainer<T>['MediaContainer'] & T;
  }
  return data as PlexMediaContainer<T>['MediaContainer'] & T;
}

export class PlexServer implements MediaServer {
  readonly kind = 'plex' as const;
  private auth: MediaServerAuth | null;
  private readonly client: PlexClient;
  private pendingPinToken: string | null = null;

  constructor(private readonly opts: MediaServerOptions) {
    this.auth = opts.session ?? null;
    this.client = new PlexClient({
      clientIdentifier: opts.deviceId,
      product: opts.clientName ?? CLIENT_NAME,
      version: opts.clientVersion ?? CLIENT_VERSION,
      deviceName: opts.deviceName,
      platform: opts.deviceName.toLowerCase().includes('webos') ? 'webOS' : 'web',
      plexTvUrl: opts.plexTvUrl,
      fetchImpl: opts.fetchImpl,
    });
  }

  bind(auth: MediaServerAuth) {
    this.auth = auth;
  }

  async probe(address: string): Promise<PublicServer> {
    const url = normalizePlexAddress(address);
    const raw = await this.client.server<PlexIdentity>(url, '/identity', this.auth?.token ?? '');
    const box = unwrapContainer(raw);
    const id = box?.machineIdentifier ?? raw.machineIdentifier ?? url;
    const version = box?.version ?? raw.version ?? '';
    return {
      id,
      name: 'Plex',
      address: url,
      version,
      supported: true,
      kind: 'plex',
    };
  }

  async publicUsers(_address: string): Promise<PublicUser[]> {
    return [];
  }

  async startCodeSignIn(_address?: string): Promise<CodeSignIn> {
    const pin = await this.client.plexTv<PlexPin>('/api/v2/pins?strong=true', { method: 'POST' });
    return {
      kind: 'plex-pin',
      code: pin.code,
      secret: String(pin.id),
      linkUrl: PLEX_LINK_URL,
      expiresInSeconds: pin.expiresIn,
    };
  }

  async pollCodeSignIn(challenge: CodeSignIn): Promise<CodeSignInPoll> {
    const pin = await this.client.plexTv<PlexPin>(`/api/v2/pins/${encodeURIComponent(challenge.secret)}`);
    if (pin.authToken) {
      this.pendingPinToken = pin.authToken;
      return { authenticated: true, token: pin.authToken };
    }
    return { authenticated: false };
  }

  async finishCodeSignIn(challenge: CodeSignIn, deviceId: string): Promise<MediaServerAuth> {
    let token = this.pendingPinToken;
    if (!token) {
      const poll = await this.pollCodeSignIn(challenge);
      token = poll.token ?? null;
    }
    if (!token) throw new Error('Plex PIN is not linked yet');
    const user = await this.client.plexTv<PlexTvUser>('/api/v2/user', {}, token);
    return {
      kind: 'plex',
      serverId: '',
      serverName: 'Plex',
      address: '',
      userId: String(user.id ?? user.uuid ?? 'plex'),
      userName: user.username ?? user.title ?? 'Plex',
      token,
      deviceId,
    };
  }

  async signInWithPassword(
    _address: string,
    _username: string,
    _password: string,
    _deviceId: string,
  ): Promise<MediaServerAuth> {
    throw new Error('Plex signs in with a PIN at plex.tv/link, not a password');
  }

  async listRemoteServers(token: string): Promise<PublicServer[]> {
    const resources = await this.client.plexTv<PlexResource[]>(
      '/api/v2/resources?includeHttps=1&includeRelay=1',
      {},
      token,
    );
    const list = Array.isArray(resources) ? resources : [];
    return mapResourcesToServers(list);
  }

  attachServer(auth: MediaServerAuth, server: PublicServer): MediaServerAuth {
    return {
      ...auth,
      serverId: server.id,
      serverName: server.name,
      address: server.address,
      token: server.token || auth.token,
    };
  }

  async loadHome(): Promise<HomeModel> {
    const { address, token } = this.authed();
    const [hubsRaw, sectionsRaw] = await Promise.all([
      this.client.server<PlexMediaContainer<{ Hub?: PlexHub[] }>>(address, '/hubs', token),
      this.client.server<PlexMediaContainer<{ Directory?: { key?: string; title?: string; type?: string }[] }>>(
        address,
        '/library/sections',
        token,
      ).catch(() => ({ MediaContainer: { Directory: [] } })),
    ]);
    const hubs = unwrapContainer(hubsRaw)?.Hub ?? [];
    const sections = unwrapContainer(sectionsRaw)?.Directory ?? [];
    const home = mapHubsToHome(hubs, sections);
    if (home.resume.length || home.nextUp.length || home.libraries.length) return home;

    const libraries = await Promise.all(
      sections
        .filter((s) => s.type === 'movie' || s.type === 'show')
        .map(async (section) => {
          const latest = await this.client.server<PlexMediaContainer<{ Metadata?: PlexMetadata[] }>>(
            address,
            `/library/sections/${encodeURIComponent(section.key ?? '')}/recentlyAdded`,
            token,
          );
          return {
            id: section.key ?? section.title ?? 'lib',
            name: section.title ?? 'Library',
            items: (unwrapContainer(latest)?.Metadata ?? []).slice(0, 16).map(mapMetadata),
          };
        }),
    );
    return { resume: [], nextUp: [], libraries };
  }

  async loadItem(id: string): Promise<CatalogItem> {
    const { address, token } = this.authed();
    const raw = await this.client.server<PlexMediaContainer<{ Metadata?: PlexMetadata[] }>>(
      address,
      `/library/metadata/${encodeURIComponent(id)}`,
      token,
    );
    const meta = unwrapContainer(raw)?.Metadata?.[0];
    if (!meta) throw new Error('Item not found');
    const item = mapMetadata(meta);
    if (meta.type === 'show' || meta.type === 'season') {
      const kids = await this.client.server<PlexMediaContainer<{ Metadata?: PlexMetadata[] }>>(
        address,
        `/library/metadata/${encodeURIComponent(id)}/children`,
        token,
      );
      const mapped = (unwrapContainer(kids)?.Metadata ?? []).map(mapMetadata);
      if (meta.type === 'show') item.seasons = mapped;
      else item.episodes = mapped;
    }
    return item;
  }

  imageUrl(itemId: string, options: ImageUrlOptions): string | undefined {
    const s = this.auth;
    if (!s?.address || !s.token) return undefined;
    const path =
      options.type === 'Backdrop'
        ? options.tag || `/library/metadata/${itemId}/art`
        : options.tag || `/library/metadata/${itemId}/thumb`;
    return imageTranscodeUrl(s.address, s.token, path, options.w, options.h);
  }

  async openPlayback(
    itemId: string,
    _table: CapabilityTable,
    _audioStreamIndex?: number,
    _subtitleStreamIndex?: number,
  ): Promise<OpenedPlayback> {
    const { address, token } = this.authed();
    const item = await this.loadItem(itemId);
    const { partKey, mediaId } = firstPart(item);
    if (!partKey) throw new Error('No playable part');
    return {
      url: directPlayUrl(address, partKey, token),
      playSessionId: randomId(),
      mediaSourceId: mediaId,
      item,
    };
  }

  async reportPlaying(opts: ProgressReport) {
    const { address, token } = this.authed();
    const time = Math.max(0, Math.round(opts.positionSeconds * 1000));
    const duration = Math.max(0, Math.round((opts.durationSeconds ?? 0) * 1000));
    const state =
      opts.event === 'stop' ? 'stopped' : opts.event === 'pause' ? 'paused' : 'playing';
    const params = new URLSearchParams({
      ratingKey: opts.itemId,
      key: `/library/metadata/${opts.itemId}`,
      state,
      time: String(time),
      duration: String(duration),
      playbackTime: String(time),
    });
    await this.client.server(address, `/:/timeline?${params.toString()}`, token);
    if (opts.event === 'stop' && duration > 0 && time / duration >= 0.9) {
      const scrobble = new URLSearchParams({
        identifier: 'com.plexapp.plugins.library',
        key: opts.itemId,
      });
      await this.client.server(address, `/:/scrobble?${scrobble.toString()}`, token);
    }
  }

  private authed(): { address: string; token: string; account: MediaServerAuth } {
    if (!this.auth?.address || !this.auth.token) throw new Error('Not signed in');
    return { address: this.auth.address, token: this.auth.token, account: this.auth };
  }
}
