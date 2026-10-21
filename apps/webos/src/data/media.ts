import {
  createMediaServer,
  type ImageUrlOptions,
  type MediaServer,
  type ServerKind,
} from '@cinefin/core';
import { clientInfo, deviceName, getSession, plexTvOverride, type StoredAccount } from './session';

let current: MediaServer | null = null;

function options(kind: ServerKind, session?: StoredAccount | null) {
  const s = getSession();
  const info = clientInfo();
  return {
    deviceId: session?.deviceId ?? s.installId,
    deviceName: deviceName(),
    clientName: info.name,
    clientVersion: info.version,
    session: session ?? undefined,
    plexTvUrl: kind === 'plex' ? plexTvOverride() : undefined,
  };
}

export function getMediaServer(): MediaServer {
  if (current) return current;
  const s = getSession();
  const kind = s.account?.kind ?? 'jellyfin';
  current = createMediaServer(kind, options(kind, s.account));
  return current;
}

export function resetMediaServer(kind: ServerKind, session?: StoredAccount | null): MediaServer {
  current = createMediaServer(kind, options(kind, session));
  return current;
}

export function imageUrl(itemId: string, opts: ImageUrlOptions): string | undefined {
  try {
    return getMediaServer().imageUrl(itemId, opts);
  } catch {
    return undefined;
  }
}
