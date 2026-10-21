# Media servers (Jellyfin + Plex)

Cinefin talks to a backend through `MediaServer` in `packages/core`. The webOS screens (Home, Details, player, format settings) do not import Jellyfin or Plex APIs. Sign-in is the only UI that branches: Jellyfin Quick Connect / password vs the Plex PIN at plex.tv/link.

```
apps/webos  →  createMediaServer(kind)  →  JellyfinServer | PlexServer
                                              │                │
                                        @jellyfin/sdk     plex/client.ts
                                        (unmodified)      (plex.tv + PMS)
```

Saved accounts live in `localStorage` (`cinefin.session.v2`). Several Jellyfin and Plex servers can be stored and switched from Settings › Account or the connect screen.

## Jellyfin

`JellyfinServer` is the previous webOS client moved behind the interface. Behaviour is the same: UDP 7359 discovery (best-effort), `/System/Info/Public`, Quick Connect, password, user views / resume / next-up / latest, `PlaybackInfo` + progressive `/Videos/{id}/stream?static=true`, session progress. The SDK is a dependency, not a fork.

## Plex

`PlexClient` (`packages/core/src/plex/client.ts`) is the only module that calls Plex HTTP. Endpoints:

| Call | Where |
|---|---|
| `POST /api/v2/pins?strong=true`, `GET /api/v2/pins/{id}` | plex.tv PIN |
| `GET /api/v2/resources?includeHttps=1&includeRelay=1` | account servers |
| `GET /api/v2/user` | account name |
| `GET /identity` | manual URL |
| `GET /library/sections`, `GET /hubs` | Home rows |
| `GET /library/metadata/{id}` (+ `/children`) | Details, seasons, episodes |
| `{part.key}?X-Plex-Token=` | **direct play only** |
| `GET /:/timeline`, `GET /:/scrobble` | progress / watched |
| `GET /photo/:/transcode` | posters |

Connection pick: local, then remote, then relay. A typed URL still works after the PIN.

Playback never hits `/video/:/transcode/universal`. The original part (DTS / TrueHD / Atmos included) is what `<video>` loads, matching the Jellyfin direct-play default. The TV capability table still decides whether that file can play; Cinefin does not ask PMS to convert it.

`X-Plex-Client-Identifier` is the install id (stable). Other `X-Plex-*` headers identify Cinefin as a TV player.

### Known Plex limits

- **Remote / relay streams** may require **Plex Pass** or **Remote Watch Pass** on the account. A LAN connection does not. Cinefin does not implement Plex's transcode-for-remote path.
- Plex has no Quick Connect and no public user list. Sign-in is PIN-only.
- Shared libraries use the per-resource `accessToken` from `/resources`.
- Hubs differ by PMS version and “home” settings. If `/hubs` is empty we fall back to each section’s `recentlyAdded`.
- GDM (UDP 32414) discovery is not implemented. Account resources + manual URL are the supported paths.
- Image URLs go through PMS photo transcode (JPEG-sized thumbs). Artwork quality was not compared to Jellyfin.
- Plex duration is milliseconds; Cinefin keeps ticks on `CatalogItem` so Home / Details / resume stay backend-agnostic.

## What this change did not verify on a real PMS

There is no owner Plex server on the build VM. Verification used recorded JSON fixtures (unit tests) and `scripts/mock-plex.mjs` (PIN + Home screenshots).

Not proven against a real PMS:

1. PIN approval on plex.tv/link and token lifetime
2. `/resources` on an account with several servers, shared shares, and IPv6-only connections
3. Local vs remote vs relay reachability from a C2
4. Whether a real `part.key` plays in webOS `<video>` (MKV / HEVC / TrueHD / DTS)
5. Timeline + scrobble updating Continue Watching
6. Remote Watch Pass / Plex Pass gating on relay
7. Certificate behaviour of `*.plex.direct` on Chromium 87
8. Season / episode children for every library type

Owner steps: sign in with a real PIN, pick the LAN server, play a TrueHD/DTS title, confirm the Onkyo sees the original audio, and confirm resume after Back.

## Artist icon

Plex uses a **placeholder** at `apps/webos/src/assets/server-plex.svg`. Replace that file with the signed mark. Jellyfin’s slot is `apps/webos/src/assets/server-jellyfin.svg`.
