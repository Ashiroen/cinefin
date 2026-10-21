/**
 * Tiny plex.tv + PMS stand-in for browser verification.
 * PIN is approved on the second poll so the PIN screen can be photographed.
 */
import { createServer } from 'node:http';

const TOKEN = 'mock-plex-token';
const CODE = process.env.PLEX_PIN_CODE || 'WXYZ';
const HOST = process.env.PLEX_MOCK_HOST || '127.0.0.1';
const PORT = Number(process.env.PLEX_MOCK_PORT || 32400);

let pinPolls = 0;

const movie = {
  ratingKey: '101',
  type: 'movie',
  title: 'Glass Valley',
  year: 2023,
  duration: 6840000,
  viewOffset: 1200000,
  contentRating: 'R',
  audienceRating: 7.4,
  summary: 'A cartographer crosses a frozen strait to find the line her father drew.',
  thumb: '/library/metadata/101/thumb/1',
  art: '/library/metadata/101/art/1',
  Genre: [{ tag: 'Thriller' }],
  Media: [
    {
      id: 1,
      container: 'mkv',
      videoCodec: 'hevc',
      audioCodec: 'truehd',
      Part: [
        {
          id: 1,
          key: '/library/parts/1/file.mkv',
          Stream: [
            {
              id: 1,
              streamType: 1,
              codec: 'hevc',
              width: 3840,
              height: 2160,
              colorTrc: 'smpte2084',
              displayTitle: '4K (HEVC HDR10)',
            },
            {
              id: 2,
              streamType: 2,
              codec: 'truehd',
              channels: 8,
              displayTitle: 'English (TRUEHD Atmos 7.1)',
              title: 'Atmos',
            },
          ],
        },
      ],
    },
  ],
};

const episode = {
  ratingKey: '201',
  type: 'episode',
  title: 'The Ice Line',
  grandparentTitle: 'The Long Meridian',
  parentIndex: 1,
  index: 5,
  year: 2024,
  duration: 8280000,
  viewOffset: 4360000,
  summary: 'A cartographer crosses a frozen strait.',
};

function json(res, body, status = 200) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(data);
}

function empty(res, status = 204) {
  res.writeHead(status, {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
  });
  res.end();
}

export function createMockPlexServer() {
  pinPolls = 0;
  return createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      empty(res, 204);
      return;
    }

    if (req.method === 'POST' && path === '/api/v2/pins') {
      json(res, { id: 1, code: CODE, expiresIn: 900 });
      return;
    }
    if (path === '/api/v2/pins/1') {
      pinPolls += 1;
      if (pinPolls >= 2) json(res, { id: 1, code: CODE, authToken: TOKEN });
      else json(res, { id: 1, code: CODE, authToken: null });
      return;
    }
    if (path === '/api/v2/user') {
      json(res, { id: 9, username: 'Vojtech', title: 'Vojtech' });
      return;
    }
    if (path === '/api/v2/resources') {
      json(res, [
        {
          name: 'Home PMS',
          product: 'Plex Media Server',
          productVersion: '1.41.3.9314',
          clientIdentifier: 'machine-home-abc',
          provides: 'server',
          owned: true,
          accessToken: TOKEN,
          connections: [
            {
              protocol: 'http',
              address: HOST,
              port: PORT,
              uri: `http://${HOST}:${PORT}`,
              local: true,
              relay: false,
              IPv6: false,
            },
          ],
        },
      ]);
      return;
    }
    if (path === '/identity') {
      json(res, { MediaContainer: { machineIdentifier: 'machine-home-abc', version: '1.41.3.9314' } });
      return;
    }
    if (path === '/library/sections') {
      json(res, {
        MediaContainer: {
          Directory: [
            { key: '1', title: 'Movies', type: 'movie' },
            { key: '2', title: 'TV Shows', type: 'show' },
          ],
        },
      });
      return;
    }
    if (path === '/hubs') {
      json(res, {
        MediaContainer: {
          Hub: [
            {
              hubIdentifier: 'home.continue',
              title: 'Continue Watching',
              type: 'mixed',
              Metadata: [episode],
            },
            {
              hubIdentifier: 'movie.recentlyadded',
              title: 'Recently Added Movies',
              type: 'movie',
              librarySectionID: 1,
              librarySectionTitle: 'Movies',
              Metadata: [movie],
            },
          ],
        },
      });
      return;
    }
    if (path === '/library/metadata/101' || path === '/library/metadata/201') {
      json(res, {
        MediaContainer: { Metadata: [path.endsWith('201') ? episode : movie] },
      });
      return;
    }
    if (path.startsWith('/library/metadata/') && path.endsWith('/children')) {
      json(res, { MediaContainer: { Metadata: [] } });
      return;
    }
    if (path === '/:/timeline' || path === '/:/scrobble') {
      empty(res, 200);
      return;
    }
    if (path.startsWith('/photo/') || path.startsWith('/library/metadata/')) {
      empty(res, 204);
      return;
    }
    if (path.startsWith('/library/parts/')) {
      res.writeHead(200, { 'content-type': 'video/mp4', 'access-control-allow-origin': '*' });
      res.end();
      return;
    }
    json(res, { error: `unhandled ${path}` }, 404);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createMockPlexServer();
  server.listen(PORT, HOST, () => {
    console.log(`mock plex on http://${HOST}:${PORT}`);
  });
}
