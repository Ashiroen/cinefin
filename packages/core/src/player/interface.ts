import type { PlaybackDecision } from '../playback/types';

/**
 * Platform players (webOS <video>, later ExoPlayer) implement this.
 * The core package never imports a platform player.
 */
export interface MediaPlayer {
  play(url: string, options: MediaPlayerOptions): Promise<void>;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPaused(): boolean;
}

export interface MediaPlayerOptions {
  startPositionSeconds?: number;
  poster?: string;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlaying?: () => void;
}

export interface DetectedCapabilities {
  modelName?: string;
  sdkVersion?: string;
  hdrTypes?: string[];
  audioOutput?: string;
}

export interface CapabilityProbe {
  probe(): Promise<DetectedCapabilities>;
}

export interface PlaySessionReport {
  playMethod: PlaybackDecision['playMethod'];
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  positionTicks: number;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}
