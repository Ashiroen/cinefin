import type { CapabilityTable } from '../capabilities/types';
import { convertTargetCodec, isPlayable, resolveConvertTo } from '../capabilities/lookup';

/**
 * Jellyfin DeviceProfile (subset). Built only from the capability table —
 * never a hard-coded "all LG TVs get AC-3" profile.
 */
export interface DeviceProfile {
  Name: string;
  MaxStreamingBitrate: number;
  MaxStaticBitrate: number;
  MusicStreamingTranscodingBitrate: number;
  DirectPlayProfiles: Array<{
    Type: 'Video' | 'Audio';
    Container: string;
    VideoCodec?: string;
    AudioCodec?: string;
  }>;
  TranscodingProfiles: Array<{
    Type: 'Video';
    Container: string;
    Protocol: 'http';
    VideoCodec: string;
    AudioCodec: string;
    Context: 'Streaming';
    EstimateContentLength: boolean;
    CopyTimestamps: boolean;
    EnableSubtitlesInManifest: boolean;
  }>;
  ContainerProfiles: Array<{
    Type: 'Video';
    Container: string;
    Conditions: Array<{
      Condition: 'Equals' | 'NotEquals' | 'LessThanEqual';
      Property: string;
      Value: string;
      IsRequired: boolean;
    }>;
  }>;
  CodecProfiles: Array<{
    Type: 'Video' | 'Audio';
    Codec: string;
    Container?: string;
    Conditions: Array<{
      Condition: string;
      Property: string;
      Value: string;
      IsRequired: boolean;
    }>;
  }>;
  SubtitleProfiles: Array<{ Format: string; Method: 'Embed' | 'External' | 'Encode' }>;
}

export function buildDeviceProfile(table: CapabilityTable): DeviceProfile {
  const audioDirect = table.rows
    .filter((r) => r.kind === 'audio' && isPlayable(r.status))
    .flatMap((r) => r.codecs ?? [])
    .filter((c) => !c.includes('+'));

  const videoDirect = ['h264', 'hevc', 'vp9', 'av1'].filter((codec) =>
    table.rows.some(
      (r) =>
        r.kind === 'video' &&
        isPlayable(r.status) &&
        (r.codecs ?? []).includes(codec),
    ),
  );

  const audioList = unique(audioDirect).join(',');
  const videoList = unique(videoDirect).join(',');
  const convert = resolveConvertTo(table, 'auto');
  const transcodeAudio = convertTargetCodec(convert);

  const mkvHasDoviRemux = table.rows.some(
    (r) => r.id.startsWith('container.mkv+dovi') && r.status === 'repackaged',
  );

  return {
    Name: `Cinefin (${table.displayName})`,
    MaxStreamingBitrate: 120_000_000,
    MaxStaticBitrate: 120_000_000,
    MusicStreamingTranscodingBitrate: 192_000,
    DirectPlayProfiles: [
      {
        Type: 'Video',
        Container: 'mp4,m4v,mov,ts,m2ts,mkv',
        VideoCodec: videoList,
        AudioCodec: audioList,
      },
    ],
    TranscodingProfiles: [
      {
        Type: 'Video',
        Container: 'ts',
        Protocol: 'http',
        VideoCodec: videoList.includes('hevc') ? 'hevc,h264' : 'h264',
        AudioCodec: `${audioList},${transcodeAudio}`,
        Context: 'Streaming',
        EstimateContentLength: true,
        CopyTimestamps: true,
        EnableSubtitlesInManifest: false,
      },
      {
        Type: 'Video',
        Container: 'mp4',
        Protocol: 'http',
        VideoCodec: videoList.includes('av1') ? 'av1,hevc,h264' : 'hevc,h264',
        AudioCodec: `${audioList},${transcodeAudio}`,
        Context: 'Streaming',
        EstimateContentLength: true,
        CopyTimestamps: true,
        EnableSubtitlesInManifest: false,
      },
    ],
    ContainerProfiles: mkvHasDoviRemux
      ? [
          {
            Type: 'Video',
            Container: 'mkv',
            Conditions: [
              {
                Condition: 'NotEquals',
                Property: 'VideoRangeType',
                Value: 'DOVI',
                IsRequired: false,
              },
              {
                Condition: 'NotEquals',
                Property: 'VideoRangeType',
                Value: 'DOVIWithHDR10',
                IsRequired: false,
              },
            ],
          },
        ]
      : [],
    CodecProfiles: [
      {
        Type: 'Video',
        Codec: 'hevc',
        Conditions: [
          {
            Condition: 'EqualsAny',
            Property: 'VideoProfile',
            Value: 'main|main 10',
            IsRequired: false,
          },
        ],
      },
    ],
    SubtitleProfiles: [
      { Format: 'srt', Method: 'External' },
      { Format: 'srt', Method: 'Embed' },
      { Format: 'subrip', Method: 'External' },
      { Format: 'vtt', Method: 'External' },
      { Format: 'webvtt', Method: 'External' },
      { Format: 'ass', Method: 'Encode' },
      { Format: 'ssa', Method: 'Encode' },
      { Format: 'pgssub', Method: 'Encode' },
      { Format: 'pgs', Method: 'Encode' },
      { Format: 'dvdsub', Method: 'Encode' },
      { Format: 'dvbsub', Method: 'Encode' },
    ],
  };
}

function unique(xs: string[]): string[] {
  return Array.from(new Set(xs.map((x) => x.toLowerCase())));
}
