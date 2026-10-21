import { JellyfinServer } from '../jellyfin/server';
import { PlexServer } from '../plex/server';
import type { MediaServer, MediaServerOptions, ServerKind } from './types';

export function createMediaServer(kind: ServerKind, options: MediaServerOptions): MediaServer {
  if (kind === 'plex') return new PlexServer(options);
  return new JellyfinServer(options);
}
