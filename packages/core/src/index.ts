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

export type {
  MediaPlayer,
  MediaPlayerOptions,
  DetectedCapabilities,
  CapabilityProbe,
  PlaySessionReport,
} from './player/interface';
