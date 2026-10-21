import { describe, expect, it } from 'vitest';
import {
  connectionUri,
  directPlayUrl,
  mapHubsToHome,
  mapMetadata,
  mapResourcesToServers,
  mapStream,
  normalizePlexCodec,
  pickBestConnection,
  plexMsToTicks,
  plexVideoRangeType,
  scoreConnection,
} from '../src/plex/map';
import { normalizePlexAddress } from '../src/plex/server';
import type {
  PlexConnection,
  PlexHub,
  PlexMediaContainer,
  PlexMetadata,
  PlexResource,
  PlexStream,
} from '../src/plex/types';
import hubsJson from './fixtures/plex/hubs.json';
import movieJson from './fixtures/plex/metadata-movie.json';
import doviJson from './fixtures/plex/metadata-dovi.json';
import seasonsJson from './fixtures/plex/metadata-seasons.json';
import resourcesJson from './fixtures/plex/resources.json';
import sectionsJson from './fixtures/plex/sections.json';

const hubs = hubsJson as PlexMediaContainer<{ Hub: PlexHub[] }>;
const movieBox = movieJson as PlexMediaContainer<{ Metadata: PlexMetadata[] }>;
const dovi = doviJson as PlexMetadata;
const seasonsBox = seasonsJson as PlexMediaContainer<{ Metadata: PlexMetadata[] }>;
const resources = resourcesJson as PlexResource[];
const sections = sectionsJson as PlexMediaContainer<{ Directory: { key: string; title: string; type: string }[] }>;

describe('plexMsToTicks', () => {
  it('converts milliseconds to Jellyfin-style ticks', () => {
    expect(plexMsToTicks(1000)).toBe(10_000_000);
    expect(plexMsToTicks(4360000)).toBe(43_600_000_000);
    expect(plexMsToTicks(undefined)).toBeUndefined();
  });
});

describe('normalizePlexCodec', () => {
  it('maps DTS family and Dolby names onto the capability-table codecs', () => {
    expect(normalizePlexCodec('dca', 'MA')).toBe('dtshd');
    expect(normalizePlexCodec('dca', 'HRA')).toBe('dtshd');
    expect(normalizePlexCodec('dts')).toBe('dts');
    expect(normalizePlexCodec('eac3')).toBe('eac3');
    expect(normalizePlexCodec('truehd')).toBe('truehd');
    expect(normalizePlexCodec('ac3')).toBe('ac3');
  });
});

describe('plexVideoRangeType', () => {
  it('reads HDR10 from SMPTE-2084', () => {
    expect(plexVideoRangeType({ colorTrc: 'smpte2084' } as PlexStream)).toBe('HDR10');
  });

  it('reads Dolby Vision from DOVIPresent / profile', () => {
    expect(plexVideoRangeType({ DOVIPresent: true, DOVIProfile: 8 } as PlexStream)).toBe('DOVI');
  });
});

describe('mapStream / mapMetadata (movie fixture)', () => {
  const movie = movieBox.MediaContainer!.Metadata![0]!;
  const item = mapMetadata(movie);

  it('maps title, year, resume offset, and genres', () => {
    expect(item.id).toBe('101');
    expect(item.name).toBe('Glass Valley');
    expect(item.type).toBe('Movie');
    expect(item.year).toBe(2023);
    expect(item.officialRating).toBe('R');
    expect(item.genres).toEqual(['Thriller', 'Mystery']);
    expect(item.userData?.positionTicks).toBe(plexMsToTicks(1_200_000));
    expect(item.runtimeTicks).toBe(plexMsToTicks(6_840_000));
    expect(item.container).toBe('mkv');
  });

  it('maps the original file as version 0 and keeps the 1080p extra', () => {
    expect(item.versions).toHaveLength(2);
    expect(item.versions?.[0]?.partKey).toBe('/library/parts/8001/file.mkv');
    expect(item.versions?.[0]?.container).toBe('mkv');
    expect(item.versions?.[1]?.container).toBe('mp4');
  });

  it('maps HEVC HDR10 + TrueHD Atmos + DTS-HD + SRT', () => {
    const streams = item.mediaStreams ?? [];
    const video = streams.find((s) => s.type === 'Video');
    const truehd = streams.find((s) => s.codec === 'truehd');
    const dts = streams.find((s) => s.codec === 'dtshd');
    const sub = streams.find((s) => s.type === 'Subtitle');
    expect(video?.codec).toBe('hevc');
    expect(video?.videoRangeType).toBe('HDR10');
    expect(video?.width).toBe(3840);
    expect(truehd?.channels).toBe(8);
    expect(truehd?.displayTitle?.toLowerCase()).toContain('truehd');
    expect(truehd?.displayTitle?.toLowerCase()).toMatch(/atmos|truehd/);
    expect(dts?.codec).toBe('dtshd');
    expect(sub?.codec).toBe('srt');
  });

  it('maps Dolby Vision profile 8 from the dedicated fixture', () => {
    const dv = mapMetadata(dovi);
    const video = dv.mediaStreams?.find((s) => s.type === 'Video');
    expect(video?.videoRangeType).toBe('DOVI');
    expect(video?.profile).toMatch(/8/);
    const audio = dv.mediaStreams?.find((s) => s.type === 'Audio');
    expect(audio?.codec).toBe('eac3');
    expect(audio?.displayTitle?.toLowerCase()).toContain('eac3');
  });

  it('maps seasons as Season items', () => {
    const seasons = (seasonsBox.MediaContainer?.Metadata ?? []).map(mapMetadata);
    expect(seasons.map((s) => s.type)).toEqual(['Season', 'Season']);
    expect(seasons[0]?.parentIndexNumber ?? seasons[0]?.indexNumber).toBe(1);
    expect(seasons[0]?.seriesName).toBe('The Long Meridian');
  });
});

describe('mapHubsToHome', () => {
  it('splits continue watching, on deck, and library rows', () => {
    const home = mapHubsToHome(
      hubs.MediaContainer!.Hub!,
      sections.MediaContainer!.Directory,
    );
    expect(home.resume[0]?.name).toBe('The Ice Line');
    expect(home.resume[0]?.type).toBe('Episode');
    expect(home.resume[0]?.seriesName).toBe('The Long Meridian');
    expect(home.resume[0]?.parentIndexNumber).toBe(1);
    expect(home.nextUp[0]?.name).toBe('Harbour Lights');
    expect(home.libraries.map((l) => l.name)).toEqual(['Movies', 'TV Shows']);
    expect(home.libraries[0]?.items.map((i) => i.name)).toEqual(['Glass Valley', 'Saltwind']);
  });
});

describe('pickBestConnection / mapResourcesToServers', () => {
  it('prefers local over remote over relay', () => {
    const connections: PlexConnection[] = [
      { uri: 'https://relay.example', relay: true, local: false },
      { uri: 'https://remote.example', relay: false, local: false },
      { uri: 'http://192.168.1.20:32400', relay: false, local: true, protocol: 'http' },
    ];
    const best = pickBestConnection(connections);
    expect(connectionUri(best!)).toBe('http://192.168.1.20:32400');
    expect(scoreConnection(connections[0]!)).toBeLessThan(scoreConnection(connections[2]!));
  });

  it('lists only PMS resources and picks the local connection', () => {
    const servers = mapResourcesToServers(resources);
    expect(servers).toHaveLength(2);
    expect(servers[0]?.id).toBe('machine-home-abc');
    expect(servers[0]?.address).toBe('http://192.168.1.20:32400');
    expect(servers[0]?.local).toBe(true);
    expect(servers[0]?.token).toBe('server-token-home');
    expect(servers[1]?.id).toBe('machine-friend');
    expect(servers[1]?.token).toBe('shared-token');
    expect(servers[1]?.address).toBe('https://friend.plex.direct:443');
  });
});

describe('directPlayUrl', () => {
  it('appends the token and never a transcode path', () => {
    const url = directPlayUrl('http://192.168.1.20:32400', '/library/parts/8001/file.mkv', 'tok');
    expect(url).toBe(
      'http://192.168.1.20:32400/library/parts/8001/file.mkv?X-Plex-Token=tok',
    );
    expect(url).not.toMatch(/transcode/i);
  });
});

describe('normalizePlexAddress', () => {
  it('assumes http and port 32400', () => {
    expect(normalizePlexAddress('192.168.1.20')).toBe('http://192.168.1.20:32400');
    expect(normalizePlexAddress('http://192.168.1.20:32400/')).toBe('http://192.168.1.20:32400');
  });
});

describe('mapStream edge cases', () => {
  it('classifies streamType 1/2/3', () => {
    expect(mapStream({ streamType: 1, codec: 'hevc' }).type).toBe('Video');
    expect(mapStream({ streamType: 2, codec: 'aac' }).type).toBe('Audio');
    expect(mapStream({ streamType: 3, codec: 'pgs' }).type).toBe('Subtitle');
  });
});
