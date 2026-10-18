import type { ConvertTargetId } from '../capabilities/types';

export type PlayMethod = 'DirectPlay' | 'DirectStream' | 'Transcode';

export type OutputState = 'direct' | 'repackaged' | 'converted';

export type VideoRange = 'sdr' | 'hdr10' | 'hdr10plus' | 'hlg' | 'dovi';

export type DoviProfile = 5 | 7 | 8 | 10;

export interface VideoInfo {
  codec: string;
  range: VideoRange;
  doviProfile?: DoviProfile;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface AudioInfo {
  codec: string;
  channels?: number;
  isAtmos?: boolean;
}

export interface SubtitleInfo {
  codec: string;
  forced?: boolean;
}

export interface ItemMedia {
  container: string;
  video: VideoInfo;
  audio: AudioInfo;
  subtitle?: SubtitleInfo;
}

export interface PlaybackDecision {
  playMethod: PlayMethod;
  output: OutputState;
  reason: string;
  videoAction: 'copy' | 'transcode';
  audioAction: 'copy' | 'convert';
  containerAction: 'keep' | 'remux';
  remuxTo?: 'ts' | 'mp4';
  convertAudioTo?: ConvertTargetId;
  burnSubtitles: boolean;
  /** Always true: native HLS forces stereo on webOS. */
  preferProgressive: true;
  avoidHls: true;
}

export interface PlayRequest {
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  startPositionTicks?: number;
  decision: PlaybackDecision;
  /** Progressive URL. Never an HLS master playlist by choice. */
  url: string;
}
