import { CLIENT_NAME, CLIENT_VERSION } from '../version';

/**
 * Isolated Plex HTTP client. Every plex.tv / PMS call goes through here.
 *
 * Documented / widely used endpoints:
 *   POST  https://plex.tv/api/v2/pins?strong=true
 *   GET   https://plex.tv/api/v2/pins/{id}
 *   GET   https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1
 *   GET   https://plex.tv/api/v2/user
 *   GET   {pms}/identity
 *   GET   {pms}/library/sections
 *   GET   {pms}/hubs
 *   GET   {pms}/library/metadata/{ratingKey}
 *   GET   {pms}/library/metadata/{ratingKey}/children
 *   GET   {pms}/library/sections/{key}/recentlyAdded
 *   GET   {pms}/:/timeline
 *   GET   {pms}/:/scrobble
 *   GET   {pms}/photo/:/transcode
 * Direct play uses the part key (`/library/parts/{id}/…`) — never /transcode/universal.
 */
export interface PlexClientOptions {
  clientIdentifier: string;
  product?: string;
  version?: string;
  device?: string;
  platform?: string;
  deviceName?: string;
  plexTvUrl?: string;
  fetchImpl?: typeof fetch;
}

export class PlexClient {
  readonly plexTvUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly ident: Required<
    Pick<PlexClientOptions, 'clientIdentifier' | 'product' | 'version' | 'device' | 'platform' | 'deviceName'>
  >;

  constructor(opts: PlexClientOptions) {
    const injected =
      typeof globalThis !== 'undefined'
        ? (globalThis as { __CINEFIN_PLEX_TV__?: string }).__CINEFIN_PLEX_TV__
        : undefined;
    this.plexTvUrl = (opts.plexTvUrl ?? injected ?? 'https://plex.tv').replace(/\/+$/, '');
    const fallback: typeof fetch = (input, init) => fetch(input, init);
    this.fetchImpl = opts.fetchImpl ?? fallback;
    this.ident = {
      clientIdentifier: opts.clientIdentifier,
      product: opts.product ?? CLIENT_NAME,
      version: opts.version ?? CLIENT_VERSION,
      device: opts.device ?? 'TV',
      platform: opts.platform ?? 'webOS',
      deviceName: opts.deviceName ?? CLIENT_NAME,
    };
  }

  headers(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Plex-Product': this.ident.product,
      'X-Plex-Version': this.ident.version,
      'X-Plex-Client-Identifier': this.ident.clientIdentifier,
      'X-Plex-Device': this.ident.device,
      'X-Plex-Platform': this.ident.platform,
      'X-Plex-Device-Name': this.ident.deviceName,
      'X-Plex-Provides': 'player',
      'X-Plex-Model': 'hosted',
    };
    if (token) headers['X-Plex-Token'] = token;
    return headers;
  }

  plexTv<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    return this.request<T>(`${this.plexTvUrl}${path}`, init, token);
  }

  server<T>(base: string, path: string, token: string, init: RequestInit = {}): Promise<T> {
    const root = base.replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return this.request<T>(`${root}${suffix}`, init, token);
  }

  private async request<T>(url: string, init: RequestInit, token?: string): Promise<T> {
    const headers = { ...this.headers(token), ...(init.headers as Record<string, string> | undefined) };
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 8000) : undefined;
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, headers, signal: ac?.signal });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Plex request failed ${url} — ${msg}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Plex ${res.status} ${url}${text ? ` — ${text.slice(0, 180)}` : ''}`);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('json') || ct.includes('javascript') || !ct) {
      return JSON.parse(text) as T;
    }
    return text as T;
  }
}
