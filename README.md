# Cinefin

A fast, minimal Jellyfin and Plex client for home theater. **webOS first** (LG TVs), Android TV later.

It plays the original file and sends the original audio to the AV receiver untouched whenever the HDMI chain allows it. Playback decisions come from a capability table, not a copied official-client profile.

- Product spec: [`docs/SPEC.md`](docs/SPEC.md)
- Jellyfin + Plex architecture: [`docs/MEDIA-SERVERS.md`](docs/MEDIA-SERVERS.md)
- Install on an LG C2: [`docs/INSTALL-webos.md`](docs/INSTALL-webos.md) — download the IPK from [the latest release](https://github.com/Ashiroen/cinefin/releases/latest)
- M1 verification notes: [`docs/VERIFICATION.md`](docs/VERIFICATION.md)

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run dev          # browser, 1920×1080
npm run package:webos
```

App id: `com.cinefin.app`. Preview a design board with `#/preview/00a` (through `05b`).
