import type { CapabilityTable } from '../capabilities/types';
import type { PlaybackDecision } from '../playback/types';

export type ServerKind = 'jellyfin' | 'plex';

export interface PublicServer {
  id: string;
  name: string;
  address: string;
  version: string;
  supported: boolean;
  kind: ServerKind;
  local?: boolean;
  relay?: boolean;
  /** Plex shared servers issue a per-resource token. */
  token?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  primaryImageTag?: string;
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

export interface MediaVersion {
  id: string;
  label?: string;
  container?: string;
  partKey?: string;
  streams: MediaStreamLite[];
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
  versions?: MediaVersion[];
  seasons?: CatalogItem[];
  episodes?: CatalogItem[];
  userData?: { positionTicks?: number; played?: boolean };
}

export interface HomeModel {
  resume: CatalogItem[];
  nextUp: CatalogItem[];
  libraries: Array<{ id: string; name: string; items: CatalogItem[] }>;
}

export interface MediaServerAuth {
  kind: ServerKind;
  serverId: string;
  serverName: string;
  address: string;
  userId: string;
  userName: string;
  token: string;
  deviceId: string;
}

export interface CodeSignIn {
  kind: 'jellyfin-quickconnect' | 'plex-pin';
  code: string;
  secret: string;
  address?: string;
  linkUrl?: string;
  expiresInSeconds?: number;
}

export interface CodeSignInPoll {
  authenticated: boolean;
  token?: string;
}

export interface ImageUrlOptions {
  tag?: string;
  type?: string;
  w: number;
  h: number;
}

export interface OpenedPlayback {
  url: string;
  playSessionId: string;
  mediaSourceId: string;
  item: CatalogItem;
}

export interface ProgressReport {
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  positionSeconds: number;
  durationSeconds?: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  playMethod: PlaybackDecision['playMethod'];
  event: 'start' | 'progress' | 'stop' | 'pause';
}

export interface MediaServerOptions {
  deviceId: string;
  deviceName: string;
  clientName?: string;
  clientVersion?: string;
  session?: MediaServerAuth;
  fetchImpl?: typeof fetch;
  /** Override plex.tv (tests / mocked verification). */
  plexTvUrl?: string;
}

/**
 * Backend-agnostic media server. Home, Details, and the player talk only to this.
 * Sign-in UI branches on `kind` (Jellyfin Quick Connect vs Plex PIN).
 */
export interface MediaServer {
  readonly kind: ServerKind;

  probe(address: string): Promise<PublicServer>;
  publicUsers(address: string): Promise<PublicUser[]>;

  startCodeSignIn(address?: string): Promise<CodeSignIn>;
  pollCodeSignIn(challenge: CodeSignIn): Promise<CodeSignInPoll>;
  finishCodeSignIn(challenge: CodeSignIn, deviceId: string): Promise<MediaServerAuth>;
  signInWithPassword(
    address: string,
    username: string,
    password: string,
    deviceId: string,
  ): Promise<MediaServerAuth>;

  /** Plex: list PMS instances on the plex.tv account. Jellyfin: unused. */
  listRemoteServers(token: string): Promise<PublicServer[]>;
  attachServer(auth: MediaServerAuth, server: PublicServer): MediaServerAuth;

  bind(auth: MediaServerAuth): void;

  loadHome(): Promise<HomeModel>;
  loadItem(id: string): Promise<CatalogItem>;
  imageUrl(itemId: string, options: ImageUrlOptions): string | undefined;
  openPlayback(
    itemId: string,
    table: CapabilityTable,
    audioStreamIndex?: number,
    subtitleStreamIndex?: number,
  ): Promise<OpenedPlayback>;
  reportPlaying(opts: ProgressReport): Promise<void>;
}
