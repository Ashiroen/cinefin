import {
  MIN_SERVER_VERSION_LABEL,
  type CatalogItem,
  type HomeModel,
  type PublicServer,
  type PublicUser,
} from '@cinefin/core';

export const minVersion = MIN_SERVER_VERSION_LABEL;

export const fixtureServers: PublicServer[] = [
  {
    id: 'home',
    name: 'Home server',
    address: 'http://192.168.1.20:8096',
    version: '12.1.1',
    supported: true,
    kind: 'jellyfin',
  },
  {
    id: 'nas',
    name: 'Media NAS',
    address: 'http://192.168.1.45:8096',
    version: '10.10.10',
    supported: false,
    kind: 'jellyfin',
  },
];

export const fixturePlexServers: PublicServer[] = [
  {
    id: 'plex-home',
    name: 'Home PMS',
    address: 'http://192.168.1.20:32400',
    version: '1.41.3',
    supported: true,
    kind: 'plex',
    local: true,
  },
];

export const fixturePlexPin = 'WXYZ';

export const fixtureUsers: PublicUser[] = [
  { id: 'v', name: 'Vojtěch' },
  { id: 'a', name: 'Anna' },
  { id: 'k', name: 'Kids' },
  { id: 'g', name: 'Guest' },
];

export const fixtureQcCode = 'K7Q2MX';

function movie(
  id: string,
  name: string,
  extra: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    id,
    name,
    type: 'Movie',
    year: 2023,
    runtimeTicks: 114 * 60 * 10_000_000,
    officialRating: 'R',
    genres: ['Thriller'],
    overview:
      extra.overview ??
      'A cartographer crosses a frozen strait to find the line her father drew — and the town that vanished from every map after.',
    ...extra,
  };
}

export const longMeridian: CatalogItem = movie('meridian', 'The Long Meridian', {
  type: 'Episode',
  year: 2024,
  officialRating: 'PG-13',
  genres: ['Drama', 'Mystery'],
  communityRating: 7.8,
  badges: ['Dolby Vision', 'HDR10', 'Dolby Atmos', 'TrueHD 7.1'],
  seriesName: 'The Long Meridian',
  parentIndexNumber: 1,
  indexNumber: 5,
  runtimeTicks: (2 * 3600 + 18 * 60) * 10_000_000,
  userData: { positionTicks: (1 * 3600 + 12 * 60 + 40) * 10_000_000 },
  overview:
    'A cartographer crosses a frozen strait to find the line her father drew — and the town that vanished from every map after. Directed by Ines Varga.',
  mediaStreams: [
    {
      index: 0,
      type: 'Video',
      codec: 'hevc',
      videoRangeType: 'HDR10',
      width: 3840,
      height: 2160,
    },
    {
      index: 1,
      type: 'Audio',
      codec: 'truehd',
      language: 'eng',
      displayTitle: 'English · TrueHD Atmos 7.1',
      channels: 8,
      isDefault: true,
    },
    {
      index: 2,
      type: 'Audio',
      codec: 'dtshd',
      language: 'eng',
      displayTitle: 'English · DTS-HD MA 7.1',
      channels: 8,
    },
    {
      index: 3,
      type: 'Audio',
      codec: 'eac3',
      language: 'eng',
      displayTitle: 'English · Dolby Digital 5.1',
      channels: 6,
    },
    {
      index: 4,
      type: 'Audio',
      codec: 'aac',
      language: 'cze',
      displayTitle: 'Czech · AAC 5.1',
      channels: 6,
    },
    {
      index: 5,
      type: 'Audio',
      codec: 'aac',
      language: 'eng',
      displayTitle: 'Director commentary · AAC 2.0',
      channels: 2,
    },
  ],
});

export const glassValley = movie('glass', 'Glass Valley', {
  year: 2023,
  officialRating: 'R',
  genres: ['Thriller'],
  badges: ['4K', 'HDR10', 'DTS:X'],
});

export const homeFixture: HomeModel = {
  resume: [
    longMeridian,
    movie('harbour', 'Harbour Lights'),
    movie('copper', 'Copper Saints'),
    movie('quiet', 'Quiet Orbit'),
    movie('salt', 'Saltwind'),
  ],
  nextUp: [
    movie('copper2', 'Copper Saints'),
    movie('harbour2', 'Harbour Lights'),
    movie('north', 'North of Nowhere'),
    movie('paper', 'Paper Tigers'),
    movie('quiet2', 'Quiet Orbit'),
  ],
  libraries: [
    {
      id: 'movies',
      name: 'Movies',
      items: [
        glassValley,
        movie('salt2', 'Saltwind'),
        movie('ember', 'The Ember Choir'),
        movie('low', 'Low Tide'),
        movie('nb', 'Northbound'),
        movie('pale', 'Pale Harbour'),
        movie('orchard', 'Orchard'),
        movie('iron', 'Iron Lantern'),
        movie('static', 'Static'),
      ],
    },
  ],
};

export const cast = [
  { name: 'Mara Lindqvist', role: 'Ada', color: '#6b4f7a' },
  { name: 'Tomas Reyes', role: 'Elias', color: '#6b4a32' },
  { name: 'June Okafor', role: 'Petra', color: '#2f4a36' },
  { name: 'Viktor Hale', role: 'The Ferryman', color: '#2a3a66' },
  { name: 'Ines Varga', role: 'Director', color: '#6b2a2a' },
  { name: 'Leon Brandt', role: 'Writer', color: '#4a5a28' },
];
