/** Recorded / documented Plex JSON shapes. Isolated from UI types. */

export interface PlexPin {
  id: number;
  code: string;
  expiresIn?: number;
  expiresAt?: string;
  authToken?: string | null;
}

export interface PlexTvUser {
  id?: number | string;
  uuid?: string;
  username?: string;
  title?: string;
  email?: string;
}

export interface PlexConnection {
  protocol?: string;
  address?: string;
  port?: number;
  uri?: string;
  local?: boolean;
  relay?: boolean;
  IPv6?: boolean;
}

export interface PlexResource {
  name?: string;
  product?: string;
  productVersion?: string;
  platform?: string;
  clientIdentifier?: string;
  provides?: string;
  owned?: boolean;
  accessToken?: string;
  publicAddress?: string;
  httpsRequired?: boolean;
  connections?: PlexConnection[];
  sourceTitle?: string;
}

export interface PlexIdentity {
  machineIdentifier?: string;
  version?: string;
  MediaContainer?: {
    machineIdentifier?: string;
    version?: string;
  };
}

export interface PlexStream {
  id?: number;
  streamType?: number;
  index?: number;
  codec?: string;
  profile?: string;
  displayTitle?: string;
  language?: string;
  languageCode?: string;
  languageTag?: string;
  channels?: number;
  default?: boolean;
  forced?: boolean;
  selected?: boolean;
  width?: number;
  height?: number;
  frameRate?: number;
  bitDepth?: number;
  colorTrc?: string;
  colorSpace?: string;
  colorPrimaries?: string;
  hdr?: string;
  DOVIPresent?: boolean;
  DOVIProfile?: number;
  doviProfile?: number;
  title?: string;
  audioChannelLayout?: string;
}

export interface PlexPart {
  id?: number;
  key?: string;
  duration?: number;
  file?: string;
  size?: number;
  container?: string;
  Stream?: PlexStream[];
}

export interface PlexMedia {
  id?: number;
  duration?: number;
  bitrate?: number;
  width?: number;
  height?: number;
  container?: string;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: number;
  videoResolution?: string;
  videoProfile?: string;
  Part?: PlexPart[];
}

export interface PlexGenre {
  tag?: string;
}

export interface PlexMetadata {
  ratingKey?: string;
  key?: string;
  type?: string;
  title?: string;
  summary?: string;
  year?: number;
  duration?: number;
  viewOffset?: number;
  viewCount?: number;
  contentRating?: string;
  audienceRating?: number;
  rating?: number;
  thumb?: string;
  art?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  parentTitle?: string;
  grandparentTitle?: string;
  parentIndex?: number;
  index?: number;
  leafCount?: number;
  childCount?: number;
  originallyAvailableAt?: string;
  Media?: PlexMedia[];
  Genre?: PlexGenre[];
  librarySectionID?: number | string;
  librarySectionTitle?: string;
}

export interface PlexHub {
  hubKey?: string;
  key?: string;
  title?: string;
  type?: string;
  hubIdentifier?: string;
  context?: string;
  size?: number;
  more?: boolean;
  Metadata?: PlexMetadata[];
  librarySectionID?: number | string;
  librarySectionTitle?: string;
}

export interface PlexDirectory {
  key?: string;
  title?: string;
  type?: string;
  uuid?: string;
}

export interface PlexMediaContainer<T> {
  MediaContainer?: T & {
    size?: number;
    Metadata?: PlexMetadata[];
    Hub?: PlexHub[];
    Directory?: PlexDirectory[];
    machineIdentifier?: string;
    version?: string;
  };
}
