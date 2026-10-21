export {
  MIN_SERVER_VERSION,
  MIN_SERVER_VERSION_LABEL,
  CLIENT_NAME,
  CLIENT_VERSION,
  compareVersions,
  isServerSupported,
} from './version';

export type {
  FormatKind,
  FormatStatus,
  FormatSource,
  ConvertTargetId,
  FormatRow,
  CapabilityTable,
  ReceiverOverrides,
} from './capabilities/types';
export { CONVERT_TARGETS, CONVERT_RANK } from './capabilities/types';
export { LG_C2_WEBOS22, cloneTable } from './capabilities/lg-c2-webos22';
export {
  findRow,
  findRowByCodec,
  normalizeCodec,
  normalizeContainer,
  applyOverrides,
  isPlayable,
  listConfirmedConvertTargets,
  resolveConvertTo,
  convertTargetCodec,
  sourceCaption,
  statusLabel,
} from './capabilities/lookup';

export type {
  PlayMethod,
  OutputState,
  VideoRange,
  DoviProfile,
  VideoInfo,
  AudioInfo,
  SubtitleInfo,
  ItemMedia,
  PlaybackDecision,
  PlayRequest,
} from './playback/types';
export { decidePlayback, needsBurnIn, outputStateTitle } from './playback/decision';
export { buildDeviceProfile } from './playback/device-profile';
export type { DeviceProfile } from './playback/device-profile';

export { normalizeServerAddress, deviceIdKey, randomId } from './jellyfin/normalize-address';
export {
  TICKS_PER_SECOND,
  PROGRESS_INTERVAL_MS,
  secondsToTicks,
  ticksToSeconds,
  formatClock,
  formatRuntime,
} from './jellyfin/progress';
export { JellyfinServer } from './jellyfin/server';

export type {
  ServerKind,
  PublicServer,
  PublicUser,
  MediaStreamLite,
  MediaVersion,
  CatalogItem,
  HomeModel,
  MediaServerAuth,
  CodeSignIn,
  CodeSignInPoll,
  ImageUrlOptions,
  OpenedPlayback,
  ProgressReport,
  MediaServerOptions,
  MediaServer,
} from './media-server/types';
export { createMediaServer } from './media-server/create';
export { itemToMedia } from './media-server/item-media';

export { PlexServer, normalizePlexAddress } from './plex/server';
export { PlexClient } from './plex/client';
export {
  PLEX_LINK_URL,
  plexMsToTicks,
  normalizePlexCodec,
  plexVideoRangeType,
  plexAudioDisplayTitle,
  mapStream,
  mapMediaVersion,
  mapMetadata,
  mapHubsToHome,
  mapResourcesToServers,
  pickBestConnection,
  scoreConnection,
  connectionUri,
  directPlayUrl,
  imageTranscodeUrl,
} from './plex/map';

export type {
  MediaPlayer,
  MediaPlayerOptions,
  DetectedCapabilities,
  CapabilityProbe,
  PlaySessionReport,
} from './player/interface';
